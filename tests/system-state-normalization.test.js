const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { loadSystemState } = require("../server/lib/systemState");

function withTempRoot(run) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-system-state-"));
  fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });
  try {
    run(rootDir);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
}

test("loadSystemState keeps numeric timeoutMs encoded as string", () => {
  withTempRoot((rootDir) => {
    fs.writeFileSync(
      path.join(rootDir, "content", "system.json"),
      `${JSON.stringify(
        {
          version: 1,
          storage: {
            mode: "webdav",
            webdav: {
              url: "https://dav.example.com/root",
              timeoutMs: "30000",
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const state = loadSystemState({ rootDir });
    assert.equal(state.storage.webdav.timeoutMs, 30000);
  });
});

test("loadSystemState treats suffixed timeout strings as invalid and falls back", () => {
  withTempRoot((rootDir) => {
    fs.writeFileSync(
      path.join(rootDir, "content", "system.json"),
      `${JSON.stringify(
        {
          version: 1,
          storage: {
            mode: "webdav",
            webdav: {
              url: "https://dav.example.com/root",
              timeoutMs: "15s",
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const state = loadSystemState({ rootDir });
    assert.equal(state.storage.webdav.timeoutMs, 15000);
  });
});

test("loadSystemState enforces minimum timeoutMs for invalid low values", () => {
  withTempRoot((rootDir) => {
    fs.writeFileSync(
      path.join(rootDir, "content", "system.json"),
      `${JSON.stringify(
        {
          version: 1,
          storage: {
            mode: "webdav",
            webdav: {
              url: "https://dav.example.com/root",
              timeoutMs: -5,
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const state = loadSystemState({ rootDir });
    assert.equal(state.storage.webdav.timeoutMs, 1000);
  });
});

test("loadSystemState clamps numeric zero timeoutMs to minimum value", () => {
  withTempRoot((rootDir) => {
    fs.writeFileSync(
      path.join(rootDir, "content", "system.json"),
      `${JSON.stringify(
        {
          version: 1,
          storage: {
            mode: "webdav",
            webdav: {
              url: "https://dav.example.com/root",
              timeoutMs: 0,
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const state = loadSystemState({ rootDir });
    assert.equal(state.storage.webdav.timeoutMs, 1000);
  });
});
