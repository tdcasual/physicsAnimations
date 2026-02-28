function registerCatalogRoutes({ router, service, asyncHandler }) {
  router.get(
    "/library/catalog",
    asyncHandler(async (_req, res) => {
      const folders = await service.getCatalogSummary();
      res.json({ folders });
    }),
  );
}

module.exports = {
  registerCatalogRoutes,
};
