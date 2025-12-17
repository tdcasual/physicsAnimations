function stripTagByName(html, tagName) {
  const openOrClose = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  return html.replace(openOrClose, "");
}

function stripMetaHttpEquiv(html, httpEquivValue) {
  const re = new RegExp(
    `<meta\\b[^>]*http-equiv\\s*=\\s*(['"])${httpEquivValue}\\1[^>]*>`,
    "gi",
  );
  return html.replace(re, "");
}

function stripScriptTagsWithSrc(html) {
  const re = /<script\b[^>]*\bsrc\s*=\s*(['"]?)[^'">\s]+\1[^>]*>\s*<\/script\s*>/gi;
  return html.replace(re, "");
}

function stripScriptTagsWithExternalSrc(html) {
  const re =
    /<script\b[^>]*\bsrc\s*=\s*(['"]?)(https?:\/\/|\/\/)[^'">\s]+\1[^>]*>\s*<\/script\s*>/gi;
  return html.replace(re, "");
}

function stripExternalLinkTags(html) {
  const re = /<link\b[^>]*\bhref\s*=\s*(['"])(https?:\/\/|\/\/)[^'"]+\1[^>]*>/gi;
  return html.replace(re, "");
}

function escapeHtmlAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function injectCspMeta(html, csp) {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${escapeHtmlAttribute(csp)}">`;

  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b[^>]*>/i, (match) => `${match}\n    ${meta}`);
  }

  if (/<html\b[^>]*>/i.test(html)) {
    return html.replace(/<html\b[^>]*>/i, (match) => `${match}\n<head>\n    ${meta}\n</head>`);
  }

  return `<!doctype html>\n<head>\n    ${meta}\n</head>\n${html}`;
}

function ensureUtf8Meta(html) {
  let out = typeof html === "string" ? html : "";

  out = out.replace(/<meta\b[^>]*\bcharset\s*=\s*(['"]?)[^'">\s]+\1[^>]*>/gi, "");
  out = out.replace(
    /<meta\b[^>]*http-equiv\s*=\s*(['"])content-type\1[^>]*>/gi,
    "",
  );

  const meta = `<meta charset="UTF-8">`;

  if (/<head\b[^>]*>/i.test(out)) {
    return out.replace(/<head\b[^>]*>/i, (match) => `${match}\n    ${meta}`);
  }

  if (/<html\b[^>]*>/i.test(out)) {
    return out.replace(/<html\b[^>]*>/i, (match) => `${match}\n<head>\n    ${meta}\n</head>`);
  }

  return `<!doctype html>\n<head>\n    ${meta}\n</head>\n${out}`;
}

const UPLOAD_CSP = [
  "sandbox allow-scripts",
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "worker-src 'self' blob:",
].join("; ");

function sanitizeUploadedHtml(html, { allowLocalScripts = false } = {}) {
  let out = typeof html === "string" ? html : "";

  out = stripMetaHttpEquiv(out, "Content-Security-Policy");
  out = stripMetaHttpEquiv(out, "refresh");
  out = allowLocalScripts ? stripScriptTagsWithExternalSrc(out) : stripScriptTagsWithSrc(out);
  out = stripExternalLinkTags(out);
  out = stripTagByName(out, "base");
  out = stripTagByName(out, "form");
  out = stripTagByName(out, "iframe");
  out = stripTagByName(out, "object");
  out = stripTagByName(out, "embed");

  out = injectCspMeta(out, UPLOAD_CSP);
  out = ensureUtf8Meta(out);
  return out;
}

module.exports = {
  UPLOAD_CSP,
  sanitizeUploadedHtml,
};
