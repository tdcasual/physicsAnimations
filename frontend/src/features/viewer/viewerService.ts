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
  deferInteractiveStart: boolean;
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

function isUploadContentTarget(target: string): boolean {
  return target.startsWith("/content/uploads/");
}

function toIsolatedUploadTarget(target: string): string {
  if (!isUploadContentTarget(target)) return target;
  return `/content/isolated${target.slice("/content".length)}`;
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

export async function loadViewerModel(params: ViewerParams): Promise<ViewerModel> {
  const id = String(params.id || "").trim();

  let item: any = null;
  let screenshotUrl = "";
  let title = "作品预览";

  if (id) {
    const fetched = await tryFetchItemMeta(id);
    item = fetched.item;
  }

  let target = item?.src ? String(item.src) : "";

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
  const openHref = target;
  const isUploadTarget = isUploadContentTarget(target);
  const iframeTarget = isUploadTarget ? toIsolatedUploadTarget(target) : target;

  if (item?.title) title = String(item.title);
  if (item?.thumbnail) screenshotUrl = String(item.thumbnail);

  const isExternalLink = item ? item.type === "link" : isHttpUrl(target);
  const hasScreenshotPreview = Boolean(screenshotUrl);
  const iframeSandbox = "allow-scripts";
  const showHint = isExternalLink || isUploadTarget;
  const hintText = isExternalLink
    ? hasScreenshotPreview
      ? "外链站点可能因 X-Frame-Options / CSP 禁止被嵌入：默认先显示截图；如需尝试交互或直接访问，请使用“进入交互”或“打开原页面”。"
      : "外链站点可能因 X-Frame-Options / CSP 禁止被嵌入：若无法嵌入请点“打开原页面”。"
    : isUploadTarget
      ? "上传 HTML 默认通过隔离预览路径加载；如需直接打开原页面，请点击“打开原页面”。"
      : "";
  const showModeToggle = isExternalLink && hasScreenshotPreview;
  const screenshotModeDefault = isExternalLink && hasScreenshotPreview;
  const modeButtonText = screenshotModeDefault ? "进入交互" : "仅截图";
  const deferInteractiveStart = isExternalLink;

  return {
    status: "ready",
    title,
    target: iframeTarget,
    openHref,
    iframeSandbox,
    screenshotUrl,
    showHint,
    hintText,
    showModeToggle,
    screenshotModeDefault,
    modeButtonText,
    deferInteractiveStart,
  };
}
