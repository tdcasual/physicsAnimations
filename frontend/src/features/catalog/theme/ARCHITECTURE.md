# Catalog 主题系统架构设计

## 当前设计的局限性

```css
/* 现在：每加一个主题都要修改这个文件 */
[data-catalog-theme="handdrawn"] { ... }
[data-catalog-theme="brutalist"] { ... }
[data-catalog-theme="newtheme"] { /* 又要加一段 */ }
```

问题：
1. **集中式配置** - 所有主题在一个 CSS 文件
2. **硬编码选择器** - 每个主题需要手动写 CSS
3. **无法运行时添加** - 必须修改源代码
4. **难以维护** - 主题多了 CSS 文件会很大

---

## 改进架构：配置驱动的主题系统

### 核心思想

```
主题 = 配置对象 + 动态生成的 CSS 变量
```

### 新架构

```
frontend/src/features/catalog/theme/
├── core/                      # 核心系统
│   ├── ThemeRegistry.ts       # 主题注册表
│   ├── ThemeProvider.vue      # 主题提供者组件
│   └── cssGenerator.ts        # CSS 变量生成器
├── presets/                   # 预设主题（内置）
│   ├── minimal.ts             # 极简主题
│   ├── handdrawn.ts           # 手绘主题
│   ├── brutalist.ts           # 粗野主题
│   └── index.ts               # 导出所有预设
├── extensions/                # 扩展主题（用户自定义）
│   └── README.md              # 如何添加新主题
├── types.ts                   # 类型定义（已存在）
└── index.ts                   # 入口（已存在）
```

---

## 详细设计

### 1. 主题配置接口

```typescript
// core/types.ts
export interface ThemeConfig {
  id: string;                    // 唯一标识
  name: string;                  // 显示名称
  icon: string;                  // 图标
  description: string;           // 描述
  
  // 继承机制
  extends?: string;              // 继承自哪个主题
  
  // 样式配置（全部可选，继承父主题）
  styles: ThemeStyles;
  
  // 组件覆盖（可选）
  components?: ComponentOverrides;
  
  // 动画配置
  animations?: AnimationConfig;
}

export interface ThemeStyles {
  // 颜色系统
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    text: string;
    textMuted: string;
    border: string;
  };
  
  // 边框系统
  border: {
    radius: string;
    radiusLarge: string;
    width: string;
    style: 'solid' | 'dashed' | 'dotted';
  };
  
  // 阴影系统
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  
  // 字体系统
  fonts: {
    heading: string;
    body: string;
    mono?: string;
  };
  
  // 间距系统
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  
  // 过渡动画
  transitions: {
    fast: string;
    base: string;
    slow: string;
  };
}
```

### 2. 主题注册表

```typescript
// core/ThemeRegistry.ts
class ThemeRegistry {
  private themes = new Map<string, ThemeConfig>();
  private defaultThemeId = 'minimal';
  
  // 注册主题
  register(theme: ThemeConfig) {
    // 处理继承
    if (theme.extends) {
      const parent = this.themes.get(theme.extends);
      if (parent) {
        theme.styles = deepMerge(parent.styles, theme.styles);
      }
    }
    this.themes.set(theme.id, theme);
  }
  
  // 批量注册
  registerBatch(themes: ThemeConfig[]) {
    themes.forEach(t => this.register(t));
  }
  
  // 获取主题
  get(id: string): ThemeConfig | undefined {
    return this.themes.get(id);
  }
  
  // 获取所有主题
  getAll(): ThemeConfig[] {
    return Array.from(this.themes.values());
  }
  
  // 生成 CSS 变量
  generateCSS(themeId: string): string {
    const theme = this.get(themeId);
    if (!theme) return '';
    
    const vars = this.flattenStyles(theme.styles);
    return Object.entries(vars)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n');
  }
  
  private flattenStyles(styles: ThemeStyles, prefix = '--cat'): Record<string, string> {
    // 递归打平样式对象
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(styles)) {
      const newKey = `${prefix}-${key}`;
      if (typeof value === 'object') {
        Object.assign(result, this.flattenStyles(value, newKey));
      } else {
        result[newKey] = value;
      }
    }
    return result;
  }
}

export const themeRegistry = new ThemeRegistry();
```

