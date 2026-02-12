const express = require("express");
const { z } = require("zod");

const { requireAuth, optionalAuth } = require("../lib/auth");
const { DEFAULT_GROUP_ID, GROUP_TITLES, CATEGORY_TITLES } = require("../lib/categories");
const { loadCatalog } = require("../lib/catalog");
const { loadCategoriesState, mutateCategoriesState, noSave } = require("../lib/state");
const { parseWithSchema } = require("../lib/validation");
const { rateLimit } = require("../middleware/rateLimit");

const EMPTY_ITEMS_STATE_BUFFER = Buffer.from('{"version":2,"items":[]}\n', "utf8");

function safeText(text) {
  if (typeof text !== "string") return "";
  return text;
}

function toInt(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.trunc(num);
}

function getDefaultCategoryTitle(categoryId) {
  return safeText(CATEGORY_TITLES[categoryId] || categoryId);
}

function getDefaultGroupTitle(groupId) {
  return safeText(GROUP_TITLES[groupId] || groupId);
}

function applyCategoryConfig(category, config) {
  if (!config || typeof config !== "object") return;
  const maybeTitle = typeof config.title === "string" ? config.title.trim() : "";
  if (maybeTitle) category.title = safeText(maybeTitle);
  if (Number.isFinite(config.order)) category.order = Math.trunc(config.order);
  if (typeof config.hidden === "boolean") category.hidden = config.hidden;
  if (typeof config.groupId === "string" && config.groupId.trim()) category.groupId = config.groupId.trim();
}

function applyGroupConfig(group, config) {
  if (!config || typeof config !== "object") return;
  const maybeTitle = typeof config.title === "string" ? config.title.trim() : "";
  if (maybeTitle) group.title = safeText(maybeTitle);
  if (Number.isFinite(config.order)) group.order = Math.trunc(config.order);
  if (typeof config.hidden === "boolean") group.hidden = config.hidden;
}

function normalizeDynamicCountMap(rawMap) {
  if (!rawMap || typeof rawMap !== "object") return {};
  const out = {};
  for (const [categoryId, value] of Object.entries(rawMap)) {
    if (typeof categoryId !== "string" || !categoryId) continue;
    out[categoryId] = Math.max(0, toInt(value, 0));
  }
  return out;
}

function getCategoryBuiltinCount(category) {
  return (category.items || []).filter((item) => item.type === "builtin").length;
}

function getCategoryDynamicCount(category, dynamicCountMap) {
  if (dynamicCountMap) {
    return Math.max(0, toInt(dynamicCountMap[category.id], 0));
  }
  return (category.items || []).filter((item) => item.type !== "builtin").length;
}

function buildCategoriesPayload(catalog, { dynamicCountMap = null } = {}) {
  const groups = Object.values(catalog.groups || {}).map((group) => {
    const categories = Object.values(group.categories || {});
    const builtinCount = categories.reduce((sum, category) => sum + getCategoryBuiltinCount(category), 0);
    const dynamicCount = categories.reduce(
      (sum, category) => sum + getCategoryDynamicCount(category, dynamicCountMap),
      0,
    );
    const count = builtinCount + dynamicCount;

    return {
      id: group.id,
      title: group.title,
      order: group.order || 0,
      hidden: Boolean(group.hidden),
      categoryCount: categories.length,
      count,
      builtinCount,
      dynamicCount,
    };
  });

  groups.sort((a, b) => {
    const orderDiff = (b.order || 0) - (a.order || 0);
    if (orderDiff) return orderDiff;
    return a.title.localeCompare(b.title, "zh-CN");
  });

  const categories = Object.values(catalog.groups || {}).flatMap((group) =>
    Object.values(group.categories || {}).map((category) => {
      const builtinCount = getCategoryBuiltinCount(category);
      const dynamicCount = getCategoryDynamicCount(category, dynamicCountMap);
      return {
        id: category.id,
        groupId: category.groupId || DEFAULT_GROUP_ID,
        title: category.title,
        order: category.order || 0,
        hidden: Boolean(category.hidden),
        count: builtinCount + dynamicCount,
        builtinCount,
        dynamicCount,
      };
    }),
  );

  categories.sort((a, b) => {
    const groupDiff = a.groupId.localeCompare(b.groupId, "zh-CN");
    if (groupDiff) return groupDiff;
    const orderDiff = (b.order || 0) - (a.order || 0);
    if (orderDiff) return orderDiff;
    return a.title.localeCompare(b.title, "zh-CN");
  });

  return { groups, categories };
}

