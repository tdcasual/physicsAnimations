function collectCssFuncArg(text, startIndex) {
  let i = startIndex;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  if (text[i] !== "(") return { value: "", nextIndex: startIndex };
  i += 1;
  let value = "";
  let quote = "";
  while (i < text.length) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") {
        const next = text[i + 1] || "";
        value += ch + next;
        i += 2;
        continue;
      }
      if (ch === quote) {
        quote = "";
        value += ch;
        i += 1;
        continue;
      }
      value += ch;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      value += ch;
      i += 1;
      continue;
    }
    if (ch === ")") {
      i += 1;
      break;
    }
    value += ch;
    i += 1;
  }
  return { value: value.trim(), nextIndex: i };
}

function unwrapCssString(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const quote = text[0];
  if ((quote === "'" || quote === '"') && text[text.length - 1] === quote) {
    return text.slice(1, -1).trim();
  }
  return text;
}

function parseCssRefs(cssText) {
  const out = [];
  const text = String(cssText || "");
  const quotedUrlRegex = /url\(\s*(['"])([^"']+)\1\s*\)/gi;
  let match = null;
  while ((match = quotedUrlRegex.exec(text))) {
    const ref = String(match[2] || "").trim();
    if (!ref) continue;
    out.push(ref);
  }
  const plainUrlRegex = /url\(\s*([^"'()\s][^()]*?)\s*\)/gi;
  let plainMatch = null;
  while ((plainMatch = plainUrlRegex.exec(text))) {
    const ref = String(plainMatch[1] || "").trim();
    if (!ref) continue;
    out.push(ref);
  }
  const importRegex = /@import\s+(?:url\(\s*)?['"]([^'"]+)['"]\s*\)?/gi;
  let importMatch = null;
  while ((importMatch = importRegex.exec(text))) {
    const ref = String(importMatch[1] || "").trim();
    if (!ref) continue;
    out.push(ref);
  }
  const importUrlRegex = /@import\s+url\(\s*([^'")\s][^)]*)\s*\)/gi;
  let importUrlMatch = null;
  while ((importUrlMatch = importUrlRegex.exec(text))) {
    const ref = String(importUrlMatch[1] || "").trim();
    if (!ref) continue;
    out.push(ref);
  }

  // Fallback scanner for complex url()/@import arguments that break simple regex.
  for (let i = 0; i < text.length; i += 1) {
    if (text.startsWith("url", i)) {
      const { value, nextIndex } = collectCssFuncArg(text, i + 3);
      const ref = unwrapCssString(value);
      if (ref) out.push(ref);
      if (nextIndex > i) i = nextIndex - 1;
      continue;
    }
    if (!text.startsWith("@import", i)) continue;
    let j = i + "@import".length;
    while (j < text.length && /\s/.test(text[j])) j += 1;
    if (text.startsWith("url", j)) {
      const { value, nextIndex } = collectCssFuncArg(text, j + 3);
      const ref = unwrapCssString(value);
      if (ref) out.push(ref);
      if (nextIndex > i) i = nextIndex - 1;
      continue;
    }
    const quote = text[j];
    if (quote !== "'" && quote !== '"') continue;
    j += 1;
    let ref = "";
    while (j < text.length && text[j] !== quote) {
      if (text[j] === "\\") {
        const next = text[j + 1] || "";
        ref += next;
        j += 2;
        continue;
      }
      ref += text[j];
      j += 1;
    }
    if (ref.trim()) out.push(ref.trim());
  }

  const deduped = [];
  const seen = new Set();
  for (const item of out) {
    const ref = String(item || "").trim();
    if (!ref || seen.has(ref)) continue;
    seen.add(ref);
    deduped.push(ref);
  }
  return deduped;
}

module.exports = {
  parseCssRefs,
};
