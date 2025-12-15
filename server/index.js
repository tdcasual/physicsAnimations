const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const express = require("express");
const multer = require("multer");

const { getAuthConfig, issueToken, requireAuth, verifyLogin } = require("./lib/auth");
const { loadCatalog } = require("./lib/catalog");
const { captureScreenshot, filePathToUrl } = require("./lib/screenshot");
const { ensureDir, getContentPaths, loadDynamicState, saveDynamicState } = require("./lib/storage");

const app = express();
app.disable("x-powered-by");

const rootDir = path.join(__dirname, "..");
const authConfig = getAuthConfig();
const authRequired = requireAuth({ authConfig });
const contentPaths = getContentPaths({ rootDir });

ensureDir(contentPaths.contentDir);
ensureDir(contentPaths.uploadsDir);
ensureDir(contentPaths.thumbnailsDir);

let didWarnScreenshotDeps = false;
function warnScreenshotDeps(err) {
  if (didWarnScreenshotDeps) return;
  didWarnScreenshotDeps = true;
  console.error("[screenshot] Failed to generate thumbnails.");
  console.error("[screenshot] Try: `npm run install-playwright-deps`");
  if (err?.message) console.error(`[screenshot] ${err.message}`);
}

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/catalog", (_req, res) => {
  res.json(loadCatalog({ rootDir }));
});

app.post("/api/auth/login", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!username || !password) {
    res.status(400).json({ error: "missing_credentials" });
    return;
  }

  const ok = await verifyLogin({ username, password, authConfig });
  if (!ok) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }

  const token = issueToken({ username, authConfig });
  res.json({ token });
});

app.get("/api/auth/me", authRequired, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role });
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.post("/api/items/link", authRequired, async (req, res) => {
  const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const description =
    typeof req.body?.description === "string" ? req.body.description.trim() : "";
  const categoryId =
    typeof req.body?.categoryId === "string" ? req.body.categoryId.trim() : "other";

  let parsedUrl = null;
  try {
    parsedUrl = new URL(url);
  } catch {
    res.status(400).json({ error: "invalid_url" });
    return;
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    res.status(400).json({ error: "invalid_url_protocol" });
    return;
  }

  const now = new Date().toISOString();
  const id = `l_${crypto.randomUUID()}`;

  let thumbnail = "";
  try {
    await captureScreenshot({
      rootDir,
      targetUrl: parsedUrl.toString(),
      outputPath: path.join(contentPaths.thumbnailsDir, `${id}.png`),
    });
    thumbnail = `content/thumbnails/${id}.png`;
  } catch (err) {
    warnScreenshotDeps(err);
  }

  const state = loadDynamicState({ rootDir });
  state.items.push({
    id,
    type: "link",
    categoryId: categoryId || "other",
    url: parsedUrl.toString(),
    title: title || parsedUrl.hostname,
    description,
    thumbnail,
    createdAt: now,
    updatedAt: now,
  });
  saveDynamicState({ rootDir, state });

  res.json({ ok: true, id, thumbnail });
});

app.post("/api/items/upload", authRequired, upload.single("file"), async (req, res) => {
  const categoryId =
    typeof req.body?.categoryId === "string" ? req.body.categoryId.trim() : "other";
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const description =
    typeof req.body?.description === "string" ? req.body.description.trim() : "";

  if (!req.file?.buffer?.length) {
    res.status(400).json({ error: "missing_file" });
    return;
  }

  const originalName = typeof req.file.originalname === "string" ? req.file.originalname : "";
  const isHtml = /\.(html?|htm)$/i.test(originalName);
  if (!isHtml) {
    res.status(400).json({ error: "invalid_file_type" });
    return;
  }

  const now = new Date().toISOString();
  const id = `u_${crypto.randomUUID()}`;

  const uploadDir = path.join(contentPaths.uploadsDir, id);
  ensureDir(uploadDir);
  const filePath = path.join(uploadDir, "index.html");
  fs.writeFileSync(filePath, req.file.buffer);

  let thumbnail = "";
  try {
    await captureScreenshot({
      rootDir,
      targetUrl: filePathToUrl(filePath),
      outputPath: path.join(contentPaths.thumbnailsDir, `${id}.png`),
    });
    thumbnail = `content/thumbnails/${id}.png`;
  } catch (err) {
    warnScreenshotDeps(err);
  }

  const state = loadDynamicState({ rootDir });
  state.items.push({
    id,
    type: "upload",
    categoryId: categoryId || "other",
    path: `content/uploads/${id}/index.html`,
    title: title || originalName.replace(/\.(html?|htm)$/i, ""),
    description,
    thumbnail,
    createdAt: now,
    updatedAt: now,
  });
  saveDynamicState({ rootDir, state });

  res.json({ ok: true, id, thumbnail });
});

