function registerEmbedProfileRoutes({
  router,
  service,
  authRequired,
  asyncHandler,
  writeRateLimit,
  parseWithSchema,
  idSchema,
  createEmbedProfileSchema,
  updateEmbedProfileSchema,
  sendServiceResult,
}) {
  router.get(
    "/library/embed-profiles",
    authRequired,
    asyncHandler(async (_req, res) => {
      const profiles = await service.listEmbedProfiles();
      res.json({ profiles });
    }),
  );

  router.post(
    "/library/embed-profiles",
    authRequired,
    writeRateLimit,
    asyncHandler(async (req, res) => {
      const body = parseWithSchema(createEmbedProfileSchema, req.body);
      const result = await service.createEmbedProfile(body);
      if (sendServiceResult(res, result, (value) => ({ ok: true, profile: value.profile }))) return;
    }),
  );

  router.post(
    "/library/embed-profiles/:id/sync",
    authRequired,
    writeRateLimit,
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await service.syncEmbedProfile({ profileId: id });
      if (sendServiceResult(res, result, (value) => ({ ok: true, profile: value.profile }))) return;
    }),
  );

  router.post(
    "/library/embed-profiles/:id/sync/cancel",
    authRequired,
    writeRateLimit,
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await service.cancelEmbedProfileSync({ profileId: id });
      if (sendServiceResult(res, result, (value) => ({ ok: true, cancelled: value.cancelled === true }))) return;
    }),
  );

  router.post(
    "/library/embed-profiles/:id/rollback",
    authRequired,
    writeRateLimit,
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await service.rollbackEmbedProfile({ profileId: id });
      if (sendServiceResult(res, result, (value) => ({ ok: true, profile: value.profile }))) return;
    }),
  );

  router.put(
    "/library/embed-profiles/:id",
    authRequired,
    writeRateLimit,
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const body = parseWithSchema(updateEmbedProfileSchema, req.body);
      if (
        body.name === undefined &&
        body.scriptUrl === undefined &&
        body.fallbackScriptUrl === undefined &&
        body.viewerPath === undefined &&
        body.constructorName === undefined &&
        body.assetUrlOptionKey === undefined &&
        body.matchExtensions === undefined &&
        body.defaultOptions === undefined &&
        body.syncOptions === undefined &&
        body.enabled === undefined
      ) {
        res.status(400).json({ error: "no_changes" });
        return;
      }
      const result = await service.updateEmbedProfile({
        profileId: id,
        ...body,
      });
      if (sendServiceResult(res, result, (value) => ({ ok: true, profile: value.profile }))) return;
    }),
  );

  router.delete(
    "/library/embed-profiles/:id",
    authRequired,
    writeRateLimit,
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const result = await service.deleteEmbedProfile({ profileId: id });
      if (sendServiceResult(res, result, () => ({ ok: true }))) return;
    }),
  );
}

module.exports = {
  registerEmbedProfileRoutes,
};
