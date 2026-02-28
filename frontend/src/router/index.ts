import { clearToken, getToken, me } from "../features/auth/authApi";
import {
  createRouter,
  createWebHistory,
  type RouterHistory,
} from "vue-router";
import { appRoutes } from "./routes";

export function createAppRouter({
  history = createWebHistory(import.meta.env.BASE_URL),
}: { history?: RouterHistory } = {}) {
  let validatedToken = "";

  function resolveLoginRedirect(raw: unknown): { path: string; query?: Record<string, string>; hash?: string } {
    const redirect = String(raw || "").trim();
    if (!redirect.startsWith("/admin")) {
      return { path: "/admin/dashboard" };
    }

    try {
      const parsed = new URL(redirect, "http://localhost");
      if (!parsed.pathname.startsWith("/admin")) {
        return { path: "/admin/dashboard" };
      }
      const query: Record<string, string> = {};
      for (const [key, value] of parsed.searchParams.entries()) {
        query[key] = value;
      }
      const hash = parsed.hash || undefined;
      if (!Object.keys(query).length) {
        if (!hash) {
          return { path: parsed.pathname };
        }
        return { path: parsed.pathname, hash };
      }
      return { path: parsed.pathname, query, hash };
    } catch {
      return { path: "/admin/dashboard" };
    }
  }

  const router = createRouter({
    history,
    routes: appRoutes,
  });

  router.beforeEach(async (to) => {
    const isLoginPath = to.path === "/login";
    const loginRedirect = resolveLoginRedirect(to.query.redirect);

    if (isLoginPath) {
      const token = getToken();
      if (!token) {
        validatedToken = "";
        return true;
      }

      if (validatedToken === token) {
        return loginRedirect;
      }

      try {
        await me();
        validatedToken = token;
        return loginRedirect;
      } catch {
        clearToken();
        validatedToken = "";
        return true;
      }
    }

    const isAdminPath = to.path.startsWith("/admin");
    if (!isAdminPath) return true;

    const token = getToken();
    if (!token) {
      validatedToken = "";
      return {
        path: "/login",
        query: { redirect: to.fullPath },
      };
    }

    if (validatedToken === token) return true;

    try {
      await me();
      validatedToken = token;
      return true;
    } catch {
      clearToken();
      validatedToken = "";
      return {
        path: "/login",
        query: { redirect: to.fullPath },
      };
    }
  });

  return router;
}

export const router = createAppRouter();
