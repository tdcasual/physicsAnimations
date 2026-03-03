function createStateDbCircuitState({
  info,
  now = () => new Date().toISOString(),
  nowMs = () => Date.now(),
  cooldownMs = 30000,
  logger = null,
}) {
  let consecutiveErrors = Number(info?.consecutiveErrors || 0);
  let openedAtMs = null;

  function tryReopenAfterCooldown() {
    if (!info.circuitOpen) return;
    if (!Number.isFinite(openedAtMs)) return;
    if (nowMs() - openedAtMs < cooldownMs) return;

    info.circuitOpen = false;
    info.healthy = false;
    info.degraded = true;
    consecutiveErrors = 0;
    info.consecutiveErrors = 0;
  }

  function isUsable() {
    tryReopenAfterCooldown();
    return !info.circuitOpen;
  }

  function markSuccess() {
    if (info.circuitOpen) return;
    consecutiveErrors = 0;
    info.consecutiveErrors = 0;
    info.healthy = true;
    info.degraded = false;
    info.lastSuccessAt = now();
  }

  function markFailure(operation, err) {
    const message = err?.message || String(err || "state_db_failed");
    info.errorCount += 1;
    consecutiveErrors += 1;
    info.consecutiveErrors = consecutiveErrors;
    info.lastError = `${operation}: ${message}`;
    info.lastErrorAt = now();

    if (consecutiveErrors >= info.maxErrors) {
      info.circuitOpen = true;
      openedAtMs = nowMs();
      info.healthy = false;
      info.degraded = false;
    } else {
      info.healthy = false;
      info.degraded = true;
    }

    if (typeof logger?.warn === "function") {
      logger.warn("state_db_operation_failed", {
        operation,
        message,
        consecutiveErrors,
        circuitOpen: info.circuitOpen,
      });
    }
  }

  return {
    isUsable,
    markSuccess,
    markFailure,
  };
}

module.exports = {
  createStateDbCircuitState,
};
