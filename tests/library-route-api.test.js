const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Blob } = require("node:buffer");

const bcrypt = require("bcryptjs");
const { createApp } = require("../server/app");

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
  await new Promise((resolve) => server.close(resolve));
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
    const upload = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderBody.folder.id)}/assets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    assert.equal(upload.status, 200);
    const uploadBody = await upload.json();
    assert.equal(uploadBody?.ok, true);
    assert.ok(uploadBody?.asset?.id);

    const assetInfo = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(uploadBody.asset.id)}`);
    assert.equal(assetInfo.status, 200);
    const infoBody = await assetInfo.json();
    assert.equal(infoBody?.ok, true);
    assert.equal(infoBody?.mode, "embed");
    assert.match(String(infoBody?.openUrl || ""), /\/content\/library\/assets\/.*\/viewer\/index\.html$/);
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
