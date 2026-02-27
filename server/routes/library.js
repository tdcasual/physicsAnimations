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
    displayName: z.string().max(128).optional(),
    openMode: z.enum(["embed", "download"]).optional(),
    folderId: z.string().optional(),
    embedProfileId: z.string().optional(),
    embedOptions: z.any().optional(),
  });
  const updateFolderSchema = z.object({
    name: z.string().min(1).max(128).optional(),
    categoryId: z.string().optional(),
  });
  const createEmbedProfileSchema = z.object({
    name: z.string().min(1).max(128),
    scriptUrl: z.string().min(1).max(2048),
    fallbackScriptUrl: z.string().max(2048).optional().default(""),
    viewerPath: z.string().max(2048).optional().default(""),
    constructorName: z.string().max(128).optional().default("ElectricFieldApp"),
    assetUrlOptionKey: z.string().max(128).optional().default("sceneUrl"),
    matchExtensions: z.array(z.string().max(24)).optional().default([]),
    defaultOptions: z.any().optional().default({}),
    enabled: z.boolean().optional().default(true),
  });
  const updateEmbedProfileSchema = z.object({
    name: z.string().min(1).max(128).optional(),
    scriptUrl: z.string().min(1).max(2048).optional(),
    fallbackScriptUrl: z.string().max(2048).optional(),
    viewerPath: z.string().max(2048).optional(),
    constructorName: z.string().max(128).optional(),
    assetUrlOptionKey: z.string().max(128).optional(),
    matchExtensions: z.array(z.string().max(24)).optional(),
    defaultOptions: z.any().optional(),
    enabled: z.boolean().optional(),
  });

  function sendServiceResult(res, result, okBody) {
    if (result?.error) {
      res.status(Number(result.status || 500)).json({ error: result.error });
      return true;
    }
    res.json(okBody(result));
    return false;
  }

  function parseEmbedOptionsJson(rawValue) {
    const raw = String(rawValue || "").trim();
    if (!raw) return { ok: true, value: {} };
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, error: "invalid_embed_options_json" };
      }
      return { ok: true, value: parsed };
    } catch {
      return { ok: false, error: "invalid_embed_options_json" };
    }
  }

  router.get(
    "/library/catalog",
    asyncHandler(async (_req, res) => {
      const folders = await service.getCatalogSummary();
      res.json({ folders });
    }),
  );

  router.get(
    "/library/embed-profiles",
    authRequired,
    asyncHandler(async (_req, res) => {
      const profiles = await service.listEmbedProfiles();
      res.json({ profiles });
    }),
  );

  router.get(
    "/library/folders",
    asyncHandler(async (_req, res) => {
      const folders = await service.getCatalogSummary();
      res.json({ folders });
    }),
  );

  router.get(
    "/library/folders/:id",
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const folder = await service.getFolderById({ folderId: id, withAssetCount: true });
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
    "/library/deleted-assets",
    authRequired,
    asyncHandler(async (req, res) => {
      const folderId = String(req.query?.folderId || "").trim();
      const assets = await service.listDeletedAssets({ folderId: folderId || undefined });
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
    "/library/embed-profiles",
    authRequired,
    rateLimit({ key: "library_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const body = parseWithSchema(createEmbedProfileSchema, req.body);
      const result = await service.createEmbedProfile(body);
      if (sendServiceResult(res, result, (value) => ({ ok: true, profile: value.profile }))) return;
    }),
  );

  router.post(
    "/library/embed-profiles/:id/sync",
    authRequired,
    rateLimit({ key: "library_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await service.syncEmbedProfile({ profileId: id });
      if (sendServiceResult(res, result, (value) => ({ ok: true, profile: value.profile }))) return;
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
      const parsedEmbedOptions = parseEmbedOptionsJson(req.body?.embedOptionsJson);
      if (!parsedEmbedOptions.ok) {
        res.status(400).json({ error: parsedEmbedOptions.error });
        return;
      }
      const result = await service.uploadAsset({
        folderId: id,
        fileBuffer: req.file.buffer,
        originalName: req.file.originalname,
        openMode: req.body?.openMode,
        displayName: req.body?.displayName,
        embedProfileId: req.body?.embedProfileId,
        embedOptions: parsedEmbedOptions.value,
      });
      if (sendServiceResult(res, result, (value) => ({ ok: true, asset: value.asset }))) return;
    }),
  );

  router.put(
    "/library/folders/:id",
    authRequired,
    rateLimit({ key: "library_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const body = parseWithSchema(updateFolderSchema, req.body);
      const result = await service.updateFolder({
        folderId: id,
        name: body.name,
        categoryId: body.categoryId,
      });
      if (sendServiceResult(res, result, (value) => ({ ok: true, folder: value.folder }))) return;
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
        openMode: body.openMode,
        folderId: body.folderId,
        embedProfileId: body.embedProfileId,
        embedOptions: body.embedOptions,
      });
      if (sendServiceResult(res, result, (value) => ({ ok: true, asset: value.asset }))) return;
    }),
  );

  router.delete(
    "/library/embed-profiles/:id",
    authRequired,
    rateLimit({ key: "library_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await service.deleteEmbedProfile({ profileId: id });
      if (sendServiceResult(res, result, () => ({ ok: true }))) return;
    }),
  );

  router.put(
    "/library/embed-profiles/:id",
    authRequired,
    rateLimit({ key: "library_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const body = parseWithSchema(updateEmbedProfileSchema, req.body);
      const result = await service.updateEmbedProfile({
        profileId: id,
        ...body,
      });
      if (sendServiceResult(res, result, (value) => ({ ok: true, profile: value.profile }))) return;
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

  router.delete(
    "/library/assets/:id/permanent",
    authRequired,
    rateLimit({ key: "library_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await service.deleteAssetPermanently({ assetId: id });
      if (sendServiceResult(res, result, () => ({ ok: true }))) return;
    }),
  );

  router.post(
    "/library/assets/:id/restore",
    authRequired,
    rateLimit({ key: "library_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await service.restoreAsset({ assetId: id });
      if (sendServiceResult(res, result, (value) => ({ ok: true, asset: value.asset }))) return;
    }),
  );

  return router;
}

module.exports = {
  createLibraryRouter,
};
