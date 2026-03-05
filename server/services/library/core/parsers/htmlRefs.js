const { parseCssRefs } = require("./cssRefs");

function parseHtmlRefs(html) {
  const out = [];
  const text = String(html || "");
  const regex = /<(?:script|link)\b[^>]*(?:src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match = null;
  while ((match = regex.exec(text))) {
    const ref = String(match[1] || "").trim();
    if (!ref) continue;
    out.push(ref);
  }
  return out;
}

function parseSrcsetRefs(value) {
  const out = [];
  const text = String(value || "").trim();
  if (!text) return out;
  for (const candidate of text.split(",")) {
    const part = String(candidate || "").trim();
    if (!part) continue;
    const firstWs = part.search(/\s/);
    const ref = (firstWs === -1 ? part : part.slice(0, firstWs)).trim();
    if (!ref) continue;
    out.push(ref);
  }
  return out;
}

function parseHtmlMediaRefs(html) {
  const out = [];
  const text = String(html || "");
  const tagRegex = /<(?:img|source|video|audio|track)\b[^>]*>/gi;
  let tagMatch = null;
  while ((tagMatch = tagRegex.exec(text))) {
    const tag = String(tagMatch[0] || "");
    if (!tag) continue;

    const attrRegex = /\b(?:src|poster)\s*=\s*["']([^"']+)["']/gi;
    let attrMatch = null;
    while ((attrMatch = attrRegex.exec(tag))) {
      const ref = String(attrMatch[1] || "").trim();
      if (!ref) continue;
      out.push(ref);
    }

    const srcsetRegex = /\bsrcset\s*=\s*["']([^"']+)["']/gi;
    let srcsetMatch = null;
    while ((srcsetMatch = srcsetRegex.exec(tag))) {
      for (const ref of parseSrcsetRefs(srcsetMatch[1])) {
        out.push(ref);
      }
    }
  }
  return out;
}

function parseHtmlInlineStyleRefs(html) {
  const out = [];
  const text = String(html || "");

  const styleTagRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let styleTagMatch = null;
  while ((styleTagMatch = styleTagRegex.exec(text))) {
    for (const ref of parseCssRefs(styleTagMatch[1])) out.push(ref);
  }

  const styleAttrRegex = /\bstyle\s*=\s*["']([^"']+)["']/gi;
  let styleAttrMatch = null;
  while ((styleAttrMatch = styleAttrRegex.exec(text))) {
    for (const ref of parseCssRefs(styleAttrMatch[1])) out.push(ref);
  }

  return out;
}

module.exports = {
  parseHtmlRefs,
  parseHtmlMediaRefs,
  parseHtmlInlineStyleRefs,
};
