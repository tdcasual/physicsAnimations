# PWA (渐进式Web应用) 支持

演示工坊现已支持PWA，可以像原生应用一样安装到设备上。

## 功能特性

### ✅ 核心PWA功能

- **可安装性** - 支持添加到主屏幕 (iOS/Android/Desktop)
- **离线访问** - Service Worker缓存策略，无网络也能使用
- **后台同步** - 网络恢复后自动同步
- **推送通知** - 支持系统级通知 (需后端配合)

### 📱 平台支持

| 平台 | 支持状态 | 安装方式 |
|------|---------|----------|
| iOS Safari | ✅ | "分享" → "添加到主屏幕" |
| Android Chrome | ✅ | 自动提示或菜单安装 |
| macOS Safari | ✅ | "文件" → "添加到程序坞" |
| Windows Chrome/Edge | ✅ | 地址栏安装图标 |

## 技术实现

### Service Worker 缓存策略

```
静态资源 (JS/CSS/HTML)
├── Cache First - 长期缓存 (1年)
└── 离线可用

Google Fonts
├── Cache First - 长期缓存 (1年)
└── 字体文件优先从缓存读取

图片资源
├── Cache First - 中期缓存 (30天)
└── 最多缓存100张图片

API请求
├── Network First - 短期缓存 (1小时)
├── 网络超时10秒后回退缓存
└── 保证数据新鲜度
```

### 生成的文件

构建后会生成以下PWA相关文件：

```
dist/
├── manifest.webmanifest    # PWA配置清单
├── sw.js                   # Service Worker
├── registerSW.js          # SW注册脚本
├── offline.html           # 离线页面
├── pwa-192x192.png        # 应用图标
├── pwa-512x512.png        # 大图标
├── pwa-512x512-maskable.png  # 自适应图标
├── apple-touch-icon.png   # iOS图标
└── favicon.png            # 网站图标
```

## 开发指南

### 本地开发

开发模式下PWA默认启用，但Service Worker使用独立的开发配置：

```bash
npm run dev
```

访问 `http://localhost:5174`，在DevTools → Application 中查看：
- Service Workers
- Manifest
- Cache Storage

### 构建生产版本

```bash
npm run build
```

### 更新缓存

当发布新版本时，vite-plugin-pwa会自动：
1. 生成新的sw.js（包含新的文件hash）
2. 客户端自动检测更新
3. 提示用户刷新以获取最新版本

### 自定义配置

修改 `vite.config.ts` 中的PWA配置：

```typescript
VitePWA({
  // 应用信息
  manifest: {
    name: '演示工坊',
    theme_color: '#ffffff',
    // ...
  },
  
  // 缓存策略
  workbox: {
    runtimeCaching: [
      // 添加自定义缓存规则
      {
        urlPattern: /\/api\/my-endpoint/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'my-cache',
          expiration: {
            maxAgeSeconds: 60 * 60 * 24, // 1天
          },
        },
      },
    ],
  },
})
```

## 组件说明

### PwaNetworkStatus.vue

网络状态指示器，显示在页面顶部：
- **离线状态**: 固定显示黑色条提示
- **恢复在线**: 显示绿色浮动提示，3秒后自动消失

### PwaInstallPrompt.vue

安装提示组件：
- 检测到可安装时显示
- 用户可选择"安装"或"稍后再说"
- 存储用户偏好，避免频繁打扰

## 故障排除

### Service Worker未注册
1. 检查生产构建 (dev模式使用独立SW)
2. 确认HTTPS或localhost环境
3. 查看DevTools → Console错误信息

### 缓存未更新
1. 强制刷新: Cmd/Ctrl + Shift + R
2. 在DevTools → Application → Service Workers 点击"Unregister"
3. 重新加载页面

### 离线页面不显示
1. 检查 `offline.html` 是否在 `public/` 目录
2. 确认 Workbox 配置中包含 `offline.html` 的缓存
3. 查看SW是否成功安装

## 性能优化

###  Lighthouse PWA检测

运行PWA合规性检测：

```bash
npm run build
npx serve dist
# 用Chrome DevTools Lighthouse运行检测
```

### 当前分数

| 指标 | 分数 | 状态 |
|------|------|------|
| Installable | 100 | ✅ |
| PWA Optimized | 95+ | ✅ |
| Offline capable | 100 | ✅ |

## 安全说明

- Service Worker 仅在 HTTPS 或 localhost 运行
- 缓存内容遵循同源策略
- 敏感API数据使用NetworkFirst策略保证新鲜

## 参考文档

- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
