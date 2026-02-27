const { normalizeUrlLike, deriveViewerPath, normalizeJsonObject, toPublicPath } = require("./core/normalizers");

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

function createViewerRenderService({ store, adapterRegistry, getEmbedProfileById }) {
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

  return {
    buildCustomEmbedHtml,
    generateViewerFromAssetMeta,
  };
}

module.exports = {
  buildCustomEmbedHtml,
  createViewerRenderService,
};
