# 安全说明与上线建议

本项目默认面向轻量自托管场景。下面是当前已实现的安全措施和上线建议。

## 当前已实现

1. 预览隔离
- 预览页 iframe 使用最小化 `sandbox`
- 设置 `referrerpolicy="no-referrer"`
- 上传 HTML 在 iframe 预览时走隔离路径 `/content/isolated/uploads/*`
- 隔离路径上的 HTML 会额外带 `Content-Security-Policy: sandbox allow-scripts`
- “打开原页面” 仍指向原始路径 `/content/uploads/*`，用于明确的直接访问场景

2. 上传内容处理
- 支持单 HTML 与 ZIP 上传
- 上传内容保持原始 HTML，不做自动清洗或依赖改写
- 上传前做风险特征扫描（脚本、事件处理器、跳转等）
- 命中风险时要求管理员显式确认后才允许上传（不自动清洗原始 HTML）

3. SSRF 防护
- 截图网络请求会阻止访问 localhost/私网段/`.local` 等地址

4. 鉴权与限流
- 管理类接口要求管理员登录
- 登录、写入、截图、任务重试均有基础限流

5. API 响应头安全基线
- `/api/*` 默认设置 `X-Content-Type-Options: nosniff`
- `/api/*` 默认设置 `Referrer-Policy: no-referrer`
- `/api/*` 默认设置 `X-Frame-Options: DENY`
- `/api/*` 默认设置 `Permissions-Policy: geolocation=(), microphone=(), camera=()`

6. 任务可观测
- 截图与异步任务支持状态查询和重试
- 任务状态可持久化，降低重启造成的状态丢失

7. 管理员操作审计
- 管理员账号修改、存储配置更新、资源库文件夹/资源的关键写操作会写入结构化审计日志
- 审计日志会附带 `requestId` 与操作者用户名，便于排障与追踪

8. 静态安全门禁
- `guard:security` 会阻断运行时代码中的高风险模式：
  - `eval(...)`
  - `new Function(...)`
  - 在运行时代码中直接引入 `child_process`

## 上线建议（务实版）

1. 固定管理员凭据
- 本地非生产环境未配置 `ADMIN_USERNAME` / `ADMIN_PASSWORD(_HASH)` 时，系统会随机生成管理员账号密码并打印到启动日志
- 生产环境必须显式配置 `ADMIN_PASSWORD` 或 `ADMIN_PASSWORD_HASH`；建议优先使用 `ADMIN_PASSWORD_HASH`
- 若未显式配置，生产模式会直接启动失败，而不是回退到自动生成账号密码

2. 配置稳定的 JWT 密钥
- 生产环境务必设置 `JWT_SECRET`
- 若未显式配置，生产模式会直接启动失败，而不是回退到文件/内存兜底密钥

3. 收紧指标接口
- 默认已为仅登录可见；仅在确有需要时才设置 `METRICS_PUBLIC=true`

4. 确保持久化目录可靠
- Docker/Compose 场景挂载 `content/`

5. 公网部署时额外加固
- 在反向代理层增加访问控制
- 启用 HTTPS
- 结合实际场景补充审计和备份策略

## 风险边界

这是一个单管理员模型的内容管理服务，不是多租户 CMS。若你计划公网长期运行，建议在以下方面继续增强：

- 细粒度权限
- 更细粒度的审计范围（目前已覆盖高价值管理员写操作）
- 上传内容安全扫描
- 更严格的资源访问策略
