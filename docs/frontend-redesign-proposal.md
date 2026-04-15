# 前端整体改造设计方案
## 「科学之美 · 数字画廊」—— Awwwards Art-Illustration 风格重构

---

## 一、设计愿景与核心策略

### 1.1 设计定位

将现有的功能性学科资源平台，升级为 **"Awwwards 级别的沉浸式数字画廊"**。核心理念：

> **"每个物理演示都是一件可交互的艺术品。"**

我们不是做"更好看的后台+目录页"，而是打造一个让教师和学生愿意驻足欣赏、探索欲望强烈的品牌体验站点。

### 1.2 风格参考解析

基于对 [Awwwards Art-Illustration](https://www.awwwards.com/websites/art-illustration/) 类别大量获奖网站的分析，提取以下核心设计语言：

| 特征维度 | Awwwards Art-Illustration 风格 | 学科展示适配策略 |
|---------|-------------------------------|-----------------|
| **色彩** | 深色系为主 + 高饱和强调色 + 渐变光晕 | 采用「深空蓝黑」底色，让演示内容（尤其是 iframe 动画）成为绝对视觉焦点；强调色选用「靛蓝」（理性）与「暖橙」（能量） |
| **排版** | 超大字号标题、破格布局、文字即图形 | Hero 区标题使用超大几何无衬线字体，中文配合「得意黑」保持科技感 |
| **插画** | 抽象矢量、手绘线条、3D 插画、动态几何 | 用「物理符号」替代普通插画：波形、原子轨道、光线折射、几何对称图形 |
| **动画** | 滚动叙事、视差、磁吸交互、页面过渡 | GSAP ScrollTrigger + Lenis 平滑滚动；卡片 3D 倾斜、按钮磁吸 |
| **布局** | 非对称、打破网格、元素层叠、大量负空间 | 目录页卡片错落有致；后台采用"科幻控制台"式数据仪表盘 |

---

## 二、技术栈升级方案

### 2.1 保留核心

- **Vue 3.5**（`<script setup>` + Composition API）
- **Vite 7**（构建工具）
- **TypeScript 5.9**（类型安全）
- **Vue Router 5**（路由）
- **Pinia 3**（状态管理，扩大使用范围）

> 保留理由：现有基础非常成熟，无需推倒重来。

### 2.2 新增核心依赖

#### CSS 框架：Tailwind CSS v4

- **为什么选它**：原子化 CSS 能完全释放 awwwards 级别自定义设计的自由度；主题 Token 系统强大；与动画库零冲突。
- **使用方式**：完全替换现有的手写 CSS 文件体系（`foundation.css`、`topbar.css` 等），仅保留极少数全局 reset。

#### UI 组件库：Shadcn Vue + Radix Vue

- **为什么选它**：
  - Shadcn Vue 的组件是**源码级可复制**到项目中的，不是黑盒
  - 基于 Radix Vue 提供完整的无障碍（A11y）基础
  - 可对其源码进行任意 awwwards 风格的样式重写
- **使用方式**：
  - 安装 `shadcn-vue` CLI，将组件初始化到 `frontend/src/components/ui/`
  - 深度定制 Button、Card、Dialog、DropdownMenu、Tabs 等组件样式

#### 动画引擎

| 库 | 用途 | 安装命令 |
|---|------|---------|
| **GSAP** + `@gsap/vue` | 复杂时间轴、ScrollTrigger 滚动动画 | `npm i gsap @gsap/vue` |
| **Lenis** | 丝滑平滑滚动（Awwwards 标配） | `npm i lenis` |
| **@vueuse/motion** | 简单声明式入场动画（替代简单 CSS transition） | `npm i @vueuse/motion` |

#### 图标与字体

- **图标**：`lucide-vue-next`（现代、简洁、与科学主题契合）
- **字体组合**：
  - 英文标题：`Space Grotesk`（几何感、科技感、Awwwards 热门字体）
  - 英文正文：`Inter`（极致可读性）
  - 中文标题/装饰：`Smiley Sans / 得意黑`（几何斜体，强烈的现代科技感）
  - 中文正文：`PingFang SC / Noto Sans SC`

### 2.3 拟移除的依赖/实践

- ❌ 移除所有手写 `.css` 文件的分治体系（`foundation.css`、`topbar.css`、`modal.css` 等）
- ❌ 移除 `color-mix(in oklab, ...)` 的复杂手写变量体系，迁移到 Tailwind 主题 Token
- ❌ 移除现有手写按钮/输入框样式，全面使用 Shadcn 组件 + 定制

---

## 三、新设计系统规范

### 3.1 色彩系统

采用「深空画廊」主题，默认深色模式，学科内容始终处于视觉中心。

```javascript
// tailwind.config.ts 核心 token 预览
colors: {
  background: '#0a0a0f',      // 极深蓝黑，类似太空背景
  surface: {
    DEFAULT: '#12121a',       // 卡片/面板背景
    elevated: '#1a1a25',      // 悬浮/提升层级
    subtle: '#0f0f14',        // 次级背景
  },
  foreground: {
    DEFAULT: '#f0f0f5',       // 主文字
    muted: '#8a8a9a',         // 次要文字
    subtle: '#5a5a6a',        // 占位/禁用
  },
  accent: {
    DEFAULT: '#6366f1',       // 靛蓝 - 主强调色（科学/理性）
    warm: '#f97316',          // 橙 - 次强调色（能量/关注）
    glow: 'rgba(99, 102, 241, 0.35)', // 光晕
  },
  border: '#272730',
  ring: '#6366f1',
}
```

### 3.2 字体系统

```css
/* 字体族定义 */
--font-display: 'Space Grotesk', 'Smiley Sans', 'PingFang SC', sans-serif;
--font-body: 'Inter', 'Noto Sans SC', 'PingFang SC', sans-serif;
```

| 层级 | 字号 | 字重 | 用途 |
|------|------|------|------|
| Display | `clamp(3rem, 8vw, 7rem)` | 700 | Hero 区主标题 |
| Title 1 | `clamp(2rem, 4vw, 3.5rem)` | 600 | 页面大标题 |
| Title 2 | `1.5rem` | 600 | 区块标题 |
| Body | `1rem` / `1.125rem` | 400 | 正文 |
| Label | `0.75rem` | 600 | 标签、按钮、导航 |

### 3.3 圆角与阴影

- 卡片圆角：`rounded-2xl`（`16px`）
- 按钮圆角：`rounded-full`（胶囊型，更现代）或 `rounded-xl`
- 主阴影：`shadow-glow`（自定义：带 accent 色的弥散阴影）
- Glassmorphism：`backdrop-blur-xl bg-surface/60 border border-white/10`

### 3.4 间距与网格

- 容器最大宽度：`max-w-[1440px]`（大屏更舒展）
- 页面水平边距：`px-6 md:px-12 lg:px-20`
- 栅格：主要使用 CSS Grid，允许非对称布局

---

## 四、关键页面改造设计

### 4.1 目录页 CatalogView —— 「探索星云」

#### 视觉概念
把目录页设计成"漂浮在深色宇宙中的演示星云"。每个演示卡片是一颗发光的星球，分类是轨道。

#### 具体改造

**Hero 区域（全屏首屏）**
- 背景：深色底 + **Canvas 波形/粒子动画**（暗示声波、电磁波、物理场）
- 主标题：「科学演示集」→ 改为更具冲击力的 **「探索物理之美」**
- 副标题：使用打字机效果（typewriter effect）逐个显示
- 滚动指示器：底部有一个缓缓跳动的光点 + "Scroll to explore"

**导航改造**
- 将现有的 Group/Category Tab 替换为 **「轨道式水平滚动导航」**
- 当前选中的分类有一个发光的下划线跟随动画（underline follow animation）
- 未选项悬停时有微弱的「磁吸」拉近效果

**演示卡片改造**
- 卡片尺寸加大，缩略图占主要面积
- **3D Tilt 效果**：鼠标移动时卡片轻微跟随倾斜（CSS `transform: perspective(1000px) rotateX(...) rotateY(...)`）
- 悬停时：
  - 缩略图轻微放大（`scale: 1.05`）
  - 卡片边框发出 accent 色的微光
  - 标题从下方滑入更多信息
- 入场动画：滚动到视口时，卡片以 **stagger（阶梯延迟）** 方式从下方淡入上浮

**资源库文件夹卡片**
- 与普通演示卡片区分：使用 Glassmorphism 毛玻璃效果
- 图标暗示：文件夹封面配以抽象几何装饰

**教师快速访问区**
- 改为右侧悬浮的 **「收藏星云」** 小面板
- 最近浏览和收藏以圆形头像/缩略图轨道形式排列

### 4.2 演示查看器 ViewerView —— 「沉浸剧场」

#### 视觉概念
演示舞台是唯一的焦点，其他 UI 元素尽量隐入暗色背景。

#### 具体改造
- **全屏沉浸式布局**：iframe 演示区占 `min-h-[85vh]`，四周极窄边距
- **悬浮控制栏**：底部使用 Glassmorphism 效果的悬浮条
  - 包含：返回、收藏、截图/交互模式切换、全屏、标题
  - 平时半透明，悬停时变为不透明
- **模式切换动画**：
  - 从截图切换到交互时，使用 **clip-path 圆形扩散** 过渡（像打开一扇门）
- **深色主题固定**：Viewer 页面强制深色，减少视觉干扰

### 4.3 管理后台 Admin —— 「科学控制台」

#### 视觉概念
把后台从"表格卡片堆"升级为 "Mission Control 任务控制台"，数据像仪表盘一样清晰有力。

#### 具体改造

**AdminLayoutView**
- 侧边栏：极窄的深色侧边栏（`w-16` 折叠 / `w-64` 展开）
- 图标使用 Lucide，当前项有发光的左侧竖线指示器
- 顶部：简洁的面包屑 + 用户信息 + 主题/课堂模式快捷切换

**AdminDashboardView**
- 大数字统计卡片：使用 **数字滚动动画**（从 0 计数到目标值）
- 任务卡片：采用"优先级光带"设计——高优先级卡片顶部有流动的渐变光条
- 整体布局：Bento Grid（便当盒网格），大小卡片错落有致

**内容管理页面（Content / Taxonomy / Library）**
- 列表项：深色背景下，悬停行有 subtle 的 glow 背景
- 编辑面板：从目前的平面布局改为 **「玻璃态抽屉」**（Glass Drawer），从右侧滑出
- 表单输入框：深色背景 + 聚焦时外圈发 accent 光

### 4.4 全局导航与登录

**Topbar 改造**
- 透明背景，滚动后变为 `backdrop-blur-xl bg-background/80`
- Logo：加入一个极简的 SVG 动画标志（例如：一个缓缓旋转的原子轨道符号）
- 搜索框：平时是一个小图标，点击后平滑展开为输入框
- 登录弹窗：改为 Glassmorphism 风格的居中模态框，带有入场缩放动画

---

## 五、关键动画与交互设计清单

### 5.1 全局动画

| 动画 | 库 | 描述 |
|------|-----|------|
| **平滑滚动** | Lenis | 所有页面滚动带有阻尼感 `lerp: 0.1` |
| **页面过渡** | Vue Router + GSAP | 页面切换时，旧页面淡出，新页面从下方淡入并轻微上浮 |
| **光标效果** | 自定义 CSS/JS | 桌面端自定义一个柔和的跟随光点（glow cursor），悬停在可点击元素上时光点放大 |
| **磁吸按钮** | 自定义 Vue Composable | 按钮在鼠标靠近时轻微向光标方向偏移 |

### 5.2 组件级动画

| 动画 | 库 | 描述 |
|------|-----|------|
| **卡片 3D Tilt** | 原生 CSS + Vue 事件 | `perspective(1000px)` + `rotateX/Y`，限制最大角度 ±10° |
| **Scroll Reveal** | GSAP ScrollTrigger | 元素进入视口时从 `y: 60px, opacity: 0` 变为 `y: 0, opacity: 1` |
| **Stagger Grid** | GSAP | 卡片网格按行列延迟入场，每个延迟 0.05s |
| **数字滚动** | `@vueuse/motion` 或 GSAP | 统计数字从 0 动画到目标值 |
| **Tab 下划线跟随** | `layoutId` (Framer Motion 概念) 或 GSAP Flip | 切换分类时，发光下划线平滑移动到新的位置 |
| **Glass Drawer 滑入** | GSAP / Vue Transition | 编辑面板从右侧以 `cubic-bezier(0.16, 1, 0.3, 1)` 曲线滑入 |

### 5.3 性能规则（必须遵守）

1. 所有动画只操作 `transform` 和 `opacity`
2. 使用 `will-change` 但绝不滥用
3. 为 `prefers-reduced-motion` 用户提供降级版本（直接显示，无动画）
4. Canvas 背景动画使用 `requestAnimationFrame`，页面不可见时暂停
5. 图片全面使用 `loading="lazy"`

---

## 六、组件架构调整

### 6.1 目录结构重构

```
frontend/src/
├── app/
│   ├── App.vue                 # 新 Shell（玻璃态导航）
│   └── providers/
│       ├── SmoothScrollProvider.vue   # Lenis 封装
│       ├── ThemeProvider.vue          # 深色/浅色主题
│       └── MotionProvider.vue         # 动画降级处理
├── components/
│   ├── ui/                     # Shadcn Vue 组件（深度定制）
│   │   ├── button/
│   │   ├── card/
│   │   ├── dialog/
│   │   ├── drawer/
│   │   ├── input/
│   │   ├── tabs/
│   │   └── ...
│   └── motion/                 # 自定义动画组件
│       ├── MagneticButton.vue
│       ├── TiltCard.vue
│       ├── TextReveal.vue
│       ├── ScrollReveal.vue
│       ├── CountUp.vue
│       └── CanvasBackground.vue
├── views/
│   ├── catalog/
│   │   ├── CatalogView.vue
│   │   └── components/         # 目录页专属组件
│   ├── viewer/
│   │   └── ViewerView.vue
│   └── admin/
│       └── ...（按现有结构保留，样式重写）
├── features/                   # 现有业务逻辑保留
├── composables/                # 新增通用 Composables
│   ├── useMagnetic.ts
│   ├── useTilt.ts
│   ├── useScrollProgress.ts
│   └── useLenis.ts
├── styles/
│   └── globals.css             # Tailwind + 少量全局 reset
└── lib/
    ├── utils.ts                # cn() 工具函数
    └── gsap.ts                 # GSAP 初始化配置
```

### 6.2 Shadcn 组件定制策略

所有 Shadcn 组件复制到 `components/ui/` 后，按以下规则重写样式：

- **Button**：改为 `rounded-full` 或 `rounded-xl`，深色背景，hover 时 `shadow-glow`
- **Card**：`rounded-2xl bg-surface border-border`，无默认阴影，hover 时可选发光
- **Dialog/Sheet**：`bg-surface/95 backdrop-blur-xl border border-white/10`
- **Input**：深色背景 `bg-surface-elevated`，聚焦环 `ring-accent`
- **Tabs**：去掉默认下划线，改为「轨道式」发光指示器

---

## 七、迁移实施路线图

### Phase 1：基建升级（1-2 天）

1. **安装新依赖**
   ```bash
   cd frontend
   npm install -D tailwindcss@next postcss autoprefixer
   npm install gsap @gsap/vue lenis @vueuse/motion lucide-vue-next
   npx shadcn-vue@latest init
   ```

2. **配置 Tailwind v4**
   - 创建 `styles/globals.css`
   - 定义自定义主题 Token（颜色、字体、阴影）
   - 配置 `vite.config.ts` 支持 Tailwind v4

3. **初始化 Shadcn Vue**
   - 设置 `tsconfig.json` 路径别名 `@/components/*`
   - 安装核心组件：`button`, `card`, `dialog`, `drawer`, `input`, `tabs`, `badge`, `separator`, `scroll-area`

4. **动画基建**
   - 创建 `lib/gsap.ts`（注册 ScrollTrigger）
   - 创建 `providers/SmoothScrollProvider.vue`（Lenis 集成）
   - 创建 `composables/useReducedMotion.ts`

### Phase 2：全局壳层改造（1-2 天）

1. **重写 App.vue**
   - 新 Topbar：透明→磨砂过渡
   - 新登录弹窗：Glassmorphism Dialog
   - 集成自定义光标、主题切换

2. **重写全局样式**
   - 移除旧 CSS 文件引用
   - 应用新字体（Space Grotesk, Inter, 得意黑）

### Phase 3：核心页面视觉升级（3-4 天）

1. **CatalogView 重构**
   - 开发 `CanvasBackground.vue`（波形/粒子背景）
   - 开发 `TiltCard.vue` + `MagneticButton.vue`
   - 重写卡片布局、导航、Hero 区
   - 集成 ScrollTrigger stagger 动画

2. **ViewerView 重构**
   - 沉浸式 iframe 布局
   - Glassmorphism 悬浮控制栏
   - clip-path 模式切换动画

### Phase 4：Admin 后台现代化（2-3 天）

1. **AdminLayoutView**
   - 新侧边栏导航
   - 顶部 Header 简化

2. **Dashboard / Content / Library 等页面**
   - 使用 Bento Grid 重构 Dashboard
   - 统计数字动画
   - 编辑面板改为 Drawer 组件

### Phase 5：打磨与测试（2 天）

1. 动画性能调优（60fps 测试）
2. `prefers-reduced-motion` 降级测试
3. 移动端适配（触摸设备禁用 tilt/磁吸，保留平滑滚动）
4. 更新/重写前端测试用例

---

## 八、风险与应对

| 风险 | 应对措施 |
|------|---------|
| Tailwind v4 与现有测试兼容性问题 | 保留 `jsdom` 环境，配置 `test/setup.ts` 中 mock CSS 变量 |
| 动画过多导致低端设备卡顿 | 提供 `reduced-motion` 降级；Canvas 动画在不可见时暂停；移动端简化动画 |
| 深色主题下演示内容（iframe）看不清 | Viewer 页面允许演示 iframe 自带白色背景；控制栏不影响内容区 |
| 字体加载导致布局偏移 | 使用 `font-display: swap`；设置合理的 `size-adjust` 回退字体 |

---

## 九、预期效果总结

改造完成后，项目将具备以下特征：

1. **视觉上**：媲美 Awwwards 提名级别的深色沉浸式画廊体验，每个演示都像展品
2. **交互上**：丝滑的平滑滚动、磁吸按钮、3D 卡片、滚动叙事，极大提升探索欲望
3. **工程上**：Tailwind + Shadcn Vue 的组合让后续维护效率倍增，组件可复用性高
4. **品牌上**：从"功能型资源站"升级为"科学美学体验站"，教师和学生都会愿意主动分享

---

*本方案为设计分析阶段输出，下一步可进入具体代码实施。*
