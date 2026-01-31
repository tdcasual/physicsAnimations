import {
  clearToken,
  createCategory,
  createLink,
  deleteCategory,
  deleteItem,
  getToken,
  setToken,
  listCategories,
  listItems,
  login,
  me,
  tryGetCatalog,
  updateCategory,
  updateItem,
  updateAccount,
  getSystemInfo,
  updateSystemStorage,
  uploadHtml,
} from "./api.js";

function $(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

function safeText(text) {
  if (typeof text !== "string") return "";
  return text;
}

function buildBuiltinItem({ categoryId, item }) {
  const file = safeText(item.file || "");
  const thumbnail = safeText(item.thumbnail || "");
  return {
    id: file,
    type: "builtin",
    categoryId,
    title: safeText(item.title || file.replace(/\.html$/i, "")),
    description: safeText(item.description || ""),
    src: `animations/${file}`,
    href: `animations/${file}`,
    thumbnail,
  };
}

async function loadBuiltinCatalog() {
  const response = await fetch("animations.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();

  const categories = {};
  for (const [categoryId, category] of Object.entries(data)) {
    categories[categoryId] = {
      id: categoryId,
      title: safeText(category.title || categoryId),
      items: (category.items || []).map((item) => buildBuiltinItem({ categoryId, item })),
    };
  }
  return { categories };
}

function normalizeCatalog(catalog) {
  if (!catalog?.categories) return { categories: {} };
  return catalog;
}

function setLoading(loading) {
  $("#loading").classList.toggle("hidden", !loading);
}

function showToast(message, { kind = "info", timeoutMs = 2500 } = {}) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.dataset.kind = kind;
  toast.classList.remove("hidden");
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => toast.classList.add("hidden"), timeoutMs);
}

function buildTabButton({ id, title, active }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `tab ${active ? "active" : ""}`;
  button.dataset.category = id;
  button.textContent = title;
  return button;
}

function buildCard(item) {
  const href = item.src || item.href || "#";
  const link = document.createElement("a");
  link.className = "card";
  link.href = href;
  link.dataset.category = item.categoryId;
  link.dataset.title = item.title.toLowerCase();
  link.dataset.description = item.description.toLowerCase();

  const thumb = document.createElement("div");
  thumb.className = "thumb";
  if (item.thumbnail) {
    const img = document.createElement("img");
    img.src = item.thumbnail;
    img.alt = "";
    img.loading = "lazy";
    thumb.appendChild(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "thumb-placeholder";
    placeholder.textContent = item.title.slice(0, 1) || "?";
    thumb.appendChild(placeholder);
  }

  const body = document.createElement("div");
  body.className = "card-body";

  const header = document.createElement("div");
  header.className = "card-header";

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = item.title;

  const badges = document.createElement("div");
  badges.className = "badges";
  if (item.type === "link") {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "链接";
    badges.appendChild(badge);
  }

  header.append(title, badges);

  const desc = document.createElement("div");
  desc.className = "card-desc";
  desc.textContent = item.description || "点击查看详情…";

  body.append(header, desc);

  link.append(thumb, body);
  return link;
}

function render({ catalog, selectedCategoryId, query }) {
  const tabs = $("#category-tabs");
  const grid = $("#card-grid");

  tabs.innerHTML = "";
  grid.querySelectorAll(".card").forEach((n) => n.remove());

  const categories = Object.values(catalog.categories || {});
  categories.sort((a, b) => {
    const orderDiff = (b.order || 0) - (a.order || 0);
    if (orderDiff) return orderDiff;
    return a.title.localeCompare(b.title, "zh-CN");
  });

  const allItems = categories.flatMap((c) => c.items || []);
  const hasAny = allItems.length > 0;

  const allTab = buildTabButton({ id: "all", title: "全部", active: selectedCategoryId === "all" });
  tabs.appendChild(allTab);
  for (const category of categories) {
    const btn = buildTabButton({
      id: category.id,
      title: category.title,
      active: selectedCategoryId === category.id,
    });
    tabs.appendChild(btn);
  }

  const q = (query || "").trim().toLowerCase();

  for (const item of allItems) {
    const matchesCategory = selectedCategoryId === "all" || item.categoryId === selectedCategoryId;
    const matchesQuery =
      !q ||
      item.title.toLowerCase().includes(q) ||
      (item.description || "").toLowerCase().includes(q);

    if (!matchesCategory || !matchesQuery) continue;
    grid.appendChild(buildCard(item));
  }

  if (!hasAny) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "未找到任何作品。";
    grid.appendChild(empty);
  }
}

function initTheme() {
  const key = "pa_theme";
  const root = document.documentElement;
  const saved = localStorage.getItem(key);
  if (saved === "dark" || saved === "light") {
    root.dataset.theme = saved;
  }

  $("#theme-toggle").addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    localStorage.setItem(key, next);
  });
}

function openLoginModal() {
  $("#login-modal-backdrop").classList.remove("hidden");
  const modal = $("#login-modal");
  modal.classList.remove("hidden");
  modal.showModal();
  $("#login-username").focus();
}

