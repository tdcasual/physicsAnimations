const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { createContentStore } = require("../server/lib/contentStore");

test("createContentStore falls back to cwd when rootDir is omitted", async () => {
  const store = createContentStore({
    config: {
      storage: {
        mode: "local",
      },
    },
  });

  assert.equal(store.mode, "local");
  assert.equal(store.baseDir, path.join(process.cwd(), "content"));

  const key = `tmp/content-store-rootdir-default-${Date.now()}.txt`;
  await store.writeBuffer(key, Buffer.from("ok", "utf8"));
  const out = await store.readBuffer(key);
  assert.equal(out?.toString("utf8"), "ok");
  await store.deletePath(key);
});
