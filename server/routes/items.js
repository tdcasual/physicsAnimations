const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");
const multer = require("multer");
const unzipper = require("unzipper");
const { z } = require("zod");

const { requireAuth, optionalAuth } = require("../lib/auth");
const { captureScreenshot, filePathToUrl } = require("../lib/screenshot");
const { assertPublicHttpUrl } = require("../lib/ssrf");
const { loadItemsState, saveItemsState } = require("../lib/state");
const { sanitizeUploadedHtml } = require("../lib/uploadSecurity");
const { parseWithSchema, idSchema } = require("../lib/validation");
const { asyncHandler } = require("../middleware/asyncHandler");
const { rateLimit } = require("../middleware/rateLimit");

function normalizeCategoryId(categoryId) {
  if (typeof categoryId !== "string") return "other";
  const trimmed = categoryId.trim();
  return trimmed || "other";
}

function guessContentType(filePath) {
  const ext = path.extname(String(filePath || "")).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".wasm": "application/wasm",
    ".txt": "text/plain; charset=utf-8",
  };
  return map[ext] || "application/octet-stream";
}

function isZipUpload(originalName, fileBuffer) {
  if (typeof originalName === "string" && /\.zip$/i.test(originalName)) return true;
  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length < 4) return false;
  return fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b && fileBuffer[2] === 0x03 && fileBuffer[3] === 0x04;
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

