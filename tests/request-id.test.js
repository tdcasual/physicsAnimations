const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../server/app");
const { makeTempRoot, removeTempRoot } = require("./helpers/tempRoot");
const { startServer, stopServer } = require("./helpers/testServer");

test("responses include X-Request-Id and preserve incoming value", async () => {
  const rootDir = makeTempRoot({ prefix: "pa-request-id-" });
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
    removeTempRoot(rootDir);
  }
});
