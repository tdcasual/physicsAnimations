"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const unzipper = require("unzipper");

async function downloadBundle(url, zipPath) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(zipPath));
  return response.url || url;
}

async function extractZipToDir(zipPath, outDir) {
  await fsp.mkdir(outDir, { recursive: true });
  await fs
    .createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: outDir }))
    .promise();
}

async function findFirstFileByName(rootDir, fileName) {
  const queue = [rootDir];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) queue.push(full);
      if (entry.isFile() && entry.name === fileName) return full;
    }
  }
  return "";
}

async function findFirstWeb3dDir(rootDir) {
  const queue = [rootDir];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.toLowerCase() === "web3d") {
          const marker = path.join(full, "web3d.nocache.js");
          try {
            const markerStat = await fsp.stat(marker);
            if (markerStat.isFile()) return full;
          } catch {
            // keep searching
          }
        }
        queue.push(full);
      }
    }
  }
  return "";
}

module.exports = {
  downloadBundle,
  extractZipToDir,
  findFirstFileByName,
  findFirstWeb3dDir,
};
