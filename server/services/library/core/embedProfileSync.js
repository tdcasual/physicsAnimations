const {
  normalizeUrlLike,
  deriveViewerPath,
  isHttpUrl,
  toMirrorRelativePath,
  shouldSkipRef,
  parseHtmlRefs,
  parseHtmlMediaRefs,
  parseHtmlInlineStyleRefs,
  parseJsRefs,
  parseCssRefs,
  toViewerRef,
  normalizeLocalMirrorRelativePath,
  toPublicPath,
  normalizeSyncOptions,
} = require("./normalizers");

const RELEASE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{2,63}$/i;
const SYNC_CODE_PATTERN = /^[a-z0-9_]{2,80}$/i;
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function parseEnvInt(name, fallback, { min, max }) {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw)) return fallback;
  const value = Math.trunc(raw);
  if (!Number.isFinite(value)) return fallback;
  if (value < min || value > max) return fallback;
  return value;
}

function parseEnvBool(name, fallback) {
  const value = String(process.env[name] || "").trim().toLowerCase();
  if (!value) return fallback;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return fallback;
}

const DEFAULT_SYNC_OPTIONS = Object.freeze({
  maxFiles: parseEnvInt("LIBRARY_EMBED_SYNC_MAX_FILES", 120, { min: 1, max: 2000 }),
  maxTotalBytes: parseEnvInt("LIBRARY_EMBED_SYNC_MAX_TOTAL_BYTES", 25 * 1024 * 1024, {
    min: 16 * 1024,
    max: 512 * 1024 * 1024,
  }),
  maxFileBytes: parseEnvInt("LIBRARY_EMBED_SYNC_MAX_FILE_BYTES", 8 * 1024 * 1024, {
    min: 1024,
    max: 128 * 1024 * 1024,
  }),
  timeoutMs: parseEnvInt("LIBRARY_EMBED_SYNC_TIMEOUT_MS", 12000, { min: 10, max: 120000 }),
  concurrency: parseEnvInt("LIBRARY_EMBED_SYNC_CONCURRENCY", 4, { min: 1, max: 16 }),
  keepReleases: parseEnvInt("LIBRARY_EMBED_SYNC_KEEP_RELEASES", 3, { min: 1, max: 20 }),
  retryMaxAttempts: parseEnvInt("LIBRARY_EMBED_SYNC_RETRY_MAX_ATTEMPTS", 3, { min: 1, max: 8 }),
  retryBaseDelayMs: parseEnvInt("LIBRARY_EMBED_SYNC_RETRY_BASE_DELAY_MS", 80, { min: 1, max: 10000 }),
  strictSelfCheck: parseEnvBool("LIBRARY_EMBED_SYNC_STRICT_SELF_CHECK", true),
});

function normalizeSyncCode(value, fallback = "sync_failed") {
  const code = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!code) return fallback;
  return SYNC_CODE_PATTERN.test(code) ? code : fallback;
}

function createReleaseId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `r${ts}${rand}`;
}

function extractReleaseIdFromPublicPath(value) {
  const text = String(value || "");
  const match = text.match(/\/embed-profiles\/[^/]+\/releases\/([^/]+)\//);
  if (!match) return "";
  const releaseId = String(match[1] || "").trim();
  if (!RELEASE_ID_PATTERN.test(releaseId)) return "";
  return releaseId;
}

function sanitizeReleaseHistory(value) {
  const source = Array.isArray(value) ? value : [];
  const out = [];
  for (const item of source) {
    const releaseId = String(item || "").trim();
    if (!RELEASE_ID_PATTERN.test(releaseId)) continue;
    if (!out.includes(releaseId)) out.push(releaseId);
  }
  return out;
}

function sanitizeSyncCache(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const [rawUrl, rawEntry] of Object.entries(value)) {
    const absoluteUrl = normalizeUrlLike(rawUrl);
    if (!isHttpUrl(absoluteUrl)) continue;
    if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) continue;
    const relativePath = normalizeLocalMirrorRelativePath(rawEntry.relativePath);
    if (!relativePath) continue;
    out[absoluteUrl] = {
      etag: String(rawEntry.etag || "").trim(),
      lastModified: String(rawEntry.lastModified || "").trim(),
      contentType: String(rawEntry.contentType || "").trim(),
      relativePath,
    };
  }
  return out;
}

function createSyncError({
  code,
  detail = "",
  retryable = false,
  status = 0,
  url = "",
  source = "",
  syncReport = null,
} = {}) {
  const syncCode = normalizeSyncCode(code, "sync_failed");
  const error = new Error(syncCode);
  error.syncCode = syncCode;
  error.syncDetail = String(detail || "");
  error.retryable = retryable === true;
  error.status = Number(status || 0);
  error.url = String(url || "");
  error.source = String(source || "");
  if (syncReport && typeof syncReport === "object") {
    error.syncReport = syncReport;
  }
  return error;
}

