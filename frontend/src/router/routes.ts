import type { RouteRecordRaw } from "vue-router";

import AdminAccountView from "../views/admin/AdminAccountView.vue";
import AdminContentView from "../views/admin/AdminContentView.vue";
import AdminDashboardView from "../views/admin/AdminDashboardView.vue";
import AdminLayoutView from "../views/admin/AdminLayoutView.vue";
import AdminSystemView from "../views/admin/AdminSystemView.vue";
import AdminTaxonomyView from "../views/admin/AdminTaxonomyView.vue";
import AdminUploadsView from "../views/admin/AdminUploadsView.vue";
import CatalogView from "../views/CatalogView.vue";
import LoginView from "../views/LoginView.vue";
import ViewerView from "../views/ViewerView.vue";

export const appRoutes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "catalog",
    component: CatalogView,
  },
  {
    path: "/viewer",
    name: "viewer-query",
    component: ViewerView,
  },
  {
    path: "/viewer/:id",
    name: "viewer",
    component: ViewerView,
    props: true,
  },
  {
    path: "/login",
    name: "login",
    component: LoginView,
  },
  {
    path: "/admin",
    component: AdminLayoutView,
    children: [
      {
        path: "",
        redirect: { name: "admin-dashboard" },
      },
      {
        path: "dashboard",
        name: "admin-dashboard",
        component: AdminDashboardView,
      },
      {
        path: "content",
        name: "admin-content",
        component: AdminContentView,
      },
      {
        path: "uploads",
        name: "admin-uploads",
        component: AdminUploadsView,
      },
      {
        path: "taxonomy",
        name: "admin-taxonomy",
        component: AdminTaxonomyView,
      },
      {
        path: "system",
        name: "admin-system",
        component: AdminSystemView,
      },
      {
        path: "account",
        name: "admin-account",
        component: AdminAccountView,
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];
