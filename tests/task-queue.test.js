const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createTaskQueue } = require("../server/lib/taskQueue");

function sleep(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

async function waitForStatus(queue, taskId, expected, { timeoutMs = 1200, intervalMs = 20 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const task = queue.getTask(taskId);
    if (task?.status === expected) return task;
    await sleep(intervalMs);
  }
  throw new Error(`task_status_timeout:${expected}`);
}

test("task queue runs handler and stores result", async () => {
  const queue = createTaskQueue({ concurrency: 1, maxQueue: 20, maxTasks: 100 });
  queue.registerHandler("echo", async (payload) => ({ ok: true, value: payload.value }));

  const task = queue.enqueueTask({ type: "echo", payload: { value: 42 }, maxAttempts: 1 });
  assert.equal(["queued", "running"].includes(task.status), true);

  const done = await waitForStatus(queue, task.id, "succeeded");
  assert.equal(done.result?.ok, true);
  assert.equal(done.result?.value, 42);
});

test("task queue supports retry after failure", async () => {
  const queue = createTaskQueue({ concurrency: 1, maxQueue: 20, maxTasks: 100 });

  let calls = 0;
  queue.registerHandler("flaky", async () => {
    calls += 1;
    if (calls === 1) throw new Error("boom");
    return { ok: true };
  });

  const first = queue.enqueueTask({ type: "flaky", payload: {}, maxAttempts: 1 });
  const failed = await waitForStatus(queue, first.id, "failed");
  assert.equal(failed.lastError, "boom");

  const retried = queue.retryTask(first.id);
  assert.equal(["queued", "running"].includes(retried.status), true);

  const succeeded = await waitForStatus(queue, first.id, "succeeded");
  assert.equal(succeeded.result?.ok, true);
  assert.equal(calls >= 2, true);
});

test("task queue marks running tasks failed after restart and keeps queued tasks", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-task-queue-restart-"));
  const stateFile = path.join(root, "tasks.json");

  const now = new Date().toISOString();
  fs.writeFileSync(
    stateFile,
    `${JSON.stringify(
      {
        version: 1,
        tasks: [
          {
            id: "t_running",
            type: "echo",
            status: "running",
            attempts: 0,
            maxAttempts: 2,
            payload: { value: "running" },
            result: null,
            lastError: "",
            createdAt: now,
            updatedAt: now,
            startedAt: now,
            finishedAt: "",
          },
          {
            id: "t_queued",
            type: "echo",
            status: "queued",
            attempts: 0,
            maxAttempts: 2,
            payload: { value: "queued" },
            result: null,
            lastError: "",
            createdAt: now,
            updatedAt: now,
            startedAt: "",
            finishedAt: "",
          },
        ],
        pendingIds: ["t_queued"],
        finishedOrder: [],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  try {
    const queue = createTaskQueue({ concurrency: 1, maxQueue: 20, maxTasks: 100, stateFile });
    queue.registerHandler("echo", async (payload) => ({ ok: true, value: payload.value }));

    const recovered = queue.getTask("t_running");
    assert.equal(recovered?.status, "failed");
    assert.equal(recovered?.lastError, "task_recovered_after_restart");

    const done = await waitForStatus(queue, "t_queued", "succeeded");
    assert.equal(done?.result?.value, "queued");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("task queue enforces execution timeout", async () => {
  const queue = createTaskQueue({
    concurrency: 1,
    maxQueue: 20,
    maxTasks: 100,
    timeoutMs: 30,
  });

  queue.registerHandler("slow", async () => {
    await sleep(120);
    return { ok: true };
  });

  const task = queue.enqueueTask({ type: "slow", payload: {}, maxAttempts: 1 });
  const failed = await waitForStatus(queue, task.id, "failed", { timeoutMs: 2000 });
  assert.equal(failed.lastError, "task_timeout");
});
