const test = require("node:test");
const assert = require("node:assert/strict");

test("createContentStore keeps explicit webdav config values over env fallbacks", () => {
  const contentStorePath = require.resolve("../server/lib/contentStore");
  const webdavStorePath = require.resolve("../server/lib/contentStore/webdavStore");

  const webdavOriginal = require(webdavStorePath);
  let capturedOptions = null;

  const prevUrl = process.env.WEBDAV_URL;
  const prevBasePath = process.env.WEBDAV_BASE_PATH;
  const prevUser = process.env.WEBDAV_USERNAME;
  const prevPass = process.env.WEBDAV_PASSWORD;
  const prevTimeout = process.env.WEBDAV_TIMEOUT_MS;
  process.env.WEBDAV_URL = "https://env.example.com/dav";
  process.env.WEBDAV_BASE_PATH = "env-base-path";
  process.env.WEBDAV_USERNAME = "env-user";
  process.env.WEBDAV_PASSWORD = "env-pass";
  process.env.WEBDAV_TIMEOUT_MS = "9999";

  require.cache[webdavStorePath].exports = {
    ...webdavOriginal,
    createWebdavStore(options) {
      capturedOptions = { ...options };
      return {
        mode: "webdav",
        readOnly: false,
        baseUrl: "https://example.com/",
        basePath: "physicsAnimations",
        async readBuffer() { return null; },
        async writeBuffer() {},
        async deletePath() {},
        async createReadStream() { return null; },
      };
    },
  };

  delete require.cache[contentStorePath];
  const { createContentStore } = require(contentStorePath);

  try {
    createContentStore({
      rootDir: process.cwd(),
      config: {
        storage: {
          mode: "webdav",
          webdav: {
            url: "https://cfg.example.com/dav",
            basePath: "",
            username: "",
            password: "",
            timeoutMs: 0,
          },
        },
      },
    });

    assert.ok(capturedOptions);
    assert.equal(capturedOptions.url, "https://cfg.example.com/dav");
    assert.equal(capturedOptions.basePath, "");
    assert.equal(capturedOptions.username, "");
    assert.equal(capturedOptions.password, "");
    assert.equal(capturedOptions.timeoutMs, 0);
  } finally {
    require.cache[webdavStorePath].exports = webdavOriginal;
    delete require.cache[contentStorePath];
    if (prevUrl === undefined) delete process.env.WEBDAV_URL;
    else process.env.WEBDAV_URL = prevUrl;
    if (prevBasePath === undefined) delete process.env.WEBDAV_BASE_PATH;
    else process.env.WEBDAV_BASE_PATH = prevBasePath;
    if (prevUser === undefined) delete process.env.WEBDAV_USERNAME;
    else process.env.WEBDAV_USERNAME = prevUser;
    if (prevPass === undefined) delete process.env.WEBDAV_PASSWORD;
    else process.env.WEBDAV_PASSWORD = prevPass;
    if (prevTimeout === undefined) delete process.env.WEBDAV_TIMEOUT_MS;
    else process.env.WEBDAV_TIMEOUT_MS = prevTimeout;
  }
});

test("createContentStore does not infer remote mode from WEBDAV_URL when mode is omitted", () => {
  const contentStorePath = require.resolve("../server/lib/contentStore");
  const prevUrl = process.env.WEBDAV_URL;
  const prevMode = process.env.STORAGE_MODE;
  process.env.WEBDAV_URL = "https://env.example.com/dav";
  delete process.env.STORAGE_MODE;
  delete require.cache[contentStorePath];
  const { createContentStore } = require(contentStorePath);

  try {
    const store = createContentStore({
      rootDir: process.cwd(),
      config: {
        storage: {
          webdav: {
            url: "https://cfg.example.com/dav",
          },
        },
      },
    });

    assert.equal(store.mode, "local");
  } finally {
    delete require.cache[contentStorePath];
    if (prevUrl === undefined) delete process.env.WEBDAV_URL;
    else process.env.WEBDAV_URL = prevUrl;
    if (prevMode === undefined) delete process.env.STORAGE_MODE;
    else process.env.STORAGE_MODE = prevMode;
  }
});

test("createContentStore does not downgrade to local_readonly fallback when local dir is not writable", () => {
  const contentStorePath = require.resolve("../server/lib/contentStore");
  const localStorePath = require.resolve("../server/lib/contentStore/localStore");
  const utilsPath = require.resolve("../server/lib/contentStore/utils");

  const localStoreOriginal = require(localStorePath);
  const utilsOriginal = require(utilsPath);

  let localCalls = 0;
  let readonlyCalls = 0;

  require.cache[localStorePath].exports = {
    ...localStoreOriginal,
    createLocalStore() {
      localCalls += 1;
      return {
        mode: "local",
        readOnly: false,
        async readBuffer() {
          return null;
        },
        async writeBuffer() {},
        async deletePath() {},
        async createReadStream() {
          return null;
        },
      };
    },
    createReadOnlyLocalStore() {
      readonlyCalls += 1;
      return {
        mode: "local_readonly",
        readOnly: true,
        async readBuffer() {
          return null;
        },
        async writeBuffer() {},
        async deletePath() {},
        async createReadStream() {
          return null;
        },
      };
    },
  };

  require.cache[utilsPath].exports = {
    ...utilsOriginal,
    canWriteDir() {
      return false;
    },
  };

  delete require.cache[contentStorePath];
  const { createContentStore } = require(contentStorePath);

  try {
    const store = createContentStore({
      rootDir: process.cwd(),
      config: {
        storage: {
          mode: "local",
        },
      },
    });
    assert.equal(store.mode, "local");
    assert.equal(localCalls, 1);
    assert.equal(readonlyCalls, 0);
  } finally {
    require.cache[localStorePath].exports = localStoreOriginal;
    require.cache[utilsPath].exports = utilsOriginal;
    delete require.cache[contentStorePath];
  }
});
