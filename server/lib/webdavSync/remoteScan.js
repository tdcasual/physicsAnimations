const { extractHtmlTitleAndDescription, normalizeRemotePath, parseJsonBuffer } = require("./fileUtils");

function isSafeUploadDirName(value) {
  const id = String(value || "").trim();
  if (!id || !id.startsWith("u_")) return false;
  if (id.includes("/") || id.includes("\\")) return false;
  return true;
}

function isValidTimestamp(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  if (!normalized) return false;
  const ms = Date.parse(normalized);
  return Number.isFinite(ms);
}

async function scanRemoteUploads({ webdav, existingIds, tombstoneIds = new Set() }) {
  const entries = await webdav.listDir("uploads");
  const imported = [];

  for (const entry of entries) {
    if (!entry?.isDir) continue;
    const id = String(entry.name || "").trim();
    if (!isSafeUploadDirName(id)) continue;
    if (existingIds.has(id)) continue;
    if (tombstoneIds.has(id)) continue;

    let manifestBuf = null;
    try {
      manifestBuf = await webdav.readBuffer(`uploads/${id}/manifest.json`);
    } catch {
      continue;
    }
    if (!manifestBuf) continue;
    const manifest = parseJsonBuffer(manifestBuf);
    if (!manifest || typeof manifest !== "object") continue;

    const entryRaw = typeof manifest.entry === "string" ? manifest.entry : "index.html";
    const entryRel = normalizeRemotePath(entryRaw) || "index.html";
    if (!/\.html?$/i.test(entryRel)) continue;

    let htmlBuf = null;
    let title = "";
    let description = "";
    try {
      htmlBuf = await webdav.readBuffer(`uploads/${id}/${entryRel}`);
    } catch {
      continue;
    }
    if (!htmlBuf) continue;

    const meta = extractHtmlTitleAndDescription(htmlBuf.toString("utf8"));
    title = meta.title || "";
    description = meta.description || "";

    const createdAt = isValidTimestamp(manifest.createdAt) ? manifest.createdAt.trim() : new Date().toISOString();

    const files = Array.isArray(manifest.files)
      ? manifest.files
          .map((f) => normalizeRemotePath(String(f || "")))
          .filter(Boolean)
      : [];
    const uploadKind = files.some((f) => !f.startsWith("deps/") && f !== entryRel) ? "zip" : "html";

    imported.push({
      id,
      type: "upload",
      categoryId: "other",
      path: `content/uploads/${id}/${entryRel}`,
      title: title || id,
      description,
      thumbnail: "",
      order: 0,
      published: true,
      hidden: false,
      uploadKind,
      createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  return imported;
}

module.exports = {
  scanRemoteUploads,
};
