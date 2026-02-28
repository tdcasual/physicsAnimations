function percentile(sorted, pct) {
  if (!sorted.length) return 0;
  const index = (pct / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function summarizeLatency(samples) {
  if (!samples.length) {
    return { avg: 0, p50: 0, p95: 0, max: 0, samples: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const total = sorted.reduce((sum, item) => sum + item, 0);
  return {
    avg: total / sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
    samples: sorted.length,
  };
}

function statusBucket(status) {
  if (status >= 500) return "5xx";
  if (status >= 400) return "4xx";
  if (status >= 300) return "3xx";
  if (status >= 200) return "2xx";
  return "other";
}

function createRuntimeMetrics({ maxLatencySamples = 2000 } = {}) {
  const startedAt = new Date();
  const state = {
    requestsTotal: 0,
    activeRequests: 0,
    statusCounts: {
      "2xx": 0,
      "3xx": 0,
      "4xx": 0,
      "5xx": 0,
      other: 0,
    },
    latencySamples: [],
  };

  function recordLatency(ms) {
    state.latencySamples.push(ms);
    if (state.latencySamples.length > maxLatencySamples) {
      state.latencySamples.shift();
    }
  }

  function middleware(req, res, next) {
    if (!String(req.path || "").startsWith("/api/")) {
      next();
      return;
    }

    const startNs = process.hrtime.bigint();
    state.activeRequests += 1;
    let finalized = false;

    const finalize = () => {
      if (finalized) return;
      finalized = true;
      state.activeRequests = Math.max(0, state.activeRequests - 1);
      state.requestsTotal += 1;
      const status = Number(res.statusCode || 0);
      const bucket = statusBucket(status);
      state.statusCounts[bucket] += 1;
      const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1e6;
      recordLatency(elapsedMs);
    };

    res.on("finish", finalize);
    res.on("close", finalize);
    next();
  }

  function snapshot() {
    return {
      startedAt: startedAt.toISOString(),
      requestsTotal: state.requestsTotal,
      activeRequests: state.activeRequests,
      statusCounts: { ...state.statusCounts },
      latencyMs: summarizeLatency(state.latencySamples),
    };
  }

  return {
    middleware,
    snapshot,
  };
}

module.exports = {
  createRuntimeMetrics,
  summarizeLatency,
};
