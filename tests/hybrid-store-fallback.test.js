const test = require("node:test");
const assert = require("node:assert/strict");

function loadHybridStoreWithMocks({ localStore, webdavStore, warn }) {
  const localStorePath = require.resolve("../server/lib/contentStore/localStore");
  const webdavStorePath = require.resolve("../server/lib/contentStore/webdavStore");
  const loggerPath = require.resolve("../server/lib/logger");
  const hybridStorePath = require.resolve("../server/lib/contentStore/hybridStore");

  const localOriginal = require(localStorePath);
  const webdavOriginal = require(webdavStorePath);
  const loggerOriginal = require(loggerPath);

  require.cache[localStorePath].exports = {
    ...localOriginal,
    createLocalStore: () => localStore,
  };
  require.cache[webdavStorePath].exports = {
    ...webdavOriginal,
    createWebdavStore: () => webdavStore,
  };
  require.cache[loggerPath].exports = {
    ...loggerOriginal,
    warn: typeof warn === "function" ? warn : loggerOriginal.warn,
  };

  delete require.cache[hybridStorePath];
  const hybridModule = require(hybridStorePath);

  return {
    createHybridStore: hybridModule.createHybridStore,
    restore() {
      require.cache[localStorePath].exports = localOriginal;
      require.cache[webdavStorePath].exports = webdavOriginal;
      require.cache[loggerPath].exports = loggerOriginal;
      delete require.cache[hybridStorePath];
    },
  };
}

test("hybrid store readBuffer falls back to webdav when local read fails", async () => {
  const warnings = [];
  const localStore = {
    baseDir: "/tmp/mock-content",
    async readBuffer() {
      throw new Error("local_read_failed");
    },
    async writeBuffer() {},
    async deletePath() {},
    async createReadStream() {
      return null;
    },
  };
  const webdavStore = {
    baseUrl: "https://dav.example.com/",
    basePath: "physicsAnimations",
    async readBuffer() {
      return Buffer.from("remote-data", "utf8");
    },
    async writeBuffer() {},
    async deletePath() {},
    async createReadStream() {
      return null;
    },
  };

  const loader = loadHybridStoreWithMocks({
    localStore,
    webdavStore,
    warn(message) {
      warnings.push(message);
    },
  });

  try {
    const store = loader.createHybridStore({ rootDir: process.cwd(), webdavConfig: { url: "https://dav.example.com" } });
    const out = await store.readBuffer("items.json");
    assert.equal(out.toString("utf8"), "remote-data");
    assert.ok(warnings.includes("hybrid_local_read_failed"));
  } finally {
    loader.restore();
  }
});

test("hybrid store createReadStream falls back to webdav when local stream fails", async () => {
  const remoteStream = { tag: "remote_stream" };
  const warnings = [];
  const localStore = {
    baseDir: "/tmp/mock-content",
    async readBuffer() {
      return null;
    },
    async writeBuffer() {},
    async deletePath() {},
    async createReadStream() {
      throw new Error("local_stream_failed");
    },
  };
  const webdavStore = {
    baseUrl: "https://dav.example.com/",
    basePath: "physicsAnimations",
    async readBuffer() {
      return null;
    },
    async writeBuffer() {},
    async deletePath() {},
    async createReadStream() {
      return remoteStream;
    },
  };

  const loader = loadHybridStoreWithMocks({
    localStore,
    webdavStore,
    warn(message) {
      warnings.push(message);
    },
  });

  try {
    const store = loader.createHybridStore({ rootDir: process.cwd(), webdavConfig: { url: "https://dav.example.com" } });
    const out = await store.createReadStream("uploads/u_test/index.html");
    assert.equal(out, remoteStream);
    assert.ok(warnings.includes("hybrid_local_read_failed"));
  } finally {
    loader.restore();
  }
});
