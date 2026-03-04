const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("api guide documents current library resource lifecycle and embed sync endpoints", () => {
  const source = readUtf8("docs/guides/api.md");

  const requiredEndpoints = [
    "/api/library/deleted-assets",
    "/api/library/assets/:id/restore",
    "/api/library/assets/:id/permanent",
    "/api/library/embed-profiles/:id/sync/cancel",
    "/api/library/embed-profiles/:id/rollback",
  ];
  for (const endpoint of requiredEndpoints) {
    assert.match(source, new RegExp(endpoint.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }

  const requiredSyncFields = ["syncMessage", "syncLastReport", "activeReleaseId", "releaseHistory"];
  for (const field of requiredSyncFields) {
    assert.ok(source.includes(`\`${field}\``), `missing field in api guide: ${field}`);
  }
});

test("configuration guide documents embed sync resilience env vars", () => {
  const source = readUtf8("docs/guides/configuration.md");
  const requiredVars = [
    "LIBRARY_EMBED_SYNC_MAX_FILES",
    "LIBRARY_EMBED_SYNC_MAX_TOTAL_BYTES",
    "LIBRARY_EMBED_SYNC_MAX_FILE_BYTES",
    "LIBRARY_EMBED_SYNC_TIMEOUT_MS",
    "LIBRARY_EMBED_SYNC_CONCURRENCY",
    "LIBRARY_EMBED_SYNC_KEEP_RELEASES",
    "LIBRARY_EMBED_SYNC_RETRY_MAX_ATTEMPTS",
    "LIBRARY_EMBED_SYNC_RETRY_BASE_DELAY_MS",
    "LIBRARY_EMBED_SYNC_STRICT_SELF_CHECK",
  ];
  for (const envName of requiredVars) {
    assert.ok(source.includes(`\`${envName}\``), `missing env var in configuration guide: ${envName}`);
  }
});

test("incident runbook includes embed sync cancellation and rollback handling", () => {
  const source = readUtf8("docs/guides/ops-library-incident-runbook.md");
  assert.match(source, /sync\/cancel/i);
  assert.match(source, /rollback/i);
  assert.match(source, /syncLastReport/i);
});
