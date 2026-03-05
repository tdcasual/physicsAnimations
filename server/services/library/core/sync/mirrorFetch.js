const { normalizeUrlLike, isHttpUrl, normalizeLocalMirrorRelativePath } = require("../normalizers");
const { RETRYABLE_HTTP_STATUSES, waitWithSignal, createSyncError } = require("./syncCommon");

function createFetchRemoteBuffer({
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
}) {
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

  return async function fetchRemoteBuffer(url, relativePath) {
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
  };
}

module.exports = {
  createFetchRemoteBuffer,
};
