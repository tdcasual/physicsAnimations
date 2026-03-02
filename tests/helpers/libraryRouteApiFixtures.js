const assert = require("node:assert/strict");
const http = require("node:http");
const bcrypt = require("bcryptjs");

async function startMockEmbedServer() {
  const embedJs = `
    (function (global) {
      function ElectricFieldApp(options) { this.options = options || {}; }
      ElectricFieldApp.prototype.inject = function (target) {
        var el = typeof target === "string" ? document.querySelector(target) : target;
        if (!el) return;
        var iframe = document.createElement("iframe");
        var query = new URLSearchParams();
        if (this.options.sceneUrl) query.set("sceneUrl", this.options.sceneUrl);
        iframe.src = (this.options.viewerPath || "viewer.html") + (query.toString() ? ("?" + query.toString()) : "");
        iframe.style.width = "100%";
        iframe.style.height = "480px";
        el.appendChild(iframe);
      };
      global.ElectricFieldApp = ElectricFieldApp;
    })(window);
  `;
  const viewerHtml = `
    <!doctype html>
    <html><head>
      <meta charset="utf-8" />
      <link rel="stylesheet" href="./assets/main.css" />
      <script type="module" src="./assets/main.js"></script>
    </head><body><div id="root"></div></body></html>
  `;
  const mainJs = `import "./chunk.js"; console.log("viewer ready");`;
  const chunkJs = `console.log("chunk loaded");`;
  const mainCss = `#root { min-height: 100vh; }`;

  const server = http.createServer((req, res) => {
    const url = String(req.url || "");
    if (url === "/embed/embed.js") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/javascript");
      res.end(embedJs);
      return;
    }
    if (url === "/embed/viewer.html") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(viewerHtml);
      return;
    }
    if (url === "/embed/assets/main.js") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/javascript");
      res.end(mainJs);
      return;
    }
    if (url === "/embed/assets/chunk.js") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/javascript");
      res.end(chunkJs);
      return;
    }
    if (url === "/embed/assets/main.css") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/css");
      res.end(mainCss);
      return;
    }
    res.statusCode = 404;
    res.end("not found");
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
  };
}

function makeAuthConfig() {
  return {
    adminUsername: "admin",
    adminPasswordHash: bcrypt.hashSync("secret", 10),
    jwtSecret: "test-secret",
    jwtIssuer: "physicsAnimations",
    jwtAudience: "physicsAnimations-web",
    tokenTtlSeconds: 3600,
  };
}

async function login(baseUrl, authConfig) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: authConfig.adminUsername,
      password: "secret",
    }),
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(data?.token);
  return data.token;
}

module.exports = {
  startMockEmbedServer,
  makeAuthConfig,
  login,
};
