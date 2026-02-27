const crypto = require("crypto");
const path = require("path");

const {
  loadLibraryFoldersState: defaultLoadLibraryFoldersState,
  mutateLibraryFoldersState: defaultMutateLibraryFoldersState,
  loadLibraryAssetsState: defaultLoadLibraryAssetsState,
  mutateLibraryAssetsState: defaultMutateLibraryAssetsState,
  loadLibraryEmbedProfilesState: defaultLoadLibraryEmbedProfilesState,
  mutateLibraryEmbedProfilesState: defaultMutateLibraryEmbedProfilesState,
} = require("../../lib/libraryState");
const { normalizeCategoryId } = require("../items/itemModel");
const { createDefaultLibraryAdapterRegistry } = require("./adapters");

const IMAGE_EXT_BY_MIME = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/svg+xml", ".svg"],
]);

function normalizeOpenMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (!mode) return "embed";
  if (mode === "embed") return "embed";
  if (mode === "download") return "download";
  return "";
}

function sanitizeFileName(name, fallback = "asset.bin") {
  const base = path.basename(String(name || "").trim());
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe || fallback;
}

function toPublicPath(key) {
  const normalized = String(key || "").replace(/^\/+/, "");
  return `content/${normalized}`;
}

function toStorageKey(publicPath) {
  return String(publicPath || "")
    .replace(/^\/+/, "")
    .replace(/^content\//, "");
}

function sanitizeJsonValue(value, depth = 0) {
  if (depth > 12) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) {
      const sanitized = sanitizeJsonValue(item, depth + 1);
      if (sanitized !== undefined) out.push(sanitized);
    }
    return out;
  }
  if (!value || typeof value !== "object") return undefined;
  const out = {};
  for (const [rawKey, item] of Object.entries(value)) {
    const key = String(rawKey || "").trim();
    if (!key) continue;
    const sanitized = sanitizeJsonValue(item, depth + 1);
    if (sanitized !== undefined) out[key] = sanitized;
  }
  return out;
}

function normalizeJsonObject(value) {
  if (value === undefined || value === null || value === "") return {};
  if (Array.isArray(value) || typeof value !== "object") return null;
  const out = sanitizeJsonValue(value);
  if (!out || typeof out !== "object" || Array.isArray(out)) return {};
  return out;
}

function normalizeExtensionList(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  const out = [];
  for (const item of source) {
    const ext = String(item || "")
      .trim()
      .replace(/^\./, "")
      .toLowerCase();
    if (!ext) continue;
    if (!/^[a-z0-9_-]{1,24}$/i.test(ext)) continue;
    if (!out.includes(ext)) out.push(ext);
  }
  return out;
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value || "").trim().toLowerCase();
  if (!text) return fallback;
  if (text === "1" || text === "true" || text === "yes" || text === "on") return true;
  if (text === "0" || text === "false" || text === "no" || text === "off") return false;
  return fallback;
}

function normalizeUrlLike(value) {
  return String(value || "").trim();
}

function isAllowedScriptUrl(value) {
  const url = normalizeUrlLike(value);
  if (!url) return false;
  if (url.startsWith("/")) return true;
  return /^https?:\/\//i.test(url);
}

function isAllowedViewerPath(value) {
  const out = normalizeUrlLike(value);
  if (!out) return true;
  if (out.startsWith("/")) return true;
  return /^https?:\/\//i.test(out) || !/^[a-z][a-z0-9+.-]*:/i.test(out);
}