function toApiItem(item) {
  const src = item.type === "link" ? item.url : item.path;
  return {
    id: item.id,
    type: item.type,
    categoryId: item.categoryId,
    title: item.title,
    description: item.description,
    thumbnail: item.thumbnail,
    order: item.order || 0,
    published: item.published !== false,
    hidden: item.hidden === true,
    src,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function createWarnScreenshotDeps() {
  let didWarn = false;
  return (err) => {
    if (didWarn) return;
    didWarn = true;
    console.error("[screenshot] Failed to generate thumbnails.");
    console.error("[screenshot] Try: `npm run install-playwright-deps`");
    if (err?.message) console.error(`[screenshot] ${err.message}`);
  };
}

function createItemsRouter({ rootDir, authConfig, store }) {
  const router = express.Router();
  const authRequired = requireAuth({ authConfig });
  const authOptional = optionalAuth({ authConfig });
  const warnScreenshotDeps = createWarnScreenshotDeps();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
  });

  const listQuerySchema = z.object({
    q: z.string().optional(),
    categoryId: z.string().optional(),
    type: z.string().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(24),
  });

  const createLinkSchema = z.object({
    type: z.literal("link").optional().default("link"),
    url: z.string().min(1).max(2048),
    categoryId: z.string().optional().default("other"),
    title: z.string().optional().default(""),
    description: z.string().optional().default(""),
  });

  const updateItemSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    categoryId: z.string().optional(),
    order: z.coerce.number().int().min(-100000).max(100000).optional(),
    published: z.boolean().optional(),
    hidden: z.boolean().optional(),
  });

  async function createLinkItem({ url, title, description, categoryId }) {
    const parsedUrl = await assertPublicHttpUrl(url);

    const now = new Date().toISOString();
    const id = `l_${crypto.randomUUID()}`;

    let thumbnail = "";
    let tmpDir = "";
    try {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-shot-"));
      const outputPath = path.join(tmpDir, `${id}.png`);
      await captureScreenshot({
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

    const state = await loadItemsState({ store });
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
    await saveItemsState({ store, state });

    return { ok: true, id, thumbnail };
  }

  async function createUploadItem({ fileBuffer, originalName, title, description, categoryId }) {
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

    try {
      if (isZip) {
        uploadKind = "zip";
        const maxFiles = 500;
        const maxTotalBytes = 80 * 1024 * 1024;
        const allowedExts = new Set([
          ".html",
          ".htm",
          ".css",
          ".js",
          ".mjs",
          ".json",
          ".png",
          ".jpg",
          ".jpeg",
          ".gif",
          ".svg",
          ".webp",
          ".ico",
          ".woff",
          ".woff2",
          ".ttf",
          ".otf",
          ".mp4",
          ".mp3",
          ".wasm",
          ".txt",
          ".map",
        ]);

        const dir = await unzipper.Open.buffer(fileBuffer);
        const files = (dir.files || []).filter((f) => f.type === "File");
        if (files.length > maxFiles) {
          const err = new Error("too_many_files");
          err.status = 400;
          throw err;
        }

        let total = 0;
        const extracted = [];
        const htmlCandidates = [];

        for (const file of files) {
          const rel = normalizeZipPath(file.path);
          if (!rel) continue;
          if (rel.startsWith("__MACOSX/")) continue;
          const ext = path.extname(rel).toLowerCase();
          if (!allowedExts.has(ext)) {
            const err = new Error("unsupported_file_type");
            err.status = 400;
            throw err;
          }

          const size = Number(file.uncompressedSize || file.size || 0);
          total += size;
          if (total > maxTotalBytes) {
            const err = new Error("zip_too_large");
            err.status = 400;
            throw err;
          }

          const buf = await file.buffer();
          if (buf.length > 20 * 1024 * 1024) {
            const err = new Error("file_too_large");
            err.status = 413;
            throw err;
          }

          const localPath = path.join(tmpDir, rel);
          fs.mkdirSync(path.dirname(localPath), { recursive: true });

          let outBuf = buf;
          let contentType = guessContentType(rel);
          if (/\.(html?|htm)$/i.test(rel)) {
            const html = buf.toString("utf8");
            const sanitized = sanitizeUploadedHtml(html, { allowLocalScripts: true });
            outBuf = Buffer.from(sanitized, "utf8");
            contentType = "text/html; charset=utf-8";
            htmlCandidates.push(rel);
          }

          fs.writeFileSync(localPath, outBuf);
          await store.writeBuffer(`uploads/${id}/${rel}`, outBuf, { contentType });
          extracted.push(rel);
        }

        const indexCandidates = htmlCandidates
          .filter((p) => /(^|\/)index\.html?$/i.test(p))
          .sort((a, b) => a.split("/").length - b.split("/").length);

        entryRelPath = indexCandidates[0] || htmlCandidates[0] || "";
        if (!entryRelPath) {
          const err = new Error("missing_index_html");
          err.status = 400;
          throw err;
        }

        const manifest = {
          version: 1,
          id,
          entry: entryRelPath,
          files: extracted,
          createdAt: now,
        };
        await store.writeBuffer(
          `uploads/${id}/manifest.json`,
          Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
          { contentType: "application/json; charset=utf-8" },
        );
      } else {
        const html = fileBuffer.toString("utf8");
        const sanitizedHtml = sanitizeUploadedHtml(html);
        const uploadKey = `uploads/${id}/index.html`;
        await store.writeBuffer(uploadKey, Buffer.from(sanitizedHtml, "utf8"), {
          contentType: "text/html; charset=utf-8",
        });
        fs.writeFileSync(path.join(tmpDir, "index.html"), sanitizedHtml, "utf8");
        await store.writeBuffer(
          `uploads/${id}/manifest.json`,
          Buffer.from(
            `${JSON.stringify({ version: 1, id, entry: "index.html", files: ["index.html"], createdAt: now }, null, 2)}\n`,
            "utf8",
          ),
          { contentType: "application/json; charset=utf-8" },
        );
      }

      let thumbnail = "";
      try {
        const entryPath = path.join(tmpDir, entryRelPath);
        const outputPath = path.join(tmpDir, `${id}.png`);
        await captureScreenshot({
          rootDir,
          targetUrl: filePathToUrl(entryPath),
          outputPath,
          allowedFileRoot: tmpDir,
        });
        const png = fs.readFileSync(outputPath);
        await store.writeBuffer(`thumbnails/${id}.png`, png, { contentType: "image/png" });
        thumbnail = `content/thumbnails/${id}.png`;
      } catch (err) {
        warnScreenshotDeps(err);
      }

      const state = await loadItemsState({ store });
      state.items.push({
        id,
        type: "upload",
        categoryId: normalizeCategoryId(categoryId),
        path: `content/uploads/${id}/${entryRelPath}`,
        title: title || originalName.replace(/\.(zip|html?|htm)$/i, ""),
        description,
        thumbnail,
        order: 0,
        published: true,
        hidden: false,
        uploadKind,
        createdAt: now,
        updatedAt: now,
      });
      await saveItemsState({ store, state });

      return { ok: true, id, thumbnail };
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  router.get(
    "/items",
    authOptional,
    asyncHandler(async (req, res) => {
      const isAdmin = req.user?.role === "admin";
      const query = parseWithSchema(listQuerySchema, req.query);
      const q = (query.q || "").trim().toLowerCase();
      const categoryId = (query.categoryId || "").trim();
      const type = (query.type || "").trim();

      const state = await loadItemsState({ store });
      let items = [...state.items];

      if (!isAdmin) items = items.filter((it) => it.published !== false && it.hidden !== true);
      if (categoryId) items = items.filter((it) => it.categoryId === categoryId);
      if (type) items = items.filter((it) => it.type === type);
      if (q) {
        items = items.filter((it) => {
          const hay = `${it.title || ""}\n${it.description || ""}\n${it.url || ""}`.toLowerCase();
          return hay.includes(q);
        });
      }

      items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

      const total = items.length;
      const start = (query.page - 1) * query.pageSize;
      const pageItems = items.slice(start, start + query.pageSize).map(toApiItem);

      res.json({ items: pageItems, page: query.page, pageSize: query.pageSize, total });
    }),
  );

  router.post(
    "/items",
    authRequired,
    rateLimit({ key: "items_write", windowMs: 60 * 60 * 1000, max: 120 }),
    (req, res, next) => {
      if (req.is("multipart/form-data")) {
        upload.single("file")(req, res, next);
        return;
      }
      next();
    },
    asyncHandler(async (req, res) => {
      if (req.file?.buffer?.length) {
        const categoryId = normalizeCategoryId(req.body?.categoryId);
        const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
        const description =
          typeof req.body?.description === "string" ? req.body.description.trim() : "";
        const originalName =
          typeof req.file.originalname === "string" ? req.file.originalname : "upload.html";

        const created = await createUploadItem({
          fileBuffer: req.file.buffer,
          originalName,
          title,
          description,
          categoryId,
        });
        res.json(created);
        return;
      }

      const body = parseWithSchema(createLinkSchema, req.body);
      const created = await createLinkItem({
        url: body.url,
        categoryId: body.categoryId,
        title: body.title,
        description: body.description,
      });
      res.json(created);
    }),
  );

  router.put(
    "/items/:id",
    authRequired,
    rateLimit({ key: "items_write", windowMs: 60 * 60 * 1000, max: 120 }),
    (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const body = parseWithSchema(updateItemSchema, req.body);

      if (
        body.title === undefined &&
        body.description === undefined &&
        body.categoryId === undefined &&
        body.order === undefined &&
        body.published === undefined &&
        body.hidden === undefined
      ) {
        res.status(400).json({ error: "no_changes" });
        return;
      }

      loadItemsState({ store })
        .then((state) => {
          const item = state.items.find((it) => it.id === id);
          if (!item) {
            res.status(404).json({ error: "not_found" });
            return;
          }

          if (body.title !== undefined) item.title = body.title;
          if (body.description !== undefined) item.description = body.description;
          if (body.categoryId !== undefined) item.categoryId = normalizeCategoryId(body.categoryId);
          if (body.order !== undefined) item.order = body.order;
          if (body.published !== undefined) item.published = body.published;
          if (body.hidden !== undefined) item.hidden = body.hidden;

          item.updatedAt = new Date().toISOString();
          return saveItemsState({ store, state }).then(() => {
            res.json({ ok: true, item: toApiItem(item) });
          });
        })
        .catch((err) => {
          res.status(500).json({ error: "server_error" });
          console.error(err);
        });
    },
  );

  router.post(
    "/items/link",
    authRequired,
    rateLimit({ key: "items_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const body = parseWithSchema(createLinkSchema, { ...req.body, type: "link" });
      const created = await createLinkItem({
        url: body.url,
        categoryId: body.categoryId,
        title: body.title,
        description: body.description,
      });
      res.json(created);
    }),
  );

  router.post(
    "/items/upload",
    authRequired,
    rateLimit({ key: "items_write", windowMs: 60 * 60 * 1000, max: 120 }),
    upload.single("file"),
    asyncHandler(async (req, res) => {
      const categoryId = normalizeCategoryId(req.body?.categoryId);
      const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
      const description =
        typeof req.body?.description === "string" ? req.body.description.trim() : "";

      if (!req.file?.buffer?.length) {
        res.status(400).json({ error: "missing_file" });
        return;
      }

      const originalName = typeof req.file.originalname === "string" ? req.file.originalname : "";

      const created = await createUploadItem({
        fileBuffer: req.file.buffer,
        originalName,
        title,
        description,
        categoryId,
      });
      res.json(created);
    }),
  );

  router.get("/items/:id", authOptional, asyncHandler(async (req, res) => {
    const isAdmin = req.user?.role === "admin";
    const id = parseWithSchema(idSchema, req.params.id);

    const state = await loadItemsState({ store });
    const item = state.items.find((it) => it.id === id);
    if (!item) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    if (!isAdmin && (item.published === false || item.hidden === true)) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json({ item: toApiItem(item) });
  }));

  router.post(
    "/items/:id/screenshot",
    authRequired,
    rateLimit({ key: "items_screenshot", windowMs: 60 * 60 * 1000, max: 60 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);

      const state = await loadItemsState({ store });
      const item = state.items.find((it) => it.id === id);
      if (!item) {
        res.status(404).json({ error: "not_found" });
        return;
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

          const entryRaw =
            typeof manifest?.entry === "string" && manifest.entry ? manifest.entry : "index.html";
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
            res.status(404).json({ error: "not_found" });
            return;
          }

          await captureScreenshot({
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
          await captureScreenshot({ rootDir, targetUrl, outputPath, allowedFileRoot });
        }

        const png = fs.readFileSync(outputPath);
        await store.writeBuffer(`thumbnails/${id}.png`, png, { contentType: "image/png" });

        item.thumbnail = `content/thumbnails/${id}.png`;
        item.updatedAt = now;
        await saveItemsState({ store, state });

        res.json({ ok: true, thumbnail: item.thumbnail });
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }),
  );

  router.delete(
    "/items/:id",
    authRequired,
    rateLimit({ key: "items_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);

      const state = await loadItemsState({ store });
      const before = state.items.length;
      const item = state.items.find((it) => it.id === id);
      state.items = state.items.filter((it) => it.id !== id);

      if (!item || state.items.length === before) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      if (item.type === "upload") {
        await store.deletePath(`uploads/${id}`, { recursive: true });
      }
      if (item.thumbnail) {
        await store.deletePath(`thumbnails/${id}.png`);
      }

      await saveItemsState({ store, state });
      res.json({ ok: true });
    }),
  );

  return router;
}

module.exports = {
  createItemsRouter,
};
