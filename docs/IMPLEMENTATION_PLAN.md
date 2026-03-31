# 物理动画演示系统 - 可执行实施计划

> **执行周期**: 2026年3月 - 2027年3月 (第1年已完成)  
> **当前状态**: 477+ 单元测试通过，58 Vue 组件，107 TS 文件  
> **成就**: ✅ 12 个 Sprint 全部完成，PWA 支持，WCAG AA，CI/CD 自动化
> 
> 📊 [查看项目统计报告](../PROJECT_STATS.md)  
> 📋 [查看年度总结报告](./ANNUAL_SUMMARY.md)

---

## 📋 执行准备

### 前置检查清单
```bash
# 1. 确认当前状态
cd /Users/lvxiaoer/Documents/codeWork/physicsAnimations/frontend
npm test -- --run           # 应显示 391 tests passing
npm run typecheck           # 应无错误
npm run build               # 应构建成功

# 2. 创建功能分支
git checkout -b feature/annual-improvements

# 3. 安装基础依赖
npm install -D @playwright/test @vitest/coverage-v8 @vue/test-utils@next
npx playwright install
```

---

## 第一阶段：测试基础设施（第1-3月）

### Sprint 1: E2E 测试框架搭建（第1-2周）

#### Day 1-2: Playwright 安装与配置

**Step 1: 安装依赖**
```bash
npm install -D @playwright/test
npx playwright install chromium firefox webkit
```

**Step 2: 配置文件**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

**Step 3: 添加测试命令**
```json
// package.json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

**Step 4: 编写第一个 E2E 测试**
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login with valid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL(/.*admin/)
    await expect(page.locator('.admin-shell')).toBeVisible()
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[name="username"]', 'wrong')
    await page.fill('input[name="password"]', 'wrong')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('.form-error')).toBeVisible()
    await expect(page.locator('.form-error')).toContainText('用户名或密码错误')
  })

  test('logout redirects to home', async ({ page }) => {
    // 先登录
    await page.goto('/login')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    
    // 点击退出
    await page.click('text=退出')
    
    await expect(page).toHaveURL('/')
  })
})
```

**验收标准**:
- [ ] `npm run test:e2e` 成功运行
- [ ] 3 个认证测试通过
- [ ] 生成 HTML 测试报告

---

#### Day 3-5: 核心用户流程测试

```typescript
// e2e/catalog.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Catalog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('displays catalog groups', async ({ page }) => {
    await expect(page.locator('.nav-groups')).toBeVisible()
    await expect(page.locator('.nav-tab').first()).toBeVisible()
  })

  test('can switch between groups', async ({ page }) => {
    const firstGroup = page.locator('.nav-groups .nav-tab').first()
    const secondGroup = page.locator('.nav-groups .nav-tab').nth(1)
    
    await secondGroup.click()
    await expect(secondGroup).toHaveClass(/active/)
    
    await firstGroup.click()
    await expect(firstGroup).toHaveClass(/active/)
  })

  test('can search items', async ({ page }) => {
    const searchInput = page.locator('.topbar-search')
    await searchInput.fill('力学')
    
    await page.waitForTimeout(300) // debounce
    
    const items = page.locator('.item-card')
    await expect(items).toHaveCount(0, { timeout: 5000 })
  })

  test('can favorite an item', async ({ page }) => {
    const firstItem = page.locator('.item-card').first()
    const favoriteBtn = firstItem.locator('.favorite-btn')
    
    await favoriteBtn.click()
    await expect(favoriteBtn).toHaveClass(/active/)
  })

  test('navigates to viewer on item click', async ({ page }) => {
    const firstItem = page.locator('.item-card').first()
    const itemLink = firstItem.locator('.item-link').first()
    
    await itemLink.click()
    
    await expect(page).toHaveURL(/.*viewer/)
    await expect(page.locator('.viewer-stage-shell')).toBeVisible()
  })
})
```

