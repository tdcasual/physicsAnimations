# 前端整体改造设计方案 V2
## 「物理演示画廊 · Physics Demo Gallery」—— Awwwards 列表页风格重构

> 基于用户反馈调整：默认浅色模式、支持手动深浅切换、更接近 Awwwards 网站画廊展示风格

---

## 一、设计愿景

### 1.1 核心定位

将现有的学科资源平台，重构为 **"Awwwards 级别的物理演示动画画廊"**。

参考对象：`https://www.awwwards.com/websites/art-illustration/`

Awwwards 的这个页面本质上是一个**高品质作品画廊**：
- 大面积的白色/浅灰背景
- 卡片式网格陈列大量项目缩略图
- 每个卡片悬停时浮现标题、标签、评分
- 顶部有一排优雅的筛选标签
- 整体氛围干净、高级、让人有不断向下探索的欲望

**我们的适配：**
> 把"网站截图"替换为"物理演示动画缩略图"，把"设计奖项标签"替换为"物理学科分类标签"，打造一个让教师和学生愿意不断"逛"下去的演示画廊。

### 1.2 设计语言提取

| Awwwards 特征 | 物理画廊适配 |
|--------------|-------------|
| **默认浅色调** | 默认 `#ffffff` / `#f8f8fa` 背景，内容（缩略图）是绝对主角 |
| **深色模式切换** | 手动切换为优雅的深灰 `#111111` / `#0a0a0f`，深夜浏览不刺眼 |
| **大缩略图卡片** | 每个物理演示以卡片呈现，缩略图占 70% 以上面积 |
| **悬停信息浮现** | 鼠标悬停时，标题和分类标签从底部或中心淡入 |
| **筛选标签栏** | Group/Category 改为顶部一排「胶囊标签」，当前选中高亮 |
| **大量留白** | 卡片间距大、边距宽、呼吸感强 |
| **微交互动画** | 卡片悬停轻微上浮、图片微放大、过渡丝滑 |

---

## 二、技术栈升级方案

### 2.1 保留核心
- **Vue 3.5** + **Vite 7** + **TypeScript 5.9** + **Vue Router 5** + **Pinia 3**

### 2.2 新增核心依赖

| 类别 | 选型 | 作用 |
|------|------|------|
| **CSS 框架** | **Tailwind CSS v4** | 原子化样式，完全自定义画廊布局 |
| **UI 组件库** | **Shadcn Vue** (Radix Vue) | 源码级可控的按钮、标签、弹窗、抽屉等 |
| **动画引擎** | **GSAP + ScrollTrigger** | 卡片 stagger 入场、滚动触发动画 |
| **平滑滚动** | **Lenis** | 浏览大量卡片时的丝滑滚动体验 |
| **图标** | **Lucide Vue** | 现代简洁图标 |
| **字体** | **Space Grotesk** (英文标题) + **Inter** (正文) + **得意黑** (中文标题装饰) | 高级感排版 |

### 2.3 移除
- 现有全部手写 CSS 文件体系
- 手写按钮/表单样式
- 现有 `oklch` 变量系统

---

## 三、设计系统规范（双主题）

### 3.1 色彩系统

#### 浅色模式（默认）

```javascript
colors: {
  background: '#ffffff',
  surface: {
    DEFAULT: '#ffffff',
    subtle: '#f8f8fa',
    muted: '#f1f1f4',
    elevated: '#ffffff',
  },
  foreground: {
    DEFAULT: '#0a0a0f',
    muted: '#6b6b78',
    subtle: '#a1a1aa',
  },
  accent: {
    DEFAULT: '#2563eb',      // 钴蓝 - 科学、理性、信任
    warm: '#f97316',         // 活力橙 - 能量、推荐
    glow: 'rgba(37, 99, 235, 0.12)',
  },
  border: '#e5e5e8',
  ring: '#2563eb',
}
```

#### 深色模式

```javascript
colors: {
  background: '#0a0a0f',
  surface: {
    DEFAULT: '#12121a',
    subtle: '#0f0f14',
    muted: '#1a1a25',
    elevated: '#1e1e2a',
  },
  foreground: {
    DEFAULT: '#f0f0f5',
    muted: '#8a8a9a',
    subtle: '#5a5a6a',
  },
  accent: {
    DEFAULT: '#6366f1',      // 靛蓝
    warm: '#f97316',
    glow: 'rgba(99, 102, 241, 0.25)',
  },
  border: '#272730',
  ring: '#6366f1',
}
```

### 3.2 主题切换机制

