const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("configuration guide documents strict local/webdav storage behavior", () => {
  const source = fs.readFileSync("docs/guides/configuration.md", "utf8");

  assert.match(source, /\| `STORAGE_MODE` \| `local` \| 可选 `local` \/ `webdav`/);
  assert.match(source, /必须显式设置 `STORAGE_MODE=webdav` 才会启用 WebDAV/);
  assert.match(source, /不再支持 `hybrid` \/ `mirror` \/ `local\+webdav`/);
});
