function toPositiveInt(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value));
  }
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const DEFAULT_CONCURRENCY = toPositiveInt(process.env.SCREENSHOT_CONCURRENCY, 1);
const DEFAULT_MAX_QUEUE = toPositiveInt(process.env.SCREENSHOT_QUEUE_MAX, 50);

const queue = [];
let active = 0;
let completed = 0;
let failed = 0;
let lastError = "";
let lastErrorAt = "";

function getStats() {
  return {
    concurrency: DEFAULT_CONCURRENCY,
    maxQueue: DEFAULT_MAX_QUEUE,
    queued: queue.length,
    active,
    completed,
    failed,
    lastError,
    lastErrorAt,
  };
}

function pump() {
  while (active < DEFAULT_CONCURRENCY && queue.length > 0) {
    const job = queue.shift();
    active += 1;

    Promise.resolve()
      .then(job.task)
      .then((result) => {
        completed += 1;
        job.resolve(result);
      })
      .catch((err) => {
        failed += 1;
        lastError = err?.message || "screenshot_failed";
        lastErrorAt = new Date().toISOString();
        job.reject(err);
      })
      .finally(() => {
        active -= 1;
        pump();
      });
  }
}

function enqueue(task) {
  return new Promise((resolve, reject) => {
    if (queue.length >= DEFAULT_MAX_QUEUE) {
      const err = new Error("screenshot_queue_full");
      err.status = 429;
      reject(err);
      return;
    }

    queue.push({ task, resolve, reject });
    pump();
  });
}

module.exports = {
  enqueueScreenshot: enqueue,
  getScreenshotQueueStats: getStats,
};
