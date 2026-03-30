# 监控体系指南

本文档介绍物理动画演示系统的监控体系，包括错误追踪和性能监控。

---

## 监控组件

### 1. Sentry - 错误追踪

#### 功能特性
- **自动错误捕获**: Vue 组件错误、未捕获的 Promise 错误
- **性能追踪**: 路由切换时间、组件渲染时间
- **会话回放**: 用户操作回放（可选）
- **面包屑**: 用户操作路径追踪

#### 配置

```typescript
// .env.production
VITE_SENTRY_DSN=https://xxx@yyy.sentry.io/zzz
VITE_APP_VERSION=1.0.0
```

#### 使用方法

```typescript
import { 
  captureException, 
  captureMessage, 
  addBreadcrumb,
  setSentryUser 
} from '@/monitoring/sentry'

// 捕获异常
try {
  await riskyOperation()
} catch (error) {
  captureException(error, { extra: { userId: '123' } })
}

// 发送消息
captureMessage('用户完成了购买', 'info')

// 添加面包屑
addBreadcrumb('用户点击了提交按钮', 'user-action')

// 设置用户上下文
setSentryUser('user-123', 'user@example.com', 'username')
```

#### 错误边界

```vue
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

---

### 2. Web Vitals - 性能监控

#### 监控指标

| 指标 | 描述 | 良好阈值 |
|------|------|---------|
| **CLS** | Cumulative Layout Shift (布局偏移) | < 0.1 |
| **FID** | First Input Delay (首次输入延迟) | < 100ms |
| **FCP** | First Contentful Paint (首次内容绘制) | < 1.8s |
| **LCP** | Largest Contentful Paint (最大内容绘制) | < 2.5s |
| **TTFB** | Time to First Byte (首字节时间) | < 800ms |

#### 配置

```typescript
// .env.production
VITE_ANALYTICS_ENDPOINT=/api/analytics/vitals
```

#### 使用方法

```typescript
import { getPerformanceSummary } from '@/monitoring/webVitals'

// 获取性能摘要
const summary = getPerformanceSummary()
console.log(summary)
// {
//   dns: 20,
//   tcp: 100,
//   ttfb: 200,
//   download: 500,
//   domParse: 300,
//   domReady: 1500,
//   loadComplete: 2000
// }
```

---

## 初始化

监控在 `main.ts` 中自动初始化：

```typescript
import { initSentry, initWebVitals } from './monitoring'

const app = createApp(App)

// 初始化 Sentry
initSentry(app)

// ... 其他配置

app.mount('#app')

// 初始化 Web Vitals
initWebVitals()
```

---

## 本地开发

在开发环境中，监控会打印到控制台而不是发送：

```
[Web Vitals] {
  metric: 'LCP',
  value: 1200,
  rating: 'good',
  ...
}
```

---

## 生产部署

### 环境变量

```bash
# Sentry
VITE_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
VITE_APP_VERSION=1.2.3

# 性能分析
VITE_ANALYTICS_ENDPOINT=https://api.example.com/analytics/vitals
```

### Sentry 设置步骤

1. 在 [sentry.io](https://sentry.io) 创建项目
2. 获取 DSN
3. 配置环境变量
4. 可选：配置 Source Maps 上传

### 性能分析端点

后端需要提供一个端点接收 Web Vitals 数据：

```typescript
// POST /api/analytics/vitals
{
  metric: 'LCP',
  value: 1200,
  rating: 'good',
  url: 'https://example.com/page',
  timestamp: '2024-01-15T10:30:00.000Z'
}
```

---

## 监控仪表板

### Sentry 仪表板
- 错误率趋势
- 性能概览
- 用户会话回放
- 版本对比

### 自定义仪表板
可以基于 Web Vitals 数据构建自定义仪表板：
- 页面加载时间分布
- Core Web Vitals 评分
- 慢资源加载列表

---

## 最佳实践

### Do
- ✅ 只在生产环境启用详细监控
- ✅ 过滤掉敏感信息
- ✅ 设置适当的采样率
- ✅ 为用户错误添加上下文

### Don't
- ❌ 在开发环境发送大量监控数据
- ❌ 监控用户输入的敏感内容
- ❌ 100% 采样率（性能开销大）

---

## 故障排除

### Sentry 未工作
- 检查 DSN 是否正确配置
- 检查环境是否为生产模式
- 查看浏览器控制台是否有错误

### Web Vitals 未发送
- 检查 `ANALYTICS_ENDPOINT` 配置
- 检查网络面板是否有请求
- 确认后端端点正常工作

---

## 资源

- [Sentry Vue 文档](https://docs.sentry.io/platforms/javascript/guides/vue/)
- [Web Vitals 文档](https://web.dev/vitals/)
- [web-vitals 库](https://github.com/GoogleChrome/web-vitals)
