const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { captureScreenshotQueued, filePathToUrl } = require("../../lib/screenshot");
const { assertPublicHttpUrl } = require("../../lib/ssrf");
const { normalizeCategoryId: defaultNormalizeCategoryId } = require("./itemModel");
const { isZipUpload } = require("./uploadIngestUtils");
const { ingestZipUpload } = require("./uploadZipIngest");
const { ingestHtmlUpload } = require("./uploadHtmlIngest");

function createUploadIngestService({ rootDir, store, deps = {} }) {
  const mutateItemsState = deps.mutateItemsState;
  const normalizeCategoryId = deps.normalizeCategoryId || defaultNormalizeCategoryId;
  const warnScreenshotDeps = deps.warnScreenshotDeps || (() => {});

  if (typeof mutateItemsState !== "function") {
    throw new TypeError("createUploadIngestService requires deps.mutateItemsState");
  }

  async function createLinkItem({ url, title, description, categoryId }) {
    const parsedUrl = await assertPublicHttpUrl(url);

    const now = new Date().toISOString();
    const id = `l_${crypto.randomUUID()}`;

    let thumbnail = "";
    let tmpDir = "";
    try {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-shot-"));
      const outputPath = path.join(tmpDir, `${id}.png`);
      await captureScreenshotQueued({
        rootDir,
        targetUrl: parsedUrl.toString(),
        outputPath,
      });
      const png = fs.readFileSync(outputPath);
      await store.writeBuffer(`thumbnails/${id}.png`, png, { contentType: "image/png" });
      thumbnail = `content/thumbnails/${id}.png`;
    } catch (err) {
      warnScreenshotDeps(err);
    } finally {
      if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    await mutateItemsState({ store }, (state) => {
      state.items.push({
        id,
        type: "link",
        categoryId: normalizeCategoryId(categoryId),
        url: parsedUrl.toString(),
        title: title || parsedUrl.hostname,
        description,
        thumbnail,
        order: 0,
        published: true,
        hidden: false,
        uploadKind: "html",
        createdAt: now,
        updatedAt: now,
      });
    });

    return { ok: true, id, thumbnail };
  }

  async function createUploadItem({
    fileBuffer,
    originalName,
    title,
    description,
    categoryId,
    allowRiskyHtml = false,
  }) {
    const isHtml = /\.(html?|htm)$/i.test(originalName);
    const isZip = isZipUpload(originalName, fileBuffer);
    if (!isHtml && !isZip) {
      const err = new Error("invalid_file_type");
      err.status = 400;
      throw err;
    }

    const now = new Date().toISOString();
    const id = `u_${crypto.randomUUID()}`;

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-upload-"));
    let entryRelPath = "index.html";
    let uploadKind = "html";
    const defaultTitle = String(originalName || "").replace(/\.(zip|html?|htm)$/i, "");
    let inferredTitle = "";
    let inferredDescription = "";
    let wroteToStore = false;

    async function writeUploadBuffer(key, buffer, options) {
      wroteToStore = true;
      return store.writeBuffer(key, buffer, options);
    }

    try {
      if (isZip) {
        const zipResult = await ingestZipUpload({
          fileBuffer,
          id,
          now,
          tmpDir,
          writeUploadBuffer,
          allowRiskyHtml,
        });
        uploadKind = zipResult.uploadKind;
        entryRelPath = zipResult.entryRelPath;
        inferredTitle = zipResult.inferredTitle;
        inferredDescription = zipResult.inferredDescription;
      } else {
        const htmlResult = await ingestHtmlUpload({
          fileBuffer,
          id,
          now,
          tmpDir,
          writeUploadBuffer,
          allowRiskyHtml,
        });
        uploadKind = htmlResult.uploadKind;
        entryRelPath = htmlResult.entryRelPath;
        inferredTitle = htmlResult.inferredTitle;
        inferredDescription = htmlResult.inferredDescription;
      }

      let thumbnail = "";
      try {
        const entryPath = path.join(tmpDir, entryRelPath);
        const outputPath = path.join(tmpDir, `${id}.png`);
        await captureScreenshotQueued({
          rootDir,
          targetUrl: filePathToUrl(entryPath),
          outputPath,
          allowedFileRoot: tmpDir,
        });
        const png = fs.readFileSync(outputPath);
        await writeUploadBuffer(`thumbnails/${id}.png`, png, { contentType: "image/png" });
        thumbnail = `content/thumbnails/${id}.png`;
      } catch (err) {
        warnScreenshotDeps(err);
      }

      await mutateItemsState({ store }, (state) => {
        state.items.push({
          id,
          type: "upload",
          categoryId: normalizeCategoryId(categoryId),
          path: `content/uploads/${id}/${entryRelPath}`,
          title: title || inferredTitle || defaultTitle,
          description: description || inferredDescription,
          thumbnail,
          order: 0,
          published: true,
          hidden: false,
          uploadKind,
          createdAt: now,
          updatedAt: now,
        });
      });

      return { ok: true, id, thumbnail };
    } catch (err) {
      if (wroteToStore) {
        await store.deletePath(`uploads/${id}`, { recursive: true }).catch(() => {});
        await store.deletePath(`thumbnails/${id}.png`).catch(() => {});
      }
      throw err;
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  return {
    createLinkItem,
    createUploadItem,
  };
}

module.exports = {
  createUploadIngestService,
};
