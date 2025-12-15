const TOKEN_KEY = "pa_admin_token";

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

function withAuthHeaders(headers) {
  const token = getToken();
  if (!token) return headers;
  return { ...headers, Authorization: `Bearer ${token}` };
}

async function apiFetch(path, options = {}) {
  const headers = withAuthHeaders({
    Accept: "application/json",
    ...(options.headers || {}),
  });

  const response = await fetch(path, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";

  let data = null;
  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => null);
  }

  if (response.ok) return data;

  const error = new Error(data?.error || "request_failed");
  error.status = response.status;
  error.data = data;
  throw error;
}

export async function login({ username, password }) {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!data?.token) throw new Error("missing_token");
  setToken(data.token);
  return data;
}

export async function me() {
  return apiFetch("/api/auth/me", { method: "GET" });
}

export async function tryGetCatalog() {
  return apiFetch("/api/catalog", { method: "GET" });
}

export async function createLink({ url, categoryId, title, description }) {
  return apiFetch("/api/items/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, categoryId, title, description }),
  });
}

export async function uploadHtml({ file, categoryId, title, description }) {
  const body = new FormData();
  body.append("file", file);
  body.append("categoryId", categoryId);
  body.append("title", title);
  body.append("description", description);

  return apiFetch("/api/items/upload", { method: "POST", body });
}

export async function deleteItem(id) {
  return apiFetch(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
}
