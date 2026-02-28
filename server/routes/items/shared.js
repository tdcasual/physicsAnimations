const { z } = require("zod");

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

function parseBooleanFlag(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
}

function respondWithServiceResult(res, result) {
  if (result?.error) {
    res.status(Number(result.status || 500)).json({ error: result.error });
    return true;
  }
  return false;
}

module.exports = {
  createLinkSchema,
  listQuerySchema,
  parseBooleanFlag,
  respondWithServiceResult,
  updateItemSchema,
};
