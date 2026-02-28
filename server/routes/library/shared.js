function sendServiceResult(res, result, okBody) {
  if (result?.error) {
    res.status(Number(result.status || 500)).json({ error: result.error });
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
