const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("configuration guide documents hybrid storage mode behavior", () => {
  const source = fs.readFileSync("docs/guides/configuration.md", "utf8");

  assert.match(source, /\| `STORAGE_MODE` \| `local` \| 可选 `local` \/ `hybrid` \/ `webdav`/);
  assert.match(source, /未设置 `STORAGE_MODE` 且提供 `WEBDAV_URL` 时，会自动使用 `hybrid`/);
});
