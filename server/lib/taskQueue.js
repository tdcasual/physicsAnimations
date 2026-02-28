const crypto = require("crypto");

const { createTaskQueuePersistence } = require("./taskQueue/persistence");
const { nowIso, taskErrorMessage, toPositiveInt, toTaskView } = require("./taskQueue/shared");

function createTaskQueue({ concurrency, maxQueue, maxTasks, timeoutMs, stateFile } = {}) {
  const queueConcurrency = toPositiveInt(concurrency || process.env.TASK_QUEUE_CONCURRENCY, 1);
  const queueMax = toPositiveInt(maxQueue || process.env.TASK_QUEUE_MAX, 200);
  const tasksMax = toPositiveInt(maxTasks || process.env.TASKS_MAX, 2000);
  const taskTimeoutMs = toPositiveInt(timeoutMs || process.env.TASK_TIMEOUT_MS, 90 * 1000);

  const handlers = new Map();
  const tasks = new Map();
  const pendingIds = [];
  const finishedOrder = [];
  let active = 0;

  function trimFinishedTasks() {
    while (tasks.size > tasksMax && finishedOrder.length) {
      const oldestId = finishedOrder.shift();
      const candidate = tasks.get(oldestId);
      if (!candidate) continue;
      if (candidate.status === "running" || candidate.status === "queued") continue;
      tasks.delete(oldestId);
    }
  }

  function recordFinished(task) {
    finishedOrder.push(task.id);
    trimFinishedTasks();
  }

  const persistence = createTaskQueuePersistence({
    stateFile,
    tasks,
    pendingIds,
    finishedOrder,
    tasksMax,
    nowIso,
    taskErrorMessage,
    trimFinishedTasks,
  });

  function withTaskTimeout(handlerPromise) {
    let timeout = null;

    const timeoutPromise = new Promise((_, reject) => {
      timeout = setTimeout(() => {
        const err = new Error("task_timeout");
        err.status = 408;
        reject(err);
      }, taskTimeoutMs);
    });

    return Promise.race([handlerPromise, timeoutPromise]).finally(() => {
      if (timeout) clearTimeout(timeout);
    });
  }

  function pump() {
    while (active < queueConcurrency && pendingIds.length > 0) {
      const taskId = pendingIds.shift();
      const task = tasks.get(taskId);
      if (!task) continue;
      if (task.status !== "queued") continue;

      const handler = handlers.get(task.type);
      if (typeof handler !== "function") {
        task.status = "failed";
        task.finishedAt = nowIso();
        task.updatedAt = task.finishedAt;
        task.lastError = "task_handler_missing";
        task.attempts += 1;
        recordFinished(task);
        persistence.schedulePersist();
        continue;
      }

      active += 1;
      task.status = "running";
      task.startedAt = nowIso();
      task.updatedAt = task.startedAt;
      persistence.schedulePersist();

      withTaskTimeout(
        Promise.resolve().then(() => handler(task.payload, { taskId: task.id, attempt: task.attempts + 1 })),
      )
        .then((result) => {
          task.status = "succeeded";
          task.result = result || null;
          task.lastError = "";
          task.attempts += 1;
          task.finishedAt = nowIso();
          task.updatedAt = task.finishedAt;
          recordFinished(task);
          persistence.schedulePersist();
        })
        .catch((err) => {
          task.attempts += 1;
          task.lastError = taskErrorMessage(err, "task_failed");
          task.updatedAt = nowIso();

          if (task.attempts < task.maxAttempts) {
            task.status = "queued";
            task.startedAt = "";
            task.finishedAt = "";
            pendingIds.push(task.id);
            persistence.schedulePersist();
            return;
          }

          task.status = "failed";
          task.finishedAt = nowIso();
          task.updatedAt = task.finishedAt;
          recordFinished(task);
          persistence.schedulePersist();
        })
        .finally(() => {
          active -= 1;
          pump();
        });
    }
  }

  function registerHandler(type, handler, { force = true } = {}) {
    const normalizedType = String(type || "");
    if (!force && handlers.has(normalizedType)) return false;
    handlers.set(normalizedType, handler);
    return true;
  }

  function hasHandler(type) {
    return handlers.has(String(type || ""));
  }

  function enqueueTask({ type, payload = {}, maxAttempts = 1 } = {}) {
    const normalizedType = String(type || "").trim();
    if (!normalizedType) {
      const err = new Error("invalid_task_type");
      err.status = 400;
      throw err;
    }
    if (pendingIds.length >= queueMax) {
      const err = new Error("task_queue_full");
      err.status = 429;
      throw err;
    }

    const createdAt = nowIso();
    const task = {
      id: `t_${crypto.randomUUID()}`,
      type: normalizedType,
      status: "queued",
      attempts: 0,
      maxAttempts: Math.max(1, toPositiveInt(maxAttempts, 1)),
      payload,
      result: null,
      lastError: "",
      createdAt,
      updatedAt: createdAt,
      startedAt: "",
      finishedAt: "",
    };

    tasks.set(task.id, task);
    pendingIds.push(task.id);
    persistence.schedulePersist();
    pump();

    return toTaskView(task);
  }

  function getTask(taskId) {
    return toTaskView(tasks.get(String(taskId || "")));
  }

  function retryTask(taskId) {
    const task = tasks.get(String(taskId || ""));
    if (!task) return null;
    if (task.status !== "failed") {
      const err = new Error("task_not_retryable");
      err.status = 400;
      throw err;
    }
    if (pendingIds.length >= queueMax) {
      const err = new Error("task_queue_full");
      err.status = 429;
      throw err;
    }

    task.status = "queued";
    task.result = null;
    task.lastError = "";
    task.finishedAt = "";
    task.startedAt = "";
    task.updatedAt = nowIso();
    pendingIds.push(task.id);
    persistence.schedulePersist();
    pump();

    return toTaskView(task);
  }

  function getStats() {
    let queued = 0;
    let running = 0;
    let succeeded = 0;
    let failed = 0;
    for (const task of tasks.values()) {
      if (task.status === "queued") queued += 1;
      else if (task.status === "running") running += 1;
      else if (task.status === "succeeded") succeeded += 1;
      else if (task.status === "failed") failed += 1;
    }

    return {
      concurrency: queueConcurrency,
      maxQueue: queueMax,
      maxTasks: tasksMax,
      timeoutMs: taskTimeoutMs,
      total: tasks.size,
      queued,
      running,
      succeeded,
      failed,
      active,
      persistence: persistence.getPersistenceStats(),
    };
  }

  persistence.loadPersistedState();
  if (pendingIds.length > 0) {
    setImmediate(() => {
      pump();
    });
  }

  return {
    registerHandler,
    hasHandler,
    enqueueTask,
    getTask,
    retryTask,
    getStats,
  };
}

module.exports = {
  createTaskQueue,
};
