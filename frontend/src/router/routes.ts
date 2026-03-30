import type { RouteRecordRaw } from 'vue-router'

// 核心页面 - 同步加载
import CatalogView from '../views/CatalogView.vue'
import ViewerView from '../views/ViewerView.vue'
import LoginView from '../views/LoginView.vue'

// Admin 页面 - 懒加载 (按功能分组)
const AdminLayoutView = () => import('../views/admin/AdminLayoutView.vue')
const AdminDashboardView = () =>
  import(/* webpackChunkName: "admin-dashboard" */ '../views/admin/AdminDashboardView.vue')
const AdminContentView = () =>
  import(/* webpackChunkName: "admin-content" */ '../views/admin/AdminContentView.vue')
const AdminUploadsView = () =>
  import(/* webpackChunkName: "admin-uploads" */ '../views/admin/AdminUploadsView.vue')
const AdminLibraryView = () =>
  import(/* webpackChunkName: "admin-library" */ '../views/admin/AdminLibraryView.vue')
const AdminTaxonomyView = () =>
  import(/* webpackChunkName: "admin-taxonomy" */ '../views/admin/AdminTaxonomyView.vue')
const AdminSystemView = () =>
  import(/* webpackChunkName: "admin-system" */ '../views/admin/AdminSystemView.vue')
const AdminAccountView = () =>
  import(/* webpackChunkName: "admin-account" */ '../views/admin/AdminAccountView.vue')

// 次要页面 - 懒加载
const LibraryFolderView = () =>
  import(/* webpackChunkName: "library" */ '../views/LibraryFolderView.vue')

export const appRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'catalog',
    component: CatalogView,
    meta: {
      title: '物理动画演示系统',
      description: '初高中物理演示动画目录',
    },
  },
  {
    path: '/viewer/:id',
    name: 'viewer',
    component: ViewerView,
    props: true,
    meta: {
      title: '演示播放',
    },
  },
  {
    path: '/library/folder/:id',
    name: 'library-folder',
    component: LibraryFolderView,
    props: true,
    meta: {
      title: '资源库',
    },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      title: '管理员登录',
      public: true,
    },
  },
  {
    path: '/admin',
    component: AdminLayoutView,
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        redirect: { name: 'admin-dashboard' },
      },
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: AdminDashboardView,
        meta: {
          title: '管理后台 - 概览',
        },
      },
      {
        path: 'content',
        name: 'admin-content',
        component: AdminContentView,
        meta: {
          title: '管理后台 - 内容管理',
        },
      },
      {
        path: 'uploads',
        name: 'admin-uploads',
        component: AdminUploadsView,
        meta: {
          title: '管理后台 - 上传管理',
        },
      },
      {
        path: 'library',
        name: 'admin-library',
        component: AdminLibraryView,
        meta: {
          title: '管理后台 - 资源库',
        },
      },
      {
        path: 'taxonomy',
        name: 'admin-taxonomy',
        component: AdminTaxonomyView,
        meta: {
          title: '管理后台 - 分类管理',
        },
      },
      {
        path: 'system',
        name: 'admin-system',
        component: AdminSystemView,
        meta: {
          title: '管理后台 - 系统设置',
        },
      },
      {
        path: 'account',
        name: 'admin-account',
        component: AdminAccountView,
        meta: {
          title: '管理后台 - 账号设置',
        },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

// 路由名称映射（用于类型提示）
export type RouteName =
  | 'catalog'
  | 'viewer'
  | 'library-folder'
  | 'login'
  | 'admin-dashboard'
  | 'admin-content'
  | 'admin-uploads'
  | 'admin-library'
  | 'admin-taxonomy'
  | 'admin-system'
  | 'admin-account'
