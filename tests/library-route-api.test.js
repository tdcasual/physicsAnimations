const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { Blob } = require("node:buffer");

const { createApp } = require("../server/app");
const { createLibraryRouter } = require("../server/routes/library");
const { makeTempRoot, removeTempRoot } = require("./helpers/tempRoot");
const { startServer, stopServer } = require("./helpers/testServer");
const { startMockEmbedServer, makeAuthConfig, login } = require("./helpers/libraryRouteApiFixtures");

async function startVersionedEmbedServer() {
  let version = 1;
  let delayMs = 0;
  const server = http.createServer((req, res) => {
    const url = String(req.url || "");
    const send = (status, contentType, body) => {
      res.statusCode = status;
      if (contentType) res.setHeader("Content-Type", contentType);
      res.end(body);
    };
    if (url === "/embed/embed.js") {
      if (version === 1) {
        send(200, "application/javascript", 'import "./assets/main.js"; import "./assets/v1.js";');
        return;
      }
      send(200, "application/javascript", 'import "./assets/main.js"; import "./assets/v2.js";');
      return;
    }
    if (url === "/embed/viewer.html") {
      send(
        200,
        "text/html; charset=utf-8",
        '<!doctype html><html><head><script src="./assets/main.js"></script></head><body></body></html>',
      );
      return;
    }
    if (url === "/embed/assets/main.js") {
      const body = 'console.log("main");';
      if (delayMs > 0) {
        setTimeout(() => send(200, "application/javascript", body), delayMs);
        return;
      }
      send(200, "application/javascript", body);
      return;
    }
    if (url === "/embed/assets/v1.js") {
      send(200, "application/javascript", 'console.log("v1");');
      return;
    }
    if (url === "/embed/assets/v2.js") {
      send(200, "application/javascript", 'console.log("v2");');
      return;
    }
    send(404, "text/plain", "not found");
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    setVersion(next) {
      version = Number(next) === 2 ? 2 : 1;
    },
    setDelayMs(next) {
      delayMs = Math.max(0, Number(next) || 0);
    },
  };
}

test("library router composes domain route modules", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "server", "routes", "library.js"), "utf8");
  assert.match(source, /registerCatalogRoutes/);
  assert.match(source, /registerFolderRoutes/);
  assert.match(source, /registerAssetRoutes/);
  assert.match(source, /registerEmbedProfileRoutes/);
});

test("library router rejects invalid store contract", () => {
  const authConfig = makeAuthConfig();
  assert.throws(() => createLibraryRouter({ authConfig, store: null }), /createLibraryRouter requires a valid store/);
  assert.throws(
    () =>
      createLibraryRouter({
        authConfig,
        store: {
          async readBuffer() {
            return null;
          },
          async writeBuffer() {},
        },
      }),
    /createLibraryRouter requires a valid store/,
  );
});

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
    removeTempRoot(rootDir);
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
    removeTempRoot(rootDir);
  }
});

test("library routes reject asset upload when openMode is missing", async () => {
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
        name: "Strict Mode Folder",
        categoryId: "other",
      }),
    });
    assert.equal(createFolder.status, 200);
    const folderBody = await createFolder.json();
    assert.ok(folderBody?.folder?.id);

    const form = new FormData();
    form.append("file", new Blob([Buffer.from("GGBDATA")]), "missing-mode.ggb");
    const upload = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderBody.folder.id)}/assets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    assert.equal(upload.status, 400);
    const body = await upload.json();
    assert.equal(body?.error, "invalid_open_mode");
  } finally {
    await stopServer(server);
    removeTempRoot(rootDir);
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
    removeTempRoot(rootDir);
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
    removeTempRoot(rootDir);
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
    removeTempRoot(rootDir);
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
    removeTempRoot(rootDir);
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
    removeTempRoot(rootDir);
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
    removeTempRoot(rootDir);
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
    removeTempRoot(rootDir);
  }
});

