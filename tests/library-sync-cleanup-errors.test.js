const test = require("node:test");
const assert = require("node:assert/strict");

const { createLibraryService } = require("../server/services/library/libraryService");

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
    [`${baseUrl}/embed/embed.js`, { body: 'console.log("embed");', contentType: "application/javascript" }],
    [
      `${baseUrl}/embed/viewer.html`,
      { body: "<!doctype html><html><body><div id='root'></div></body></html>", contentType: "text/html; charset=utf-8" },
    ],
  ]);
  return async (url) => {
    const key = String(url || "");
    const item = resources.get(key);
    if (!item) {
      return new Response("not found", {
        status: 404,
        headers: { "content-type": "text/plain" },
      });
    }
    return new Response(item.body, {
      status: 200,
      headers: { "content-type": item.contentType },
    });
  };
}

test("syncEmbedProfile fails when cleanup of previous mirror directory fails", async () => {
  const store = createMemoryStore();
  const service = createLibraryService({
    store,
    deps: { fetcher: createMockEmbedFetcher() },
  });

  const created = await service.createEmbedProfile({
    name: "Cleanup Failure",
    scriptUrl: "https://field.infinitas.fun/embed/embed.js",
    viewerPath: "https://field.infinitas.fun/embed/viewer.html",
  });
  assert.equal(created?.ok, true);
  const profileId = created.profile.id;

  const originalDeletePath = store.deletePath;
  store.deletePath = async (prefix, options) => {
    if (
      String(prefix || "") === `library/vendor/embed-profiles/${profileId}/current` &&
      options?.recursive === true
    ) {
      throw new Error("delete_failed");
    }
    return originalDeletePath(prefix, options);
  };

  const synced = await service.syncEmbedProfile({ profileId });
  assert.equal(synced?.status, 502);
  assert.equal(synced?.error, "embed_profile_sync_failed");

  const profile = await service.getEmbedProfileById({ profileId });
  assert.equal(profile?.syncStatus, "failed");
});
