const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const bcrypt = require("bcryptjs");
const { createApp } = require("../server/app");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-lib-nochanges-"));
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(path.join(root, "animations.json"), "{}");
  return root;
}

async function startServer(app) {
  return await new Promise((resolve) => {
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
  await new Promise((resolve) => {
    server.close(resolve);
  });
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

async function createFolder(baseUrl, token, name = "No Changes Folder") {
  const response = await fetch(`${baseUrl}/api/library/folders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      categoryId: "other",
    }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload?.folder?.id);
  return payload.folder;
}

async function createAsset(baseUrl, token, folderId) {
  const form = new FormData();
  form.append("file", new Blob([Buffer.from("GGBDATA")]), "demo.ggb");
  form.append("openMode", "download");
  const response = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderId)}/assets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload?.asset?.id);
  return payload.asset;
}

test("PUT /api/library/folders/:id rejects empty patch with no_changes", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const folder = await createFolder(baseUrl, token);

    const detailBefore = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folder.id)}`);
    assert.equal(detailBefore.status, 200);
    const beforeBody = await detailBefore.json();
    const beforeUpdatedAt = String(beforeBody?.folder?.updatedAt || "");
    assert.ok(beforeUpdatedAt);

    const updated = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folder.id)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    assert.equal(updated.status, 400);
    const updatedBody = await updated.json();
    assert.equal(updatedBody?.error, "no_changes");

    const detailAfter = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folder.id)}`);
    assert.equal(detailAfter.status, 200);
    const afterBody = await detailAfter.json();
    assert.equal(String(afterBody?.folder?.updatedAt || ""), beforeUpdatedAt);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("PUT /api/library/assets/:id rejects empty patch with no_changes", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const folder = await createFolder(baseUrl, token, "Asset Folder");
    const asset = await createAsset(baseUrl, token, folder.id);

    const infoBefore = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(asset.id)}`);
    assert.equal(infoBefore.status, 200);
    const beforeBody = await infoBefore.json();
    const beforeUpdatedAt = String(beforeBody?.asset?.updatedAt || "");
    assert.ok(beforeUpdatedAt);

    const updated = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(asset.id)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    assert.equal(updated.status, 400);
    const updatedBody = await updated.json();
    assert.equal(updatedBody?.error, "no_changes");

    const infoAfter = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(asset.id)}`);
    assert.equal(infoAfter.status, 200);
    const afterBody = await infoAfter.json();
    assert.equal(String(afterBody?.asset?.updatedAt || ""), beforeUpdatedAt);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("PUT /api/library/embed-profiles/:id rejects empty patch with no_changes", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const created = await fetch(`${baseUrl}/api/library/embed-profiles`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Local Profile",
        scriptUrl: "/content/library/vendor/geogebra/current/deployggb.js",
        viewerPath: "/content/library/vendor/geogebra/current/viewer.html",
      }),
    });
    assert.equal(created.status, 200);
    const createdBody = await created.json();
    const profileId = String(createdBody?.profile?.id || "");
    const beforeUpdatedAt = String(createdBody?.profile?.updatedAt || "");
    assert.ok(profileId);
    assert.ok(beforeUpdatedAt);

    const updated = await fetch(`${baseUrl}/api/library/embed-profiles/${encodeURIComponent(profileId)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    assert.equal(updated.status, 400);
    const updatedBody = await updated.json();
    assert.equal(updatedBody?.error, "no_changes");

    const listed = await fetch(`${baseUrl}/api/library/embed-profiles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(listed.status, 200);
    const listedBody = await listed.json();
    const refreshed = Array.isArray(listedBody?.profiles) ? listedBody.profiles.find((item) => item.id === profileId) : null;
    assert.ok(refreshed);
    assert.equal(String(refreshed?.updatedAt || ""), beforeUpdatedAt);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
