# 物理动画演示系统 - 年度实施计划

> **目标日期**: 2026年3月 - 2027年3月  
> **核心目标**: 达成 85% 测试覆盖率、90+ Lighthouse 评分、高代码复用率、按需部署能力  
> **基础**: 当前 391 测试通过、44 组件、78 TS 文件、369KB JS + 108KB CSS 生产包

---

## 📊 当前基线（2026年3月）

| 指标 | 当前值 | 目标值（12个月后）|
|------|--------|------------------|
| 单元测试覆盖率 | ~30% | 85% |
| E2E 测试 | 0 | 15+ 场景 |
| Lighthouse 性能 | ~70 | 90+ |
| 生产包大小 | 369KB JS + 108KB CSS | <300KB JS + <80KB CSS |
| 组件复用率 | 中等 | 高（提取 10+ 通用组件）|
| 部署频率 | 手动 | 按需自动 |

---

## 🗓️ 第一阶段：基础加固（第1-3月）

### 月度目标
- 测试覆盖率提升至 60%
- 建立代码规范自动化
- 统一 CSS 变量体系

### 第1月：测试基础设施

#### Week 1-2: E2E 测试框架
```
任务：集成 Playwright E2E 测试
├── Day 1-2: 安装配置 Playwright
│   npm install -D @playwright/test
│   npx playwright install
│
├── Day 3-5: 编写核心流程测试
│   - 登录/登出流程 ✓
│   - 目录浏览 → 演示播放 ✓
│   - 收藏功能 ✓
│
└── Day 6-10: CI 集成
    - GitHub Actions 配置
    - 测试报告生成
    - 失败截图/视频
```

**验收标准**:
- [ ] 5 个核心 E2E 场景通过
- [ ] CI 中自动运行
- [ ] 失败时自动截图

#### Week 3-4: 核心 Composables 单元测试
```
优先级队列：
1. useAuthStore (认证状态) ← 高优先级
2. useCatalogViewState (目录状态) ← 高优先级
3. useFieldErrors (表单错误) ← 中优先级
4. usePagedAdminList (分页列表) ← 中优先级
5. useActionFeedback (操作反馈) ← 低优先级
```

**验收标准**:
- [ ] `useAuthStore` 覆盖率 > 90%
- [ ] `useCatalogViewState` 覆盖率 > 80%
- [ ] 整体覆盖率提升至 45%

---

### 第2月：代码规范与质量

#### Week 1: ESLint + Prettier 升级
```typescript
// .eslintrc.cjs 新增规则
{
  rules: {
    // Vue
    'vue/no-unused-refs': 'error',
    'vue/require-explicit-emits': 'error',
    'vue/require-typed-ref': 'warn',
    
    // TypeScript
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    
    // Import
    'import/order': ['error', { 
      'groups': ['builtin', 'external', 'internal', 'parent', 'sibling'] 
    }],
    
    // Complexity
    'complexity': ['warn', 15],
    'max-lines-per-function': ['warn', 100]
  }
}
```

#### Week 2-3: Git Hooks 自动化
```bash
# 安装依赖
npm install -D husky lint-staged

# 配置
npx husky-init
npx husky add .husky/pre-commit 'npx lint-staged'
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit ${1}'
```

```javascript
// lint-staged.config.mjs
export default {
  '*.{js,ts,vue}': ['eslint --fix', 'prettier --write'],
  '*.{css,scss}': ['prettier --write'],
}
```

#### Week 4: 代码审查清单
创建 `.github/PULL_REQUEST_TEMPLATE.md`:
```markdown
## 检查清单
- [ ] 测试通过 (`npm test`)
- [ ] 类型检查通过 (`npm run typecheck`)
- [ ] 构建成功 (`npm run build`)
- [ ] 新功能有对应测试
- [ ] 复杂逻辑有注释
```

**验收标准**:
- [ ] 所有提交自动格式化
- [ ] 提交信息符合规范
- [ ] PR 模板使用率 100%

