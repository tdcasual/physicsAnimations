const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createApp } = require("../server/app");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-request-id-"));
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(path.join(root, "animations.json"), "{}\n");
  return root;
}

async function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function stopServer(server) {
  if (!server) return;
  await new Promise((resolve) => { server.close(resolve); });
}

test("responses include X-Request-Id and preserve incoming value", async () => {
  const rootDir = makeTempRoot();
  const app = createApp({ rootDir });
  const { server, baseUrl } = await startServer(app);

  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const generatedRequestId = healthRes.headers.get("x-request-id");
    assert.equal(typeof generatedRequestId, "string");
    assert.ok(generatedRequestId.length > 0);

    const incomingRequestId = "req-from-client-123";
    const passThroughRes = await fetch(`${baseUrl}/api/health`, {
      headers: { "X-Request-Id": incomingRequestId },
    });
    assert.equal(passThroughRes.status, 200);
    assert.equal(passThroughRes.headers.get("x-request-id"), incomingRequestId);

    const notFoundRes = await fetch(`${baseUrl}/api/__not_found__`);
    assert.equal(notFoundRes.status, 404);
    assert.ok((notFoundRes.headers.get("x-request-id") || "").length > 0);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