function waitWithSignal(ms, signal) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    }, Math.max(0, Number(ms || 0)));
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      const reason = signal?.reason;
      if (reason && typeof reason === "object") {
        reject(reason);
        return;
      }
      reject(createSyncError({ code: "sync_cancelled", detail: "aborted_during_wait" }));
    };
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener?.("abort", onAbort, { once: true });
  });
}

function mergeAbortSignals(signals) {
  const active = (signals || []).filter(Boolean);
  if (active.length === 0) return null;
  if (active.length === 1) return active[0];
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function") {
    return AbortSignal.any(active);
  }
  const controller = new AbortController();
  const onAbort = (event) => {
    const reason = event?.target?.reason || createSyncError({ code: "sync_cancelled", detail: "merged_signal_abort" });
    if (!controller.signal.aborted) controller.abort(reason);
  };
  for (const signal of active) {
    if (signal.aborted) {
      controller.abort(signal.reason || createSyncError({ code: "sync_cancelled", detail: "merged_signal_aborted" }));
      return controller.signal;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }
  return controller.signal;
}

function inferTextKind(relativePath, contentType) {
  const lowerRel = String(relativePath || "").toLowerCase();
  const lowerType = String(contentType || "").toLowerCase();
  if (lowerRel.endsWith(".js") || lowerRel.endsWith(".mjs") || lowerType.includes("javascript")) return "js";
  if (lowerRel.endsWith(".css") || lowerType.includes("text/css")) return "css";
  if (
    lowerRel.endsWith(".html") ||
    lowerRel.endsWith(".htm") ||
    lowerRel.endsWith(".xhtml") ||
    lowerType.includes("text/html") ||
    lowerType.includes("application/xhtml")
  ) {
    return "html";
  }
  return "";
}

function collectRefsByKind(kind, text) {
  const source = String(text || "");
  if (!source) return [];
  if (kind === "js") return parseJsRefs(source);
  if (kind === "css") return parseCssRefs(source);
  if (kind === "html") {
    return [...parseHtmlRefs(source), ...parseHtmlMediaRefs(source), ...parseHtmlInlineStyleRefs(source)];
  }
  return [];
}

