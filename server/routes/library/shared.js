function normalizeErrorStatus(value) {
  const status = Number(value);
  if (!Number.isFinite(status)) return 500;
  const code = Math.trunc(status);
  if (code < 400 || code > 599) return 500;
  return code;
}

function sendServiceResult(res, result, okBody) {
  if (result?.error) {
    res.status(normalizeErrorStatus(result.status)).json({ error: result.error });
    return true;
  }
  res.json(okBody(result));
  return false;
}

function parseEmbedOptionsJson(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "invalid_embed_options_json" };
    }
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, error: "invalid_embed_options_json" };
  }
}

module.exports = {
  sendServiceResult,
  parseEmbedOptionsJson,
};
