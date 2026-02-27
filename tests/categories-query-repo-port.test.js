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
        if (normalized === "builtin_items.json") {
          return Buffer.from('{"version":1,"items":{}}\n', "utf8");
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
        return { byCategory: { customx: 2 } };
      },
    },
  });

  const ids = new Set((payload.categories || []).map((c) => c.id));
  assert.equal(ids.has("customx"), true);

  fs.rmSync(rootDir, { recursive: true, force: true });
});