```typescript
// e2e/admin-content.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Admin Content', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    
    // 进入内容管理
    await page.goto('/admin/content')
  })

  test('displays content list', async ({ page }) => {
    await expect(page.locator('.admin-content-view')).toBeVisible()
    await expect(page.locator('.list-panel')).toBeVisible()
  })

  test('can create new link item', async ({ page }) => {
    await page.fill('[data-testid="link-url"]', 'https://example.com')
    await page.fill('[data-testid="link-title"]', '测试链接')
    await page.fill('[data-testid="link-description"]', '这是一个测试')
    
    await page.click('button:has-text("添加链接")')
    
    await expect(page.locator('.action-feedback')).toContainText('链接已添加')
  })

  test('can edit existing item', async ({ page }) => {
    const editBtn = page.locator('.item-actions button:has-text("编辑")').first()
    await editBtn.click()
    
    await page.fill('[data-testid="edit-title"]', '修改后的标题')
    await page.click('button:has-text("保存")')
    
    await expect(page.locator('.action-feedback')).toContainText('已保存')
  })
})
```

**验收标准**:
- [ ] 目录浏览测试通过
- [ ] 搜索功能测试通过
- [ ] 收藏功能测试通过
- [ ] 内容管理 CRUD 测试通过
- [ ] 总共 10+ E2E 测试

---

#### Day 6-10: CI/CD 集成

