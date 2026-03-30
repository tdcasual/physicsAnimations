# 快速启动指南

> 立即开始执行年度计划

## 今天就能做的事（5分钟）

### 1. 创建分支
```bash
git checkout -b feature/annual-improvements
```

### 2. 安装测试工具
```bash
cd /Users/lvxiaoer/Documents/codeWork/physicsAnimations/frontend
npm install -D @playwright/test @vitest/coverage-v8
npx playwright install chromium
```

### 3. 创建第一个 E2E 测试
```bash
mkdir -p e2e
cat > e2e/auth.spec.ts << 'EOF'
import { test, expect } from '@playwright/test'

test('homepage has title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/科学演示集/)
})
EOF
```

### 4. 添加测试命令
```bash
# package.json 中添加
npm pkg set scripts.test:e2e="playwright test"
```

### 5. 运行测试
```bash
npm run test:e2e
```

---

## 本周任务清单

### 周一：E2E 框架
- [ ] 安装 Playwright
- [ ] 配置 playwright.config.ts
- [ ] 编写 3 个认证测试

### 周二-周三：核心流程测试
- [ ] 目录浏览测试
- [ ] 搜索功能测试
- [ ] 演示播放测试

### 周四-周五：CI 集成
- [ ] GitHub Actions 配置
- [ ] 自动截图上传
- [ ] 测试报告生成

---

## 代码模板

### E2E 测试模板
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/path')
  })

  test('should work', async ({ page }) => {
    await expect(page.locator('.selector')).toBeVisible()
  })
})
```

### 单元测试模板
```typescript
import { describe, it, expect } from 'vitest'

describe('Function Name', () => {
  it('should do something', () => {
    expect(result).toBe(expected)
  })
})
```

---

## 检查清单

每天检查：
- [ ] 测试通过了吗？
- [ ] 类型检查通过了吗？
- [ ] 构建成功了吗？

每周检查：
- [ ] 覆盖率提升了吗？
- [ ] 新功能有测试吗？
- [ ] 代码规范符合吗？

每月检查：
- [ ] 里程碑达成了吗？
- [ ] 技术债务增加了吗？
- [ ] 计划需要调整吗？

---

## 遇到问题？

### 测试失败
```bash
# 调试模式
npm run test:e2e -- --debug

# UI 模式
npm run test:e2e -- --ui

# 单个测试
npm run test:e2e -- auth.spec.ts
```

### 覆盖率检查
```bash
npm run test:unit -- --coverage
# 查看 coverage/index.html
```

### 构建问题
```bash
npm run typecheck
npm run build
```

---

开始吧！🚀
