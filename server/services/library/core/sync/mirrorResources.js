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
  toPublicPath,
  normalizeSyncOptions,
} = require("../normalizers");
const {
  RELEASE_ID_PATTERN,
  DEFAULT_SYNC_OPTIONS,
  createReleaseId,
  extractReleaseIdFromPublicPath,
  sanitizeReleaseHistory,
  sanitizeSyncCache,
  createSyncError,
  mergeAbortSignals,
} = require("./syncCommon");
const { inferTextKind, collectRefsByKind } = require("./rewrite");
const { createFetchRemoteBuffer } = require("./mirrorFetch");
const { createMirrorRuntime } = require("./mirrorRuntime");
const {
  runStrictSelfCheck,
  rewriteViewerHtmlDependencies,
  publishMirroredRelease,
  rotateReleaseHistory,
} = require("./mirrorFinalize");

function createMirrorEmbedProfileResources({ store, fetcher }) {
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

  return async function mirrorEmbedProfileResources(profile, { signal: externalSignal } = {}) {
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

    const { finalizeReport, addReportError, normalizeCaughtError, failSync, ensureNotAborted, trackBytes } =
      createMirrorRuntime({
        syncSignal,
        syncOptions,
        startedAt,
        report,
        discoveredUrls,
      });

    const fetchRemoteBuffer = createFetchRemoteBuffer({
      fetcher,
      store,
      syncSignal,
      existingCache,
      nextSyncCache,
      previousReleasePrefix,
      syncOptions,
      report,
      failSync,
      normalizeCaughtError,
      ensureNotAborted,
      trackBytes,
    });

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
          const kind = inferTextKind(result.relativePath, result.contentType);
          if (!kind) continue;
          const sourceUrl = new URL(result.absoluteUrl);
          const refs = collectRefsByKind(kind, result.buffer.toString("utf8"));
          for (const ref of refs) {
            enqueueFromRef(sourceUrl, ref);
          }
        }
      }

      runStrictSelfCheck({
        syncOptions,
        remoteScriptUrl,
        remoteViewerPath,
        scriptSource,
        viewerHtmlOriginal,
        downloadedByUrl,
        report,
        resolveViewerRef,
        failSync,
      });

      viewerHtml = rewriteViewerHtmlDependencies({
        viewerHtml,
        viewerUrlObject,
        downloadedByUrl,
        resolveViewerRef,
      });

      await publishMirroredRelease({
        store,
        releasePrefix,
        scriptFetch,
        viewerHtml,
        downloadedByUrl,
        failSync,
      });

      const releaseHistory = await rotateReleaseHistory({
        store,
        profilePrefix,
        profile,
        previousReleaseId,
        releaseId,
        keepReleases: syncOptions.keepReleases,
      });

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
      throw createSyncError({
        code: "sync_failed",
        detail: error && error.message ? String(error.message) : "sync_failed",
        syncReport: finalizeReport({ totalUrls: discoveredUrls.size }),
      });
    } finally {
      clearTimeout(timeoutTimer);
    }
  };
}

module.exports = {
  createMirrorEmbedProfileResources,
};
