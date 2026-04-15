# 性能监控文档

本文档描述项目的性能监控配置和最佳实践。

## 🚀 Core Web Vitals 监控

项目已集成 [web-vitals](https://github.com/GoogleChrome/web-vitals) 库，自动收集以下指标：

| 指标 | 全称 | 目标值 | 说明 |
|------|------|--------|------|
| LCP | Largest Contentful Paint | ≤ 2.5s | 最大内容绘制时间 |
| FID | First Input Delay | ≤ 100ms | 首次输入延迟 |
| CLS | Cumulative Layout Shift | ≤ 0.1 | 累积布局偏移 |
| FCP | First Contentful Paint | ≤ 1.8s | 首次内容绘制 |
| TTFB | Time to First Byte | ≤ 600ms | 首字节时间 |
| INP | Interaction to Next Paint | ≤ 200ms | 交互到下一次绘制 |

### 配置

性能监控在 `src/main.ts` 中自动初始化：

```typescript
import { initWebVitals } from "./features/monitoring/webVitals";

initWebVitals({
  debug: import.meta.env.DEV, // 开发环境打印到控制台
});
```

### 查看指标

- **开发环境**: 打开浏览器控制台，查看 `[Web Vitals]` 前缀的日志
- **生产环境**: 数据会自动上报到 Google Analytics 或 Vercel Analytics

## 📦 Bundle 分析

### 运行分析

```bash
npm run analyze
```

### 性能预算

| 资源类型 | 预算限制 | 说明 |
|----------|----------|------|
| Main JS | 120 KB | 主入口文件 |
| Vendor JS | 120 KB | 第三方库 |
| CSS | 120 KB | 包含 Tailwind + Shadcn |

### 代码分割策略

项目采用以下代码分割策略：

1. **路由级懒加载**: Admin 页面按需加载
2. **动态导入 GSAP**: 动画库仅在需要时加载
3. **组件级分割**: UI 组件库自动分割

## 🔍 Lighthouse CI

项目配置了 Lighthouse CI，在 PR 时自动运行性能审计。

### 阈值配置

```javascript
// lighthouserc.cjs
{
  "categories:performance": ["warn", { minScore: 0.8 }],
  "categories:accessibility": ["error", { minScore: 0.9 }],
  "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
  "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1 }],
}
```

### 本地运行

```bash
npm install -g @lhci/cli
npm run lighthouse
```

## 📊 优化成果

### 首屏加载优化

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 主 JS 包 | 333 KB | 77 KB | -77% |
| 首屏总资源 | 463 KB | 170 KB | -63% |
| gzip 后 JS | 93 KB | 24 KB | -74% |

### 代码分割

```
dist/assets/
├── index-xxx.js           # 主包 77KB (核心功能)
├── vendor-xxx.js          # 第三方库 100KB
├── AdminLibraryView-xxx.js   # 按需加载 90KB
├── AdminTaxonomyView-xxx.js  # 按需加载 37KB
├── AdminSystemView-xxx.js    # 按需加载 30KB
├── AdminContentView-xxx.js   # 按需加载 21KB
├── AdminUploadsView-xxx.js   # 按需加载 18KB
├── AdminDashboardView-xxx.js # 按需加载 7KB
├── AdminAccountView-xxx.js   # 按需加载 5KB
└── ScrollTrigger-xxx.js      # GSAP 按需加载 43KB
```

## 🛠 性能最佳实践

### 1. 图片优化

- 使用 WebP/AVIF 格式
- 实现懒加载
- 使用响应式图片

### 2. 代码优化

- 避免大型依赖库
- 使用动态导入
- 移除未使用的代码

### 3. 缓存策略

- 静态资源长期缓存
- API 响应适当缓存
- 使用 Service Worker

## 📈 持续改进

1. 定期运行 `npm run analyze` 检查 bundle 大小
2. 关注 Lighthouse CI 报告
3. 监控真实用户 Core Web Vitals 数据
