const express = require("express");
const { z } = require("zod");

const { requireAuth, optionalAuth } = require("../lib/auth");
const { DEFAULT_GROUP_ID } = require("../lib/categories");
const { loadCatalog } = require("../lib/catalog");
const { mutateCategoriesState, noSave } = require("../lib/state");
const { parseWithSchema } = require("../lib/validation");
const { asyncHandler } = require("../middleware/asyncHandler");
const { rateLimit } = require("../middleware/rateLimit");
const logger = require("../lib/logger");

function createGroupsRouter({ rootDir, authConfig, store }) {
  const router = express.Router();
  const authRequired = requireAuth({ authConfig });
  const authOptional = optionalAuth({ authConfig });

  const groupIdSchema = z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_-]*$/i);

  const createGroupSchema = z.object({
    id: groupIdSchema,
    title: z.string().min(1).max(128),
    order: z.coerce.number().int().min(-100000).max(100000).optional().default(0),
    hidden: z.boolean().optional().default(false),
  });

  const updateGroupSchema = z.object({
    title: z.string().max(128).optional(),
    order: z.coerce.number().int().min(-100000).max(100000).optional(),
    hidden: z.boolean().optional(),
  });

  router.get("/groups", authOptional, (req, res) => {
    const isAdmin = req.user?.role === "admin";
    loadCatalog({
      rootDir,
      store,
      includeHiddenCategories: isAdmin,
      includeHiddenItems: isAdmin,
      includeUnpublishedItems: isAdmin,
      includeConfigCategories: isAdmin,
    })
      .then((catalog) => {
        const groups = Object.values(catalog.groups || {}).map((group) => ({
          id: group.id,
          title: group.title,
          order: group.order || 0,
          hidden: Boolean(group.hidden),
        }));
        groups.sort((a, b) => {
          const orderDiff = (b.order || 0) - (a.order || 0);
          if (orderDiff) return orderDiff;
          return a.title.localeCompare(b.title, "zh-CN");
        });
        res.json({ groups });
      })
      .catch((err) => {
        res.status(500).json({ error: "server_error" });
        logger.error("groups_list_failed", err, { route: "GET /groups" });
      });
  });

  router.post(
    "/groups",
    authRequired,
    rateLimit({ key: "groups_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const body = parseWithSchema(createGroupSchema, req.body);
      const id = body.id.toLowerCase();
      const now = new Date().toISOString();

      try {
        const created = await mutateCategoriesState({ store }, (state) => {
          if (state.groups?.[id]) return noSave({ __kind: "already_exists" });
          if (!state.groups) state.groups = {};
          state.groups[id] = {
            id,
            title: body.title.trim(),
            order: body.order,
            hidden: body.hidden,
            updatedAt: now,
          };
          return state.groups[id];
        });

        if (created?.__kind === "already_exists") {
          res.status(409).json({ error: "already_exists" });
          return;
        }

        res.json({ ok: true, group: created });
      } catch (err) {
        res.status(500).json({ error: "server_error" });
        logger.error("groups_create_failed", err, { route: "POST /groups", groupId: id });
      }
    }),
  );

  router.put(
    "/groups/:id",
    authRequired,
    rateLimit({ key: "groups_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(groupIdSchema, req.params.id).toLowerCase();
      const body = parseWithSchema(updateGroupSchema, req.body);
      const now = new Date().toISOString();

      if (body.title === undefined && body.order === undefined && body.hidden === undefined) {
        res.status(400).json({ error: "no_changes" });
        return;
      }

      try {
        const updated = await mutateCategoriesState({ store }, (state) => {
          if (!state.groups) state.groups = {};
          if (!state.groups[id]) return noSave({ __kind: "not_found" });

          if (body.title !== undefined) state.groups[id].title = body.title.trim();
          if (body.order !== undefined) state.groups[id].order = body.order;
          if (body.hidden !== undefined) state.groups[id].hidden = body.hidden;
          state.groups[id].updatedAt = now;

          return state.groups[id];
        });

        if (updated?.__kind === "not_found") {
          res.status(404).json({ error: "not_found" });
          return;
        }

        res.json({ ok: true, group: updated });
      } catch (err) {
        res.status(500).json({ error: "server_error" });
        logger.error("groups_update_failed", err, { route: "PUT /groups/:id", groupId: id });
      }
    }),
  );

  router.delete(
    "/groups/:id",
    authRequired,
    rateLimit({ key: "groups_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(groupIdSchema, req.params.id).toLowerCase();
      try {
        const result = await mutateCategoriesState({ store }, (state) => {
          if (!state.groups?.[id]) return noSave({ ok: true, deleted: false });

          if (id !== DEFAULT_GROUP_ID) {
            const hasCategory = Object.values(state.categories || {}).some((c) => c?.groupId === id);
            if (hasCategory) return noSave({ ok: false, error: "group_not_empty" });
          }

          delete state.groups[id];
          return { ok: true, deleted: true };
        });

        if (result?.ok === false && result?.error === "group_not_empty") {
          res.status(400).json({ error: "group_not_empty" });
          return;
        }

        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: "server_error" });
        logger.error("groups_delete_failed", err, { route: "DELETE /groups/:id", groupId: id });
      }
    }),
  );

  return router;
}

module.exports = {
  createGroupsRouter,
};
