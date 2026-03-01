const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { Blob } = require("node:buffer");

const bcrypt = require("bcryptjs");
const { createApp } = require("../server/app");

test("library router composes domain route modules", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "server", "routes", "library.js"), "utf8");
  assert.match(source, /registerCatalogRoutes/);
  assert.match(source, /registerFolderRoutes/);
  assert.match(source, /registerAssetRoutes/);
  assert.match(source, /registerEmbedProfileRoutes/);
});

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-lib-test-"));
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(path.join(root, "animations.json"), "{}");
  return root;
}

async function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

async function stopServer(server) {
  if (!server) return;
  await new Promise((resolve) => { server.close(resolve); });
}

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

  await new Promise((resolve) => { server.listen(0, "127.0.0.1", resolve); });
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

test("library write endpoints require admin auth", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const createFolder = await fetch(`${baseUrl}/api/library/folders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "X", categoryId: "other" }),
    });
    assert.equal(createFolder.status, 401);

    const upload = await fetch(`${baseUrl}/api/library/folders/f_x/assets`, {
      method: "POST",
    });
    assert.equal(upload.status, 401);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("library routes support folder create and ggb upload flow", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const createFolder = await fetch(`${baseUrl}/api/library/folders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "GeoGebra Folder",
        categoryId: "other",
        coverType: "blank",
      }),
    });
    assert.equal(createFolder.status, 200);
    const folderBody = await createFolder.json();
    assert.equal(folderBody?.ok, true);
    assert.ok(folderBody?.folder?.id);

    const form = new FormData();
    form.append("file", new Blob([Buffer.from("GGBDATA")]), "demo.ggb");
    form.append("openMode", "embed");
    form.append("displayName", "斜抛演示");
    const upload = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderBody.folder.id)}/assets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    assert.equal(upload.status, 200);
    const uploadBody = await upload.json();
    assert.equal(uploadBody?.ok, true);
    assert.ok(uploadBody?.asset?.id);
    assert.equal(uploadBody?.asset?.displayName, "斜抛演示");

    const assetInfo = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(uploadBody.asset.id)}`);
    assert.equal(assetInfo.status, 200);
    const infoBody = await assetInfo.json();
    assert.equal(infoBody?.ok, true);
    assert.equal(infoBody?.mode, "embed");
    assert.equal(infoBody?.asset?.displayName, "斜抛演示");
    assert.match(String(infoBody?.openUrl || ""), /\/content\/library\/assets\/.*\/viewer\/index\.html$/);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("library routes support updating asset displayName and openMode", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const createFolder = await fetch(`${baseUrl}/api/library/folders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Rename Folder", categoryId: "other" }),
    });
    const folderBody = await createFolder.json();

    const form = new FormData();
    form.append("file", new Blob([Buffer.from("GGBDATA")]), "rename-demo.ggb");
    form.append("openMode", "download");
    const upload = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderBody.folder.id)}/assets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const uploadBody = await upload.json();

    const renamed = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(uploadBody.asset.id)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ displayName: "重命名资源标题" }),
    });
    assert.equal(renamed.status, 200);
    const renamedBody = await renamed.json();
    assert.equal(renamedBody?.ok, true);
    assert.equal(renamedBody?.asset?.displayName, "重命名资源标题");

    const info = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(uploadBody.asset.id)}`);
    const infoBody = await info.json();
    assert.equal(infoBody?.asset?.displayName, "重命名资源标题");

    const switched = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(uploadBody.asset.id)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ openMode: "embed" }),
    });
    assert.equal(switched.status, 200);
    const switchedBody = await switched.json();
    assert.equal(switchedBody?.ok, true);
    assert.equal(switchedBody?.asset?.openMode, "embed");
    assert.match(String(switchedBody?.asset?.generatedEntryPath || ""), /viewer\/index\.html$/);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("GET /api/library/catalog returns folder summary for public", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const createFolder = await fetch(`${baseUrl}/api/library/folders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Public Folder", categoryId: "other" }),
    });
    assert.equal(createFolder.status, 200);

    const res = await fetch(`${baseUrl}/api/library/catalog`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(Array.isArray(body?.folders), true);
    assert.equal(body.folders.length, 1);
    assert.equal(body.folders[0].name, "Public Folder");
    assert.equal(typeof body.folders[0].assetCount, "number");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("GET /api/library/folders returns assetCount for admin folder list", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const createFolder = await fetch(`${baseUrl}/api/library/folders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Admin Folder", categoryId: "other" }),
    });
    assert.equal(createFolder.status, 200);
    const folderBody = await createFolder.json();
    const folderId = String(folderBody?.folder?.id || "");
    assert.ok(folderId);

    const form = new FormData();
    form.append("file", new Blob([Buffer.from("GGBDATA")]), "count-demo.ggb");
    form.append("openMode", "embed");
    const upload = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderId)}/assets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    assert.equal(upload.status, 200);

    const list = await fetch(`${baseUrl}/api/library/folders`);
    assert.equal(list.status, 200);
    const body = await list.json();
    assert.equal(Array.isArray(body?.folders), true);
    assert.equal(body.folders.length, 1);
    assert.equal(typeof body.folders[0].assetCount, "number");
    assert.equal(body.folders[0].assetCount, 1);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("GET /api/library/folders/:id returns folder with assetCount", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const createFolder = await fetch(`${baseUrl}/api/library/folders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Detail Folder", categoryId: "other" }),
    });
    assert.equal(createFolder.status, 200);
    const folderBody = await createFolder.json();
    const folderId = String(folderBody?.folder?.id || "");
    assert.ok(folderId);

    const form = new FormData();
    form.append("file", new Blob([Buffer.from("GGBDATA")]), "detail-count.ggb");
    form.append("openMode", "embed");
    const upload = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderId)}/assets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    assert.equal(upload.status, 200);

    const detail = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderId)}`);
    assert.equal(detail.status, 200);
    const body = await detail.json();
    assert.equal(body?.folder?.id, folderId);
    assert.equal(typeof body?.folder?.assetCount, "number");
    assert.equal(body?.folder?.assetCount, 1);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("content library route serves uploaded source file", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const createFolder = await fetch(`${baseUrl}/api/library/folders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Folder", categoryId: "other" }),
    });
    const folderBody = await createFolder.json();

    const form = new FormData();
    form.append("file", new Blob([Buffer.from("GGBDATA")]), "download-only.ggb");
    form.append("openMode", "download");
    const upload = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderBody.folder.id)}/assets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const uploadBody = await upload.json();

    const info = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(uploadBody.asset.id)}`);
    const infoBody = await info.json();
    const source = await fetch(`${baseUrl}${infoBody.openUrl}`);
    assert.equal(source.status, 200);
    const text = await source.text();
    assert.equal(text, "GGBDATA");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("library routes support PhET html upload with embed open info", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const createFolder = await fetch(`${baseUrl}/api/library/folders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "PhET Folder", categoryId: "other" }),
    });
    const folderBody = await createFolder.json();

    const phetHtml = `
      <html><head><title>PhET</title></head>
      <body><iframe src="https://phet.colorado.edu/sims/html/projectile-motion/latest/projectile-motion_en.html"></iframe></body>
      </html>`;
    const form = new FormData();
    form.append("file", new Blob([Buffer.from(phetHtml, "utf8")]), "projectile-motion.phet.html");
    form.append("openMode", "embed");
    const upload = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderBody.folder.id)}/assets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    assert.equal(upload.status, 200);
    const uploadBody = await upload.json();
    assert.equal(uploadBody?.asset?.adapterKey, "phet");

    const info = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(uploadBody.asset.id)}`);
    assert.equal(info.status, 200);
    const infoBody = await info.json();
    assert.equal(infoBody?.mode, "embed");
    assert.match(String(infoBody?.openUrl || ""), /\/content\/library\/assets\/.*\/viewer\/index\.html$/);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("library routes support custom embed profile upload with json options", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);
  const mockEmbed = await startMockEmbedServer();

  try {
    const token = await login(baseUrl, authConfig);
    const profileRes = await fetch(`${baseUrl}/api/library/embed-profiles`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "电场仿真",
        scriptUrl: `${mockEmbed.baseUrl}/embed/embed.js`,
        viewerPath: `${mockEmbed.baseUrl}/embed/viewer.html`,
        constructorName: "ElectricFieldApp",
        assetUrlOptionKey: "sceneUrl",
        matchExtensions: ["json"],
        defaultOptions: { mode: "view" },
      }),
    });
    assert.equal(profileRes.status, 200);
    const profileBody = await profileRes.json();
    assert.equal(profileBody?.ok, true);
    assert.ok(profileBody?.profile?.id);
    assert.equal(profileBody?.profile?.syncStatus, "ok");
    assert.match(String(profileBody?.profile?.scriptUrl || ""), /\/content\/library\/vendor\/embed-profiles\//);

    const syncRes = await fetch(
      `${baseUrl}/api/library/embed-profiles/${encodeURIComponent(profileBody.profile.id)}/sync`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    assert.equal(syncRes.status, 200);
    const syncBody = await syncRes.json();
    assert.equal(syncBody?.ok, true);
    assert.equal(syncBody?.profile?.syncStatus, "ok");

    const createFolder = await fetch(`${baseUrl}/api/library/folders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Custom Embed Folder", categoryId: "other" }),
    });
    const folderBody = await createFolder.json();

    const sceneJson = JSON.stringify({ scene: "demo" });
    const form = new FormData();
    form.append("file", new Blob([Buffer.from(sceneJson, "utf8")]), "field-scene.json");
    form.append("openMode", "embed");
    form.append("embedProfileId", String(profileBody.profile.id));
    form.append("embedOptionsJson", JSON.stringify({ materialId: "M-1", autoplay: true }));
    const upload = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderBody.folder.id)}/assets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    assert.equal(upload.status, 200);
    const uploadBody = await upload.json();
    assert.equal(uploadBody?.asset?.embedProfileId, profileBody.profile.id);
    assert.equal(uploadBody?.asset?.adapterKey, `embed:${profileBody.profile.id}`);

    const info = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(uploadBody.asset.id)}`);
    const infoBody = await info.json();
    assert.equal(infoBody?.mode, "embed");
    assert.match(String(infoBody?.openUrl || ""), /\/content\/library\/assets\/.*\/viewer\/index\.html$/);

    const viewerRes = await fetch(`${baseUrl}${infoBody.openUrl}`);
    assert.equal(viewerRes.status, 200);
    const viewerHtml = await viewerRes.text();
    assert.match(viewerHtml, /ElectricFieldApp/);
    assert.match(viewerHtml, /content\/library\/vendor\/embed-profiles/);
  } finally {
    await stopServer(server);
    await stopServer(mockEmbed.server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("library routes support updating folder name and category", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const createFolder = await fetch(`${baseUrl}/api/library/folders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "旧名称", categoryId: "other" }),
    });
    assert.equal(createFolder.status, 200);
    const folderBody = await createFolder.json();
    assert.ok(folderBody?.folder?.id);

    const updated = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderBody.folder.id)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "新名称", categoryId: "mechanics" }),
    });
    assert.equal(updated.status, 200);
    const updatedBody = await updated.json();
    assert.equal(updatedBody?.ok, true);
    assert.equal(updatedBody?.folder?.name, "新名称");
    assert.equal(updatedBody?.folder?.categoryId, "mechanics");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("library routes support updating asset folder/embed profile/embed options", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);
  const mockEmbed = await startMockEmbedServer();

  try {
    const token = await login(baseUrl, authConfig);
    const profileARes = await fetch(`${baseUrl}/api/library/embed-profiles`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "平台A",
        scriptUrl: `${mockEmbed.baseUrl}/embed/embed.js`,
        viewerPath: `${mockEmbed.baseUrl}/embed/viewer.html`,
        constructorName: "ElectricFieldApp",
        assetUrlOptionKey: "sceneUrl",
        matchExtensions: ["json"],
      }),
    });
    assert.equal(profileARes.status, 200);
    const profileA = await profileARes.json();

    const profileBRes = await fetch(`${baseUrl}/api/library/embed-profiles`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "平台B",
        scriptUrl: `${mockEmbed.baseUrl}/embed/embed.js`,
        viewerPath: `${mockEmbed.baseUrl}/embed/viewer.html`,
        constructorName: "ElectricFieldApp",
        assetUrlOptionKey: "sceneUrl",
        matchExtensions: ["json"],
      }),
    });
    assert.equal(profileBRes.status, 200);
    const profileB = await profileBRes.json();

    const folderARes = await fetch(`${baseUrl}/api/library/folders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Folder A", categoryId: "other" }),
    });
    const folderA = await folderARes.json();
    const folderBRes = await fetch(`${baseUrl}/api/library/folders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Folder B", categoryId: "mechanics" }),
    });
    const folderB = await folderBRes.json();

    const form = new FormData();
    form.append("file", new Blob([Buffer.from("{\"scene\":\"demo\"}", "utf8")]), "scene.json");
    form.append("openMode", "embed");
    form.append("embedProfileId", String(profileA?.profile?.id || ""));
    const upload = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderA.folder.id)}/assets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    assert.equal(upload.status, 200);
    const uploadBody = await upload.json();

    const updated = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(uploadBody.asset.id)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        folderId: folderB.folder.id,
        embedProfileId: profileB.profile.id,
        embedOptions: { materialId: "M-9", autoplay: true },
      }),
    });
    assert.equal(updated.status, 200);
    const updatedBody = await updated.json();
    assert.equal(updatedBody?.ok, true);
    assert.equal(updatedBody?.asset?.folderId, folderB.folder.id);
    assert.equal(updatedBody?.asset?.embedProfileId, profileB.profile.id);
    assert.equal(updatedBody?.asset?.adapterKey, `embed:${profileB.profile.id}`);
    assert.deepEqual(updatedBody?.asset?.embedOptions, { materialId: "M-9", autoplay: true });
  } finally {
    await stopServer(server);
    await stopServer(mockEmbed.server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("library routes support deleted-assets listing and restore flow", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const createFolder = await fetch(`${baseUrl}/api/library/folders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Trash Folder", categoryId: "other" }),
    });
    assert.equal(createFolder.status, 200);
    const folderBody = await createFolder.json();

    const form = new FormData();
    form.append("file", new Blob([Buffer.from("GGBDATA")]), "trash-demo.ggb");
    form.append("openMode", "embed");
    const upload = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderBody.folder.id)}/assets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    assert.equal(upload.status, 200);
    const uploadBody = await upload.json();
    const assetId = String(uploadBody?.asset?.id || "");
    assert.ok(assetId);

    const removed = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(assetId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(removed.status, 200);

    const openAfterDelete = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(assetId)}`);
    assert.equal(openAfterDelete.status, 404);

    const deletedList = await fetch(
      `${baseUrl}/api/library/deleted-assets?folderId=${encodeURIComponent(folderBody.folder.id)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    assert.equal(deletedList.status, 200);
    const deletedBody = await deletedList.json();
    assert.equal(Array.isArray(deletedBody?.assets), true);
    assert.equal(deletedBody.assets.length, 1);
    assert.equal(deletedBody.assets[0].id, assetId);
    assert.equal(deletedBody.assets[0].deleted, true);

    const restored = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(assetId)}/restore`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(restored.status, 200);
    const restoredBody = await restored.json();
    assert.equal(restoredBody?.ok, true);
    assert.equal(restoredBody?.asset?.deleted, false);

    const openAfterRestore = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(assetId)}`);
    assert.equal(openAfterRestore.status, 200);
    const openBody = await openAfterRestore.json();
    assert.equal(openBody?.ok, true);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("DELETE /api/library/assets/:id/permanent hard-deletes resource from recycle bin", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const createFolder = await fetch(`${baseUrl}/api/library/folders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Permanent Folder", categoryId: "other" }),
    });
    assert.equal(createFolder.status, 200);
    const folderBody = await createFolder.json();
    const folderId = String(folderBody?.folder?.id || "");
    assert.ok(folderId);

    const form = new FormData();
    form.append("file", new Blob([Buffer.from("GGBDATA")]), "hard-remove.ggb");
    form.append("openMode", "embed");
    const upload = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderId)}/assets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    assert.equal(upload.status, 200);
    const uploadBody = await upload.json();
    const assetId = String(uploadBody?.asset?.id || "");
    assert.ok(assetId);

    const softDelete = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(assetId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(softDelete.status, 200);

    const hardDelete = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(assetId)}/permanent`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(hardDelete.status, 200);

    const deletedList = await fetch(
      `${baseUrl}/api/library/deleted-assets?folderId=${encodeURIComponent(folderId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    assert.equal(deletedList.status, 200);
    const deletedBody = await deletedList.json();
    assert.equal(Array.isArray(deletedBody?.assets), true);
    assert.equal(deletedBody.assets.length, 0);

    const openInfo = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(assetId)}`);
    assert.equal(openInfo.status, 404);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
