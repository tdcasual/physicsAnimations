# Library Resource Platform Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不破坏现有 `items(link/upload)` 链路的前提下，落地 `library` 域（文件夹 + `.ggb` 资产），支持 `embed/download` 两种打开模式，并让前台可浏览文件夹卡片与文件夹详情页。

**Architecture:** 采用并行域增量扩展：新增 `server/services/library/*`、`server/routes/library.js`、`frontend/src/features/library/*` 与新页面，避免在 Phase 1 重构现有 catalog/item 核心结构。后端通过 adapter registry（首个 `geogebra` adapter）实现文件类型识别与容器页生成；前端通过新增 `library` API 与局部 UI 组合实现“目录页显示文件夹 + 详情页打开资产”。

**Tech Stack:** Node.js 24 (target), Express 5, Multer, Vue 3, TypeScript, Vitest, Node test runner.

---

Related skills during execution: `@superpowers:test-driven-development`, `@superpowers:systematic-debugging`, `@superpowers:verification-before-completion`, `@superpowers:requesting-code-review`.

### Task 0: Baseline Verification In Worktree

**Files:**
- None (verification only)

**Step 1: Install root dependencies**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
npm install
```

Expected: install completes without fatal errors.

**Step 2: Install frontend dependencies + build dist**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
npm --prefix frontend install
npm run build:frontend
```

Expected: `frontend/dist` generated.

**Step 3: Run backend and frontend baseline tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
npm test
npm run test:frontend
```

Expected: PASS, no baseline regressions.

**Step 4: Commit**

No commit (verification task).

---

### Task 1: Lock Adapter Registry Contract With Failing Tests

**Files:**
- Create: `tests/library-adapter-registry.test.js`
- Create: `tests/library-geogebra-adapter.test.js`
- Create (later): `server/services/library/adapters/registry.js`
- Create (later): `server/services/library/adapters/geogebra.js`

**Step 1: Write failing tests for adapter registration and lookup**

```js
const test = require("node:test");
const assert = require("node:assert/strict");

test("createAdapterRegistry registers adapters and resolves by file extension", async () => {
  const { createAdapterRegistry } = require("../server/services/library/adapters/registry");
  const registry = createAdapterRegistry([
    { key: "x", match: ({ fileName }) => String(fileName).endsWith(".x") },
  ]);
  const found = registry.findForFile({ fileName: "demo.x" });
  assert.equal(found?.key, "x");
});
```

**Step 2: Write failing tests for geogebra adapter embed/download behavior**

```js
test("geogebra adapter supports .ggb and generates viewer html in embed mode", async () => {
  const { createGeogebraAdapter } = require("../server/services/library/adapters/geogebra");
  const adapter = createGeogebraAdapter();
  assert.equal(adapter.match({ fileName: "demo.ggb" }), true);
  assert.equal(adapter.match({ fileName: "demo.zip" }), false);
});
```

**Step 3: Run targeted tests and verify failure**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
node --test tests/library-adapter-registry.test.js tests/library-geogebra-adapter.test.js
```

Expected: FAIL with `Cannot find module '../server/services/library/adapters/...`.

**Step 4: Commit**

No commit (red phase).

---

### Task 2: Implement Adapter Registry + Geogebra Adapter

**Files:**
- Create: `server/services/library/adapters/registry.js`
- Create: `server/services/library/adapters/geogebra.js`
- Create: `server/services/library/adapters/index.js`
- Test: `tests/library-adapter-registry.test.js`
- Test: `tests/library-geogebra-adapter.test.js`

**Step 1: Implement registry with strict shape checks**

```js
function createAdapterRegistry(adapters = []) {
  const list = [];
  for (const adapter of adapters) {
    if (!adapter || typeof adapter.key !== "string" || !adapter.key) continue;
    if (typeof adapter.match !== "function") continue;
    list.push(adapter);
  }

  function findForFile(input) {
    return list.find((adapter) => adapter.match(input)) || null;
  }

  function getByKey(key) {
    return list.find((adapter) => adapter.key === key) || null;
  }

  return { findForFile, getByKey, adapters: list.slice() };
}
```

