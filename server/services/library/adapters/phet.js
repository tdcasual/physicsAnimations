function normalizeFileName(fileName) {
  return String(fileName || "").trim().toLowerCase();
}

function isHtmlName(fileName) {
  return fileName.endsWith(".html") || fileName.endsWith(".htm");
}

function hasPhETMarkers(fileBuffer) {
  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) return false;
  const slice = fileBuffer.subarray(0, Math.min(fileBuffer.length, 64 * 1024));
  const text = slice.toString("utf8").toLowerCase();
  if (!text) return false;
  if (text.includes("phet.colorado.edu")) return true;
  if (text.includes("phet") && text.includes("sim")) return true;
  return false;
}

function buildEmbedHtml({ assetPublicFileUrl, title }) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${String(title || "PhET 演示")}</title>
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #f8fafc; }
      .stage { width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <iframe class="stage" src="${String(assetPublicFileUrl || "")}" title="${String(title || "PhET 演示")}" loading="eager"></iframe>
  </body>
</html>
`;
}

function createPhETAdapter() {
  return {
    key: "phet",
    match({ fileName, fileBuffer }) {
      const name = normalizeFileName(fileName);
      if (!isHtmlName(name)) return false;
      if (name.includes(".phet.")) return true;
      if (name.includes("phet")) return true;
      return hasPhETMarkers(fileBuffer);
    },
    async buildViewer({ openMode, assetPublicFileUrl, title = "PhET 演示" }) {
      if (openMode !== "embed") {
        return { generated: false, html: "" };
      }
      return {
        generated: true,
        html: buildEmbedHtml({ assetPublicFileUrl, title }),
      };
    },
  };
}

module.exports = {
  createPhETAdapter,
};
