const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const bcrypt = require("bcryptjs");

const { createApp } = require("../server/app");
const { createTaskQueue } = require("../server/lib/taskQueue");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-shot-task-"));
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><title>test</title>");
  fs.writeFileSync(path.join(root, "viewer.html"), "<!doctype html><title>viewer</title>");
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(path.join(root, "animations.json"), "{}\n");
  fs.writeFileSync(
    path.join(root, "content", "items.json"),
    JSON.stringify(
      {
        version: 2,
        items: [
          {
            id: "l_task",
            type: "link",
            categoryId: "other",
            url: "https://example.com",
            title: "Task",
            description: "",
            thumbnail: "",
            order: 0,
            published: true,
            hidden: false,
            uploadKind: "html",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
      null,
      2,
    ),
  );
  return root;
}

function makeAuthConfig() {
  return {
    adminUsername: "admin",
    adminPasswordHash: bcrypt.hashSync("secret", 10),
    jwtSecret: "task-api-test",
    jwtIssuer: "physicsAnimations",
    jwtAudience: "physicsAnimations-web",
    tokenTtlSeconds: 3600,
  };
}

async function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

async function stopServer(server) {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
}

async function login(baseUrl, authConfig) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: authConfig.adminUsername, password: "secret" }),
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(data?.token);
  return data.token;
}

async function waitForTask(baseUrl, token, taskId, status, timeoutMs = 1200) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${baseUrl}/api/tasks/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    if (data?.task?.status === status) return data.task;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`task timeout: ${status}`);
}

test("/api/items/:id/screenshot enqueues task and supports retry", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();

  const queue = createTaskQueue({ concurrency: 1, maxQueue: 20, maxTasks: 100 });
  let attempts = 0;
  queue.registerHandler("screenshot", async () => {
    attempts += 1;
    if (attempts <= 2) throw new Error("first_fail");
    return { ok: true, thumbnail: "content/thumbnails/l_task.png", itemId: "l_task" };
  });

  const app = createApp({ rootDir, authConfig, taskQueue: queue });
  const { server, baseUrl } = await startServer(app);
  try {
    const token = await login(baseUrl, authConfig);

    const create = await fetch(`${baseUrl}/api/items/l_task/screenshot`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(create.status, 202);
    const created = await create.json();
    const taskId = created?.task?.id;
    assert.ok(taskId);

    const failed = await waitForTask(baseUrl, token, taskId, "failed");
    assert.equal(failed.lastError, "first_fail");

    const retry = await fetch(`${baseUrl}/api/tasks/${encodeURIComponent(taskId)}/retry`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(retry.status, 200);
    const retried = await retry.json();
    assert.equal(["queued", "running"].includes(retried?.task?.status), true);

    const success = await waitForTask(baseUrl, token, taskId, "succeeded");
    assert.equal(success?.result?.ok, true);
    assert.equal(success?.result?.itemId, "l_task");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
