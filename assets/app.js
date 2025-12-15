import {
  clearToken,
  createLink,
  deleteItem,
  getToken,
  login,
  me,
  tryGetCatalog,
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
    href: `viewer.html?builtin=${encodeURIComponent(file)}`,
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
  const link = document.createElement("a");
  link.className = "card";
  link.href = item.href;
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
  if (item.type !== "builtin") {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = item.type === "link" ? "链接" : "上传";
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
  categories.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));

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
      $("#login-error").textContent = "登录失败，请检查用户名或密码。";
      $("#login-error").classList.remove("hidden");
    } finally {
      $("#login-submit").disabled = false;
    }
  });

  $("#admin-button").addEventListener("click", () => {
    showToast("管理面板：下一步将支持上传/外链。", { kind: "info" });
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
  refreshAdminUi(state);
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

function categoriesForSelect(catalog) {
  const list = Object.values(catalog.categories || {});
  list.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
  return list;
}

function fillCategorySelect(selectEl, catalog) {
  const categories = categoriesForSelect(catalog);
  selectEl.innerHTML = "";

  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.title;
    selectEl.appendChild(option);
  }

  if (!categories.length) {
    const option = document.createElement("option");
    option.value = "other";
    option.textContent = "其他";
    selectEl.appendChild(option);
  }
}

function listDynamicItems(catalog) {
  const items = [];
  for (const category of Object.values(catalog.categories || {})) {
    for (const item of category.items || []) {
      if (item.type === "builtin") continue;
      items.push({ ...item, categoryTitle: category.title });
    }
  }
  items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return items;
}

function refreshAdminUi(state) {
  const modal = $("#admin-modal");
  const isOpen = modal.open && !modal.classList.contains("hidden");
  if (!isOpen) return;

  fillCategorySelect($("#upload-category"), state.catalog);
  fillCategorySelect($("#link-category"), state.catalog);

  const container = $("#admin-items");
  container.innerHTML = "";

  const items = listDynamicItems(state.catalog);
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "暂无已添加内容。";
    container.appendChild(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "admin-item";
    row.dataset.id = item.id;

    const main = document.createElement("div");
    main.className = "admin-item-main";

    const title = document.createElement("div");
    title.className = "admin-item-title";
    title.textContent = item.title;

    const meta = document.createElement("div");
    meta.className = "admin-item-meta";
    meta.textContent = `${item.type === "link" ? "链接" : "上传"} · ${item.categoryTitle}`;

    main.append(title, meta);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn btn-ghost danger";
    del.textContent = "删除";
    del.dataset.action = "delete";

    row.append(main, del);
    container.appendChild(row);
  }
}

function initAdmin({ state }) {
  $("#admin-button").addEventListener("click", () => {
    openAdminModal();
    fillCategorySelect($("#upload-category"), state.catalog);
    fillCategorySelect($("#link-category"), state.catalog);
    refreshAdminUi(state);
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

  $("#upload-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = $("#upload-file").files?.[0];
    if (!file) {
      showToast("请选择一个 HTML 文件", { kind: "info" });
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

  $("#admin-items").addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.action !== "delete") return;

    const row = btn.closest(".admin-item");
    const id = row?.dataset?.id;
    if (!id) return;

    btn.disabled = true;
    try {
      await deleteItem(id);
      showToast("已删除", { kind: "success" });
      await refreshCatalog(state);
    } catch (err) {
      if (err?.status === 401) {
        clearToken();
        setLoginUi({ loggedIn: false });
        closeAdminModal();
      }
      showToast("删除失败", { kind: "info" });
    } finally {
      btn.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  initLogin();
  await bootstrapAuth();

  const state = { catalog: { categories: {} }, selectedCategoryId: "all", query: "" };
  await refreshCatalog(state);
  initFiltering({ state });
  initAdmin({ state });
});
