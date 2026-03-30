# 无障碍 (Accessibility) 指南

本文档记录物理动画演示系统的无障碍功能。

## 目标

- **WCAG 2.1 AA 合规**: 满足 Web Content Accessibility Guidelines 2.1 Level AA 标准
- **键盘可访问**: 所有功能可通过键盘操作
- **屏幕阅读器友好**: 支持主流屏幕阅读器
- **高对比度支持**: 尊重用户的高对比度偏好

---

## 已实现功能

### 1. 键盘导航

#### 焦点管理
- **焦点陷阱 (Focus Trap)**: 模态框内焦点循环
- **焦点恢复**: 关闭模态框后恢复之前的焦点
- **焦点可见性**: 只在键盘导航时显示焦点环

```typescript
import { useFocusTrap } from '@/composables/useFocusTrap'

const { trapRef, activate, deactivate } = useFocusTrap()
// 打开模态框时 activate()
// 关闭模态框时 deactivate()
```

#### 跳过链接
- 按 Tab 键首先出现的"跳转到主内容"链接
- 帮助键盘用户跳过导航

```vue
<SkipLink targetId="main-content" />
<main id="main-content" tabindex="-1">
  <!-- 页面内容 -->
</main>
```

#### 键盘快捷键
```typescript
import { handleKeyboardShortcut, commonShortcuts } from '@/utils/a11y'

handleKeyboardShortcut(event, {
  [commonShortcuts.escape]: () => closeModal(),
  [commonShortcuts.ctrlS]: () => save(),
})
```

---

### 2. ARIA 支持

#### 实时区域 (Live Regions)
```typescript
import { useAnnouncer } from '@/composables/useAnnouncer'

const { announce } = useAnnouncer()

// 礼貌通知 (排队，不中断)
announce('操作成功', 'polite')

// 紧急通知 (立即播报)
announce('保存失败', 'assertive')
```

#### 常用 ARIA 属性
| 属性 | 用途 |
|------|------|
| `aria-label` | 为元素提供标签 |
| `aria-describedby` | 关联描述文本 |
| `aria-expanded` | 展开/折叠状态 |
| `aria-selected` | 选中状态 |
| `aria-busy` | 加载中状态 |
| `aria-live` | 实时更新区域 |

---

### 3. 无障碍组件

#### SkipLink
为键盘用户提供跳过导航的链接。

```vue
<SkipLink targetId="main-content" text="跳转到主内容" />
```

#### OfflineIndicator
离线状态提示，带 ARIA 警报。

```vue
<OfflineIndicator />
```

---

### 4. CSS 无障碍支持

#### 减少动画
```css
@media (prefers-reduced-motion: reduce) {
  /* 禁用动画 */
}
```

#### 高对比度
```css
@media (prefers-contrast: high) {
  /* 增强对比度 */
}
```

#### 焦点管理
```css
/* 键盘导航时显示焦点环 */
.using-keyboard :focus {
  outline: 2px solid var(--primary-8);
}

/* 鼠标点击时不显示 */
.using-mouse :focus:not(:focus-visible) {
  outline: none;
}
```

#### 屏幕阅读器文本
```css
.sr-only {
  /* 隐藏但对屏幕阅读器可见 */
}
```

---

### 5. 颜色对比度

#### 工具函数
```typescript
import { getContrastRatio, meetsContrastStandard } from '@/utils/a11y'

const ratio = getContrastRatio('#000000', '#ffffff') // 21:1
const passes = meetsContrastStandard('#000000', '#ffffff') // true
```

#### WCAG 标准
- **正常文本**: 对比度 ≥ 4.5:1
- **大文本**: 对比度 ≥ 3:1
- **UI 组件**: 对比度 ≥ 3:1

---

## 测试指南

### 手动测试清单

#### 键盘测试
- [ ] 所有交互元素可通过 Tab 键访问
- [ ] Tab 顺序符合逻辑
- [ ] 焦点可见且清晰
- [ ] 可用 Enter/Space 激活按钮
- [ ] 可用 Escape 关闭模态框
- [ ] 可用方向键操作列表/菜单

#### 屏幕阅读器测试
- [ ] 所有图片有 alt 文本
- [ ] 所有表单有 label
- [ ] 状态变化有 aria-live 通知
- [ ] 页面标题和区域标记正确
- [ ] 错误信息有 aria-describedby 关联

#### 视觉测试
- [ ] 对比度符合 WCAG AA
- [ ] 文字可放大到 200% 不失真
- [ ] 不依赖颜色传递信息
- [ ] 焦点指示器清晰可见

### 自动化测试

#### axe-core
```bash
# 使用 axe-core CLI 检查
npx axe-core http://localhost:4173
```

#### Lighthouse
1. 打开 Chrome DevTools
2. 切换到 Lighthouse 面板
3. 选择 Accessibility
4. 点击 Analyze

---

## 兼容性

### 支持的辅助技术

| 技术 | 版本 | 状态 |
|------|------|------|
| NVDA | 2023+ | ✅ 支持 |
| JAWS | 2023+ | ✅ 支持 |
| VoiceOver | macOS 13+ | ✅ 支持 |
| TalkBack | Android 13+ | ✅ 支持 |

### 浏览器支持

| 浏览器 | 键盘 | 屏幕阅读器 |
|--------|------|-----------|
| Chrome | ✅ | ✅ |
| Firefox | ✅ | ✅ |
| Safari | ✅ | ✅ |
| Edge | ✅ | ✅ |

---

## 最佳实践

### Do
- ✅ 使用语义化 HTML 元素
- ✅ 为所有图片提供 alt 文本
- ✅ 使用正确的标题层级 (h1-h6)
- ✅ 确保表单有关联的 label
- ✅ 提供跳过导航链接
- ✅ 测试键盘导航

### Don't
- ❌ 使用 div 代替 button
- ❌ 只依赖颜色传递信息
- ❌ 移除焦点轮廓而不提供替代
- ❌ 使用空的 alt 文本来隐藏装饰性图片
- ❌ 使用 tabindex > 0
- ❌ 动态内容不通知屏幕阅读器

---

## 资源

- [WCAG 2.1 指南](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA 实践](https://www.w3.org/WAI/ARIA/apg/)
- [axe-core 文档](https://www.deque.com/axe/)
- [WebAIM 对比度检查器](https://webaim.org/resources/contrastchecker/)
