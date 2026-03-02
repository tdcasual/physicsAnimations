const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

function loadZipIngestWithMockedUnzipper(files) {
  const unzipperPath = require.resolve("unzipper");
  const ingestPath = require.resolve("../server/services/items/uploadZipIngest");
  const unzipperOriginal = require(unzipperPath);

  require.cache[unzipperPath].exports = {
    ...unzipperOriginal,
    Open: {
      ...unzipperOriginal.Open,
      async buffer() {
        return { files };
      },
    },
  };

  delete require.cache[ingestPath];
  const zipIngestModule = require(ingestPath);

  return {
    ingestZipUpload: zipIngestModule.ingestZipUpload,
    restore() {
      require.cache[unzipperPath].exports = unzipperOriginal;
      delete require.cache[ingestPath];
    },
  };
}

test("ingestZipUpload enforces MAX_TOTAL_BYTES by actual extracted bytes", async () => {
  const sharedLargeBuffer = Buffer.alloc(17 * 1024 * 1024, 1);
  const files = [
    {
      type: "File",
      path: "index.html",
      uncompressedSize: 0,
      async buffer() {
        return Buffer.from("<html><head><title>X</title></head><body>x</body></html>", "utf8");
      },
    },
    ...Array.from({ length: 5 }, (_, index) => ({
      type: "File",
      path: `assets/${index}.png`,
      uncompressedSize: 0,
      async buffer() {
        return sharedLargeBuffer;
      },
    })),
  ];

  const loader = loadZipIngestWithMockedUnzipper(files);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-zip-total-"));
  try {
    await assert.rejects(
      () =>
        loader.ingestZipUpload({
          fileBuffer: Buffer.from("zip-bytes", "utf8"),
          id: "u_zip_guard",
          now: new Date().toISOString(),
          tmpDir,
          writeUploadBuffer: async () => {},
        }),
      (err) => err && err.message === "zip_too_large" && err.status === 400,
    );
  } finally {
    loader.restore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("ingestZipUpload blocks risky html before any store writes when confirmation is missing", async () => {
  const files = [
    {
      type: "File",
      path: "index.html",
      uncompressedSize: 0,
      async buffer() {
        return Buffer.from(
          '<html><head><meta http-equiv="refresh" content="0;url=https://evil.example"></head><body><script>alert(1)</script></body></html>',
          "utf8",
        );
      },
    },
  ];

  const loader = loadZipIngestWithMockedUnzipper(files);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-zip-risk-write-"));
  const writes = [];
  try {
    await assert.rejects(
      () =>
        loader.ingestZipUpload({
          fileBuffer: Buffer.from("zip-bytes", "utf8"),
          id: "u_zip_risk",
          now: new Date().toISOString(),
          tmpDir,
          writeUploadBuffer: async (key) => {
            writes.push(key);
          },
          allowRiskyHtml: false,
        }),
      (err) => err && err.message === "risky_html_requires_confirmation" && err.status === 409,
    );
    assert.deepEqual(writes, []);
  } finally {
    loader.restore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
