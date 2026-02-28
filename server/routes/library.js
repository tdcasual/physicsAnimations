const express = require("express");
const multer = require("multer");
const { z } = require("zod");

const { requireAuth } = require("../lib/auth");
const { parseWithSchema, idSchema } = require("../lib/validation");
const { asyncHandler } = require("../middleware/asyncHandler");
const { rateLimit } = require("../middleware/rateLimit");
const { createLibraryService } = require("../services/library/libraryService");
const { registerCatalogRoutes } = require("./library/catalogRoutes");
const { registerFolderRoutes } = require("./library/folderRoutes");
const { registerAssetRoutes } = require("./library/assetRoutes");
const { registerEmbedProfileRoutes } = require("./library/embedProfileRoutes");
const { sendServiceResult, parseEmbedOptionsJson } = require("./library/shared");

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
  const writeRateLimit = rateLimit({ key: "library_write", windowMs: 60 * 60 * 1000, max: 120 });

  const createFolderSchema = z.object({
    name: z.string().min(1).max(128),
    categoryId: z.string().optional().default("other"),
    coverType: z.enum(["blank", "image"]).optional().default("blank"),
  });
  const updateFolderSchema = z.object({
    name: z.string().min(1).max(128).optional(),
    categoryId: z.string().optional(),
  });
  const updateAssetSchema = z.object({
    displayName: z.string().max(128).optional(),
    openMode: z.enum(["embed", "download"]).optional(),
    folderId: z.string().optional(),
    embedProfileId: z.string().optional(),
    embedOptions: z.any().optional(),
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

  registerCatalogRoutes({
    router,
    service,
    asyncHandler,
  });

  registerFolderRoutes({
    router,
    service,
    authRequired,
    asyncHandler,
    writeRateLimit,
    parseWithSchema,
    idSchema,
    createFolderSchema,
    updateFolderSchema,
    sendServiceResult,
    upload,
  });

  registerAssetRoutes({
    router,
    service,
    authRequired,
    asyncHandler,
    writeRateLimit,
    parseWithSchema,
    idSchema,
    updateAssetSchema,
    sendServiceResult,
    parseEmbedOptionsJson,
    upload,
  });

  registerEmbedProfileRoutes({
    router,
    service,
    authRequired,
    asyncHandler,
    writeRateLimit,
    parseWithSchema,
    idSchema,
    createEmbedProfileSchema,
    updateEmbedProfileSchema,
    sendServiceResult,
  });

  return router;
}

module.exports = {
  createLibraryRouter,
};
