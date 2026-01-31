import {
  clearToken,
  createCategory,
  createGroup,
  createLink,
  deleteCategory,
  deleteGroup,
  deleteItem,
  getToken,
  setToken,
  listCategories,
  listItems,
  login,
  me,
  tryGetCatalog,
  updateCategory,
  updateGroup,
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

function setHighlightedText(container, text, queryLower) {
  const raw = safeText(text);
  const q = safeText(queryLower).trim().toLowerCase();
  container.textContent = "";

  if (!q || !raw) {
    container.textContent = raw;
    return;
  }

  const lower = raw.toLowerCase();
  let offset = 0;
  while (offset < raw.length) {
    const idx = lower.indexOf(q, offset);
    if (idx === -1) break;

    if (idx > offset) {
      container.appendChild(document.createTextNode(raw.slice(offset, idx)));
    }

    const mark = document.createElement("mark");
    mark.className = "admin-highlight";
    mark.textContent = raw.slice(idx, idx + q.length);
    container.appendChild(mark);

    offset = idx + q.length;
  }

  if (offset < raw.length) {
    container.appendChild(document.createTextNode(raw.slice(offset)));
  }
}

function readStorageJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStorageJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

const DEFAULT_GROUP_ID = "physics";

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
      groupId: DEFAULT_GROUP_ID,
      title: safeText(category.title || categoryId),
      order: 0,
      hidden: false,
      items: (category.items || []).map((item) => buildBuiltinItem({ categoryId, item })),
    };
  }
  return {
    groups: {
      [DEFAULT_GROUP_ID]: {
        id: DEFAULT_GROUP_ID,
        title: "物理",
        order: 0,
        hidden: false,
        categories,
      },
    },
  };
}

