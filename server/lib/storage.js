const fs = require("fs");
const path = require("path");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getContentPaths({ rootDir }) {
  const contentDir = path.join(rootDir, "content");
  const uploadsDir = path.join(contentDir, "uploads");
  const thumbnailsDir = path.join(contentDir, "thumbnails");
  const statePath = path.join(contentDir, "items.json");

  return { contentDir, uploadsDir, thumbnailsDir, statePath };
}

function loadDynamicState({ rootDir }) {
  const { contentDir, uploadsDir, thumbnailsDir, statePath } = getContentPaths({ rootDir });
  ensureDir(contentDir);
  ensureDir(uploadsDir);
  ensureDir(thumbnailsDir);

  if (!fs.existsSync(statePath)) {
    return { version: 1, items: [] };
  }

  const raw = fs.readFileSync(statePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
    return { version: 1, items: [] };
  }

  return { version: 1, items: parsed.items };
}

function saveDynamicState({ rootDir, state }) {
  const { contentDir, statePath } = getContentPaths({ rootDir });
  ensureDir(contentDir);

  const tmpPath = `${statePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2));
  fs.renameSync(tmpPath, statePath);
}

module.exports = {
  ensureDir,
  getContentPaths,
  loadDynamicState,
  saveDynamicState,
};

