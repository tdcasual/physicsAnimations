const test = require("node:test");
const assert = require("node:assert/strict");

test("createItemsTaskService exposes task helpers", async () => {
  const {
    createItemsTaskService,
  } = require("../server/services/items/taskService");

  const service = createItemsTaskService({
    queue: null,
    screenshotService: {
      runScreenshotTask: async () => ({ ok: true }),
    },
  });

  assert.equal(typeof createItemsTaskService, "function");
  assert.equal(typeof service.registerScreenshotHandler, "function");
  assert.equal(typeof service.createScreenshotTask, "function");
  assert.equal(typeof service.getTaskById, "function");
  assert.equal(typeof service.retryTaskById, "function");
});

test("registerScreenshotHandler registers queue handler and delegates to screenshot service", async () => {
  const {
    createItemsTaskService,
  } = require("../server/services/items/taskService");

  let registeredType = "";
  let registeredHandler = null;
  let handledId = "";

  const queue = {
    hasHandler: () => false,
    registerHandler: (type, handler) => {
      registeredType = type;
      registeredHandler = handler;
    },
  };

  const service = createItemsTaskService({
    queue,
    screenshotService: {
      runScreenshotTask: async ({ id }) => {
        handledId = id;
        return { ok: true, itemId: id };
      },
    },
    deps: {
      parseId: (value) => `parsed_${value}`,
    },
  });

  service.registerScreenshotHandler();
  assert.equal(registeredType, "screenshot");
  assert.equal(typeof registeredHandler, "function");

  const out = await registeredHandler({ id: "abc" });
  assert.equal(handledId, "parsed_abc");
  assert.equal(out.ok, true);
  assert.equal(out.itemId, "parsed_abc");
});

test("createScreenshotTask enqueues when queue exists", async () => {
  const {
    createItemsTaskService,
  } = require("../server/services/items/taskService");

  let enqueuePayload = null;
  const queue = {
    enqueueTask: (payload) => {
      enqueuePayload = payload;
      return { id: "t_1", status: "queued" };
    },
    hasHandler: () => true,
  };

  const service = createItemsTaskService({
    queue,
    screenshotService: { runScreenshotTask: async () => ({ ok: true }) },
  });

  const out = await service.createScreenshotTask({ id: "l_1" });
  assert.equal(out.status, 202);
  assert.equal(out.body.ok, true);
  assert.equal(out.body.task.id, "t_1");
  assert.equal(enqueuePayload.type, "screenshot");
  assert.deepEqual(enqueuePayload.payload, { id: "l_1" });
  assert.equal(enqueuePayload.maxAttempts, 2);
});

test("createScreenshotTask runs synchronously when queue is unavailable", async () => {
  const {
    createItemsTaskService,
  } = require("../server/services/items/taskService");

  let called = 0;
  const service = createItemsTaskService({
    queue: null,
    screenshotService: {
      runScreenshotTask: async ({ id }) => {
        called += 1;
        return { ok: true, itemId: id };
      },
    },
  });

  const out = await service.createScreenshotTask({ id: "l_2" });
  assert.equal(called, 1);
  assert.equal(out.status, 200);
  assert.equal(out.body.ok, true);
  assert.equal(out.body.itemId, "l_2");
});

test("getTaskById and retryTaskById map not_found and task_not_retryable", async () => {
  const {
    createItemsTaskService,
  } = require("../server/services/items/taskService");

  const queue = {
    hasHandler: () => true,
    getTask: () => null,
    retryTask: () => {
      const err = new Error("task_not_retryable");
      throw err;
    },
  };

  const service = createItemsTaskService({
    queue,
    screenshotService: { runScreenshotTask: async () => ({ ok: true }) },
    deps: { parseId: (value) => String(value || "").trim() },
  });

  const missing = service.getTaskById({ taskId: " t_404 " });
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error, "not_found");

  const notRetryable = service.retryTaskById({ taskId: " t_x " });
  assert.equal(notRetryable.status, 400);
  assert.equal(notRetryable.body.error, "task_not_retryable");
});
