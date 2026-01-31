const DEFAULT_CONCURRENCY = Math.max(1, Number.parseInt(process.env.SCREENSHOT_CONCURRENCY || "1", 10) || 1);
const DEFAULT_MAX_QUEUE = Math.max(1, Number.parseInt(process.env.SCREENSHOT_QUEUE_MAX || "50", 10) || 50);

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

    queue.push({ task, resolve, reject, enqueuedAt: Date.now() });
    pump();
  });
}

module.exports = {
  enqueueScreenshot: enqueue,
  getScreenshotQueueStats: getStats,
};
