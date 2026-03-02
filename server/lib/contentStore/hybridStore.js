const logger = require("../logger");
const { createLocalStore } = require("./localStore");
const { createWebdavStore } = require("./webdavStore");

function createHybridStore({ rootDir, webdavConfig }) {
  const local = createLocalStore({ rootDir });
  const webdav = createWebdavStore(webdavConfig);

  async function mirror(op, label) {
    try {
      await op();
    } catch (err) {
      logger.warn("webdav_mirror_failed", {
        operation: label,
        error: err,
      });
    }
  }

  return {
    mode: "hybrid",
    readOnly: false,
    baseDir: local.baseDir,
    baseUrl: webdav.baseUrl,
    basePath: webdav.basePath,
    webdav,
    local,

    async readBuffer(key) {
      let localBuf = null;
      try {
        localBuf = await local.readBuffer(key);
      } catch (err) {
        logger.warn("hybrid_local_read_failed", {
          operation: `read ${key}`,
          error: err,
        });
      }
      if (localBuf) return localBuf;
      const remoteBuf = await webdav.readBuffer(key);
      if (remoteBuf) {
        await mirror(() => local.writeBuffer(key, remoteBuf), `cache ${key}`);
      }
      return remoteBuf;
    },

    async writeBuffer(key, buffer, options) {
      await local.writeBuffer(key, buffer, options);
      await mirror(() => webdav.writeBuffer(key, buffer, options), `write ${key}`);
    },

    async deletePath(key, options) {
      await local.deletePath(key, options);
      await mirror(() => webdav.deletePath(key, options), `delete ${key}`);
    },

    async createReadStream(key) {
      let localStream = null;
      try {
        localStream = await local.createReadStream(key);
      } catch (err) {
        logger.warn("hybrid_local_read_failed", {
          operation: `stream ${key}`,
          error: err,
        });
      }
      if (localStream) return localStream;
      return webdav.createReadStream(key);
    },
  };
}

module.exports = {
  createHybridStore,
};
