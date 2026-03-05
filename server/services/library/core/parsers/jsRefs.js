function parseJsRefs(jsText) {
  const out = [];
  const text = String(jsText || "");
  const importRegex = /(?:import|export)\s*(?:[^"']*?\sfrom\s*)?["']([^"']+)["']/g;
  const dynamicImportRegex = /import\(\s*["']([^"']+)["']\s*\)/g;
  const importMetaUrlRegex = /new\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/g;
  for (const regex of [importRegex, dynamicImportRegex, importMetaUrlRegex]) {
    let match = null;
    while ((match = regex.exec(text))) {
      const ref = String(match[1] || "").trim();
      if (!ref) continue;
      out.push(ref);
    }
  }

  // Fallback scanner: captures dynamic imports with options, e.g. import("./x.js", {...})
  for (let i = 0; i < text.length; i += 1) {
    if (!text.startsWith("import", i)) continue;
    const prev = i > 0 ? text[i - 1] : "";
    if (/[a-zA-Z0-9_$]/.test(prev)) continue;
    let j = i + "import".length;
    while (j < text.length && /\s/.test(text[j])) j += 1;
    if (text[j] !== "(") continue;
    j += 1;
    while (j < text.length && /\s/.test(text[j])) j += 1;
    const quote = text[j];
    if (quote !== "'" && quote !== '"') continue;
    j += 1;
    let value = "";
    while (j < text.length) {
      const ch = text[j];
      if (ch === "\\") {
        const next = text[j + 1] || "";
        value += next;
        j += 2;
        continue;
      }
      if (ch === quote) break;
      value += ch;
      j += 1;
    }
    if (value.trim()) out.push(value.trim());
  }
  return out;
}

module.exports = {
  parseJsRefs,
};
