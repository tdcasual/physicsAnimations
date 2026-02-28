const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const configPath = path.resolve(__dirname, "..", "config", "performance-budgets.json");

test("performance budget config defines endpoint budgets", () => {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.equal(typeof config?.defaultRuns, "number");
  assert.equal(typeof config?.defaultWarmup, "number");
  assert.equal(typeof config?.endpoints, "object");

  const expected = [
    "/api/catalog",
    "/api/categories",
    "/api/items?page=1&pageSize=24",
    "/api/items?type=link",
    "/api/items?q=term",
  ];
  for (const endpoint of expected) {
    const budget = config.endpoints[endpoint];
    assert.equal(typeof budget?.avgMs, "number");
    assert.equal(typeof budget?.p95Ms, "number");
  }
});
