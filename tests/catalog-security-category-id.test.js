const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { loadCatalog } = require("../server/lib/catalog");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-catalog-sec-"));
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "animations.json"),
    JSON.stringify(
      {
        mechanics: {
          title: "力学",
          items: [],
        },
      },
      null,
      2,
    ),
    "utf8",
  );
  return root;
}

test("loadCatalog guards categoryId map keys against prototype pollution payloads", async () => {
  const rootDir = makeTempRoot();
  const originalProtoItems = Object.prototype.items;

  const store = {
    async readBuffer(key) {
      const normalized = String(key || "").replace(/^\/+/, "");
      if (normalized === "categories.json") {
        return Buffer.from('{"version":2,"groups":{},"categories":{}}\n', "utf8");
      }
      if (normalized === "items.json") {
        return Buffer.from(
          `${JSON.stringify(
            {
              version: 2,
              items: [
                {
                  id: "l1",
                  type: "link",
                  categoryId: "__proto__",
                  url: "https://example.com",
                  title: "Unsafe Category",
                  description: "",
                  thumbnail: "",
                  order: 0,
                  published: true,
                  hidden: false,
                  uploadKind: "html",
                  createdAt: "",
                  updatedAt: "",
                },
              ],
            },
            null,
            2,
          )}\n`,
          "utf8",
        );
      }
      return null;
    },
  };

  try {
    const catalog = await loadCatalog({ rootDir, store });
    assert.equal(Object.prototype.items, originalProtoItems);

    const physicsGroup = catalog.groups.physics;
    assert.ok(physicsGroup);

    const otherCategory = physicsGroup.categories.other;
    assert.ok(otherCategory);
    assert.equal(otherCategory.items.length, 1);
    assert.equal(otherCategory.items[0].id, "l1");
    assert.equal(otherCategory.items[0].categoryId, "other");
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
