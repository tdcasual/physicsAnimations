export interface AdminNavItem {
  readonly to: string
  readonly label: string
  readonly description: string
}

export interface AdminNavGroup {
  readonly id: string
  readonly title: string
  readonly summary: string
  readonly items: readonly AdminNavItem[]
}

export const adminNavGroups: readonly AdminNavGroup[] = [
  {
    id: 'workspace',
    title: '内容管理',
    summary: '内容与上传',
    items: [
      { to: '/admin/dashboard', label: '概览', description: '站点概况' },
      { to: '/admin/content', label: '内容', description: '演示条目管理' },
      { to: '/admin/uploads', label: '上传', description: '素材入库' },
    ],
  },
  {
    id: 'library',
    title: '资源结构',
    summary: '文件与分类',
    items: [
      { to: '/admin/library', label: '资源库', description: '文件夹与素材' },
      { to: '/admin/taxonomy', label: '分类', description: '分类结构' },
    ],
  },
  {
    id: 'system',
    title: '系统设置',
    summary: '配置与账号',
    items: [
      { to: '/admin/system', label: '系统', description: '同步与配置' },
      { to: '/admin/account', label: '账号', description: '密码与身份' },
    ],
  },
] as const

export const adminNavItems = adminNavGroups.flatMap(group => group.items)
