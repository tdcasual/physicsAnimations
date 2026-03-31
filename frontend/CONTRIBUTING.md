# 开发规范

## 开发环境

```bash
# Node.js >= 20
npm install
npm run dev
```

## 代码提交

使用 Husky + lint-staged 自动检查：
- ESLint --fix
- Prettier 格式化
- TypeScript 类型检查

```bash
git add .
git commit -m "feat: 描述"
```

## 代码规范

### 命名

```typescript
// 组件 - PascalCase
PButton.vue
AdminDashboardView.vue

// 组合式函数 - camelCase, use 前缀
useAuthStore.ts
useCatalogViewState.ts

// 工具函数 - camelCase
formatDate.ts
generateId.ts

// 类型 - PascalCase
interface CatalogItem {}
type Locale = 'zh-CN' | 'en'
```

### 组件结构

```vue
<script setup lang="ts">
// 1. 导入
import { ref, computed } from 'vue'

// 2. 类型定义
interface Props {
  title: string
}

// 3. Props & Emits
const props = defineProps<Props>()
const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

// 4. 状态
const count = ref(0)

// 5. 计算属性
const doubled = computed(() => count.value * 2)

// 6. 方法
function increment() {
  count.value++
}
</script>

<template>
  <div class="component">
    <h1>{{ title }}</h1>
    <button @click="increment">{{ doubled }}</button>
  </div>
</template>

<style scoped>
.component {
  padding: var(--space-4);
}
</style>
```

### 状态管理

使用 Pinia Composition API 风格：

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  // State
  const count = ref(0)
  
  // Getters
  const doubled = computed(() => count.value * 2)
  
  // Actions
  function increment() {
    count.value++
  }
  
  return {
    count,
    doubled,
    increment,
  }
})
```

### 错误处理

```typescript
// API 层
async function fetchData(): Promise<Result<Data>> {
  try {
    const response = await apiFetch('/data')
    return { ok: true, data: response }
  } catch (error) {
    return { ok: false, error: 'fetch_failed' }
  }
}

// 组件层
const result = await fetchData()
if (!result.ok) {
  showError(result.error)
  return
}
useData(result.data)
```

## 测试

### 单元测试

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PButton from './PButton.vue'

describe('PButton', () => {
  it('should emit click event', async () => {
    const wrapper = mount(PButton)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
```

### 测试位置

- `src/**/__tests__/*.test.ts` - 与源码一起
- `test/**/*.test.ts` - 集成测试
- `e2e/*.spec.ts` - E2E 测试

## 国际化

```typescript
// 模板
{{ $t('nav.home') }}

// 脚本
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const label = t('nav.home')
```

## 样式规范

### 设计令牌

```css
/* 使用 CSS 变量 */
.button {
  padding: var(--space-2) var(--space-4);
  color: var(--text-primary);
  background: var(--primary-default);
}
```

### 常用变量

- `--space-{1-12}` - 间距
- `--text-{xs,sm,base,md,lg,xl}` - 字体大小
- `--primary-*` - 主题色
- `--surface-*` - 背景色
- `--text-*` - 文字色

## 提交信息规范

```
feat: 新功能
fix: 修复
docs: 文档
style: 格式
refactor: 重构
test: 测试
chore: 构建/工具
```

## 注意事项

1. **避免 `any`** - 使用具体类型或 `unknown`
2. **组件拆分** - 单个组件不超过 300 行
3. **复用逻辑** - 使用 composables
4. **性能** - 大数据列表使用虚拟滚动
5. **无障碍** - 组件需支持键盘导航
