const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

test("createScreenshotService exposes runScreenshotTask", async () => {
  const { createScreenshotService } = require("../server/services/items/screenshotService");

  const service = createScreenshotService({
    rootDir: process.cwd(),
    store: {},
    deps: {
      mutateItemsState: async () => null,
      noSave: (value) => ({ value }),
      captureScreenshotQueued: async () => null,
      filePathToUrl: (value) => String(value || ""),
      assertPublicHttpUrl: async (value) => new URL(String(value || "https://example.com")),
    },
  });

  assert.equal(typeof createScreenshotService, "function");
  assert.equal(typeof service.runScreenshotTask, "function");
});

test("runScreenshotTask cleans up thumbnail when item state write fails", async () => {
  const { createScreenshotService } = require("../server/services/items/screenshotService");

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-shot-cleanup-"));
  const deleteCalls = [];
  const noSave = (value) => ({ __noSave: true, value });
  const state = {
    items: [
      {
        id: "l_1",
        type: "link",
        url: "https://example.com/",
        path: "",
        thumbnail: "",
      },
    ],
  };

  let mutateCallCount = 0;
  const service = createScreenshotService({
    rootDir,
    store: {
      mode: "local",
      async readBuffer() {
        return null;
      },
      async writeBuffer() {},
      async deletePath(key) {
        deleteCalls.push(key);
      },
    },
    deps: {
      noSave,
      mutateItemsState: async (_ctx, mutator) => {
        mutateCallCount += 1;
        const out = await mutator(state);
        if (out && out.__noSave) return out.value;
        if (mutateCallCount >= 2) {
          throw new Error("state_write_failed");
        }
        return out;
      },
      captureScreenshotQueued: async ({ outputPath }) => {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, Buffer.from("png", "utf8"));
      },
      filePathToUrl: (value) => String(value || ""),
      assertPublicHttpUrl: async (value) => new URL(String(value || "https://example.com")),
    },
  });

  try {
    await assert.rejects(
      () => service.runScreenshotTask({ id: "l_1" }),
      (err) => err && err.message === "state_write_failed",
    );
    assert.deepEqual(deleteCalls, ["thumbnails/l_1.png"]);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
