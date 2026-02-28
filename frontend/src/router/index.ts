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

  const router = createRouter({
    history,
    routes: appRoutes,
  });

  router.beforeEach(async (to) => {
    const isLoginPath = to.path === "/login";
    const loginRedirect = (() => {
      const redirect = String(to.query.redirect || "").trim();
      if (redirect.startsWith("/admin")) return redirect;
      return "/admin/dashboard";
    })();

    if (isLoginPath) {
      const token = getToken();
      if (!token) {
        validatedToken = "";
        return true;
      }

      if (validatedToken === token) {
        return { path: loginRedirect };
      }

      try {
        await me();
        validatedToken = token;
        return { path: loginRedirect };
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