test("library routes support embed profile rollback to previous release", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);
  const mockEmbed = await startVersionedEmbedServer();

  try {
    const token = await login(baseUrl, authConfig);
    const profileRes = await fetch(`${baseUrl}/api/library/embed-profiles`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Rollback Route",
        scriptUrl: `${mockEmbed.baseUrl}/embed/embed.js`,
        viewerPath: `${mockEmbed.baseUrl}/embed/viewer.html`,
        constructorName: "ElectricFieldApp",
        assetUrlOptionKey: "sceneUrl",
      }),
    });
    assert.equal(profileRes.status, 200);
    const profileBody = await profileRes.json();
    assert.equal(profileBody?.ok, true);
    const profileId = String(profileBody?.profile?.id || "");
    const release1ScriptUrl = String(profileBody?.profile?.scriptUrl || "");
    assert.ok(profileId);
    assert.ok(release1ScriptUrl);

    mockEmbed.setVersion(2);
    const syncRes = await fetch(`${baseUrl}/api/library/embed-profiles/${encodeURIComponent(profileId)}/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(syncRes.status, 200);
    const syncBody = await syncRes.json();
    assert.equal(syncBody?.ok, true);
    assert.notEqual(String(syncBody?.profile?.scriptUrl || ""), release1ScriptUrl);

    const rollbackRes = await fetch(`${baseUrl}/api/library/embed-profiles/${encodeURIComponent(profileId)}/rollback`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(rollbackRes.status, 200);
    const rollbackBody = await rollbackRes.json();
    assert.equal(rollbackBody?.ok, true);
    assert.equal(String(rollbackBody?.profile?.scriptUrl || ""), release1ScriptUrl);
    assert.equal(String(rollbackBody?.profile?.syncMessage || ""), "rollback_ok");

    const scriptRes = await fetch(`${baseUrl}${release1ScriptUrl}`);
    assert.equal(scriptRes.status, 200);
    const scriptText = await scriptRes.text();
    assert.match(scriptText, /v1\.js/);
  } finally {
    await stopServer(server);
    await stopServer(mockEmbed.server);
    removeTempRoot(rootDir);
  }
});

test("library routes support cancelling an in-flight embed profile sync", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);
  const mockEmbed = await startVersionedEmbedServer();

  try {
    const token = await login(baseUrl, authConfig);
    const profileRes = await fetch(`${baseUrl}/api/library/embed-profiles`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Cancel Route",
        scriptUrl: `${mockEmbed.baseUrl}/embed/embed.js`,
        viewerPath: `${mockEmbed.baseUrl}/embed/viewer.html`,
        constructorName: "ElectricFieldApp",
        assetUrlOptionKey: "sceneUrl",
        syncOptions: {
          retryMaxAttempts: 1,
          retryBaseDelayMs: 5,
          timeoutMs: 1000,
        },
      }),
    });
    assert.equal(profileRes.status, 200);
    const profileBody = await profileRes.json();
    const profileId = String(profileBody?.profile?.id || "");
    assert.ok(profileId);

    mockEmbed.setVersion(2);
    mockEmbed.setDelayMs(120);

    const syncPromise = fetch(`${baseUrl}/api/library/embed-profiles/${encodeURIComponent(profileId)}/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    await new Promise((resolve) => setTimeout(resolve, 30));

    const cancelRes = await fetch(`${baseUrl}/api/library/embed-profiles/${encodeURIComponent(profileId)}/sync/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(cancelRes.status, 200);
    const cancelBody = await cancelRes.json();
    assert.equal(cancelBody?.ok, true);
    assert.equal(cancelBody?.cancelled, true);

    const syncRes = await syncPromise;
    assert.equal(syncRes.status, 502);
    const syncBody = await syncRes.json();
    assert.equal(syncBody?.error, "embed_profile_sync_failed");

    const listRes = await fetch(`${baseUrl}/api/library/embed-profiles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    const profile = (Array.isArray(listBody?.profiles) ? listBody.profiles : []).find((item) => item?.id === profileId);
    assert.equal(String(profile?.syncMessage || ""), "sync_cancelled");

    const secondCancelRes = await fetch(`${baseUrl}/api/library/embed-profiles/${encodeURIComponent(profileId)}/sync/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(secondCancelRes.status, 409);
    const secondCancelBody = await secondCancelRes.json();
    assert.equal(secondCancelBody?.error, "embed_profile_sync_not_running");
  } finally {
    await stopServer(server);
    await stopServer(mockEmbed.server);
    removeTempRoot(rootDir);
  }
});
