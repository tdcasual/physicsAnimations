const test = require("node:test");
const assert = require("node:assert/strict");

const { createLibraryService } = require("../server/services/library/libraryService");

function createMockEmbedFetcher() {
  const responses = new Map([
    [
      "https://field.infinitas.fun/embed/embed.js",
      {
        body: "window.ElectricFieldApp = function ElectricFieldApp() {};",
        contentType: "application/javascript",
      },
    ],
    [
      "https://field.infinitas.fun/embed/viewer.html",
      {
        body: "<!doctype html><html><head></head><body><div id='root'></div></body></html>",
        contentType: "text/html; charset=utf-8",
      },
    ],
  ]);

  return async (url) => {
    const item = responses.get(String(url || ""));
    if (!item) {
      return new Response("not found", { status: 404, headers: { "content-type": "text/plain" } });
    }
    return new Response(item.body, { status: 200, headers: { "content-type": item.contentType } });
  };
}

test("createEmbedProfile cleans up mirrored files when profile state write fails", async () => {
  const writeCalls = [];
  const deleteCalls = [];

  const service = createLibraryService({
    store: {
      async readBuffer() {
        return null;
      },
      async writeBuffer(key) {
        writeCalls.push(key);
      },
      async deletePath(key, options = {}) {
        deleteCalls.push({ key, options });
      },
    },
    deps: {
      fetcher: createMockEmbedFetcher(),
      loadLibraryFoldersState: async () => ({ folders: [] }),
      mutateLibraryFoldersState: async () => {},
      loadLibraryAssetsState: async () => ({ assets: [] }),
      mutateLibraryAssetsState: async () => {},
      loadLibraryEmbedProfilesState: async () => ({ profiles: [] }),
      mutateLibraryEmbedProfilesState: async () => {
        throw new Error("profile_state_write_failed");
      },
    },
  });

  await assert.rejects(
    () =>
      service.createEmbedProfile({
        name: "电场仿真",
        scriptUrl: "https://field.infinitas.fun/embed/embed.js",
        viewerPath: "https://field.infinitas.fun/embed/viewer.html",
      }),
    (err) => err && err.message === "profile_state_write_failed",
  );

  assert.equal(writeCalls.length >= 2, true);
  assert.equal(deleteCalls.length, 2);
  assert.match(deleteCalls[0].key, /^library\/vendor\/embed-profiles\/ep_.*\/current$/);
  assert.equal(deleteCalls[0].options.recursive, true);
  assert.match(deleteCalls[1].key, /^library\/vendor\/embed-profiles\/ep_[^/]+$/);
  assert.equal(deleteCalls[1].options.recursive, true);
});
