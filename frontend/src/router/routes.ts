import type { RouteRecordRaw } from "vue-router";

import AdminLayoutView from "../views/admin/AdminLayoutView.vue";
import CatalogView from "../views/CatalogView.vue";
import LibraryFolderView from "../views/LibraryFolderView.vue";
import LoginView from "../views/LoginView.vue";
import ViewerView from "../views/ViewerView.vue";

// Admin views - lazy loaded for better performance
const AdminDashboardView = () => import("../views/admin/AdminDashboardView.vue");
const AdminContentView = () => import("../views/admin/AdminContentView.vue");
const AdminUploadsView = () => import("../views/admin/AdminUploadsView.vue");
const AdminLibraryView = () => import("../views/admin/AdminLibraryView.vue");
const AdminTaxonomyView = () => import("../views/admin/AdminTaxonomyView.vue");
const AdminSystemView = () => import("../views/admin/AdminSystemView.vue");
const AdminAccountView = () => import("../views/admin/AdminAccountView.vue");

export const appRoutes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "catalog",
    component: CatalogView,
  },
  {
    path: "/viewer/:id",
    name: "viewer",
    component: ViewerView,
    props: true,
  },
  {
    path: "/library/folder/:id",
    name: "library-folder",
    component: LibraryFolderView,
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
        path: "library",
        name: "admin-library",
        component: AdminLibraryView,
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