function deriveViewerPath(scriptUrl) {
  const url = normalizeUrlLike(scriptUrl);
  if (!url) return "";
  const pathPart = url.split(/[?#]/)[0];
  if (!pathPart) return "";
  if (pathPart.startsWith("/")) {
    const idx = pathPart.lastIndexOf("/");
    if (idx < 0) return "/viewer.html";
    return `${pathPart.slice(0, idx + 1)}viewer.html`;
  }
  if (/^https?:\/\//i.test(pathPart)) {
    try {
      const u = new URL(pathPart);
      const idx = u.pathname.lastIndexOf("/");
      const dir = idx >= 0 ? u.pathname.slice(0, idx + 1) : "/";
      u.pathname = `${dir}viewer.html`;
      u.search = "";
      u.hash = "";
      return u.toString();
    } catch {
      return "";
    }
  }
  const idx = pathPart.lastIndexOf("/");
  if (idx < 0) return "viewer.html";
  return `${pathPart.slice(0, idx + 1)}viewer.html`;
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function normalizeLocalMirrorRelativePath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const clean = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = clean.split("/").filter(Boolean);
  const out = [];
  for (const part of parts) {
    if (part === "." || part === "..") return "";
    out.push(part);
  }
  return out.join("/");
}

function toMirrorRelativePath(baseDirUrl, absoluteUrl) {
  if (!baseDirUrl || !absoluteUrl) return "";
  if (baseDirUrl.origin !== absoluteUrl.origin) return "";
  const pathname = String(absoluteUrl.pathname || "");
  const basePath = String(baseDirUrl.pathname || "");
  if (pathname.startsWith(basePath)) {
    return normalizeLocalMirrorRelativePath(pathname.slice(basePath.length));
  }
  return normalizeLocalMirrorRelativePath(`__root${pathname}`);
}

function toViewerRef(relativePath) {
  const rel = normalizeLocalMirrorRelativePath(relativePath);
  if (!rel) return "";
  return `./${rel}`;
}

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
  return out;
}

function parseCssRefs(cssText) {
  const out = [];
  const text = String(cssText || "");
  const regex = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
  let match = null;
  while ((match = regex.exec(text))) {
    const ref = String(match[1] || "").trim();
    if (!ref) continue;
    out.push(ref);
  }
  return out;
}

function shouldSkipRef(value) {
  const ref = String(value || "").trim().toLowerCase();
  if (!ref) return true;
  if (ref.startsWith("#")) return true;
  if (ref.startsWith("data:")) return true;
  if (ref.startsWith("javascript:")) return true;
  if (ref.startsWith("mailto:")) return true;
  return false;
}

function mergeUniqueList(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const raw of list || []) {
      const value = String(raw || "").trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

function buildCustomEmbedHtml({ profile, assetPublicFileUrl, title, embedOptions }) {
  const scriptSources = [normalizeUrlLike(profile?.scriptUrl), normalizeUrlLike(profile?.fallbackScriptUrl)]
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
  const viewerPath = normalizeUrlLike(profile?.viewerPath) || deriveViewerPath(profile?.scriptUrl) || "viewer.html";
  const constructorName = String(profile?.constructorName || "ElectricFieldApp").trim() || "ElectricFieldApp";
  const assetUrlOptionKey = String(profile?.assetUrlOptionKey || "sceneUrl").trim() || "sceneUrl";
  const defaults = normalizeJsonObject(profile?.defaultOptions) || {};
  const overrides = normalizeJsonObject(embedOptions) || {};
  const runtimeOptions = {
    ...defaults,
    ...overrides,
  };
  if (assetUrlOptionKey && (runtimeOptions[assetUrlOptionKey] === undefined || runtimeOptions[assetUrlOptionKey] === "")) {
    runtimeOptions[assetUrlOptionKey] = assetPublicFileUrl;
  }
  if (runtimeOptions.viewerPath === undefined || runtimeOptions.viewerPath === "") {
    runtimeOptions.viewerPath = viewerPath;
  }

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${String(title || "演示")}</title>
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #f8fafc; }
      #embed-host { width: 100%; height: 100%; }
      .embed-error { min-height: 100%; display: grid; place-content: center; gap: 10px; text-align: center; color: #475569; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .embed-error a { color: #0f172a; }
    </style>
  </head>
  <body>
    <div id="embed-host"></div>
    <script>
      (function () {
        var hostId = "embed-host";
        var ctorName = ${JSON.stringify(constructorName)};
        var scriptSources = ${JSON.stringify(scriptSources)};
        var options = ${JSON.stringify(runtimeOptions)};
        var assetFileUrl = ${JSON.stringify(String(assetPublicFileUrl || ""))};
        var errorText = "演示资源加载失败，请稍后重试或下载原文件。";

        function renderFailure(detail) {
          var host = document.getElementById(hostId);
          if (!host) return;
          host.innerHTML = "";
          host.className = "embed-error";
          var text = document.createElement("div");
          text.textContent = detail || errorText;
          host.appendChild(text);
          if (assetFileUrl) {
            var link = document.createElement("a");
            link.href = assetFileUrl;
            link.textContent = "下载源文件";
            link.setAttribute("download", "");
            host.appendChild(link);
          }
        }

        function loadScript(url) {
          return new Promise(function (resolve, reject) {
            if (!url) return reject(new Error("missing_script_url"));
            var script = document.createElement("script");
            script.async = true;
            script.src = url;
            script.onload = function () { resolve(); };
            script.onerror = function () { reject(new Error("script_load_failed")); };
            document.head.appendChild(script);
          });
        }

        function resolveCtor(globalObject, name) {
          if (!name) return null;
          if (Object.prototype.hasOwnProperty.call(globalObject, name)) return globalObject[name];
          var parts = String(name).split(".").filter(Boolean);
          var cursor = globalObject;
          for (var i = 0; i < parts.length; i += 1) {
            if (!cursor) return null;
            cursor = cursor[parts[i]];
          }
          return cursor || null;
        }

        function injectApp() {
          var Ctor = resolveCtor(window, ctorName);
          if (typeof Ctor !== "function") throw new Error("constructor_not_found");
          var app = new Ctor(options);
          if (!app || typeof app.inject !== "function") throw new Error("inject_not_supported");
          app.inject("#" + hostId);
        }

        function trySource(index) {
          if (index >= scriptSources.length) {
            renderFailure();
            return;
          }
          loadScript(scriptSources[index])
            .then(function () {
              injectApp();
            })
            .catch(function () {
              trySource(index + 1);
            });
        }

        window.addEventListener("load", function () {
          try {
            if (scriptSources.length === 0) {
              injectApp();
              return;
            }
            trySource(0);
          } catch {
            renderFailure();
          }
        });
      }());
    </script>
  </body>
</html>
`;
}

function createLibraryService({ store, deps = {} }) {
  if (!store || typeof store.readBuffer !== "function" || typeof store.writeBuffer !== "function") {
    throw new TypeError("createLibraryService requires a valid store");
  }

  const loadLibraryFoldersState = deps.loadLibraryFoldersState || defaultLoadLibraryFoldersState;
  const mutateLibraryFoldersState = deps.mutateLibraryFoldersState || defaultMutateLibraryFoldersState;
  const loadLibraryAssetsState = deps.loadLibraryAssetsState || defaultLoadLibraryAssetsState;
  const mutateLibraryAssetsState = deps.mutateLibraryAssetsState || defaultMutateLibraryAssetsState;
  const loadLibraryEmbedProfilesState = deps.loadLibraryEmbedProfilesState || defaultLoadLibraryEmbedProfilesState;
  const mutateLibraryEmbedProfilesState = deps.mutateLibraryEmbedProfilesState || defaultMutateLibraryEmbedProfilesState;
  const adapterRegistry = deps.adapterRegistry || createDefaultLibraryAdapterRegistry();
  const fetcher = deps.fetcher || (typeof fetch === "function" ? fetch.bind(globalThis) : null);

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

  async function listEmbedProfiles() {
    const state = await loadLibraryEmbedProfilesState({ store });
    const profiles = Array.isArray(state?.profiles) ? state.profiles : [];
    return profiles.slice();
  }

  async function getEmbedProfileById({ profileId }) {
    const id = String(profileId || "").trim();
    if (!id) return null;
    const profiles = await listEmbedProfiles();
    return profiles.find((profile) => profile.id === id) || null;
  }

  async function createEmbedProfile({
    name,
    scriptUrl,
    fallbackScriptUrl,
    viewerPath,
    constructorName,
    assetUrlOptionKey,
    matchExtensions,
    defaultOptions,
    enabled,
  } = {}) {
    const cleanName = String(name || "").trim();
    if (!cleanName) return { status: 400, error: "invalid_profile_name" };
    const cleanScriptUrl = normalizeUrlLike(scriptUrl);
    if (!isAllowedScriptUrl(cleanScriptUrl)) return { status: 400, error: "invalid_profile_script_url" };
    const cleanFallbackScriptUrl = normalizeUrlLike(fallbackScriptUrl);
    if (cleanFallbackScriptUrl && !isAllowedScriptUrl(cleanFallbackScriptUrl)) {
      return { status: 400, error: "invalid_profile_fallback_script_url" };
    }
    const cleanViewerPath = normalizeUrlLike(viewerPath) || deriveViewerPath(cleanScriptUrl) || "viewer.html";
    if (!isAllowedViewerPath(cleanViewerPath)) return { status: 400, error: "invalid_profile_viewer_path" };
    const cleanConstructorName = String(constructorName || "ElectricFieldApp").trim() || "ElectricFieldApp";
    if (!/^[a-z_$][a-z0-9_$.]{0,120}$/i.test(cleanConstructorName)) {
      return { status: 400, error: "invalid_profile_constructor_name" };
    }
    const cleanAssetUrlOptionKey = String(assetUrlOptionKey || "sceneUrl").trim() || "sceneUrl";
    if (!/^[a-z_$][a-z0-9_$]{0,120}$/i.test(cleanAssetUrlOptionKey)) {
      return { status: 400, error: "invalid_profile_asset_option_key" };
    }
    const cleanDefaultOptions = normalizeJsonObject(defaultOptions);
    if (cleanDefaultOptions === null) return { status: 400, error: "invalid_profile_default_options" };
    const cleanExtensions = normalizeExtensionList(matchExtensions);
    const cleanEnabled = normalizeBoolean(enabled, true);

    const now = new Date().toISOString();
    const profile = {
      id: `ep_${crypto.randomUUID()}`,
      name: cleanName,
      scriptUrl: cleanScriptUrl,
      fallbackScriptUrl: cleanFallbackScriptUrl,
      viewerPath: cleanViewerPath,
      remoteScriptUrl: cleanScriptUrl,
      remoteViewerPath: cleanViewerPath,
      syncMode: "local_mirror",
      syncStatus: "pending",
      syncMessage: "",
      lastSyncAt: "",
      constructorName: cleanConstructorName,
      assetUrlOptionKey: cleanAssetUrlOptionKey,
      matchExtensions: cleanExtensions,
      defaultOptions: cleanDefaultOptions,
      enabled: cleanEnabled,
      createdAt: now,
      updatedAt: now,
    };
    let syncedProfile = profile;
    if (isHttpUrl(profile.remoteScriptUrl) && isHttpUrl(profile.remoteViewerPath)) {
      const mirrored = await mirrorEmbedProfileResources(profile).catch((error) => ({
        ok: false,
        message: error && error.message ? String(error.message) : "sync_failed",
      }));
      syncedProfile = {
        ...profile,
        syncStatus: mirrored.ok ? "ok" : "failed",
        syncMessage: mirrored.ok ? (mirrored.message || "sync_ok") : (mirrored.message || "sync_failed"),
        lastSyncAt: now,
        scriptUrl: mirrored.ok ? mirrored.scriptUrl : profile.scriptUrl,
        viewerPath: mirrored.ok ? mirrored.viewerPath : profile.viewerPath,
      };
    } else {
      syncedProfile = {
        ...profile,
        syncStatus: "ok",
        syncMessage: "local_source",
        lastSyncAt: now,
      };
    }

    await mutateLibraryEmbedProfilesState({ store }, (state) => {
      state.profiles.push(syncedProfile);
    });

    return { ok: true, profile: syncedProfile };
  }

  async function updateEmbedProfile({
    profileId,
    name,
    scriptUrl,
    fallbackScriptUrl,
    viewerPath,
    constructorName,
    assetUrlOptionKey,
    matchExtensions,
    defaultOptions,
    enabled,
  } = {}) {
    const profile = await getEmbedProfileById({ profileId });
    if (!profile) return { status: 404, error: "embed_profile_not_found" };
    let requiresResync = false;

    if (name !== undefined) {
      const cleanName = String(name || "").trim();
      if (!cleanName) return { status: 400, error: "invalid_profile_name" };
      profile.name = cleanName;
    }
    if (scriptUrl !== undefined) {
      const cleanScriptUrl = normalizeUrlLike(scriptUrl);
      if (!isAllowedScriptUrl(cleanScriptUrl)) return { status: 400, error: "invalid_profile_script_url" };
      profile.remoteScriptUrl = cleanScriptUrl;
      profile.scriptUrl = cleanScriptUrl;
      requiresResync = true;
      if (!profile.viewerPath) {
        profile.viewerPath = deriveViewerPath(cleanScriptUrl) || "viewer.html";
      }
    }
    if (fallbackScriptUrl !== undefined) {
      const cleanFallbackScriptUrl = normalizeUrlLike(fallbackScriptUrl);
      if (cleanFallbackScriptUrl && !isAllowedScriptUrl(cleanFallbackScriptUrl)) {
        return { status: 400, error: "invalid_profile_fallback_script_url" };
      }
      profile.fallbackScriptUrl = cleanFallbackScriptUrl;
    }
    if (viewerPath !== undefined) {
      const cleanViewerPath = normalizeUrlLike(viewerPath);
      if (!isAllowedViewerPath(cleanViewerPath)) return { status: 400, error: "invalid_profile_viewer_path" };
      profile.remoteViewerPath = cleanViewerPath;
      profile.viewerPath = cleanViewerPath;
      requiresResync = true;
    }
    if (constructorName !== undefined) {
      const cleanConstructorName = String(constructorName || "").trim() || "ElectricFieldApp";
      if (!/^[a-z_$][a-z0-9_$.]{0,120}$/i.test(cleanConstructorName)) {
        return { status: 400, error: "invalid_profile_constructor_name" };
      }
      profile.constructorName = cleanConstructorName;
    }
    if (assetUrlOptionKey !== undefined) {
      const cleanAssetUrlOptionKey = String(assetUrlOptionKey || "").trim() || "sceneUrl";
      if (!/^[a-z_$][a-z0-9_$]{0,120}$/i.test(cleanAssetUrlOptionKey)) {
        return { status: 400, error: "invalid_profile_asset_option_key" };
      }
      profile.assetUrlOptionKey = cleanAssetUrlOptionKey;
    }
    if (matchExtensions !== undefined) {
      profile.matchExtensions = normalizeExtensionList(matchExtensions);
    }
    if (defaultOptions !== undefined) {
      const cleanDefaultOptions = normalizeJsonObject(defaultOptions);
      if (cleanDefaultOptions === null) return { status: 400, error: "invalid_profile_default_options" };
      profile.defaultOptions = cleanDefaultOptions;
    }
    if (enabled !== undefined) {
      profile.enabled = normalizeBoolean(enabled, true);
    }
    if (requiresResync) {
      profile.syncStatus = "pending";
      profile.syncMessage = "needs_manual_sync";
    }

    const now = new Date().toISOString();
    let updated = null;
    await mutateLibraryEmbedProfilesState({ store }, (state) => {
      const target = state.profiles.find((item) => item.id === profile.id);
      if (!target) return;
      Object.assign(target, profile, { updatedAt: now });
      updated = { ...target };
    });
    if (!updated) return { status: 404, error: "embed_profile_not_found" };
    return { ok: true, profile: updated };
  }

  async function deleteEmbedProfile({ profileId }) {
    const profile = await getEmbedProfileById({ profileId });
    if (!profile) return { status: 404, error: "embed_profile_not_found" };

    const assetsState = await loadLibraryAssetsState({ store });
    const assets = Array.isArray(assetsState?.assets) ? assetsState.assets : [];
    if (assets.some((asset) => asset.deleted !== true && String(asset.embedProfileId || "") === profile.id)) {
      return { status: 409, error: "embed_profile_in_use" };
    }

    await mutateLibraryEmbedProfilesState({ store }, (state) => {
      state.profiles = state.profiles.filter((item) => item.id !== profile.id);
    });
    await store.deletePath(`library/vendor/embed-profiles/${profile.id}`, { recursive: true }).catch(() => {});
    return { ok: true };
  }

  async function writeViewerHtml({ assetId, html }) {
    if (typeof html !== "string" || !html.trim()) {
      return { status: 500, error: "adapter_render_failed" };
    }
    const viewerKey = `library/assets/${assetId}/viewer/index.html`;
    await store.writeBuffer(viewerKey, Buffer.from(html, "utf8"), {
      contentType: "text/html; charset=utf-8",
    });
    return {
      ok: true,
      generatedEntryPath: toPublicPath(viewerKey),
    };
  }

  async function generateViewerFromAssetMeta({ assetId, assetPublicFileUrl, fileName, adapterKey, embedProfileId, embedOptions }) {
    const profileId = String(embedProfileId || "").trim();
    if (profileId) {
      const profile = await getEmbedProfileById({ profileId });
      if (!profile || profile.enabled === false) return { status: 404, error: "embed_profile_not_found" };
      const html = buildCustomEmbedHtml({
        profile,
        assetPublicFileUrl,
        title: fileName,
        embedOptions,
      });
      return writeViewerHtml({ assetId, html });
    }

    const adapter = adapterRegistry.getByKey(adapterKey) || adapterRegistry.findForFile({ fileName });
    if (!adapter) return { status: 400, error: "unsupported_asset_type" };
    const viewer = await adapter.buildViewer({
      openMode: "embed",
      assetPublicFileUrl,
      title: fileName,
    });
    if (!viewer || viewer.generated !== true || typeof viewer.html !== "string" || !viewer.html.trim()) {
      return { status: 500, error: "adapter_render_failed" };
    }
    return writeViewerHtml({ assetId, html: viewer.html });
  }

  async function listFolders() {
    const state = await loadLibraryFoldersState({ store });
    const folders = Array.isArray(state?.folders) ? state.folders : [];
    return folders.slice();
  }

  async function getFolderById({ folderId, withAssetCount = false } = {}) {
    const id = String(folderId || "");
    if (!id) return null;
    const folders = await listFolders();
    const folder = folders.find((item) => item.id === id);
    if (!folder) return null;
    if (!withAssetCount) return folder;

    const assetsState = await loadLibraryAssetsState({ store });
    const assets = Array.isArray(assetsState?.assets) ? assetsState.assets : [];
    let assetCount = 0;
    for (const asset of assets) {
      if (asset.deleted === true) continue;
      if (String(asset.folderId || "") !== id) continue;
      assetCount += 1;
    }

    return {
      ...folder,
      assetCount,
    };
  }

  async function createFolder({ name, categoryId, coverType } = {}) {
    const now = new Date().toISOString();
    const folder = {
      id: `f_${crypto.randomUUID()}`,
      name: String(name || "").trim(),
      categoryId: normalizeCategoryId(categoryId),
      coverType: coverType === "image" ? "image" : "blank",
      coverPath: "",
      parentId: null,
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    await mutateLibraryFoldersState({ store }, (state) => {
      state.folders.push(folder);
    });

    return folder;
  }

  async function updateFolder({ folderId, name, categoryId } = {}) {
    const folder = await getFolderById({ folderId });
    if (!folder) return { status: 404, error: "folder_not_found" };

    const nameInputProvided = name !== undefined;
    const categoryInputProvided = categoryId !== undefined;
    const nextName = nameInputProvided ? String(name || "").trim() : folder.name;
    if (nameInputProvided && !nextName) return { status: 400, error: "invalid_folder_name" };
    const nextCategoryId = categoryInputProvided ? normalizeCategoryId(categoryId) : folder.categoryId;
    const now = new Date().toISOString();

    let updatedFolder = null;
    await mutateLibraryFoldersState({ store }, (state) => {
      const target = state.folders.find((item) => item.id === folder.id);
      if (!target) return;
      target.name = nextName;
      target.categoryId = nextCategoryId;
      target.updatedAt = now;
      updatedFolder = { ...target };
    });

    if (!updatedFolder) return { status: 404, error: "folder_not_found" };
    return { ok: true, folder: updatedFolder };
  }

  async function uploadFolderCover({ folderId, fileBuffer, originalName, mimeType }) {
    const folder = await getFolderById({ folderId });
    if (!folder) return { status: 404, error: "folder_not_found" };
    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) return { status: 400, error: "missing_file" };

    const mime = String(mimeType || "").toLowerCase();
    if (!mime.startsWith("image/")) return { status: 400, error: "cover_invalid_type" };

    const extByName = path.extname(String(originalName || "")).toLowerCase();
    const ext = extByName || IMAGE_EXT_BY_MIME.get(mime) || "";
    if (!ext) return { status: 400, error: "cover_invalid_type" };

    const key = `library/covers/${folder.id}${ext}`;
    await store.writeBuffer(key, fileBuffer, { contentType: mime || undefined });
    const now = new Date().toISOString();
    const coverPath = toPublicPath(key);

    await mutateLibraryFoldersState({ store }, (state) => {
      const target = state.folders.find((item) => item.id === folder.id);
      if (!target) return;
      target.coverType = "image";
      target.coverPath = coverPath;
      target.updatedAt = now;
    });

    return {
      ok: true,
      coverPath,
    };
  }

  async function listFolderAssets({ folderId, includeDeleted = false, deletedOnly = false } = {}) {
    const id = String(folderId || "");
    const state = await loadLibraryAssetsState({ store });
    const all = Array.isArray(state?.assets) ? state.assets : [];
    return all.filter((item) => {
      if (String(item.folderId || "") !== id) return false;
      const isDeleted = item.deleted === true;
      if (deletedOnly) return isDeleted;
      if (!includeDeleted && isDeleted) return false;
      return true;
    });
  }

  async function getAssetById({ assetId, includeDeleted = false } = {}) {
    const id = String(assetId || "");
    if (!id) return null;
    const state = await loadLibraryAssetsState({ store });
    const all = Array.isArray(state?.assets) ? state.assets : [];
    const found = all.find((item) => item.id === id) || null;
    if (!found) return null;
    if (!includeDeleted && found.deleted === true) return null;
    return found;
  }

  async function listDeletedAssets({ folderId } = {}) {
    const folder = String(folderId || "").trim();
    const state = await loadLibraryAssetsState({ store });
    const all = Array.isArray(state?.assets) ? state.assets : [];
    return all.filter((item) => {
      if (item.deleted !== true) return false;
      if (!folder) return true;
      return String(item.folderId || "") === folder;
    });
  }

  async function uploadAsset({ folderId, fileBuffer, originalName, openMode, displayName, embedProfileId, embedOptions }) {
    const folder = await getFolderById({ folderId });
    if (!folder) return { status: 404, error: "folder_not_found" };
    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) return { status: 400, error: "missing_file" };

    const mode = normalizeOpenMode(openMode);
    if (!mode) return { status: 400, error: "invalid_open_mode" };
    const normalizedEmbedOptions = normalizeJsonObject(embedOptions);
    if (normalizedEmbedOptions === null) return { status: 400, error: "invalid_embed_options" };

    const safeName = sanitizeFileName(originalName, "asset.ggb");
    const profileId = String(embedProfileId || "").trim();
    let selectedProfile = null;
    let adapter = null;
    if (profileId) {
      selectedProfile = await getEmbedProfileById({ profileId });
      if (!selectedProfile || selectedProfile.enabled === false) return { status: 400, error: "embed_profile_not_found" };
      const ext = path.extname(safeName).replace(/^\./, "").toLowerCase();
      if (Array.isArray(selectedProfile.matchExtensions) && selectedProfile.matchExtensions.length > 0) {
        if (!selectedProfile.matchExtensions.includes(ext)) {
          return { status: 400, error: "embed_profile_extension_mismatch" };
        }
      }
    } else {
      adapter = adapterRegistry.findForFile({ fileName: safeName, fileBuffer });
      if (!adapter) return { status: 400, error: "unsupported_asset_type" };
    }

    const now = new Date().toISOString();
    const assetId = `a_${crypto.randomUUID()}`;
    const sourceKey = `library/assets/${assetId}/source/${safeName}`;
    const sourcePublicPath = toPublicPath(sourceKey);
    let generatedEntryPath = "";

    await store.writeBuffer(sourceKey, fileBuffer, { contentType: "application/octet-stream" });

    if (mode === "embed") {
      try {
        const renderResult = await generateViewerFromAssetMeta({
          assetId,
          assetPublicFileUrl: `/${sourcePublicPath}`,
          fileName: safeName,
          adapterKey: adapter?.key || "",
          embedProfileId: selectedProfile?.id || "",
          embedOptions: normalizedEmbedOptions,
        });
        if (renderResult?.error) {
          await store.deletePath(`library/assets/${assetId}`, { recursive: true }).catch(() => {});
          return renderResult;
        }
        generatedEntryPath = renderResult.generatedEntryPath;
      } catch {
        await store.deletePath(`library/assets/${assetId}`, { recursive: true }).catch(() => {});
        return { status: 500, error: "adapter_render_failed" };
      }
    }

    const asset = {
      id: assetId,
      folderId: folder.id,
      adapterKey: adapter ? adapter.key : `embed:${selectedProfile.id}`,
      displayName: String(displayName || "").trim(),
      fileName: safeName,
      filePath: sourcePublicPath,
      fileSize: fileBuffer.length,
      openMode: mode,
      generatedEntryPath,
      embedProfileId: selectedProfile?.id || "",
      embedOptions: normalizedEmbedOptions,
      status: "ready",
      deleted: false,
      deletedAt: "",
      createdAt: now,
      updatedAt: now,
    };

    await mutateLibraryAssetsState({ store }, (state) => {
      state.assets.push(asset);
    });

    return { ok: true, asset };
  }

  async function updateAsset({ assetId, displayName, openMode, folderId, embedProfileId, embedOptions }) {
    const asset = await getAssetById({ assetId });
    if (!asset) return { status: 404, error: "asset_not_found" };

    const openModeInputProvided = openMode !== undefined;
    const normalizedOpenMode = openModeInputProvided ? normalizeOpenMode(openMode) : "";
    if (openModeInputProvided && !normalizedOpenMode) return { status: 400, error: "invalid_open_mode" };

    const displayNameInputProvided = displayName !== undefined;
    const folderInputProvided = folderId !== undefined;
    const embedProfileInputProvided = embedProfileId !== undefined;
    const embedOptionsInputProvided = embedOptions !== undefined;
    const now = new Date().toISOString();
    const nextDisplayName = displayNameInputProvided ? String(displayName || "").trim() : asset.displayName;
    let nextFolderId = asset.folderId;
    let nextAdapterKey = asset.adapterKey || "";
    let nextEmbedProfileId = asset.embedProfileId || "";
    let nextEmbedOptions = normalizeJsonObject(asset.embedOptions) || {};
    let nextOpenMode = asset.openMode;
    let nextGeneratedEntryPath = asset.generatedEntryPath || "";

    if (folderInputProvided) {
      const nextFolder = await getFolderById({ folderId: String(folderId || "") });
      if (!nextFolder) return { status: 404, error: "folder_not_found" };
      nextFolderId = nextFolder.id;
    }
    if (embedProfileInputProvided) {
      const profileId = String(embedProfileId || "").trim();
      if (profileId) {
        const profile = await getEmbedProfileById({ profileId });
        if (!profile || profile.enabled === false) return { status: 400, error: "embed_profile_not_found" };
        const ext = path.extname(String(asset.fileName || "")).replace(/^\./, "").toLowerCase();
        if (Array.isArray(profile.matchExtensions) && profile.matchExtensions.length > 0) {
          if (!profile.matchExtensions.includes(ext)) {
            return { status: 400, error: "embed_profile_extension_mismatch" };
          }
        }
        nextEmbedProfileId = profile.id;
        nextAdapterKey = `embed:${profile.id}`;
      } else {
        const adapter = adapterRegistry.findForFile({ fileName: asset.fileName });
        if (!adapter) return { status: 400, error: "unsupported_asset_type" };
        nextEmbedProfileId = "";
        nextAdapterKey = adapter.key;
      }
    }
    if (embedOptionsInputProvided) {
      const normalizedEmbedOptions = normalizeJsonObject(embedOptions);
      if (normalizedEmbedOptions === null) return { status: 400, error: "invalid_embed_options" };
      nextEmbedOptions = normalizedEmbedOptions;
    }

    if (openModeInputProvided) {
      nextOpenMode = normalizedOpenMode;
      if (normalizedOpenMode === "download") {
        nextGeneratedEntryPath = "";
      }
    }

    const shouldRegenerateViewer =
      nextOpenMode === "embed" &&
      (!nextGeneratedEntryPath ||
        (openModeInputProvided && asset.openMode !== "embed") ||
        (embedProfileInputProvided && nextEmbedProfileId !== (asset.embedProfileId || "")) ||
        (embedOptionsInputProvided && JSON.stringify(nextEmbedOptions) !== JSON.stringify(normalizeJsonObject(asset.embedOptions) || {})) ||
        (embedProfileInputProvided && nextAdapterKey !== (asset.adapterKey || "")));
    if (shouldRegenerateViewer) {
      try {
        const renderResult = await generateViewerFromAssetMeta({
          assetId: asset.id,
          assetPublicFileUrl: `/${String(asset.filePath || "").replace(/^\/+/, "")}`,
          fileName: asset.fileName,
          adapterKey: nextAdapterKey,
          embedProfileId: nextEmbedProfileId,
          embedOptions: nextEmbedOptions,
        });
        if (renderResult?.error) return renderResult;
        nextGeneratedEntryPath = renderResult.generatedEntryPath;
      } catch {
        return { status: 500, error: "adapter_render_failed" };
      }
    }

    let updatedAsset = null;
    await mutateLibraryAssetsState({ store }, (state) => {
      const target = state.assets.find((item) => item.id === asset.id);
      if (!target) return;
      if (displayNameInputProvided) target.displayName = nextDisplayName;
      target.folderId = nextFolderId;
      target.adapterKey = nextAdapterKey;
      target.embedProfileId = nextEmbedProfileId;
      target.embedOptions = nextEmbedOptions;
      target.openMode = nextOpenMode;
      target.generatedEntryPath = nextGeneratedEntryPath;
      target.updatedAt = now;
      updatedAsset = { ...target };
    });

    if (!updatedAsset) return { status: 404, error: "asset_not_found" };
    return { ok: true, asset: updatedAsset };
  }

  async function getAssetOpenInfo({ assetId }) {
    const asset = await getAssetById({ assetId });
    if (!asset) return { status: 404, error: "asset_not_found" };

    const mode = asset.openMode === "embed" && asset.generatedEntryPath ? "embed" : "download";
    const openPath = mode === "embed" ? asset.generatedEntryPath : asset.filePath;
    const openUrl = `/${String(openPath || "").replace(/^\/+/, "")}`;
    const downloadUrl = `/${String(asset.filePath || "").replace(/^\/+/, "")}`;

    return {
      ok: true,
      asset,
      mode,
      openUrl,
      downloadUrl,
    };
  }

  async function deleteAsset({ assetId }) {
    const asset = await getAssetById({ assetId, includeDeleted: true });
    if (!asset) return { status: 404, error: "asset_not_found" };
    if (asset.deleted === true) return { ok: true, asset };

    const now = new Date().toISOString();
    let deletedAsset = null;
    await mutateLibraryAssetsState({ store }, (state) => {
      const target = state.assets.find((item) => item.id === asset.id);
      if (!target) return;
      target.deleted = true;
      target.deletedAt = now;
      target.updatedAt = now;
      deletedAsset = { ...target };
    });

    if (!deletedAsset) return { status: 404, error: "asset_not_found" };
    return { ok: true, asset: deletedAsset };
  }

  async function deleteAssetPermanently({ assetId }) {
    const asset = await getAssetById({ assetId, includeDeleted: true });
    if (!asset) return { status: 404, error: "asset_not_found" };
    if (asset.deleted !== true) return { status: 409, error: "asset_not_deleted" };

    let removed = null;
    await mutateLibraryAssetsState({ store }, (state) => {
      const index = state.assets.findIndex((item) => item.id === asset.id);
      if (index === -1) return;
      removed = state.assets[index];
      state.assets.splice(index, 1);
    });
    if (!removed) return { status: 404, error: "asset_not_found" };
    await store.deletePath(`library/assets/${asset.id}`, { recursive: true }).catch(() => {});
    return { ok: true, asset: removed, permanent: true };
  }

  async function restoreAsset({ assetId }) {
    const asset = await getAssetById({ assetId, includeDeleted: true });
    if (!asset) return { status: 404, error: "asset_not_found" };
    if (asset.deleted !== true) return { ok: true, asset };

    let nextAdapterKey = String(asset.adapterKey || "");
    let nextEmbedProfileId = String(asset.embedProfileId || "");
    let nextEmbedOptions = normalizeJsonObject(asset.embedOptions) || {};
    let nextOpenMode = asset.openMode === "download" ? "download" : "embed";
    let nextGeneratedEntryPath = String(asset.generatedEntryPath || "");

    if (nextOpenMode === "embed") {
      let shouldRegenerateViewer = !nextGeneratedEntryPath;
      if (nextEmbedProfileId) {
        const profile = await getEmbedProfileById({ profileId: nextEmbedProfileId });
        if (!profile || profile.enabled === false) {
          const fallbackAdapter = adapterRegistry.findForFile({ fileName: String(asset.fileName || "") });
          if (fallbackAdapter) {
            nextAdapterKey = fallbackAdapter.key;
            nextEmbedProfileId = "";
            nextEmbedOptions = {};
            shouldRegenerateViewer = true;
          } else {
            nextAdapterKey = "";
            nextEmbedProfileId = "";
            nextEmbedOptions = {};
            nextOpenMode = "download";
            nextGeneratedEntryPath = "";
            shouldRegenerateViewer = false;
          }
        }
      } else if (!nextAdapterKey) {
        const fallbackAdapter = adapterRegistry.findForFile({ fileName: String(asset.fileName || "") });
        if (fallbackAdapter) {
          nextAdapterKey = fallbackAdapter.key;
          shouldRegenerateViewer = true;
        } else {
          nextOpenMode = "download";
          nextGeneratedEntryPath = "";
          shouldRegenerateViewer = false;
        }
      }

      if (nextOpenMode === "embed" && shouldRegenerateViewer) {
        try {
          const renderResult = await generateViewerFromAssetMeta({
            assetId: asset.id,
            assetPublicFileUrl: `/${String(asset.filePath || "").replace(/^\/+/, "")}`,
            fileName: String(asset.fileName || ""),
            adapterKey: nextAdapterKey,
            embedProfileId: nextEmbedProfileId,
            embedOptions: nextEmbedOptions,
          });
          if (renderResult?.error) {
            nextAdapterKey = "";
            nextEmbedProfileId = "";
            nextEmbedOptions = {};
            nextOpenMode = "download";
            nextGeneratedEntryPath = "";
          } else {
            nextGeneratedEntryPath = renderResult.generatedEntryPath;
          }
        } catch {
          nextAdapterKey = "";
          nextEmbedProfileId = "";
          nextEmbedOptions = {};
          nextOpenMode = "download";
          nextGeneratedEntryPath = "";
        }
      }
    }

    const now = new Date().toISOString();
    let restoredAsset = null;
    await mutateLibraryAssetsState({ store }, (state) => {
      const target = state.assets.find((item) => item.id === asset.id);
      if (!target) return;
      target.adapterKey = nextAdapterKey;
      target.embedProfileId = nextEmbedProfileId;
      target.embedOptions = nextEmbedOptions;
      target.openMode = nextOpenMode;
      target.generatedEntryPath = nextGeneratedEntryPath;
      target.deleted = false;
      target.deletedAt = "";
      target.updatedAt = now;
      restoredAsset = { ...target };
    });

    if (!restoredAsset) return { status: 404, error: "asset_not_found" };
    return { ok: true, asset: restoredAsset };
  }

  async function deleteFolder({ folderId }) {
    const folder = await getFolderById({ folderId });
    if (!folder) return { status: 404, error: "folder_not_found" };

    const assetsState = await loadLibraryAssetsState({ store });
    const allAssets = Array.isArray(assetsState?.assets) ? assetsState.assets : [];
    const folderAssets = allAssets.filter((asset) => String(asset.folderId || "") === folder.id);
    const aliveAssets = folderAssets.filter((asset) => asset.deleted !== true);
    if (aliveAssets.length > 0) return { status: 409, error: "folder_not_empty" };
    const deletedAssets = folderAssets.filter((asset) => asset.deleted === true);
    if (deletedAssets.length > 0) {
      const deletedSet = new Set(deletedAssets.map((item) => item.id));
      await mutateLibraryAssetsState({ store }, (state) => {
        state.assets = state.assets.filter((item) => !deletedSet.has(item.id));
      });
      for (const asset of deletedAssets) {
        await store.deletePath(`library/assets/${asset.id}`, { recursive: true }).catch(() => {});
      }
    }

    await mutateLibraryFoldersState({ store }, (state) => {
      state.folders = state.folders.filter((item) => item.id !== folder.id);
    });

    if (folder.coverPath) {
      const key = toStorageKey(folder.coverPath);
      if (key) await store.deletePath(key).catch(() => {});
    }

    return { ok: true };
  }

  async function getCatalogSummary() {
    const folders = await listFolders();
    const assetsState = await loadLibraryAssetsState({ store });
    const assets = Array.isArray(assetsState?.assets) ? assetsState.assets : [];
    const assetCountByFolder = new Map();
    for (const asset of assets) {
      if (asset.deleted === true) continue;
      const folderId = String(asset.folderId || "");
      assetCountByFolder.set(folderId, (assetCountByFolder.get(folderId) || 0) + 1);
    }

    return folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      categoryId: folder.categoryId,
      coverType: folder.coverType,
      coverPath: folder.coverPath,
      parentId: folder.parentId ?? null,
      order: Number(folder.order || 0),
      assetCount: assetCountByFolder.get(folder.id) || 0,
      updatedAt: folder.updatedAt,
      createdAt: folder.createdAt,
    }));
  }

  return {
    listEmbedProfiles,
    getEmbedProfileById,
    createEmbedProfile,
    updateEmbedProfile,
    syncEmbedProfile,
    deleteEmbedProfile,
    createFolder,
    updateFolder,
    listFolders,
    getFolderById,
    uploadFolderCover,
    uploadAsset,
    listFolderAssets,
    listDeletedAssets,
    getAssetById,
    getAssetOpenInfo,
    updateAsset,
    getCatalogSummary,
    deleteFolder,
    deleteAsset,
    deleteAssetPermanently,
    restoreAsset,
  };
}

module.exports = {
  createLibraryService,
};
