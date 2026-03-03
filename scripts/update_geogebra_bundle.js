#!/usr/bin/env node
"use strict";

const {
  DEFAULT_BUNDLE_URL,
  DEFAULT_RETAIN,
  DEFAULT_LOCK_FILE_NAME,
} = require("./geogebra_updater/constants");
const {
  parseArgs,
  normalizeSha256,
} = require("./geogebra_updater/options");
const {
  computeFileSha256,
  pruneOldReleases,
} = require("./geogebra_updater/fs");
const { acquireLock } = require("./geogebra_updater/lock");
const { runUpdate } = require("./geogebra_updater/runner");

function printHelp() {
  console.log(`Usage: node scripts/update_geogebra_bundle.js [options]

Options:
  --url <bundle-url>        GeoGebra bundle URL (default: ${DEFAULT_BUNDLE_URL})
  --version <name>          Release folder name (default: inferred from final URL)
  --root <project-root>     Project root path (default: current working directory)
  --retain <count>          Keep newest release directories (0 = keep all, default: ${DEFAULT_RETAIN})
  --sha256 <hex>            Validate downloaded zip sha256 (64 hex chars)
  --lock-file <path>        Lock file path (default: content/library/vendor/geogebra/${DEFAULT_LOCK_FILE_NAME})
  --no-lock                 Disable lock file check
  --force                   Overwrite existing release with same version
  --keep-temp               Keep temporary download/extract directory for debugging
  --help                    Show this help
`);
}

async function run() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }
  await runUpdate(args);
}

if (require.main === module) {
  run().catch((err) => {
    console.error(`[geogebra] Update failed: ${err?.message || err}`);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_BUNDLE_URL,
  parseArgs,
  runUpdate,
  normalizeSha256,
  computeFileSha256,
  acquireLock,
  pruneOldReleases,
};
