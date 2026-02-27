function normalizeFileName(fileName) {
  return String(fileName || "").trim();
}

const DEFAULT_SELF_HOST_SCRIPT_URL = "/content/library/vendor/geogebra/current/deployggb.js";
const DEFAULT_SELF_HOST_HTML5_CODEBASE = "/content/library/vendor/geogebra/current/web3d/";
const DEFAULT_ONLINE_FALLBACK_SCRIPT_URL = "https://www.geogebra.org/apps/deployggb.js";

function normalizeUrl(value) {
  const out = String(value || "").trim();
  return out || "";
}

function ensureTrailingSlash(value) {
  const out = normalizeUrl(value);
  if (!out) return "";
  return out.endsWith("/") ? out : `${out}/`;
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === "1" || raw === "true" || raw === "yes" || raw === "on") return true;
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") return false;
  return fallback;
}

function dedupeSources(sources) {
  const seen = new Set();
  const out = [];
  for (const source of sources) {
    if (!source || !source.scriptUrl) continue;
    if (seen.has(source.scriptUrl)) continue;
    seen.add(source.scriptUrl);
    out.push(source);
  }
  return out;
}

function buildScriptSources(options = {}) {
  const selfHostedScriptUrl = normalizeUrl(
    options.selfHostedScriptUrl ?? process.env.LIBRARY_GGB_SELF_HOST_SCRIPT_URL ?? DEFAULT_SELF_HOST_SCRIPT_URL,
  );
  const selfHostedHtml5Codebase = ensureTrailingSlash(
    options.selfHostedHtml5Codebase
      ?? process.env.LIBRARY_GGB_SELF_HOST_HTML5_CODEBASE_URL
      ?? DEFAULT_SELF_HOST_HTML5_CODEBASE,
  );
  const onlineFallbackScriptUrl = normalizeUrl(
    options.onlineFallbackScriptUrl
      ?? process.env.LIBRARY_GGB_ONLINE_FALLBACK_SCRIPT_URL
      ?? DEFAULT_ONLINE_FALLBACK_SCRIPT_URL,
  );
  const onlineFallbackHtml5Codebase = ensureTrailingSlash(
    options.onlineFallbackHtml5Codebase ?? process.env.LIBRARY_GGB_ONLINE_FALLBACK_HTML5_CODEBASE_URL ?? "",
  );
  const enableOnlineFallback = normalizeBoolean(
    options.enableOnlineFallback ?? process.env.LIBRARY_GGB_ENABLE_ONLINE_FALLBACK,
    true,
  );

  const sources = [];
  if (selfHostedScriptUrl) {
    sources.push({
      scriptUrl: selfHostedScriptUrl,
      html5Codebase: selfHostedHtml5Codebase,
      preflightUrl: selfHostedHtml5Codebase ? `${selfHostedHtml5Codebase}web3d.nocache.js` : "",
    });
  }
  if (enableOnlineFallback && onlineFallbackScriptUrl) {
    sources.push({
      scriptUrl: onlineFallbackScriptUrl,
      html5Codebase: onlineFallbackHtml5Codebase,
      preflightUrl: "",
    });
  }

  return dedupeSources(sources);
}

function buildEmbedHtml({ assetPublicFileUrl, title, scriptSources }) {
  const appletConfig = {
    appName: "classic",
    filename: String(assetPublicFileUrl || ""),
    showToolBar: true,
    showAlgebraInput: true,
    showMenuBar: true,
    scaleContainerClass: "ggb-host",
  };

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${String(title || "GeoGebra")}</title>
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #f8fafc; }
      .ggb-host { width: 100%; height: 100%; }
      .ggb-error { display: grid; place-content: center; gap: 8px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; text-align: center; }
      .ggb-error a { color: #0f172a; }
    </style>
  </head>
  <body>
    <div id="ggb-host" class="ggb-host"></div>
    <script>
      (function () {
        var appletConfig = ${JSON.stringify(appletConfig)};
        var scriptSources = ${JSON.stringify(scriptSources || [])};
        var hostId = "ggb-host";
        var errorText = "GeoGebra 资源加载失败，请稍后重试或下载原文件。";
        var assetFileUrl = ${JSON.stringify(String(assetPublicFileUrl || ""))};

        function renderFailure() {
          var host = document.getElementById(hostId);
          if (!host) return;
          host.innerHTML = "";
          host.className = "ggb-host ggb-error";
          var text = document.createElement("div");
          text.textContent = errorText;
          host.appendChild(text);
          if (assetFileUrl) {
            var link = document.createElement("a");
            link.href = assetFileUrl;
            link.textContent = "下载 .ggb 文件";
            link.setAttribute("download", "");
            host.appendChild(link);
          }
        }

        function checkSourceReady(source) {
          if (!source || !source.preflightUrl || typeof fetch !== "function") return Promise.resolve(true);
          return fetch(source.preflightUrl, { method: "HEAD", cache: "no-store" })
            .then(function (res) { return !!(res && res.ok); })
            .catch(function () { return false; });
        }

        function loadScriptSource(source) {
          return new Promise(function (resolve, reject) {
            if (!source || !source.scriptUrl) {
              reject(new Error("missing_script_url"));
              return;
            }
            var script = document.createElement("script");
            script.async = true;
            script.src = source.scriptUrl;
            script.onload = function () { resolve(); };
            script.onerror = function () { reject(new Error("script_load_failed")); };
            document.head.appendChild(script);
          });
        }

        function injectApplet(source) {
          var applet = new GGBApplet(appletConfig, true);
          if (source && source.html5Codebase && typeof applet.setHTML5Codebase === "function") {
            applet.setHTML5Codebase(source.html5Codebase);
          }
          applet.inject(hostId);
        }

        function trySource(index) {
          if (index >= scriptSources.length) {
            renderFailure();
            return;
          }
          var source = scriptSources[index];
          checkSourceReady(source)
            .then(function (ready) {
              if (!ready) return Promise.reject(new Error("source_not_ready"));
              return loadScriptSource(source).then(function () {
                injectApplet(source);
              });
            })
            .then(function () {})
            .catch(function () {
              trySource(index + 1);
            });
        }

        window.addEventListener("load", function () {
          trySource(0);
        });
      }());
    </script>
  </body>
</html>
`;
}

function createGeogebraAdapter(options = {}) {
  const scriptSources = buildScriptSources(options);
  return {
    key: "geogebra",
    match({ fileName }) {
      return /\.ggb$/i.test(normalizeFileName(fileName));
    },
    async buildViewer({ openMode, assetPublicFileUrl, title = "GeoGebra 演示" }) {
      if (openMode !== "embed") {
        return {
          generated: false,
          html: "",
        };
      }

      return {
        generated: true,
        html: buildEmbedHtml({ assetPublicFileUrl, title, scriptSources }),
      };
    },
  };
}

module.exports = {
  DEFAULT_SELF_HOST_SCRIPT_URL,
  DEFAULT_SELF_HOST_HTML5_CODEBASE,
  DEFAULT_ONLINE_FALLBACK_SCRIPT_URL,
  createGeogebraAdapter,
  buildScriptSources,
};
