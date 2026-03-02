const test = require("node:test");
const assert = require("node:assert/strict");

function createMemoryStore() {
  const blobs = new Map();
  return {
    blobs,
    async readBuffer(key) {
      return blobs.has(key) ? Buffer.from(blobs.get(key)) : null;
    },
    async writeBuffer(key, buffer) {
      blobs.set(key, Buffer.from(buffer));
    },
    async deletePath(prefix, options = {}) {
      const normalized = String(prefix || "").replace(/^\/+/, "").replace(/\/+$/, "");
      if (!normalized) return;
      if (options.recursive) {
        for (const key of Array.from(blobs.keys())) {
          if (key === normalized || key.startsWith(`${normalized}/`)) blobs.delete(key);
        }
        return;
      }
      blobs.delete(normalized);
    },
  };
}

function createMockEmbedFetcher(baseUrl = "https://field.infinitas.fun") {
  const resources = new Map([
    [`${baseUrl}/embed/embed.js`, { body: 'window.ElectricFieldApp = function () {};', contentType: "application/javascript" }],
    [
      `${baseUrl}/embed/viewer.html`,
      {
        body: "<!doctype html><html><body><div id=\"app\"></div></body></html>",
        contentType: "text/html; charset=utf-8",
      },
    ],
  ]);
  return async (url) => {
    const key = String(url || "");
    const item = resources.get(key);
    if (!item) {
      return new Response("not found", { status: 404, headers: { "content-type": "text/plain" } });
    }
    return new Response(item.body, {
      status: 200,
      headers: { "content-type": item.contentType },
    });
  };
}

test("updateEmbedProfile keeps sync state when remote source fields are unchanged", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  const service = createLibraryService({
    store: createMemoryStore(),
    deps: { fetcher: createMockEmbedFetcher() },
  });

  const created = await service.createEmbedProfile({
    name: "Original Name",
    scriptUrl: "https://field.infinitas.fun/embed/embed.js",
    viewerPath: "https://field.infinitas.fun/embed/viewer.html",
    constructorName: "ElectricFieldApp",
  });
  assert.equal(created.ok, true);
  assert.equal(created.profile.syncStatus, "ok");

  const updated = await service.updateEmbedProfile({
    profileId: created.profile.id,
    name: "Renamed Only",
    scriptUrl: created.profile.remoteScriptUrl,
    viewerPath: created.profile.remoteViewerPath,
  });
  assert.equal(updated.ok, true);
  assert.equal(updated.profile.name, "Renamed Only");
  assert.equal(updated.profile.syncStatus, "ok");
  assert.equal(updated.profile.scriptUrl, created.profile.scriptUrl);
  assert.equal(updated.profile.viewerPath, created.profile.viewerPath);
});
