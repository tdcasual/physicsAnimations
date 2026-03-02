const test = require("node:test");
const assert = require("node:assert/strict");

const { scanRemoteUploads } = require("../server/lib/webdavSync/remoteScan");

test("scanRemoteUploads skips manifests whose entry file is missing", async () => {
  const imported = await scanRemoteUploads({
    existingIds: new Set(),
    webdav: {
      async listDir() {
        return [{ name: "u_demo", isDir: true }];
      },
      async readBuffer(key) {
        if (key === "uploads/u_demo/manifest.json") {
          return Buffer.from(
            JSON.stringify({
              version: 1,
              id: "u_demo",
              entry: "missing.html",
              files: ["missing.html"],
              createdAt: "2026-02-01T00:00:00.000Z",
            }),
            "utf8",
          );
        }
        return null;
      },
    },
  });

  assert.equal(imported.length, 0);
});

test("scanRemoteUploads imports when entry file exists", async () => {
  const imported = await scanRemoteUploads({
    existingIds: new Set(),
    webdav: {
      async listDir() {
        return [{ name: "u_demo", isDir: true }];
      },
      async readBuffer(key) {
        if (key === "uploads/u_demo/manifest.json") {
          return Buffer.from(
            JSON.stringify({
              version: 1,
              id: "u_demo",
              entry: "index.html",
              files: ["index.html"],
              createdAt: "2026-02-01T00:00:00.000Z",
            }),
            "utf8",
          );
        }
        if (key === "uploads/u_demo/index.html") {
          return Buffer.from("<html><head><title>Demo</title></head><body></body></html>", "utf8");
        }
        return null;
      },
    },
  });

  assert.equal(imported.length, 1);
  assert.equal(imported[0].id, "u_demo");
  assert.equal(imported[0].path, "content/uploads/u_demo/index.html");
  assert.equal(imported[0].title, "Demo");
  assert.equal(imported[0].uploadKind, "html");
});

test("scanRemoteUploads skips directory names that are not safe item ids", async () => {
  const imported = await scanRemoteUploads({
    existingIds: new Set(),
    webdav: {
      async listDir() {
        return [
          { name: "u_valid", isDir: true },
          { name: "u_bad/nested", isDir: true },
          { name: "u_bad\\\\windows", isDir: true },
        ];
      },
      async readBuffer(key) {
        if (key === "uploads/u_valid/manifest.json") {
          return Buffer.from(
            JSON.stringify({
              version: 1,
              id: "u_valid",
              entry: "index.html",
              files: ["index.html"],
              createdAt: "2026-02-01T00:00:00.000Z",
            }),
            "utf8",
          );
        }
        if (key === "uploads/u_valid/index.html") {
          return Buffer.from("<html><head><title>Valid</title></head><body></body></html>", "utf8");
        }
        if (key === "uploads/u_bad/nested/manifest.json") {
          return Buffer.from(
            JSON.stringify({
              version: 1,
              id: "u_bad/nested",
              entry: "index.html",
              files: ["index.html"],
              createdAt: "2026-02-01T00:00:00.000Z",
            }),
            "utf8",
          );
        }
        if (key === "uploads/u_bad\\\\windows/manifest.json") {
          return Buffer.from(
            JSON.stringify({
              version: 1,
              id: "u_bad\\\\windows",
              entry: "index.html",
              files: ["index.html"],
              createdAt: "2026-02-01T00:00:00.000Z",
            }),
            "utf8",
          );
        }
        if (key === "uploads/u_bad/nested/index.html" || key === "uploads/u_bad\\\\windows/index.html") {
          return Buffer.from("<html><head><title>Bad</title></head><body></body></html>", "utf8");
        }
        return null;
      },
    },
  });

  assert.equal(imported.length, 1);
  assert.equal(imported[0].id, "u_valid");
  assert.equal(imported[0].path, "content/uploads/u_valid/index.html");
});

