const express = require("express");
const multer = require("multer");
const { z } = require("zod");

const { requireAuth, optionalAuth } = require("../lib/auth");
const {
  loadItemsState,
  mutateItemsState,
  mutateBuiltinItemsState,
  mutateItemTombstonesState,
  noSave,
} = require("../lib/state");
const { parseWithSchema, idSchema } = require("../lib/validation");
const { asyncHandler } = require("../middleware/asyncHandler");
const { rateLimit } = require("../middleware/rateLimit");
const { createItemsBuiltinService } = require("../services/items/builtinService");
const {
  safeText,
  normalizeCategoryId,
  toApiItem,
} = require("../services/items/itemModel");
const { createItemsReadService } = require("../services/items/readService");
const { createItemsWriteService } = require("../services/items/writeService");
const { createUploadIngestService } = require("../services/items/uploadIngestService");
const { createItemsTaskService } = require("../services/items/taskService");
const {
  createWarnScreenshotDeps,
  createScreenshotService,
} = require("../services/items/screenshotService");

function createItemsRouter({ rootDir, authConfig, store, taskQueue, queryRepos }) {
  const router = express.Router();
  const authRequired = requireAuth({ authConfig });
  const authOptional = optionalAuth({ authConfig });
  const warnScreenshotDeps = createWarnScreenshotDeps();
  const queue = taskQueue || null;

  const builtinService = createItemsBuiltinService({
    rootDir,
    store,
    deps: { normalizeCategoryId },
  });
  const loadBuiltinIndex = builtinService.loadBuiltinIndex;
  const loadBuiltinItems = builtinService.loadBuiltinItems;
  const findBuiltinItemById = builtinService.findBuiltinItemById;

  const readService = createItemsReadService({
    store,
    itemsQueryRepo: queryRepos?.itemsQueryRepo,
    deps: {
      loadItemsState,
      loadBuiltinItems,
      findBuiltinItemById,
      toApiItem,
      safeText,
    },
  });

  const writeService = createItemsWriteService({
    store,
    deps: {
      mutateItemsState,
      mutateBuiltinItemsState,
      mutateItemTombstonesState,
      normalizeCategoryId,
      noSave,
      loadBuiltinIndex,
      findBuiltinItemById,
      toApiItem,
    },
  });

  const uploadIngestService = createUploadIngestService({
    rootDir,
    store,
    deps: {
      mutateItemsState,
      normalizeCategoryId,
      warnScreenshotDeps,
    },
  });

  const screenshotService = createScreenshotService({
    rootDir,
    store,
    deps: {
      mutateItemsState,
      noSave,
    },
  });

  const taskService = createItemsTaskService({
    queue,
    screenshotService,
    deps: {
      parseId: (value) => parseWithSchema(idSchema, value),
    },
  });
  taskService.registerScreenshotHandler();

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
    deleted: z.boolean().optional(),
  });

  router.get(
    "/items",
    authOptional,
    asyncHandler(async (req, res) => {
      const isAdmin = req.user?.role === "admin";
      const query = parseWithSchema(listQuerySchema, req.query);
      const result = await readService.listItems({ isAdmin, query });
      if (result?.error) {
        res.status(Number(result.status || 500)).json({ error: result.error });
        return;
      }
      res.json(result);
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

        const created = await uploadIngestService.createUploadItem({
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
      const created = await uploadIngestService.createLinkItem({
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
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const body = parseWithSchema(updateItemSchema, req.body);

      if (
        body.title === undefined &&
        body.description === undefined &&
        body.categoryId === undefined &&
        body.order === undefined &&
        body.published === undefined &&
        body.hidden === undefined &&
        body.deleted === undefined
      ) {
        res.status(400).json({ error: "no_changes" });
        return;
      }

      const result = await writeService.updateItem({ id, patch: body });
      if (result?.error) {
        res.status(Number(result.status || 500)).json({ error: result.error });
        return;
      }
      res.json(result);
    }),
  );

  router.post(
    "/items/link",
    authRequired,
    rateLimit({ key: "items_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const body = parseWithSchema(createLinkSchema, { ...req.body, type: "link" });
      const created = await uploadIngestService.createLinkItem({
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

      const created = await uploadIngestService.createUploadItem({
        fileBuffer: req.file.buffer,
        originalName,
        title,
        description,
        categoryId,
      });
      res.json(created);
    }),
  );

  router.get(
    "/items/:id",
    authOptional,
    asyncHandler(async (req, res) => {
      const isAdmin = req.user?.role === "admin";
      const id = parseWithSchema(idSchema, req.params.id);
      const item = await readService.getItemById({ id, isAdmin });
      if (!item) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json({ item });
    }),
  );

  router.post(
    "/items/:id/screenshot",
    authRequired,
    rateLimit({ key: "items_screenshot", windowMs: 60 * 60 * 1000, max: 60 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const response = await taskService.createScreenshotTask({ id });
      res.status(response.status).json(response.body);
    }),
  );

  router.get(
    "/tasks/:taskId",
    authRequired,
    asyncHandler(async (req, res) => {
      const response = taskService.getTaskById({ taskId: req.params.taskId });
      res.status(response.status).json(response.body);
    }),
  );

  router.post(
    "/tasks/:taskId/retry",
    authRequired,
    rateLimit({ key: "tasks_retry", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const response = taskService.retryTaskById({ taskId: req.params.taskId });
      res.status(response.status).json(response.body);
    }),
  );

  router.delete(
    "/items/:id",
    authRequired,
    rateLimit({ key: "items_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await writeService.deleteItem({ id });
      if (result?.error) {
        res.status(Number(result.status || 500)).json({ error: result.error });
        return;
      }
      res.json(result);
    }),
  );

  return router;
}

module.exports = {
  createItemsRouter,
};
