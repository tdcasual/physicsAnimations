const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { buildCategoriesPayloadWithSql } = require("../server/lib/categoriesPayload");

test("buildCategoriesPayloadWithSql uses injected taxonomyQueryRepo", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-categories-query-repo-"));
  fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "animations.json"), "{}\n");

  const payload = await buildCategoriesPayloadWithSql({
    rootDir,
    store: {
      async readBuffer(key) {
        const normalized = String(key || "").replace(/^\/+/, "");
        if (normalized === "categories.json") {
          return Buffer.from('{"version":2,"groups":{},"categories":{}}\n', "utf8");
        }
        if (normalized === "items.json") {
          return Buffer.from('{"version":2,"items":[]}\n', "utf8");
        }
        return null;
      },
    },
    isAdmin: false,
    taxonomyQueryRepo: {
      async queryDynamicCategoryCounts() {
        const byCategory = Object.create(null);
        byCategory.customx = 2;
        byCategory.__proto__ = 3;
        return { byCategory };
      },
    },
  });

  const categories = payload.categories || [];
  const ids = new Set(categories.map((c) => c.id));
  assert.equal(ids.has("customx"), true);
  assert.equal(ids.has("other"), true);

  const otherCategory = categories.find((category) => category.id === "other");
  assert.equal(otherCategory?.dynamicCount, 3);

  fs.rmSync(rootDir, { recursive: true, force: true });
});
