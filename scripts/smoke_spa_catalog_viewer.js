#!/usr/bin/env node

const logger = require("../server/lib/logger");
const { run } = require("./smoke_spa_public");

run().catch((err) => {
  logger.error("smoke_catalog_viewer_failed", err);
  process.exitCode = 1;
});
