const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { loadCatalog } = require("../server/lib/catalog");

test("loadCatalog uses injected taxonomyQueryRepo for dynamic catalog items", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-catalog-port-"));
  fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, "animations.json"),
    JSON.stringify({ mechanics: { title: "力学", items: [] } }, null, 2),
  );

  const store = {
    async readBuffer(key) {
      const normalized = String(key || "").replace(/^\/+/, "");
      if (normalized === "builtin_items.json") return Buffer.from('{"version":1,"items":{}}\n', "utf8");
      if (normalized === "categories.json") return Buffer.from('{"version":2,"groups":{},"categories":{}}\n', "utf8");
      if (normalized === "items.json") return Buffer.from('{"version":2,"items":[]}\n', "utf8");
      return null;
    },
  };

  const out = await loadCatalog({
    rootDir,
    store,
    taxonomyQueryRepo: {
      async queryDynamicItemsForCatalog() {
        return {
          items: [
            {
              id: "dyn1",
              type: "link",
              categoryId: "mechanics",
              title: "D",
              description: "",
              url: "https://example.com",
              thumbnail: "",
              order: 0,
              published: true,
              hidden: false,
              createdAt: "",
              updatedAt: "",
            },
          ],
        };
      },
    },
  });

  const ids = new Set((out.groups.physics.categories.mechanics.items || []).map((item) => item.id));
  assert.equal(ids.has("dyn1"), true);

  fs.rmSync(rootDir, { recursive: true, force: true });
});
