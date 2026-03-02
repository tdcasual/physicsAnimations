const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { errorHandler } = require("../server/middleware/errorHandler");

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

test("errorHandler falls back to 500 for invalid status codes", async () => {
  const app = express();
  app.get("/boom", (_req, _res, next) => {
    const err = new Error("invalid_input");
    err.status = 0;
    next(err);
  });
  app.use(errorHandler);

  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/boom`);
    assert.equal(res.status, 500);
    const data = await res.json();
    assert.equal(data?.error, "server_error");
  });
});
