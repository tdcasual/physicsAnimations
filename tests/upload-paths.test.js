const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");
const { Blob } = require("node:buffer");

const JSZip = require("jszip");
const bcrypt = require("bcryptjs");

const { createApp } = require("../server/app");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-test-"));
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><title>test</title>");
  fs.writeFileSync(path.join(root, "animations.json"), "{}");
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
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

test("webdav content routes block traversal and allow valid paths", async () => {
  const rootDir = makeTempRoot();
  const store = {
    mode: "webdav",
    async createReadStream(key) {
      if (key === "uploads/ok.html") return Readable.from(["ok"]);
      if (key === "thumbnails/ok.png") return Readable.from([Buffer.from([1, 2, 3])]);
      return null;
    },
    async readBuffer() {
      throw new Error("not_implemented");
    },
    async writeBuffer() {
      throw new Error("not_implemented");
    },
    async deletePath() {},
  };

  const app = createApp({ rootDir, store });
  const { server, baseUrl } = await startServer(app);
  try {
    const okUpload = await fetch(`${baseUrl}/content/uploads/ok.html`);
    assert.equal(okUpload.status, 200);
    assert.equal(await okUpload.text(), "ok");

    const okThumb = await fetch(`${baseUrl}/content/thumbnails/ok.png`);
    assert.equal(okThumb.status, 200);

    const traversal1 = await fetch(`${baseUrl}/content/uploads/../items.json`);
    assert.ok([400, 404].includes(traversal1.status));
    if (traversal1.status === 400) {
      const traversal1Body = await traversal1.json();
      assert.equal(traversal1Body.error, "invalid_path");
    }

    const traversal2 = await fetch(`${baseUrl}/content/uploads/%2e%2e%2fitems.json`);
    assert.ok([400, 404].includes(traversal2.status));

    const traversal3 = await fetch(`${baseUrl}/content/thumbnails/../items.json`);
    assert.ok([400, 404].includes(traversal3.status));
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("upload rejects missing file and invalid file types", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);

    const missing = await fetch(`${baseUrl}/api/items/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(missing.status, 400);
    const missingBody = await missing.json();
    assert.equal(missingBody.error, "missing_file");

    const badForm = new FormData();
    badForm.append("file", new Blob([Buffer.from("nope")]), "file.exe");
    const bad = await fetch(`${baseUrl}/api/items/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: badForm,
    });
    assert.equal(bad.status, 400);
    const badBody = await bad.json();
    assert.equal(badBody.error, "invalid_file_type");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("upload cleans up store after zip missing index.html", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);

    const zip = new JSZip();
    zip.file("foo.txt", "hello");
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    const form = new FormData();
    form.append("file", new Blob([zipBuffer]), "missing-index.zip");
    const response = await fetch(`${baseUrl}/api/items/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error, "missing_index_html");

    const uploadsDir = path.join(rootDir, "content", "uploads");
    if (fs.existsSync(uploadsDir)) {
      const entries = fs.readdirSync(uploadsDir);
      assert.equal(entries.length, 0);
    }
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("zip upload ignores traversal entries and does not escape uploads", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);

    const zip = new JSZip();
    zip.file("index.html", "<html><head><title>Ok</title></head><body>OK</body></html>");
    zip.file("../evil.txt", "nope");
    zip.file("../../escape.txt", "nope");
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    const form = new FormData();
    form.append("file", new Blob([zipBuffer]), "ok.zip");
    form.append("categoryId", "other");
    const response = await fetch(`${baseUrl}/api/items/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    assert.ok(data.id);

    const uploadRoot = path.join(rootDir, "content", "uploads", data.id);
    assert.ok(fs.existsSync(path.join(uploadRoot, "index.html")));
    assert.equal(fs.existsSync(path.join(rootDir, "content", "evil.txt")), false);
    assert.equal(fs.existsSync(path.join(rootDir, "evil.txt")), false);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
