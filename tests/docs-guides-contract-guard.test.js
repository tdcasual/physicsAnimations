const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const GUIDES_DIR = path.join(__dirname, "..", "docs", "guides");

function listMarkdownFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(dir, entry.name));
}

test("guides do not reference removed compatibility artifacts", () => {
  const bannedPatterns = [
    /serverless-handler\.js/,
    /vercel\.json/,
    /hybridStore\.js/,
  ];

  for (const filePath of listMarkdownFiles(GUIDES_DIR)) {
    const source = fs.readFileSync(filePath, "utf8");
    for (const pattern of bannedPatterns) {
      assert.doesNotMatch(source, pattern, `${path.basename(filePath)} should not reference removed artifact ${pattern}`);
    }
  }
});