function closeLoginModal() {
  $("#login-modal-backdrop").classList.add("hidden");
  const modal = $("#login-modal");
  modal.classList.add("hidden");
  modal.close();
}

function setLoginUi({ loggedIn }) {
  $("#login-button").classList.toggle("hidden", loggedIn);
  $("#admin-button").classList.toggle("hidden", !loggedIn);
}

async function bootstrapAuth() {
  const token = getToken();
  if (!token) {
    setLoginUi({ loggedIn: false });
    return;
  }

  try {
    await me();
    setLoginUi({ loggedIn: true });
  } catch {
    clearToken();
    setLoginUi({ loggedIn: false });
  }
}

function initLogin() {
  $("#login-button").addEventListener("click", () => openLoginModal());
  $("#login-modal-backdrop").addEventListener("click", () => closeLoginModal());
  $("#login-close").addEventListener("click", () => closeLoginModal());
  $("#login-cancel").addEventListener("click", () => closeLoginModal());

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#login-error").classList.add("hidden");
    $("#login-submit").disabled = true;

    try {
      await login({
        username: $("#login-username").value,
        password: $("#login-password").value,
      });
      setLoginUi({ loggedIn: true });
      closeLoginModal();
      showToast("登录成功", { kind: "success" });
    } catch (err) {
      const status = err?.status;
      const retryAfterSeconds = err?.data?.retryAfterSeconds;

      let message = "登录失败，请稍后再试。";
      if (window.location.protocol === "file:") {
        message = "请先运行 `npm start`，并通过 http://localhost:4173 打开页面。";
      } else if (status === 401) {
        message = "用户名或密码错误。";
      } else if (status === 429) {
        message = retryAfterSeconds
          ? `尝试过于频繁，请 ${retryAfterSeconds} 秒后再试。`
          : "尝试过于频繁，请稍后再试。";
      } else if (status === 404) {
        message = "未找到登录接口，请确认你是通过 `npm start` 启动的地址访问。";
      } else if (!status) {
        message = "无法连接服务端，请确认已运行 `npm start`。";
      }

      $("#login-error").textContent = message;
      $("#login-error").classList.remove("hidden");
    } finally {
      $("#login-submit").disabled = false;
    }
  });

}

async function initCatalog() {
  setLoading(true);
  try {
    const apiCatalog = await tryGetCatalog();
    return normalizeCatalog(apiCatalog);
  } catch {
    return normalizeCatalog(await loadBuiltinCatalog());
  } finally {
    setLoading(false);
  }
}

async function refreshCatalog(state) {
  state.catalog = await initCatalog();
  render({ catalog: state.catalog, selectedCategoryId: state.selectedCategoryId, query: state.query });
}

function initFiltering({ state }) {
  const rerender = () =>
    render({
      catalog: state.catalog,
      selectedCategoryId: state.selectedCategoryId,
      query: state.query,
    });

  $("#category-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button.tab");
    if (!btn) return;
    state.selectedCategoryId = btn.dataset.category;
    rerender();
    btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  });

  $("#search-input").addEventListener("input", (e) => {
    state.query = e.target.value;
    rerender();
  });

  rerender();
}

function openAdminModal() {
  $("#admin-modal-backdrop").classList.remove("hidden");
  const modal = $("#admin-modal");
  modal.classList.remove("hidden");
  modal.showModal();
}

function closeAdminModal() {
  $("#admin-modal-backdrop").classList.add("hidden");
  const modal = $("#admin-modal");
  modal.classList.add("hidden");
  modal.close();
}

function sortCategoryList(list) {
  const categories = [...(list || [])];
  categories.sort((a, b) => {
    const orderDiff = (b.order || 0) - (a.order || 0);
    if (orderDiff) return orderDiff;
    return safeText(a.title).localeCompare(safeText(b.title), "zh-CN");
  });
  return categories;
}

function fillCategorySelect(selectEl, categories) {
  const list = sortCategoryList(categories);
  selectEl.innerHTML = "";

  for (const category of list) {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.hidden ? `${category.title}（隐藏）` : category.title;
    selectEl.appendChild(option);
  }

  if (!list.length) {
    const option = document.createElement("option");
    option.value = "other";
    option.textContent = "其他";
    selectEl.appendChild(option);
  }
}

function isAdminOpen() {
  const modal = $("#admin-modal");
  return modal.open && !modal.classList.contains("hidden");
}

