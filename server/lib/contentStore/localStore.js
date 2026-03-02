const fs = require("fs");
const path = require("path");

const { createError } = require("../errors");

function createReadOnlyLocalStore({ rootDir, reason = "" } = {}) {
  const baseDir = path.join(rootDir || process.cwd(), "content");

  function normalizeStorageKey(key, { allowEmpty = false } = {}) {
    const raw = String(key || "");
    if (raw.includes("?") || raw.includes("#")) {
      throw createError("invalid_storage_key", 400, { key: raw });
    }
    const cleaned = raw.replace(/\\/g, "/").replace(/^\/+/, "");
    for (const part of cleaned.split("/")) {
      if (!part) continue;
      let decoded = part;
      try {
        decoded = decodeURIComponent(part);
      } catch {
        throw createError("invalid_storage_key", 400, { key: raw });
      }
      if (decoded.includes("/") || decoded.includes("\\")) {
        throw createError("invalid_storage_key", 400, { key: raw });
      }
      if (decoded.includes("?") || decoded.includes("#")) {
        throw createError("invalid_storage_key", 400, { key: raw });
      }
    }
    const normalized = path.posix.normalize(cleaned).replace(/^\/+/, "");
    if (!normalized || normalized === ".") {
      if (allowEmpty) return "";
      throw createError("invalid_storage_key", 400, { key: raw });
    }
    if (normalized.startsWith("..") || normalized.includes("/../")) {
      throw createError("invalid_storage_key", 400, { key: raw });
    }
    return normalized;
  }

  function resolveKey(key) {
    const normalized = normalizeStorageKey(key);
    return path.join(baseDir, normalized);
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
  const baseDir = path.join(rootDir || process.cwd(), "content");
  fs.mkdirSync(baseDir, { recursive: true });

  function normalizeStorageKey(key, { allowEmpty = false } = {}) {
    const raw = String(key || "");
    if (raw.includes("?") || raw.includes("#")) {
      throw createError("invalid_storage_key", 400, { key: raw });
    }
    const cleaned = raw.replace(/\\/g, "/").replace(/^\/+/, "");
    for (const part of cleaned.split("/")) {
      if (!part) continue;
      let decoded = part;
      try {
        decoded = decodeURIComponent(part);
      } catch {
        throw createError("invalid_storage_key", 400, { key: raw });
      }
      if (decoded.includes("/") || decoded.includes("\\")) {
        throw createError("invalid_storage_key", 400, { key: raw });
      }
      if (decoded.includes("?") || decoded.includes("#")) {
        throw createError("invalid_storage_key", 400, { key: raw });
      }
    }
    const normalized = path.posix.normalize(cleaned).replace(/^\/+/, "");
    if (!normalized || normalized === ".") {
      if (allowEmpty) return "";
      throw createError("invalid_storage_key", 400, { key: raw });
    }
    if (normalized.startsWith("..") || normalized.includes("/../")) {
      throw createError("invalid_storage_key", 400, { key: raw });
    }
    return normalized;
  }

  function resolveKey(key) {
    const normalized = normalizeStorageKey(key);
    return path.join(baseDir, normalized);
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
