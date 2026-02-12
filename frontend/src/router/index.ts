import { getToken } from "../features/auth/authApi";
import {
  createRouter,
  createWebHistory,
  type RouterHistory,
} from "vue-router";
import { appRoutes } from "./routes";

export function createAppRouter({
  history = createWebHistory(import.meta.env.BASE_URL),
}: { history?: RouterHistory } = {}) {
  const router = createRouter({
    history,
    routes: appRoutes,
  });

  router.beforeEach((to) => {
    const isAdminPath = to.path.startsWith("/admin");
    if (!isAdminPath) return true;

    const token = getToken();
    if (token) return true;

    return {
      path: "/login",
      query: { redirect: to.fullPath },
    };
  });

  return router;
}

export const router = createAppRouter();
