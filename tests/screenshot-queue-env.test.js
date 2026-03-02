const test = require("node:test");
const assert = require("node:assert/strict");

function loadQueueModuleWithEnv({ concurrency, maxQueue }) {
  const modulePath = require.resolve("../server/lib/screenshotQueue");
  const previousConcurrency = process.env.SCREENSHOT_CONCURRENCY;
  const previousMaxQueue = process.env.SCREENSHOT_QUEUE_MAX;

  if (concurrency === undefined) delete process.env.SCREENSHOT_CONCURRENCY;
  else process.env.SCREENSHOT_CONCURRENCY = concurrency;

  if (maxQueue === undefined) delete process.env.SCREENSHOT_QUEUE_MAX;
  else process.env.SCREENSHOT_QUEUE_MAX = maxQueue;

  delete require.cache[modulePath];
  const loaded = require(modulePath);

  if (previousConcurrency === undefined) delete process.env.SCREENSHOT_CONCURRENCY;
  else process.env.SCREENSHOT_CONCURRENCY = previousConcurrency;

  if (previousMaxQueue === undefined) delete process.env.SCREENSHOT_QUEUE_MAX;
  else process.env.SCREENSHOT_QUEUE_MAX = previousMaxQueue;

  delete require.cache[modulePath];
  return loaded;
}

test("screenshot queue ignores suffixed env values and falls back to defaults", () => {
  const queue = loadQueueModuleWithEnv({
    concurrency: "3s",
    maxQueue: "99ms",
  });

  const stats = queue.getScreenshotQueueStats();
  assert.equal(stats.concurrency, 1);
  assert.equal(stats.maxQueue, 50);
});

test("screenshot queue accepts explicit numeric env values", () => {
  const queue = loadQueueModuleWithEnv({
    concurrency: "4",
    maxQueue: "120",
  });

  const stats = queue.getScreenshotQueueStats();
  assert.equal(stats.concurrency, 4);
  assert.equal(stats.maxQueue, 120);
});