function createEmbedProfileSync({ store, fetcher, getEmbedProfileById, mutateLibraryEmbedProfilesState }) {
  const inFlightByProfile = new Map();

  function resolveSyncOptions(profile) {
    return normalizeSyncOptions(profile?.syncOptions, DEFAULT_SYNC_OPTIONS);
  }

  function resolvePreviousReleaseId(profile) {
    const active = String(profile?.activeReleaseId || "").trim();
    if (RELEASE_ID_PATTERN.test(active)) return active;

    const history = sanitizeReleaseHistory(profile?.releaseHistory);
    if (history.length > 0) return history[0];

    return extractReleaseIdFromPublicPath(profile?.scriptUrl || "");
  }

  function rewriteSrcsetValue(value, rewriteMap) {
    const parts = String(value || "")
      .split(",")
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    if (parts.length === 0) return value;
    return parts
      .map((part) => {
        const firstWhitespace = part.search(/\s/);
        const ref = (firstWhitespace === -1 ? part : part.slice(0, firstWhitespace)).trim();
        if (!ref) return part;
        const descriptor = firstWhitespace === -1 ? "" : part.slice(firstWhitespace).trim();
        const nextRef = rewriteMap.get(ref) || ref;
        return descriptor ? `${nextRef} ${descriptor}` : nextRef;
      })
      .join(", ");
  }

  function rewriteCssRefs(cssText, rewriteMap) {
    let nextCss = String(cssText || "");
    nextCss = nextCss.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (all, quote, ref) => {
      const key = String(ref || "").trim();
      const mapped = rewriteMap.get(key);
      if (!mapped) return all;
      const q = quote || '"';
      return `url(${q}${mapped}${q})`;
    });
    nextCss = nextCss.replace(/@import\s+url\(\s*(['"]?)([^'")\s]+)\1\s*\)/gi, (all, quote, ref) => {
      const key = String(ref || "").trim();
      const mapped = rewriteMap.get(key);
      if (!mapped) return all;
      const q = quote || '"';
      return `@import url(${q}${mapped}${q})`;
    });
    nextCss = nextCss.replace(/@import\s+(['"])([^'"]+)\1/gi, (all, quote, ref) => {
      const key = String(ref || "").trim();
      const mapped = rewriteMap.get(key);
      if (!mapped) return all;
      const q = quote || '"';
      return `@import ${q}${mapped}${q}`;
    });
    return nextCss;
  }

  function rewriteViewerHtmlRefs(htmlText, rewriteMap) {
    let nextHtml = String(htmlText || "");
    nextHtml = nextHtml.replace(
      /(<(?:script|link|img|source|video|audio|track)\b[^>]*\b(?:src|href|poster)\s*=\s*["'])([^"']+)(["'][^>]*>)/gi,
      (all, prefix, ref, suffix) => {
        if (!rewriteMap.has(ref)) return all;
        return `${prefix}${rewriteMap.get(ref)}${suffix}`;
      },
    );
    nextHtml = nextHtml.replace(
      /(<(?:img|source)\b[^>]*\bsrcset\s*=\s*["'])([^"']+)(["'][^>]*>)/gi,
      (all, prefix, srcsetValue, suffix) => `${prefix}${rewriteSrcsetValue(srcsetValue, rewriteMap)}${suffix}`,
    );
    nextHtml = nextHtml.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (all, attrs, cssText) => {
      return `<style${attrs}>${rewriteCssRefs(cssText, rewriteMap)}</style>`;
    });
    nextHtml = nextHtml.replace(/(\bstyle\s*=\s*)(["'])([^"']*)(\2)/gi, (all, prefix, quote, styleText, suffix) => {
      return `${prefix}${quote}${rewriteCssRefs(styleText, rewriteMap)}${suffix}`;
    });
    return nextHtml;
  }

  async function mirrorEmbedProfileResources(profile, { signal: externalSignal } = {}) {
    const profileId = String(profile?.id || "").trim();
    const remoteScriptUrl = normalizeUrlLike(profile?.remoteScriptUrl || profile?.scriptUrl);
    const remoteViewerPath = normalizeUrlLike(profile?.remoteViewerPath || profile?.viewerPath || deriveViewerPath(remoteScriptUrl));
    if (!profileId || !isHttpUrl(remoteScriptUrl) || !isHttpUrl(remoteViewerPath)) {
      return { ok: false, message: "remote_url_not_syncable" };
    }

    let scriptUrlObject = null;
    let viewerUrlObject = null;
    try {
      scriptUrlObject = new URL(remoteScriptUrl);
      viewerUrlObject = new URL(remoteViewerPath);
    } catch {
      return { ok: false, message: "invalid_remote_url" };
    }

    const startedAt = Date.now();
    const syncOptions = resolveSyncOptions(profile);
    const profilePrefix = `library/vendor/embed-profiles/${profileId}`;
    const previousReleaseId = resolvePreviousReleaseId(profile);
    const previousReleasePrefix = previousReleaseId ? `${profilePrefix}/releases/${previousReleaseId}` : "";
    const releaseId = createReleaseId();
    const releasePrefix = `${profilePrefix}/releases/${releaseId}`;
    const viewerBaseDir = new URL("./", viewerUrlObject);
    const existingCache = sanitizeSyncCache(profile?.syncCache);
    const nextSyncCache = {};
    const timeoutController = new AbortController();
    const timeoutTimer = setTimeout(() => {
      timeoutController.abort(createSyncError({ code: "sync_timeout", detail: "sync_deadline_exceeded" }));
    }, syncOptions.timeoutMs);
    const syncSignal = mergeAbortSignals([timeoutController.signal, externalSignal]);

    const report = {
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: "",
      durationMs: 0,
      totalUrls: 0,
      fetchedCount: 0,
      reusedCount: 0,
      failedCount: 0,
      totalBytes: 0,
      retryCount: 0,
      maxObservedConcurrency: 0,
      unresolvedCount: 0,
      cancelled: false,
      errors: [],
      limits: {
        maxFiles: syncOptions.maxFiles,
        maxTotalBytes: syncOptions.maxTotalBytes,
        maxFileBytes: syncOptions.maxFileBytes,
        timeoutMs: syncOptions.timeoutMs,
        concurrency: syncOptions.concurrency,
        retryMaxAttempts: syncOptions.retryMaxAttempts,
        retryBaseDelayMs: syncOptions.retryBaseDelayMs,
      },
    };
    const discoveredUrls = new Set([remoteScriptUrl, remoteViewerPath]);
    const pendingQueue = [];
    const pendingUrlSet = new Set();
    const downloadedByUrl = new Map();
    const requiredViewerRefs = new Set();

    function finalizeReport(extra = {}) {
      return {
        ...report,
        ...extra,
        finishedAt: new Date().toISOString(),
        durationMs: Math.max(0, Date.now() - startedAt),
      };
    }

    function addReportError(code, detail, { url = "", status = 0, source = "" } = {}) {
      const normalizedCode = normalizeSyncCode(code, "sync_failed");
      if (report.errors.length < 40) {
        report.errors.push({
          code: normalizedCode,
          detail: String(detail || ""),
          url: String(url || ""),
          status: Number(status || 0),
          source: String(source || ""),
        });
      }
    }

    function normalizeCaughtError(error, { fallbackCode = "sync_failed", url = "", source = "" } = {}) {
      if (error && error.syncCode) return error;
      if (syncSignal?.aborted) {
        const reason = syncSignal.reason;
        if (reason && reason.syncCode) return reason;
        if (reason && String(reason.code || "").toLowerCase() === "sync_timeout") {
          return createSyncError({ code: "sync_timeout", detail: "sync_aborted_timeout", url, source });
        }
        return createSyncError({ code: "sync_cancelled", detail: "sync_aborted_cancelled", url, source });
      }
      if (error && error.name === "AbortError") {
        return createSyncError({ code: "sync_cancelled", detail: "fetch_aborted", retryable: true, url, source });
      }
      if (error && error.name === "TypeError") {
        return createSyncError({
          code: "fetch_network_error",
          detail: error.message || "network_error",
          retryable: true,
          url,
          source,
        });
      }
      return createSyncError({
        code: fallbackCode,
        detail: error && error.message ? String(error.message) : fallbackCode,
        url,
        source,
      });
    }

    function failSync(code, detail = "", { url = "", status = 0, source = "" } = {}) {
      const normalizedCode = normalizeSyncCode(code, "sync_failed");
      addReportError(normalizedCode, detail, { url, status, source });
      report.failedCount += 1;
      const isCancelled = normalizedCode === "sync_cancelled" || normalizedCode === "sync_timeout";
      if (isCancelled) report.cancelled = true;
      throw createSyncError({
        code: normalizedCode,
        detail,
        status,
        url,
        source,
        syncReport: finalizeReport({ totalUrls: discoveredUrls.size }),
      });
    }

    function ensureNotAborted() {
      if (!syncSignal?.aborted) return;
      const reason = normalizeCaughtError(syncSignal.reason, { fallbackCode: "sync_cancelled" });
      failSync(reason.syncCode, reason.syncDetail || reason.message, {
        url: reason.url || "",
        status: reason.status || 0,
        source: reason.source || "",
      });
    }

    function trackBytes(byteSize) {
      const bytes = Number(byteSize || 0);
      if (!Number.isFinite(bytes) || bytes <= 0) return;
      report.totalBytes += bytes;
      if (report.totalBytes > syncOptions.maxTotalBytes) {
        failSync("sync_limit_max_total_bytes_exceeded", "total_bytes_limit_exceeded");
      }
    }

    function saveCacheEntry(url, relativePath, { etag = "", lastModified = "", contentType = "" } = {}) {
      const absoluteUrl = normalizeUrlLike(url);
      const rel = normalizeLocalMirrorRelativePath(relativePath);
      if (!absoluteUrl || !isHttpUrl(absoluteUrl) || !rel) return;
      nextSyncCache[absoluteUrl] = {
        etag: String(etag || "").trim(),
        lastModified: String(lastModified || "").trim(),
        contentType: String(contentType || "").trim(),
        relativePath: rel,
      };
    }

    async function fetchRemoteBuffer(url, relativePath) {
      if (!fetcher) failSync("fetch_unavailable", "fetcher_not_available", { url });
      const absoluteUrl = normalizeUrlLike(url);
      const rel = normalizeLocalMirrorRelativePath(relativePath);
      if (!absoluteUrl || !rel) failSync("invalid_fetch_target", "invalid_fetch_target", { url: absoluteUrl });

      const cacheEntry = existingCache[absoluteUrl];
      const conditionalHeaders = {};
      const canReuseFromCache = Boolean(
        cacheEntry &&
          previousReleasePrefix &&
          cacheEntry.relativePath &&
          (String(cacheEntry.etag || "").trim() || String(cacheEntry.lastModified || "").trim()),
      );
      if (canReuseFromCache && cacheEntry.etag) conditionalHeaders["if-none-match"] = cacheEntry.etag;
      if (canReuseFromCache && cacheEntry.lastModified) conditionalHeaders["if-modified-since"] = cacheEntry.lastModified;

      const maxAttempts = Math.max(1, Number(syncOptions.retryMaxAttempts || 1));
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        ensureNotAborted();
        try {
          const response = await fetcher(absoluteUrl, {
            method: "GET",
            redirect: "follow",
            signal: syncSignal,
            headers: conditionalHeaders,
          });
          const status = Number(response?.status || 0);
          if (!response || (!response.ok && status !== 304)) {
            throw createSyncError({
              code: "fetch_http_error",
              detail: `status_${status}`,
              retryable: RETRYABLE_HTTP_STATUSES.has(status),
              status,
              url: absoluteUrl,
            });
          }

          const responseContentType = String(response.headers?.get?.("content-type") || "").trim();
          const etag = String(response.headers?.get?.("etag") || "").trim();
          const lastModified = String(response.headers?.get?.("last-modified") || "").trim();

          if (status === 304) {
            const cachedRel = normalizeLocalMirrorRelativePath(cacheEntry?.relativePath || rel);
            const cachedKey = cachedRel ? `${previousReleasePrefix}/${cachedRel}` : "";
            if (!cachedKey) {
              failSync("cached_response_unusable", "cached_path_unavailable", { url: absoluteUrl });
            }
            const cachedBuffer = await store.readBuffer(cachedKey);
            if (!cachedBuffer || !cachedBuffer.length) {
              failSync("cached_response_missing", "cached_buffer_missing", { url: absoluteUrl });
            }
            const contentType = responseContentType || String(cacheEntry?.contentType || "").trim();
            saveCacheEntry(absoluteUrl, rel, {
              etag: etag || cacheEntry?.etag || "",
              lastModified: lastModified || cacheEntry?.lastModified || "",
              contentType,
            });
            report.reusedCount += 1;
            trackBytes(cachedBuffer.length);
            return {
              buffer: Buffer.from(cachedBuffer),
              contentType,
            };
          }

          const buffer = Buffer.from(await response.arrayBuffer());
          if (!buffer.length) {
            throw createSyncError({
              code: "empty_response",
              detail: "empty_response_body",
              retryable: false,
              status,
              url: absoluteUrl,
            });
          }
          if (buffer.length > syncOptions.maxFileBytes) {
            failSync("sync_limit_max_file_bytes_exceeded", "single_file_limit_exceeded", { url: absoluteUrl, status });
          }
          const contentType = responseContentType;
          saveCacheEntry(absoluteUrl, rel, {
            etag,
            lastModified,
            contentType,
          });
          report.fetchedCount += 1;
          trackBytes(buffer.length);
          return {
            buffer,
            contentType,
          };
        } catch (error) {
          const normalized = normalizeCaughtError(error, { fallbackCode: "fetch_failed", url: absoluteUrl });
          const shouldRetry = normalized.retryable === true && attempt < maxAttempts && !syncSignal?.aborted;
          if (shouldRetry) {
            report.retryCount += 1;
            const baseDelay = Math.max(1, Number(syncOptions.retryBaseDelayMs || 1));
            const exponential = baseDelay * Math.pow(2, attempt - 1);
            const capped = Math.min(10000, exponential);
            const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(capped * 0.2)));
            await waitWithSignal(capped + jitter, syncSignal);
            continue;
          }
          failSync(normalized.syncCode || "fetch_failed", normalized.syncDetail || normalized.message, {
            url: absoluteUrl,
            status: normalized.status,
          });
        }
      }
      failSync("fetch_failed", "retry_budget_exhausted", { url: absoluteUrl });
      return null;
    }

    function enqueueFromRef(baseUrl, refValue, { markRequired = false } = {}) {
      const ref = String(refValue || "").trim();
      if (!ref || shouldSkipRef(ref)) return null;

      let resolved = null;
      try {
        resolved = new URL(ref, baseUrl);
      } catch {
        return null;
      }
      if (!["http:", "https:"].includes(resolved.protocol)) return null;
      if (resolved.origin !== viewerUrlObject.origin) return null;

      const absoluteUrl = resolved.toString();
      const relativePath = toMirrorRelativePath(viewerBaseDir, resolved);
      if (!relativePath) return null;

      if (!discoveredUrls.has(absoluteUrl)) {
        if (discoveredUrls.size + 1 > syncOptions.maxFiles) {
          failSync("sync_limit_max_files_exceeded", "max_files_limit_exceeded", { url: absoluteUrl });
        }
        discoveredUrls.add(absoluteUrl);
      }

      if (markRequired) requiredViewerRefs.add(absoluteUrl);
      if (downloadedByUrl.has(absoluteUrl) || pendingUrlSet.has(absoluteUrl)) return absoluteUrl;

      pendingQueue.push({ absoluteUrl, relativePath });
      pendingUrlSet.add(absoluteUrl);
      return absoluteUrl;
    }

    function enqueueViewerHtmlRefs(htmlText, baseUrl, { markRequired = false } = {}) {
      for (const ref of parseHtmlRefs(htmlText)) {
        enqueueFromRef(baseUrl, ref, { markRequired });
      }
      for (const ref of parseHtmlMediaRefs(htmlText)) {
        enqueueFromRef(baseUrl, ref);
      }
      for (const ref of parseHtmlInlineStyleRefs(htmlText)) {
        enqueueFromRef(baseUrl, ref);
      }
    }

    function resolveViewerRef(ref, baseUrl) {
      if (shouldSkipRef(ref)) return null;
      let resolved = null;
      try {
        resolved = new URL(ref, baseUrl);
      } catch {
        return null;
      }
      if (!["http:", "https:"].includes(resolved.protocol)) return null;
      if (resolved.origin !== viewerUrlObject.origin) return null;
      return resolved.toString();
    }

    try {
      const [scriptFetch, viewerFetch] = await Promise.all([
        fetchRemoteBuffer(remoteScriptUrl, "embed.js"),
        fetchRemoteBuffer(remoteViewerPath, "viewer.html"),
      ]);
      const scriptSource = scriptFetch.buffer.toString("utf8");
      const viewerHtmlOriginal = viewerFetch.buffer.toString("utf8");
      let viewerHtml = viewerHtmlOriginal;

      enqueueViewerHtmlRefs(viewerHtmlOriginal, viewerUrlObject, { markRequired: true });
      for (const ref of parseJsRefs(scriptSource)) {
        enqueueFromRef(scriptUrlObject, ref);
      }

      while (pendingQueue.length > 0) {
        ensureNotAborted();
        const batch = pendingQueue.splice(0, syncOptions.concurrency);
        report.maxObservedConcurrency = Math.max(report.maxObservedConcurrency, batch.length);
        const results = await Promise.all(
          batch.map(async (next) => {
            if (!next || !next.absoluteUrl) return null;
            pendingUrlSet.delete(next.absoluteUrl);
            if (downloadedByUrl.has(next.absoluteUrl)) return null;

            try {
              const downloaded = await fetchRemoteBuffer(next.absoluteUrl, next.relativePath);
              downloadedByUrl.set(next.absoluteUrl, {
                relativePath: next.relativePath,
                buffer: downloaded.buffer,
                contentType: downloaded.contentType,
              });
              return {
                absoluteUrl: next.absoluteUrl,
                relativePath: next.relativePath,
                buffer: downloaded.buffer,
                contentType: downloaded.contentType,
              };
            } catch (error) {
              const normalized = normalizeCaughtError(error, {
                fallbackCode: "dependency_fetch_failed",
                url: next.absoluteUrl,
                source: next.absoluteUrl,
              });
              if (requiredViewerRefs.has(next.absoluteUrl)) {
                if (normalized.syncCode === "sync_cancelled" || normalized.syncCode === "sync_timeout") {
                  failSync(normalized.syncCode, normalized.syncDetail || normalized.syncCode, {
                    url: next.absoluteUrl,
                    status: normalized.status,
                    source: next.absoluteUrl,
                  });
                }
                failSync("required_viewer_dependency_fetch_failed", normalized.syncDetail || next.absoluteUrl, {
                  url: next.absoluteUrl,
                  status: normalized.status,
                  source: next.absoluteUrl,
                });
              }
              addReportError(normalized.syncCode || "dependency_fetch_failed", normalized.syncDetail || "", {
                url: next.absoluteUrl,
                status: normalized.status || 0,
                source: next.absoluteUrl,
              });
              return null;
            }
          }),
        );

        for (const result of results) {
          if (!result) continue;
          const lowerRel = result.relativePath.toLowerCase();
          const sourceUrl = new URL(result.absoluteUrl);
          if (lowerRel.endsWith(".js") || lowerRel.endsWith(".mjs")) {
            const code = result.buffer.toString("utf8");
            for (const ref of parseJsRefs(code)) {
              enqueueFromRef(sourceUrl, ref);
            }
          } else if (lowerRel.endsWith(".css")) {
            const css = result.buffer.toString("utf8");
            for (const ref of parseCssRefs(css)) {
              enqueueFromRef(sourceUrl, ref);
            }
          } else if (lowerRel.endsWith(".html") || lowerRel.endsWith(".htm") || lowerRel.endsWith(".xhtml")) {
            const nestedHtml = result.buffer.toString("utf8");
            enqueueViewerHtmlRefs(nestedHtml, sourceUrl);
          }
        }
      }

      if (syncOptions.strictSelfCheck) {
        const unresolved = [];
        const graphSources = [
          {
            absoluteUrl: remoteScriptUrl,
            kind: "js",
            text: scriptSource,
          },
          {
            absoluteUrl: remoteViewerPath,
            kind: "html",
            text: viewerHtmlOriginal,
          },
        ];
        for (const [absoluteUrl, item] of downloadedByUrl.entries()) {
          const kind = inferTextKind(item.relativePath, item.contentType);
          if (!kind) continue;
          graphSources.push({
            absoluteUrl,
            kind,
            text: item.buffer.toString("utf8"),
          });
        }

        for (const source of graphSources) {
          const refs = collectRefsByKind(source.kind, source.text);
          for (const ref of refs) {
            const resolved = resolveViewerRef(ref, source.absoluteUrl);
            if (!resolved) continue;
            if (resolved === remoteScriptUrl || resolved === remoteViewerPath || downloadedByUrl.has(resolved)) continue;
            unresolved.push({
              source: source.absoluteUrl,
              target: resolved,
            });
          }
        }
        if (unresolved.length > 0) {
          report.unresolvedCount = unresolved.length;
          failSync("offline_self_check_failed", unresolved[0].target, {
            url: unresolved[0].target,
            source: unresolved[0].source,
          });
        }
      }

      const refRewriteMap = new Map();
      for (const ref of [...parseHtmlRefs(viewerHtml), ...parseHtmlMediaRefs(viewerHtml), ...parseHtmlInlineStyleRefs(viewerHtml)]) {
        const resolved = resolveViewerRef(ref, viewerUrlObject);
        if (!resolved) continue;
        const item = downloadedByUrl.get(resolved);
        if (!item) continue;
        refRewriteMap.set(ref, toViewerRef(item.relativePath));
      }
      if (refRewriteMap.size > 0) {
        viewerHtml = rewriteViewerHtmlRefs(viewerHtml, refRewriteMap);
      }

      try {
        await store.deletePath(releasePrefix, { recursive: true });
        await store.writeBuffer(`${releasePrefix}/embed.js`, scriptFetch.buffer, {
          contentType: scriptFetch.contentType || "application/javascript; charset=utf-8",
        });
        await store.writeBuffer(`${releasePrefix}/viewer.html`, Buffer.from(viewerHtml, "utf8"), {
          contentType: "text/html; charset=utf-8",
        });
        for (const item of downloadedByUrl.values()) {
          const rel = normalizeLocalMirrorRelativePath(item.relativePath);
          if (!rel) continue;
          await store.writeBuffer(`${releasePrefix}/${rel}`, item.buffer, {
            contentType: item.contentType || undefined,
          });
        }
      } catch (error) {
        failSync("write_failed", error && error.message ? String(error.message) : "write_failed");
      }

      await store.deletePath(`${profilePrefix}/current`, { recursive: true }).catch(() => {});

      const previousHistory = sanitizeReleaseHistory(profile?.releaseHistory);
      if (previousReleaseId && !previousHistory.includes(previousReleaseId)) {
        previousHistory.unshift(previousReleaseId);
      }
      const nextHistory = [releaseId, ...previousHistory.filter((item) => item !== releaseId)];
      const releaseHistory = nextHistory.slice(0, syncOptions.keepReleases);
      const staleReleases = nextHistory.slice(syncOptions.keepReleases);
      for (const staleReleaseId of staleReleases) {
        await store.deletePath(`${profilePrefix}/releases/${staleReleaseId}`, { recursive: true }).catch(() => {});
      }

      const finalReport = finalizeReport({ totalUrls: discoveredUrls.size });
      return {
        ok: true,
        scriptUrl: `/${toPublicPath(`${releasePrefix}/embed.js`)}`,
        viewerPath: `/${toPublicPath(`${releasePrefix}/viewer.html`)}`,
        message: "sync_ok",
        activeReleaseId: releaseId,
        releaseHistory,
        syncCache: nextSyncCache,
        report: finalReport,
      };
    } catch (error) {
      if (error && error.syncCode) throw error;
      const normalized = createSyncError({
        code: "sync_failed",
        detail: error && error.message ? String(error.message) : "sync_failed",
        syncReport: finalizeReport({ totalUrls: discoveredUrls.size }),
      });
      throw normalized;
    } finally {
      clearTimeout(timeoutTimer);
    }
  }

  async function applyEmbedProfileSyncStatus({
    profileId,
    syncStatus,
    syncMessage,
    scriptUrl,
    viewerPath,
    activeReleaseId,
    releaseHistory,
    syncCache,
    syncLastReport,
  }) {
    const now = new Date().toISOString();
    let updated = null;
    await mutateLibraryEmbedProfilesState({ store }, (state) => {
      const target = state.profiles.find((item) => item.id === profileId);
      if (!target) return;
      target.syncStatus = String(syncStatus || "").trim() || "pending";
      target.syncMessage = normalizeSyncCode(syncMessage || "sync_failed", "sync_failed");
      target.lastSyncAt = now;
      if (scriptUrl) target.scriptUrl = scriptUrl;
      if (viewerPath) target.viewerPath = viewerPath;
      if (activeReleaseId !== undefined) {
        const value = String(activeReleaseId || "").trim();
        target.activeReleaseId = RELEASE_ID_PATTERN.test(value) ? value : "";
      }
      if (releaseHistory !== undefined) {
        target.releaseHistory = sanitizeReleaseHistory(releaseHistory);
      }
      if (syncCache !== undefined) {
        target.syncCache = sanitizeSyncCache(syncCache);
      }
      if (syncLastReport !== undefined) {
        target.syncLastReport =
          syncLastReport && typeof syncLastReport === "object" && !Array.isArray(syncLastReport) ? syncLastReport : {};
      }
      target.updatedAt = now;
      updated = { ...target };
    });
    return updated;
  }

  async function runSyncEmbedProfile({ profileId, tolerateFailure = false, signal = null } = {}) {
    const profile = await getEmbedProfileById({ profileId });
    if (!profile) return { status: 404, error: "embed_profile_not_found" };
    if (!isHttpUrl(profile.remoteScriptUrl || profile.scriptUrl)) {
      return { status: 400, error: "invalid_profile_script_url" };
    }
    if (!isHttpUrl(profile.remoteViewerPath || profile.viewerPath || deriveViewerPath(profile.remoteScriptUrl || profile.scriptUrl))) {
      return { status: 400, error: "invalid_profile_viewer_path" };
    }

    try {
      const mirrored = await mirrorEmbedProfileResources(profile, { signal });
      if (!mirrored.ok) {
        const updated = await applyEmbedProfileSyncStatus({
          profileId: profile.id,
          syncStatus: "failed",
          syncMessage: mirrored.message || "sync_failed",
          syncLastReport: mirrored.report || {},
        });
        if (tolerateFailure) return { ok: true, profile: updated || profile };
        return { status: 502, error: "embed_profile_sync_failed" };
      }
      const updated = await applyEmbedProfileSyncStatus({
        profileId: profile.id,
        syncStatus: "ok",
        syncMessage: mirrored.message || "sync_ok",
        scriptUrl: mirrored.scriptUrl,
        viewerPath: mirrored.viewerPath,
        activeReleaseId: mirrored.activeReleaseId,
        releaseHistory: mirrored.releaseHistory,
        syncCache: mirrored.syncCache,
        syncLastReport: mirrored.report,
      });
      if (!updated) return { status: 404, error: "embed_profile_not_found" };
      return { ok: true, profile: updated };
    } catch (err) {
      const code = normalizeSyncCode(err?.syncCode || err?.message || "sync_failed", "sync_failed");
      await applyEmbedProfileSyncStatus({
        profileId: profile.id,
        syncStatus: "failed",
        syncMessage: code,
        syncLastReport:
          err && err.syncReport && typeof err.syncReport === "object" && !Array.isArray(err.syncReport)
            ? err.syncReport
            : undefined,
      }).catch(() => {});
      if (tolerateFailure) {
        const refreshed = await getEmbedProfileById({ profileId: profile.id });
        return { ok: true, profile: refreshed || profile };
      }
      return { status: 502, error: "embed_profile_sync_failed" };
    }
  }

  async function syncEmbedProfile({ profileId, tolerateFailure = false } = {}) {
    const normalizedProfileId = String(profileId || "").trim();
    if (!normalizedProfileId) return { status: 404, error: "embed_profile_not_found" };
    const existing = inFlightByProfile.get(normalizedProfileId);
    if (existing && existing.promise) {
      return existing.promise;
    }

    const controller = new AbortController();
    const promise = runSyncEmbedProfile({
      profileId: normalizedProfileId,
      tolerateFailure,
      signal: controller.signal,
    }).finally(() => {
      const current = inFlightByProfile.get(normalizedProfileId);
      if (current && current.promise === promise) {
        inFlightByProfile.delete(normalizedProfileId);
      }
    });

    inFlightByProfile.set(normalizedProfileId, {
      controller,
      promise,
    });
    return promise;
  }

  async function cancelEmbedProfileSync({ profileId } = {}) {
    const normalizedProfileId = String(profileId || "").trim();
    if (!normalizedProfileId) return { status: 404, error: "embed_profile_not_found" };
    const entry = inFlightByProfile.get(normalizedProfileId);
    if (!entry || !entry.controller) {
      return { status: 409, error: "embed_profile_sync_not_running" };
    }
    entry.controller.abort(createSyncError({ code: "sync_cancelled", detail: "cancel_requested" }));
    return { ok: true, cancelled: true };
  }

  return {
    mirrorEmbedProfileResources,
    applyEmbedProfileSyncStatus,
    syncEmbedProfile,
    cancelEmbedProfileSync,
  };
}

module.exports = {
  createEmbedProfileSync,
};
