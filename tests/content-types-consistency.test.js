const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const { guessContentType } = require("../server/lib/contentTypes");

test("shared content type helper contains expected mappings", () => {
  assert.equal(guessContentType("sample.ggb"), "application/vnd.geogebra.file");
  assert.equal(guessContentType("sample.html"), "text/html; charset=utf-8");
  assert.equal(guessContentType("sample.unknown"), "application/octet-stream");
});

test("app and webdav file utils no longer define duplicated guessContentType", () => {
  const appSource = fs.readFileSync("server/app.js", "utf8");
  const fileUtilsSource = fs.readFileSync("server/lib/webdavSync/fileUtils.js", "utf8");

  assert.doesNotMatch(appSource, /function guessContentType\(/);
  assert.doesNotMatch(fileUtilsSource, /function guessContentType\(/);
  assert.match(appSource, /require\("\.\/lib\/contentTypes"\)/);
  assert.match(fileUtilsSource, /require\("\.\.\/contentTypes"\)/);
});
