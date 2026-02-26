const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { performance } = require("node:perf_hooks");

const { createApp } = require("../server/app");

const DEFAULT_SCALE = {
  items: 2000,
  categories: 80,
  groups: 5,
  builtinCategories: 20,
  builtinItemsPerCategory: 10,
};

function toInt(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toFloat(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getScaleFromEnv() {
  const scale = { ...DEFAULT_SCALE };
  const envItems = toInt(process.env.PERF_ITEMS, null);
  const envCategories = toInt(process.env.PERF_CATEGORIES, null);
  const envGroups = toInt(process.env.PERF_GROUPS, null);
  if (envItems !== null) scale.items = envItems;
  if (envCategories !== null) scale.categories = envCategories;
  if (envGroups !== null) scale.groups = envGroups;

  const envBuiltinCategories = toInt(process.env.PERF_BUILTIN_CATEGORIES, null);
  const envBuiltinItems = toInt(process.env.PERF_BUILTIN_ITEMS_PER_CATEGORY, null);
  if (envBuiltinCategories !== null) {
    scale.builtinCategories = envBuiltinCategories;
  } else {
    scale.builtinCategories = Math.min(scale.categories, DEFAULT_SCALE.builtinCategories);
  }
  if (envBuiltinItems !== null) scale.builtinItemsPerCategory = envBuiltinItems;

  let label = (process.env.PERF_SCALE || "B").toUpperCase();
  if (envItems !== null || envCategories !== null || envGroups !== null) label = "custom";
  return { scale, label };
}

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
  const text = await response.text();
  const bytes = Buffer.byteLength(text, "utf8");
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  return { response, data, status: response.status, bytes };
}

function percentile(sorted, pct) {
  if (!sorted.length) return 0;
  const index = (pct / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function summarize(runs) {
  if (!runs.length) {
    return { avg: 0, p50: 0, p95: 0, max: 0 };
  }
  const sorted = [...runs].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    avg: total / sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
  };
}

async function runBenchmark({ name, baseUrl, path: apiPath, warmup, runs }) {
  for (let i = 0; i < warmup; i += 1) {
    await fetchJson(baseUrl, apiPath);
  }

  const durations = [];
  let bytes = 0;
  for (let i = 0; i < runs; i += 1) {
    const start = performance.now();
    const { status, bytes: responseBytes } = await fetchJson(baseUrl, apiPath);
    const end = performance.now();
    assert.equal(status, 200);
    durations.push(end - start);
    bytes = responseBytes;
  }

  return { name, runs: durations, bytes };
}

test("perf fixture matches scale B", () => {
  const fixture = buildFixture();
  assert.equal(fixture.items.length, 2000);
});

test("perf benchmarks emit stats", async () => {
  const { scale, label } = getScaleFromEnv();
  const rootDir = makeTempRoot();
  const fixture = buildFixture(scale);
  writeFixture(rootDir, fixture);

  const app = createApp({ rootDir });
  const { server, baseUrl } = await startServer(app);
  try {
    const runs = Math.max(1, toInt(process.env.PERF_RUNS, 8));
    const warmup = Math.max(0, toInt(process.env.PERF_WARMUP, 2));
    const assertAvg = toFloat(process.env.PERF_ASSERT_AVG_MS, null);
    const assertP95 = toFloat(process.env.PERF_ASSERT_P95_MS, null);

    console.log(
      `[perf] scale=${label} items=${scale.items} categories=${scale.categories} groups=${scale.groups} node=${process.version}`,
    );

    const endpoints = [
      { name: "/api/catalog", path: "/api/catalog" },
      { name: "/api/categories", path: "/api/categories" },
      { name: "/api/items?page=1&pageSize=24", path: "/api/items?page=1&pageSize=24" },
      { name: "/api/items?type=link", path: "/api/items?page=1&pageSize=24&type=link" },
      { name: "/api/items?q=term", path: "/api/items?page=1&pageSize=24&q=item" },
    ];

    for (const endpoint of endpoints) {
      const bench = await runBenchmark({
        name: endpoint.name,
        baseUrl,
        path: endpoint.path,
        warmup,
        runs,
      });
      const summary = summarize(bench.runs);
      console.log(
        `[perf] ${bench.name} avg=${summary.avg.toFixed(2)}ms p50=${summary.p50.toFixed(2)}ms p95=${summary.p95.toFixed(2)}ms max=${summary.max.toFixed(2)}ms bytes=${bench.bytes}`,
      );

      if (assertAvg !== null) {
        assert.ok(
          summary.avg <= assertAvg,
          `${bench.name} avg ${summary.avg.toFixed(2)}ms exceeds ${assertAvg}ms`,
        );
      }
      if (assertP95 !== null) {
        assert.ok(
          summary.p95 <= assertP95,
          `${bench.name} p95 ${summary.p95.toFixed(2)}ms exceeds ${assertP95}ms`,
        );
      }
    }
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
