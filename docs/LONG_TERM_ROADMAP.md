# 物理动画演示系统 - 长期技术路线图

> 本文档概述了前端技术发展的 1-3 年规划，分为短期（0-6月）、中期（6-12月）和长期（1-3年）三个阶段。

---

## 📊 当前技术债务评估

### 代码规模
- **122** 个源文件（Vue + TypeScript）
- **~900KB** 源码（396KB features + 368KB views + 72KB components）
- **~520KB** 生产包（106KB JS gzip + 17KB CSS gzip）

### 技术栈
- Vue 3.5 + TypeScript 5.9 + Pinia 3.0 + Vite 7.3
- 自定义设计系统（OKLCH 色彩空间）
- 无外部组件库依赖

---

## 🗓️ 第一阶段：基础加固（0-6个月）

### 1.1 测试体系建设

#### 目标
建立完整的自动化测试体系，提高代码覆盖率和发布信心。

#### 任务清单
- [ ] **单元测试补充**
  - 为核心 composables 添加单元测试（目标：80% 覆盖率）
  - 优先测试：`useCatalogViewState`, `useAuthStore`, 所有 `useAdmin*` composables
  - 使用 `vitest` + `@vue/test-utils`

- [ ] **集成测试**
  - API 层测试：`adminApi.ts`, `authApi.ts`, `libraryApi.ts`
  - Mock Service Worker (MSW) 模拟后端响应

- [ ] **E2E 测试**
  - 使用 Playwright 覆盖关键用户流程：
    - 登录/登出流程
    - 目录浏览 → 演示播放
    - 内容管理完整 CRUD
    - 分类管理操作

#### 验收标准
```
单元测试覆盖率 > 80%
E2E 测试覆盖 10+ 核心流程
每次 PR 自动运行测试
```

### 1.2 代码规范与质量

#### 任务清单
- [ ] **ESLint 规则升级**
  ```javascript
  // 新增规则
  {
    "vue/no-unused-refs": "error",
    "vue/require-explicit-emits": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/strict-boolean-expressions": "warn"
  }
  ```

- [ ] **引入 Husky + lint-staged**
  - 提交前自动格式化
  - 提交信息规范检查（Conventional Commits）

- [ ] **代码审查清单**
  - 建立 PR 模板
  - 定义审查检查项

### 1.3 CSS 架构统一

#### 任务清单
- [ ] **迁移到完整设计系统**
  - 替换所有硬编码的旧 CSS 变量
  - 建立 CSS 变量文档
  
- [ ] **引入 CSS Modules（可选）**
  - 对高度封装的组件使用 `.module.css`
  - 减少全局命名空间污染

- [ ] **主题系统扩展**
  - 支持高对比度模式（无障碍）
  - 支持用户自定义主题色

---

## 🗓️ 第二阶段：架构演进（6-12个月）

### 2.1 状态管理重构

#### 问题
- 复杂的 composables 嵌套（如 `useLibraryAdminState`）
- 跨组件通信不够清晰

#### 解决方案
- [ ] **引入 Pinia Store 分层**
  ```
  stores/
  ├── auth/          # 认证状态（已存在）
  ├── catalog/       # 目录状态（新建）
  ├── admin/
  │   ├── content.ts
  │   ├── uploads.ts
  │   ├── taxonomy.ts
  │   └── library.ts
  └── viewer/        # 播放器状态
  ```

- [ ] **状态持久化策略**
  ```typescript
  // 使用 pinia-plugin-persistedstate
  // 自动同步 localStorage/sessionStorage
  ```

### 2.2 组件架构优化

#### 任务清单
- [ ] **提取公共布局组件**
  ```vue
  <!-- AdminWorkspaceLayout -->
  <template>
    <div class="admin-workspace-grid">
      <div class="list-panel"><slot name="list" /></div>
      <aside class="editor-panel"><slot name="editor" /></div>
    </div>
  </template>
  ```

- [ ] **组件文档化**
  - 引入 Storybook
  - 为 PButton, PCard, PInput, PModal 等基础组件建立文档

- [ ] **表单抽象**
  - 提取通用表单逻辑到 `useForm` composable
  - 统一表单验证、提交、错误处理

### 2.3 性能优化

#### 任务清单
- [ ] **路由懒加载细化**
  ```typescript
  // 当前：admin 所有页面打包在一起
  // 目标：每个 admin 子页面独立 chunk
  const AdminDashboardView = () => import(/* webpackChunkName: "admin-dashboard" */ './views/admin/AdminDashboardView.vue')
  ```

- [ ] **虚拟滚动**
  - 目录列表超过 100 项时使用虚拟滚动
  - 管理后台表格使用虚拟滚动

- [ ] **图片优化**
  - 缩略图使用 WebP 格式
  - 响应式图片 `srcset`
  - 懒加载统一使用 `loading="lazy"`

- [ ] **Bundle 分析**
  - 集成 `rollup-plugin-visualizer`
  - 识别并拆分大型依赖