---

### 第3月：CSS 架构统一

#### Week 1-2: 变量迁移
```
迁移计划：
1. 扫描所有 .vue 和 .css 文件
2. 替换旧变量 → 新变量
3. 删除向后兼容代码

旧变量 → 新变量映射：
--surface      → --surface-bg
--border       → --border-default
--muted        → --text-tertiary
--accent       → --accent-8
--text         → --text-primary
--bg           → --surface-bg
--paper        → --surface-page
```

#### Week 3-4: 组件样式文档
创建 `src/styles/components.md`:
```markdown
# 组件样式规范

## Button
- 使用 `p-button` 基础类
- 变体：`p-button--primary`, `p-button--ghost`
- 尺寸：`p-button--sm`, `p-button--md`, `p-button--lg`

## Card
- 使用 `p-card` 基础类
- 内边距：`p-card--padding-sm/md/lg`
```

**验收标准**:
- [ ] 所有组件使用新变量
- [ ] 向后兼容代码已移除
- [ ] 样式文档完成
- [ ] 覆盖率提升至 60%

---

## 🗓️ 第二阶段：架构重构（第4-6月）

### 月度目标
- 引入 Pinia Store 分层
- 提取 5+ 通用组件
- Lighthouse 性能提升至 80+

### 第4月：Pinia Store 重构

#### Week 1-2: Catalog Store
```typescript
// stores/catalog.ts
export const useCatalogStore = defineStore('catalog', () => {
  // State
  const groups = ref<CatalogGroup[]>([])
  const categories = ref<CatalogCategory[]>([])
  const items = ref<CatalogItem[]>([])
  const loading = ref(false)
  
  // Getters
  const activeGroup = computed(() => ...)
  const filteredItems = computed(() => ...)
  
  // Actions
  async function loadCatalog() { ... }
  function selectGroup(id: string) { ... }
  function selectCategory(id: string) { ... }
  
  return {
    groups, categories, items, loading,
    activeGroup, filteredItems,
    loadCatalog, selectGroup, selectCategory
  }
})
```

#### Week 3-4: Admin Stores
```
stores/admin/
├── content.ts      # 内容管理状态
├── uploads.ts      # 上传管理状态
├── taxonomy.ts     # 分类管理状态
└── library.ts      # 资源库状态
```

**迁移策略**:
```
Phase 1: 新建 Store 文件
Phase 2: 在 composables 中使用 Store
Phase 3: 逐步替换 composable 调用
Phase 4: 删除旧 composables
```

**验收标准**:
- [ ] Catalog Store 完成并测试
- [ ] 至少 2 个 Admin Store 完成
- [ ] 无状态丢失问题

---

### 第5月：组件库建设

#### Week 1-2: 布局组件提取
```vue
<!-- components/layout/AdminWorkspaceLayout.vue -->
<template>
  <div class="admin-workspace-grid">
    <div class="list-panel admin-card">
      <slot name="list-header" />
      <slot name="list" />
      <slot name="list-footer" />
    </div>
    
    <button 
      v-if="showBackdrop" 
      class="editor-sheet-backdrop"
      @click="$emit('close')"
    />
    
    <aside 
      :class="['editor-panel', { 'is-open': isOpen }]"
    >
      <slot name="editor" />
    </aside>
  </div>
</template>
```

**提取通用组件**:
1. `AdminWorkspaceLayout` - 管理工作区布局
2. `DataList` - 带分页的数据列表
3. `EditorPanel` - 编辑面板
4. `SearchField` - 搜索输入框
5. `ActionBar` - 操作按钮栏

#### Week 3-4: 组件文档（Storybook）
```bash
# 安装
npx storybook@latest init

# 编写示例
# components/ui/PButton.stories.ts
```

