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
const { createItemsReadService } = require("../services/items/readService");
const { createItemsWriteService } = require("../services/items/writeService");
const { createUploadIngestService } = require("../services/items/uploadIngestService");
const {
  createWarnScreenshotDeps,
  createScreenshotService,
} = require("../services/items/screenshotService");

function safeText(text) {
  if (typeof text !== "string") return "";
  return text;
}

function normalizeCategoryId(categoryId) {
  if (typeof categoryId !== "string") return "other";
  const trimmed = categoryId.trim();
  return trimmed || "other";
}

function toApiItem(item) {
  if (item.type === "builtin") {
    return {
      id: item.id,
      type: "builtin",
      categoryId: item.categoryId,
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail,
      order: item.order || 0,
      published: item.published !== false,
      hidden: item.hidden === true,
      deleted: item.deleted === true,
      src: `animations/${item.id}`,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

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
    deleted: false,
    src,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function createItemsRouter({ rootDir, authConfig, store, taskQueue }) {
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

  if (queue && !queue.hasHandler("screenshot")) {
    queue.registerHandler("screenshot", async (payload) => {
      const id = parseWithSchema(idSchema, payload?.id);
      return screenshotService.runScreenshotTask({ id });
    });
  }

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

      if (queue) {
        const task = queue.enqueueTask({ type: "screenshot", payload: { id }, maxAttempts: 2 });
        res.status(202).json({ ok: true, task });
        return;
      }

      const result = await screenshotService.runScreenshotTask({ id });
      res.json(result);
    }),
  );

  router.get(
    "/tasks/:taskId",
    authRequired,
    asyncHandler(async (req, res) => {
      if (!queue) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const taskId = parseWithSchema(idSchema, req.params.taskId);
      const task = queue.getTask(taskId);
      if (!task) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json({ task });
    }),
  );

  router.post(
    "/tasks/:taskId/retry",
    authRequired,
    rateLimit({ key: "tasks_retry", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      if (!queue) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const taskId = parseWithSchema(idSchema, req.params.taskId);
      let task = null;
      try {
        task = queue.retryTask(taskId);
      } catch (err) {
        if (err?.message === "task_not_retryable") {
          res.status(400).json({ error: "task_not_retryable" });
          return;
        }
        throw err;
      }
      if (!task) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json({ ok: true, task });
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
