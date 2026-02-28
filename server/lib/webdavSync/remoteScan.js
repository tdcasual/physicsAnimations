const { extractHtmlTitleAndDescription, normalizeRemotePath, parseJsonBuffer } = require("./fileUtils");
const { toTimeMs } = require("./stateMerge");

async function scanRemoteUploads({ webdav, existingIds }) {
  const entries = await webdav.listDir("uploads");
  const imported = [];

  for (const entry of entries) {
    if (!entry?.isDir) continue;
    const id = String(entry.name || "").trim();
    if (!id) continue;
    if (!id.startsWith("u_")) continue;
    if (existingIds.has(id)) continue;

    const manifestBuf = await webdav.readBuffer(`uploads/${id}/manifest.json`);
    if (!manifestBuf) continue;
    const manifest = parseJsonBuffer(manifestBuf);
    if (!manifest || typeof manifest !== "object") continue;

    const entryRaw = typeof manifest.entry === "string" ? manifest.entry : "index.html";
    const entryRel = normalizeRemotePath(entryRaw) || "index.html";

    let title = "";
    let description = "";
    try {
      const htmlBuf = await webdav.readBuffer(`uploads/${id}/${entryRel}`);
      if (htmlBuf) {
        const meta = extractHtmlTitleAndDescription(htmlBuf.toString("utf8"));
        title = meta.title || "";
        description = meta.description || "";
      }
    } catch {
      // ignore
    }

    const createdAt =
      typeof manifest.createdAt === "string" && toTimeMs(manifest.createdAt) ? manifest.createdAt : new Date().toISOString();

    const files = Array.isArray(manifest.files) ? manifest.files.map((f) => String(f || "")) : [];
    const uploadKind = files.some((f) => f && !f.startsWith("deps/") && f !== "index.html") ? "zip" : "html";

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
