const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { sendServiceResult } = require("../server/routes/library/shared");
const { respondWithServiceResult } = require("../server/routes/items/shared");

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

test("library sendServiceResult guards invalid status codes", async () => {
  const app = express();
  app.get("/library-result", (_req, res) => {
    sendServiceResult(
      res,
      { status: 700, error: "library_failed" },
      (result) => result,
    );
  });
  app.use((err, _req, res, _next) => {
    res.status(500).json({ error: `uncaught:${err?.code || err?.message}` });
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/library-result`);
    assert.equal(response.status, 500);
    const payload = await response.json();
    assert.equal(payload?.error, "library_failed");
  });
});

test("items respondWithServiceResult guards invalid status codes", async () => {
  const app = express();
  app.get("/items-result", (_req, res) => {
    const handled = respondWithServiceResult(res, {
      status: 700,
      error: "item_failed",
    });
    if (!handled) res.json({ ok: true });
  });
  app.use((err, _req, res, _next) => {
    res.status(500).json({ error: `uncaught:${err?.code || err?.message}` });
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/items-result`);
    assert.equal(response.status, 500);
    const payload = await response.json();
    assert.equal(payload?.error, "item_failed");
  });
});
