const test = require("node:test");
const assert = require("node:assert/strict");
const { Blob } = require("node:buffer");

const { createApp } = require("../server/app");
const { makeTempRoot, removeTempRoot } = require("./helpers/tempRoot");
const { startServer, stopServer } = require("./helpers/testServer");
const { startMockEmbedServer, makeAuthConfig, login } = require("./helpers/libraryRouteApiFixtures");

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
    removeTempRoot(rootDir);
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
    removeTempRoot(rootDir);
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
    removeTempRoot(rootDir);
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
    removeTempRoot(rootDir);
  }
});