- 使用 `data-theme="light" | "dark"` 挂在 `<html>` 上
- Tailwind v4 的 `darkMode: ['class', '[data-theme="dark"]']` 配置
- 切换按钮放在 Topbar 右侧，图标为太阳/月亮
- 用户选择持久化到 `localStorage`

### 3.3 字体系统

```css
--font-display: 'Space Grotesk', 'Smiley Sans', 'PingFang SC', sans-serif;
--font-body: 'Inter', 'Noto Sans SC', 'PingFang SC', sans-serif;
```

| 层级 | 字号 | 字重 | 用途 |
|------|------|------|------|
| Display | `clamp(2.5rem, 6vw, 5rem)` | 700 | Hero 主标题 |
| Title 1 | `clamp(1.75rem, 3vw, 2.5rem)` | 600 | 页面标题 |
| Title 2 | `1.25rem` | 600 | 区块标题 |
| Body | `1rem` | 400 | 正文 |
| Label | `0.75rem` | 500 | 标签、小字 |

### 3.4 圆角与阴影

- 卡片：`rounded-xl` (12px) 或 `rounded-2xl` (16px)
- 按钮/标签：`rounded-full` (胶囊型)
- 浅色卡片阴影：`shadow-sm` → hover 时 `shadow-lg`
- 深色卡片：无默认阴影，hover 时 `shadow-glow`（带 accent 色微光）

---

## 四、关键页面改造设计

### 4.1 目录页 CatalogView —— 「物理演示画廊」

这是改造的核心页面，必须**极度接近 Awwwards 的画廊展示风格**。

#### 布局结构

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] 科学演示集        [搜索框]     [课堂模式] [主题] [登录]│  ← 透明/浅色 Topbar
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              探索物理世界                                     │  ← Hero 区域（小尺寸，不抢戏）
│         精选高中物理演示动画，让抽象概念变得可见                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  全部  │ 力学 ■ 电磁学 ■ 光学 ■ 热学 ■ 近代物理 ■ 实验 ...   │  ← 胶囊筛选标签栏
├─────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────┐ │
│  │            │  │            │  │            │  │        │ │
│  │  缩略图     │  │  缩略图     │  │  缩略图     │  │ 缩略图  │ │  ← 卡片网格
│  │  (70%)     │  │  (70%)     │  │  (70%)     │  │ (70%)  │ │
│  │            │  │            │  │            │  │        │ │
│  │ [标题]     │  │ [标题]     │  │ [标题]     │  │ [标题] │ │  ← 底部信息
│  │ #力学      │  │ #电磁学    │  │ #光学      │  │ #实验  │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────┘ │
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   ...      │  │   ...      │  │   ...      │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 具体设计细节

**Hero 区域**
- 高度控制在 `min-h-[40vh]` 以内，**不能抢画廊的风头**
- 背景：纯色（浅白/深黑），不加复杂动画，保持画廊的专业感
- 标题：「探索物理世界」或「Physics Demo Gallery」
- 副标题：简短一句话
- 右下角/底部有一个向下的小箭头（提示下面有更多内容）

**筛选标签栏**
- 样式：一排「胶囊按钮」`rounded-full px-4 py-1.5`
- 当前选中：填充 `bg-foreground text-background`（反色高亮）
- 未选中：`bg-transparent border border-border hover:bg-surface-muted`
- 动画：切换时，高亮背景平滑滑动到新的位置（或简单 fade）
- 如果标签太多，允许水平滚动（隐藏滚动条）

**演示卡片（最重要）**
- 比例：缩略图区域采用 **4:3** 或 **16:10**（接近演示动画的常见比例）
- 圆角：`rounded-2xl`
- 边框：浅色模式 `border border-border`；深色模式 `border border-border/50`
- 间距：`gap-6 md:gap-8`
- 网格：
  - 桌面：`grid-cols-3` 或 `grid-cols-4`（根据屏幕宽度）
  - 平板：`grid-cols-2`
  - 手机：`grid-cols-1`

**卡片悬停效果（Awwwards 灵魂）**
- 卡片整体：轻微上浮 `translateY(-6px)` + 阴影加深
- 缩略图：内部图片 `scale(1.05)`（容器 `overflow-hidden`）
- 信息层：
  - 默认状态：标题在卡片底部，始终可见
  - 悬停状态：从底部滑入一个半透明遮罩层，显示「描述 + 分类标签 + 查看按钮」
- 过渡时间：`300ms`，ease-out

**入场动画**
- 滚动到视口时，卡片以 **stagger** 方式从下方淡入上浮
- 每个卡片延迟 `0.05s`
- 使用 GSAP ScrollTrigger 实现

