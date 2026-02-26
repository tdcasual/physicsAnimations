const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("frontend dist should not contain migration-in-progress copy", () => {
  const distDir = path.join(__dirname, "..", "frontend", "dist");
  const files = [];

  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
        continue;
      }
      if (/\.(html|js|css)$/i.test(name)) files.push(full);
    }
  }

  walk(distDir);
  let hit = "";
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    if (content.includes("迁移中")) {
      hit = file;
      break;
    }
  }

  assert.equal(hit, "", `found forbidden copy in dist: ${hit}`);
});
