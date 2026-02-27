const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { ingestHtmlUpload } = require("../server/services/items/uploadHtmlIngest");

test("ingestHtmlUpload keeps external deps untouched and does not download/rewrite them", async () => {
  const writes = [];
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-html-ingest-"));
  const originalFetch = global.fetch;
  const fetchCalls = [];

  global.fetch = async (url) => {
    fetchCalls.push(String(url));
    return new Response("/* dep */", {
      status: 200,
      headers: { "content-type": "application/javascript; charset=utf-8" },
    });
  };

  const html = [
    "<html><head>",
    '<link rel="stylesheet" href="https://cdn.example.com/app.css">',
    "</head><body>",
    '<script src="https://cdn.example.com/app.js"></script>',
    "</body></html>",
  ].join("");

  async function writeUploadBuffer(key, buffer) {
    writes.push({
      key,
      text: Buffer.isBuffer(buffer) ? buffer.toString("utf8") : String(buffer || ""),
    });
  }

  try {
    const result = await ingestHtmlUpload({
      fileBuffer: Buffer.from(html, "utf8"),
      id: "u_keep_raw",
      now: "2026-02-27T00:00:00.000Z",
      tmpDir,
      writeUploadBuffer,
      allowRiskyHtml: true,
      deps: {
        assertPublicHttpUrl: async (raw) => new URL(String(raw)),
      },
    });

    assert.equal(result.uploadKind, "html");
    assert.equal(result.entryRelPath, "index.html");
    assert.equal(fetchCalls.length, 0);

    const keys = writes.map((row) => row.key);
    assert.deepEqual(keys, [
      "uploads/u_keep_raw/index.html",
      "uploads/u_keep_raw/manifest.json",
    ]);

    const writtenHtml = writes.find((row) => row.key.endsWith("/index.html"))?.text || "";
    assert.match(writtenHtml, /https:\/\/cdn\.example\.com\/app\.css/);
    assert.match(writtenHtml, /https:\/\/cdn\.example\.com\/app\.js/);
    assert.equal(/src="deps\//.test(writtenHtml), false);
    assert.equal(/href="deps\//.test(writtenHtml), false);
  } finally {
    global.fetch = originalFetch;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
