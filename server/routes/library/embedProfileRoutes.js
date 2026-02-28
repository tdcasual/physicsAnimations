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

  router.put(
    "/library/embed-profiles/:id",
    authRequired,
    writeRateLimit,
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const body = parseWithSchema(updateEmbedProfileSchema, req.body);
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
