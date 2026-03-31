# 错误状态设计规范

## 概述

本文档定义了前端应用中错误状态的统一设计规范，确保用户在各种错误场景下获得一致、友好且有帮助的反馈体验。

## 错误类型

### 1. 网络错误 (network)
- **场景**: API 请求失败、网络连接中断、超时
- **图标**: 📡
- **默认标题**: 网络连接失败
- **默认描述**: 请检查网络连接后重试，或联系管理员获取帮助
- **操作**: 重试按钮

### 2. 空状态 (empty)
- **场景**: 列表无数据、搜索结果为空、新用户无内容
- **图标**: 📭
- **默认标题**: 暂无内容
- **默认描述**: 当前列表为空，添加一些内容后开始使用
- **操作**: 创建/添加按钮（如适用）

### 3. 权限错误 (permission)
- **场景**: 无访问权限、需要登录、操作被禁止
- **图标**: 🔒
- **默认标题**: 权限不足
- **默认描述**: 您没有访问此内容的权限，请联系管理员
- **操作**: 登录按钮或返回首页

### 4. 404 未找到 (not-found)
- **场景**: 页面不存在、资源已删除、URL 错误
- **图标**: 🔍
- **默认标题**: 页面未找到
- **默认描述**: 您访问的内容不存在或已被移除
- **操作**: 返回首页

### 5. 通用错误 (general)
- **场景**: 未知错误、表单提交失败、操作异常
- **图标**: ⚠️
- **默认标题**: 出错了
- **默认描述**: 操作失败，请稍后重试
- **操作**: 重试或返回

## 组件使用

### PErrorState 组件

```vue
<script setup>
import { PErrorState } from '@/components/ui'

function handleRetry() {
  // 重试逻辑
}

function handleAction() {
  // 自定义操作
}
</script>

<template>
  <!-- 网络错误 -->
  <PErrorState 
    type="network" 
    @retry="handleRetry" 
  />
  
  <!-- 空状态 -->
  <PErrorState 
    type="empty"
    title="暂无演示内容"
    description="开始创建您的第一个物理教学演示"
    action-text="创建演示"
    @action="handleAction"
  />
  
  <!-- 自定义内容 -->
  <PErrorState 
    type="permission"
    title="需要登录"
    description="请先登录后查看此内容"
    action-text="立即登录"
    :show-retry="false"
    @action="handleAction"
  />
</template>
```

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| type | 'network' \| 'empty' \| 'permission' \| 'not-found' \| 'general' | 'general' | 错误类型 |
| title | string | - | 自定义标题（覆盖默认） |
| description | string | - | 自定义描述（覆盖默认） |
| actionText | string | - | 操作按钮文字 |
| showAction | boolean | true | 是否显示操作按钮 |
| showRetry | boolean | false | 是否显示重试按钮 |

### Events

| 事件 | 说明 |
|------|------|
| action | 点击操作按钮时触发 |
| retry | 点击重试按钮时触发 |

## 设计原则

### 1. 清晰性
- 使用简洁明了的语言说明错误原因
- 避免技术术语，使用用户能理解的语言
- 提供具体的解决方案，不要只说明问题

### 2. 友好性
- 使用图标和颜色传达错误类型
- 保持乐观、鼓励性的语气
- 避免使用"错误"、"失败"等负面词汇

### 3. 可操作性
- 始终提供下一步操作指引
- 重试按钮应能真正解决问题
- 提供替代方案（如返回首页）

### 4. 一致性
- 所有错误状态使用统一的组件
- 相同类型的错误保持一致的视觉呈现
- 按钮位置和样式保持一致

## 响应式设计

### 桌面端 (> 640px)
- 水平排列操作按钮
- 较大的图标和文字
- 居中显示，最大宽度 480px

### 移动端 (<= 640px)
- 垂直堆叠操作按钮（全宽）
- 适当缩小的图标和文字
- 保持居中显示

## 无障碍要求

- 使用 `role="alert"` 和 `aria-live="polite"` 确保屏幕阅读器能通知用户
- 按钮具有清晰的焦点状态
- 图标具有适当的对比度
- 支持键盘导航

## 示例场景

### 首页加载失败
```vue
<PErrorState 
  type="network"
  title="内容加载失败"
  description="无法获取演示内容，请检查网络后重试"
  show-retry
  @retry="refresh"
/>
```

### 管理员页面无权限
```vue
<PErrorState 
  type="permission"
  title="需要管理员权限"
  description="您当前没有访问管理后台的权限"
  action-text="返回首页"
  @action="$router.push('/')")
/>
```

### 搜索结果为空
```vue
<PErrorState 
  type="empty"
  title="未找到相关演示"
  description="尝试使用其他关键词搜索"
  action-text="清除搜索"
  @action="clearSearch"
/>
```

## 更新日志

### 2024-03-30
- 创建错误状态设计规范
- 添加 PErrorState 组件
- 定义 5 种标准错误类型