**Step 2: Implement geogebra adapter with embed/download branching**

```js
function createGeogebraAdapter() {
  return {
    key: "geogebra",
    match({ fileName }) {
      return /\.ggb$/i.test(String(fileName || ""));
    },
    async buildViewer({ openMode, assetPublicFileUrl }) {
      if (openMode !== "embed") return { generated: false, html: "" };
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>GeoGebra</title>
<script src="https://www.geogebra.org/apps/deployggb.js"></script></head><body>
<div id="ggb-element"></div>
<script>new GGBApplet({filename:${JSON.stringify(assetPublicFileUrl)},showToolBar:true}, true).inject("ggb-element");</script>
</body></html>`;
      return { generated: true, html };
    },
  };
}
```

**Step 3: Export default adapter set**

```js
const { createAdapterRegistry } = require("./registry");
const { createGeogebraAdapter } = require("./geogebra");

function createDefaultLibraryAdapterRegistry() {
  return createAdapterRegistry([createGeogebraAdapter()]);
}
```

**Step 4: Re-run target tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
node --test tests/library-adapter-registry.test.js tests/library-geogebra-adapter.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add server/services/library/adapters tests/library-adapter-registry.test.js tests/library-geogebra-adapter.test.js
git commit -m "test+feat(library): add adapter registry and geogebra adapter"
```

---

### Task 3: Lock Library State Persistence Contract With Failing Tests

**Files:**
- Create: `tests/library-state.test.js`
- Create (later): `server/lib/libraryState.js`

**Step 1: Write failing tests for folders/assets load-save-mutate**

```js
const test = require("node:test");
const assert = require("node:assert/strict");

test("libraryState loads empty defaults when files are missing", async () => {
  const { loadLibraryFoldersState, loadLibraryAssetsState } = require("../server/lib/libraryState");
  const store = { readBuffer: async () => null };
  const folders = await loadLibraryFoldersState({ store });
  const assets = await loadLibraryAssetsState({ store });
  assert.deepEqual(folders.folders, []);
  assert.deepEqual(assets.assets, []);
});
```

**Step 2: Run targeted test and verify failure**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
node --test tests/library-state.test.js
```

Expected: FAIL with missing module.

**Step 3: Commit**

No commit (red phase).

---

### Task 4: Implement Library State Module

**Files:**
- Create: `server/lib/libraryState.js`
- Test: `tests/library-state.test.js`

**Step 1: Implement state keys + defaults + mutation helpers**

```js
const LIBRARY_FOLDERS_KEY = "library/folders.json";
const LIBRARY_ASSETS_KEY = "library/assets.json";

async function loadLibraryFoldersState({ store }) {
  const raw = await store.readBuffer(LIBRARY_FOLDERS_KEY);
  if (!raw) return { version: 1, folders: [] };
  // parse + sanitize...
}

async function mutateLibraryFoldersState({ store }, mutator) {
  const state = await loadLibraryFoldersState({ store });
  const result = await mutator(state);
  await saveLibraryFoldersState({ store, state });
  return result;
}
```

**Step 2: Add symmetric assets helpers and exports**

```js
module.exports = {
  LIBRARY_FOLDERS_KEY,
  LIBRARY_ASSETS_KEY,
  loadLibraryFoldersState,
  saveLibraryFoldersState,
  mutateLibraryFoldersState,
  loadLibraryAssetsState,
  saveLibraryAssetsState,
  mutateLibraryAssetsState,
};
```

**Step 3: Run targeted tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
node --test tests/library-state.test.js
```

Expected: PASS.

**Step 4: Commit**

```bash
git add server/lib/libraryState.js tests/library-state.test.js
git commit -m "test+feat(library): add folders/assets state persistence helpers"
```

---

### Task 5: Lock Library Service Behavior With Failing Tests

**Files:**
- Create: `tests/library-service.test.js`
- Create (later): `server/services/library/libraryService.js`

**Step 1: Write failing tests for folder CRUD core paths**

```js
test("createLibraryService creates folder with blank cover by default", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  // expect created folder fields: coverType=blank, parentId=null
});
```

