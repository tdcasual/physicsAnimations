const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createApp } = require("../server/app");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-sec-headers-"));
  fs.writeFileSync(path.join(root, "animations.json"), "{}\n");
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  return root;
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
  await new Promise((resolve) => { server.close(resolve); });
}

function assertApiSecurityHeaders(response) {
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(
    response.headers.get("permissions-policy"),
    "geolocation=(), microphone=(), camera=()",
  );
}

test("api routes set defensive security headers", async () => {
  const rootDir = makeTempRoot();
  const app = createApp({ rootDir });
  const { server, baseUrl } = await startServer(app);
  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    assertApiSecurityHeaders(healthRes);

    const metricsRes = await fetch(`${baseUrl}/api/metrics`);
    assert.equal(metricsRes.status, 401);
    assertApiSecurityHeaders(metricsRes);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
