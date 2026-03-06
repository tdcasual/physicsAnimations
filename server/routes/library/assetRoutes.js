const { logAdminAudit } = require("../../lib/auditLogger");

function registerAssetRoutes({
  router,
  service,
  authRequired,
  asyncHandler,
  writeRateLimit,
  parseWithSchema,
  idSchema,
  updateAssetSchema,
  sendServiceResult,
  parseEmbedOptionsJson,
  upload,
}) {
  router.get(
    "/library/folders/:id/assets",
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const folder = await service.getFolderById({ folderId: id });
      if (!folder) {
        res.status(404).json({ error: "folder_not_found" });
        return;
      }
      const assets = await service.listFolderAssets({ folderId: id });
      res.json({ assets });
    }),
  );

  router.get(
    "/library/deleted-assets",
    authRequired,
    asyncHandler(async (req, res) => {
      const folderIdInput = String(req.query?.folderId || "").trim();
      const folderId = folderIdInput ? parseWithSchema(idSchema, folderIdInput) : "";
      const assets = await service.listDeletedAssets({ folderId: folderId || undefined });
      res.json({ assets });
    }),
  );

  router.get(
    "/library/assets/:id",
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await service.getAssetOpenInfo({ assetId: id });
      if (sendServiceResult(res, result, (value) => value)) return;
    }),
  );

  router.post(
    "/library/folders/:id/assets",
    authRequired,
    writeRateLimit,
    upload.single("file"),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      if (!req.file?.buffer?.length) {
        res.status(400).json({ error: "missing_file" });
        return;
      }
      const parsedEmbedOptions = parseEmbedOptionsJson(req.body?.embedOptionsJson);
      if (!parsedEmbedOptions.ok) {
        res.status(400).json({ error: parsedEmbedOptions.error });
        return;
      }
      const result = await service.uploadAsset({
        folderId: id,
        fileBuffer: req.file.buffer,
        originalName: req.file.originalname,
        openMode: req.body?.openMode,
        displayName: req.body?.displayName,
        embedProfileId: req.body?.embedProfileId,
        embedOptions: parsedEmbedOptions.value,
      });
      if (sendServiceResult(res, result, (value) => ({ ok: true, asset: value.asset }))) return;
      logAdminAudit({
        action: "library.asset.upload",
        actor: req.user?.username,
        targetType: "library_asset",
        targetId: result.asset?.id,
        outcome: "success",
        details: {
          requestId: req.requestId,
          folderId: id,
          openMode: result.asset?.openMode,
        },
      });
    }),
  );

  router.put(
    "/library/assets/:id",
    authRequired,
    writeRateLimit,
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const body = parseWithSchema(updateAssetSchema, req.body);
      if (
        body.displayName === undefined &&
        body.openMode === undefined &&
        body.folderId === undefined &&
        body.embedProfileId === undefined &&
        body.embedOptions === undefined
      ) {
        res.status(400).json({ error: "no_changes" });
        return;
      }
      const result = await service.updateAsset({
        assetId: id,
        displayName: body.displayName,
        openMode: body.openMode,
        folderId: body.folderId,
        embedProfileId: body.embedProfileId,
        embedOptions: body.embedOptions,
      });
      if (sendServiceResult(res, result, (value) => ({ ok: true, asset: value.asset }))) return;
      logAdminAudit({
        action: "library.asset.update",
        actor: req.user?.username,
        targetType: "library_asset",
        targetId: id,
        outcome: "success",
        details: { requestId: req.requestId },
      });
    }),
  );

  router.delete(
    "/library/assets/:id",
    authRequired,
    writeRateLimit,
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await service.deleteAsset({ assetId: id });
      if (sendServiceResult(res, result, () => ({ ok: true }))) return;
      logAdminAudit({
        action: "library.asset.delete",
        actor: req.user?.username,
        targetType: "library_asset",
        targetId: id,
        outcome: "success",
        details: { requestId: req.requestId },
      });
    }),
  );

  router.delete(
    "/library/assets/:id/permanent",
    authRequired,
    writeRateLimit,
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await service.deleteAssetPermanently({ assetId: id });
      if (sendServiceResult(res, result, () => ({ ok: true }))) return;
      logAdminAudit({
        action: "library.asset.delete_permanent",
        actor: req.user?.username,
        targetType: "library_asset",
        targetId: id,
        outcome: "success",
        details: { requestId: req.requestId },
      });
    }),
  );

  router.post(
    "/library/assets/:id/restore",
    authRequired,
    writeRateLimit,
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await service.restoreAsset({ assetId: id });
      if (sendServiceResult(res, result, (value) => ({ ok: true, asset: value.asset }))) return;
      logAdminAudit({
        action: "library.asset.restore",
        actor: req.user?.username,
        targetType: "library_asset",
        targetId: id,
        outcome: "success",
        details: { requestId: req.requestId },
      });
    }),
  );
}

module.exports = {
  registerAssetRoutes,
};
