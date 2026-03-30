# 部署指南

本文档介绍物理动画演示系统的 CI/CD 流程和部署方式。

---

## CI/CD 流程

### 持续集成 (CI)

每次提交到 `main` 或 `develop` 分支，或提交 PR 时，自动运行：

1. **代码检查** (Lint)
   - ESLint 代码规范检查
   - Prettier 格式检查

2. **单元测试** (Unit Test)
   - Vitest 运行单元测试
   - 生成覆盖率报告
   - 上传到 Codecov

3. **E2E 测试** (E2E Test)
   - Playwright 运行端到端测试
   - 生成测试报告

4. **构建** (Build)
   - TypeScript 类型检查
   - Vite 生产构建
   - 上传构建产物

5. **预览部署** (Preview)
   - PR 自动部署到预览环境
   - 在 PR 中评论预览链接

### 持续部署 (CD)

#### 自动部署
- `main` 分支合并后自动部署到生产环境

#### 手动部署
```bash
# 通过 GitHub Actions 手动触发
git tag v1.0.0
git push origin v1.0.0
```

---

## 部署方式

### 1. GitHub Pages (默认)

#### 配置步骤

1. **启用 GitHub Pages**
   - 进入仓库 Settings → Pages
   - Source 选择 "GitHub Actions"

2. **配置自定义域名** (可选)
   ```bash
   # 在仓库根目录创建 CNAME 文件
echo "demo.physics.edu" > CNAME
   ```

3. **配置 Secrets** (如果需要)
   - `CUSTOM_DOMAIN`: 自定义域名

#### 部署流程
```
代码推送到 main 分支
    ↓
触发 Deploy 工作流
    ↓
构建生产版本
    ↓
部署到 GitHub Pages
```

---

### 2. Coolify 部署

#### 配置步骤

1. **在 Coolify 创建项目**
   - 选择 Git 仓库
   - 设置构建命令: `cd frontend && npm run build`
   - 设置输出目录: `frontend/dist`

2. **配置 Webhook**
   ```bash
   # 在仓库 Settings → Webhooks 添加
   Payload URL: https://coolify.your-domain.com/webhooks/deploy/xxx
   Content type: application/json
   Events: Push
   ```

3. **配置 Secrets**
   - `COOLIFY_WEBHOOK`: Coolify 部署 Webhook URL

---

### 3. 其他平台

#### Vercel
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

#### Netlify
```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 部署
netlify deploy --prod --dir=frontend/dist
```

---

## 环境变量

### 必需的环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `VITE_APP_VERSION` | 应用版本号 | `1.0.0` |

### 可选的环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `VITE_SENTRY_DSN` | Sentry DSN | `https://xxx@sentry.io/yyy` |
| `VITE_ANALYTICS_ENDPOINT` | 分析端点 | `/api/analytics` |

### Secrets 配置

在 GitHub 仓库 Settings → Secrets and variables → Actions 中配置：

- `SENTRY_DSN`: Sentry 数据源名称
- `CUSTOM_DOMAIN`: 自定义域名
- `COOLIFY_WEBHOOK`: Coolify 部署 Webhook
- `CODECOV_TOKEN`: Codecov 上传 Token

---

## 版本发布

### 发布流程

1. **更新版本号**
   ```bash
   # package.json
   {
     "version": "1.1.0"
   }
   ```

2. **创建标签**
   ```bash
   git add .
   git commit -m "release: v1.1.0"
   git tag v1.1.0
   git push origin main --tags
   ```

3. **自动生成 Release**
   - GitHub Actions 自动创建 Release
   - 生成 Changelog
   - 上传构建产物

### 版本号规范

遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)：

- `v1.0.0` - 正式版本
- `v1.1.0-beta.1` - 测试版本
- `v1.1.0-alpha.1` - 内测版本

---

## 回滚

### 快速回滚

```bash
# 回滚到上一个版本
git revert HEAD
git push origin main

# 或者回滚到指定版本
git revert <commit-hash>
git push origin main
```

### 使用 GitHub Actions 回滚

1. 进入 Actions 标签
2. 选择 Deploy 工作流
3. 点击 "Run workflow"
4. 选择要回滚的提交

---

## 监控部署状态

### GitHub Actions 状态
- 🟡 黄色: 正在运行
- 🟢 绿色: 成功
- 🔴 红色: 失败

### 查看日志
```bash
# 本地查看构建日志
npm run build 2>&1 | tee build.log

# 查看 GitHub Actions 日志
gh run view --log
```

---

## 故障排除

### 构建失败

1. **检查 Node.js 版本**
   ```bash
   node --version  # 需要 >= 18
   ```

2. **清除缓存**
   ```bash
   rm -rf node_modules
   rm package-lock.json
   npm install
   ```

3. **本地测试构建**
   ```bash
   npm run build
   ```

### 部署失败

1. **检查 Secrets 配置**
   - 确认所有必需的环境变量已设置

2. **检查权限**
   - GitHub Actions 需要 `contents: write` 权限

3. **查看部署日志**
   - GitHub Actions → Deploy 工作流 → 查看日志

---

## 资源

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [GitHub Pages 文档](https://docs.github.com/en/pages)
- [Semantic Versioning](https://semver.org/)
