# Ops Library Incident Runbook

适用范围：资源库（文件夹、资源、Embed 平台）相关线上故障与误操作。

## 1. 常见事件类型

1. 资源误删（软删除）
2. 资源被 Permanent Delete（不可恢复）
3. Embed 平台脚本失效，演示无法打开
4. 文件夹切换后列表显示异常（前端状态类问题）

## 2. 处理流程

1. 先确认服务健康：

```bash
curl -sf http://127.0.0.1:4173/api/health
```

2. 获取现象与范围：
- 影响的是单个资源还是整类资源
- 是否仅某个 Embed 平台受影响
- 是否仅管理端受影响

3. 按事件类型执行处置。

## 3. 资源误删（可恢复）

若仅执行了软删除（`DELETE /api/library/assets/:id`）：

1. 在管理页“已删除资源（可恢复）”中点“恢复”
2. 或调用恢复接口：`POST /api/library/assets/:id/restore`
3. 验证资源可再次打开

## 4. Permanent Delete（不可恢复）

`DELETE /api/library/assets/:id/permanent` 为 Permanent Delete，不可恢复。

处置策略：
1. 从外部备份恢复原始文件（推荐）
2. 无备份时，要求内容提供方重新上传
3. 记录事故，标注“数据不可逆丢失”

## 5. Embed 平台故障

表现：资源为演示模式但页面打不开，或 Embed 脚本 404。

排查：
1. 检查平台配置脚本 URL、同步状态（`syncStatus` / `syncMessage`）
2. 查看最近一次同步报告 `syncLastReport.errors[]`
3. 验证 `viewerPath` 与脚本是否同版本可访问
4. 若同步长时间卡住，先取消本次同步再重试
5. 若故障发生在“刚同步后”，优先回滚到上一版 release

常用接口（均需管理员 token）：

- 触发同步：`POST /api/library/embed-profiles/:id/sync`
- 取消同步：`POST /api/library/embed-profiles/:id/sync/cancel`
- 回滚 release：`POST /api/library/embed-profiles/:id/rollback`

最小排查示例：

```bash
# 1) 查看 profile 列表与状态
curl -sS -H "Authorization: Bearer <token>" \
  http://127.0.0.1:4173/api/library/embed-profiles | jq '.profiles[] | {id,name,syncStatus,syncMessage,activeReleaseId}'

# 2) 如有挂起/超时，取消本次同步
curl -sS -X POST -H "Authorization: Bearer <token>" \
  http://127.0.0.1:4173/api/library/embed-profiles/<id>/sync/cancel

# 3) 若新 release 有问题，回滚到上一版
curl -sS -X POST -H "Authorization: Bearer <token>" \
  http://127.0.0.1:4173/api/library/embed-profiles/<id>/rollback
```

临时缓解：
1. 将受影响资源切换为“仅下载”
2. 确认学生端可访问原文件，保障课堂不中断

若怀疑 vendor 目录有重复脏文件（如 `assets 2`、`embed 2.js`、`viewer 2.html`）：

1. 先执行 dry-run 预览：
   - `npm run cleanup:embed-vendor -- --dry-run`
2. 确认输出仅包含重复副本后再执行清理：
   - `npm run cleanup:embed-vendor -- --apply`

## 6. 恢复与验证清单

恢复后必须验证：
1. 资源列表可见
2. 打开模式符合预期（演示/下载）
3. 删除列表状态正确
4. 管理页无新的控制台错误

## 7. 事故复盘建议

复盘记录包含：
- 时间线
- 触发操作
- 影响范围
- 临时处置
- 根因
- 长期修复项（测试/文档/权限策略）