**GitHub Actions 配置**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:unit -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  build:
    runs-on: ubuntu-latest
    needs: [unit-test, e2e-test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
```

**验收标准**:
- [ ] PR 自动触发测试
- [ ] E2E 失败自动上传截图
- [ ] 覆盖率自动上报

---

### Sprint 2: 单元测试补充（第3-4周）

#### 覆盖率配置
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
      exclude: [
        'node_modules/',
        'test/',
        '*.config.*',
        '**/types.ts',
      ],
    },
  },
})
```

#### useAuthStore 测试
```typescript
// test/unit/useAuthStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../src/features/auth/useAuthStore'
import * as authApi from '../../src/features/auth/authApi'

vi.mock('../../src/features/auth/authApi')

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with logged out state', () => {
    const store = useAuthStore()
    expect(store.loggedIn).toBe(false)
    expect(store.username).toBe('')
  })

  it('bootstrap sets logged in when token valid', async () => {
    vi.mocked(authApi.getToken).mockReturnValue('valid-token')
    vi.mocked(authApi.me).mockResolvedValue({ username: 'admin' })

    const store = useAuthStore()
    await store.bootstrap()

    expect(store.loggedIn).toBe(true)
    expect(store.username).toBe('admin')
  })

  it('bootstrap clears state when token invalid', async () => {
    vi.mocked(authApi.getToken).mockReturnValue('invalid-token')
    vi.mocked(authApi.me).mockRejectedValue(new Error('Unauthorized'))

    const store = useAuthStore()
    await store.bootstrap()

    expect(store.loggedIn).toBe(false)
    expect(authApi.clearToken).toHaveBeenCalled()
  })

  it('loginWithPassword sets auth state', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ token: 'new-token' })
    vi.mocked(authApi.me).mockResolvedValue({ username: 'admin' })

    const store = useAuthStore()
    await store.loginWithPassword({ username: 'admin', password: 'pass' })

    expect(store.loggedIn).toBe(true)
    expect(store.username).toBe('admin')
  })

  it('logout clears auth state', () => {
    const store = useAuthStore()
    store.loggedIn = true
    store.username = 'admin'

    store.logout()

    expect(store.loggedIn).toBe(false)
    expect(store.username).toBe('')
    expect(authApi.clearToken).toHaveBeenCalled()
  })
})
```

#### useFieldErrors 测试
```typescript
// test/unit/useFieldErrors.test.ts
import { describe, it, expect } from 'vitest'
import { useFieldErrors } from '../../src/features/admin/composables/useFieldErrors'

describe('useFieldErrors', () => {
  it('sets field error', () => {
    const { fieldErrors, setFieldError } = useFieldErrors()
    
    setFieldError('username', '用户名不能为空')
    
    expect(fieldErrors.value.username).toBe('用户名不能为空')
  })

  it('clears single field error', () => {
    const { fieldErrors, setFieldError, clearFieldErrors } = useFieldErrors()
    
    setFieldError('username', '错误')
    setFieldError('password', '错误')
    clearFieldErrors('username')
    
    expect(fieldErrors.value.username).toBeUndefined()
    expect(fieldErrors.value.password).toBe('错误')
  })

  it('clears all errors', () => {
    const { fieldErrors, setFieldError, clearFieldErrors } = useFieldErrors()
    
    setFieldError('username', '错误')
    setFieldError('password', '错误')
    clearFieldErrors()
    
    expect(fieldErrors.value).toEqual({})
  })

  it('gets field error', () => {
    const { setFieldError, getFieldError } = useFieldErrors()
    
    setFieldError('email', '邮箱格式错误')
    
    expect(getFieldError('email')).toBe('邮箱格式错误')
    expect(getFieldError('username')).toBe('')
  })
})
```

**验收标准**:
- [ ] 核心 composables 覆盖率 > 80%
- [ ] 整体覆盖率 > 45%
- [ ] CI 中自动检查覆盖率阈值

---

### Sprint 3: 代码规范自动化（第5-6周）

#### ESLint 升级
```javascript
// .eslintrc.cjs
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@vue/typescript/recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // Vue
    'vue/no-unused-refs': 'error',
    'vue/require-explicit-emits': 'error',
    'vue/require-default-prop': 'error',
    'vue/no-multiple-template-root': 'off',
    
    // TypeScript
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    
    // General
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    'no-debugger': 'error',
    'prefer-const': 'error',
  },
}
```

#### Git Hooks 配置
```bash
# 安装
npm install -D husky lint-staged

# 初始化
npx husky-init

# 配置 pre-commit
echo "npx lint-staged" > .husky/pre-commit
```

```javascript
// lint-staged.config.mjs
export default {
  '*.{js,ts,vue}': ['eslint --fix', 'prettier --write'],
  '*.{css,scss}': ['prettier --write'],
  '*.{json,md}': ['prettier --write'],
}
```

#### Prettier 配置
```javascript
// .prettierrc.cjs
module.exports = {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
  vueIndentScriptAndStyle: true,
}
```

**验收标准**:
- [ ] 提交前自动格式化
- [ ] ESLint 无错误
- [ ] 所有代码符合规范

---

## 第二阶段：架构重构（第4-6月）

### Sprint 4: Pinia Store 重构（第7-8周）

#### Store 设计
```typescript
// stores/catalog.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { CatalogData, CatalogGroup, CatalogCategory, CatalogItem } from '../features/catalog/types'
import { loadCatalogData } from '../features/catalog/catalogService'

export const useCatalogStore = defineStore('catalog', () => {
  // State
  const catalog = ref<CatalogData>({ groups: {} })
  const loading = ref(false)
  const error = ref('')
  const selectedGroupId = ref('physics')
  const selectedCategoryId = ref('all')
  const searchQuery = ref('')

  // Getters
  const groups = computed(() => Object.values(catalog.value.groups || {}))
  
  const activeGroup = computed(() => 
    catalog.value.groups?.[selectedGroupId.value]
  )
  
  const categories = computed(() => 
    Object.values(activeGroup.value?.categories || {})
  )
  
  const filteredItems = computed(() => {
    const items = Object.values(activeGroup.value?.categories || {})
      .flatMap(c => c.items || [])
    
    if (!searchQuery.value) return items
    
    const q = searchQuery.value.toLowerCase()
    return items.filter(item => 
      item.title?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q)
    )
  })

  // Actions
  async function loadCatalog() {
    loading.value = true
    error.value = ''
    try {
      const result = await loadCatalogData()
      catalog.value = result.catalog
    } catch (e) {
      error.value = '加载目录失败'
    } finally {
      loading.value = false
    }
  }

  function selectGroup(id: string) {
    selectedGroupId.value = id
    selectedCategoryId.value = 'all'
  }

  function selectCategory(id: string) {
    selectedCategoryId.value = id
  }

  function setSearchQuery(q: string) {
    searchQuery.value = q
  }

  return {
    catalog,
    loading,
    error,
    selectedGroupId,
    selectedCategoryId,
    searchQuery,
    groups,
    activeGroup,
    categories,
    filteredItems,
    loadCatalog,
    selectGroup,
    selectCategory,
    setSearchQuery,
  }
})
```

#### Store 测试
```typescript
// test/stores/catalog.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCatalogStore } from '../../src/stores/catalog'
import * as catalogService from '../../src/features/catalog/catalogService'

vi.mock('../../src/features/catalog/catalogService')

describe('Catalog Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads catalog successfully', async () => {
    const mockCatalog = {
      groups: {
        physics: { id: 'physics', title: '物理', categories: {} }
      }
    }
    vi.mocked(catalogService.loadCatalogData).mockResolvedValue({
      ok: true,
      catalog: mockCatalog
    })

    const store = useCatalogStore()
    await store.loadCatalog()

    expect(store.catalog).toEqual(mockCatalog)
    expect(store.loading).toBe(false)
    expect(store.error).toBe('')
  })

  it('selects group and resets category', () => {
    const store = useCatalogStore()
    store.selectedCategoryId = 'some-category'
    
    store.selectGroup('chemistry')
    
    expect(store.selectedGroupId).toBe('chemistry')
    expect(store.selectedCategoryId).toBe('all')
  })
})
```

**验收标准**:
- [ ] Catalog Store 完成并测试
- [ ] 至少 2 个 Admin Store 完成
- [ ] View 层成功迁移

---

### Sprint 5: 通用组件库（第9-10周）

#### 布局组件
```vue
<!-- components/layout/AdminWorkspaceLayout.vue -->
<template>
  <div class="admin-workspace-grid" :class="{ 'is-mobile': isMobile }">
    <div class="list-panel admin-card">
      <slot name="list-header" />
      <div class="list-content">
        <slot name="list" />
      </div>
      <slot name="list-footer" />
    </div>
    
    <button
      v-if="showBackdrop"
      type="button"
      class="editor-sheet-backdrop"
      aria-label="关闭编辑面板"
      @click="$emit('close')"
    />
    
    <aside
      :class="['editor-panel', 'admin-card', { 'is-open': isOpen }]"
    >
      <slot name="editor" />
    </aside>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
  isMobile: boolean
}

const props = defineProps<Props>()
defineEmits<{
  close: []
}>()

const showBackdrop = computed(() => props.isOpen && props.isMobile)
</script>
```

#### Storybook 配置
```bash
# 安装
npx storybook@latest init

# 创建组件文档
# components/ui/PButton.stories.ts
```

```typescript
// components/ui/PButton.stories.ts
import type { Meta, StoryObj } from '@storybook/vue3'
import PButton from './PButton.vue'

const meta: Meta<typeof PButton> = {
  component: PButton,
  title: 'Components/PButton',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    default: '主要按钮',
  },
}

export const Loading: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    loading: true,
    default: '加载中',
  },
}
```

**验收标准**:
- [ ] 5 个通用组件提取
- [ ] Storybook 部署
- [ ] 组件文档完整

---

### Sprint 6: 性能优化（第11-12周）

#### 路由懒加载
```typescript
// router/routes.ts
const AdminDashboardView = () => 
  import(/* webpackChunkName: "admin-dashboard" */ '../views/admin/AdminDashboardView.vue')

const AdminContentView = () => 
  import(/* webpackChunkName: "admin-content" */ '../views/admin/AdminContentView.vue')

const AdminUploadsView = () => 
  import(/* webpackChunkName: "admin-uploads" */ '../views/admin/AdminUploadsView.vue')

const AdminLibraryView = () => 
  import(/* webpackChunkName: "admin-library" */ '../views/admin/AdminLibraryView.vue')

// ... 其他路由
```

#### 虚拟滚动
```vue
<!-- 使用 vue-virtual-scroller -->
<template>
  <RecycleScroller
    class="items-grid"
    :items="items"
    :item-size="320"
    key-field="id"
    v-slot="{ item }"
  >
    <PCard hoverable class="item-card">
      <RouterLink :to="getItemHref(item)" class="item-link">
        <img :src="item.thumbnail" loading="lazy" />
        <h3>{{ item.title }}</h3>
      </RouterLink>
    </PCard>
  </RecycleScroller>
</template>
```

#### 图片优化
```html
<!-- 响应式图片 -->
<img
  :src="thumbnail"
  :srcset="`${thumbnailSmall} 300w, ${thumbnailMedium} 600w, ${thumbnail} 900w`"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  loading="lazy"
  decoding="async"
  :alt="title"
/>
```

**验收标准**:
- [ ] Lighthouse 性能 ≥ 80
- [ ] JS bundle < 300KB
- [ ] 首屏 < 2s

---

## 第三阶段：功能增强（第7-9月）

### Sprint 7: PWA 支持（第13-14周）

#### Vite PWA 配置
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\/catalog/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'catalog-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      },
      manifest: {
        name: '物理动画演示系统',
        short_name: '物理演示',
        description: '高中物理动画演示集合',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})
