import { getToken } from "./api.js";

function $(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

function isHttpUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

function isSafeViewerTarget(raw) {
  const target = typeof raw === "string" ? raw.trim() : "";
  if (!target) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
    return /^https?:/i.test(target);
  }
  if (target.startsWith("//")) return false;
  return true;
}

function parseQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    builtin: params.get("builtin") || "",
    src: params.get("src") || "",
    id: params.get("id") || "",
  };
}

function toBuiltinUrl(builtinPath) {
  return `animations/${builtinPath}`;
}

function setTitle(text) {
  const title = text || "作品预览";
  document.title = title;
  $("#viewer-title").textContent = title;
}

function showScreenshot(url) {
  if (!url) return;
  const img = $("#viewer-shot");
  img.src = url;
  img.classList.remove("hidden");
}

function hideScreenshot() {
  $("#viewer-shot").classList.add("hidden");
}

async function findBuiltinMeta(builtinPath) {
  const response = await fetch("animations.json", { cache: "no-store" });
  if (!response.ok) return null;
  const data = await response.json();

  for (const category of Object.values(data)) {
    for (const item of category.items || []) {
      if (item.file === builtinPath) return item;
    }
  }
  return null;
}

async function tryFetchItemMeta(id) {
  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const response = await fetch(`/api/items/${encodeURIComponent(id)}`, {
      cache: "no-store",
      headers,
    });
    if (!response.ok) return { item: null, ok: false, status: response.status, networkError: false };
    const data = await response.json().catch(() => null);
    return { item: data?.item || null, ok: true, status: response.status, networkError: false };
  } catch {
    return { item: null, ok: false, status: 0, networkError: true };
  }
}

async function hasBackend() {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

async function init() {
  const { builtin, src, id: rawId } = parseQuery();
  const id = rawId || builtin;

  const frame = $("#viewer-frame");
  const open = $("#viewer-open");
  const modeBtn = $("#viewer-mode");
  const hint = $("#viewer-hint");
  const hintText = $("#viewer-hint-text");

  let screenshotMode = false;
  let screenshotUrl = "";

  let item = null;
  let canFallbackToBuiltin = false;
  if (id) {
    const fetched = await tryFetchItemMeta(id);
    item = fetched.item;
    if (!item) {
      if (fetched.networkError === true) {
        canFallbackToBuiltin = true;
      } else if (fetched.status === 404) {
        canFallbackToBuiltin = !(await hasBackend());
      }
    }
  }

  let target = item?.src ? item.src : "";
  if (!target && id && canFallbackToBuiltin) {
    const meta = await findBuiltinMeta(id);
    if (meta) {
      target = toBuiltinUrl(id);
      if (meta?.title) setTitle(meta.title);
      if (meta?.thumbnail) screenshotUrl = meta.thumbnail;
    }
  }

  if (!target && id) {
    setTitle("未找到作品");
    $("#viewer-title").textContent = "作品不存在或无权限访问。";
    open.classList.add("hidden");
    modeBtn.classList.add("hidden");
    hint.classList.add("hidden");
    return;
  }

  if (!target) target = src;

  if (!target) {
    setTitle("缺少参数");
    $("#viewer-title").textContent = "缺少参数：builtin / src";
    open.classList.add("hidden");
    modeBtn.classList.add("hidden");
    hint.classList.add("hidden");
    return;
  }

  if (!isSafeViewerTarget(target)) {
    setTitle("无效参数");
    $("#viewer-title").textContent = "参数无效或不安全。";
    open.classList.add("hidden");
    modeBtn.classList.add("hidden");
    hint.classList.add("hidden");
    return;
  }

  open.href = target;
  frame.src = target;

  if (item) {
    if (item?.title) setTitle(item.title);
    if (item?.thumbnail) screenshotUrl = item.thumbnail;
  }

  if (screenshotUrl) showScreenshot(screenshotUrl);

  const isExternalLink = item ? item.type === "link" : isHttpUrl(target);
  if (isExternalLink) {
    hintText.textContent =
      "外链站点可能因 X-Frame-Options / CSP 禁止被嵌入：默认直接进入交互；若无法嵌入请点“打开原页面”。";
    hint.classList.remove("hidden");
    if (screenshotUrl) {
      screenshotMode = false;
      modeBtn.textContent = "仅截图";
      modeBtn.classList.remove("hidden");
    } else {
      screenshotMode = false;
      modeBtn.classList.add("hidden");
    }
  } else {
    hint.classList.add("hidden");
    modeBtn.classList.add("hidden");
  }

  modeBtn.addEventListener("click", () => {
    if (!screenshotUrl) return;
    screenshotMode = !screenshotMode;
    if (screenshotMode) {
      showScreenshot(screenshotUrl);
      modeBtn.textContent = "进入交互";
    } else {
      hideScreenshot();
      modeBtn.textContent = "仅截图";
    }
  });

  frame.addEventListener("load", () => {
    if (screenshotMode) return;
    window.setTimeout(() => hideScreenshot(), 250);
  });
}

document.addEventListener("DOMContentLoaded", init);