**Step 2: Write failing tests for asset ingest in embed/download**

```js
test("uploadAsset stores .ggb and generates viewer only in embed mode", async () => {
  const { createLibraryService } = require("../server/services/library/libraryService");
  // stub adapter registry + store.writeBuffer and assert viewer file behavior
});
```

**Step 3: Write failing tests for delete guard**

```js
test("deleteFolder rejects non-empty folder with folder_not_empty", async () => {
  // expect { status: 409, error: "folder_not_empty" }
});
```

**Step 4: Run targeted tests to confirm failure**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
node --test tests/library-service.test.js
```

Expected: FAIL (missing service module).

**Step 5: Commit**

No commit (red phase).

---

### Task 6: Implement Library Service (Folders, Cover, Assets, Open URL)

**Files:**
- Create: `server/services/library/libraryService.js`
- Modify: `server/services/library/adapters/geogebra.js`
- Test: `tests/library-service.test.js`

**Step 1: Implement `createFolder`, `listFolders`, `getFolderById`**

```js
async function createFolder({ name, categoryId, coverType }) {
  const now = new Date().toISOString();
  const folder = {
    id: `f_${crypto.randomUUID()}`,
    name: String(name || "").trim(),
    categoryId: normalizeCategoryId(categoryId),
    coverType: coverType === "image" ? "image" : "blank",
    coverPath: "",
    parentId: null,
    order: 0,
    createdAt: now,
    updatedAt: now,
  };
  await mutateLibraryFoldersState({ store }, (state) => state.folders.push(folder));
  return folder;
}
```

**Step 2: Implement `uploadFolderCover` with image whitelist**

```js
if (!/^image\//.test(String(mimeType || ""))) {
  return { status: 400, error: "cover_invalid_type" };
}
await store.writeBuffer(`library/covers/${folderId}${ext}`, fileBuffer, { contentType: mimeType });
```

**Step 3: Implement `uploadAsset` with adapter matching + embed/download**

```js
const adapter = adapterRegistry.findForFile({ fileName: originalName });
if (!adapter) return { status: 400, error: "unsupported_asset_type" };
if (openMode !== "embed" && openMode !== "download") return { status: 400, error: "invalid_open_mode" };
```

```js
const sourceKey = `library/assets/${assetId}/source/${safeName}`;
await store.writeBuffer(sourceKey, fileBuffer, { contentType: "application/octet-stream" });
if (openMode === "embed") {
  const viewer = await adapter.buildViewer({ openMode, assetPublicFileUrl: `/${"content/" + sourceKey}` });
  if (!viewer.generated) return { status: 500, error: "adapter_render_failed" };
  await store.writeBuffer(`library/assets/${assetId}/viewer/index.html`, Buffer.from(viewer.html, "utf8"), {
    contentType: "text/html; charset=utf-8",
  });
}
```

**Step 4: Implement `getAssetOpenInfo` + delete guards**

```js
if (asset.openMode === "embed") return { openUrl: `/content/library/assets/${asset.id}/viewer/index.html`, mode: "embed" };
return { openUrl: `/content/library/assets/${asset.id}/source/${asset.fileName}`, mode: "download" };
```

**Step 5: Re-run service tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
node --test tests/library-service.test.js
```

Expected: PASS.

**Step 6: Commit**

```bash
git add server/services/library tests/library-service.test.js
git commit -m "test+feat(library): add folder and ggb asset service with open modes"
```

---

### Task 7: Lock Library Route Contract With Failing Tests

**Files:**
- Create: `tests/library-route-api.test.js`
- Create (later): `server/routes/library.js`
- Modify (later): `server/app.js`

**Step 1: Write failing API tests for auth + CRUD + upload**

```js
test("library routes require admin auth for write endpoints", async () => {
  // POST /api/library/folders => 401 when unauthenticated
});

test("GET /api/library/catalog returns folder summary for public", async () => {
  // include folder card fields for frontend catalog merge
});
```