```typescript
// PButton.stories.ts
import type { Meta, StoryObj } from '@storybook/vue3'
import PButton from './PButton.vue'

const meta: Meta<typeof PButton> = {
  component: PButton,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  }
}

export const Primary: StoryObj = {
  args: { variant: 'primary', size: 'md', default: '点击我' }
}
```

**验收标准**:
- [ ] 5 个通用组件提取完成
- [ ] Storybook 部署成功
- [ ] 组件文档覆盖率 50%

---

### 第6月：性能优化

#### Week 1-2: 路由懒加载
```typescript
// router/routes.ts
const AdminDashboardView = () => 
  import(/* webpackChunkName: "admin-dashboard" */ '../views/admin/AdminDashboardView.vue')

const AdminContentView = () => 
  import(/* webpackChunkName: "admin-content" */ '../views/admin/AdminContentView.vue')

// 每个 admin 子页面独立 chunk
```

#### Week 3: 虚拟滚动
```vue
<!-- 目录列表虚拟滚动 -->
<template>
  <RecycleScroller
    class="items-grid"
    :items="items"
    :item-size="280"
    key-field="id"
  >
    <template #default="{ item }">
      <PCard hoverable class="item-card">
        <!-- item content -->
      </PCard>
    </template>
  </RecycleScroller>
</template>
```

#### Week 4: 图片优化
```html
<!-- 响应式图片 -->
<img 
  :src="thumbnailUrl"
  :srcset="`${thumbnailUrlSmall} 300w, ${thumbnailUrl} 600w`"
  sizes="(max-width: 768px) 100vw, 33vw"
  loading="lazy"
  decoding="async"
/>
```

**验收标准**:
- [ ] Lighthouse 性能评分 ≥ 80
- [ ] 首屏加载 < 2s
- [ ] 虚拟滚动列表流畅

---

## 🗓️ 第三阶段：功能增强（第7-9月）

### 月度目标
- PWA 基础功能
- 无障碍 WCAG AA 合规
- 监控体系建立

### 第7月：PWA 支持

#### Week 1-2: Service Worker
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache' }
          }
        ]
      },
      manifest: {
        name: '物理动画演示系统',
        short_name: '物理演示',
        theme_color: '#ffffff',
        icons: [
          { src: '/icon-192.png', sizes: '192x192' },
          { src: '/icon-512.png', sizes: '512x512' }
        ]
      }
    })
  ]
}
```

#### Week 3-4: 离线体验
```typescript
// 离线提示组件
const isOnline = useOnline()

// 目录缓存策略
const catalogCache = useCatalogCache() // 本地 IndexedDB
```

**验收标准**:
- [ ] Lighthouse PWA 评分 ≥ 90
- [ ] 离线可浏览目录
- [ ] 支持添加到主屏幕

---

### 第8月：无障碍优化

#### Week 1-2: 键盘导航
```vue
<!-- 焦点管理 -->
<template>
  <nav role="navigation" aria-label="主导航">
    <button 
      ref="firstFocusable"
      @keydown="handleKeydown"
      aria-expanded="isOpen"
    >
      菜单
    </button>
  </nav>
</template>
```

#### Week 3-4: ARIA 与对比度
```
检查清单：
□ 所有图片有 alt 文本
□ 表单有关联 label
□ 颜色对比度 ≥ 4.5:1
□ 焦点指示器可见
□ 屏幕阅读器测试通过
```

**验收标准**:
- [ ] axe-core 扫描无严重问题
- [ ] 键盘可操作所有功能
- [ ] 屏幕阅读器测试通过

---

### 第9月：监控体系

#### Week 1-2: 错误追踪
```typescript
// main.ts
import * as Sentry from '@sentry/vue'

Sentry.init({
  app,
  dsn: 'YOUR_SENTRY_DSN',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.01
})
```

#### Week 3-4: 性能监控
```typescript
// Web Vitals 收集
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

function sendToAnalytics(metric: Metric) {
  fetch('/api/analytics/vitals', {
    method: 'POST',
    body: JSON.stringify(metric)
  })
}