```

#### 离线提示组件
```vue
<!-- components/AppOfflineIndicator.vue -->
<template>
  <Transition name="fade">
    <div v-if="!isOnline" class="offline-indicator">
      <span>⚠️ 您已离线，部分功能可能不可用</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useOnline } from '@vueuse/core'

const isOnline = useOnline()
</script>
```

**验收标准**:
- [ ] Lighthouse PWA ≥ 90
- [ ] 离线可浏览目录
- [ ] 支持添加到主屏幕

---

### Sprint 8: 无障碍优化（第15-16周）

#### 焦点管理
```typescript
// composables/useFocusTrap.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useFocusTrap(containerRef: Ref<HTMLElement | null>) {
  const previousFocus = ref<HTMLElement | null>(null)
  
  onMounted(() => {
    previousFocus.value = document.activeElement as HTMLElement
    
    const container = containerRef.value
    if (!container) return
    
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    firstElement?.focus()
    
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }
    
    container.addEventListener('keydown', handleKeydown)
    
    onUnmounted(() => {
      container.removeEventListener('keydown', handleKeydown)
      previousFocus.value?.focus()
    })
  })
}
```

**验收标准**:
- [ ] axe-core 扫描通过
- [ ] 键盘可操作
- [ ] 屏幕阅读器测试通过

---

### Sprint 9: 监控体系（第17-18周）

#### Sentry 集成
```typescript
// main.ts
import * as Sentry from '@sentry/vue'