test("scanRemoteUploads continues when one manifest read fails", async () => {
  const imported = await scanRemoteUploads({
    existingIds: new Set(),
    webdav: {
      async listDir() {
        return [
          { name: "u_broken", isDir: true },
          { name: "u_ok", isDir: true },
        ];
      },
      async readBuffer(key) {
        if (key === "uploads/u_broken/manifest.json") {
          throw new Error("webdav_get_failed_500");
        }
        if (key === "uploads/u_ok/manifest.json") {
          return Buffer.from(
            JSON.stringify({
              version: 1,
              id: "u_ok",
              entry: "index.html",
              files: ["index.html"],
              createdAt: "2026-02-01T00:00:00.000Z",
            }),
            "utf8",
          );
        }
        if (key === "uploads/u_ok/index.html") {
          return Buffer.from("<html><head><title>Okay</title></head><body></body></html>", "utf8");
        }
        return null;
      },
    },
  });

  assert.equal(imported.length, 1);
  assert.equal(imported[0].id, "u_ok");
  assert.equal(imported[0].title, "Okay");
});

test("scanRemoteUploads normalizes entry backslashes to forward-slash paths", async () => {
  const imported = await scanRemoteUploads({
    existingIds: new Set(),
    webdav: {
      async listDir() {
        return [{ name: "u_win", isDir: true }];
      },
      async readBuffer(key) {
        if (key === "uploads/u_win/manifest.json") {
          return Buffer.from(
            JSON.stringify({
              version: 1,
              id: "u_win",
              entry: "nested\\\\index.html",
              files: ["nested/index.html"],
              createdAt: "2026-02-01T00:00:00.000Z",
            }),
            "utf8",
          );
        }
        if (key === "uploads/u_win/nested/index.html" || key === "uploads/u_win/nested\\\\index.html") {
          return Buffer.from("<html><head><title>Windows</title></head><body></body></html>", "utf8");
        }
        return null;
      },
    },
  });

  assert.equal(imported.length, 1);
  assert.equal(imported[0].id, "u_win");
  assert.equal(imported[0].path, "content/uploads/u_win/nested/index.html");
  assert.equal(imported[0].uploadKind, "html");
});

test("scanRemoteUploads keeps epoch createdAt values from manifest", async () => {
  const imported = await scanRemoteUploads({
    existingIds: new Set(),
    webdav: {
      async listDir() {
        return [{ name: "u_epoch", isDir: true }];
      },
      async readBuffer(key) {
        if (key === "uploads/u_epoch/manifest.json") {
          return Buffer.from(
            JSON.stringify({
              version: 1,
              id: "u_epoch",
              entry: "index.html",
              files: ["index.html"],
              createdAt: "1970-01-01T00:00:00.000Z",
            }),
            "utf8",
          );
        }
        if (key === "uploads/u_epoch/index.html") {
          return Buffer.from("<html><head><title>Epoch</title></head><body></body></html>", "utf8");
        }
        return null;
      },
    },
  });

  assert.equal(imported.length, 1);
  assert.equal(imported[0].id, "u_epoch");
  assert.equal(imported[0].createdAt, "1970-01-01T00:00:00.000Z");
});

test("scanRemoteUploads decodes html entities in title and description", async () => {
  const imported = await scanRemoteUploads({
    existingIds: new Set(),
    webdav: {
      async listDir() {
        return [{ name: "u_entities", isDir: true }];
      },
      async readBuffer(key) {
        if (key === "uploads/u_entities/manifest.json") {
          return Buffer.from(
            JSON.stringify({
              version: 1,
              id: "u_entities",
              entry: "index.html",
              files: ["index.html"],
              createdAt: "2026-02-01T00:00:00.000Z",
            }),
            "utf8",
          );
        }
        if (key === "uploads/u_entities/index.html") {
          return Buffer.from(
            "<html><head><title>AT&amp;T</title><meta name=\"description\" content=\"A &amp; B\"></head><body></body></html>",
            "utf8",
          );
        }
        return null;
      },
    },
  });

  assert.equal(imported.length, 1);
  assert.equal(imported[0].title, "AT&T");
  assert.equal(imported[0].description, "A & B");
});
