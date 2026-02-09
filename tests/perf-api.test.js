const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createApp } = require("../server/app");

const DEFAULT_SCALE = {
  items: 2000,
  categories: 80,
  groups: 5,
  builtinCategories: 20,
  builtinItemsPerCategory: 10,
};

function makeSeededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function buildFixture(scale = DEFAULT_SCALE) {
  const rng = makeSeededRng(42);
  const groups = Array.from({ length: scale.groups }, (_, i) => ({
    id: `g${i + 1}`,
    title: `Group ${i + 1}`,
    order: i,
    hidden: false,
  }));

  const categories = Array.from({ length: scale.categories }, (_, i) => {
    const groupId = groups[i % groups.length].id;
    return {
      id: `c${i + 1}`,
      groupId,
      title: `Category ${i + 1}`,
      order: i,
      hidden: false,
    };
  });

  const items = Array.from({ length: scale.items }, (_, i) => {
    const category = categories[Math.floor(rng() * categories.length)];
    return {
      id: `item_${i + 1}`,
      categoryId: category.id,
    };
  });

  const animationsJson = {};
  for (let i = 0; i < scale.builtinCategories; i += 1) {
    const categoryId = `builtin_${i + 1}`;
    animationsJson[categoryId] = {
      title: `Builtin ${i + 1}`,
      items: Array.from({ length: scale.builtinItemsPerCategory }, (_, j) => ({
        file: `${categoryId}/demo_${j + 1}.html`,
        title: `Demo ${i + 1}-${j + 1}`,
        description: "",
        thumbnail: "",
      })),
    };
  }

  return { items, categories, groups, animationsJson };
}

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-perf-"));
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><title>test</title>");
  fs.writeFileSync(path.join(root, "viewer.html"), "<!doctype html><title>viewer</title>");
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  return root;
}

function writeFixture(rootDir, fixture) {
  fs.writeFileSync(
    path.join(rootDir, "animations.json"),
    `${JSON.stringify(fixture.animationsJson || {}, null, 2)}\n`,
  );

  const itemsPayload = {
    version: 2,
    items: fixture.items.map((item, index) => {
      const isLink = index % 5 === 0;
      return {
        id: item.id,
        type: isLink ? "link" : "upload",
        categoryId: item.categoryId,
        url: isLink ? `https://example.com/item/${item.id}` : "",
        path: isLink ? "" : `uploads/${item.id}/index.html`,
        title: `Item ${index + 1}`,
        description: "",
        thumbnail: "",
        order: 0,
        published: true,
        hidden: false,
        uploadKind: isLink ? "html" : "zip",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
    }),
  };
  fs.writeFileSync(
    path.join(rootDir, "content", "items.json"),
    `${JSON.stringify(itemsPayload, null, 2)}\n`,
  );

  const categoriesPayload = {
    version: 2,
    groups: Object.fromEntries(
      fixture.groups.map((group) => [group.id, { ...group }]),
    ),
    categories: Object.fromEntries(
      fixture.categories.map((category) => [category.id, { ...category }]),
    ),
  };
  fs.writeFileSync(
    path.join(rootDir, "content", "categories.json"),
    `${JSON.stringify(categoriesPayload, null, 2)}\n`,
  );
}

async function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

async function stopServer(server) {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
}

async function fetchJson(baseUrl, apiPath) {
  const response = await fetch(`${baseUrl}${apiPath}`, {
    headers: { Accept: "application/json" },
  });
  const data = await response.json().catch(() => null);
  return { response, data, status: response.status };
}

test("perf fixture matches scale B", () => {
  const fixture = buildFixture();
  assert.equal(fixture.items.length, 2000);
});

test("perf harness can hit /api/catalog", async () => {
  const rootDir = makeTempRoot();
  const fixture = buildFixture();
  writeFixture(rootDir, fixture);

  const app = createApp({ rootDir });
  const { server, baseUrl } = await startServer(app);
  try {
    const { status } = await fetchJson(baseUrl, "/api/catalog");
    assert.equal(status, 200);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