### 3. 主题预设文件（独立文件，易于扩展）

```typescript
// presets/handdrawn.ts
import type { ThemeConfig } from '../core/types';

export const handdrawnTheme: ThemeConfig = {
  id: 'handdrawn',
  name: '手绘',
  icon: '✎',
  description: '温暖手绘风格，亲切有机',
  extends: 'minimal',  // 继承极简，只覆盖部分样式
  
  styles: {
    colors: {
      background: '#faf8f5',
      surface: '#ffffff',
      // ... 其他颜色
    },
    border: {
      radius: '255px 15px 225px 15px / 15px 225px 15px 255px',
      radiusLarge: '255px 25px 225px 25px / 25px 225px 25px 255px',
      width: '2px',
      style: 'solid',
    },
    // ... 其他样式只写与父主题不同的
  },
  
  // 组件特殊配置
  components: {
    card: {
      extraClasses: ['sketchy-border'],
      beforePseudo: true,  // 添加 ::before 伪元素
    },
    button: {
      hoverTransform: 'translate(-1px, -1px)',
      activeTransform: 'translate(1px, 1px)',
    },
  },
};
```

### 4. 动态 CSS 注入

```typescript
// core/cssInjector.ts
export function injectThemeCSS(themeId: string, css: string) {
  const styleId = `catalog-theme-${themeId}`;
  let styleEl = document.getElementById(styleId) as HTMLStyleElement;
  
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  
  styleEl.textContent = `
    [data-catalog-theme="${themeId}"] {
      ${css}
    }
  `;
}

export function removeThemeCSS(themeId: string) {
  const styleId = `catalog-theme-${themeId}`;
  const styleEl = document.getElementById(styleId);
  if (styleEl) {
    styleEl.remove();
  }
}
```

### 5. 使用方式

```typescript
// main.ts 或入口文件
import { themeRegistry } from './features/catalog/theme/core/ThemeRegistry';
import { presetThemes } from './features/catalog/theme/presets';

// 注册所有预设主题
themeRegistry.registerBatch(presetThemes);

// 注册自定义主题（用户可以自己添加）
themeRegistry.register({
  id: 'my-custom-theme',
  name: '我的主题',
  icon: '🎨',
  description: '自定义风格',
  extends: 'minimal',
  styles: {
    colors: {
      primary: '#ff6b6b',
      // ...
    },
  },
});
```

```vue
<!-- ThemeProvider.vue -->
<template>
  <div :data-catalog-theme="currentTheme">
    <slot />
  </div>
</template>

<script setup>
import { watch } from 'vue';
import { themeRegistry } from './core/ThemeRegistry';
import { injectThemeCSS } from './core/cssInjector';

const props = defineProps<{ theme: string }>();

watch(() => props.theme, (newTheme) => {
  const config = themeRegistry.get(newTheme);
  if (config) {
    const css = themeRegistry.generateCSS(newTheme);
    injectThemeCSS(newTheme, css);
  }
}, { immediate: true });
</script>
```

---

## 添加新主题的步骤

### 方式一：修改代码（开发者）

1. 在 `presets/` 创建新文件 `mytheme.ts`
2. 定义主题配置
3. 在 `presets/index.ts` 导出

### 方式二：运行时添加（高级用户）

```typescript
// 通过 localStorage 或 API 加载自定义主题
const customTheme = await loadThemeFromURL('/themes/my-theme.json');
themeRegistry.register(customTheme);
```

---

## 迁移路径

### 第一阶段（当前）：保持现状
- 现在的设计够用
- 主题数量 < 5 个

### 第二阶段（3-5 个主题）：提取配置
- 将 CSS 变量提取为 TS 对象
- 保持 CSS 文件生成逻辑

### 第三阶段（5+ 个主题）：完整架构
- 实现 ThemeRegistry
- 支持运行时注册
- 支持主题继承和组合

---

## 你现在应该做什么？

**建议：现在保持简单，但预留扩展点**

1. ✅ 保持当前的 CSS 变量方案
2. ✅ 但将每个主题的变量提取到独立文件
3. ✅ 预留 `extends` 机制（注释说明）
4. ✅ 使用数据驱动的方式生成切换按钮

当主题数量超过 5 个时，再重构为完整架构。
