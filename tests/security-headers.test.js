const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../server/app");
const { makeTempRoot, removeTempRoot } = require("./helpers/tempRoot");
const { startServer, stopServer } = require("./helpers/testServer");

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
  const rootDir = makeTempRoot({ prefix: "pa-sec-headers-" });
  const app = createApp({ rootDir });
  const { server, baseUrl } = await startServer(app);
  try {
    const apiRootRes = await fetch(`${baseUrl}/api`);
    assert.equal(apiRootRes.status, 404);
    assertApiSecurityHeaders(apiRootRes);

    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    assertApiSecurityHeaders(healthRes);

    const metricsRes = await fetch(`${baseUrl}/api/metrics`);
    assert.equal(metricsRes.status, 401);
    assertApiSecurityHeaders(metricsRes);
  } finally {
    await stopServer(server);
    removeTempRoot(rootDir);
  }
});
