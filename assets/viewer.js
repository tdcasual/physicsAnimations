import { getToken } from "./api.js";

function $(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

function isHttpUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
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

async function findDynamicMeta(id) {
  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`/api/items/${encodeURIComponent(id)}`, { cache: "no-store", headers });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.item || null;
}

async function init() {
  const { builtin, src, id } = parseQuery();

  const frame = $("#viewer-frame");
  const open = $("#viewer-open");
  const modeBtn = $("#viewer-mode");
  const hint = $("#viewer-hint");
  const hintText = $("#viewer-hint-text");

  let screenshotMode = false;
  let screenshotUrl = "";

  const dynamic = id ? await findDynamicMeta(id) : null;
  if (id && !dynamic) {
    setTitle("未找到作品");
    $("#viewer-title").textContent = "作品不存在或无权限访问。";
    open.classList.add("hidden");
    modeBtn.classList.add("hidden");
    hint.classList.add("hidden");
    return;
  }

  const target = dynamic?.src ? dynamic.src : builtin ? toBuiltinUrl(builtin) : src;
  if (!target) {
    setTitle("缺少参数");
    $("#viewer-title").textContent = "缺少参数：builtin / src";
    open.classList.add("hidden");
    modeBtn.classList.add("hidden");
    hint.classList.add("hidden");
    return;
  }

  open.href = target;
  frame.src = target;

  if (dynamic) {
    if (dynamic?.title) setTitle(dynamic.title);
    if (dynamic?.thumbnail) screenshotUrl = dynamic.thumbnail;
  } else if (builtin) {
    const meta = await findBuiltinMeta(builtin);
    if (meta?.title) setTitle(meta.title);
    if (meta?.thumbnail) screenshotUrl = meta.thumbnail;
  }

  if (screenshotUrl) showScreenshot(screenshotUrl);

  const isExternalLink = dynamic ? dynamic.type === "link" : isHttpUrl(target);
  if (isExternalLink) {
    hintText.textContent =
      "外链站点可能因 X-Frame-Options / CSP 禁止被嵌入：默认仅截图展示；如需交互可点“进入交互”，若仍失败请点“打开原页面”。";
    hint.classList.remove("hidden");
    if (screenshotUrl) {
      screenshotMode = true;
      modeBtn.textContent = "进入交互";
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
