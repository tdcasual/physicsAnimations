const { parseWithSchema, idSchema } = require("../../lib/validation");
const { asyncHandler } = require("../../middleware/asyncHandler");
const { rateLimit } = require("../../middleware/rateLimit");

const { respondWithServiceResult, updateItemSchema } = require("./shared");

function registerItemsWriteRoutes({ router, authRequired, writeService }) {
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
      if (respondWithServiceResult(res, result)) return;
      res.json(result);
    }),
  );

  router.delete(
    "/items/:id",
    authRequired,
    rateLimit({ key: "items_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await writeService.deleteItem({ id });
      if (respondWithServiceResult(res, result)) return;
      res.json(result);
    }),
  );
}

module.exports = {
  registerItemsWriteRoutes,
};
