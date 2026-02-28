import { getToken } from "../auth/authApi";

interface ViewerParams {
  id?: string;
}

interface ReadyViewerModel {
  status: "ready";
  title: string;
  target: string;
  openHref: string;
  iframeSandbox: string;
  screenshotUrl: string;
  showHint: boolean;
  hintText: string;
  showModeToggle: boolean;
  screenshotModeDefault: boolean;
  modeButtonText: string;
}

interface ErrorViewerModel {
  status: "error";
  title: string;
  message: string;
  code: "missing_params" | "not_found" | "invalid_target";
}

export type ViewerModel = ReadyViewerModel | ErrorViewerModel;

function isHttpUrl(url: unknown): boolean {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

function isSafeViewerTarget(raw: unknown): boolean {
  const target = typeof raw === "string" ? raw.trim() : "";
  if (!target) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
    return /^https?:/i.test(target);
  }
  if (target.startsWith("//")) return false;
  return true;
}

function normalizeViewerTarget(raw: unknown): string {
  const target = typeof raw === "string" ? raw.trim() : "";
  if (!target) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return target;
  if (target.startsWith("//")) return target;
  if (target.startsWith("/")) return target;
  return `/${target.replace(/^\.?\//, "")}`;
}

function toBuiltinUrl(builtinPath: string): string {
  return `animations/${builtinPath}`;
}

async function findBuiltinMeta(builtinPath: string): Promise<Record<string, any> | null> {
  const response = await fetch("/animations.json", { cache: "no-store" });
  if (!response.ok) return null;
  const data = await response.json();

  for (const category of Object.values(data || {})) {
    for (const item of (category as any)?.items || []) {
      if (item?.file === builtinPath) return item;
    }
  }
  return null;
}

async function tryFetchItemMeta(id: string): Promise<{
  item: any | null;
  status: number;
  networkError: boolean;
}> {
  const fetchMeta = async (headers: HeadersInit) => {
    try {
      const response = await fetch(`/api/items/${encodeURIComponent(id)}`, {
        cache: "no-store",
        headers,
      });
      if (!response.ok) {
        return { item: null, status: response.status, networkError: false };
      }
      const data = await response.json().catch(() => null);
      return { item: data?.item || null, status: response.status, networkError: false };
    } catch {
      return { item: null, status: 0, networkError: true };
    }
  };

  const token = getToken();
  const firstAttempt = await fetchMeta(token ? { Authorization: `Bearer ${token}` } : {});

  if (firstAttempt.status === 401 && token) {
    return fetchMeta({});
  }

  return firstAttempt;
}

async function hasBackend(): Promise<boolean> {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

export async function loadViewerModel(params: ViewerParams): Promise<ViewerModel> {
  const id = String(params.id || "").trim();

  let item: any = null;
  let screenshotUrl = "";
  let title = "作品预览";
  let canFallbackToBuiltin = false;

  if (id) {
    const fetched = await tryFetchItemMeta(id);
    item = fetched.item;
    if (!item) {
      if (fetched.networkError) {
        canFallbackToBuiltin = true;
      } else if (fetched.status === 404) {
        canFallbackToBuiltin = !(await hasBackend());
      }
    }
  }

  let target = item?.src ? String(item.src) : "";
  if (!target && id && canFallbackToBuiltin) {
    const meta = await findBuiltinMeta(id);
    if (meta) {
      target = toBuiltinUrl(id);
      if (meta?.title) title = String(meta.title);
      if (meta?.thumbnail) screenshotUrl = String(meta.thumbnail);
    }
  }

  if (!target && id) {
    return {
      status: "error",
      code: "not_found",
      title: "未找到作品",
      message: "作品不存在或无权限访问。",
    };
  }

  if (!target) {
    return {
      status: "error",
      code: "missing_params",
      title: "缺少参数",
      message: "缺少参数：id",
    };
  }

  if (!isSafeViewerTarget(target)) {
    return {
      status: "error",
      code: "invalid_target",
      title: "无效参数",
      message: "参数无效或不安全。",
    };
  }

  target = normalizeViewerTarget(target);

  if (item?.title) title = String(item.title);
  if (item?.thumbnail) screenshotUrl = String(item.thumbnail);

  const isExternalLink = item ? item.type === "link" : isHttpUrl(target);
  const isBuiltinLike = item ? item.type === "builtin" : target.startsWith("/animations/");
  const iframeSandbox = isBuiltinLike ? "allow-scripts allow-same-origin" : "allow-scripts";
  const showHint = isExternalLink;
  const hintText = isExternalLink
    ? "外链站点可能因 X-Frame-Options / CSP 禁止被嵌入：默认直接进入交互；若无法嵌入请点“打开原页面”。"
    : "";
  const showModeToggle = isExternalLink && Boolean(screenshotUrl);
  const screenshotModeDefault = false;
  const modeButtonText = screenshotModeDefault ? "进入交互" : "仅截图";

  return {
    status: "ready",
    title,
    target,
    openHref: target,
    iframeSandbox,
    screenshotUrl,
    showHint,
    hintText,
    showModeToggle,
    screenshotModeDefault,
    modeButtonText,
  };
}
