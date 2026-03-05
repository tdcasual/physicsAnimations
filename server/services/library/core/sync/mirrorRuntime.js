const { normalizeSyncCode, createSyncError } = require("./syncCommon");

function createMirrorRuntime({ syncSignal, syncOptions, startedAt, report, discoveredUrls }) {
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

  return {
    finalizeReport,
    addReportError,
    normalizeCaughtError,
    failSync,
    ensureNotAborted,
    trackBytes,
  };
}

module.exports = {
  createMirrorRuntime,
};
