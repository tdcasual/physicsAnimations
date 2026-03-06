const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

const { createApp } = require("../server/app");
const { makeTempRoot, removeTempRoot } = require("./helpers/tempRoot");
const { startServer, stopServer } = require("./helpers/testServer");

function makeAuthConfig() {
  return {
    adminUsername: "admin",
    adminPasswordHash: bcrypt.hashSync("secret", 10),
    jwtSecret: "test-secret",
    jwtSecretSource: "test",
    jwtIssuer: "physicsAnimations",
    jwtAudience: "physicsAnimations-web",
    tokenTtlSeconds: 3600,
  };
}

async function login(baseUrl, password = "secret") {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password }),
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(data?.token);
  return data.token;
}

async function captureAuditEntries(fn) {
  const originalLog = console.log;
  const lines = [];
  console.log = (...args) => lines.push(args.map(String).join(" "));
  try {
    await fn();
  } finally {
    console.log = originalLog;
  }

  return lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((entry) => entry && entry.msg === "admin_audit");
}

test("auth account update and system storage update emit structured admin audit events", async () => {
  const rootDir = makeTempRoot({ prefix: "pa-admin-audit-auth-" });
  const app = createApp({ rootDir, authConfig: makeAuthConfig() });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl);
    const entries = await captureAuditEntries(async () => {
      const accountRes = await fetch(`${baseUrl}/api/auth/account`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Request-Id": "audit-account-1",
        },
        body: JSON.stringify({
          currentPassword: "secret",
          newPassword: "changed-secret",
        }),
      });
      assert.equal(accountRes.status, 200);
      const accountData = await accountRes.json();
      assert.ok(accountData?.token);

      const storageRes = await fetch(`${baseUrl}/api/system/storage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accountData.token}`,
          "Content-Type": "application/json",
          "X-Request-Id": "audit-storage-1",
        },
        body: JSON.stringify({ mode: "local" }),
      });
      assert.equal(storageRes.status, 200);
    });

    const accountEntry = entries.find((entry) => entry.auditAction === "auth.account.update");
    assert.ok(accountEntry);
    assert.equal(accountEntry.actor, "admin");
    assert.equal(accountEntry.targetType, "admin_account");
    assert.equal(accountEntry.outcome, "success");
    assert.equal(accountEntry.requestId, "audit-account-1");

    const storageEntry = entries.find((entry) => entry.auditAction === "system.storage.update");
    assert.ok(storageEntry);
    assert.equal(storageEntry.actor, "admin");
    assert.equal(storageEntry.targetType, "system_storage");
    assert.equal(storageEntry.outcome, "success");
    assert.equal(storageEntry.requestId, "audit-storage-1");
  } finally {
    await stopServer(server);
    removeTempRoot(rootDir);
  }
});

test("library folder and asset mutations emit structured admin audit events", async () => {
  const rootDir = makeTempRoot({ prefix: "pa-admin-audit-library-" });
  const app = createApp({ rootDir, authConfig: makeAuthConfig() });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl);
    const entries = await captureAuditEntries(async () => {
      const createFolderRes = await fetch(`${baseUrl}/api/library/folders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Request-Id": "audit-folder-create-1",
        },
        body: JSON.stringify({ name: "Audit Folder", categoryId: "other", coverType: "blank" }),
      });
      assert.equal(createFolderRes.status, 200);
      const createFolderData = await createFolderRes.json();
      const folderId = createFolderData?.folder?.id;
      assert.ok(folderId);

      const updateFolderRes = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderId)}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Request-Id": "audit-folder-update-1",
        },
        body: JSON.stringify({ name: "Audit Folder Updated" }),
      });
      assert.equal(updateFolderRes.status, 200);

      const form = new FormData();
      form.append("file", new Blob([Buffer.from("ggb")]), "demo.ggb");
      form.append("displayName", "Audit Asset");
      form.append("openMode", "download");
      const uploadAssetRes = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderId)}/assets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Request-Id": "audit-asset-upload-1",
        },
        body: form,
      });
      assert.equal(uploadAssetRes.status, 200);
      const uploadAssetData = await uploadAssetRes.json();
      const assetId = uploadAssetData?.asset?.id;
      assert.ok(assetId);

      const updateAssetRes = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(assetId)}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Request-Id": "audit-asset-update-1",
        },
        body: JSON.stringify({ displayName: "Audit Asset Updated" }),
      });
      assert.equal(updateAssetRes.status, 200);

      const deleteAssetRes = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(assetId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Request-Id": "audit-asset-delete-1",
        },
      });
      assert.equal(deleteAssetRes.status, 200);

      const restoreAssetRes = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(assetId)}/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Request-Id": "audit-asset-restore-1",
        },
      });
      assert.equal(restoreAssetRes.status, 200);

      const deleteAssetAgainRes = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(assetId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Request-Id": "audit-asset-delete-2",
        },
      });
      assert.equal(deleteAssetAgainRes.status, 200);

      const deleteAssetPermanentRes = await fetch(`${baseUrl}/api/library/assets/${encodeURIComponent(assetId)}/permanent`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Request-Id": "audit-asset-permanent-1",
        },
      });
      assert.equal(deleteAssetPermanentRes.status, 200);

      const deleteFolderRes = await fetch(`${baseUrl}/api/library/folders/${encodeURIComponent(folderId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Request-Id": "audit-folder-delete-1",
        },
      });
      assert.equal(deleteFolderRes.status, 200);
    });

    const requiredActions = [
      ["library.folder.create", "audit-folder-create-1"],
      ["library.folder.update", "audit-folder-update-1"],
      ["library.asset.upload", "audit-asset-upload-1"],
      ["library.asset.update", "audit-asset-update-1"],
      ["library.asset.delete", "audit-asset-delete-1"],
      ["library.asset.restore", "audit-asset-restore-1"],
      ["library.asset.delete_permanent", "audit-asset-permanent-1"],
      ["library.folder.delete", "audit-folder-delete-1"],
    ];

    for (const [action, requestId] of requiredActions) {
      const entry = entries.find((item) => item.auditAction === action);
      assert.ok(entry, `missing audit entry for ${action}`);
      assert.equal(entry.actor, "admin");
      assert.equal(entry.outcome, "success");
      assert.equal(entry.requestId, requestId);
    }
  } finally {
    await stopServer(server);
    removeTempRoot(rootDir);
  }
});
