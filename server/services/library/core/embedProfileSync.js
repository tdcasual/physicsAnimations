const {
  normalizeUrlLike,
  deriveViewerPath,
  isHttpUrl,
  toMirrorRelativePath,
  shouldSkipRef,
  parseHtmlRefs,
  parseJsRefs,
  parseCssRefs,
  toViewerRef,
  normalizeLocalMirrorRelativePath,
  toPublicPath,
} = require("./normalizers");

function createEmbedProfileSync({ store, fetcher, getEmbedProfileById, mutateLibraryEmbedProfilesState }) {
  async function fetchRemoteBuffer(url) {
    if (!fetcher) throw new Error("fetch_unavailable");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetcher(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
      if (!response || response.ok !== true) {
        throw new Error(`fetch_failed:${Number(response?.status || 0)}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length) throw new Error("empty_response");
      return {
        buffer,
        contentType: String(response.headers?.get?.("content-type") || ""),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async function mirrorEmbedProfileResources(profile) {
    const profileId = String(profile?.id || "").trim();
    const remoteScriptUrl = normalizeUrlLike(profile?.remoteScriptUrl || profile?.scriptUrl);
    const remoteViewerPath = normalizeUrlLike(profile?.remoteViewerPath || profile?.viewerPath || deriveViewerPath(remoteScriptUrl));
    if (!profileId || !isHttpUrl(remoteScriptUrl) || !isHttpUrl(remoteViewerPath)) {
      return { ok: false, message: "remote_url_not_syncable" };
    }

    let scriptUrlObject = null;
    let viewerUrlObject = null;
    try {
      scriptUrlObject = new URL(remoteScriptUrl);
      viewerUrlObject = new URL(remoteViewerPath);
    } catch {
      return { ok: false, message: "invalid_remote_url" };
    }

    const mirrorPrefix = `library/vendor/embed-profiles/${profileId}/current`;
    const viewerBaseDir = new URL("./", viewerUrlObject);

    const scriptFetch = await fetchRemoteBuffer(remoteScriptUrl);
    const viewerFetch = await fetchRemoteBuffer(remoteViewerPath);
    let viewerHtml = viewerFetch.buffer.toString("utf8");

    const downloadedByUrl = new Map();
    const pendingQueue = [];
    const maxFiles = 120;

    function enqueueFromRef(baseUrl, refValue) {
      const ref = String(refValue || "").trim();
      if (!ref || shouldSkipRef(ref)) return;
      let resolved = null;
      try {
        resolved = new URL(ref, baseUrl);
      } catch {
        return;
      }
      if (!["http:", "https:"].includes(resolved.protocol)) return;
      if (resolved.origin !== viewerUrlObject.origin) return;

      const rel = toMirrorRelativePath(viewerBaseDir, resolved);
      if (!rel || downloadedByUrl.has(resolved.toString())) return;
      pendingQueue.push({
        absoluteUrl: resolved.toString(),
        relativePath: rel,
      });
    }

    for (const ref of parseHtmlRefs(viewerHtml)) {
      enqueueFromRef(viewerUrlObject, ref);
    }
    for (const ref of parseJsRefs(scriptFetch.buffer.toString("utf8"))) {
      enqueueFromRef(scriptUrlObject, ref);
    }

    while (pendingQueue.length > 0 && downloadedByUrl.size < maxFiles) {
      const next = pendingQueue.shift();
      if (!next) break;
      if (downloadedByUrl.has(next.absoluteUrl)) continue;

      let downloaded = null;
      try {
        downloaded = await fetchRemoteBuffer(next.absoluteUrl);
      } catch {
        continue;
      }
      downloadedByUrl.set(next.absoluteUrl, {
        relativePath: next.relativePath,
        ...downloaded,
      });

      const lowerRel = next.relativePath.toLowerCase();
      if (lowerRel.endsWith(".js") || lowerRel.endsWith(".mjs")) {
        const code = downloaded.buffer.toString("utf8");
        for (const ref of parseJsRefs(code)) {
          enqueueFromRef(new URL(next.absoluteUrl), ref);
        }
      } else if (lowerRel.endsWith(".css")) {
        const css = downloaded.buffer.toString("utf8");
        for (const ref of parseCssRefs(css)) {
          enqueueFromRef(new URL(next.absoluteUrl), ref);
        }
      }
    }

    const refRewriteMap = new Map();
    for (const ref of parseHtmlRefs(viewerHtml)) {
      if (shouldSkipRef(ref)) continue;
      let resolved = null;
      try {
        resolved = new URL(ref, viewerUrlObject);
      } catch {
        continue;
      }
      const item = downloadedByUrl.get(resolved.toString());
      if (!item) continue;
      refRewriteMap.set(ref, toViewerRef(item.relativePath));
    }
    if (refRewriteMap.size > 0) {
      viewerHtml = viewerHtml.replace(
        /(<(?:script|link)\b[^>]*(?:src|href)\s*=\s*["'])([^"']+)(["'][^>]*>)/gi,
        (all, prefix, ref, suffix) => {
          if (!refRewriteMap.has(ref)) return all;
          return `${prefix}${refRewriteMap.get(ref)}${suffix}`;
        },
      );
    }

    await store.deletePath(mirrorPrefix, { recursive: true }).catch(() => {});
    await store.writeBuffer(`${mirrorPrefix}/embed.js`, scriptFetch.buffer, {
      contentType: scriptFetch.contentType || "application/javascript; charset=utf-8",
    });
    await store.writeBuffer(`${mirrorPrefix}/viewer.html`, Buffer.from(viewerHtml, "utf8"), {
      contentType: "text/html; charset=utf-8",
    });
    for (const item of downloadedByUrl.values()) {
      const rel = normalizeLocalMirrorRelativePath(item.relativePath);
      if (!rel) continue;
      await store.writeBuffer(`${mirrorPrefix}/${rel}`, item.buffer, {
        contentType: item.contentType || undefined,
      });
    }

    return {
      ok: true,
      scriptUrl: `/${toPublicPath(`${mirrorPrefix}/embed.js`)}`,
      viewerPath: `/${toPublicPath(`${mirrorPrefix}/viewer.html`)}`,
      message: `synced_${downloadedByUrl.size + 2}_files`,
    };
  }

  async function applyEmbedProfileSyncStatus({
    profileId,
    syncStatus,
    syncMessage,
    scriptUrl,
    viewerPath,
  }) {
    const now = new Date().toISOString();
    let updated = null;
    await mutateLibraryEmbedProfilesState({ store }, (state) => {
      const target = state.profiles.find((item) => item.id === profileId);
      if (!target) return;
      target.syncStatus = String(syncStatus || "").trim() || "pending";
      target.syncMessage = String(syncMessage || "").trim();
      target.lastSyncAt = now;
      if (scriptUrl) target.scriptUrl = scriptUrl;
      if (viewerPath) target.viewerPath = viewerPath;
      target.updatedAt = now;
      updated = { ...target };
    });
    return updated;
  }

  async function syncEmbedProfile({ profileId, tolerateFailure = false } = {}) {
    const profile = await getEmbedProfileById({ profileId });
    if (!profile) return { status: 404, error: "embed_profile_not_found" };
    if (!isHttpUrl(profile.remoteScriptUrl || profile.scriptUrl)) {
      return { status: 400, error: "invalid_profile_script_url" };
    }
    if (!isHttpUrl(profile.remoteViewerPath || profile.viewerPath || deriveViewerPath(profile.remoteScriptUrl || profile.scriptUrl))) {
      return { status: 400, error: "invalid_profile_viewer_path" };
    }

    try {
      const mirrored = await mirrorEmbedProfileResources(profile);
      if (!mirrored.ok) {
        const updated = await applyEmbedProfileSyncStatus({
          profileId: profile.id,
          syncStatus: "failed",
          syncMessage: mirrored.message || "sync_failed",
        });
        if (tolerateFailure) return { ok: true, profile: updated || profile };
        return { status: 502, error: "embed_profile_sync_failed" };
      }
      const updated = await applyEmbedProfileSyncStatus({
        profileId: profile.id,
        syncStatus: "ok",
        syncMessage: mirrored.message || "sync_ok",
        scriptUrl: mirrored.scriptUrl,
        viewerPath: mirrored.viewerPath,
      });
      if (!updated) return { status: 404, error: "embed_profile_not_found" };
      return { ok: true, profile: updated };
    } catch (err) {
      await applyEmbedProfileSyncStatus({
        profileId: profile.id,
        syncStatus: "failed",
        syncMessage: err && err.message ? String(err.message) : "sync_failed",
      }).catch(() => {});
      if (tolerateFailure) {
        const refreshed = await getEmbedProfileById({ profileId: profile.id });
        return { ok: true, profile: refreshed || profile };
      }
      return { status: 502, error: "embed_profile_sync_failed" };
    }
  }

  return {
    mirrorEmbedProfileResources,
    applyEmbedProfileSyncStatus,
    syncEmbedProfile,
  };
}

module.exports = {
  createEmbedProfileSync,
};
