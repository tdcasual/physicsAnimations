function normalizeFileName(fileName) {
  return String(fileName || "").trim();
}

function buildEmbedHtml({ assetPublicFileUrl, title }) {
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
    <script src="https://www.geogebra.org/apps/deployggb.js"></script>
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #f8fafc; }
      .ggb-host { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="ggb-host" class="ggb-host"></div>
    <script>
      (function () {
        var applet = new GGBApplet(${JSON.stringify(appletConfig)}, true);
        window.addEventListener("load", function () {
          applet.inject("ggb-host");
        });
      }());
    </script>
  </body>
</html>
`;
}

function createGeogebraAdapter() {
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
        html: buildEmbedHtml({ assetPublicFileUrl, title }),
      };
    },
  };
}

module.exports = {
  createGeogebraAdapter,
};