app.get("/api/items/:id", (req, res) => {
  const id = typeof req.params?.id === "string" ? req.params.id : "";
  if (!id) {
    res.status(400).json({ error: "missing_id" });
    return;
  }

  const state = loadDynamicState({ rootDir });
  const item = state.items.find((it) => it.id === id);
  if (!item) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const src = item.type === "link" ? item.url : item.path;
  res.json({
    item: {
      id: item.id,
      type: item.type,
      categoryId: item.categoryId,
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail,
      src,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    },
  });
});

app.post("/api/items/:id/screenshot", authRequired, async (req, res) => {
  const id = typeof req.params?.id === "string" ? req.params.id : "";
  if (!id) {
    res.status(400).json({ error: "missing_id" });
    return;
  }

  const state = loadDynamicState({ rootDir });
  const item = state.items.find((it) => it.id === id);
  if (!item) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const now = new Date().toISOString();
  const outputPath = path.join(contentPaths.thumbnailsDir, `${id}.png`);

  try {
    const targetUrl =
      item.type === "link"
        ? item.url
        : filePathToUrl(path.join(rootDir, item.path));

    await captureScreenshot({ rootDir, targetUrl, outputPath });
    item.thumbnail = `content/thumbnails/${id}.png`;
    item.updatedAt = now;
    saveDynamicState({ rootDir, state });
    res.json({ ok: true, thumbnail: item.thumbnail });
  } catch {
    res.status(500).json({ error: "screenshot_failed" });
  }
});

app.delete("/api/items/:id", authRequired, (req, res) => {
  const id = typeof req.params?.id === "string" ? req.params.id : "";
  if (!id) {
    res.status(400).json({ error: "missing_id" });
    return;
  }

  const state = loadDynamicState({ rootDir });
  const before = state.items.length;
  const item = state.items.find((it) => it.id === id);
  state.items = state.items.filter((it) => it.id !== id);

  if (!item || state.items.length === before) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  if (item.type === "upload") {
    const dir = path.join(contentPaths.uploadsDir, id);
    fs.rmSync(dir, { recursive: true, force: true });
  }
  if (item.thumbnail) {
    const thumbnailPath = path.join(rootDir, item.thumbnail);
    fs.rmSync(thumbnailPath, { force: true });
  }

  saveDynamicState({ rootDir, state });
  res.json({ ok: true });
});

app.use("/assets", express.static(path.join(rootDir, "assets")));
app.use("/animations", express.static(path.join(rootDir, "animations")));
app.use("/content/uploads", express.static(path.join(rootDir, "content", "uploads")));
app.use("/content/thumbnails", express.static(path.join(rootDir, "content", "thumbnails")));

app.get("/animations.json", (_req, res) => {
  res.sendFile(path.join(rootDir, "animations.json"));
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});
app.get("/viewer.html", (_req, res) => {
  res.sendFile(path.join(rootDir, "viewer.html"));
});

app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

const port = Number.parseInt(process.env.PORT || "4173", 10);
app.listen(port, () => {
  console.log(`[physicsAnimations] listening on http://localhost:${port}`);
});
