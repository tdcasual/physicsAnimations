function decodeHtmlEntities(input) {
  if (typeof input !== "string") return "";

  function toCodePoint(code) {
    if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return "";
    try {
      return String.fromCodePoint(code);
    } catch {
      return "";
    }
  }

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
      return toCodePoint(code);
    })
    .replace(/&#(\d+);/g, (_m, num) => {
      const code = Number.parseInt(num, 10);
      if (!Number.isFinite(code)) return "";
      return toCodePoint(code);
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

function parseTagAttributes(tag) {
  const attrs = Object.create(null);
  const attrRe = /([a-zA-Z0-9:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match = null;
  while ((match = attrRe.exec(String(tag || "")))) {
    const key = String(match[1] || "").toLowerCase();
    if (!key) continue;
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attrs[key] = value;
  }
  return attrs;
}

function extractMetaContent(html, { name, property }) {
  const targets = new Set(
    [String(name || "").toLowerCase(), String(property || "").toLowerCase()].filter(Boolean),
  );
  if (!targets.size) return "";

  const text = String(html || "");
  const tagRe = /<meta\b[^>]*>/gi;
  let match = null;
  while ((match = tagRe.exec(text))) {
    const attrs = parseTagAttributes(match[0]);
    const metaName = String(attrs.name || "").toLowerCase();
    const metaProperty = String(attrs.property || "").toLowerCase();
    if (!targets.has(metaName) && !targets.has(metaProperty)) continue;
    if (!Object.prototype.hasOwnProperty.call(attrs, "content")) continue;
    return cleanText(attrs.content);
  }
  return "";
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
