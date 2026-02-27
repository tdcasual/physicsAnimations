const express = require("express");
const { z } = require("zod");

const { requireAuth, optionalAuth } = require("../lib/auth");
const { DEFAULT_GROUP_ID } = require("../lib/categories");
const { loadCatalog } = require("../lib/catalog");
const { buildCategoriesPayload, buildCategoriesPayloadWithSql } = require("../lib/categoriesPayload");
const { mutateCategoriesState, noSave } = require("../lib/state");
const { parseWithSchema } = require("../lib/validation");
const { rateLimit } = require("../middleware/rateLimit");
const logger = require("../lib/logger");

function createCategoriesRouter({ rootDir, authConfig, store, queryRepos }) {
  const router = express.Router();
  const authRequired = requireAuth({ authConfig });
  const authOptional = optionalAuth({ authConfig });
  const taxonomyQueryRepo = queryRepos?.taxonomyQueryRepo;

  const groupIdSchema = z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_-]*$/i);

  const categoryIdSchema = z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_-]*$/i);

  const createCategorySchema = z.object({
    id: categoryIdSchema,
    groupId: groupIdSchema.optional().default(DEFAULT_GROUP_ID),
    title: z.string().min(1).max(128),
    order: z.coerce.number().int().min(-100000).max(100000).optional().default(0),
    hidden: z.boolean().optional().default(false),
  });

  const updateCategorySchema = z.object({
    groupId: groupIdSchema.optional(),
    title: z.string().max(128).optional(),
    order: z.coerce.number().int().min(-100000).max(100000).optional(),
    hidden: z.boolean().optional(),
  });

  router.get("/categories", authOptional, async (req, res) => {
    const isAdmin = req.user?.role === "admin";
    const supportsSqlDynamicCategoryCounts =
      typeof taxonomyQueryRepo?.queryDynamicCategoryCounts === "function";

    try {
      if (supportsSqlDynamicCategoryCounts) {
        try {
          const sqlPayload = await buildCategoriesPayloadWithSql({
            rootDir,
            store,
            isAdmin,
            taxonomyQueryRepo,
          });
          res.json(sqlPayload);
          return;
        } catch (sqlErr) {
          logger.warn("categories_sql_dynamic_counts_failed", {
            fallback: "catalog",
            error: sqlErr,
          });
        }
      }

      const catalog = await loadCatalog({
        rootDir,
        store,
        includeHiddenCategories: isAdmin,
        includeHiddenItems: isAdmin,
        includeUnpublishedItems: isAdmin,
        includeConfigCategories: isAdmin,
      });

      res.json(buildCategoriesPayload(catalog));
    } catch (err) {
      res.status(500).json({ error: "server_error" });
      logger.error("categories_list_failed", err, { route: "GET /categories" });
    }
  });

  router.post(
    "/categories",
    authRequired,
    rateLimit({ key: "categories_write", windowMs: 60 * 60 * 1000, max: 120 }),
    async (req, res) => {
      const body = parseWithSchema(createCategorySchema, req.body);
      const id = body.id.toLowerCase();
      const groupId = String(body.groupId || DEFAULT_GROUP_ID).toLowerCase();
      const now = new Date().toISOString();

      try {
        const created = await mutateCategoriesState({ store }, (state) => {
          if (state.categories[id]) return noSave({ __kind: "already_exists" });
          if (groupId !== DEFAULT_GROUP_ID && !state.groups?.[groupId]) {
            return noSave({ __kind: "unknown_group" });
          }
          state.categories[id] = {
            id,
            groupId,
            title: body.title.trim(),
            order: body.order,
            hidden: body.hidden,
            updatedAt: now,
          };
          return state.categories[id];
        });

        if (created?.__kind === "already_exists") {
          res.status(409).json({ error: "already_exists" });
          return;
        }
        if (created?.__kind === "unknown_group") {
          res.status(400).json({ error: "unknown_group" });
          return;
        }

        res.json({ ok: true, category: created });
      } catch (err) {
        res.status(500).json({ error: "server_error" });
        logger.error("categories_create_failed", err, { route: "POST /categories", categoryId: id });
      }
    },
  );

  router.put(
    "/categories/:id",
    authRequired,
    rateLimit({ key: "categories_write", windowMs: 60 * 60 * 1000, max: 120 }),
    async (req, res) => {
      const id = parseWithSchema(categoryIdSchema, req.params.id).toLowerCase();
      const body = parseWithSchema(updateCategorySchema, req.body);
      const now = new Date().toISOString();

      if (
        body.groupId === undefined &&
        body.title === undefined &&
        body.order === undefined &&
        body.hidden === undefined
      ) {
        res.status(400).json({ error: "no_changes" });
        return;
      }

      try {
        const updated = await mutateCategoriesState({ store }, (state) => {
          if (!state.categories[id]) {
            state.categories[id] = { id, groupId: DEFAULT_GROUP_ID, title: "", order: 0, hidden: false };
          }

          if (body.groupId !== undefined) {
            const nextGroupId = String(body.groupId || DEFAULT_GROUP_ID).toLowerCase();
            if (nextGroupId !== DEFAULT_GROUP_ID && !state.groups?.[nextGroupId]) {
              return noSave({ __kind: "unknown_group" });
            }
            state.categories[id].groupId = nextGroupId;
          }

          if (body.title !== undefined) state.categories[id].title = body.title.trim();
          if (body.order !== undefined) state.categories[id].order = body.order;
          if (body.hidden !== undefined) state.categories[id].hidden = body.hidden;
          state.categories[id].updatedAt = now;

          return state.categories[id];
        });

        if (updated?.__kind === "unknown_group") {
          res.status(400).json({ error: "unknown_group" });
          return;
        }

        res.json({ ok: true, category: updated });
      } catch (err) {
        res.status(500).json({ error: "server_error" });
        logger.error("categories_update_failed", err, {
          route: "PUT /categories/:id",
          categoryId: id,
        });
      }
    },
  );

  router.delete(
    "/categories/:id",
    authRequired,
    rateLimit({ key: "categories_write", windowMs: 60 * 60 * 1000, max: 120 }),
    async (req, res) => {
      const id = parseWithSchema(categoryIdSchema, req.params.id).toLowerCase();
      try {
        await mutateCategoriesState({ store }, (state) => {
          if (!state.categories[id]) return noSave(null);
          delete state.categories[id];
          return true;
        });
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: "server_error" });
        logger.error("categories_delete_failed", err, {
          route: "DELETE /categories/:id",
          categoryId: id,
        });
      }
    },
  );

  return router;
}

module.exports = {
  createCategoriesRouter,
};