function setAdminTab(state, tabId) {
  state.admin.tab = tabId;

  const titles = {
    dashboard: "概览",
    content: "内容管理",
    uploads: "上传管理",
    categories: "分类管理",
    account: "账号设置",
    system: "系统设置",
  };
  $("#admin-section-title").textContent = titles[tabId] || "管理面板";

  const panels = {
    dashboard: "#admin-panel-dashboard",
    content: "#admin-panel-content",
    uploads: "#admin-panel-uploads",
    categories: "#admin-panel-categories",
    account: "#admin-panel-account",
    system: "#admin-panel-system",
  };
  Object.entries(panels).forEach(([key, selector]) => {
    $(selector).classList.toggle("hidden", tabId !== key);
  });

  $("#admin-tabs")
    .querySelectorAll("button[data-admin-tab]")
    .forEach((btn) => {
      const active = btn.dataset.adminTab === tabId;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
}

async function loadAdminCategories(state) {
  const data = await listCategories();
  state.admin.categories = Array.isArray(data?.categories) ? data.categories : [];

  fillCategorySelect($("#upload-category"), state.admin.categories);
  fillCategorySelect($("#link-category"), state.admin.categories);

  renderAdminCategories(state);
  Object.keys(state.admin.lists).forEach((key) => {
    if (state.admin.lists[key]?.loaded) renderAdminList(state, key);
  });
}

async function loadAccountInfo(state) {
  const data = await me();
  const username = data?.username || "";
  state.admin.account.username = username;
  $("#account-username-text").textContent = username || "-";
  $("#account-new-username").value = username || "";
}

function formatTimestamp(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

async function loadSystemInfo(state) {
  const data = await getSystemInfo();
  const storage = data?.storage || {};
  const webdav = storage.webdav || {};

  $("#system-configured-mode").textContent = storage.mode || "-";
  $("#system-effective-mode").textContent = storage.effectiveMode || storage.mode || "-";
  $("#system-local-path").textContent = storage.localPath || "-";
  $("#system-webdav-url").textContent = webdav.url || "-";
  $("#system-webdav-base").textContent = webdav.basePath || "-";
  $("#system-webdav-user").textContent = webdav.username || "-";
  $("#system-webdav-pass").textContent = webdav.hasPassword ? "已配置" : "未配置";
  $("#system-last-sync").textContent = formatTimestamp(storage.lastSyncedAt);

  const uiMode = storage.mode === "webdav" ? "hybrid" : storage.mode || "local";
  $("#system-mode-input").value = uiMode;
  $("#system-webdav-url-input").value = webdav.url || "";
  $("#system-webdav-base-input").value = webdav.basePath || "physicsAnimations";
  $("#system-webdav-username-input").value = webdav.username || "";
  $("#system-webdav-timeout-input").value =
    typeof webdav.timeoutMs === "number" ? String(webdav.timeoutMs) : "15000";
  $("#system-webdav-password-input").value = "";
  $("#system-sync-on-save").checked = false;
  $("#system-sync-now").disabled = !webdav.url;

  state.admin.system.mode = uiMode;
  state.admin.system.loaded = true;
}

function normalizeWebdavBasePath(value) {
  const trimmed = String(value || "").trim();
  return trimmed || "physicsAnimations";
}

function readSystemForm() {
  const mode = $("#system-mode-input").value || "local";
  const url = $("#system-webdav-url-input").value.trim();
  const basePath = normalizeWebdavBasePath($("#system-webdav-base-input").value);
  const username = $("#system-webdav-username-input").value.trim();
  const password = $("#system-webdav-password-input").value;
  const timeoutRaw = $("#system-webdav-timeout-input").value.trim();
  const timeoutMs = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : NaN;

  const webdav = {
    url,
    basePath,
    username,
  };
  if (password) webdav.password = password;
  if (Number.isFinite(timeoutMs)) webdav.timeoutMs = timeoutMs;

  const sync = $("#system-sync-on-save").checked;
  return { mode, webdav, sync };
}

async function loadAdminStats(state) {
  const [all, uploads, links, categories] = await Promise.all([
    listItems({ page: 1, pageSize: 1 }),
    listItems({ page: 1, pageSize: 1, type: "upload" }),
    listItems({ page: 1, pageSize: 1, type: "link" }),
    listCategories(),
  ]);

  const categoriesList = Array.isArray(categories?.categories) ? categories.categories : [];
  const builtinTotal = categoriesList.reduce((sum, c) => sum + (c.builtinCount || 0), 0);
  const categoryCount = categoriesList.length;

  const dynamicTotal = Number(all?.total || 0);
  const uploadTotal = Number(uploads?.total || 0);
  const linkTotal = Number(links?.total || 0);

  $("#admin-stat-total").textContent = String(dynamicTotal + builtinTotal);
  $("#admin-stat-uploads").textContent = String(uploadTotal);
  $("#admin-stat-links").textContent = String(linkTotal);
  $("#admin-stat-builtins").textContent = String(builtinTotal);
  $("#admin-stat-categories").textContent = String(categoryCount);
}

async function ensureAdminTabData(state, tabId) {
  if (tabId === "dashboard") {
    await loadAdminStats(state);
  } else if (tabId === "content") {
    await reloadAdminList(state, "content", { reset: true });
  } else if (tabId === "uploads") {
    if (!state.admin.lists.uploads.loaded) {
      await reloadAdminList(state, "uploads", { reset: true });
    }
  } else if (tabId === "account") {
    await loadAccountInfo(state);
  } else if (tabId === "system") {
    if (!state.admin.system.loaded) {
      await loadSystemInfo(state);
    }
  }
}

function itemTypeLabel(type) {
  if (type === "link") return "链接";
  if (type === "upload") return "上传";
  if (type === "builtin") return "内置";
  return "未知";
}

function itemStatusText(item) {
  const parts = [];
  if (item.deleted === true) parts.push("已删除");
  if (item.published === false) parts.push("草稿");
  if (item.hidden === true) parts.push("隐藏");
  return parts.join(" · ");
}

const ADMIN_LIST_CONFIG = {
  content: {
    container: "#admin-items",
    meta: "#admin-items-meta",
    loadMore: "#admin-load-more",
    emptyText: (query) => (query ? "未找到匹配的内容。" : "暂无内容。"),
  },
  uploads: {
    container: "#admin-uploads",
    meta: "#admin-uploads-meta",
    loadMore: "#admin-uploads-load-more",
    emptyText: (query) => (query ? "未找到匹配的上传内容。" : "暂无上传内容。"),
  },
};

function renderAdminList(state, key) {
  const config = ADMIN_LIST_CONFIG[key];
  if (!config) return;

  const container = $(config.container);
  container.innerHTML = "";

  const listState = state.admin.lists[key];
  const categoriesById = new Map(state.admin.categories.map((c) => [c.id, c.title]));

  const items = listState.items || [];
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = config.emptyText(listState.query);
    container.appendChild(empty);
  } else {
    for (const item of items) {
      const row = document.createElement("div");
      row.className = "admin-item";
      row.dataset.id = item.id;

      const view = document.createElement("div");
      view.className = "admin-item-view";

      const main = document.createElement("div");
      main.className = "admin-item-main";

      const title = document.createElement("div");
      title.className = "admin-item-title";
      title.textContent = item.title || item.id;

      const meta = document.createElement("div");
      meta.className = "admin-item-meta";
      const categoryTitle = categoriesById.get(item.categoryId) || item.categoryId;
      const status = itemStatusText(item);
      const typeText = itemTypeLabel(item.type);
      meta.textContent = `${categoryTitle}${typeText ? ` · ${typeText}` : ""}${status ? ` · ${status}` : ""}`;

      main.append(title, meta);

      const actions = document.createElement("div");
      actions.className = "admin-item-actions";

      const open = document.createElement("a");
      open.className = "btn btn-ghost";
      open.href = `viewer.html?id=${encodeURIComponent(item.id)}`;
      open.target = "_blank";
      open.rel = "noreferrer";
      open.textContent = "预览";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn btn-ghost";
      editBtn.textContent = "编辑";
      editBtn.dataset.action = "edit";

      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-ghost danger";
      del.textContent = "删除";
      del.dataset.action = "delete";

      if (item.deleted === true) {
        const restoreBtn = document.createElement("button");
        restoreBtn.type = "button";
        restoreBtn.className = "btn btn-ghost";
        restoreBtn.textContent = "恢复";
        restoreBtn.dataset.action = "restore";
        actions.append(open, restoreBtn, editBtn);
      } else {
        actions.append(open, editBtn, del);
      }
      view.append(main, actions);

      const edit = document.createElement("div");
      edit.className = "admin-item-edit hidden";

      const grid = document.createElement("div");
      grid.className = "admin-item-edit-grid";

      const titleField = document.createElement("label");
      titleField.className = "field";
      titleField.innerHTML = `<span class="field-label">标题</span>`;
      const titleInput = document.createElement("input");
      titleInput.className = "field-input";
      titleInput.name = "title";
      titleInput.type = "text";
      titleInput.value = item.title || "";
      titleField.appendChild(titleInput);

      const categoryField = document.createElement("label");
      categoryField.className = "field";
      categoryField.innerHTML = `<span class="field-label">分类</span>`;
      const categorySelect = document.createElement("select");
      categorySelect.className = "field-input";
      categorySelect.name = "categoryId";
      fillCategorySelect(categorySelect, state.admin.categories);
      categorySelect.value = item.categoryId || "other";
      categoryField.appendChild(categorySelect);

      const orderField = document.createElement("label");
      orderField.className = "field";
      orderField.innerHTML = `<span class="field-label">排序（越大越靠前）</span>`;
      const orderInput = document.createElement("input");
      orderInput.className = "field-input";
      orderInput.name = "order";
      orderInput.type = "number";
      orderInput.value = String(item.order || 0);
      orderField.appendChild(orderInput);

      const flags = document.createElement("div");
      flags.className = "admin-item-flags";

      const publishedLabel = document.createElement("label");
      publishedLabel.className = "admin-check";
      const publishedInput = document.createElement("input");
      publishedInput.type = "checkbox";
      publishedInput.name = "published";
      publishedInput.checked = item.published !== false;
      publishedLabel.append(publishedInput, document.createTextNode("已发布"));

      const hiddenLabel = document.createElement("label");
      hiddenLabel.className = "admin-check";
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "checkbox";
      hiddenInput.name = "hidden";
      hiddenInput.checked = item.hidden === true;
      hiddenLabel.append(hiddenInput, document.createTextNode("隐藏"));

      flags.append(publishedLabel, hiddenLabel);

      const descField = document.createElement("label");
      descField.className = "field admin-item-edit-desc";
      descField.innerHTML = `<span class="field-label">描述</span>`;
      const descInput = document.createElement("textarea");
      descInput.className = "field-input field-textarea";
      descInput.name = "description";
      descInput.value = item.description || "";
      descField.appendChild(descInput);

      grid.append(titleField, categoryField, orderField, flags, descField);

      const editActions = document.createElement("div");
      editActions.className = "admin-actions";

      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "btn btn-primary";
      saveBtn.textContent = "保存";
      saveBtn.dataset.action = "save";

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "btn btn-ghost";
      cancelBtn.textContent = "取消";
      cancelBtn.dataset.action = "cancel";

      editActions.append(cancelBtn, saveBtn);
      edit.append(grid, editActions);

      row.append(view, edit);
      container.appendChild(row);
    }
  }

  const meta = $(config.meta);
  const total = listState.total || 0;
  meta.textContent = total ? `已加载 ${items.length} / ${total}` : "";

  const loadMore = $(config.loadMore);
  const hasMore = items.length < total;
  loadMore.classList.toggle("hidden", !hasMore);
  loadMore.disabled = listState.loading === true;
}

function renderAdminCategories(state) {
  const container = $("#admin-categories");
  container.innerHTML = "";

  const categories = sortCategoryList(state.admin.categories || []);
  if (!categories.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "暂无分类。";
    container.appendChild(empty);
    return;
  }

  for (const category of categories) {
    const row = document.createElement("div");
    row.className = "admin-category";
    row.dataset.id = category.id;

    const header = document.createElement("div");
    header.className = "admin-category-header";
    header.textContent = `${category.title} (${category.id})`;

    const meta = document.createElement("div");
    meta.className = "admin-category-meta";
    meta.textContent = `共 ${category.count} · 内置 ${category.builtinCount} · 新增 ${category.dynamicCount}`;

    const grid = document.createElement("div");
    grid.className = "admin-category-grid";

    const titleField = document.createElement("label");
    titleField.className = "field";
    titleField.innerHTML = `<span class="field-label">标题</span>`;
    const titleInput = document.createElement("input");
    titleInput.className = "field-input";
    titleInput.name = "title";
    titleInput.type = "text";
    titleInput.value = category.title || "";
    titleField.appendChild(titleInput);

    const orderField = document.createElement("label");
    orderField.className = "field";
    orderField.innerHTML = `<span class="field-label">排序（越大越靠前）</span>`;
    const orderInput = document.createElement("input");
    orderInput.className = "field-input";
    orderInput.name = "order";
    orderInput.type = "number";
    orderInput.value = String(category.order || 0);
    orderField.appendChild(orderInput);

    const hiddenField = document.createElement("label");
    hiddenField.className = "admin-check";
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "checkbox";
    hiddenInput.name = "hidden";
    hiddenInput.checked = category.hidden === true;
    hiddenField.append(hiddenInput, document.createTextNode("隐藏该分类（首页不显示）"));

    grid.append(titleField, orderField, hiddenField);

    const actions = document.createElement("div");
    actions.className = "admin-actions";

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "btn btn-ghost";
    resetBtn.textContent = "重置";
    resetBtn.dataset.action = "category-reset";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn-primary";
    saveBtn.textContent = "保存";
    saveBtn.dataset.action = "category-save";

    actions.append(resetBtn, saveBtn);

    row.append(header, meta, grid, actions);
    container.appendChild(row);
  }
}

function getListState(state, key) {
  return state.admin.lists[key];
}

async function reloadAdminList(state, key, { reset = false } = {}) {
  const listState = getListState(state, key);
  if (!listState || listState.loading) return;
  listState.loading = true;

  const reqId = (listState.reqId || 0) + 1;
  listState.reqId = reqId;

  try {
    const nextPage = reset ? 1 : (listState.page || 1) + 1;
    const page = reset ? 1 : nextPage;
    const pageSize = listState.pageSize || 24;
    const q = listState.query || "";
    const type = listState.type || "";

    const data = await listItems({ page, pageSize, q, type });
    if (listState.reqId !== reqId) return;

    const received = Array.isArray(data?.items) ? data.items : [];
    listState.page = data?.page || page;
    listState.pageSize = data?.pageSize || pageSize;
    listState.total = data?.total || 0;
    listState.items = reset ? received : [...(listState.items || []), ...received];
    listState.loaded = true;
  } finally {
    if (listState.reqId === reqId) listState.loading = false;
  }

  renderAdminList(state, key);
}

function initAdmin({ state }) {
  $("#admin-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-admin-tab]");
    if (!btn) return;
    setAdminTab(state, btn.dataset.adminTab);
    ensureAdminTabData(state, btn.dataset.adminTab).catch((err) => {
      if (err?.status === 401) {
        clearToken();
        setLoginUi({ loggedIn: false });
        closeAdminModal();
        return;
      }
      showToast("加载失败", { kind: "info" });
    });
  });

  $("#admin-button").addEventListener("click", async () => {
    openAdminModal();
    setAdminTab(state, state.admin.tab || "dashboard");
    $("#admin-items-search").value = state.admin.lists.content.query || "";
    $("#admin-uploads-search").value = state.admin.lists.uploads.query || "";

    try {
      await loadAdminCategories(state);
      await ensureAdminTabData(state, state.admin.tab || "dashboard");
    } catch (err) {
      if (err?.status === 401) {
        clearToken();
        setLoginUi({ loggedIn: false });
        closeAdminModal();
        showToast("登录已失效，请重新登录。", { kind: "info" });
        return;
      }
      showToast("加载管理数据失败", { kind: "info" });
    }
  });

  $("#admin-modal-backdrop").addEventListener("click", () => closeAdminModal());
  $("#admin-close").addEventListener("click", () => closeAdminModal());
  $("#admin-cancel").addEventListener("click", () => closeAdminModal());

  $("#logout-button").addEventListener("click", () => {
    clearToken();
    setLoginUi({ loggedIn: false });
    closeAdminModal();
    showToast("已退出登录", { kind: "info" });
  });

  let searchTimer = 0;
  $("#admin-items-search").addEventListener("input", (e) => {
    state.admin.lists.content.query = e.target.value || "";
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(async () => {
      try {
        await reloadAdminList(state, "content", { reset: true });
      } catch (err) {
        if (err?.status === 401) {
          clearToken();
          setLoginUi({ loggedIn: false });
          closeAdminModal();
          return;
        }
        showToast("搜索失败", { kind: "info" });
      }
    }, 250);
  });

  $("#admin-load-more").addEventListener("click", async () => {
    try {
      await reloadAdminList(state, "content");
    } catch (err) {
      if (err?.status === 401) {
        clearToken();
        setLoginUi({ loggedIn: false });
        closeAdminModal();
        return;
      }
      showToast("加载失败", { kind: "info" });
    }
  });

  let uploadSearchTimer = 0;
  $("#admin-uploads-search").addEventListener("input", (e) => {
    state.admin.lists.uploads.query = e.target.value || "";
    window.clearTimeout(uploadSearchTimer);
    uploadSearchTimer = window.setTimeout(async () => {
      try {
        await reloadAdminList(state, "uploads", { reset: true });
      } catch (err) {
        if (err?.status === 401) {
          clearToken();
          setLoginUi({ loggedIn: false });
          closeAdminModal();
          return;
        }
        showToast("搜索失败", { kind: "info" });
      }
    }, 250);
  });

  $("#admin-uploads-load-more").addEventListener("click", async () => {
    try {
      await reloadAdminList(state, "uploads");
    } catch (err) {
      if (err?.status === 401) {
        clearToken();
        setLoginUi({ loggedIn: false });
        closeAdminModal();
        return;
      }
      showToast("加载失败", { kind: "info" });
    }
  });

  $("#upload-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = $("#upload-file").files?.[0];
    if (!file) {
      showToast("请选择一个 HTML 或 ZIP 文件", { kind: "info" });
      return;
    }

    $("#upload-submit").disabled = true;
    try {
      await uploadHtml({
        file,
        categoryId: $("#upload-category").value,
        title: $("#upload-title").value,
        description: $("#upload-description").value,
      });
      $("#upload-file").value = "";
      $("#upload-title").value = "";
      $("#upload-description").value = "";
      showToast("上传成功", { kind: "success" });
      await refreshCatalog(state);
      if (isAdminOpen()) {
        await loadAdminCategories(state);
        await reloadAdminList(state, "content", { reset: true });
        await reloadAdminList(state, "uploads", { reset: true });
      }
    } catch (err) {
      if (err?.status === 401) {
        clearToken();
        setLoginUi({ loggedIn: false });
        closeAdminModal();
      }
      showToast("上传失败", { kind: "info" });
    } finally {
      $("#upload-submit").disabled = false;
    }
  });

  $("#link-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = $("#link-url").value;
    if (!url) {
      showToast("请填写链接", { kind: "info" });
      return;
    }

    $("#link-submit").disabled = true;
    try {
      await createLink({
        url,
        categoryId: $("#link-category").value,
        title: $("#link-title").value,
        description: $("#link-description").value,
      });
      $("#link-url").value = "";
      $("#link-title").value = "";
      $("#link-description").value = "";
      showToast("添加成功", { kind: "success" });
      await refreshCatalog(state);
      if (isAdminOpen()) {
        await loadAdminCategories(state);
        await reloadAdminList(state, "content", { reset: true });
        await reloadAdminList(state, "uploads", { reset: true });
      }
    } catch (err) {
      if (err?.status === 401) {
        clearToken();
        setLoginUi({ loggedIn: false });
        closeAdminModal();
      }
      showToast("添加失败", { kind: "info" });
    } finally {
      $("#link-submit").disabled = false;
    }
  });

  function bindAdminItemActions(containerSelector) {
    $(containerSelector).addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const row = btn.closest(".admin-item");
      const id = row?.dataset?.id;
      if (!id) return;

      const edit = row.querySelector(".admin-item-edit");
      const action = btn.dataset.action;

      if (action === "edit") {
        edit?.classList.toggle("hidden");
        return;
      }

      if (action === "cancel") {
        edit?.classList.add("hidden");
        return;
      }

      if (action === "save") {
        const title = row.querySelector('input[name="title"]')?.value ?? "";
        const description = row.querySelector('textarea[name="description"]')?.value ?? "";
        const categoryId = row.querySelector('select[name="categoryId"]')?.value ?? "other";
        const orderRaw = row.querySelector('input[name="order"]')?.value ?? "0";
        const order = Number.parseInt(orderRaw, 10);
        const published = row.querySelector('input[name="published"]')?.checked ?? true;
        const hidden = row.querySelector('input[name="hidden"]')?.checked ?? false;

        btn.disabled = true;
        try {
          await updateItem(id, {
            title: title.trim(),
            description: description.trim(),
            categoryId,
            order: Number.isFinite(order) ? order : 0,
            published,
            hidden,
          });
          showToast("已保存", { kind: "success" });
          edit?.classList.add("hidden");
          await refreshCatalog(state);
          await loadAdminCategories(state);
          await reloadAdminList(state, "content", { reset: true });
          await reloadAdminList(state, "uploads", { reset: true });
        } catch (err) {
          if (err?.status === 401) {
            clearToken();
            setLoginUi({ loggedIn: false });
            closeAdminModal();
            return;
          }
          showToast("保存失败", { kind: "info" });
        } finally {
          btn.disabled = false;
        }
        return;
      }

      if (action === "restore") {
        btn.disabled = true;
        try {
          await updateItem(id, { deleted: false });
          showToast("已恢复", { kind: "success" });
          await refreshCatalog(state);
          await loadAdminCategories(state);
          await reloadAdminList(state, "content", { reset: true });
          await reloadAdminList(state, "uploads", { reset: true });
        } catch (err) {
          if (err?.status === 401) {
            clearToken();
            setLoginUi({ loggedIn: false });
            closeAdminModal();
            return;
          }
          showToast("恢复失败", { kind: "info" });
        } finally {
          btn.disabled = false;
        }
        return;
      }

      if (action === "delete") {
        if (!window.confirm("确定删除这条内容吗？")) return;

        btn.disabled = true;
        try {
          await deleteItem(id);
          showToast("已删除", { kind: "success" });
          await refreshCatalog(state);
          await loadAdminCategories(state);
          await reloadAdminList(state, "content", { reset: true });
          await reloadAdminList(state, "uploads", { reset: true });
        } catch (err) {
          if (err?.status === 401) {
            clearToken();
            setLoginUi({ loggedIn: false });
            closeAdminModal();
            return;
          }
          showToast("删除失败", { kind: "info" });
        } finally {
          btn.disabled = false;
        }
      }
    });
  }

  bindAdminItemActions("#admin-items");
  bindAdminItemActions("#admin-uploads");

  $("#category-create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#category-create-submit").disabled = true;
    try {
      const id = $("#category-create-id").value.trim();
      const title = $("#category-create-title").value.trim();
      const orderRaw = $("#category-create-order").value;
      const hidden = $("#category-create-hidden").checked;
      const order = Number.parseInt(orderRaw || "0", 10);

      await createCategory({ id, title, order: Number.isFinite(order) ? order : 0, hidden });
      $("#category-create-id").value = "";
      $("#category-create-title").value = "";
      $("#category-create-order").value = "0";
      $("#category-create-hidden").checked = false;
      showToast("分类已创建", { kind: "success" });
      await loadAdminCategories(state);
      await refreshCatalog(state);
    } catch (err) {
      if (err?.status === 409) {
        showToast("该分类 ID 已存在", { kind: "info" });
        return;
      }
      if (err?.status === 401) {
        clearToken();
        setLoginUi({ loggedIn: false });
        closeAdminModal();
        return;
      }
      showToast("创建分类失败", { kind: "info" });
    } finally {
      $("#category-create-submit").disabled = false;
    }
  });

  $("#admin-categories").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const row = btn.closest(".admin-category");
    const id = row?.dataset?.id;
    if (!id) return;

    const action = btn.dataset.action;

    if (action === "category-reset") {
      btn.disabled = true;
      try {
        await deleteCategory(id);
        showToast("已重置", { kind: "success" });
        await loadAdminCategories(state);
        await refreshCatalog(state);
      } catch (err) {
        if (err?.status === 401) {
          clearToken();
          setLoginUi({ loggedIn: false });
          closeAdminModal();
          return;
        }
        showToast("重置失败", { kind: "info" });
      } finally {
        btn.disabled = false;
      }
      return;
    }

    if (action === "category-save") {
      const title = row.querySelector('input[name="title"]')?.value ?? "";
      const orderRaw = row.querySelector('input[name="order"]')?.value ?? "0";
      const hidden = row.querySelector('input[name="hidden"]')?.checked ?? false;
      const order = Number.parseInt(orderRaw || "0", 10);

      btn.disabled = true;
      try {
        await updateCategory(id, {
          title: title.trim(),
          order: Number.isFinite(order) ? order : 0,
          hidden,
        });
        showToast("分类已保存", { kind: "success" });
        await loadAdminCategories(state);
        await refreshCatalog(state);
      } catch (err) {
        if (err?.status === 401) {
          clearToken();
          setLoginUi({ loggedIn: false });
          closeAdminModal();
          return;
        }
        showToast("保存失败", { kind: "info" });
      } finally {
        btn.disabled = false;
      }
    }
  });

  $("#system-mode-input").addEventListener("change", (e) => {
    const nextMode = e.target.value || "local";
    if (nextMode === "hybrid" && state.admin.system.mode !== "hybrid") {
      $("#system-sync-on-save").checked = true;
    }
  });

  $("#system-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { mode, webdav, sync } = readSystemForm();

    if ((mode === "hybrid" || mode === "webdav") && !webdav.url) {
      showToast("请填写 WebDAV 地址", { kind: "info" });
      return;
    }

    $("#system-save").disabled = true;
    try {
      await updateSystemStorage({ mode, webdav, sync });
      $("#system-webdav-password-input").value = "";
      $("#system-sync-on-save").checked = false;
      await loadSystemInfo(state);
      showToast("已保存", { kind: "success" });
    } catch (err) {
      if (err?.status === 401) {
        clearToken();
        setLoginUi({ loggedIn: false });
        closeAdminModal();
        return;
      }
      if (err?.status === 400 && err?.data?.error === "webdav_missing_url") {
        showToast("请填写 WebDAV 地址", { kind: "info" });
        return;
      }
      showToast("保存失败", { kind: "info" });
    } finally {
      $("#system-save").disabled = false;
    }
  });

  $("#system-sync-now").addEventListener("click", async () => {
    $("#system-sync-now").disabled = true;
    try {
      await updateSystemStorage({ sync: true });
      await loadSystemInfo(state);
      showToast("同步完成", { kind: "success" });
    } catch (err) {
      if (err?.status === 401) {
        clearToken();
        setLoginUi({ loggedIn: false });
        closeAdminModal();
        return;
      }
      showToast("同步失败", { kind: "info" });
    } finally {
      $("#system-sync-now").disabled = false;
    }
  });

  $("#account-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = $("#account-current-password").value;
    const newUsernameRaw = $("#account-new-username").value;
    const newPassword = $("#account-new-password").value;
    const confirmPassword = $("#account-new-password-confirm").value;

    if (!currentPassword) {
      showToast("请输入当前密码", { kind: "info" });
      return;
    }
    if (!newUsernameRaw.trim() && !newPassword) {
      showToast("请填写新用户名或新密码", { kind: "info" });
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      showToast("两次密码不一致", { kind: "info" });
      return;
    }

    $("#account-submit").disabled = true;
    try {
      const data = await updateAccount({
        currentPassword,
        newUsername: newUsernameRaw.trim() || undefined,
        newPassword: newPassword || undefined,
      });
      if (data?.token) setToken(data.token);
      if (data?.username) {
        state.admin.account.username = data.username;
        $("#account-username-text").textContent = data.username;
        $("#account-new-username").value = data.username;
      }
      $("#account-current-password").value = "";
      $("#account-new-password").value = "";
      $("#account-new-password-confirm").value = "";
      showToast("账号信息已更新", { kind: "success" });
    } catch (err) {
      if (err?.status === 401 && err?.data?.error === "invalid_credentials") {
        showToast("当前密码错误", { kind: "info" });
        return;
      }
      if (err?.status === 400 && err?.data?.error === "no_changes") {
        showToast("请填写新用户名或新密码", { kind: "info" });
        return;
      }
      if (err?.status === 401) {
        clearToken();
        setLoginUi({ loggedIn: false });
        closeAdminModal();
        return;
      }
      showToast("更新失败", { kind: "info" });
    } finally {
      $("#account-submit").disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  initLogin();
  await bootstrapAuth();

  const state = {
    catalog: { categories: {} },
    selectedCategoryId: "all",
    query: "",
    admin: {
      tab: "dashboard",
      categories: [],
      lists: {
        content: {
          items: [],
          query: "",
          page: 1,
          pageSize: 24,
          total: 0,
          loading: false,
          reqId: 0,
          type: "",
          loaded: false,
        },
        uploads: {
          items: [],
          query: "",
          page: 1,
          pageSize: 24,
          total: 0,
          loading: false,
          reqId: 0,
          type: "upload",
          loaded: false,
        },
      },
      account: {
        username: "",
      },
      system: {
        loaded: false,
        mode: "local",
      },
    },
  };
  await refreshCatalog(state);
  initFiltering({ state });
  initAdmin({ state });
});
