const express = require("express");
const { z } = require("zod");

const { requireAuth, optionalAuth } = require("../lib/auth");
const { loadCatalog } = require("../lib/catalog");
const { loadCategoriesState, saveCategoriesState } = require("../lib/state");
const { parseWithSchema } = require("../lib/validation");
const { rateLimit } = require("../middleware/rateLimit");

function createCategoriesRouter({ rootDir, authConfig, store }) {
  const router = express.Router();
  const authRequired = requireAuth({ authConfig });
  const authOptional = optionalAuth({ authConfig });

  const categoryIdSchema = z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_-]*$/i);

  const createCategorySchema = z.object({
    id: categoryIdSchema,
    title: z.string().min(1).max(128),
    order: z.coerce.number().int().min(-100000).max(100000).optional().default(0),
    hidden: z.boolean().optional().default(false),
  });

  const updateCategorySchema = z.object({
    title: z.string().max(128).optional(),
    order: z.coerce.number().int().min(-100000).max(100000).optional(),
    hidden: z.boolean().optional(),
  });

  router.get("/categories", authOptional, (req, res) => {
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
        const categories = Object.values(catalog.categories || {}).map((category) => {
          const builtinCount = (category.items || []).filter((it) => it.type === "builtin").length;
          const dynamicCount = (category.items || []).filter((it) => it.type !== "builtin").length;
          return {
            id: category.id,
            title: category.title,
            order: category.order || 0,
            hidden: Boolean(category.hidden),
            count: (category.items || []).length,
            builtinCount,
            dynamicCount,
          };
        });
        categories.sort((a, b) => {
          const orderDiff = (b.order || 0) - (a.order || 0);
          if (orderDiff) return orderDiff;
          return a.title.localeCompare(b.title, "zh-CN");
        });
        res.json({ categories });
      })
      .catch((err) => {
        res.status(500).json({ error: "server_error" });
        console.error(err);
      });
  });

  router.post(
    "/categories",
    authRequired,
    rateLimit({ key: "categories_write", windowMs: 60 * 60 * 1000, max: 120 }),
    (req, res) => {
      const body = parseWithSchema(createCategorySchema, req.body);
      const id = body.id.toLowerCase();

      loadCategoriesState({ store })
        .then((state) => {
          if (state.categories[id]) {
            res.status(409).json({ error: "already_exists" });
            return;
          }

          state.categories[id] = {
            id,
            title: body.title.trim(),
            order: body.order,
            hidden: body.hidden,
          };
          return saveCategoriesState({ store, state }).then(() => {
            res.json({ ok: true, category: state.categories[id] });
          });
        })
        .catch((err) => {
          res.status(500).json({ error: "server_error" });
          console.error(err);
        });
    },
  );

  router.put(
    "/categories/:id",
    authRequired,
    rateLimit({ key: "categories_write", windowMs: 60 * 60 * 1000, max: 120 }),
    (req, res) => {
      const id = parseWithSchema(categoryIdSchema, req.params.id).toLowerCase();
      const body = parseWithSchema(updateCategorySchema, req.body);

      if (body.title === undefined && body.order === undefined && body.hidden === undefined) {
        res.status(400).json({ error: "no_changes" });
        return;
      }

      loadCategoriesState({ store })
        .then((state) => {
          if (!state.categories[id]) state.categories[id] = { id, title: "", order: 0, hidden: false };

          if (body.title !== undefined) state.categories[id].title = body.title.trim();
          if (body.order !== undefined) state.categories[id].order = body.order;
          if (body.hidden !== undefined) state.categories[id].hidden = body.hidden;

          return saveCategoriesState({ store, state }).then(() => {
            res.json({ ok: true, category: state.categories[id] });
          });
        })
        .catch((err) => {
          res.status(500).json({ error: "server_error" });
          console.error(err);
        });
    },
  );

  router.delete(
    "/categories/:id",
    authRequired,
    rateLimit({ key: "categories_write", windowMs: 60 * 60 * 1000, max: 120 }),
    (req, res) => {
      const id = parseWithSchema(categoryIdSchema, req.params.id).toLowerCase();
      loadCategoriesState({ store })
        .then((state) => {
          if (state.categories[id]) {
            delete state.categories[id];
            return saveCategoriesState({ store, state }).then(() => res.json({ ok: true }));
          }
          res.json({ ok: true });
        })
        .catch((err) => {
          res.status(500).json({ error: "server_error" });
          console.error(err);
        });
    },
  );

  return router;
}

module.exports = {
  createCategoriesRouter,
};
