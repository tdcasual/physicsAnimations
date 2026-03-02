const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { createLocalStore } = require("../server/lib/contentStore/localStore");
const { createWebdavStore } = require("../server/lib/contentStore/webdavStore");

test("local store rejects traversal key on writeBuffer", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-store-key-"));
  const store = createLocalStore({ rootDir });
  const escapedPath = path.join(rootDir, "escaped.txt");

  try {
    await assert.rejects(
      () => store.writeBuffer("../escaped.txt", Buffer.from("x")),
      (err) => err && err.message === "invalid_storage_key",
    );
    assert.equal(fs.existsSync(escapedPath), false);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("local store rejects storage keys containing query or fragment markers", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-store-key-marker-"));
  const store = createLocalStore({ rootDir });

  try {
    await assert.rejects(
      () => store.writeBuffer("uploads/a?b/index.html", Buffer.from("x")),
      (err) => err && err.message === "invalid_storage_key",
    );
    await assert.rejects(
      () => store.writeBuffer("uploads/a%23b/index.html", Buffer.from("x")),
      (err) => err && err.message === "invalid_storage_key",
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("webdav store rejects traversal key before issuing network requests", async () => {
  const store = createWebdavStore({
    url: "http://127.0.0.1:65535",
    basePath: "physicsAnimations",
    timeoutMs: 15000,
  });

  await assert.rejects(
    () => store.readBuffer("../outside.txt"),
    (err) => err && err.message === "invalid_storage_key",
  );
});

test("webdav store rejects unsafe basePath traversal segments", () => {
  assert.throws(
    () =>
      createWebdavStore({
        url: "http://127.0.0.1:65535",
        basePath: "../outside",
        timeoutMs: 15000,
      }),
    (err) => err && err.message === "invalid_webdav_base_path",
  );
});
