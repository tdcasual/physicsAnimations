const fs = require("fs");
const path = require("path");
const unzipper = require("unzipper");

const { extractHtmlTitleAndDescription: defaultExtractHtmlTitleAndDescription } = require("../../lib/htmlMeta");
const {
  decodeHtmlBuffer: defaultDecodeHtmlBuffer,
  decodeTextBuffer: defaultDecodeTextBuffer,
} = require("../../lib/textEncoding");
const { guessContentType, normalizeZipPath } = require("./uploadIngestUtils");

const MAX_FILES = 500;
const MAX_TOTAL_BYTES = 80 * 1024 * 1024;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const ALLOWED_EXTS = new Set([
  ".html",
  ".htm",
  ".css",
  ".js",
  ".mjs",
  ".json",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".mp4",
  ".mp3",
  ".wasm",
  ".txt",
  ".map",
]);

const TEXT_EXTS = new Set([
  ".css",
  ".js",
  ".mjs",
  ".json",
  ".map",
  ".txt",
  ".svg",
]);

async function ingestZipUpload({
  fileBuffer,
  id,
  now,
  tmpDir,
  writeUploadBuffer,
  deps = {},
}) {
  const decodeHtmlBuffer = deps.decodeHtmlBuffer || defaultDecodeHtmlBuffer;
  const decodeTextBuffer = deps.decodeTextBuffer || defaultDecodeTextBuffer;
  const extractHtmlTitleAndDescription =
    deps.extractHtmlTitleAndDescription || defaultExtractHtmlTitleAndDescription;

  const dir = await unzipper.Open.buffer(fileBuffer);
  const files = (dir.files || []).filter((f) => f.type === "File");
  if (files.length > MAX_FILES) {
    const err = new Error("too_many_files");
    err.status = 400;
    throw err;
  }

  let total = 0;
  const extracted = [];
  const htmlCandidates = [];
  const htmlMetaByPath = new Map();

  for (const file of files) {
    const rel = normalizeZipPath(file.path);
    if (!rel) continue;
    if (rel.startsWith("__MACOSX/")) continue;
    const ext = path.extname(rel).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      const err = new Error("unsupported_file_type");
      err.status = 400;
      throw err;
    }

    const size = Number(file.uncompressedSize || file.size || 0);
    total += size;
    if (total > MAX_TOTAL_BYTES) {
      const err = new Error("zip_too_large");
      err.status = 400;
      throw err;
    }

    const buf = await file.buffer();
    if (buf.length > MAX_FILE_BYTES) {
      const err = new Error("file_too_large");
      err.status = 413;
      throw err;
    }

    const localPath = path.join(tmpDir, rel);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });

    let outBuf = buf;
    let contentType = guessContentType(rel);
    const extLower = path.extname(rel).toLowerCase();

    if (extLower === ".html" || extLower === ".htm") {
      const html = decodeHtmlBuffer(buf);
      const meta = extractHtmlTitleAndDescription(html);
      htmlMetaByPath.set(rel, meta);
      outBuf = Buffer.from(html, "utf8");
      contentType = "text/html; charset=utf-8";
      htmlCandidates.push(rel);
    } else if (TEXT_EXTS.has(extLower)) {
      const kind = extLower === ".css" ? "css" : "text";
      const text = decodeTextBuffer(buf, { kind });
      outBuf = Buffer.from(text, "utf8");
      contentType = guessContentType(rel);
    }

    fs.writeFileSync(localPath, outBuf);
    await writeUploadBuffer(`uploads/${id}/${rel}`, outBuf, { contentType });
    extracted.push(rel);
  }

  const indexCandidates = htmlCandidates
    .filter((p) => /(^|\/)index\.html?$/i.test(p))
    .sort((a, b) => a.split("/").length - b.split("/").length);

  const entryRelPath = indexCandidates[0] || htmlCandidates[0] || "";
  if (!entryRelPath) {
    const err = new Error("missing_index_html");
    err.status = 400;
    throw err;
  }

  const entryMeta = htmlMetaByPath.get(entryRelPath);
  const inferredTitle = entryMeta?.title || "";
  const inferredDescription = entryMeta?.description || "";

  const manifest = {
    version: 1,
    id,
    entry: entryRelPath,
    files: extracted,
    createdAt: now,
  };
  await writeUploadBuffer(
    `uploads/${id}/manifest.json`,
    Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
    { contentType: "application/json; charset=utf-8" },
  );

  return {
    uploadKind: "zip",
    entryRelPath,
    inferredTitle,
    inferredDescription,
  };
}

module.exports = {
  ingestZipUpload,
};
