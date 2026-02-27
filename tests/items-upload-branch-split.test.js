const test = require("node:test");
const assert = require("node:assert/strict");

test("upload ingest split modules expose html/zip ingest functions", async () => {
  const { ingestZipUpload } = require("../server/services/items/uploadZipIngest");
  const { ingestHtmlUpload } = require("../server/services/items/uploadHtmlIngest");

  assert.equal(typeof ingestZipUpload, "function");
  assert.equal(typeof ingestHtmlUpload, "function");
});
