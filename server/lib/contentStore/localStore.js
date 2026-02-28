const fs = require("fs");
const path = require("path");

const { createError } = require("../errors");

function createReadOnlyLocalStore({ rootDir, reason = "" } = {}) {
  const baseDir = path.join(rootDir || process.cwd(), "content");

  function resolveKey(key) {
    const cleaned = String(key || "").replace(/^\/+/, "");
    return path.join(baseDir, cleaned);
  }

  function throwReadOnly() {
    throw createError("storage_readonly", 503, {
      reason: reason || "content_dir_not_writable",
      baseDir,
      hint: "Set STORAGE_MODE=webdav and configure WEBDAV_URL (+ optional WEBDAV_USERNAME/WEBDAV_PASSWORD).",
    });
  }

  return {
    mode: "local_readonly",
    readOnly: true,
    baseDir,

    async readBuffer(key) {
      const filePath = resolveKey(key);
      if (!fs.existsSync(filePath)) return null;
      return fs.promises.readFile(filePath);
    },

    async writeBuffer() {
      throwReadOnly();
    },

    async deletePath() {
      throwReadOnly();
    },

    async createReadStream(key) {
      const filePath = resolveKey(key);
      if (!fs.existsSync(filePath)) return null;
      return fs.createReadStream(filePath);
    },
  };
}

function createLocalStore({ rootDir }) {
  const baseDir = path.join(rootDir, "content");
  fs.mkdirSync(baseDir, { recursive: true });

  function resolveKey(key) {
    const cleaned = String(key || "").replace(/^\/+/, "");
    return path.join(baseDir, cleaned);
  }

  return {
    mode: "local",
    readOnly: false,
    baseDir,

    async readBuffer(key) {
      const filePath = resolveKey(key);
      if (!fs.existsSync(filePath)) return null;
      return fs.promises.readFile(filePath);
    },

    async writeBuffer(key, buffer) {
      const filePath = resolveKey(key);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const tmpPath = `${filePath}.tmp`;
      await fs.promises.writeFile(tmpPath, buffer);
      await fs.promises.rename(tmpPath, filePath);
    },

    async deletePath(key, { recursive = false } = {}) {
      const targetPath = resolveKey(key);
      if (!fs.existsSync(targetPath)) return;
      await fs.promises.rm(targetPath, { recursive, force: true });
    },

    async createReadStream(key) {
      const filePath = resolveKey(key);
      if (!fs.existsSync(filePath)) return null;
      return fs.createReadStream(filePath);
    },
  };
}

module.exports = {
  createLocalStore,
  createReadOnlyLocalStore,
};