**文件夹卡片（资源库）**
- 与演示卡片区分开：使用 Glassmorphism 效果或不同的边框颜色
- 图标：使用 Lucide 的 `FolderOpen` 图标作为封面占位

**搜索行为**
- 搜索框在顶部，输入时实时过滤卡片
- 无结果时显示优雅的空状态插图

### 4.2 演示查看器 ViewerView —— 「演示舞台」

- 简洁的浅色/深色背景
- 演示 iframe 占画面中心 `min-h-[75vh]` max-w-6xl
- 周围大量留白，让演示成为唯一焦点
- 底部固定操作栏（返回、收藏、全屏、模式切换）
- 操作栏使用 subtle 的背景色，不抢眼

### 4.3 管理后台 Admin —— 「内容工作台」

后台不需要像画廊那样华丽，但需保持统一的设计语言：

- **浅色模式**：白色背景 + 浅灰侧边栏（类似 Notion / Linear）
- **深色模式**：深灰背景 + 稍深的侧边栏
- 侧边栏：简洁的图标导航，当前项左侧有一条 accent 色竖线
- Dashboard：清晰的统计卡片 + Bento Grid 任务区
- 编辑面板：右侧滑出的 Drawer，Glassmorphism 风格

---

## 五、组件架构调整

```
frontend/src/
├── app/
│   ├── App.vue
│   └── providers/
│       ├── ThemeProvider.vue      # 浅色/深色主题管理
│       └── SmoothScrollProvider.vue
├── components/
│   ├── ui/                        # Shadcn Vue 组件
│   │   ├── button/
│   │   ├── card/
│   │   ├── dialog/
│   │   ├── drawer/
│   │   ├── input/
│   │   ├── badge/
│   │   └── tabs/
│   └── motion/
│       ├── ScrollReveal.vue       # 滚动入场动画
│       ├── HoverCard.vue          # 悬停效果卡片包装
│       └── AnimatedFilter.vue     # 筛选标签动画组件
├── views/
│   ├── catalog/
│   │   ├── CatalogView.vue
│   │   ├── DemoCard.vue           # 演示卡片
│   │   ├── FolderCard.vue         # 文件夹卡片
│   │   ├── FilterTabs.vue         # 胶囊筛选标签
│   │   └── HeroSection.vue        # Hero 区域
│   ├── viewer/
│   │   └── ViewerView.vue
│   └── admin/
│       └── ...
├── features/                       # 现有业务逻辑保留
├── composables/
│   ├── useTheme.ts                # 主题切换逻辑
│   ├── useLenis.ts
│   └── useScrollReveal.ts
├── styles/
│   └── globals.css                # Tailwind + 全局 reset
└── lib/
    ├── utils.ts
    └── gsap.ts
```

---

## 六、迁移路线图

### Phase 1：基建（1-2 天）
1. 安装 Tailwind v4、Shadcn Vue、GSAP、Lenis、Lucide
2. 配置双主题 Tailwind Token
3. 初始化 Shadcn 组件（button, card, badge, input, dialog, drawer, tabs）
4. 创建 `ThemeProvider` 和 `useTheme` composable

### Phase 2：全局 Shell（1 天）
1. 重写 App.vue + Topbar
2. 实现主题切换按钮
3. 重写登录弹窗（Dialog 组件）

### Phase 3：画廊页核心（3-4 天）
1. 开发 `DemoCard.vue`（含悬停效果）
2. 开发 `FilterTabs.vue`（胶囊标签 + 滑动高亮）
3. 重写 `CatalogView.vue`（网格布局 + GSAP stagger 入场）
4. 集成搜索过滤

### Phase 4：Viewer + Admin（2-3 天）
1. ViewerView 沉浸式重构
2. Admin 后台统一新设计语言

### Phase 5：打磨（1-2 天）
1. 双主题下的所有组件检查
2. 动画性能优化
3. 移动端适配
4. 测试更新

---

## 七、预期效果

改造完成后：

1. **默认打开是干净的浅色画廊**，大量物理演示卡片整齐陈列，像逛 Awwwards 一样有探索欲
2. **深色模式一键切换**，深夜浏览时变为优雅的暗色画廊
3. **每张卡片都是焦点**，悬停时的上浮+信息浮现动画让人忍不住想点击
4. **筛选标签丝滑切换**，快速定位力学/电磁学/光学等分类
5. **后台也变得现代统一**，不再是格格不入的"工具页面"

---

**下一步：如果你确认这个 V2 方向，我可以立刻开始 Phase 1 的代码实施。**
