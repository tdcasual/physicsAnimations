function registerFolderRoutes({
  router,
  service,
  authRequired,
  asyncHandler,
  writeRateLimit,
  parseWithSchema,
  idSchema,
  createFolderSchema,
  updateFolderSchema,
  sendServiceResult,
  upload,
}) {
  router.get(
    "/library/folders",
    asyncHandler(async (_req, res) => {
      const folders = await service.getCatalogSummary();
      res.json({ folders });
    }),
  );

  router.get(
    "/library/folders/:id",
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const folder = await service.getFolderById({ folderId: id, withAssetCount: true });
      if (!folder) {
        res.status(404).json({ error: "folder_not_found" });
        return;
      }
      res.json({ folder });
    }),
  );

  router.post(
    "/library/folders",
    authRequired,
    writeRateLimit,
    asyncHandler(async (req, res) => {
      const body = parseWithSchema(createFolderSchema, req.body);
      const folder = await service.createFolder(body);
      res.json({ ok: true, folder });
    }),
  );

  router.post(
    "/library/folders/:id/cover",
    authRequired,
    writeRateLimit,
    upload.single("file"),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      if (!req.file?.buffer?.length) {
        res.status(400).json({ error: "missing_file" });
        return;
      }
      const result = await service.uploadFolderCover({
        folderId: id,
        fileBuffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      });
      if (sendServiceResult(res, result, (value) => ({ ok: true, coverPath: value.coverPath }))) return;
    }),
  );

  router.put(
    "/library/folders/:id",
    authRequired,
    writeRateLimit,
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const body = parseWithSchema(updateFolderSchema, req.body);
      const result = await service.updateFolder({
        folderId: id,
        name: body.name,
        categoryId: body.categoryId,
      });
      if (sendServiceResult(res, result, (value) => ({ ok: true, folder: value.folder }))) return;
    }),
  );

  router.delete(
    "/library/folders/:id",
    authRequired,
    writeRateLimit,
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await service.deleteFolder({ folderId: id });
      if (sendServiceResult(res, result, () => ({ ok: true }))) return;
    }),
  );
}

module.exports = {
  registerFolderRoutes,
};
