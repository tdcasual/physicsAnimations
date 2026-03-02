const { parseWithSchema } = require("../../lib/validation");
const { asyncHandler } = require("../../middleware/asyncHandler");
const { rateLimit } = require("../../middleware/rateLimit");

const { createLinkSchema, parseBooleanFlag } = require("./shared");

function parseUploadFields(req, normalizeCategoryId) {
  return {
    categoryId: normalizeCategoryId(req.body?.categoryId),
    title: typeof req.body?.title === "string" ? req.body.title.trim() : "",
    description: typeof req.body?.description === "string" ? req.body.description.trim() : "",
    allowRiskyHtml: parseBooleanFlag(req.body?.allowRiskyHtml),
  };
}

function registerItemsCreateRoutes({
  router,
  authRequired,
  upload,
  uploadIngestService,
  normalizeCategoryId,
}) {
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
      const contentType = String(req.headers?.["content-type"] || "").toLowerCase();
      const isMultipart = req.is("multipart/form-data") || contentType.includes("multipart/form-data");

      if (isMultipart && !req.file?.buffer?.length) {
        res.status(400).json({ error: "missing_file" });
        return;
      }

      if (req.file?.buffer?.length) {
        const { categoryId, title, description, allowRiskyHtml } = parseUploadFields(
          req,
          normalizeCategoryId,
        );
        const originalName =
          typeof req.file.originalname === "string" ? req.file.originalname : "upload.html";

        const created = await uploadIngestService.createUploadItem({
          fileBuffer: req.file.buffer,
          originalName,
          title,
          description,
          categoryId,
          allowRiskyHtml,
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
}

module.exports = {
  registerItemsCreateRoutes,
};