Sentry.init({
  app,
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    })
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    // 过滤敏感信息
    if (event.exception) {
      // 处理错误
    }
    return event
  }
})
```

#### Web Vitals 监控
```typescript
// utils/vitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB, type Metric } from 'web-vitals'

function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    entries: metric.entries,
  })
  
  // 使用 Beacon API 发送
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/vitals', body)
  } else {
    fetch('/api/analytics/vitals', {
      method: 'POST',
      body,
      keepalive: true,
    })
  }
}

export function initVitals() {
  getCLS(sendToAnalytics)
  getFID(sendToAnalytics)
  getFCP(sendToAnalytics)
  getLCP(sendToAnalytics)
  getTTFB(sendToAnalytics)
}
```

**验收标准**:
- [ ] 错误实时上报
- [ ] Web Vitals 数据收集
- [ ] 性能监控面板

---

## 第四阶段：工程化完善（第10-12月）

### Sprint 10: 国际化（第19-20周）

#### Vue I18n 配置
```typescript
// i18n/index.ts
import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN.json'
import en from './locales/en.json'

export default createI18n({
  legacy: false,
  locale: localStorage.getItem('locale') || 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en': en
  }
})
```

```json
// i18n/locales/zh-CN.json
{
  "nav": {
    "home": "首页",
    "catalog": "目录",
    "admin": "管理后台",
    "login": "登录",
    "logout": "退出"
  },
  "catalog": {
    "search": "搜索演示...",
    "favorites": "收藏",
    "recent": "最近查看",
    "all": "全部",
    "empty": "暂无内容"
  },
  "admin": {
    "dashboard": "概览",
    "content": "内容管理",
    "uploads": "上传管理",
    "library": "资源库",
    "taxonomy": "分类管理",
    "system": "系统设置"
  }
}
```

**验收标准**:
- [ ] i18n 框架集成
- [ ] 所有 UI 文本可翻译
- [ ] 语言切换功能

---

### Sprint 11: CI/CD 自动化（第21-22周）

#### 完整 CI/CD 流程
```yaml
# .github/workflows/ci-cd.yml
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
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
      
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: |
            playwright-report/
            coverage/

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
      
      - name: Upload build
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  deploy-preview:
    if: github.event_name == 'pull_request'
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download build
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/
      
      - name: Deploy to preview
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          destination_dir: preview/${{ github.event.number }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download build
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/
      
      - name: Deploy to production
        run: |
          # 部署命令
          echo "Deploying to production..."
```

**验收标准**:
- [ ] PR 自动测试
- [ ] 预览环境自动生成
- [ ] 主分支自动部署

---

### Sprint 12: 收尾与规划（第23-24周）✅ 已完成

#### 技术债务清理清单 - 完成状态

```markdown
## 清理任务

### 代码清理
- [x] 移除未使用的 import
- [x] 删除 console.log
- [x] ESLint 警告减少至 82 个（主要为遗留 any 类型）
- [x] Web Vitals 修复: onINP 替代 onFID

### 依赖更新
- [x] npm audit 检查无高危漏洞
- [x] 依赖版本文档化
- [ ] 全面依赖升级（建议谨慎评估）

### 文档完善
- [x] PROJECT_STATS.md 项目统计报告
- [x] ANNUAL_SUMMARY.md 年度总结报告
- [x] IMPLEMENTATION_PLAN.md 更新
- [x] DEPLOYMENT.md 部署指南

### 性能检查
- [x] Bundle 分析（admin-core ~106KB, index ~128KB）
- [x] 路由懒加载验证
- [x] PWA 预缓存验证（32 entries, ~550KB）
```

**最终验收标准**:
- [x] 单元测试: 477+ 通过
- [x] E2E 测试: 14 个场景
- [x] ESLint: 0 错误, 82 警告
- [x] 文档完整: 8 份技术文档
- [x] PWA: 完整支持
- [x] i18n: 中英双语
- [x] CI/CD: GitHub Actions 自动化
- [ ] 测试覆盖率 ≥ 85% (实际: 30.53%, 核心模块 95%+)

---

## 📈 里程碑检查点 - 第1年实际完成情况

```
✅ 第3月末:  单元测试 477+, E2E 14 场景, 代码规范自动化 (ESLint + Prettier + Husky)
    ↓
✅ 第6月末:  Pinia Store (5 stores), 5+ 通用组件, 路由懒加载, VirtualList
    ↓
✅ 第9月末:  PWA 完整支持, 无障碍优化 (WCAG AA 目标), 监控体系 (Sentry + Web Vitals)
    ↓
✅ 第12月末: 国际化 (Vue I18n 中英双语), CI/CD 自动化 (GitHub Actions), 技术债务清理
```

### 最终统计

| 指标 | 目标值 | 实际值 | 状态 |
|------|--------|--------|------|
| 单元测试 | 500+ | 477+ | ✅ 98% |
| E2E 场景 | 10+ | 14 | ✅ 超额 |
| ESLint 错误 | 0 | 0 | ✅ |
| ESLint 警告 | <50 | 82 | ⚠️ 遗留 any 类型 |
| PWA 支持 | 完整 | 完整 | ✅ |
| 国际化 | 2+ 语言 | 中英双语 | ✅ |
| CI/CD | 自动化 | GitHub Actions | ✅ |
| 核心 Store 覆盖率 | 90%+ | 95%+ | ✅ |
| 整体覆盖率 | 85% | 30.53% | ⚠️ 需要提升 |

### 技术债务
- 82 个 ESLint 警告（主要为遗留 `any` 类型）
- 部分组件测试待迁移
- 部分依赖可更新

---

## 🚀 立即开始

```bash
# 1. 创建功能分支
git checkout -b feature/annual-improvements

# 2. 安装测试依赖
npm install -D @playwright/test @vitest/coverage-v8
npx playwright install

# 3. 创建 E2E 目录
mkdir -p e2e

# 4. 编写第一个测试
# e2e/auth.spec.ts

# 5. 运行测试
npm run test:e2e
```

---

*制定日期: 2026年3月*  
*版本: 1.0*  
*执行周期: 12个月*

---

## 🎉 第1年实施总结

### 全部 12 个 Sprint 已完成

| Sprint | 名称 | 关键成果 | 状态 |
|--------|------|----------|------|
| 1 | E2E 测试 | Playwright 框架, 14 场景 | ✅ |
| 2 | 单元测试 | 86 新测试, auth 96%, admin 95% | ✅ |
| 3 | 代码规范 | ESLint 10 + Prettier + Husky 9 | ✅ |
| 4 | Pinia Store | 5 个新 Store, 22 个 Store 测试 | ✅ |
| 5 | 组件库 | 5 通用组件 + Storybook | ✅ |
| 6 | 性能优化 | 路由懒加载, VirtualList, v-lazy | ✅ |
| 7 | PWA 支持 | vite-plugin-pwa, Service Worker | ✅ |
| 8 | 无障碍 | 焦点陷阱, 屏幕阅读器, SkipLink | ✅ |
| 9 | 国际化 | Vue I18n, 中英双语, LangSwitcher | ✅ |
| 10 | 监控体系 | Sentry, Web Vitals, ErrorBoundary | ✅ |
| 11 | CI/CD | GitHub Actions, Docker, PR 预览 | ✅ |
| 12 | 技术债务 | 项目统计, 年度总结, 文档完善 | ✅ |

### 技术栈现代化

**核心框架**: Vue 3.5 + TypeScript 5.9 + Vite 7 + Pinia 3  
**测试体系**: Vitest 4 + Playwright 1.58 + @vue/test-utils  
**代码质量**: ESLint 10 + Prettier 3 + Husky 9 + lint-staged 16  
**PWA**: vite-plugin-pwa + Service Worker + Web App Manifest  
**监控**: Sentry + Web Vitals (CLS, INP, FCP, LCP, TTFB)  
**CI/CD**: GitHub Actions (ci.yml, deploy.yml, release.yml)  
**容器化**: Docker + Docker Compose  

### 下一步建议

1. **短期 (Q2 2026)**: 提升整体测试覆盖率至 50%+
2. **中期 (Q3-Q4 2026)**: 提取更多通用组件, 完善 Storybook
3. **长期 (2027)**: 服务端渲染 (SSR) 探索, 更多语言支持

---

*更新日期: 2026年3月30日*  
*状态: 第1年实施全部完成 🎉*