**Step 2: Run targeted route test and verify failure**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
node --test tests/library-route-api.test.js
```

Expected: FAIL (route not wired yet).

**Step 3: Commit**

No commit (red phase).

---

### Task 8: Implement Library Routes + App Wiring + Static Serve

**Files:**
- Create: `server/routes/library.js`
- Modify: `server/app.js`
- Test: `tests/library-route-api.test.js`

**Step 1: Add `/api/library/*` router with zod schemas**

```js
router.post("/library/folders", authRequired, asyncHandler(async (req, res) => {
  const body = parseWithSchema(createFolderSchema, req.body);
  const out = await libraryService.createFolder(body);
  res.json({ ok: true, folder: out });
}));
```

```js
router.post("/library/folders/:id/assets", authRequired, upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file?.buffer?.length) return res.status(400).json({ error: "missing_file" });
  const out = await libraryService.uploadAsset({ folderId: req.params.id, fileBuffer: req.file.buffer, originalName: req.file.originalname, openMode: req.body?.openMode });
  if (out?.error) return res.status(out.status || 500).json({ error: out.error });
  res.json({ ok: true, asset: out.asset });
}));
```

**Step 2: Wire route in `server/app.js` and expose `/content/library/*`**

```js
app.use("/api", createLibraryRouter({ rootDir, authConfig, store }));
app.get(/^\/content\/library\/.*/, async (req, res, next) => {
  const key = safeContentKey(req.path, "library");
  // stream from store with guessContentType
});
```

**Step 3: Run route tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
node --test tests/library-route-api.test.js
```

Expected: PASS.

**Step 4: Commit**

```bash
git add server/routes/library.js server/app.js tests/library-route-api.test.js
git commit -m "test+feat(library): add library api routes and static content streaming"
```

---

### Task 9: Lock Frontend Integration With Failing Tests

**Files:**
- Create: `frontend/test/library-api.test.ts`
- Create: `frontend/test/library-routes.test.ts`
- Create: `frontend/test/library-catalog-card.test.ts`
- Create: `frontend/test/library-folder-view.test.ts`
- Create (later): `frontend/src/features/library/libraryApi.ts`
- Create (later): `frontend/src/features/library/types.ts`
- Create (later): `frontend/src/views/LibraryFolderView.vue`
- Create (later): `frontend/src/views/admin/AdminLibraryView.vue`
- Modify (later): `frontend/src/router/routes.ts`
- Modify (later): `frontend/src/views/CatalogView.vue`
- Modify (later): `frontend/src/views/admin/AdminLayoutView.vue`

**Step 1: Write failing tests for library frontend API wrapper**

```ts
it("listLibraryCatalog maps folders payload", async () => {
  // mock fetch /api/library/catalog and assert parser output
});
```

**Step 2: Write failing tests for new routes**

```ts
it("registers /library/folder/:id and /admin/library routes", () => {
  // inspect route table
});
```

**Step 3: Write failing tests for catalog folder card and folder view open/download UI**

```ts
it("CatalogView renders folder cards when library catalog has folders", () => {
  // assert folder card marker class/text
});
```

```ts
it("LibraryFolderView renders assets and action links from openMode", () => {
  // embed => open button, download => download button
});
```

**Step 4: Run frontend target tests to confirm failure**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
npm --prefix frontend run test -- test/library-api.test.ts test/library-routes.test.ts test/library-catalog-card.test.ts test/library-folder-view.test.ts
```

Expected: FAIL (missing modules/views/routes).

**Step 5: Commit**

No commit (red phase).

---

### Task 10: Implement Frontend Library Pages And Catalog Merge

**Files:**
- Create: `frontend/src/features/library/types.ts`
- Create: `frontend/src/features/library/libraryApi.ts`
- Create: `frontend/src/views/LibraryFolderView.vue`
- Create: `frontend/src/views/admin/AdminLibraryView.vue`
- Modify: `frontend/src/router/routes.ts`
- Modify: `frontend/src/views/CatalogView.vue`
- Modify: `frontend/src/views/admin/AdminLayoutView.vue`
- Modify: `frontend/src/features/admin/adminApi.ts` (add admin library calls if reused)
- Test: `frontend/test/library-api.test.ts`
- Test: `frontend/test/library-routes.test.ts`
- Test: `frontend/test/library-catalog-card.test.ts`
- Test: `frontend/test/library-folder-view.test.ts`

**Step 1: Implement typed library API client**

```ts
export async function listLibraryCatalog(): Promise<LibraryCatalog> {
  return apiFetch("/api/library/catalog", { method: "GET" });
}

