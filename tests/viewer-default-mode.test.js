const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const viewerScriptPath = path.join(__dirname, "..", "assets", "viewer.js");

test("viewer external link defaults to interactive mode", () => {
  const script = fs.readFileSync(viewerScriptPath, "utf8");
  assert.match(
    script,
    /默认直接进入交互；若无法嵌入请点“打开原页面”/,
  );
  assert.match(script, /screenshotMode\s*=\s*false;\s*\n\s*modeBtn\.textContent\s*=\s*"仅截图";/);
});

