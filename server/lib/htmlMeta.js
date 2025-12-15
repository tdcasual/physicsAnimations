function decodeHtmlEntities(input) {
  if (typeof input !== "string") return "";

  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => {
      const code = Number.parseInt(hex, 16);
      if (!Number.isFinite(code)) return "";
      return String.fromCodePoint(code);
    })
    .replace(/&#(\d+);/g, (_m, num) => {
      const code = Number.parseInt(num, 10);
      if (!Number.isFinite(code)) return "";
      return String.fromCodePoint(code);
    });
}

function cleanText(input, { maxLen = 200 } = {}) {
  const decoded = decodeHtmlEntities(String(input || ""));
  const stripped = decoded.replace(/<[^>]*>/g, "");
  const normalized = stripped.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLen) return normalized;
  return normalized.slice(0, maxLen).trim();
}

function extractMetaContent(html, { name, property }) {
  const tagRe = new RegExp(
    `<meta\\\\b(?=[^>]*\\\\b(?:name|property)\\\\s*=\\\\s*(?:\"${name}\"|'${name}'|${name}\\\\b|\"${property}\"|'${property}'|${property}\\\\b))[^>]*\\\\bcontent\\\\s*=\\\\s*(?:\"([^\"]*)\"|'([^']*)'|([^'\">\\\\s]+))[^>]*>`,
    "i",
  );
  const match = String(html || "").match(tagRe);
  return cleanText(match?.[1] || match?.[2] || match?.[3] || "");
}

function extractTitle(html) {
  const titleMatch = String(html || "").match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = cleanText(titleMatch?.[1] || "", { maxLen: 120 });
  if (title) return title;

  const ogTitle = extractMetaContent(html, { name: "og:title", property: "og:title" });
  if (ogTitle) return cleanText(ogTitle, { maxLen: 120 });

  return "";
}

function extractDescription(html) {
  const desc = extractMetaContent(html, { name: "description", property: "description" });
  if (desc) return cleanText(desc, { maxLen: 240 });

  const ogDesc = extractMetaContent(html, { name: "og:description", property: "og:description" });
  if (ogDesc) return cleanText(ogDesc, { maxLen: 240 });

  return "";
}

function extractHtmlTitleAndDescription(html) {
  return {
    title: extractTitle(html),
    description: extractDescription(html),
  };
}

module.exports = {
  extractHtmlTitleAndDescription,
};