getCLS(sendToAnalytics)
getFID(sendToAnalytics)
getLCP(sendToAnalytics)
```

**验收标准**:
- [ ] 生产错误实时通知
- [ ] Web Vitals 数据收集
- [ ] 用户行为分析就绪

---

## 🗓️ 第四阶段：工程化完善（第10-12月）

### 月度目标
- 国际化基础架构
- 自动化部署
- 技术债务清理

### 第10月：国际化（i18n）

#### Week 1-2: Vue I18n 集成
```typescript
// i18n/index.ts
import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN.json'
import en from './locales/en.json'

export default createI18n({
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: { 'zh-CN': zhCN, en }
})
```

#### Week 3-4: 翻译提取
```json
// locales/zh-CN.json
{
  "nav": {
    "home": "首页",
    "catalog": "目录",
    "admin": "管理后台"
  },
  "catalog": {
    "search": "搜索演示...",
    "favorites": "收藏",
    "recent": "最近查看"
  }
}
```

**验收标准**:
- [ ] i18n 框架集成完成
- [ ] 所有 UI 文本可翻译
- [ ] 语言切换功能正常

---

### 第11月：CI/CD 自动化

#### Week 1-2: GitHub Actions 工作流
```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit -- --coverage
      - run: npm run test:e2e
      - run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy to production"
```

#### Week 3-4: 预览环境
```yaml
# 每个 PR 自动生成预览链接
- name: Deploy Preview
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./dist
    destination_dir: preview/${{ github.event.number }}
```

**验收标准**:
- [ ] 每次 PR 自动测试
- [ ] 预览环境自动生成
- [ ] 主分支自动部署

---

### 第12月：收尾与规划

#### Week 1-2: 技术债务清理
```
清理清单：
□ 移除未使用的代码
□ 更新依赖到最新版本
□ 修复所有警告
□ 补充缺失的文档
□ 优化 bundle 大小
```

#### Week 3-4: 年度回顾与下年规划
```
产出物：
1. 年度技术报告
2. 性能对比分析
3. 下一年度路线图
4. 团队技术分享
```

**最终验收标准**:
- [ ] 测试覆盖率 ≥ 85%
- [ ] Lighthouse ≥ 90
- [ ] 按需部署就绪
- [ ] 技术文档完整

---

## 📈 里程碑检查点

```
第3月末: 覆盖率 60%, 代码规范自动化, CSS 统一
    ↓
第6月末: 覆盖率 75%, Pinia Store, 5+ 通用组件, Lighthouse 80+
    ↓
第9月末: 覆盖率 80%, PWA, 无障碍合规, 监控体系
    ↓
第12月末: 覆盖率 85%, i18n, CI/CD, 技术债务清理
```

---

## 🛠️ 资源需求

| 资源 | 数量 | 用途 |
|------|------|------|
| 开发人员 | 1-2 FTE | 主要实施 |
| 测试人员 | 0.5 FTE | E2E 测试 |
| Sentry 服务 | 1 个 | 错误监控 |
| 预览环境 | 1 个 | PR 预览 |
| 文档时间 | 10% | 技术文档 |

---

## ⚠️ 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 重构引入 Bug | 高 | 逐步迁移，保持测试 |
| 性能优化无效 | 中 | 先测量再优化 |
| 依赖更新兼容 | 中 | 锁定版本，渐进升级 |
| 团队时间不足 | 高 | 优先级排序，分期实施 |

---

## 📝 文档配套

本计划需要配合以下文档：
- `LONG_TERM_ROADMAP.md` - 长期路线图
- `ARCHITECTURE.md` - 架构设计文档
- `TESTING_GUIDE.md` - 测试编写指南
- `DEPLOYMENT.md` - 部署操作手册

---

*制定日期: 2026年3月*  
*下次评审: 2026年6月*  
*版本: 1.0*
