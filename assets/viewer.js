function $(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
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
  const response = await fetch(`/api/items/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.item || null;
}

async function init() {
  const { builtin, src, id } = parseQuery();

  const frame = $("#viewer-frame");
  const open = $("#viewer-open");

  const dynamic = id ? await findDynamicMeta(id) : null;
  const target = dynamic?.src ? dynamic.src : builtin ? toBuiltinUrl(builtin) : src;
  if (!target) {
    setTitle("缺少参数");
    $("#viewer-title").textContent = "缺少参数：builtin / src";
    open.classList.add("hidden");
    return;
  }

  open.href = target;
  frame.src = target;

  if (dynamic) {
    if (dynamic?.title) setTitle(dynamic.title);
    if (dynamic?.thumbnail) showScreenshot(dynamic.thumbnail);
  } else if (builtin) {
    const meta = await findBuiltinMeta(builtin);
    if (meta?.title) setTitle(meta.title);
    if (meta?.thumbnail) showScreenshot(meta.thumbnail);
  }

  frame.addEventListener("load", () => {
    window.setTimeout(() => hideScreenshot(), 250);
  });
}

document.addEventListener("DOMContentLoaded", init);
