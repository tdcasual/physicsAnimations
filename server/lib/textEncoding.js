const iconv = require("iconv-lite");

function detectBom(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return { encoding: "utf8", offset: 3 };
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return { encoding: "utf16le", offset: 2 };
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return { encoding: "utf16be", offset: 2 };
  }
  return null;
}

function normalizeEncodingName(name) {
  const raw = String(name || "").trim().toLowerCase();
  if (!raw) return "";

  if (raw === "utf-8" || raw === "utf8") return "utf8";
  if (raw === "utf-16" || raw === "utf16" || raw === "utf-16le" || raw === "utf16le") return "utf16le";
  if (raw === "utf-16be" || raw === "utf16be") return "utf16be";

  if (raw === "gbk" || raw === "gb2312" || raw === "gb18030") return "gb18030";

  if (raw === "big5" || raw === "big-5") return "big5";

  if (raw === "iso-8859-1" || raw === "latin1" || raw === "windows-1252") return "latin1";

  return raw;
}

function isValidUtf8(buffer) {
  if (!Buffer.isBuffer(buffer)) return false;
  let i = 0;
  while (i < buffer.length) {
    const b1 = buffer[i];
    if (b1 <= 0x7f) {
      i += 1;
      continue;
    }

    let bytesNeeded = 0;
    if ((b1 & 0xe0) === 0xc0) {
      bytesNeeded = 1;
      if (b1 < 0xc2) return false;
    } else if ((b1 & 0xf0) === 0xe0) {
      bytesNeeded = 2;
    } else if ((b1 & 0xf8) === 0xf0) {
      bytesNeeded = 3;
      if (b1 > 0xf4) return false;
    } else {
      return false;
    }

    if (i + bytesNeeded >= buffer.length) return false;
    for (let j = 1; j <= bytesNeeded; j += 1) {
      if ((buffer[i + j] & 0xc0) !== 0x80) return false;
    }

    const b2 = buffer[i + 1];
    if (bytesNeeded === 2) {
      if (b1 === 0xe0 && b2 < 0xa0) return false;
      if (b1 === 0xed && b2 >= 0xa0) return false;
    } else if (bytesNeeded === 3) {
      if (b1 === 0xf0 && b2 < 0x90) return false;
      if (b1 === 0xf4 && b2 > 0x8f) return false;
    }

    i += bytesNeeded + 1;
  }
  return true;
}

function sniffHtmlDeclaredEncoding(buffer) {
  if (!Buffer.isBuffer(buffer)) return "";

  const head = buffer.slice(0, 8192).toString("latin1");
  const metaCharset = head.match(/<meta\b[^>]*\bcharset\s*=\s*["']?\s*([a-z0-9._-]+)/i);
  if (metaCharset?.[1]) return metaCharset[1];

  const metaHttpEquiv = head.match(
    /<meta\b[^>]*http-equiv\s*=\s*["']content-type["'][^>]*content\s*=\s*["'][^"']*charset\s*=\s*([a-z0-9._-]+)/i,
  );
  if (metaHttpEquiv?.[1]) return metaHttpEquiv[1];

  const xmlDecl = head.match(/<\?xml\b[^>]*\bencoding\s*=\s*["']\s*([a-z0-9._-]+)\s*["']/i);
  if (xmlDecl?.[1]) return xmlDecl[1];

  return "";
}

function sniffCssDeclaredEncoding(buffer) {
  if (!Buffer.isBuffer(buffer)) return "";
  const head = buffer.slice(0, 512).toString("latin1");
  const match = head.match(/^\s*@charset\s+["']\s*([a-z0-9._-]+)\s*["']\s*;/i);
  return match?.[1] ? match[1] : "";
}

function decodeBufferWithFallback(buffer, declaredEncoding) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) return "";

  const bom = detectBom(buffer);
  if (bom) {
    const slice = buffer.slice(bom.offset);
    if (bom.encoding === "utf8") return slice.toString("utf8");
    if (iconv.encodingExists(bom.encoding)) return iconv.decode(slice, bom.encoding);
  }

  const normalizedDeclared = normalizeEncodingName(declaredEncoding);
  const validUtf8 = isValidUtf8(buffer);

  if (normalizedDeclared) {
    if (normalizedDeclared === "utf8") {
      if (validUtf8) return buffer.toString("utf8");
    } else if (validUtf8) {
      return buffer.toString("utf8");
    } else if (iconv.encodingExists(normalizedDeclared)) {
      return iconv.decode(buffer, normalizedDeclared);
    }
  }

  if (validUtf8) return buffer.toString("utf8");
  if (iconv.encodingExists("gb18030")) return iconv.decode(buffer, "gb18030");

  return buffer.toString("utf8");
}

function decodeHtmlBuffer(buffer) {
  const declared = sniffHtmlDeclaredEncoding(buffer);
  return decodeBufferWithFallback(buffer, declared);
}

function decodeTextBuffer(buffer, { kind = "text" } = {}) {
  if (kind === "css") {
    const declared = sniffCssDeclaredEncoding(buffer);
    return decodeBufferWithFallback(buffer, declared);
  }
  return decodeBufferWithFallback(buffer, "");
}

module.exports = {
  decodeHtmlBuffer,
  decodeTextBuffer,
  isValidUtf8,
};