function createCatalogStoreWithoutDynamicItems(store) {
  return {
    async readBuffer(key) {
      const normalizedKey = String(key || "").replace(/^\/+/, "");
      if (normalizedKey === "items.json") return EMPTY_ITEMS_STATE_BUFFER;
      return store.readBuffer(normalizedKey);
    },
  };
}

async function buildCategoriesPayloadWithSql({ rootDir, store, isAdmin }) {
  const [baseCatalog, categoryState, dynamicResult] = await Promise.all([
    loadCatalog({
      rootDir,
      store: createCatalogStoreWithoutDynamicItems(store),
      includeHiddenCategories: isAdmin,
      includeHiddenItems: isAdmin,
      includeUnpublishedItems: isAdmin,
      includeConfigCategories: isAdmin,
    }),
    loadCategoriesState({ store }),
    store.stateDbQuery.queryDynamicCategoryCounts({ isAdmin }),
  ]);

  const dynamicCountMap = normalizeDynamicCountMap(dynamicResult?.byCategory);

  const groups = {};
  for (const [groupId, group] of Object.entries(baseCatalog.groups || {})) {
    groups[groupId] = {
      ...group,
      categories: { ...(group.categories || {}) },
    };
  }

  const categoryMap = new Map();
  for (const group of Object.values(groups)) {
    for (const category of Object.values(group.categories || {})) {
      categoryMap.set(category.id, category);
    }
  }

  for (const [categoryId, dynamicCount] of Object.entries(dynamicCountMap)) {
    if (dynamicCount <= 0) continue;
    if (categoryMap.has(categoryId)) continue;

    const category = {
      id: categoryId,
      groupId: DEFAULT_GROUP_ID,
      title: getDefaultCategoryTitle(categoryId),
      order: 0,
      hidden: false,
      items: [],
    };
    applyCategoryConfig(category, categoryState.categories?.[categoryId]);

    const groupId = safeText(category.groupId || DEFAULT_GROUP_ID) || DEFAULT_GROUP_ID;
    category.groupId = groupId;

    if (!groups[groupId]) {
      const group = {
        id: groupId,
        title: getDefaultGroupTitle(groupId),
        order: 0,
        hidden: false,
        categories: {},
      };
      applyGroupConfig(group, categoryState.groups?.[groupId]);
      groups[groupId] = group;
    }

    const group = groups[groupId];
    if (!isAdmin && (category.hidden || group.hidden)) {
      continue;
    }

    group.categories[categoryId] = category;
    categoryMap.set(categoryId, category);
  }

  if (!isAdmin) {
    for (const [groupId, group] of Object.entries(groups)) {
      if (group.hidden) {
        delete groups[groupId];
        continue;
      }
      for (const [categoryId, category] of Object.entries(group.categories || {})) {
        if (category.hidden) delete group.categories[categoryId];
      }
    }

    for (const [groupId, group] of Object.entries(groups)) {
      if (!Object.keys(group.categories || {}).length) {
        delete groups[groupId];
      }
    }
  }

  return buildCategoriesPayload({ groups }, { dynamicCountMap });
}

function createCategoriesRouter({ rootDir, authConfig, store }) {
  const router = express.Router();
  const authRequired = requireAuth({ authConfig });
  const authOptional = optionalAuth({ authConfig });

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
      typeof store?.stateDbQuery?.queryDynamicCategoryCounts === "function";

    try {
      if (supportsSqlDynamicCategoryCounts) {
        try {
          const sqlPayload = await buildCategoriesPayloadWithSql({ rootDir, store, isAdmin });
          res.json(sqlPayload);
          return;
        } catch (sqlErr) {
          console.warn("[categories] SQL dynamic category counts failed; fallback to catalog", sqlErr);
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
      console.error(err);
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
        console.error(err);
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
        console.error(err);
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
        console.error(err);
      }
    },
  );

  return router;
}

module.exports = {
  createCategoriesRouter,
};