export async function getLibraryFolderAssets(folderId: string): Promise<LibraryAsset[]> {
  const data = await apiFetch(`/api/library/folders/${encodeURIComponent(folderId)}/assets`, { method: "GET" });
  return Array.isArray(data?.assets) ? data.assets : [];
}
```

**Step 2: Add public folder detail route + admin library route**

```ts
{ path: "/library/folder/:id", name: "library-folder", component: LibraryFolderView, props: true }
{ path: "library", name: "admin-library", component: AdminLibraryView }
```

**Step 3: Update catalog page to render folder cards**

```vue
<a v-for="folder in folders" :key="folder.id" class="catalog-card catalog-folder-card" :href="`/library/folder/${encodeURIComponent(folder.id)}`">
  <div class="catalog-card-title">{{ folder.name }}</div>
  <div class="catalog-card-desc">文件夹 · {{ folder.assetCount }} 个资源</div>
</a>
```

**Step 4: Implement folder detail view and open/download actions**

```vue
<a v-if="asset.openMode === 'embed'" :href="asset.openUrl" target="_blank" rel="noreferrer">打开演示</a>
<a v-else :href="asset.openUrl" download>下载文件</a>
```

**Step 5: Implement admin library view**

```vue
<!-- create folder, upload cover, upload .ggb with openMode -->
<input type="file" accept=".ggb,application/vnd.geogebra.file" />
<select v-model="openMode"><option value="embed">容器页打开</option><option value="download">仅下载</option></select>
```

**Step 6: Run frontend target tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
npm --prefix frontend run test -- test/library-api.test.ts test/library-routes.test.ts test/library-catalog-card.test.ts test/library-folder-view.test.ts
```

Expected: PASS.

**Step 7: Commit**

```bash
git add frontend/src/features/library frontend/src/views/LibraryFolderView.vue frontend/src/views/admin/AdminLibraryView.vue frontend/src/router/routes.ts frontend/src/views/CatalogView.vue frontend/src/views/admin/AdminLayoutView.vue frontend/src/features/admin/adminApi.ts frontend/test/library-*.test.ts
git commit -m "test+feat(frontend): add library folder browsing and admin management ui"
```

---

### Task 11: API/README Docs Update

**Files:**
- Modify: `docs/guides/api.md`
- Modify: `README.md`

**Step 1: Add library endpoint section in API guide**

Include:
- `GET /api/library/catalog`
- `POST /api/library/folders`
- `POST /api/library/folders/:id/assets`
- `GET /api/library/assets/:id`
- auth requirements and error codes.

**Step 2: Update README capability bullets**

Add:
- 文件夹封面（空白/图片）
- `.ggb` 上传与容器页自动接入
- 下载模式支持

**Step 3: Commit**

```bash
git add docs/guides/api.md README.md
git commit -m "docs(library): document folder and ggb library APIs"
```

---

### Task 12: Full Verification + Integration Commit

**Files:**
- All modified files in branch

**Step 1: Run backend full tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
npm test
```

Expected: PASS.

**Step 2: Run frontend full tests**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
npm run test:frontend
```

Expected: PASS.

**Step 3: Run frontend production build**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
npm run build:frontend
```

Expected: PASS, dist artifacts generated.

**Step 4: Sanity smoke checks**

Run:
```bash
cd /Users/lvxiaoer/Documents/physicsAnimations/.worktrees/library-resource-platform-phase1
npm run smoke:spa-public
npm run smoke:spa-admin
```

Expected: PASS.

**Step 5: Final commit (if there are staged leftovers after task commits)**

```bash
git add -A
git commit -m "feat(library): ship phase1 folder + ggb extensible platform support"
```

If no changes remain, skip commit.
