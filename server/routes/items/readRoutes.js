const { parseWithSchema, idSchema } = require("../../lib/validation");
const { asyncHandler } = require("../../middleware/asyncHandler");

const { listQuerySchema, respondWithServiceResult } = require("./shared");

function registerItemsReadRoutes({ router, authOptional, readService }) {
  router.get(
    "/items",
    authOptional,
    asyncHandler(async (req, res) => {
      const isAdmin = req.user?.role === "admin";
      const query = parseWithSchema(listQuerySchema, req.query);
      const result = await readService.listItems({ isAdmin, query });
      if (respondWithServiceResult(res, result)) return;
      res.json(result);
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
}

module.exports = {
  registerItemsReadRoutes,
};
