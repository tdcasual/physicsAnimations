const fs = require("fs");
const path = require("path");

const { isTerminalStatus, toPositiveInt, toTaskStatus } = require("./shared");

function createTaskQueuePersistence({
  stateFile,
  tasks,
  pendingIds,
  finishedOrder,
  tasksMax,
  nowIso,
  taskErrorMessage,
  trimFinishedTasks,
}) {
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
  let persistScheduled = false;

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

      trimFinishedTasks(tasksMax);
      clearPersistenceError();
      persistence.lastLoadedAt = nowIso();
      if (recoveredRunning) schedulePersist();
    } catch (err) {
      markPersistenceError(err);
    }
  }

  function getPersistenceStats() {
    return {
      enabled: persistence.enabled,
      filePath: persistence.filePath,
      available: persistence.available,
      lastLoadedAt: persistence.lastLoadedAt,
      lastSavedAt: persistence.lastSavedAt,
      lastError: persistence.lastError,
      lastErrorAt: persistence.lastErrorAt,
    };
  }

  return {
    schedulePersist,
    loadPersistedState,
    getPersistenceStats,
  };
}

module.exports = {
  createTaskQueuePersistence,
};
