const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { createRuntimeMetrics } = require("../server/lib/runtimeMetrics");

async function withServer(app, run) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("runtime metrics counts /api root path requests", async () => {
  const app = express();
  const runtimeMetrics = createRuntimeMetrics();
  app.use(runtimeMetrics.middleware);
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api`);
    assert.equal(res.status, 404);
    const snapshot = runtimeMetrics.snapshot();
    assert.equal(snapshot.requestsTotal, 1);
    assert.equal(snapshot.statusCounts["4xx"], 1);
  });
});
