const express = require("express");
const multer = require("multer");

const { requireAuth, optionalAuth } = require("../lib/auth");
const {
  loadItemsState,
  mutateItemsState,
  mutateBuiltinItemsState,
  mutateItemTombstonesState,
  noSave,
} = require("../lib/state");
const { parseWithSchema, idSchema } = require("../lib/validation");
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
const { registerItemsReadRoutes } = require("./items/readRoutes");
const { registerItemsCreateRoutes } = require("./items/createRoutes");
const { registerItemsWriteRoutes } = require("./items/writeRoutes");
const { registerItemsTaskRoutes } = require("./items/taskRoutes");

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

  registerItemsReadRoutes({ router, authOptional, readService });
  registerItemsCreateRoutes({
    router,
    authRequired,
    upload,
    uploadIngestService,
    normalizeCategoryId,
  });
  registerItemsWriteRoutes({ router, authRequired, writeService });
  registerItemsTaskRoutes({ router, authRequired, taskService });

  return router;
}

module.exports = {
  createItemsRouter,
};
