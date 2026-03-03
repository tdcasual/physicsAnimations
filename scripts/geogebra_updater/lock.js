"use strict";

const fsp = require("node:fs/promises");
const path = require("node:path");

async function acquireLock(lockFilePath) {
  await fsp.mkdir(path.dirname(lockFilePath), { recursive: true });
  let handle;
  try {
    handle = await fsp.open(lockFilePath, "wx", 0o644);
  } catch (err) {
    if (err && err.code === "EEXIST") {
      throw new Error(`Update lock already exists: ${lockFilePath}`);
    }
    throw err;
  }

  await handle.writeFile(`${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`, "utf8");
  let released = false;
  return async function release() {
    if (released) return;
    released = true;
    await handle.close().catch(() => {});
    await fsp.rm(lockFilePath, { force: true }).catch(() => {});
  };
}

module.exports = {
  acquireLock,
};
