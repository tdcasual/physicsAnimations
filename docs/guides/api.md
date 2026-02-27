# API 说明

这份文档是接口速查。按“公开可读”和“需要登录”分组，便于前后端协作时快速定位。

## 鉴权方式

- 登录接口：`POST /api/auth/login`
- 登录成功后携带：`Authorization: Bearer <token>`

## 公开可读接口（默认可匿名，`/api/metrics` 例外）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/health` | 服务健康状态 |
| `GET` | `/api/metrics` | 运行指标（默认需登录；设 `METRICS_PUBLIC=true` 可匿名） |
| `GET` | `/api/catalog` | 前台目录（分组/分类/条目） |
| `GET` | `/api/categories` | 分类与统计（匿名时不含隐藏内容） |
| `GET` | `/api/groups` | 大类列表（匿名时不含隐藏内容） |
| `GET` | `/api/items` | 条目列表（匿名时过滤未发布/隐藏） |
| `GET` | `/api/items/:id` | 条目详情（匿名时仅可见已发布可见条目） |

## 需要管理员登录的接口

### 账号与系统

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/auth/me` | 当前登录信息 |
| `POST` | `/api/auth/account` | 修改管理员账号/密码 |
| `GET` | `/api/system` | 系统状态（存储、state db、任务队列） |
| `POST` | `/api/system/storage` | 修改存储配置并可触发同步 |

### 内容管理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/items` | 新增条目（link 或 upload） |
| `PUT` | `/api/items/:id` | 更新条目 |
| `DELETE` | `/api/items/:id` | 删除条目 |
| `POST` | `/api/items/:id/screenshot` | 触发重截图任务 |
| `GET` | `/api/tasks/:taskId` | 查询任务状态 |
| `POST` | `/api/tasks/:taskId/retry` | 重试失败任务 |

### 分类管理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/groups` | 创建大类 |
| `PUT` | `/api/groups/:id` | 更新大类 |
| `DELETE` | `/api/groups/:id` | 删除大类 |
| `POST` | `/api/categories` | 创建二级分类 |
| `PUT` | `/api/categories/:id` | 更新二级分类 |
| `DELETE` | `/api/categories/:id` | 删除二级分类 |

## 兼容旧接口

- `POST /api/items/link`
- `POST /api/items/upload`

上传风险确认说明：

- 对 HTML/ZIP 上传会执行风险扫描。
- 若命中风险，接口返回 `409` 与 `error: risky_html_requires_confirmation`，并在 `details.findings` 返回命中项。
- 管理端确认后，重试上传时在 `multipart/form-data` 中添加 `allowRiskyHtml=true` 即可继续。

## 后端实现边界（Extensibility Phase 1）

在 2026-02-26 的可扩展性一期中，`items` 相关读取/写入逻辑已从路由文件中拆分为服务层：

- `server/services/items/readService.js`
- `server/services/items/writeService.js`

说明：

- 对外 API 路径、请求字段、响应结构保持不变（向后兼容）
- 路由层负责参数解析与状态码映射
- 服务层负责 `items` 领域读写业务逻辑

## 请求示例

创建外链：

```bash
curl -X POST http://localhost:4173/api/items \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"link","url":"https://example.com","categoryId":"other","title":"示例","description":""}'
```
