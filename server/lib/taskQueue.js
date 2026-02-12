const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function toTaskStatus(value, fallback = "queued") {
  const status = String(value || "").trim();
  if (status === "queued") return "queued";
  if (status === "running") return "running";
  if (status === "succeeded") return "succeeded";
  if (status === "failed") return "failed";
  return fallback;
}

function isTerminalStatus(status) {
  return status === "succeeded" || status === "failed";
}

function createTaskQueue({ concurrency, maxQueue, maxTasks, timeoutMs, stateFile } = {}) {
  const queueConcurrency = toPositiveInt(concurrency || process.env.TASK_QUEUE_CONCURRENCY, 1);
  const queueMax = toPositiveInt(maxQueue || process.env.TASK_QUEUE_MAX, 200);
  const tasksMax = toPositiveInt(maxTasks || process.env.TASKS_MAX, 2000);
  const taskTimeoutMs = toPositiveInt(timeoutMs || process.env.TASK_TIMEOUT_MS, 90 * 1000);

  const persistencePath = typeof stateFile === "string" ? stateFile.trim() : "";
  const persistence = {
    enabled: Boolean(persistencePath),
    filePath: persistencePath,
    available: true,
    lastLoadedAt: "",
    lastSavedAt: "",
    lastError: "",
    lastErrorAt: "",
  };

  const handlers = new Map();
  const tasks = new Map();
  const pendingIds = [];
  const finishedOrder = [];
  let active = 0;
  let persistScheduled = false;

  function nowIso() {
    return new Date().toISOString();
  }

  function toTaskView(task) {
    if (!task) return null;
    return {
      id: task.id,
      type: task.type,
      status: task.status,
      attempts: task.attempts,
      maxAttempts: task.maxAttempts,
      payload: task.payload,
      result: task.result,
      lastError: task.lastError,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      startedAt: task.startedAt,
      finishedAt: task.finishedAt,
    };
  }

  function taskErrorMessage(err, fallback) {
    const message = err?.message;
    if (typeof message === "string" && message) return message;
    return fallback;
  }

  function markPersistenceError(err) {
    persistence.available = false;
    persistence.lastError = taskErrorMessage(err, "task_persistence_failed");
    persistence.lastErrorAt = nowIso();
  }

  function clearPersistenceError() {
    persistence.available = true;
    persistence.lastError = "";
    persistence.lastErrorAt = "";
  }

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

  function makePersistPayload() {
    return {
      version: 1,
      tasks: Array.from(tasks.values()),
      pendingIds: [...pendingIds],
      finishedOrder: [...finishedOrder],
    };
  }

  function persistStateNow() {
    if (!persistence.enabled || !persistence.filePath) return;

    const filePath = persistence.filePath;
    const payload = `${JSON.stringify(makePersistPayload(), null, 2)}\n`;

    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const tmpPath = `${filePath}.tmp`;
      fs.writeFileSync(tmpPath, payload, "utf8");
      fs.renameSync(tmpPath, filePath);
      clearPersistenceError();
      persistence.lastSavedAt = nowIso();
    } catch (err) {
      markPersistenceError(err);
    }
  }

  function schedulePersist() {
    if (!persistence.enabled || !persistence.filePath) return;
    if (persistScheduled) return;
    persistScheduled = true;

    setImmediate(() => {
      persistScheduled = false;
      persistStateNow();
    });
  }

  function normalizeLoadedTask(rawTask) {
    if (!rawTask || typeof rawTask !== "object") return null;
    const id = String(rawTask.id || "").trim();
    const type = String(rawTask.type || "").trim();
    if (!id || !type) return null;

    const maxAttempts = Math.max(1, toPositiveInt(rawTask.maxAttempts, 1));
    const attempts = Math.max(0, toPositiveInt(rawTask.attempts, 0));

    return {
      id,
      type,
      status: toTaskStatus(rawTask.status, "queued"),
      attempts,
      maxAttempts,
      payload: rawTask.payload && typeof rawTask.payload === "object" ? rawTask.payload : {},
      result: rawTask.result === undefined ? null : rawTask.result,
      lastError: typeof rawTask.lastError === "string" ? rawTask.lastError : "",
      createdAt: typeof rawTask.createdAt === "string" && rawTask.createdAt ? rawTask.createdAt : nowIso(),
      updatedAt: typeof rawTask.updatedAt === "string" && rawTask.updatedAt ? rawTask.updatedAt : nowIso(),
      startedAt: typeof rawTask.startedAt === "string" ? rawTask.startedAt : "",
      finishedAt: typeof rawTask.finishedAt === "string" ? rawTask.finishedAt : "",
    };
  }

  function loadPersistedState() {
    if (!persistence.enabled || !persistence.filePath) return;

    try {
      if (!fs.existsSync(persistence.filePath)) return;

      const parsed = JSON.parse(fs.readFileSync(persistence.filePath, "utf8"));
      if (!parsed || typeof parsed !== "object") return;

      const sourceTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
      for (const rawTask of sourceTasks) {
        const task = normalizeLoadedTask(rawTask);
        if (!task) continue;
        tasks.set(task.id, task);
      }

      const pendingSeen = new Set();
      const sourcePending = Array.isArray(parsed.pendingIds) ? parsed.pendingIds : [];
      for (const rawId of sourcePending) {
        const taskId = String(rawId || "").trim();
        if (!taskId || pendingSeen.has(taskId)) continue;
        const task = tasks.get(taskId);
        if (!task || task.status !== "queued") continue;
        pendingIds.push(taskId);
        pendingSeen.add(taskId);
      }

      for (const task of tasks.values()) {
        if (task.status !== "queued") continue;
        if (pendingSeen.has(task.id)) continue;
        pendingIds.push(task.id);
        pendingSeen.add(task.id);
      }

      const finishedSeen = new Set();
      const sourceFinishedOrder = Array.isArray(parsed.finishedOrder) ? parsed.finishedOrder : [];
      for (const rawId of sourceFinishedOrder) {
        const taskId = String(rawId || "").trim();
        if (!taskId || finishedSeen.has(taskId)) continue;
        const task = tasks.get(taskId);
        if (!task || !isTerminalStatus(task.status)) continue;
        finishedOrder.push(taskId);
        finishedSeen.add(taskId);
      }

      let recoveredRunning = false;
      const recoveredAt = nowIso();
      for (const task of tasks.values()) {
        if (task.status === "running") {
          task.status = "failed";
          task.startedAt = "";
          task.finishedAt = recoveredAt;
          task.updatedAt = recoveredAt;
          task.lastError = "task_recovered_after_restart";
          if (!finishedSeen.has(task.id)) {
            finishedOrder.push(task.id);
            finishedSeen.add(task.id);
          }
          recoveredRunning = true;
          continue;
        }

        if (isTerminalStatus(task.status) && !finishedSeen.has(task.id)) {
          finishedOrder.push(task.id);
          finishedSeen.add(task.id);
        }
      }

      trimFinishedTasks();
      clearPersistenceError();
      persistence.lastLoadedAt = nowIso();
      if (recoveredRunning) schedulePersist();
    } catch (err) {
      markPersistenceError(err);
    }
  }

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
        schedulePersist();
        continue;
      }

      active += 1;
      task.status = "running";
      task.startedAt = nowIso();
      task.updatedAt = task.startedAt;
      schedulePersist();

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
          schedulePersist();
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
            schedulePersist();
            return;
          }

          task.status = "failed";
          task.finishedAt = nowIso();
          task.updatedAt = task.finishedAt;
          recordFinished(task);
          schedulePersist();
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
    schedulePersist();
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
    schedulePersist();
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
      persistence: {
        enabled: persistence.enabled,
        filePath: persistence.filePath,
        available: persistence.available,
        lastLoadedAt: persistence.lastLoadedAt,
        lastSavedAt: persistence.lastSavedAt,
        lastError: persistence.lastError,
        lastErrorAt: persistence.lastErrorAt,
      },
    };
  }

  loadPersistedState();
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
