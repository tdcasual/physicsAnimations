const {
  parseHtmlRefs,
  parseHtmlMediaRefs,
  parseHtmlInlineStyleRefs,
  parseJsRefs,
  parseCssRefs,
} = require("../normalizers");

function inferTextKind(relativePath, contentType) {
  const lowerRel = String(relativePath || "").toLowerCase();
  const lowerType = String(contentType || "").toLowerCase();
  if (lowerRel.endsWith(".js") || lowerRel.endsWith(".mjs") || lowerType.includes("javascript")) return "js";
  if (lowerRel.endsWith(".css") || lowerType.includes("text/css")) return "css";
  if (
    lowerRel.endsWith(".html") ||
    lowerRel.endsWith(".htm") ||
    lowerRel.endsWith(".xhtml") ||
    lowerType.includes("text/html") ||
    lowerType.includes("application/xhtml")
  ) {
    return "html";
  }
  return "";
}

function collectRefsByKind(kind, text) {
  const source = String(text || "");
  if (!source) return [];
  if (kind === "js") return parseJsRefs(source);
  if (kind === "css") return parseCssRefs(source);
  if (kind === "html") {
    return [...parseHtmlRefs(source), ...parseHtmlMediaRefs(source), ...parseHtmlInlineStyleRefs(source)];
  }
  return [];
}

function rewriteSrcsetValue(value, rewriteMap) {
  const parts = String(value || "")
    .split(",")
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  if (parts.length === 0) return value;
  return parts
    .map((part) => {
      const firstWhitespace = part.search(/\s/);
      const ref = (firstWhitespace === -1 ? part : part.slice(0, firstWhitespace)).trim();
      if (!ref) return part;
      const descriptor = firstWhitespace === -1 ? "" : part.slice(firstWhitespace).trim();
      const nextRef = rewriteMap.get(ref) || ref;
      return descriptor ? `${nextRef} ${descriptor}` : nextRef;
    })
    .join(", ");
}

function rewriteCssRefs(cssText, rewriteMap) {
  let nextCss = String(cssText || "");
  nextCss = nextCss.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (all, quote, ref) => {
    const key = String(ref || "").trim();
    const mapped = rewriteMap.get(key);
    if (!mapped) return all;
    const q = quote || '"';
    return `url(${q}${mapped}${q})`;
  });
  nextCss = nextCss.replace(/@import\s+url\(\s*(['"]?)([^'")\s]+)\1\s*\)/gi, (all, quote, ref) => {
    const key = String(ref || "").trim();
    const mapped = rewriteMap.get(key);
    if (!mapped) return all;
    const q = quote || '"';
    return `@import url(${q}${mapped}${q})`;
  });
  nextCss = nextCss.replace(/@import\s+(['"])([^'"]+)\1/gi, (all, quote, ref) => {
    const key = String(ref || "").trim();
    const mapped = rewriteMap.get(key);
    if (!mapped) return all;
    const q = quote || '"';
    return `@import ${q}${mapped}${q}`;
  });
  return nextCss;
}

function rewriteViewerHtmlRefs(htmlText, rewriteMap) {
  let nextHtml = String(htmlText || "");
  nextHtml = nextHtml.replace(
    /(<(?:script|link|img|source|video|audio|track)\b[^>]*\b(?:src|href|poster)\s*=\s*["'])([^"']+)(["'][^>]*>)/gi,
    (all, prefix, ref, suffix) => {
      if (!rewriteMap.has(ref)) return all;
      return `${prefix}${rewriteMap.get(ref)}${suffix}`;
    },
  );
  nextHtml = nextHtml.replace(
    /(<(?:img|source)\b[^>]*\bsrcset\s*=\s*["'])([^"']+)(["'][^>]*>)/gi,
    (all, prefix, srcsetValue, suffix) => `${prefix}${rewriteSrcsetValue(srcsetValue, rewriteMap)}${suffix}`,
  );
  nextHtml = nextHtml.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (all, attrs, cssText) => {
    return `<style${attrs}>${rewriteCssRefs(cssText, rewriteMap)}</style>`;
  });
  nextHtml = nextHtml.replace(/(\bstyle\s*=\s*)(["'])([^"']*)(\2)/gi, (all, prefix, quote, styleText, suffix) => {
    return `${prefix}${quote}${rewriteCssRefs(styleText, rewriteMap)}${suffix}`;
  });
  return nextHtml;
}

module.exports = {
  inferTextKind,
  collectRefsByKind,
  rewriteViewerHtmlRefs,
};
