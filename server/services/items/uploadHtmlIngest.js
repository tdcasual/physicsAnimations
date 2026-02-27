const fs = require("fs");
const path = require("path");

const { extractHtmlTitleAndDescription: defaultExtractHtmlTitleAndDescription } = require("../../lib/htmlMeta");
const { decodeHtmlBuffer: defaultDecodeHtmlBuffer } = require("../../lib/textEncoding");
const {
  scanUploadedHtmlRisk: defaultScanUploadedHtmlRisk,
  createRiskConfirmationError,
} = require("../../lib/uploadSecurity");

async function ingestHtmlUpload({
  fileBuffer,
  id,
  now,
  tmpDir,
  writeUploadBuffer,
  allowRiskyHtml = false,
  deps = {},
}) {
  const decodeHtmlBuffer = deps.decodeHtmlBuffer || defaultDecodeHtmlBuffer;
  const extractHtmlTitleAndDescription =
    deps.extractHtmlTitleAndDescription || defaultExtractHtmlTitleAndDescription;
  const scanUploadedHtmlRisk = deps.scanUploadedHtmlRisk || defaultScanUploadedHtmlRisk;

  const html = decodeHtmlBuffer(fileBuffer);
  const riskFindings = scanUploadedHtmlRisk(html, { source: "index.html" });
  if (riskFindings.length > 0 && !allowRiskyHtml) {
    throw createRiskConfirmationError(riskFindings);
  }

  const meta = extractHtmlTitleAndDescription(html);
  const inferredTitle = meta.title || "";
  const inferredDescription = meta.description || "";

  await writeUploadBuffer(`uploads/${id}/index.html`, Buffer.from(html, "utf8"), {
    contentType: "text/html; charset=utf-8",
  });
  fs.writeFileSync(path.join(tmpDir, "index.html"), html, "utf8");

  const manifestFiles = ["index.html"];
  await writeUploadBuffer(
    `uploads/${id}/manifest.json`,
    Buffer.from(
      `${JSON.stringify({ version: 1, id, entry: "index.html", files: manifestFiles, createdAt: now }, null, 2)}\n`,
      "utf8",
    ),
    { contentType: "application/json; charset=utf-8" },
  );

  return {
    uploadKind: "html",
    entryRelPath: "index.html",
    inferredTitle,
    inferredDescription,
  };
}

module.exports = {
  ingestHtmlUpload,
};
