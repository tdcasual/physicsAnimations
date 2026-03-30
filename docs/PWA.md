# PWA (渐进式 Web 应用) 指南

本文档介绍物理动画演示系统的 PWA 功能。

## 功能特性

### 1. 可安装应用

- **添加到主屏幕**: 用户可以将应用添加到手机/电脑主屏幕
- **独立运行**: 安装后像原生应用一样全屏运行，无浏览器 UI
- **离线访问**: Service Worker 缓存核心资源，离线可浏览

### 2. 离线支持

- **核心资源缓存**: HTML、CSS、JS 文件自动缓存
- **字体缓存**: Google Fonts 长期缓存
- **离线提示**: 网络断开时显示顶部提示栏

### 3. 安装提示

- 自动检测可安装状态
- 显示原生安装提示
- 支持"稍后再说"和"安装"

---

## 技术实现

### Service Worker

使用 `vite-plugin-pwa` 自动生成 Service Worker：

```typescript
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-cache',
          expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 }
        }
      }
    ]
  }
})
```

### Web App Manifest

```json
{
  "name": "物理动画演示系统",
  "short_name": "物理演示",
  "description": "初高中物理演示动画互动教学平台",
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone",
  "icons": [
    { "src": "/icon-192x192.png", "sizes": "192x192" },
    { "src": "/icon-512x512.png", "sizes": "512x512" }
  ]
}
```

---

## 使用指南

### 安装应用

**桌面端 (Chrome/Edge)**:
1. 打开网站
2. 地址栏右侧点击"安装"图标
3. 或点击菜单 → "安装物理动画演示系统"

**移动端 (Android)**:
1. 打开网站
2. 点击菜单 → "添加到主屏幕"
3. 确认安装

**iOS (Safari)**:
1. 打开网站
2. 点击分享按钮
3. 选择"添加到主屏幕"

### 离线使用

安装后，应用会缓存核心资源：
- ✅ 浏览目录
- ✅ 查看演示列表
- ✅ 播放已缓存的演示
- ❌ 管理后台（需要联网）

---

## 开发指南

### 测试 PWA

```bash
# 开发模式（启用 Service Worker）
npm run dev

# 构建并预览生产版本
npm run build
npm run preview
```

### Lighthouse 检测

1. 打开 Chrome DevTools
2. 切换到 Lighthouse 面板
3. 选择"PWA"类别
4. 点击"Analyze page load"

### 调试 Service Worker

1. 打开 Chrome DevTools
2. 切换到 Application 面板
3. 选择 Service Workers
4. 查看注册状态和缓存

---

## 兼容性

| 功能 | Chrome | Edge | Safari | Firefox |
|------|--------|------|--------|---------|
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Web App Manifest | ✅ | ✅ | ✅ | ❌ |
| 添加到主屏幕 | ✅ | ✅ | iOS only | ❌ |
| 离线缓存 | ✅ | ✅ | ✅ | ✅ |

---

## 故障排除

### Service Worker 未注册

检查浏览器控制台是否有错误信息：
- 确保使用 HTTPS 或 localhost
- 检查 `vite.config.ts` 配置
- 清除浏览器缓存重试

### 离线不生效

- 确保首次访问时网络正常
- 检查 Application → Cache Storage
- 确认资源在 `globPatterns` 中

### 安装提示不显示

- 网站必须通过 HTTPS
- 必须访问至少 30 秒
- 用户之前未拒绝安装
