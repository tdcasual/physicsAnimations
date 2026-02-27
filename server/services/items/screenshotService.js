const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  captureScreenshotQueued: defaultCaptureScreenshotQueued,
  filePathToUrl: defaultFilePathToUrl,
} = require("../../lib/screenshot");
const { assertPublicHttpUrl: defaultAssertPublicHttpUrl } = require("../../lib/ssrf");
const logger = require("../../lib/logger");

function createWarnScreenshotDeps() {
  let didWarn = false;
  return (err) => {
    if (didWarn) return;
    didWarn = true;
    logger.error("screenshot_dependency_unavailable", err, {
      hint: "run `npm run install-playwright-deps`",
    });
  };
}

function normalizeZipPath(zipPath) {
  const raw = String(zipPath || "").replace(/\\/g, "/");
  const normalized = path.posix.normalize(raw);
  const trimmed = normalized.replace(/^\/+/, "");
  const parts = trimmed.split("/").filter(Boolean);
  if (!parts.length) return null;
  if (parts.some((p) => p === "." || p === "..")) return null;
  if (parts.some((p) => p.includes(":"))) return null;
  if (trimmed.startsWith("../")) return null;
  return parts.join("/");
}

function createScreenshotService({ rootDir, store, deps = {} }) {
  const mutateItemsState = deps.mutateItemsState;
  const noSave = deps.noSave;
  const captureScreenshotQueued = deps.captureScreenshotQueued || defaultCaptureScreenshotQueued;
  const filePathToUrl = deps.filePathToUrl || defaultFilePathToUrl;
  const assertPublicHttpUrl = deps.assertPublicHttpUrl || defaultAssertPublicHttpUrl;

  if (typeof mutateItemsState !== "function") {
    throw new TypeError("createScreenshotService requires deps.mutateItemsState");
  }
  if (typeof noSave !== "function") {
    throw new TypeError("createScreenshotService requires deps.noSave");
  }

  async function runScreenshotTask({ id }) {
    const item = await mutateItemsState({ store }, (state) => {
      const found = state.items.find((it) => it.id === id);
      if (!found) return noSave(null);
      return noSave({
        id: found.id,
        type: found.type,
        url: found.url,
        path: found.path,
      });
    });
    if (!item) {
      const err = new Error("not_found");
      err.status = 404;
      throw err;
    }

    const now = new Date().toISOString();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-shot-"));
    const outputPath = path.join(tmpDir, `${id}.png`);

    try {
      if (item.type === "upload" && store.mode === "webdav") {
        const manifestRaw = await store.readBuffer(`uploads/${id}/manifest.json`);
        let manifest = null;
        if (manifestRaw) {
          try {
            manifest = JSON.parse(manifestRaw.toString("utf8"));
          } catch {
            manifest = null;
          }
        }

        const entryRaw = typeof manifest?.entry === "string" && manifest.entry ? manifest.entry : "index.html";
        const entry = normalizeZipPath(entryRaw) || "index.html";
        const files = Array.isArray(manifest?.files) ? manifest.files : [entry];

        for (const rel of files) {
          const normalized = normalizeZipPath(rel);
          if (!normalized) continue;
          const buf = await store.readBuffer(`uploads/${id}/${normalized}`);
          if (!buf) continue;
          const localPath = path.join(tmpDir, normalized);
          fs.mkdirSync(path.dirname(localPath), { recursive: true });
          fs.writeFileSync(localPath, buf);
        }

        const entryPath = path.join(tmpDir, entry);
        if (!fs.existsSync(entryPath)) {
          const err = new Error("not_found");
          err.status = 404;
          throw err;
        }

        await captureScreenshotQueued({
          rootDir,
          targetUrl: filePathToUrl(entryPath),
          outputPath,
          allowedFileRoot: tmpDir,
        });
      } else {
        const targetUrl =
          item.type === "link"
            ? (await assertPublicHttpUrl(item.url)).toString()
            : filePathToUrl(path.join(rootDir, item.path));
        const allowedFileRoot =
          item.type === "upload" ? path.join(rootDir, "content", "uploads", id) : undefined;
        await captureScreenshotQueued({ rootDir, targetUrl, outputPath, allowedFileRoot });
      }

      const png = fs.readFileSync(outputPath);
      await store.writeBuffer(`thumbnails/${id}.png`, png, { contentType: "image/png" });

      const thumbnail = await mutateItemsState({ store }, (state) => {
        const found = state.items.find((it) => it.id === id);
        if (!found) return noSave(null);
        found.thumbnail = `content/thumbnails/${id}.png`;
        found.updatedAt = now;
        return found.thumbnail;
      });

      if (!thumbnail) {
        await store.deletePath(`thumbnails/${id}.png`).catch(() => {});
        const err = new Error("not_found");
        err.status = 404;
        throw err;
      }

      return { ok: true, thumbnail, itemId: id };
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  return {
    runScreenshotTask,
  };
}

module.exports = {
  createWarnScreenshotDeps,
  createScreenshotService,
};
