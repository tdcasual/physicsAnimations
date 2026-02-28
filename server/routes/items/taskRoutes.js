const { parseWithSchema, idSchema } = require("../../lib/validation");
const { asyncHandler } = require("../../middleware/asyncHandler");
const { rateLimit } = require("../../middleware/rateLimit");

function registerItemsTaskRoutes({ router, authRequired, taskService }) {
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
}

module.exports = {
  registerItemsTaskRoutes,
};
