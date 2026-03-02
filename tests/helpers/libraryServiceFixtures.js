const { createAdapterRegistry } = require("../../server/services/library/adapters/registry");
const { createGeogebraAdapter } = require("../../server/services/library/adapters/geogebra");
const { createPhETAdapter } = require("../../server/services/library/adapters/phet");

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

function createTestAdapterRegistry() {
  return createAdapterRegistry([createGeogebraAdapter(), createPhETAdapter()]);
}

function createMockEmbedFetcher(baseUrl = "https://field.infinitas.fun") {
  const embedJs = `
    (function (global) {
      function ElectricFieldApp(options) { this.options = options || {}; }
      ElectricFieldApp.prototype.inject = function () {};
      global.ElectricFieldApp = ElectricFieldApp;
    })(window);
  `;
  const viewerHtml = `
    <!doctype html>
    <html>
      <head>
        <script type="module" src="./assets/main.js"></script>
        <link rel="stylesheet" href="./assets/main.css" />
      </head>
      <body><div id="root"></div></body>
    </html>
  `;
  const resources = new Map([
    [`${baseUrl}/embed/embed.js`, { body: embedJs, contentType: "application/javascript" }],
    [`${baseUrl}/embed/viewer.html`, { body: viewerHtml, contentType: "text/html; charset=utf-8" }],
    [`${baseUrl}/embed/assets/main.js`, { body: 'import "./chunk.js";', contentType: "application/javascript" }],
    [`${baseUrl}/embed/assets/chunk.js`, { body: 'console.log("chunk");', contentType: "application/javascript" }],
    [`${baseUrl}/embed/assets/main.css`, { body: "#root{min-height:100vh;}", contentType: "text/css" }],
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

module.exports = {
  createMemoryStore,
  createTestAdapterRegistry,
  createMockEmbedFetcher,
};
