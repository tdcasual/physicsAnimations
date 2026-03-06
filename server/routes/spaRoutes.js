const fs = require("fs");
const path = require("path");
const express = require("express");

function createSpaRouter({ rootDir, shouldServeSpaRoute, isHardCutLegacySpaPath }) {
  const router = express.Router();

  const spaDistDir = path.join(rootDir, "frontend", "dist");
  const spaAssetsDir = path.join(spaDistDir, "assets");
  const spaIndexPath = path.join(spaDistDir, "index.html");

  router.use("/assets", express.static(spaAssetsDir));

  function sendSpaEntry(_req, res) {
    if (!fs.existsSync(spaIndexPath)) {
      res.status(503).json({ error: "service_unavailable" });
      return;
    }
    res.sendFile("index.html", { root: spaDistDir });
  }

  router.get(/^\/.*/, (req, res, next) => {
    if (isHardCutLegacySpaPath(req.path)) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (shouldServeSpaRoute(req.path)) {
      sendSpaEntry(req, res);
      return;
    }
    next();
  });

  return router;
}

module.exports = {
  createSpaRouter,
};