function normalizeCatalog(catalog) {
  if (catalog?.groups && typeof catalog.groups === "object") return catalog;
  if (catalog?.categories && typeof catalog.categories === "object") {
    const categories = {};
    for (const [id, category] of Object.entries(catalog.categories)) {
      if (!category || typeof category !== "object") continue;
      categories[id] = {
        ...category,
        id: category.id || id,
        groupId: category.groupId || DEFAULT_GROUP_ID,
      };
    }
    return {
      groups: {
        [DEFAULT_GROUP_ID]: {
          id: DEFAULT_GROUP_ID,
          title: "物理",
          order: 0,
          hidden: false,
          categories,
        },
      },
    };
  }
  return { groups: {} };
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

function sortByOrderAndTitle(list) {
  const out = [...(list || [])];
  out.sort((a, b) => {
    const orderDiff = (b.order || 0) - (a.order || 0);
    if (orderDiff) return orderDiff;
    return safeText(a.title).localeCompare(safeText(b.title), "zh-CN");
  });
  return out;
}

function render({ catalog, selectedGroupId, selectedCategoryId, query }) {
  const groupTabs = $("#group-tabs");
  const categoryTabs = $("#category-tabs");
  const grid = $("#card-grid");

  groupTabs.innerHTML = "";
  categoryTabs.innerHTML = "";
  grid.querySelectorAll(".card").forEach((n) => n.remove());

  const groups = sortByOrderAndTitle(Object.values(catalog.groups || {}));
  const fallbackGroupId = groups[0]?.id || DEFAULT_GROUP_ID;
  const activeGroupId = groups.some((g) => g.id === selectedGroupId) ? selectedGroupId : fallbackGroupId;
  const activeGroup = (catalog.groups || {})[activeGroupId] || groups[0] || null;

  const allGroupItems = activeGroup ? Object.values(activeGroup.categories || {}).flatMap((c) => c.items || []) : [];
  const hasAny = allGroupItems.length > 0;

  const maxGroupTabs = 8;
  const directGroups = groups.slice(0, maxGroupTabs);
  const overflowGroups = groups.slice(maxGroupTabs);

  for (const group of directGroups) {
    const btn = buildTabButton({ id: group.id, title: group.title, active: group.id === activeGroupId });
    btn.dataset.group = group.id;
    groupTabs.appendChild(btn);
  }

  if (overflowGroups.length) {
    const select = document.createElement("select");
    const overflowActive = overflowGroups.some((g) => g.id === activeGroupId);
    select.className = `tab tab-select ${overflowActive ? "active" : ""}`;
    select.setAttribute("aria-label", "更多大类");

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "更多…";
    select.appendChild(placeholder);

    for (const group of overflowGroups) {
      const option = document.createElement("option");
      option.value = group.id;
      option.textContent = group.title || group.id;
      select.appendChild(option);
    }

    select.value = overflowActive ? activeGroupId : "";
    groupTabs.appendChild(select);
  }

  const categories = sortByOrderAndTitle(Object.values(activeGroup?.categories || {}));

  const allTab = buildTabButton({ id: "all", title: "全部", active: selectedCategoryId === "all" });
  categoryTabs.appendChild(allTab);

  const maxCategoryTabs = 10;
  const directCategories = categories.slice(0, maxCategoryTabs);
  const overflowCategories = categories.slice(maxCategoryTabs);

  for (const category of directCategories) {
    const btn = buildTabButton({ id: category.id, title: category.title, active: selectedCategoryId === category.id });
    categoryTabs.appendChild(btn);
  }

  if (overflowCategories.length) {
    const select = document.createElement("select");
    const overflowActive = overflowCategories.some((c) => c.id === selectedCategoryId);
    select.className = `tab tab-select ${overflowActive ? "active" : ""}`;
    select.setAttribute("aria-label", "更多分类");

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "更多…";
    select.appendChild(placeholder);

    for (const category of overflowCategories) {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.title || category.id;
      select.appendChild(option);
    }

    select.value = overflowActive ? selectedCategoryId : "";
    categoryTabs.appendChild(select);
  }

  const q = (query || "").trim().toLowerCase();

  for (const item of allGroupItems) {
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
  const groups = sortByOrderAndTitle(Object.values(state.catalog.groups || {}));
  const fallbackGroupId = groups[0]?.id || DEFAULT_GROUP_ID;
  const nextGroupId = groups.some((g) => g.id === state.selectedGroupId)
    ? state.selectedGroupId
    : fallbackGroupId;

  if (nextGroupId !== state.selectedGroupId) {
    state.selectedGroupId = nextGroupId;
    state.selectedCategoryId = "all";
  } else {
    state.selectedGroupId = nextGroupId;
  }

  const activeGroup = (state.catalog.groups || {})[state.selectedGroupId];
  const categoryIds = new Set(Object.keys(activeGroup?.categories || {}));
  if (state.selectedCategoryId !== "all" && !categoryIds.has(state.selectedCategoryId)) {
    state.selectedCategoryId = "all";
  }

  render({
    catalog: state.catalog,
    selectedGroupId: state.selectedGroupId,
    selectedCategoryId: state.selectedCategoryId,
    query: state.query,
  });
}

function initFiltering({ state }) {
  const viewStateKey = "pa_view_state";
  const persistViewState = () => {
    writeStorageJson(viewStateKey, {
      groupId: state.selectedGroupId,
      categoryId: state.selectedCategoryId,
    });
  };

  const rerender = () =>
    render({
      catalog: state.catalog,
      selectedGroupId: state.selectedGroupId,
      selectedCategoryId: state.selectedCategoryId,
      query: state.query,
    });

  $("#group-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button.tab");
    if (!btn) return;
    const nextGroupId = btn.dataset.group || btn.dataset.category;
    if (!nextGroupId) return;
    state.selectedGroupId = nextGroupId;
    state.selectedCategoryId = "all";
    persistViewState();
    rerender();
    btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  });

  $("#group-tabs").addEventListener("change", (e) => {
    const select = e.target.closest("select.tab-select");
    if (!select) return;
    const value = select.value || "";
    if (!value) return;
    state.selectedGroupId = value;
    state.selectedCategoryId = "all";
    persistViewState();
    rerender();
  });

  $("#category-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-category]");
    if (!btn) return;
    state.selectedCategoryId = btn.dataset.category;
    persistViewState();
    rerender();
    btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  });

  $("#category-tabs").addEventListener("change", (e) => {
    const select = e.target.closest("select.tab-select");
    if (!select) return;
    const value = select.value || "";
    if (!value) return;
    state.selectedCategoryId = value;
    persistViewState();
    rerender();
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

function sortGroupList(list) {
  const groups = [...(list || [])];
  groups.sort((a, b) => {
    const orderDiff = (b.order || 0) - (a.order || 0);
    if (orderDiff) return orderDiff;
    return safeText(a.title).localeCompare(safeText(b.title), "zh-CN");
  });
  return groups;
}

function fillGroupSelect(selectEl, groups) {
  const list = sortGroupList(groups);
  selectEl.innerHTML = "";

  for (const group of list) {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.hidden ? `${group.title}（隐藏）` : group.title;
    selectEl.appendChild(option);
  }

  if (!list.length) {
    const option = document.createElement("option");
    option.value = DEFAULT_GROUP_ID;
    option.textContent = "物理";
    selectEl.appendChild(option);
  }
}

function fillCategorySelect(
  selectEl,
  categories,
  { groupId = "", groupsById = new Map(), includeGroupPrefix = false } = {},
) {
  const list = sortCategoryList(categories).filter((c) => {
    if (!groupId) return true;
    return c.groupId === groupId;
  });
  selectEl.innerHTML = "";

  for (const category of list) {
    const option = document.createElement("option");
    option.value = category.id;
    const groupTitle = groupsById.get(category.groupId) || category.groupId || "";
    const prefix = includeGroupPrefix && groupTitle ? `${groupTitle} / ` : "";
    const label = `${prefix}${category.title || category.id}`;
    option.textContent = category.hidden ? `${label}（隐藏）` : label;
    selectEl.appendChild(option);
  }

  if (!list.length) {
    const option = document.createElement("option");
    option.value = "other";
    option.textContent = "其他";
    selectEl.appendChild(option);
  }
}

function formatAdminPathText({ groups, categories, groupId, categoryId }) {
  if (!groupId || !categoryId) return "";
  const group = (groups || []).find((g) => g.id === groupId);
  const category = (categories || []).find((c) => c.id === categoryId);
  const groupTitle = group?.title || groupId;
  const categoryTitle = category?.title || categoryId;
  return `将添加到：${groupTitle} (${groupId}) / ${categoryTitle} (${categoryId})`;
}

function updateAdminPathHints(state) {
  const groups = state?.admin?.taxonomy?.groups || [];
  const categories = state?.admin?.taxonomy?.categories || [];

  const uploadHint = document.querySelector("#upload-path");
  if (uploadHint) {
    uploadHint.textContent = formatAdminPathText({
      groups,
      categories,
      groupId: document.querySelector("#upload-group")?.value || "",
      categoryId: document.querySelector("#upload-category")?.value || "",
    });
  }

  const linkHint = document.querySelector("#link-path");
  if (linkHint) {
    linkHint.textContent = formatAdminPathText({
      groups,
      categories,
      groupId: document.querySelector("#link-group")?.value || "",
      categoryId: document.querySelector("#link-category")?.value || "",
    });
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
  const groups = Array.isArray(data?.groups) ? data.groups : [];
  const categories = Array.isArray(data?.categories) ? data.categories : [];

  state.admin.taxonomy.groups = groups;
  state.admin.taxonomy.categories = categories;

  fillGroupSelect($("#upload-group"), groups);
  fillGroupSelect($("#link-group"), groups);

  if (!state.admin.taxonomy.ui) {
    state.admin.taxonomy.ui = {
      search: "",
      showHidden: false,
      openGroups: new Set([DEFAULT_GROUP_ID]),
      openCategories: new Set(),
    };
  }
  $("#taxonomy-search").value = state.admin.taxonomy.ui.search || "";
  $("#taxonomy-show-hidden").checked = state.admin.taxonomy.ui.showHidden === true;

  const defaultGroupId =
    groups.find((g) => g.id === state.selectedGroupId)?.id || groups[0]?.id || DEFAULT_GROUP_ID;

  if ($("#upload-group").value !== defaultGroupId) $("#upload-group").value = defaultGroupId;
  if ($("#link-group").value !== defaultGroupId) $("#link-group").value = defaultGroupId;

  const prevUploadCategory = $("#upload-category").value;
  fillCategorySelect($("#upload-category"), categories, { groupId: $("#upload-group").value });
  if (prevUploadCategory) $("#upload-category").value = prevUploadCategory;

  const prevLinkCategory = $("#link-category").value;
  fillCategorySelect($("#link-category"), categories, { groupId: $("#link-group").value });
  if (prevLinkCategory) $("#link-category").value = prevLinkCategory;

  updateAdminPathHints(state);

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
  $("#system-scan-remote-on-sync").checked = webdav.scanRemote === true;
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
  const scanRemote = $("#system-scan-remote-on-sync").checked === true;

  const webdav = {
    url,
    basePath,
    username,
    scanRemote,
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
  const groupsById = new Map(state.admin.taxonomy.groups.map((g) => [g.id, g.title]));
  const categoriesById = new Map(
    state.admin.taxonomy.categories.map((c) => {
      const groupTitle = groupsById.get(c.groupId) || c.groupId || "";
      const label = groupTitle ? `${groupTitle} / ${c.title}` : c.title;
      return [c.id, label];
    }),
  );

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
      fillCategorySelect(categorySelect, state.admin.taxonomy.categories, {
        groupsById,
        includeGroupPrefix: true,
      });
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
  const tree = $("#admin-taxonomy");
  const editor = $("#admin-taxonomy-editor");
  tree.innerHTML = "";
  editor.innerHTML = "";

  const ui = state.admin.taxonomy.ui || {
    search: "",
    showHidden: false,
    openGroups: new Set([DEFAULT_GROUP_ID]),
    openCategories: new Set(),
  };

  const q = safeText(ui.search).trim().toLowerCase();
  const showHidden = ui.showHidden === true;

  const groups = sortGroupList(state.admin.taxonomy.groups || []);
  const categories = [...(state.admin.taxonomy.categories || [])];

  const groupsById = new Map(groups.map((g) => [g.id, g]));
  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  const categoriesByGroupId = new Map();
  for (const category of categories) {
    const groupId = safeText(category.groupId || DEFAULT_GROUP_ID) || DEFAULT_GROUP_ID;
    if (!categoriesByGroupId.has(groupId)) categoriesByGroupId.set(groupId, []);
    categoriesByGroupId.get(groupId).push({ ...category, groupId });
  }

  function matchesEntity(entity) {
    if (!q) return true;
    const id = safeText(entity?.id).toLowerCase();
    const title = safeText(entity?.title).toLowerCase();
    return id.includes(q) || title.includes(q);
  }

  function groupMetaText({ group, visibleCategories }) {
    const totalCategories = Number(group.categoryCount || 0);
    const shownCategories = visibleCategories.length;

    const totalItems = Number(group.count || 0);
    const shownItems = visibleCategories.reduce((sum, c) => sum + Number(c.count || 0), 0);

    const categoryText =
      totalCategories && shownCategories !== totalCategories
        ? `分类 ${shownCategories}/${totalCategories}`
        : `分类 ${shownCategories}`;
    const itemText =
      totalItems && shownItems !== totalItems ? `内容 ${shownItems}/${totalItems}` : `内容 ${totalItems || shownItems}`;

    return `${categoryText} · ${itemText}`;
  }

  function normalizeSelection(value) {
    if (!value || typeof value !== "object") return null;
    const kind = value.kind === "category" ? "category" : value.kind === "group" ? "group" : "";
    const id = safeText(value.id).trim();
    if (!kind || !id) return null;
    return { kind, id };
  }

  const defaultGroupId =
    groups.find((g) => g.id === state.selectedGroupId)?.id || groups[0]?.id || DEFAULT_GROUP_ID;

  let selection = normalizeSelection(ui.selection);
  if (!selection) selection = { kind: "group", id: defaultGroupId };

  if (selection.kind === "group" && !groupsById.has(selection.id)) {
    selection = { kind: "group", id: defaultGroupId };
  }
  if (selection.kind === "category") {
    const category = categoriesById.get(selection.id);
    if (!category) {
      selection = { kind: "group", id: defaultGroupId };
    } else {
      const groupId = safeText(category.groupId || DEFAULT_GROUP_ID) || DEFAULT_GROUP_ID;
      if (ui.openGroups instanceof Set) ui.openGroups.add(groupId);
    }
  }
  ui.selection = selection;

  let renderedGroups = 0;
  let renderedCategories = 0;

  for (const group of groups) {
    if (!showHidden && group.hidden === true) continue;

    const groupId = group.id;
    const rawCategories = sortCategoryList(categoriesByGroupId.get(groupId) || []);
    const visibleCategories = rawCategories.filter((c) => showHidden || c.hidden !== true);

    const groupMatches = matchesEntity(group);
    const shownCategories = q && !groupMatches ? visibleCategories.filter(matchesEntity) : visibleCategories;
    if (q && !groupMatches && shownCategories.length === 0) continue;

    renderedGroups += 1;
    renderedCategories += shownCategories.length;

    const groupDetails = document.createElement("details");
    groupDetails.className = `admin-accordion admin-tree-group${
      selection.kind === "group" && selection.id === groupId ? " selected" : ""
    }`;
    groupDetails.dataset.kind = "group";
    groupDetails.dataset.id = groupId;
    groupDetails.open = ui.openGroups?.has(groupId) || (q && (groupMatches || shownCategories.length > 0));

    const summary = document.createElement("summary");
    summary.className = "admin-accordion-summary";

    const summaryInner = document.createElement("div");
    summaryInner.className = "admin-accordion-summary-inner";

    const title = document.createElement("div");
    title.className = "admin-accordion-summary-title";
    const groupTitleText = `${group.title || groupId} (${groupId})${showHidden && group.hidden ? " · 隐藏" : ""}`;
    setHighlightedText(title, groupTitleText, q);

    const meta = document.createElement("div");
    meta.className = "admin-accordion-summary-meta";
    meta.textContent = groupMetaText({ group, visibleCategories: shownCategories });

    summaryInner.append(title, meta);
    summary.appendChild(summaryInner);

    if (!q) {
      const summaryActions = document.createElement("div");
      summaryActions.className = "admin-accordion-summary-actions";

      const addCategoryBtn = document.createElement("button");
      addCategoryBtn.type = "button";
      addCategoryBtn.className = "btn btn-ghost btn-xs";
      addCategoryBtn.textContent = "＋ 二级分类";
      addCategoryBtn.dataset.action = "select-group-add-category";

      summaryActions.appendChild(addCategoryBtn);
      summary.appendChild(summaryActions);
    }

    groupDetails.appendChild(summary);

    const body = document.createElement("div");
    body.className = "admin-accordion-body";

    const list = document.createElement("div");
    list.className = "admin-tree-list";

    for (const category of shownCategories) {
      const categoryId = category.id;

      const categoryBtn = document.createElement("button");
      categoryBtn.type = "button";
      categoryBtn.className = `admin-tree-item${
        selection.kind === "category" && selection.id === categoryId ? " selected" : ""
      }`;
      categoryBtn.dataset.action = "select-category";
      categoryBtn.dataset.id = categoryId;

      const main = document.createElement("div");
      main.className = "admin-tree-item-main";

      const catTitle = document.createElement("div");
      catTitle.className = "admin-tree-item-title";
      const categoryTitleText = `${category.title || categoryId} (${categoryId})${
        showHidden && category.hidden ? " · 隐藏" : ""
      }`;
      setHighlightedText(catTitle, categoryTitleText, q);

      const catMeta = document.createElement("div");
      catMeta.className = "admin-tree-item-meta";
      catMeta.textContent = `内容 ${Number(category.count || 0)} · 内置 ${Number(category.builtinCount || 0)} · 新增 ${Number(
        category.dynamicCount || 0,
      )}`;

      main.append(catTitle, catMeta);
      categoryBtn.appendChild(main);

      list.appendChild(categoryBtn);
    }

    if (!shownCategories.length) {
      const empty = document.createElement("div");
      empty.className = "admin-help";
      empty.textContent = q ? "未找到匹配的二级分类。" : "暂无二级分类。";
      list.appendChild(empty);
    }

    body.appendChild(list);
    groupDetails.appendChild(body);
    tree.appendChild(groupDetails);
  }

  const metaEl = document.querySelector("#taxonomy-meta");
  if (metaEl) {
    metaEl.textContent = q
      ? `匹配：大类 ${renderedGroups} · 二级分类 ${renderedCategories}`
      : `大类 ${renderedGroups} · 二级分类 ${renderedCategories}`;
  }

  if (!renderedGroups) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = q ? "未找到匹配的分类。" : "暂无大类。";
    tree.appendChild(empty);
  }

  renderAdminTaxonomyEditor(state, { selection, groups, categories });
}

function renderAdminTaxonomyEditor(state, { selection, groups, categories } = {}) {
  const editor = $("#admin-taxonomy-editor");
  editor.innerHTML = "";

  const groupsList = Array.isArray(groups) ? groups : [];
  const categoriesList = Array.isArray(categories) ? categories : [];
  const groupsById = new Map(groupsList.map((g) => [g.id, g]));
  const categoriesById = new Map(categoriesList.map((c) => [c.id, c]));

  if (!selection || !selection.id) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "请选择左侧的大类或二级分类进行编辑。";
    editor.appendChild(empty);
    return;
  }

  if (selection.kind === "group") {
    const groupId = selection.id;
    const group = groupsById.get(groupId) || { id: groupId, title: groupId, order: 0, hidden: false, count: 0, categoryCount: 0 };
    const isBuiltin = groupId === DEFAULT_GROUP_ID;

    const header = document.createElement("div");
    header.className = "admin-section-title";
    header.textContent = `大类：${group.title || groupId} (${groupId})`;

    const meta = document.createElement("div");
    meta.className = "admin-help";
    meta.textContent = `分类 ${Number(group.categoryCount || 0)} · 内容 ${Number(group.count || 0)}`;

    const form = document.createElement("form");
    form.className = "admin-form";
    form.id = "taxonomy-group-editor-form";
    form.dataset.id = groupId;

    const grid = document.createElement("div");
    grid.className = "admin-category-grid";

    const titleField = document.createElement("label");
    titleField.className = "field admin-field-span";
    titleField.innerHTML = `<span class="field-label">标题</span>`;
    const titleInput = document.createElement("input");
    titleInput.className = "field-input";
    titleInput.name = "title";
    titleInput.type = "text";
    titleInput.value = group.title || "";
    titleField.appendChild(titleInput);

    const orderField = document.createElement("label");
    orderField.className = "field";
    orderField.innerHTML = `<span class="field-label">排序（越大越靠前）</span>`;
    const orderInput = document.createElement("input");
    orderInput.className = "field-input";
    orderInput.name = "order";
    orderInput.type = "number";
    orderInput.value = String(group.order || 0);
    orderField.appendChild(orderInput);

    const hiddenField = document.createElement("label");
    hiddenField.className = "admin-check";
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "checkbox";
    hiddenInput.name = "hidden";
    hiddenInput.checked = group.hidden === true;
    hiddenField.append(hiddenInput, document.createTextNode("隐藏该大类（首页不显示）"));

    const advanced = document.createElement("details");
    advanced.className = "admin-subaccordion";
    advanced.open = group.hidden === true || Number(group.order || 0) !== 0;

    const advancedSummary = document.createElement("summary");
    advancedSummary.className = "admin-subaccordion-summary";
    advancedSummary.textContent = "高级设置";
    advanced.appendChild(advancedSummary);

    const advancedBody = document.createElement("div");
    advancedBody.className = "admin-subaccordion-body";

    const advancedGrid = document.createElement("div");
    advancedGrid.className = "admin-category-grid";
    advancedGrid.append(orderField, hiddenField);
    advancedBody.appendChild(advancedGrid);
    advanced.appendChild(advancedBody);

    grid.append(titleField, advanced);

    const actions = document.createElement("div");
    actions.className = "admin-actions";

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = `btn btn-ghost${isBuiltin ? "" : " danger"}`;
    resetBtn.textContent = isBuiltin ? "重置" : "删除";
    resetBtn.dataset.action = "group-reset";

    const saveBtn = document.createElement("button");
    saveBtn.type = "submit";
    saveBtn.className = "btn btn-primary";
    saveBtn.textContent = "保存";

    actions.append(resetBtn, saveBtn);

    form.append(grid, actions);

    const createHeader = document.createElement("div");
    createHeader.className = "admin-section-title";
    createHeader.textContent = "新增二级分类";

    const createForm = document.createElement("form");
    createForm.className = "admin-form";
    createForm.id = "taxonomy-category-create-form";
    createForm.dataset.groupId = groupId;

    const createGrid = document.createElement("div");
    createGrid.className = "admin-category-grid";

    const idField = document.createElement("label");
    idField.className = "field";
    idField.innerHTML = `<span class="field-label">二级分类 ID（英文/数字）</span>`;
    const idInput = document.createElement("input");
    idInput.className = "field-input";
    idInput.name = "id";
    idInput.type = "text";
    idInput.placeholder = "custom";
    idInput.id = "taxonomy-category-create-id";
    idField.appendChild(idInput);

    const catTitleField = document.createElement("label");
    catTitleField.className = "field";
    catTitleField.innerHTML = `<span class="field-label">标题</span>`;
    const catTitleInput = document.createElement("input");
    catTitleInput.className = "field-input";
    catTitleInput.name = "title";
    catTitleInput.type = "text";
    catTitleInput.placeholder = "自定义分类";
    catTitleField.appendChild(catTitleInput);

    const catOrderField = document.createElement("label");
    catOrderField.className = "field";
    catOrderField.innerHTML = `<span class="field-label">排序（越大越靠前）</span>`;
    const catOrderInput = document.createElement("input");
    catOrderInput.className = "field-input";
    catOrderInput.name = "order";
    catOrderInput.type = "number";
    catOrderInput.value = "0";
    catOrderField.appendChild(catOrderInput);

    const catHiddenField = document.createElement("label");
    catHiddenField.className = "admin-check";
    const catHiddenInput = document.createElement("input");
    catHiddenInput.type = "checkbox";
    catHiddenInput.name = "hidden";
    catHiddenField.append(catHiddenInput, document.createTextNode("隐藏"));

    const createAdvanced = document.createElement("details");
    createAdvanced.className = "admin-subaccordion";

    const createAdvancedSummary = document.createElement("summary");
    createAdvancedSummary.className = "admin-subaccordion-summary";
    createAdvancedSummary.textContent = "高级设置";
    createAdvanced.appendChild(createAdvancedSummary);

    const createAdvancedBody = document.createElement("div");
    createAdvancedBody.className = "admin-subaccordion-body";

    const createAdvancedGrid = document.createElement("div");
    createAdvancedGrid.className = "admin-category-grid";
    createAdvancedGrid.append(catOrderField, catHiddenField);
    createAdvancedBody.appendChild(createAdvancedGrid);
    createAdvanced.appendChild(createAdvancedBody);

    createGrid.append(idField, catTitleField, createAdvanced);

    const createActions = document.createElement("div");
    createActions.className = "admin-actions";

    const createBtn = document.createElement("button");
    createBtn.type = "submit";
    createBtn.className = "btn btn-primary";
    createBtn.textContent = "创建";

    createActions.appendChild(createBtn);

    createForm.append(createGrid, createActions);

    editor.append(header, meta, form, createHeader, createForm);
    return;
  }

  if (selection.kind === "category") {
    const categoryId = selection.id;
    const category = categoriesById.get(categoryId);
    if (!category) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "该二级分类不存在或已被删除。";
      editor.appendChild(empty);
      return;
    }

    const header = document.createElement("div");
    header.className = "admin-section-title";
    header.textContent = `二级分类：${category.title || categoryId} (${categoryId})`;

    const meta = document.createElement("div");
    meta.className = "admin-help";
    meta.textContent = `内容 ${Number(category.count || 0)} · 内置 ${Number(category.builtinCount || 0)} · 新增 ${Number(
      category.dynamicCount || 0,
    )}`;

    const form = document.createElement("form");
    form.className = "admin-form";
    form.id = "taxonomy-category-editor-form";
    form.dataset.id = categoryId;

    const grid = document.createElement("div");
    grid.className = "admin-category-grid";

    const groupField = document.createElement("label");
    groupField.className = "field";
    groupField.innerHTML = `<span class="field-label">大类</span>`;
    const groupSelect = document.createElement("select");
    groupSelect.className = "field-input";
    groupSelect.name = "groupId";
    fillGroupSelect(groupSelect, groupsList);
    groupSelect.value = category.groupId || DEFAULT_GROUP_ID;
    groupField.appendChild(groupSelect);

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

    const advanced = document.createElement("details");
    advanced.className = "admin-subaccordion";
    advanced.open = category.hidden === true || Number(category.order || 0) !== 0;

    const advancedSummary = document.createElement("summary");
    advancedSummary.className = "admin-subaccordion-summary";
    advancedSummary.textContent = "高级设置";
    advanced.appendChild(advancedSummary);

    const advancedBody = document.createElement("div");
    advancedBody.className = "admin-subaccordion-body";

    const advancedGrid = document.createElement("div");
    advancedGrid.className = "admin-category-grid";
    advancedGrid.append(orderField, hiddenField);
    advancedBody.appendChild(advancedGrid);
    advanced.appendChild(advancedBody);

    grid.append(groupField, titleField, advanced);

    const actions = document.createElement("div");
    actions.className = "admin-actions";

    const canDelete = Number(category.count || 0) === 0;

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = `btn btn-ghost${canDelete ? " danger" : ""}`;
    resetBtn.textContent = canDelete ? "删除" : "重置";
    resetBtn.dataset.action = "category-reset";

    const saveBtn = document.createElement("button");
    saveBtn.type = "submit";
    saveBtn.className = "btn btn-primary";
    saveBtn.textContent = "保存";

    actions.append(resetBtn, saveBtn);

    form.append(grid, actions);

    const createHint = document.createElement("div");
    createHint.className = "admin-help";
    createHint.textContent = "提示：要新增二级分类，请先在左侧选择对应的大类。";

    editor.append(header, meta, form, createHint);
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
  const taxonomyUiKey = "pa_taxonomy_ui";

  function ensureTaxonomyUi() {
    if (!state.admin.taxonomy.ui) {
      state.admin.taxonomy.ui = {
        search: "",
        showHidden: false,
        openGroups: new Set([DEFAULT_GROUP_ID]),
        openCategories: new Set(),
      };
    }

    const ui = state.admin.taxonomy.ui;
    if (!ui._hydrated) {
      const saved = readStorageJson(taxonomyUiKey);
      if (saved && typeof saved === "object") {
        if (typeof saved.search === "string") ui.search = saved.search;
        if (typeof saved.showHidden === "boolean") ui.showHidden = saved.showHidden;
        if (Array.isArray(saved.openGroups)) ui.openGroups = new Set(saved.openGroups);
        if (Array.isArray(saved.openCategories)) ui.openCategories = new Set(saved.openCategories);
        if (saved.selection && typeof saved.selection === "object") ui.selection = saved.selection;
      }
      ui._hydrated = true;
    }

    if (!(ui.openGroups instanceof Set)) {
      ui.openGroups = new Set(ui.openGroups || []);
    }
    if (!(ui.openCategories instanceof Set)) {
      ui.openCategories = new Set(ui.openCategories || []);
    }

    ui.openGroups.add(DEFAULT_GROUP_ID);
    return ui;
  }

  function persistTaxonomyUi() {
    const ui = ensureTaxonomyUi();
    writeStorageJson(taxonomyUiKey, {
      search: ui.search || "",
      showHidden: ui.showHidden === true,
      openGroups: [...(ui.openGroups || [])],
      openCategories: [...(ui.openCategories || [])],
      selection: ui.selection || null,
    });
  }

  ensureTaxonomyUi();

  $("#upload-group").addEventListener("change", () => {
    fillCategorySelect($("#upload-category"), state.admin.taxonomy.categories, { groupId: $("#upload-group").value });
    updateAdminPathHints(state);
  });

  $("#link-group").addEventListener("change", () => {
    fillCategorySelect($("#link-category"), state.admin.taxonomy.categories, { groupId: $("#link-group").value });
    updateAdminPathHints(state);
  });

  $("#upload-category").addEventListener("change", () => updateAdminPathHints(state));
  $("#link-category").addEventListener("change", () => updateAdminPathHints(state));

  $("#taxonomy-search").addEventListener("input", (e) => {
    ensureTaxonomyUi().search = e.target.value || "";
    persistTaxonomyUi();
    renderAdminCategories(state);
  });

  $("#taxonomy-search").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = String(e.target.value || "").trim().toLowerCase();
    if (!q) return;

    const container = document.querySelector("#admin-taxonomy");
    if (!container) return;
    const match =
      [...container.querySelectorAll('details[data-kind="group"]')].find((d) => {
        const title = d.querySelector(".admin-accordion-summary-title")?.textContent || "";
        return title.toLowerCase().includes(q);
      }) ||
      [...container.querySelectorAll('button[data-action="select-category"]')].find((btn) => {
        const title = btn.textContent || "";
        return title.toLowerCase().includes(q);
      });
    if (!match) return;

    e.preventDefault();
    match.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  $("#taxonomy-show-hidden").addEventListener("change", (e) => {
    ensureTaxonomyUi().showHidden = e.target.checked === true;
    persistTaxonomyUi();
    renderAdminCategories(state);
  });

  $("#taxonomy-collapse-all").addEventListener("click", () => {
    const ui = ensureTaxonomyUi();
    ui.openGroups = new Set();
    ui.openCategories = new Set();
    persistTaxonomyUi();
    renderAdminCategories(state);
  });

  $("#taxonomy-expand-all").addEventListener("click", () => {
    const ui = ensureTaxonomyUi();
    const showHidden = ui.showHidden === true;
    ui.openGroups = new Set(
      sortGroupList(state.admin.taxonomy.groups || [])
        .filter((g) => showHidden || g.hidden !== true)
        .map((g) => g.id),
    );
    ui.openCategories = new Set();
    persistTaxonomyUi();
    renderAdminCategories(state);
  });

  $("#admin-taxonomy").addEventListener(
    "toggle",
    (e) => {
      const details = e.target;
      if (!(details instanceof HTMLDetailsElement)) return;
      const kind = details.dataset.kind;
      const id = details.dataset.id;
      if (!id) return;

      const ui = ensureTaxonomyUi();
      if (kind === "group") {
        if (details.open) ui.openGroups.add(id);
        else ui.openGroups.delete(id);
      }
      persistTaxonomyUi();
    },
    true,
  );

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

  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented) return;
    if (e.key !== "/") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const target = e.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable
    ) {
      return;
    }

    e.preventDefault();

    if (isAdminOpen()) {
      const activeTab = state.admin.tab || "dashboard";
      const targetSelector =
        activeTab === "categories"
          ? "#taxonomy-search"
          : activeTab === "uploads"
            ? "#admin-uploads-search"
            : activeTab === "content"
              ? "#admin-items-search"
              : "#taxonomy-search";

      const input = document.querySelector(targetSelector);
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
      }
      return;
    }

    const input = document.querySelector("#search-input");
    if (input instanceof HTMLInputElement) {
      input.focus();
      input.select();
    }
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

  $("#group-create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#group-create-submit").disabled = true;
    try {
      const id = $("#group-create-id").value.trim();
      const title = $("#group-create-title").value.trim();
      const orderRaw = $("#group-create-order").value;
      const hidden = $("#group-create-hidden").checked;
      const order = Number.parseInt(orderRaw || "0", 10);

      await createGroup({ id, title, order: Number.isFinite(order) ? order : 0, hidden });
      $("#group-create-id").value = "";
      $("#group-create-title").value = "";
      $("#group-create-order").value = "0";
      $("#group-create-hidden").checked = false;
      const ui = ensureTaxonomyUi();
      ui.openGroups.add(id);
      ui.selection = { kind: "group", id };
      persistTaxonomyUi();
      $("#taxonomy-add-group").open = false;
      showToast("大类已创建", { kind: "success" });
      await loadAdminCategories(state);
      await refreshCatalog(state);
    } catch (err) {
      if (err?.status === 409) {
        showToast("该大类 ID 已存在", { kind: "info" });
        return;
      }
      if (err?.status === 401) {
        clearToken();
        setLoginUi({ loggedIn: false });
        closeAdminModal();
        return;
      }
      showToast("创建大类失败", { kind: "info" });
    } finally {
      $("#group-create-submit").disabled = false;
    }
  });

  function applyTaxonomySelectionToTree(selection) {
    const tree = document.querySelector("#admin-taxonomy");
    if (!tree) return;

    tree.querySelectorAll(".admin-tree-group.selected").forEach((el) => el.classList.remove("selected"));
    tree.querySelectorAll(".admin-tree-item.selected").forEach((el) => el.classList.remove("selected"));

    if (!selection || typeof selection !== "object") return;
    if (!selection.id) return;

    if (selection.kind === "group") {
      for (const details of tree.querySelectorAll('details[data-kind="group"]')) {
        if (details.dataset.id === selection.id) details.classList.add("selected");
      }
      return;
    }

    if (selection.kind === "category") {
      for (const btn of tree.querySelectorAll('button[data-action="select-category"]')) {
        if (btn.dataset.id === selection.id) btn.classList.add("selected");
      }
    }
  }

  function setTaxonomySelection(selection, { openGroupId = "", focusCreate = false } = {}) {
    const ui = ensureTaxonomyUi();
    const groupId = safeText(openGroupId).trim();
    if (groupId) ui.openGroups.add(groupId);
    ui.selection = selection;
    persistTaxonomyUi();

    if (groupId) {
      const tree = document.querySelector("#admin-taxonomy");
      const details = [...(tree?.querySelectorAll('details[data-kind="group"]') || [])].find((d) => d.dataset.id === groupId);
      if (details) details.open = true;
    }

    applyTaxonomySelectionToTree(selection);
    renderAdminTaxonomyEditor(state, {
      selection,
      groups: sortGroupList(state.admin.taxonomy.groups || []),
      categories: state.admin.taxonomy.categories || [],
    });

    if (focusCreate) document.querySelector("#taxonomy-category-create-id")?.focus();
  }

  function selectTaxonomyGroup(groupId, { focusCreate = false, open = false } = {}) {
    const id = safeText(groupId || "").trim() || DEFAULT_GROUP_ID;
    setTaxonomySelection(
      { kind: "group", id },
      {
        openGroupId: open ? id : "",
        focusCreate,
      },
    );
  }

  function selectTaxonomyCategory(categoryId) {
    const id = safeText(categoryId || "").trim();
    if (!id) return;
    const category = (state.admin.taxonomy.categories || []).find((c) => c.id === id);
    const groupId = safeText(category?.groupId || DEFAULT_GROUP_ID) || DEFAULT_GROUP_ID;
    setTaxonomySelection({ kind: "category", id }, { openGroupId: groupId });
  }

  $("#admin-taxonomy").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (btn) {
      const action = btn.dataset.action;
      if (action === "select-group-add-category") {
        e.preventDefault();
        e.stopPropagation();
        const groupId = btn.closest('details[data-kind="group"]')?.dataset?.id || DEFAULT_GROUP_ID;
        selectTaxonomyGroup(groupId, { focusCreate: true, open: true });
        return;
      }
      if (action === "select-category") {
        selectTaxonomyCategory(btn.dataset.id);
        return;
      }
    }

    const summary = e.target.closest("summary.admin-accordion-summary");
    if (!summary) return;
    const groupId = summary.closest('details[data-kind="group"]')?.dataset?.id;
    if (groupId) selectTaxonomyGroup(groupId);
  });

  $("#admin-taxonomy-editor").addEventListener("submit", async (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.id === "taxonomy-group-editor-form") {
      e.preventDefault();
      const id = form.dataset.id;
      if (!id) return;

      const title = form.querySelector('input[name="title"]')?.value ?? "";
      const orderRaw = form.querySelector('input[name="order"]')?.value ?? "0";
      const hidden = form.querySelector('input[name="hidden"]')?.checked ?? false;
      const order = Number.parseInt(orderRaw || "0", 10);

      const saveBtn = form.querySelector('button[type="submit"]');
      if (saveBtn) saveBtn.disabled = true;
      try {
        await updateGroup(id, {
          title: title.trim(),
          order: Number.isFinite(order) ? order : 0,
          hidden,
        });
        const ui = ensureTaxonomyUi();
        ui.openGroups.add(id);
        ui.selection = { kind: "group", id };
        persistTaxonomyUi();
        showToast("大类已保存", { kind: "success" });
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
        if (saveBtn) saveBtn.disabled = false;
      }
      return;
    }

    if (form.id === "taxonomy-category-editor-form") {
      e.preventDefault();
      const id = form.dataset.id;
      if (!id) return;

      const groupId = form.querySelector('select[name="groupId"]')?.value ?? DEFAULT_GROUP_ID;
      const title = form.querySelector('input[name="title"]')?.value ?? "";
      const orderRaw = form.querySelector('input[name="order"]')?.value ?? "0";
      const hidden = form.querySelector('input[name="hidden"]')?.checked ?? false;
      const order = Number.parseInt(orderRaw || "0", 10);

      const saveBtn = form.querySelector('button[type="submit"]');
      if (saveBtn) saveBtn.disabled = true;
      try {
        await updateCategory(id, {
          groupId,
          title: title.trim(),
          order: Number.isFinite(order) ? order : 0,
          hidden,
        });
        const ui = ensureTaxonomyUi();
        ui.openGroups.add(groupId);
        ui.selection = { kind: "category", id };
        persistTaxonomyUi();
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
        if (err?.status === 400 && err?.data?.error === "unknown_group") {
          showToast("大类不存在，请先创建大类", { kind: "info" });
          return;
        }
        showToast("保存失败", { kind: "info" });
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
      return;
    }

    if (form.id === "taxonomy-category-create-form") {
      e.preventDefault();
      const groupId = form.dataset.groupId || DEFAULT_GROUP_ID;
      const idInput = form.querySelector('input[name="id"]');
      const titleInput = form.querySelector('input[name="title"]');
      const orderInput = form.querySelector('input[name="order"]');
      const hiddenInput = form.querySelector('input[name="hidden"]');

      const id = idInput?.value.trim() || "";
      const title = titleInput?.value.trim() || "";
      const order = Number.parseInt(orderInput?.value || "0", 10);
      const hidden = hiddenInput?.checked === true;

      if (!id) {
        showToast("请填写二级分类 ID", { kind: "info" });
        return;
      }

      const createBtn = form.querySelector('button[type="submit"]');
      if (createBtn) createBtn.disabled = true;
      try {
        await createCategory({ id, groupId, title, order: Number.isFinite(order) ? order : 0, hidden });
        if (idInput) idInput.value = "";
        if (titleInput) titleInput.value = "";
        if (orderInput) orderInput.value = "0";
        if (hiddenInput) hiddenInput.checked = false;

        const ui = ensureTaxonomyUi();
        ui.openGroups.add(groupId);
        ui.selection = { kind: "category", id };
        persistTaxonomyUi();

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
        if (err?.status === 400 && err?.data?.error === "unknown_group") {
          showToast("大类不存在，请先创建大类", { kind: "info" });
          return;
        }
        showToast("创建分类失败", { kind: "info" });
      } finally {
        if (createBtn) createBtn.disabled = false;
      }
    }
  });

  $("#admin-taxonomy-editor").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const ui = ensureTaxonomyUi();

    if (action === "group-reset") {
      const form = btn.closest("#taxonomy-group-editor-form");
      const id = form?.dataset?.id;
      if (!id) return;

      const isBuiltin = id === DEFAULT_GROUP_ID;
      const confirmText = isBuiltin
        ? `确定重置大类「${id}」的设置为默认吗？`
        : `确定删除大类「${id}」吗？（删除前需先移动/删除其二级分类）`;
      if (!window.confirm(confirmText)) return;

      btn.disabled = true;
      try {
        await deleteGroup(id);
        ui.openGroups.add(DEFAULT_GROUP_ID);
        ui.selection = { kind: "group", id: DEFAULT_GROUP_ID };
        persistTaxonomyUi();
        showToast(isBuiltin ? "已重置" : "已删除", { kind: "success" });
        await loadAdminCategories(state);
        await refreshCatalog(state);
      } catch (err) {
        if (err?.status === 401) {
          clearToken();
          setLoginUi({ loggedIn: false });
          closeAdminModal();
          return;
        }
        if (err?.status === 400 && err?.data?.error === "group_not_empty") {
          showToast("该大类下仍有二级分类，请先移动/删除二级分类", { kind: "info" });
          return;
        }
        showToast(isBuiltin ? "重置失败" : "删除失败", { kind: "info" });
      } finally {
        btn.disabled = false;
      }
      return;
    }

    if (action === "category-reset") {
      const form = btn.closest("#taxonomy-category-editor-form");
      const id = form?.dataset?.id;
      if (!id) return;

      const category = (state.admin.taxonomy.categories || []).find((c) => c.id === id);
      const canDelete = Number(category?.count || 0) === 0;
      const confirmText = canDelete
        ? `确定删除二级分类「${id}」吗？`
        : `该二级分类下仍有内容，当前操作只会重置分类设置（标题/排序/隐藏/所属大类），内容不会删除；所属大类将恢复为默认（物理）。确定继续吗？`;
      if (!window.confirm(confirmText)) return;

      btn.disabled = true;
      try {
        await deleteCategory(id);
        if (canDelete) {
          const groupId = safeText(category?.groupId || DEFAULT_GROUP_ID) || DEFAULT_GROUP_ID;
          ui.selection = { kind: "group", id: groupId };
          ui.openGroups.add(groupId);
        } else {
          ui.selection = { kind: "category", id };
          ui.openGroups.add(DEFAULT_GROUP_ID);
        }
        persistTaxonomyUi();
        showToast(canDelete ? "已删除" : "已重置", { kind: "success" });
        await loadAdminCategories(state);
        await refreshCatalog(state);
      } catch (err) {
        if (err?.status === 401) {
          clearToken();
          setLoginUi({ loggedIn: false });
          closeAdminModal();
          return;
        }
        showToast(canDelete ? "删除失败" : "重置失败", { kind: "info" });
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
      await updateSystemStorage({
        sync: true,
        webdav: { scanRemote: $("#system-scan-remote-on-sync").checked === true },
      });
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
    catalog: { groups: {} },
    selectedGroupId: DEFAULT_GROUP_ID,
    selectedCategoryId: "all",
    query: "",
    admin: {
      tab: "dashboard",
      taxonomy: {
        groups: [],
        categories: [],
        ui: {
          search: "",
          showHidden: false,
          openGroups: new Set([DEFAULT_GROUP_ID]),
          openCategories: new Set(),
        },
      },
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

  const savedView = readStorageJson("pa_view_state");
  if (savedView && typeof savedView === "object") {
    if (typeof savedView.groupId === "string" && savedView.groupId.trim()) {
      state.selectedGroupId = savedView.groupId.trim();
    }
    if (typeof savedView.categoryId === "string" && savedView.categoryId.trim()) {
      state.selectedCategoryId = savedView.categoryId.trim();
    }
  }

  await refreshCatalog(state);
  writeStorageJson("pa_view_state", {
    groupId: state.selectedGroupId,
    categoryId: state.selectedCategoryId,
  });
  initFiltering({ state });
  initAdmin({ state });
});
