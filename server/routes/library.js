const express = require("express");
const multer = require("multer");
const { z } = require("zod");

const { requireAuth } = require("../lib/auth");
const { parseWithSchema, idSchema } = require("../lib/validation");
const { asyncHandler } = require("../middleware/asyncHandler");
const { rateLimit } = require("../middleware/rateLimit");
const { createLibraryService } = require("../services/library/libraryService");

function createLibraryRouter({ authConfig, store }) {
  const router = express.Router();
  const authRequired = requireAuth({ authConfig });
  const safeStore =
    store &&
    typeof store.readBuffer === "function" &&
    typeof store.writeBuffer === "function" &&
    typeof store.deletePath === "function"
      ? store
      : {
          async readBuffer() {
            return null;
          },
          async writeBuffer() {
            throw new Error("storage_unavailable");
          },
          async deletePath() {},
          async createReadStream() {
            return null;
          },
        };
  const service = createLibraryService({ store: safeStore });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  const createFolderSchema = z.object({
    name: z.string().min(1).max(128),
    categoryId: z.string().optional().default("other"),
    coverType: z.enum(["blank", "image"]).optional().default("blank"),
  });
  const updateAssetSchema = z.object({
    displayName: z.string().max(128).optional().default(""),
  });

  function sendServiceResult(res, result, okBody) {
    if (result?.error) {
      res.status(Number(result.status || 500)).json({ error: result.error });
      return true;
    }
    res.json(okBody(result));
    return false;
  }

  router.get(
    "/library/catalog",
    asyncHandler(async (_req, res) => {
      const folders = await service.getCatalogSummary();
      res.json({ folders });
    }),
  );

  router.get(
    "/library/folders",
    asyncHandler(async (_req, res) => {
      const folders = await service.listFolders();
      res.json({ folders });
    }),
  );

  router.get(
    "/library/folders/:id",
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const folder = await service.getFolderById({ folderId: id });
      if (!folder) {
        res.status(404).json({ error: "folder_not_found" });
        return;
      }
      res.json({ folder });
    }),
  );

  router.get(
    "/library/folders/:id/assets",
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const folder = await service.getFolderById({ folderId: id });
      if (!folder) {
        res.status(404).json({ error: "folder_not_found" });
        return;
      }
      const assets = await service.listFolderAssets({ folderId: id });
      res.json({ assets });
    }),
  );

  router.get(
    "/library/assets/:id",
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await service.getAssetOpenInfo({ assetId: id });
      if (sendServiceResult(res, result, (value) => value)) return;
    }),
  );

  router.post(
    "/library/folders",
    authRequired,
    rateLimit({ key: "library_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const body = parseWithSchema(createFolderSchema, req.body);
      const folder = await service.createFolder(body);
      res.json({ ok: true, folder });
    }),
  );

  router.post(
    "/library/folders/:id/cover",
    authRequired,
    rateLimit({ key: "library_write", windowMs: 60 * 60 * 1000, max: 120 }),
    upload.single("file"),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      if (!req.file?.buffer?.length) {
        res.status(400).json({ error: "missing_file" });
        return;
      }
      const result = await service.uploadFolderCover({
        folderId: id,
        fileBuffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      });
      if (sendServiceResult(res, result, (value) => ({ ok: true, coverPath: value.coverPath }))) return;
    }),
  );

  router.post(
    "/library/folders/:id/assets",
    authRequired,
    rateLimit({ key: "library_write", windowMs: 60 * 60 * 1000, max: 120 }),
    upload.single("file"),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      if (!req.file?.buffer?.length) {
        res.status(400).json({ error: "missing_file" });
        return;
      }
      const result = await service.uploadAsset({
        folderId: id,
        fileBuffer: req.file.buffer,
        originalName: req.file.originalname,
        openMode: req.body?.openMode,
        displayName: req.body?.displayName,
      });
      if (sendServiceResult(res, result, (value) => ({ ok: true, asset: value.asset }))) return;
    }),
  );

  router.put(
    "/library/assets/:id",
    authRequired,
    rateLimit({ key: "library_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const body = parseWithSchema(updateAssetSchema, req.body);
      const result = await service.updateAsset({
        assetId: id,
        displayName: body.displayName,
      });
      if (sendServiceResult(res, result, (value) => ({ ok: true, asset: value.asset }))) return;
    }),
  );

  router.delete(
    "/library/folders/:id",
    authRequired,
    rateLimit({ key: "library_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await service.deleteFolder({ folderId: id });
      if (sendServiceResult(res, result, () => ({ ok: true }))) return;
    }),
  );

  router.delete(
    "/library/assets/:id",
    authRequired,
    rateLimit({ key: "library_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await service.deleteAsset({ assetId: id });
      if (sendServiceResult(res, result, () => ({ ok: true }))) return;
    }),
  );

  return router;
}

module.exports = {
  createLibraryRouter,
};