#### 性能目标
```
首屏加载 < 2s (3G网络)
交互响应 < 100ms
 Lighthouse 性能评分 > 90
```

---

## 🗓️ 第三阶段：功能扩展与生态（1-2年）

### 3.1 PWA 支持

#### 任务清单
- [ ] **Service Worker**
  - Workbox 集成
  - 静态资源缓存策略
  - 离线访问目录

- [ ] **App Shell 架构**
  - 骨架屏优化
  - 离线友好提示

- [ ] **安装体验**
  - Web App Manifest
  - iOS/Android 添加到主屏幕

### 3.2 国际化（i18n）

#### 任务清单
- [ ] **多语言架构**
  - 使用 Vue I18n
  - 语言文件结构：
    ```
    locales/
    ├── zh-CN.json    # 简体中文（默认）
    ├── zh-TW.json    # 繁体中文
    ├── en.json       # 英文
    └── ja.json       # 日文（可选）
    ```

- [ ] **翻译管理**
  - 术语表建立
  - 翻译工作流（可考虑 Crowdin）

### 3.3 无障碍（Accessibility）

#### 任务清单
- [ ] **WCAG 2.1 AA 合规**
  - 键盘导航完整支持
  - 屏幕阅读器优化（ARIA 标签）
  - 颜色对比度检查
  - 焦点管理优化

- [ ] **辅助功能**
  - 字体大小调节
  - 动画减少模式（`prefers-reduced-motion`）
  - 高对比度模式

### 3.4 数据分析与监控

#### 任务清单
- [ ] **前端监控**
  - Sentry 错误追踪集成
  - 性能指标收集（Web Vitals）
  - 用户行为分析（可选，需隐私合规）

- [ ] **使用统计**
  - 演示播放次数统计
  - 热门内容分析
  - 管理后台操作日志

---

## 🗓️ 第四阶段：长期愿景（2-3年）

### 4.1 技术栈升级

#### 可能的方向
- [ ] **Vue 3.x → Vue 4（如有）**
- [ ] **TypeScript 严格模式**
  - 开启 `strict: true`
  - 消除所有 `any` 类型
- [ ] **Vite 生态深化**
  - 使用 `vite-plugin-ssr` 或 Nuxt（如需 SSR）

### 4.2 微前端架构（如规模扩大）

#### 适用场景
- 管理后台功能进一步膨胀
- 需要独立部署不同模块

#### 架构设想
```
基座应用（目录、播放器、登录）
├── 子应用：内容管理
├── 子应用：资源库
└── 子应用：系统设置
```

### 4.3 编辑器增强

#### 任务清单
- [ ] **富文本编辑器**
  - 集成 TipTap 或 Tiptap
  - 支持公式输入（KaTeX）

- [ ] **可视化分类管理**
  - 拖拽排序
  - 树形结构可视化编辑

- [ ] **批量操作**
  - Excel 导入/导出
  - 批量编辑元数据

---

## 🛠️ 基础设施与工具链

### 持续集成/部署

```yaml
# 建议的 CI/CD 流程
1. 代码提交 → 触发 GitHub Actions
2. 运行 Lint + TypeCheck + Unit Test
3. 构建生产包
4. 运行 E2E 测试
5. 部署到预览环境
6. 手动批准 → 部署生产
```

### 文档体系

```
docs/
├── architecture/       # 架构文档
├── api/               # API 文档（自动从代码生成）
├── components/        # 组件文档（Storybook）
├── deployment/        # 部署指南
└── LONG_TERM_ROADMAP.md  # 本文件
```

---

## 📈 成功指标

| 维度 | 当前 | 6个月 | 1年 | 3年 |
|------|------|-------|-----|-----|
| 测试覆盖率 | ~30% | 80% | 85% | 90% |
| Lighthouse | ~70 | 80 | 90 | 95 |
| 代码复用率 | 中等 | 高 | 很高 | 很高 |
| 部署频率 | 手动 | 每周 | 按需 | 持续 |
| 无障碍评级 | - | B | AA | AAA |

---

## 🎯 优先级矩阵

```
高影响 + 低成本：
  ✓ 测试补充
  ✓ ESLint 规则升级
  ✓ CSS 变量统一

高影响 + 高成本：
  → 状态管理重构
  → PWA 支持
  → i18n 国际化

低影响 + 低成本：
  ○ 代码格式化自动化
  ○ 文档补充

低影响 + 高成本：
  ✗ 微前端（除非必要）
  ✗ 大规模架构重构
```

---

## 📝 实施建议

1. **增量演进**：避免大爆炸式重构，每个阶段保持可发布状态
2. **技术雷达**：每季度回顾技术选型，保持技术栈现代
3. **团队对齐**：定期分享会，确保所有成员理解架构决策
4. **文档先行**：重要改动先写 RFC 文档，再写代码

---

*最后更新：2026年3月*
*下次评审：2026年6月*
