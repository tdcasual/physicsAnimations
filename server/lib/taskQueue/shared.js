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

module.exports = {
  toPositiveInt,
  toTaskStatus,
  isTerminalStatus,
  nowIso,
  toTaskView,
  taskErrorMessage,
};
