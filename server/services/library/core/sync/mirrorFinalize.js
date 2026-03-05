const {
  parseHtmlRefs,
  parseHtmlMediaRefs,
  parseHtmlInlineStyleRefs,
  toViewerRef,
  normalizeLocalMirrorRelativePath,
} = require("../normalizers");
const { sanitizeReleaseHistory } = require("./syncCommon");
const { inferTextKind, collectRefsByKind, rewriteViewerHtmlRefs } = require("./rewrite");

function runStrictSelfCheck({
  syncOptions,
  remoteScriptUrl,
  remoteViewerPath,
  scriptSource,
  viewerHtmlOriginal,
  downloadedByUrl,
  report,
  resolveViewerRef,
  failSync,
}) {
  if (!syncOptions.strictSelfCheck) return;

  const unresolved = [];
  const graphSources = [
    { absoluteUrl: remoteScriptUrl, kind: "js", text: scriptSource },
    { absoluteUrl: remoteViewerPath, kind: "html", text: viewerHtmlOriginal },
  ];
  for (const [absoluteUrl, item] of downloadedByUrl.entries()) {
    const kind = inferTextKind(item.relativePath, item.contentType);
    if (!kind) continue;
    graphSources.push({ absoluteUrl, kind, text: item.buffer.toString("utf8") });
  }

  for (const source of graphSources) {
    const refs = collectRefsByKind(source.kind, source.text);
    for (const ref of refs) {
      const resolved = resolveViewerRef(ref, source.absoluteUrl);
      if (!resolved) continue;
      if (resolved === remoteScriptUrl || resolved === remoteViewerPath || downloadedByUrl.has(resolved)) continue;
      unresolved.push({ source: source.absoluteUrl, target: resolved });
    }
  }
  if (unresolved.length > 0) {
    report.unresolvedCount = unresolved.length;
    failSync("offline_self_check_failed", unresolved[0].target, {
      url: unresolved[0].target,
      source: unresolved[0].source,
    });
  }
}

function rewriteViewerHtmlDependencies({ viewerHtml, viewerUrlObject, downloadedByUrl, resolveViewerRef }) {
  const refRewriteMap = new Map();
  for (const ref of [...parseHtmlRefs(viewerHtml), ...parseHtmlMediaRefs(viewerHtml), ...parseHtmlInlineStyleRefs(viewerHtml)]) {
    const resolved = resolveViewerRef(ref, viewerUrlObject);
    if (!resolved) continue;
    const item = downloadedByUrl.get(resolved);
    if (!item) continue;
    refRewriteMap.set(ref, toViewerRef(item.relativePath));
  }
  if (refRewriteMap.size === 0) return viewerHtml;
  return rewriteViewerHtmlRefs(viewerHtml, refRewriteMap);
}

async function publishMirroredRelease({
  store,
  releasePrefix,
  scriptFetch,
  viewerHtml,
  downloadedByUrl,
  failSync,
}) {
  try {
    await store.deletePath(releasePrefix, { recursive: true });
    await store.writeBuffer(`${releasePrefix}/embed.js`, scriptFetch.buffer, {
      contentType: scriptFetch.contentType || "application/javascript; charset=utf-8",
    });
    await store.writeBuffer(`${releasePrefix}/viewer.html`, Buffer.from(viewerHtml, "utf8"), {
      contentType: "text/html; charset=utf-8",
    });
    for (const item of downloadedByUrl.values()) {
      const rel = normalizeLocalMirrorRelativePath(item.relativePath);
      if (!rel) continue;
      await store.writeBuffer(`${releasePrefix}/${rel}`, item.buffer, {
        contentType: item.contentType || undefined,
      });
    }
  } catch (error) {
    failSync("write_failed", error && error.message ? String(error.message) : "write_failed");
  }
}

async function rotateReleaseHistory({
  store,
  profilePrefix,
  profile,
  previousReleaseId,
  releaseId,
  keepReleases,
}) {
  await store.deletePath(`${profilePrefix}/current`, { recursive: true }).catch(() => {});

  const previousHistory = sanitizeReleaseHistory(profile?.releaseHistory);
  if (previousReleaseId && !previousHistory.includes(previousReleaseId)) {
    previousHistory.unshift(previousReleaseId);
  }
  const nextHistory = [releaseId, ...previousHistory.filter((item) => item !== releaseId)];
  const keep = Math.max(1, Number(keepReleases || 1));
  const releaseHistory = nextHistory.slice(0, keep);
  const staleReleases = nextHistory.slice(keep);
  for (const staleReleaseId of staleReleases) {
    await store.deletePath(`${profilePrefix}/releases/${staleReleaseId}`, { recursive: true }).catch(() => {});
  }
  return releaseHistory;
}

module.exports = {
  runStrictSelfCheck,
  rewriteViewerHtmlDependencies,
  publishMirroredRelease,
  rotateReleaseHistory,
};
