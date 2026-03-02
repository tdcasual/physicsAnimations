# 无效代码/冲突/BUG 审计记录（2026-02-28）

## 审计范围

- 后端：`server/**`、`api/**`、部署配置
- 前端：`frontend/src/**`、管理台系统配置流程
- 仓库卫生：`.gitignore` 与运行产物目录

## 已执行验证

- 后端测试：`npm test`，`191/191` 通过（含性能预算回归与脚本守护）
- 前端测试：`npm --prefix frontend run test -- --run`，`56/56` 文件通过（`167/167` 用例）
- SPA 冒烟：`smoke:spa-public`、`smoke:spa-admin`、`smoke:spa-admin-write`、`smoke:spa-library-admin` 全部通过
- 前端依赖图扫描（`frontend/src`）：
  - 运行时代码可达性正常，未发现明显孤儿模块（`env.d.ts`、`main.ts` 为特例）
- 移动端运行态复测（`390px/375px/320px`）：
  - `/`、`/viewer/*`、`/login`、`/admin/*` 未复现横向溢出
  - 当前运行态交互控件最小高度复测为 `40px`

## 修复进展（本轮）

- 已修复：WebDAV 超时配置非法值会触发瞬时中断（`AbortError`）
  - 修复点：
    - [webdavStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/contentStore/webdavStore.js:10)
    - [webdav-store-timeout.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-store-timeout.test.js:25)
  - 修复内容：`timeoutMs` 改为统一容错解析并钳制最小值（`>=1000ms`），避免 `NaN/负值` 进入 `setTimeout`
  - 回归验证：
    - `node --test tests/webdav-store-timeout.test.js` 通过
    - `npm test` 全量通过（`191/191`）
- 已修复：`system.json` 中 `webdav.timeoutMs` 为字符串时被错误回退为默认值
  - 修复点：
    - [systemState.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/systemState.js:30)
    - [system-state-normalization.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/system-state-normalization.test.js:19)
  - 修复内容：系统状态加载统一解析 `timeoutMs`（支持数字字符串），并对过小值执行最小值钳制
  - 回归验证：
    - `node --test tests/system-state-normalization.test.js tests/system-state.test.js` 通过
    - `npm test` 全量通过（`191/191`）
- 已修复：`JWT_TTL_SECONDS` 非法值可导致登录签发 token 失败
  - 修复点：
    - [auth.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/auth.js:14)
    - [auth-token-ttl.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/auth-token-ttl.test.js:6)
  - 修复内容：新增 `JWT_TTL_SECONDS` 容错解析，非法或非正数回退到默认 `28800s`
  - 回归验证：
    - `node --test tests/auth-token-ttl.test.js` 通过
    - `npm test` 全量通过（`191/191`）
- 已修复：`TRUST_PROXY` 非法值会触发启动崩溃
  - 修复点：
    - [app.js](/Users/lvxiaoer/Documents/physicsAnimations/server/app.js:26)
    - [trust-proxy-env.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/trust-proxy-env.test.js:30)
  - 修复内容：`parseTrustProxy` 支持大小写无关布尔值和常见命名值；对无法被 Express 接受的值（如 `foo`）捕获错误并回退为 `false`，避免进程崩溃
  - 回归验证：
    - `node --test tests/trust-proxy-env.test.js` 通过
    - `npm test` 全量通过（`191/191`）
- 已修复：`PORT` 非法值会导致 Node 监听阶段抛 `RangeError`
  - 修复点：
    - [index.js](/Users/lvxiaoer/Documents/physicsAnimations/server/index.js:6)
    - [server-index-port.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/server-index-port.test.js:1)
  - 修复内容：入口增加 `parsePort` 兜底与端口范围校验；并改为 `require.main === module` 启动，避免测试/导入时意外开服
  - 回归验证：
    - `node --test tests/server-index-port.test.js` 通过
    - `npm test` 全量通过（`191/191`）
- 已修复：`hybrid` 模式下本地缓存读失败会中断请求，未回退远端
  - 修复点：
    - [hybridStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/contentStore/hybridStore.js:29)
    - [hybrid-store-fallback.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/hybrid-store-fallback.test.js:41)
  - 修复内容：`readBuffer` 与 `createReadStream` 在本地读取异常时记录告警并自动回退 WebDAV 读取，保持混合存储可用性
  - 回归验证：
    - `node --test tests/hybrid-store-fallback.test.js` 通过
    - `npm test` 全量通过（`191/191`）
- 已修复：SPA fallback 误吞多级扩展名路径
  - 修复点：[app.js](/Users/lvxiaoer/Documents/physicsAnimations/server/app.js:86)
  - 回归测试：[spa-entry-routes.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/spa-entry-routes.test.js:134)
- 已修复：Vercel `includeFiles` 与 SPA `frontend/dist` 路径冲突
  - 修复点：[vercel.json](/Users/lvxiaoer/Documents/physicsAnimations/vercel.json:6)
  - 回归测试：[vercel-config.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/vercel-config.test.js:5)
- 已修复：系统向导清空超时值被强制写成 `0` 的语义错误
  - 修复点：
    - [SystemWizardConnectionStep.vue](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/views/admin/system/SystemWizardConnectionStep.vue:43)
    - [useSystemWizard.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/features/admin/system/useSystemWizard.ts:98)
    - [useSystemWizardActions.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/features/admin/system/useSystemWizardActions.ts:72)
  - 回归测试：[admin-system-timeout-clear.test.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/test/admin-system-timeout-clear.test.ts:9)
- 已修复：门禁脚本与 `frontend/dist` 前置条件冲突
  - 修复点：
    - [frontend-dist-copy.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/frontend-dist-copy.test.js:6)
    - [qa_release_gate.sh](/Users/lvxiaoer/Documents/physicsAnimations/scripts/qa_release_gate.sh:4)
  - 回归测试：[qa-release-gate.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/qa-release-gate.test.js:5)
- 已修复：`output/` 产物目录污染工作区
  - 修复点：[.gitignore](/Users/lvxiaoer/Documents/physicsAnimations/.gitignore:97)
  - 回归测试：[gitignore-output.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/gitignore-output.test.js:5)
- 已修复：Serverless 双入口漂移风险（复用单一 app 入口）
  - 修复点：[serverless-handler.js](/Users/lvxiaoer/Documents/physicsAnimations/serverless-handler.js:1)
  - 回归测试：[serverless-entry-alignment.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/serverless-entry-alignment.test.js:5)
- 已修复：Node 运行时与前端类型包主版本不一致
  - 修复点：
    - [frontend/package.json](/Users/lvxiaoer/Documents/physicsAnimations/frontend/package.json:22)
    - [node-runtime-alignment.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/node-runtime-alignment.test.js:12)
  - 回归验证：`npm test`、`npm --prefix frontend run test -- --run` 通过
- 已修复：`perf-api` 预算断言受并发抖动影响导致偶发红灯
  - 修复点：[perf-api.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/perf-api.test.js:292)
  - 修复内容：预算失败时单次重试并输出对比统计，保留真实回归拦截
  - 回归验证：`npm test` 通过（`179/179`）
- 已修复：前端测试中 `--localstorage-file` 无效路径 warning 噪音
  - 修复点：
    - [frontend/package.json](/Users/lvxiaoer/Documents/physicsAnimations/frontend/package.json:13)
    - [vite.config.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/vite.config.ts:14)
    - [node-localstorage-shim.mjs](/Users/lvxiaoer/Documents/physicsAnimations/frontend/test/node-localstorage-shim.mjs:1)
  - 修复内容：测试进程及 worker 预加载 `localStorage` shim，避免 Node webstorage 参数告警
  - 回归验证：`npm run test:frontend -- --run` 全量通过且告警消失
- 已修复：Vercel 仍打包 legacy `404.html`（无消费链路）
  - 修复点：
    - [vercel.json](/Users/lvxiaoer/Documents/physicsAnimations/vercel.json:9)
    - [vercel-config.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/vercel-config.test.js:14)
  - 修复内容：移除 `404.html` include 并加入守护断言，避免旧入口残留
- 已修复：分类管理组合式函数存在未使用状态引用（死代码）
  - 修复点：[useTaxonomyAdmin.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/features/admin/taxonomy/useTaxonomyAdmin.ts:46)
  - 修复内容：移除未被消费的 `groupById` 解构引用
  - 回归验证：
    - `npm exec -- tsc --noEmit --noUnusedLocals --noUnusedParameters -p tsconfig.json`（frontend）通过
    - `npm run test:frontend -- --run` 全量通过
- 已修复：发布门禁在 TTY 下可能进入 vitest watch 模式并挂起
  - 修复点：
    - [qa_release_gate.sh](/Users/lvxiaoer/Documents/physicsAnimations/scripts/qa_release_gate.sh:7)
    - [qa-release-gate.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/qa-release-gate.test.js:10)
  - 修复内容：前端测试命令改为显式单次执行 `npm --prefix frontend run test -- --run`
  - 回归验证：
    - `node --test tests/qa-release-gate.test.js` 通过
    - `npm run test:frontend -- --run`、`npm test` 全量通过
- 已修复：后端状态/鉴权链路存在未使用代码片段（死代码）
  - 修复点：
    - [adminState.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/adminState.js:1)
    - [auth.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/auth.js:182)
    - [wrappedStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/stateDb/wrappedStore.js:17)
    - [library-service.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-service.test.js:305)
  - 修复内容：
    - 删除未被调用的 `withStateLock` 实现与配套 `stateLocks`
    - 移除 `catch (err)` 中未使用变量
    - 移除 `mirrorOps` 中未使用的 `getBuiltinOverridesDirty` 解构
    - 清理测试中的未使用局部变量
  - 回归验证：
    - `eslint no-unused-vars`（server/scripts/tests 定向规则）通过
    - `npm test` 全量通过（`179/179`）
- 已修复：`wrappedStore` 空 `catch` 缺少语义注释，容易被误判为漏处理异常
  - 修复点：[wrappedStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/stateDb/wrappedStore.js:74)
  - 修复内容：保留“镜像失败回退主存储”的原行为，补充注释明确其为 best-effort 策略
  - 回归验证：
    - `eslint no-empty`（server 定向规则）通过
    - `npm test` 全量通过（`179/179`）
- 已修复：配置文档遗漏 `hybrid` 存储模式，和运行实现不一致
  - 修复点：
    - [configuration.md](/Users/lvxiaoer/Documents/physicsAnimations/docs/guides/configuration.md:35)
    - [configuration-doc-storage-mode.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/configuration-doc-storage-mode.test.js:1)
  - 修复内容：`STORAGE_MODE` 选项补齐为 `local / hybrid / webdav`，并补充“未显式设置 `STORAGE_MODE` 且提供 `WEBDAV_URL` 时自动使用 `hybrid`”说明
  - 回归验证：`node --test tests/ops-docs.test.js tests/configuration-doc-storage-mode.test.js` 通过
- 已修复：SPA 冒烟脚本存在 Promise executor 隐式返回值（无效返回值模式）
  - 修复点：
    - [smoke_spa_public.js](/Users/lvxiaoer/Documents/physicsAnimations/scripts/smoke_spa_public.js:36)
    - [smoke_spa_admin.js](/Users/lvxiaoer/Documents/physicsAnimations/scripts/smoke_spa_admin.js:36)
    - [smoke_spa_library_admin.js](/Users/lvxiaoer/Documents/physicsAnimations/scripts/smoke_spa_library_admin.js:37)
    - [smoke_spa_admin_writepath.js](/Users/lvxiaoer/Documents/physicsAnimations/scripts/smoke_spa_admin_writepath.js:36)
  - 修复内容：将 `new Promise((resolve) => setTimeout(resolve, ...))` 改为显式块体，避免 executor 返回值被误用
  - 回归验证：
    - `eslint --rule 'no-promise-executor-return:error' scripts` 通过
    - `node --test tests/spa-public-smoke-guards.test.js tests/spa-smoke-dist-freshness.test.js tests/library-smoke-script.test.js` 通过
- 已修复：资源库 normalizers 存在未被消费的导出（死代码）
  - 修复点：[normalizers.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/core/normalizers.js:232)
  - 修复内容：删除未被任何调用链使用的 `mergeUniqueList` 函数与导出项
  - 回归验证：
    - `node --test tests/library-*.test.js` 通过（`56/56`）
    - `npm test` 全量通过（`179/179`）
- 已修复：测试辅助存在 Promise executor 隐式返回值（无效返回值模式）
  - 修复点：
    - [app-query-repo-wiring.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/app-query-repo-wiring.test.js:87)
    - [library-route-api.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-route-api.test.js:43)
    - [update-geogebra-bundle.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/update-geogebra-bundle.test.js:45)
    - [task-queue.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/task-queue.test.js:10)
  - 修复内容：将单表达式 Promise executor 统一改为显式块体，避免无效返回值触发规则噪音
  - 回归验证：
    - `eslint --rule 'no-promise-executor-return:error' tests` 通过
    - `npm test` 全量通过（`179/179`）
- 已修复：系统向导只读模式下表单仍可编辑，导致“有改动但无法保存”的交互冲突
  - 修复点：
    - [SystemWizardSteps.vue](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/views/admin/system/SystemWizardSteps.vue:82)
    - [SystemWizardConnectionStep.vue](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/views/admin/system/SystemWizardConnectionStep.vue:6)
    - [admin-system-readonly-guards.test.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/test/admin-system-readonly-guards.test.ts:1)
  - 修复内容：在 readOnly 模式下禁用模式选择与连接步骤输入控件（含 checkbox 与“下一步”），避免制造不可提交的脏状态
  - 回归验证：
    - `vitest --run test/admin-system-readonly-guards.test.ts` 通过
    - `npm run test:frontend -- --run` 全量通过（`56/56` 文件，`167/167` 用例）
- 已修复：上传管理编辑标题缺少前置校验与 `invalid_title` 映射，用户只看到通用“保存失败”
  - 修复点：
    - [useUploadAdminActions.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/features/admin/uploads/useUploadAdminActions.ts:15)
    - [useUploadAdmin.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/features/admin/uploads/useUploadAdmin.ts:136)
    - [AdminUploadsView.vue](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/views/admin/AdminUploadsView.vue:49)
    - [UploadsEditPanel.vue](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/views/admin/uploads/UploadsEditPanel.vue:9)
    - [admin-upload-validation-guards.test.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/test/admin-upload-validation-guards.test.ts:1)
  - 修复内容：
    - 提交前阻止空白标题并给出字段级错误 `editTitle`
    - 后端返回 `invalid_title` 时映射为同一字段级提示，避免通用错误文案
    - 编辑面板新增标题错误高亮与内联错误文本
  - 回归验证：
    - `npm --prefix frontend run test -- admin-upload-validation-guards.test.ts --run` 通过
    - `npm --prefix frontend run test -- admin-content-validation-guards.test.ts --run` 通过
- 已修复：截图网络拦截在 `allowedFileRoot` 缺失时仍可能放行 `file:` 子请求
  - 修复点：
    - [screenshot.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/screenshot.js:52)
    - [screenshot-file-request-guard.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/screenshot-file-request-guard.test.js:1)
  - 修复内容：
    - 路由拦截逻辑调整为：`file:` 子请求必须存在 `allowedFileRoot` 且路径落在根目录内，否则直接 `abort`
    - 保留已有行为：在受限根目录内的 `file:` 子请求可继续（用于本地上传包资源加载）
  - 回归验证：
    - `node --test tests/screenshot-file-request-guard.test.js` 通过
    - `node --test tests/screenshot-navigation-policy.test.js tests/items-screenshot-service.test.js` 通过
- 已修复：`POST /api/items`（multipart）缺少文件时返回 `invalid_input`，与 `/api/items/upload` 的 `missing_file` 语义冲突
  - 修复点：
    - [createRoutes.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/items/createRoutes.js:34)
    - [upload-paths.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/upload-paths.test.js:111)
  - 修复内容：
    - `multipart/form-data` 请求在无文件时直接返回 `400 { error: "missing_file" }`
    - 保持原有行为：非 multipart 请求继续走 link 创建参数校验
  - 回归验证：
    - `node --test tests/upload-paths.test.js` 通过
    - `node --test tests/items-link-title-normalization.test.js` 通过
- 已修复：管理台概览“全部内容”统计口径错误，内置内容被重复计入
  - 修复点：
    - [adminApi.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/features/admin/adminApi.ts:241)
    - [admin-dashboard-api.test.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/test/admin-dashboard-api.test.ts:19)
  - 修复内容：
    - `dynamicTotal` 改为 `uploadTotal + linkTotal`
    - `total` 保持 `dynamicTotal + builtinTotal`，避免将 `/api/items`（已含内置）再次叠加
    - 同时移除一次无必要的 `/api/items` 聚合请求
  - 回归验证：
    - `npm --prefix frontend run test -- admin-dashboard-api.test.ts admin-dashboard-race.test.ts --run` 通过
    - `npm --prefix frontend run test -- admin-api-contract.test.ts admin-dashboard-api.test.ts --run` 通过
- 已修复：ZIP 上传总量限制只依赖压缩包元数据，可被“伪小元数据”绕过
  - 修复点：
    - [uploadZipIngest.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/items/uploadZipIngest.js:78)
    - [items-upload-zip-total-bytes.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/items-upload-zip-total-bytes.test.js:34)
  - 修复内容：
    - 总量统计从 `file.uncompressedSize` 改为实际解压后的 `buf.length`
    - 在保留单文件上限校验的前提下，确保总量上限（80MB）基于真实写入字节数生效
  - 回归验证：
    - `node --test tests/items-upload-zip-total-bytes.test.js` 通过
    - `node --test tests/upload-paths.test.js tests/items-upload-branch-split.test.js` 通过
- 已修复：WebDAV 同步中 `builtin_items` 同 ID 冲突固定本地优先，会覆盖更新的远端覆盖项
  - 修复点：
    - [stateMerge.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/stateMerge.js:34)
    - [webdav-state-merge.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-state-merge.test.js:70)
  - 修复内容：
    - `mergeBuiltinItems` 冲突决策改为“`updatedAt` 新者优先，平局本地优先”
    - 与动态条目冲突策略保持一致，避免跨端回写覆盖新配置
  - 回归验证：
    - `node --test tests/webdav-state-merge.test.js` 通过
    - `node --test tests/library-sync-cleanup-errors.test.js` 通过
- 已修复：WebDAV 同步会上传 `content/state.sqlite` 缓存文件，导致无效同步与体积噪音
  - 修复点：
    - [fileUtils.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/fileUtils.js:54)
    - [webdav-sync-skip-sqlite.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-sync-skip-sqlite.test.js:30)
  - 修复内容：
    - `shouldSkip` 新增对 `state.sqlite` 及 sidecar（`-wal/-shm/-journal`）的跳过规则
    - 避免把本地 SQL 镜像缓存当业务内容上传到远端 WebDAV
  - 回归验证：
    - `node --test tests/webdav-sync-skip-sqlite.test.js` 通过
    - `node --test tests/webdav-state-merge.test.js tests/library-sync-cleanup-errors.test.js` 通过
- 已修复：路由 service-result helper 对异常状态码无防护，可能返回非法 HTTP 状态
  - 修复点：
    - [shared.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/library/shared.js:1)
    - [shared.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/items/shared.js:29)
    - [service-result-status-guard.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/service-result-status-guard.test.js:1)
  - 修复内容：
    - `sendServiceResult/respondWithServiceResult` 新增错误状态码归一化，仅允许 `400..599`
    - 对 `NaN/超范围/非法值` 统一回退 `500`，避免 `res.status` 被传入异常状态
  - 回归验证：
    - `node --test tests/service-result-status-guard.test.js` 通过
    - `node --test tests/error-handler-status-guard.test.js tests/service-result-status-guard.test.js tests/library-route-api.test.js tests/items-sql-query.test.js` 通过
- 已修复：`/api` 根路径（无尾斜杠）未命中安全头逻辑，404 响应缺失防护头
  - 修复点：
    - [securityHeaders.js](/Users/lvxiaoer/Documents/physicsAnimations/server/middleware/securityHeaders.js:1)
    - [security-headers.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/security-headers.test.js:45)
  - 修复内容：
    - API 安全头匹配条件从仅 `/api/*` 扩展为 `/api` 与 `/api/*`
    - 保证 API 根路径 404 也带 `nosniff/referrer-policy/x-frame-options/permissions-policy`
  - 回归验证：
    - `node --test tests/security-headers.test.js` 通过
- 已修复：截图队列环境变量使用 `parseInt` 前缀容忍，`3s/99ms` 会被误解析
  - 修复点：
    - [screenshotQueue.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/screenshotQueue.js:1)
    - [screenshot-queue-env.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/screenshot-queue-env.test.js:1)
  - 修复内容：
    - 新增严格正整数解析，仅接受纯数字字符串
    - 对非法/非正值回退默认并保持最小值约束（并发 `1`、队列上限 `50`）
  - 回归验证：
    - `node --test tests/screenshot-queue-env.test.js` 通过
    - `node --test tests/screenshot-queue-env.test.js tests/screenshot-task-api.test.js tests/metrics-auth.test.js tests/security-headers.test.js tests/service-result-status-guard.test.js tests/error-handler-status-guard.test.js` 通过
- 已修复：截图导航超时环境变量宽松解析导致 `15s/1200ms` 被误当毫秒
  - 修复点：
    - [screenshot.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/screenshot.js:13)
    - [screenshot-navigation-policy.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/screenshot-navigation-policy.test.js:34)
  - 修复内容：
    - `parsePositiveTimeout` 改为严格正整数字符串/数值解析
    - 非法后缀值不再被前缀截断，统一回退默认超时（Web `30000ms`、File `5000ms`）
  - 回归验证：
    - `node --test tests/screenshot-navigation-policy.test.js` 通过
    - `node --test tests/screenshot-navigation-policy.test.js tests/screenshot-file-request-guard.test.js tests/items-screenshot-service.test.js tests/screenshot-queue-env.test.js tests/screenshot-task-api.test.js tests/security-headers.test.js tests/service-result-status-guard.test.js tests/error-handler-status-guard.test.js tests/metrics-auth.test.js` 通过
- 已修复：`JWT_TTL_SECONDS` 宽松解析会把 `90s` 误当 `90` 秒，导致登录态异常过期
  - 修复点：
    - [auth.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/auth.js:20)
    - [auth-token-ttl.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/auth-token-ttl.test.js:36)
  - 修复内容：
    - token TTL 解析改为严格正整数字符串/数值解析
    - 非法后缀值回退默认 `28800s`，避免误缩短会话时长
  - 回归验证：
    - `node --test tests/auth-token-ttl.test.js` 通过
    - `node --test tests/auth-token-ttl.test.js tests/auth-login-normalization.test.js tests/auth-account-validation.test.js tests/security-headers.test.js tests/service-result-status-guard.test.js tests/screenshot-navigation-policy.test.js tests/screenshot-queue-env.test.js tests/error-handler-status-guard.test.js` 通过
- 已修复：限流窗口边界条件使用 `>`，在 `now === resetAt` 时会误命中旧窗口并触发误限流
  - 修复点：
    - [rateLimit.js](/Users/lvxiaoer/Documents/physicsAnimations/server/middleware/rateLimit.js:15)
    - [rate-limit-boundary.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/rate-limit-boundary.test.js:25)
  - 修复内容：
    - 限流窗口重置与过期清理条件由 `>` 调整为 `>=`
    - 保证边界时刻请求进入新窗口，避免单点时间戳上的误判 429
  - 回归验证：
    - `node --test tests/rate-limit-boundary.test.js` 通过
    - `node --test tests/rate-limit-boundary.test.js tests/auth-login-normalization.test.js tests/auth-account-validation.test.js tests/taxonomy.test.js tests/library-route-api.test.js tests/screenshot-task-api.test.js tests/security-headers.test.js tests/service-result-status-guard.test.js tests/screenshot-navigation-policy.test.js tests/screenshot-queue-env.test.js tests/auth-token-ttl.test.js tests/error-handler-status-guard.test.js` 通过
- 已修复：运行时 API 指标漏计 `/api` 根路径请求，导致请求统计不完整
  - 修复点：
    - [runtimeMetrics.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/runtimeMetrics.js:56)
    - [runtime-metrics-root-path.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/runtime-metrics-root-path.test.js:20)
  - 修复内容：
    - API 请求匹配范围从仅 `/api/*` 扩展为 `/api` 与 `/api/*`
    - 统一 API 维度统计口径，避免根路径 404 请求遗漏
  - 回归验证：
    - `node --test tests/runtime-metrics-root-path.test.js` 通过
    - `node --test tests/runtime-metrics-root-path.test.js tests/metrics-auth.test.js tests/security-headers.test.js tests/rate-limit-boundary.test.js tests/auth-token-ttl.test.js tests/screenshot-navigation-policy.test.js tests/screenshot-queue-env.test.js tests/service-result-status-guard.test.js tests/error-handler-status-guard.test.js` 通过
- 已修复：管理台登录重定向前缀校验过宽，`/adminX` 会被当成合法管理页重定向目标
  - 修复点：
    - [redirect.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/router/redirect.ts:7)
    - [admin-redirect.test.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/test/admin-redirect.test.ts:5)
  - 修复内容：
    - 新增管理路由段校验，仅允许 `/admin` 或 `/admin/*`
    - 阻断 `/adminX`、`/admin-content` 这类伪前缀路径，统一回退 `/admin/dashboard`
  - 回归验证：
    - `npm --prefix frontend run test -- admin-redirect.test.ts router-guard.test.ts login-flow-consistency.test.ts --run` 通过
- 已修复：legacy 资源缺失 `openMode` 时默认被归一化为 `download`，与历史默认 `embed` 语义冲突
  - 修复点：
    - [normalizers.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/libraryState/normalizers.js:103)
    - [libraryApiMappers.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/features/library/libraryApiMappers.ts:39)
    - [library-state.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-state.test.js:132)
    - [library-api-mappers-robustness.test.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/test/library-api-mappers-robustness.test.ts:29)
  - 修复内容：
    - 后端状态归一化：仅显式 `download` 才进入下载模式，缺失/非法值默认回 `embed`
    - 前端 API 映射保持同口径，避免历史数据在客户端再次降级为 `download`
  - 回归验证：
    - `node --test tests/library-state.test.js tests/library-service.test.js tests/library-route-api.test.js tests/library-update-no-changes.test.js` 通过
    - `npm --prefix frontend run test -- library-api-mappers-robustness.test.ts library-api.test.ts library-admin-upload.test.ts --run` 通过
- 已修复：WebDAV 基础认证在“仅用户名、空密码”场景未发送 `Authorization` 头
  - 修复点：
    - [webdavStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/contentStore/webdavStore.js:49)
    - [webdav-store-timeout.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-store-timeout.test.js:106)
  - 修复内容：
    - 认证头生成条件由“用户名和密码都非空”调整为“任一字段非空即发送 Basic 认证”
    - 保留“用户名和密码都空时不发送认证头”的现有行为
  - 回归验证：
    - `node --test tests/webdav-store-timeout.test.js` 通过
    - `node --test tests/webdav-store-timeout.test.js tests/content-store-config-priority.test.js tests/content-store-key-validation.test.js tests/system-state.test.js tests/webdav-sync-skip-sqlite.test.js tests/webdav-state-merge.test.js` 通过
- 已修复：`order` 字段使用 `z.coerce.number()` 会将 `null` 静默转成 `0`，导致误更新
  - 修复点：
    - [groups.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/groups.js:25)
    - [categories.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/categories.js:27)
    - [shared.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/items/shared.js:19)
    - [taxonomy-title-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/taxonomy-title-validation.test.js:195)
    - [items-link-title-normalization.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/items-link-title-normalization.test.js:100)
  - 修复内容：
    - taxonomy/items 的 `order` 改为“仅接受整数或整数字符串” schema
    - `null`、空值和非整数字符串不再被强制转成 `0`，统一返回 `invalid_input`
  - 回归验证：
    - `node --test tests/taxonomy-title-validation.test.js` 通过
    - `node --test tests/items-link-title-normalization.test.js` 通过
    - `node --test tests/items-link-title-normalization.test.js tests/items-sql-query.test.js tests/items-merged-sql-path.test.js tests/taxonomy-title-validation.test.js tests/taxonomy.test.js tests/categories-sql-query.test.js` 通过

## 发现清单（按优先级）

### [P1][已修复] Vercel 打包清单与当前 SPA 产物路径冲突，存在线上首页 503 风险

- 证据：
  - [vercel.json](/Users/lvxiaoer/Documents/physicsAnimations/vercel.json:6) `includeFiles` 仅包含 `assets/**`、`index.html`、`viewer.html` 等旧路径
  - [app.js](/Users/lvxiaoer/Documents/physicsAnimations/server/app.js:213) 运行时明确从 `frontend/dist` 读取 SPA 入口与资源
  - [app.js](/Users/lvxiaoer/Documents/physicsAnimations/server/app.js:220) `frontend/dist/index.html` 不存在时返回 `503 {"error":"service_unavailable"}`
- 冲突点：
  - 代码运行路径是 `frontend/dist/**`
  - Vercel 配置仍偏向旧入口/旧资源清单
- 影响：
  - Serverless 打包若未携带 `frontend/dist/**`，`/` 会直接 503，`/assets/*` 资源不可达

### [P1][已修复] 系统配置页清空“超时(ms)”会被写成 1000ms，无法回到默认语义

- 证据：
  - [SystemWizardConnectionStep.vue](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/views/admin/system/SystemWizardConnectionStep.vue:45) 清空输入会把值设为 `0`
  - [systemFormState.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/features/admin/systemFormState.ts:73) `0` 会被当成有效 `timeoutMs` 写入 payload
  - [system.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/system.js:23) 后端把 `0` 强制夹到 `1000`
  - [system.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/system.js:51) 默认展示语义是 `15000`
- 冲突点：
  - UI 清空动作通常应表示“回默认/不修改”
  - 当前实现会落成 `1000ms`，与默认值语义冲突
- 影响：
  - 可能导致 WebDAV 请求超时过短，触发非预期同步/连接失败

### [P1][已修复] SPA fallback 会误吞“多级带扩展名路径”，返回 200 HTML 而非 404

- 证据：
  - [app.js](/Users/lvxiaoer/Documents/physicsAnimations/server/app.js:95) 仅拦截根层级扩展名路径（`/^\\/[^/]+\\.[^/]+$/`）
  - 复现实验（2026-02-28）：
    - `GET /foo.js` -> `404 {"error":"not_found"}`
    - `GET /foo/bar.js` -> `200` 且返回 `index.html`
    - `GET /foo/bar/baz.css` -> `200` 且返回 `index.html`
  - [spa-entry-routes.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/spa-entry-routes.test.js:116) 仅覆盖了根层级扩展名路径（`/robots.txt`）
- 冲突点：
  - history fallback 预期只处理前端路由
  - 当前实现会把“看起来像静态资源请求”的多级 URL 误判为前端路由
- 影响：
  - 资源缺失时返回 HTML 200，前端收到 MIME 不匹配错误，排障困难
  - 监控和爬虫可能把错误请求误判为健康 200

### [P1][已修复] 测试/发布门禁依赖 `frontend/dist`，但构建顺序与忽略策略冲突

- 证据：
  - [.gitignore](/Users/lvxiaoer/Documents/physicsAnimations/.gitignore:109) 忽略 `dist`（包含 `frontend/dist`）
  - [frontend-dist-copy.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/frontend-dist-copy.test.js:7) 直接读取 `frontend/dist`，无缺失兜底
  - [qa_release_gate.sh](/Users/lvxiaoer/Documents/physicsAnimations/scripts/qa_release_gate.sh:6) 先执行 `npm test`，在 [qa_release_gate.sh](/Users/lvxiaoer/Documents/physicsAnimations/scripts/qa_release_gate.sh:9) 才执行 `npm run build:frontend`
  - 复现实验（2026-02-28）：临时移走 `frontend/dist` 后执行 `node --test tests/frontend-dist-copy.test.js`，报 `ENOENT: .../frontend/dist`
- 冲突点：
  - 运行门禁把 `dist` 当测试前置条件
  - 仓库策略又把 `dist` 当可忽略产物，不保证存在
- 影响：
  - 在干净工作区/新 CI 环境下，`npm test` 或 `qa:release` 可能直接失败
  - 引入与业务代码无关的“环境状态型红灯”

### [P1][已修复] StateDB 镜像写失败后动态索引就绪位未回退，可能读取过期查询结果

- 证据：
  - [wrappedStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/stateDb/wrappedStore.js:150) 写入 `items.json` 失败时此前仅吞异常，未更新 `dynamicIndexedReady`
  - [storeFactory.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/stateDb/storeFactory.js:98) 查询路径若 `dynamicIndexedReady=true` 会跳过重建索引
  - 新增回归测试：
    - [state-db-wrapped-store.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/state-db-wrapped-store.test.js:79)
    - [state-db-wrapped-store.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/state-db-wrapped-store.test.js:118)
- 冲突点：
  - 镜像写入失败后索引数据可能已失真
  - 但就绪位保持 `true`，后续查询不会触发重新索引
- 影响：
  - 可能出现“写入已落地源存储，但 SQL 镜像查询仍读旧数据”的短期一致性问题
- 修复：
  - 在 `items.json` 相关镜像异常分支统一执行 `setDynamicIndexedReady(false)`，强制下一次查询走重建路径

### [P1][已修复] Content Store 对路径 key 缺少越界防护，存在目录穿越风险

- 证据：
  - [localStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/contentStore/localStore.js:53) 旧实现直接 `path.join(baseDir, key)`，未拒绝 `..`
  - [webdavStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/contentStore/webdavStore.js:49) 旧实现对 key/basePath 未校验 `.`/`..` 段
  - 新增回归测试：
    - [content-store-key-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/content-store-key-validation.test.js:10)
    - [content-store-key-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/content-store-key-validation.test.js:26)
    - [content-store-key-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/content-store-key-validation.test.js:39)
- 冲突点：
  - 存储层是文件/远端路径最后一层防线
  - 未做 key 校验会把上层输入缺陷放大为越界读写
- 影响：
  - 本地模式可能越界到 `content/` 目录外
  - WebDAV 模式可能写入/删除 `basePath` 之外目录
- 修复：
  - 本地与 WebDAV 存储统一拒绝 `.`/`..`/空 key
  - WebDAV 初始化阶段拒绝包含路径穿越段的 `basePath`

### [P1][已修复] WebDAV 双端同 ID 合并始终偏向本地，可能覆盖更新的远端数据

- 证据：
  - [stateMerge.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/stateMerge.js:149) 旧逻辑在 `localItem && remoteItem` 时固定选本地
  - 新增回归测试：
    - [webdav-state-merge.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-state-merge.test.js:6)
    - [webdav-state-merge.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-state-merge.test.js:38)
- 冲突点：
  - 同步模块已计算 `updatedAt/createdAt` 时间戳
  - 但碰撞分支未使用时间戳决策，导致远端更新被静默覆盖
- 影响：
  - 多端同步场景下可能出现“后写远端内容被旧本地回滚”的数据回退
- 修复：
  - 同 ID 冲突采用“时间戳新者优先，平局本地优先”策略
  - 保留类型不一致冲突记录逻辑不变

### [P1][已修复] 上传链路在状态持久化失败时遗留孤儿文件，导致存储与状态不一致

- 证据：
  - [uploadIngestService.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/items/uploadIngestService.js:47) `createLinkItem` 先写缩略图后写 `items` 状态，旧逻辑未做失败清理
  - [screenshotService.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/items/screenshotService.js:122) `runScreenshotTask` 先写缩略图后写 `items` 状态，旧逻辑未做失败清理
  - [foldersService.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/foldersService.js:101) `uploadFolderCover` 先写封面文件后写文件夹状态，旧逻辑未回滚
  - [writeOps.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/assetsService/writeOps.js:54) `uploadAsset` 先写资源文件后写资产状态，旧逻辑未清理
  - [embedProfilesService.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/embedProfilesService.js:111) `createEmbedProfile` 先镜像远端资源后写 profile 状态，旧逻辑未在失败时清理镜像目录
  - 新增回归测试：
    - [items-upload-ingest-service.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/items-upload-ingest-service.test.js:55)
    - [items-screenshot-service.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/items-screenshot-service.test.js:26)
    - [library-upload-cleanup.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-upload-cleanup.test.js:30)
    - [library-upload-cleanup.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-upload-cleanup.test.js:74)
    - [library-embed-profile-cleanup.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-embed-profile-cleanup.test.js:33)
- 冲突点：
  - 文件落盘成功但状态写入失败时，业务层会返回错误
  - 存储层仍残留未被引用的文件，形成“状态失败但文件成功”的双写漂移
- 影响：
  - 长期积累孤儿文件，增加磁盘占用与排障噪音
  - 可能在后续流程中被误识别为有效资源
- 修复：
  - `createLinkItem` 在状态写失败时删除刚写入的缩略图
  - `runScreenshotTask` 在状态写失败时删除刚写入的缩略图
  - `uploadFolderCover` 在状态写失败时回滚到旧封面（或删除新文件）
  - `uploadAsset` 在状态写失败时递归清理 `library/assets/<assetId>`
  - `createEmbedProfile` 在状态写失败时递归清理 `library/vendor/embed-profiles/<profileId>`

### [P2][已修复] `.gitignore` 仅忽略 `output/playwright`，其它截图产物会污染工作区

- 证据：
  - [.gitignore](/Users/lvxiaoer/Documents/physicsAnimations/.gitignore:97) 只有 `output/playwright/`
  - 实际审查中 `output/mobile-audit/**` 会保留审计报告文件且不被忽略
- 冲突点：
  - 项目测试/审计会在 `output/` 下生成多源截图
  - 忽略规则只覆盖其中一个子目录
- 影响：
  - 反复出现无关未跟踪文件，增加误提交与审查噪音

### [P2] `output/mobile-audit` 报告与当前运行态冲突（过期审计数据污染）

- 证据：
  - [home-dark-metrics.json](/Users/lvxiaoer/Documents/physicsAnimations/output/mobile-audit/home-dark-metrics.json:4) 记录暗色卡片背景为白色 `rgb(255, 255, 255)`
  - [report.json](/Users/lvxiaoer/Documents/physicsAnimations/output/mobile-audit/admin-pages/report.json:38) 记录导航触控高度仅 `33px`
  - 但当前源码约束仍是 `40px`：
    - [styles.css](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/styles.css:98) `.btn` `min-height: 40px`
    - [AdminLayoutView.vue](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/views/admin/AdminLayoutView.vue:40) `.admin-link` `min-height: 40px`
- 冲突点：
  - 产物目录保留了历史审计结果，与当前代码/运行态不一致
  - 同一项目内出现“报告判定失败、现网复测通过”的双重结论
- 影响：
  - 容易导致误判回归、重复修复已解决问题
  - 评审噪音上升，降低审计结果可信度

### [P2][已修复] 配置文档 `STORAGE_MODE` 选项与实现漂移

- 证据：
  - [configuration.md](/Users/lvxiaoer/Documents/physicsAnimations/docs/guides/configuration.md:35) 原先仅声明 `local / webdav`
  - [contentStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/contentStore.js:12) 实现支持 `hybrid`
  - [contentStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/contentStore.js:35) 未显式配置模式且存在 WebDAV 配置时会自动走 `hybrid`
- 冲突点：
  - 运维文档可选值少于运行时真实可选值，且缺失自动模式切换规则
- 影响：
  - 容易导致部署配置误判（把 `hybrid` 误当成不支持）
  - 排障时对“为何进入混合模式”缺少直接解释

### [P3][已修复] Serverless 入口存在双实现，实际接线不一致（遗留无效代码候选）

- 证据：
  - [api/index.js](/Users/lvxiaoer/Documents/physicsAnimations/api/index.js:1) 作为 Vercel 入口
  - [serverless-handler.js](/Users/lvxiaoer/Documents/physicsAnimations/serverless-handler.js:1) 另一路 handler 实现
  - [deployment.md](/Users/lvxiaoer/Documents/physicsAnimations/docs/guides/deployment.md:138) 文档同时宣称两者可用
- 冲突点：
  - 仓库内缺少将 `serverless-handler.js` 接入 CI/发布的实际链路说明
- 影响：
  - 维护成本增加，容易出现“改了 A，忘了 B”的行为漂移

### [P3][已修复] Node 运行时约束与前端类型依赖版本不一致

- 证据：
  - [package.json](/Users/lvxiaoer/Documents/physicsAnimations/package.json:38) 根工程声明 `node: >=24 <25`
  - [frontend/package.json](/Users/lvxiaoer/Documents/physicsAnimations/frontend/package.json:7) 前端同样声明 `node: >=24 <25`
  - [frontend/package.json](/Users/lvxiaoer/Documents/physicsAnimations/frontend/package.json:22) 但 `@types/node` 使用 `^25.2.3`
- 冲突点：
  - 运行时目标锁定 Node 24
  - 类型系统按 Node 25 API 演进，可能引入“类型可过、Node24 运行不支持”的漂移
- 影响：
  - 增加跨环境不一致风险，尤其在新 Node API 类型被误用时

### [P3][已修复] `smoke_spa_public` 对控制台错误的忽略规则过宽，存在漏报回归风险

- 证据：
  - [smoke_spa_public.js](/Users/lvxiaoer/Documents/physicsAnimations/scripts/smoke_spa_public.js:83) 忽略所有 `locationUrl` 含 `/animations/` 的 console error
  - [smoke_spa_public.js](/Users/lvxiaoer/Documents/physicsAnimations/scripts/smoke_spa_public.js:84) 忽略 `X-Frame-Options` 相关错误
  - [smoke_spa_public.js](/Users/lvxiaoer/Documents/physicsAnimations/scripts/smoke_spa_public.js:85) 忽略 `Content Security Policy` 相关错误
  - [smoke_spa_public.js](/Users/lvxiaoer/Documents/physicsAnimations/scripts/smoke_spa_public.js:323) `pageerror` 栈含 `/animations/` 直接跳过
- 冲突点：
  - 冒烟脚本目标是“发现用户可见回归”
  - 但白名单会屏蔽一类高价值错误（动画页脚本错误、嵌入策略回归）
- 影响：
  - 冒烟可能出现“绿灯但线上有明显错误”的假阴性

### [P3][已修复] SPA 冒烟脚本存在 Promise executor 隐式返回值（无效代码模式）

- 证据：
  - [smoke_spa_public.js](/Users/lvxiaoer/Documents/physicsAnimations/scripts/smoke_spa_public.js:36) 存在 `new Promise((resolve) => setTimeout(resolve, 250))`
  - [smoke_spa_admin_writepath.js](/Users/lvxiaoer/Documents/physicsAnimations/scripts/smoke_spa_admin_writepath.js:111) 同类写法重复出现
- 冲突点：
  - Promise executor 的返回值不会被消费，属于无效返回值模式
  - 在规则收紧时会持续制造 lint 噪音，影响真实问题识别
- 影响：
  - 降低脚本质量门禁信噪比
  - 增加后续规则升级时的额外整改成本

### [P3][已修复] 资源库 normalizers 存在未被消费的导出（死代码）

- 证据：
  - [normalizers.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/core/normalizers.js:232) 曾导出 `mergeUniqueList`
  - 全仓库无 `mergeUniqueList` 调用链（仅定义与导出）
- 冲突点：
  - 该函数不参与任何运行时路径，却持续增加模块认知成本
- 影响：
  - 误导维护者认为存在额外“列表去重聚合”逻辑入口
  - 提升未来重构时的无效兼容负担

### [P3][已修复] 测试辅助存在 Promise executor 隐式返回值（无效代码模式）

- 证据：
  - 多个测试文件使用 `new Promise((resolve) => server.close(resolve))`、`new Promise((resolve) => setTimeout(resolve, ms))`
  - 在规则启用后会触发 `no-promise-executor-return`
- 冲突点：
  - Promise executor 返回值不会被读取，属于语义噪音
- 影响：
  - 增加测试代码 lint 噪音，弱化真正行为回归信号

### [P2][已修复] 系统向导只读模式下可编辑但不可保存

- 证据：
  - [SystemWizardSteps.vue](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/views/admin/system/SystemWizardSteps.vue:82) 只读模式下此前未禁用模式 radio
  - [SystemWizardConnectionStep.vue](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/views/admin/system/SystemWizardConnectionStep.vue:71) 连接表单输入此前未绑定只读禁用
  - [useSystemWizard.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/features/admin/system/useSystemWizard.ts:82) 只读模式明确禁止保存
- 冲突点：
  - UI 允许继续编辑，但业务层拒绝保存，形成“可输入但不可提交”的冲突
- 影响：
  - 用户容易反复触发无效改动，增加离页确认和误操作成本

### [P1][已修复] TaskQueue 会把合法的 falsy 结果值错误归一化为 `null`

- 证据：
  - [taskQueue.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/taskQueue.js:90) 旧逻辑使用 `result || null`
  - 新增回归测试：
    - [task-queue.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/task-queue.test.js:35)
- 冲突点：
  - `0/false/""` 是合法任务结果
  - 逻辑或会把这些值误判为空并覆盖为 `null`
- 影响：
  - 任务 API 返回值失真，调用方无法区分“真实 0/false”与“无结果”
- 修复：
  - 改为 `result ?? null`，仅在 `null/undefined` 时归一化

### [P1][已修复] TaskQueue 显式参数为 `0` 时会被环境变量错误覆盖

- 证据：
  - [taskQueue.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/taskQueue.js:7) 旧逻辑使用 `option || process.env.*`
  - 新增回归测试：
    - [task-queue.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/task-queue.test.js:148)
- 冲突点：
  - 调用方显式传参应高于环境变量
  - 逻辑或把 `0` 当“未提供”，导致错误回退到 env 值
- 影响：
  - 队列并发/容量/超时配置出现隐式漂移，行为不可预测
- 修复：
  - `concurrency/maxQueue/maxTasks/timeoutMs` 全部改为 `??` 解析链

### [P1][已修复] WebDAV 显式空配置会被环境变量覆盖，导致认证与路径配置漂移

- 证据：
  - [webdavStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/contentStore/webdavStore.js:42) 旧逻辑 `username/password` 使用 `|| process.env.*`
  - [contentStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/contentStore.js:19) 旧逻辑 `resolveWebdavConfig` 使用 `|| process.env.*`
  - 新增回归测试：
    - [webdav-store-timeout.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-store-timeout.test.js:46)
    - [content-store-config-priority.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/content-store-config-priority.test.js:4)
- 冲突点：
  - 显式传入 `""/0`（例如清空认证、重置超时）应保留调用方意图
  - 逻辑或会把这些值吞掉并回退到环境变量
- 影响：
  - 明明配置为“无认证”却仍发送 `Authorization`
  - basePath/timeout 等运行参数可能与界面配置不一致
- 修复：
  - `contentStore` 与 `webdavStore` 的配置解析统一改为 `??`，保留显式空值语义

### [P1][已修复] Embed Profile 同步在关键依赖下载失败时误报成功

- 证据：
  - [embedProfileSync.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/core/embedProfileSync.js:103) 旧逻辑下载失败直接 `continue`
  - [embedProfileSync.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/core/embedProfileSync.js:131) 结果仍可返回 `ok: true`
  - 新增回归测试：
    - [library-service.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-service.test.js:177)
- 冲突点：
  - `viewer.html` 直链脚本/样式属于镜像运行时必需依赖
  - 关键依赖缺失却仍判定同步成功，形成“状态绿灯但资源不完整”的假成功
- 影响：
  - 管理台显示 `syncStatus=ok`，但实际打开 viewer 会因缺依赖而失败
  - 增加线上排障复杂度，误导回归判断
- 修复：
  - 将 `viewer.html` 同源直链依赖标记为必需项
  - 必需依赖下载失败时中断同步并返回失败

### [P1][已修复] 动态条目删除时 tombstone 持久化失败被吞，导致假成功

- 证据：
  - [writeService.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/items/writeService.js:105) 旧逻辑对 `mutateItemTombstonesState` 使用 `.catch(() => {})`
  - 新增回归测试：
    - [items-write-service.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/items-write-service.test.js:84)
- 冲突点：
  - 删除动态条目不仅需要移除 `items`，还需要写 tombstone 维持跨端删除语义
  - tombstone 写失败时仍返回 `{ ok: true }`，形成“状态不完整但接口成功”
- 影响：
  - 后续同步可能缺少删除标记，存在被远端旧数据回补的风险
  - 客户端误判删除链路已完整落地
- 修复：
  - tombstone 持久化失败时返回 `500/tombstone_persist_failed`，避免假成功

### [P1][已修复] 删除文件夹时资源清理失败被吞，导致成功响应与残留文件并存

- 证据：
  - [foldersService.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/foldersService.js:140) 旧逻辑删除已回收资产文件使用 `.catch(() => {})`
  - [foldersService.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/foldersService.js:154) 旧逻辑删除封面文件同样吞异常
  - 新增回归测试：
    - [library-service.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-service.test.js:530)
- 冲突点：
  - 删除流程会先改状态再清理文件，并在清理异常时继续返回成功
  - 造成“元数据已删除但磁盘文件残留”的漂移
- 影响：
  - 长期积累孤儿文件
  - 管理端无法感知清理失败，排障成本上升
- 修复：
  - 调整为先执行文件清理，失败立即返回错误
  - 清理成功后再落 folders/assets 状态，降低状态-文件漂移

### [P1][已修复] StateDB 显式传空模式会被环境变量覆盖，导致意外启用 sqlite

- 证据：
  - [storeFactory.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/stateDb/storeFactory.js:33) 旧逻辑使用 `mode || process.env.STATE_DB_MODE`
  - 新增回归测试：
    - [split-plan-baseline.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/split-plan-baseline.test.js:65)
- 冲突点：
  - 调用方显式传入 `mode: ""`（意图禁用）应高于环境默认值
  - 逻辑或把空字符串视为未提供，错误落到 `STATE_DB_MODE=sqlite`
- 影响：
  - 运行形态与调用配置不一致，可能在不预期时初始化 sqlite mirror
  - 增加部署环境差异引发的不可控行为
- 修复：
  - `mode/dbPath` 解析改为 `??`，仅在 `null/undefined` 时回退到环境变量

### [P1][已修复] `deleteAssetPermanently` 资源清理失败被吞，导致假成功并提前移除状态

- 证据：
  - [writeOps.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/assetsService/writeOps.js:231) 永久删除流程曾在状态删除后执行 `deletePath(...).catch(() => {})`
  - 新增回归测试：
    - [library-delete-cleanup-errors.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-delete-cleanup-errors.test.js:37)
- 冲突点：
  - 资产永久删除需要“文件清理 + 状态删除”一致完成
  - 旧逻辑吞掉清理异常并继续返回成功，且状态已经被移除
- 影响：
  - 客户端看到删除成功，但后端可能遗留资产目录
  - 形成“状态已删、文件未删”的不可见漂移
- 修复：
  - 调整为先清理 `library/assets/<assetId>`，失败返回 `500/asset_cleanup_failed`
  - 清理成功后再移除 assets 状态，避免假成功

### [P1][已修复] `deleteEmbedProfile` 清理镜像目录失败被吞，导致接口成功但 profile 已被误删

- 证据：
  - [embedProfilesService.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/embedProfilesService.js:210) 删除流程曾先删状态后 `deletePath(...).catch(() => {})`
  - 新增回归测试：
    - [library-delete-cleanup-errors.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-delete-cleanup-errors.test.js:73)
- 冲突点：
  - 删除 profile 需要同时清理 `library/vendor/embed-profiles/<profileId>`
  - 旧逻辑吞异常会造成“目录残留但 profile 状态已删”
- 影响：
  - 管理端误判 profile 已完全删除
  - 供应商镜像目录残留，增加存储噪音与排障成本
- 修复：
  - 调整为先清理镜像目录，失败返回 `500/embed_profile_cleanup_failed`
  - 清理成功后再从 profiles 状态中移除目标

### [P1][已修复] `syncEmbedProfile` 清理旧镜像目录失败被吞，导致同步假成功

- 证据：
  - [embedProfileSync.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/core/embedProfileSync.js:154) 旧逻辑对 `deletePath(mirrorPrefix)` 使用 `.catch(() => {})`
  - 新增回归测试：
    - [library-sync-cleanup-errors.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-sync-cleanup-errors.test.js:54)
- 冲突点：
  - 同步流程需要先清理旧镜像目录再写入新 bundle
  - 清理失败若被吞掉，流程仍会继续并返回 `syncStatus=ok`
- 影响：
  - 管理端看到同步成功，但目录内可能残留过期依赖
  - 新旧资源并存增加排障复杂度，且可能引入运行时冲突
- 修复：
  - 移除对 `deletePath` 的吞异常逻辑
  - 清理失败直接走 `syncEmbedProfile` 异常分支，返回 `502/embed_profile_sync_failed` 并写入 `syncStatus=failed`

### [P1][已修复] 资源库创建文件夹允许全空白名称，导致不可辨识目录写入成功

- 证据：
  - [library.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/library.js:45) 旧 schema 仅 `min(1)`，未对空白字符执行 trim 校验
  - [foldersService.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/foldersService.js:43) 旧实现直接 `String(name).trim()` 后落库，未拦截空字符串
  - 新增回归测试：
    - [library-folder-route-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-folder-route-validation.test.js:64)
- 冲突点：
  - 更新文件夹接口会拒绝空名称（`invalid_folder_name`）
  - 创建接口却允许 `"   "` 落库为空名称，前后约束不一致
- 影响：
  - 管理端可产生名称为空的文件夹，列表与选择器可读性显著下降
  - 后续编辑/排障时难以区分目录实体，增加误操作风险
- 修复：
  - 创建路由 schema 改为 `z.string().trim().min(1).max(128)`，阻断全空白输入
  - `createFolder` 增加服务层兜底校验（空名称返回 `400/invalid_folder_name`）
  - 创建路由改为统一走 `sendServiceResult`，避免服务错误被包装成假成功响应

### [P1][已修复] 文件夹封面更换扩展名时旧封面文件未清理，产生孤儿文件

- 证据：
  - [foldersService.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/foldersService.js:92) 旧 `uploadFolderCover` 只写入新 key 并更新状态，未删除旧 `coverPath` 对应 key
  - 新增回归测试：
    - [library-folder-cover-replace-cleanup.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-folder-cover-replace-cleanup.test.js:30)
- 冲突点：
  - 封面替换是“新文件写入 + 旧文件清理”的组合操作
  - 旧逻辑在扩展名变化（如 `.jpg -> .png`）时会保留旧文件
- 影响：
  - `content/library/covers/` 持续积累未引用文件
  - 长期占用存储并增加运维清理成本
- 修复：
  - 在封面状态更新成功后，若旧 `coverPath` 映射 key 与新 key 不同，则删除旧 key
  - 保留原有失败回滚逻辑，确保状态写失败时仍可回退新写入文件

### [P1][已修复] Taxonomy 分组/分类标题可被全空白绕过校验，导致空标题实体落库

- 证据：
  - [groups.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/groups.js:24) 旧 `createGroupSchema.title` 仅 `min(1)`，未 trim
  - [categories.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/categories.js:33) 旧 `createCategorySchema.title` 同样未 trim
  - 新增回归测试：
    - [taxonomy-title-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/taxonomy-title-validation.test.js:83)
- 冲突点：
  - 路由层允许 `"   "` 通过 schema，随后 `trim()` 后写入空字符串
  - 造成“输入合法但展示无标题”的数据质量问题
- 影响：
  - 分组/分类列表可出现空标题项，后台管理可读性下降
  - 依赖标题展示的下游页面可能出现空文案与选择歧义
- 修复：
  - `groups` 与 `categories` 的 create/update 标题 schema 统一改为 `z.string().trim().min(1).max(128)`
  - 从输入入口阻断空白标题，避免后续状态层持久化无效数据

### [P1][已修复] 动态条目更新允许全空白标题写入，导致列表可出现不可读项

- 证据：
  - [writeService.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/items/writeService.js:19) 旧动态更新分支直接写入 `patch.title`
  - 新增回归测试：
    - [items-write-service.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/items-write-service.test.js:84)
- 冲突点：
  - 条目创建路径会对标题做 trim/fallback，避免空标题落库
  - 更新路径却允许 `"   "` 直接覆盖既有标题，输入约束前后不一致
- 影响：
  - 动态条目可被更新为空白标题，管理端列表可读性下降
  - 增加后续筛选、编辑与回归检查的误判风险
- 修复：
  - 动态更新分支对 `title/categoryId/description` 统一做归一化（trim）
  - `title` 归一化后为空时返回 `400/invalid_title`，阻断无效写入

### [P1][已修复] 系统存储接口无法清空 WebDAV 密码，导致配置残留

- 证据：
  - [system.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/system.js:18) 旧逻辑仅在 `incoming.password` 为 truthy 时才更新
  - 新增回归测试：
    - [system-state.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/system-state.test.js:242)
- 冲突点：
  - 显式提交 `password: ""` 的语义应为“清空已保存密码”
  - 旧逻辑把空字符串视为“未提交”，导致旧密码被静默保留
- 影响：
  - 管理台显示/行为与用户配置意图不一致
  - 运维切换到无密码模式时容易残留历史凭证
- 修复：
  - `applyIncomingWebdav` 改为“只要传入字符串就覆盖 password”
  - 支持通过 `""` 显式清空凭证，`hasPassword` 状态可正确变为 `false`

### [P2][已修复] 登录接口未归一化用户名输入，前后空格会导致误报凭据错误

- 证据：
  - [auth.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/auth.js:15) 旧 `loginSchema.username` 未 `trim()`
  - 新增回归测试：
    - [auth-login-normalization.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/auth-login-normalization.test.js:39)
- 冲突点：
  - 管理账号修改流程会对用户名执行 `trim()` 并持久化规范值
  - 登录流程未做同样归一化，输入 `"  admin  "` 会直接参与比对并返回 `invalid_credentials`
- 影响：
  - 移动端软键盘/粘贴场景下更容易携带首尾空格，导致“账号正确但登录失败”的假阴性
  - 增加无效重试与误判风险
- 修复：
  - 登录 schema 改为 `z.string().trim().min(1).max(128)`，统一输入归一化规则
  - 回归验证补充了 `/api/auth/me` 断言，确保登录后用户名仍保持规范值

### [P2][已修复] 系统向导把全空格密码当作有效变更提交，违背“留空不更新”语义

- 证据：
  - [systemFormState.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/features/admin/systemFormState.ts:70) 旧逻辑对密码使用 `if (password)`，全空格会被当作有效输入
  - [SystemWizardConnectionStep.vue](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/views/admin/system/SystemWizardConnectionStep.vue:119) 界面文案明确“WebDAV 密码（留空表示不更新）”
  - 新增回归测试：
    - [system-form-state.test.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/test/system-form-state.test.ts:75)
- 冲突点：
  - UI 语义期望：空白输入不应触发密码更新
  - 实际行为：`"   "` 会被携带到请求中，后端会把该值当新密码保存
- 影响：
  - 移动端输入时误触空格可能导致密码被意外改成全空格
  - 配置保存后出现难以定位的认证异常
- 修复：
  - payload 构建改为 `if (password.trim())` 才附带 `webdav.password`
  - 保留原始密码值（非全空格时）不做裁剪，避免改变真实凭证内容

### [P1][已修复] 账号更新接口会吞掉无效 `newUsername` 并继续修改密码，导致部分生效

- 证据：
  - [auth.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/auth.js:54) 旧逻辑仅以 `trim()` 结果决定是否“有新用户名”，无效输入会被当作未提供
  - 新增回归测试：
    - [auth-account-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/auth-account-validation.test.js:49)
- 冲突点：
  - 请求同时包含 `newUsername: "   "` 与有效 `newPassword` 时
  - 旧逻辑不会拒绝非法用户名，而是静默忽略并继续更新密码
- 影响：
  - 客户端收到成功响应，但实际只更新了密码，用户名未更新
  - 属于“同一请求部分生效”，容易造成账号变更认知错位
- 修复：
  - 当请求显式提供 `newUsername` 且 `trim()` 后为空时，立即返回 `400/invalid_username`
  - 阻断后续密码更新，保证输入校验失败时零副作用

### [P1][已修复] 账号更新接口接受全空格 `newPassword`，可意外把密码改成空格串

- 证据：
  - [auth.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/auth.js:56) 旧逻辑仅判断字符串是否 truthy，`"   "` 会被当作有效密码
  - 新增回归测试：
    - [auth-account-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/auth-account-validation.test.js:94)
- 冲突点：
  - `newPassword` 全空格在语义上应视为无效输入
  - 旧逻辑会将其直接 `bcrypt.hash` 后写入，且可与用户名变更组合触发部分生效风险
- 影响：
  - 账号密码可能被误改为全空格（移动端误输入或粘贴污染更易触发）
  - 变更结果与用户预期严重偏离，存在账号锁定/误报故障风险
- 修复：
  - 当请求显式提供 `newPassword` 且 `trim()` 后为空时，返回 `400/invalid_password`
  - 拒绝整笔请求，避免用户名/密码出现半成功状态

### [P2][已修复] 管理端账号设置页未前置拦截空白用户名/密码，且缺少字段级错误映射

- 证据：
  - [AdminAccountView.vue](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/views/admin/AdminAccountView.vue:41) 旧提交流程未单独拦截“全空格新用户名/新密码”
  - [AdminAccountView.vue](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/views/admin/AdminAccountView.vue:78) 旧异常处理未识别 `invalid_username/invalid_password`
  - 新增回归测试：
    - [admin-account-validation-guards.test.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/test/admin-account-validation-guards.test.ts:9)
- 冲突点：
  - 后端已返回明确字段错误码，但前端会退化成通用“更新失败”
  - 用户难以定位具体输入问题，交互反馈粒度不足
- 影响：
  - 在移动端输入场景下更容易因空白字符触发提交失败
  - 错误反馈不精确，增加重复操作和支持成本
- 修复：
  - 前端提交前新增空白新用户名/新密码拦截
  - 捕获并映射 `invalid_username/invalid_password` 到对应字段错误文案

### [P1][已修复] 资源库更新接口接受空 payload 并返回成功，导致无效写入与 `updatedAt` 漂移

- 证据：
  - [folderRoutes.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/library/folderRoutes.js:68) 旧 `PUT /api/library/folders/:id` 未拦截空 body
  - [assetRoutes.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/library/assetRoutes.js:84) 旧 `PUT /api/library/assets/:id` 未拦截空 body
  - [embedProfileRoutes.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/library/embedProfileRoutes.js:49) 旧 `PUT /api/library/embed-profiles/:id` 未拦截空 body
  - 新增回归测试：
    - [library-update-no-changes.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-update-no-changes.test.js:97)
- 冲突点：
  - 其它写接口（如 `PUT /api/items/:id`、`POST /api/auth/account`）对空变更返回 `400/no_changes`
  - 资源库三个更新接口却会把空请求当作成功处理，并触发 `updatedAt` 更新
- 影响：
  - 客户端误发空补丁时会得到“更新成功”假象，掩盖真实交互缺陷
  - 无业务变化也会产生写入与时间戳漂移，增加审计与排障噪音
- 修复：
  - 在三个 `PUT` 路由统一增加空补丁守卫，返回 `400/no_changes`
  - 通过回归测试验证空补丁请求被拒绝，且目标实体 `updatedAt` 不发生变化

### [P2][已修复] 移动端高频交互控件触控高度仅 40px，低于推荐可达性阈值

- 证据：
  - [touch-audit-se.json](/Users/lvxiaoer/Documents/physicsAnimations/output/mobile-audit/touch-audit-se.json:1) 记录 SE 宽度下大量控件命中 `tooSmall`（32-36px）
  - [styles.css](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/styles.css:102) 旧全局按钮/输入最小高度为 `40px`
  - 新增/更新回归测试：
    - [mobile-touch-targets.test.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/test/mobile-touch-targets.test.ts:9)
- 冲突点：
  - 移动端审计脚本按可达性标准将 `<44px` 触控目标标记为风险
  - 首页导航、筛选标签、登录输入等高频操作仍使用 `40px` 规格
- 影响：
  - 小屏设备单手点击误触率更高，操作成本上升
  - 在课堂快速操作场景下，筛选和登录流程可用性下降
- 修复：
  - 将高频控件最小触控高度统一提升到 `44px`（全局按钮/输入 + Catalog + Admin Library + Taxonomy + Viewer + System Wizard）
  - 前端回归测试同步升级到 `44px` 基线，防止后续回退

### [P3][已修复] `LoginView` 重复定义全局基础样式，导致移动端规则易漂移

- 证据：
  - [LoginView.vue](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/views/LoginView.vue:95) 旧实现在页面内重复定义 `.field/.field-input/.btn`
  - [styles.css](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/styles.css:95) 全局已提供同名基础样式
  - 新增回归测试：
    - [login-flow-consistency.test.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/test/login-flow-consistency.test.ts:55)
- 冲突点：
  - 同一语义样式在“全局 + 单页”双处维护
  - 触控高度、字体缩放等可达性修复需要双点同步，容易漏改
- 影响：
  - 产生样式漂移风险（尤其在移动端可达性规则迭代时）
  - 增加维护成本和回归噪音
- 修复：
  - 移除 `LoginView` 内重复基础样式声明，统一复用全局 `.field/.field-input/.btn`
  - 测试门禁新增“禁止在 `LoginView` 重新定义这些基础样式”

### [P1][已修复] `builtin` 条目更新会吞掉空白标题并继续写入其它字段，导致部分生效

- 证据：
  - [writeService.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/items/writeService.js:52) 旧 `builtin` 分支将空白标题视为“清空 override”，不会报错
  - 新增回归测试：
    - [items-write-service.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/items-write-service.test.js:127)
- 冲突点：
  - `dynamic` 条目分支对空白标题返回 `400/invalid_title`
  - `builtin` 条目分支却会继续应用同请求中的其它字段（如 `description`），形成同接口语义分叉
- 影响：
  - 前端同一编辑操作在不同条目类型下表现不一致
  - 可能出现“标题失败但其它字段已生效”的认知错位
- 修复：
  - 在 `builtin` 更新路径统一对 `title` 执行非空校验，空白标题直接返回 `400/invalid_title`
  - 阻断同请求其它字段写入，保证校验失败零副作用

### [P2][已修复] 内容编辑页缺少空标题前置拦截与字段级错误反馈

- 证据：
  - [useContentAdminActions.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/features/admin/content/useContentAdminActions.ts:101) 旧逻辑直接提交 `editTitle.trim()`
  - [ContentEditPanel.vue](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/views/admin/content/ContentEditPanel.vue:52) 旧界面无标题字段错误渲染
  - 新增回归测试：
    - [admin-content-validation-guards.test.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/test/admin-content-validation-guards.test.ts:9)
- 冲突点：
  - 后端已返回 `invalid_title`
  - 前端仅显示通用“保存失败”，用户无法定位具体字段问题
- 影响：
  - 移动端输入场景下误删标题空格后更容易反复提交失败
  - 反馈粒度不足，增加无效重试与支持成本
- 修复：
  - 提交前新增空标题拦截（字段错误 + 行为提示）
  - 捕获 `invalid_title` 并映射到 `editTitle` 字段错误
  - 编辑面板增加标题错误渲染，并在输入变更时清理字段错误

### [P1][已修复] 自定义 Embed Viewer 将未转义 JSON 直写进 `<script>`，可被 `</script>` 断逃注入

- 证据：
  - [viewerRenderService.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/viewerRenderService.js:48) 旧逻辑直接使用 `JSON.stringify(runtimeOptions)` 注入内联脚本
  - 新增回归测试：
    - [library-viewer-render-escape.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-viewer-render-escape.test.js:4)
- 冲突点：
  - 资源库允许管理员配置 `embedOptions/defaultOptions` JSON
  - 当字符串值包含 `</script><script>...` 时，浏览器会提前结束当前脚本块并执行注入脚本
- 影响：
  - 生成的 `viewer/index.html` 存在脚本注入面
  - 资产预览页可能执行非预期脚本，影响管理端与课堂端访问安全
- 修复：
  - 新增 `serializeForInlineScript`，对内联脚本 JSON 输出统一做 `< > & U+2028/U+2029` 转义
  - `ctorName/scriptSources/options/assetFileUrl` 全部改为安全序列化输出
  - 回归测试验证原始 payload 不会再出现在 HTML 中

### [P1][已修复] WebDAV 全量同步会上传隐藏目录内容，导致本地私有文件泄漏风险

- 证据：
  - [fileUtils.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/fileUtils.js:50) 旧 `shouldSkip` 仅按 `basename` 判断隐藏文件
  - 新增回归测试：
    - [webdav-sync-skip-hidden-dirs.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-sync-skip-hidden-dirs.test.js:29)
- 冲突点：
  - 同步策略本意是忽略隐藏内容（例如 `.jwt_secret`、点文件）
  - 但 `content/.cache/secret.json` 这类“隐藏目录下普通文件”会被错误上传
- 影响：
  - 远端 WebDAV 可能持久化本地缓存/私有工件
  - 在跨设备同步场景中扩大敏感数据暴露面
- 修复：
  - `shouldSkip` 改为检查完整路径段：任一隐藏段均跳过，唯一白名单为 `.well-known`
  - 保留 sqlite 缓存文件与显式敏感文件跳过规则

### [P1][已修复] WebDAV 分类/分组合并忽略 `updatedAt`，会覆盖远端较新配置

- 证据：
  - [stateMerge.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/stateMerge.js:73) 旧 `mergeCategories` 冲突时固定本地优先
  - 新增回归测试：
    - [webdav-state-merge.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-state-merge.test.js:124)
- 冲突点：
  - `builtin_items` 与 `items` 冲突合并已按时间戳比较
  - `categories/groups` 却无视 `updatedAt`，与同模块其余合并策略不一致
- 影响：
  - 多端并发编辑分类/分组时，晚到但更新的远端改动会被本地旧值覆盖
  - 管理端分类树表现出“同步后回退”的错觉
- 修复：
  - `mergeCategories` 对同 ID 配置改为按 `updatedAt` 选较新项
  - 时间戳相同保持本地优先，维持确定性

### [P2][已修复] WebDAV 远端扫描会导入缺失入口文件的上传项，生成失效路径

- 证据：
  - [remoteScan.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/remoteScan.js:20) 旧逻辑即使 `manifest.entry` 对应文件不存在也会继续导入
  - 新增回归测试：
    - [webdav-remote-scan-entry-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-remote-scan-entry-validation.test.js:6)
- 冲突点：
  - 本地上传流程保证 `manifest.entry` 为可读 HTML 入口
  - 远端扫描路径未做同等校验，异常/损坏 manifest 会被当成有效内容并落库
- 影响：
  - 同步后出现 `path` 指向不存在文件的动态资源
  - 前端预览/访问时触发 404 或空白页，造成“已同步但不可用”的体验冲突
- 修复：
  - 远端扫描新增入口校验：`entry` 必须为 `.html/.htm`
  - 必须成功读取入口文件后才导入该上传项，否则跳过并等待后续同步重试

### [P1][已修复] `stateDb` 写透失败后会优先读镜像旧值，导致查询返回陈旧数据

- 证据：
  - [storeFactory.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/stateDb/storeFactory.js:85) 旧 `ensureDynamicItemsIndexed` 优先读取 `mirror.readBuffer(items.json)`
  - 新增回归测试：
    - [state-db-dynamic-index-stale-fallback.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/state-db-dynamic-index-stale-fallback.test.js:57)
- 冲突点：
  - `wrappedStore.writeBuffer(items.json)` 在镜像写失败时会将索引标记为 dirty
  - 重新建索引却先读镜像缓存，命中旧值后不再读取源 store，形成“写入成功但查询仍旧”的语义冲突
- 影响：
  - `stateDbQuery.queryItems` 可能长期返回旧数据，直到镜像缓存被其它路径刷新
  - 造成管理端列表与真实 `items.json` 状态不一致
- 修复：
  - 动态与 builtin 索引重建统一改为“优先读取源 store，再尝试回写镜像；源缺失时才回退镜像”
  - 镜像写透失败改为 best-effort，不阻断基于源数据的索引构建

### [P1][已修复] `stateDb` 在源状态文件缺失时会回退镜像缓存，导致“幽灵数据”复活

- 证据：
  - [storeFactory.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/stateDb/storeFactory.js:98) 旧逻辑在 `store.readBuffer("items.json")` 返回 `null` 时仍会读取 `mirror.readBuffer`
  - [wrappedStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/stateDb/wrappedStore.js:52) 旧读路径也会优先返回镜像缓存
  - 新增回归测试：
    - [state-db-dynamic-index-stale-fallback.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/state-db-dynamic-index-stale-fallback.test.js:164)
    - [state-db-wrapped-store.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/state-db-wrapped-store.test.js:159)
- 冲突点：
  - 对本地/混合模式，源 store 是事实来源；`null` 应表示“无该状态文件”
  - 旧实现把 `null` 当作“可用镜像兜底”条件，导致已删除或缺失数据被镜像旧值重建
- 影响：
  - `queryItems` 可能返回已不存在的条目（ghost rows）
  - 非 SQL 路径直接读 `items.json` 也可能拿到过期快照
- 修复：
  - `wrappedStore.readBuffer` 改为源优先，只有源读取抛错时才允许镜像兜底
  - `ensureDynamicItemsIndexed/ensureBuiltinItemsIndexed` 仅在源读取失败（异常）时回退镜像，不再在源 `null` 时回退

### [P1][已修复] Library Viewer/Adapter 将 `title` 未转义直写 HTML，存在标签注入风险

- 证据：
  - [viewerRenderService.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/viewerRenderService.js:43) 旧 `buildCustomEmbedHtml` 直接插入 `<title>${title}</title>`
  - [phet.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/adapters/phet.js:26) 旧实现直接插入 `<title>` 与 `iframe title=""`
  - [geogebra.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/adapters/geogebra.js:100) 旧实现直接插入 `<title>`
  - 新增回归测试：
    - [library-viewer-render-escape.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-viewer-render-escape.test.js:24)
    - [library-phet-adapter.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-phet-adapter.test.js:54)
    - [library-geogebra-adapter.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-geogebra-adapter.test.js:88)
- 冲突点：
  - 运行时选项已做内联脚本安全序列化
  - 但同一页面的 `title` 渲染链路未做 HTML 转义，形成旁路注入面
- 影响：
  - 恶意标题（例如 `</title><script>...`）可打断文档头部结构并注入标签
  - 影响资产预览页安全边界，属于高风险展示层注入
- 修复：
  - 在 `custom viewer`、`PhET adapter`、`GeoGebra adapter` 统一引入 `escapeHtml`
  - `title`（以及 PhET 的 `src/title` 属性）改为转义后输出

### [P1][已修复] GeoGebra Adapter 内联脚本仍可被 `scriptUrl` 中的 `</script>` 断逃注入

- 证据：
  - [geogebra.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/adapters/geogebra.js:157) 旧逻辑将 `scriptSources` 通过 `JSON.stringify` 直接拼接到内联 `<script>`
  - 新增回归测试：
    - [library-geogebra-adapter.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-geogebra-adapter.test.js:105)
- 冲突点：
  - 自定义 viewer 已对内联 JSON 做 `<` 等字符安全序列化
  - GeoGebra adapter 仍沿用未转义输出，形成同类注入面
- 影响：
  - 当 `selfHostedScriptUrl`/fallback 配置异常含恶意片段时，可打断脚本上下文并执行注入脚本
  - 影响演示页安全隔离，属于高风险渲染链路问题
- 修复：
  - 为 GeoGebra adapter 引入 `serializeForInlineScript`
  - `appletConfig/scriptSources/assetFileUrl` 统一改为安全序列化输出

### [P1][已修复] WebDAV 远端扫描会复活 tombstone 已删除资源，破坏删除语义

- 证据：
  - [webdavSync.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync.js:53) 旧扫描导入后会清理同 ID tombstone
  - [remoteScan.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/remoteScan.js:13) 旧扫描逻辑未跳过 tombstone ID
  - 新增回归测试：
    - [webdav-remote-scan-tombstone-guard.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-remote-scan-tombstone-guard.test.js:30)
- 冲突点：
  - `mergeItemsAndTombstones` 以 tombstone 保证删除在多端同步中的最终一致性
  - `scanRemote` 却会把远端残留目录重新导入，并主动删除 tombstone，形成语义逆转
- 影响：
  - 被删除的上传资源可能在下一次同步后“复活”
  - 管理端删除操作与同步结果不一致，造成数据可信度下降
- 修复：
  - `scanRemoteUploads` 新增 `tombstoneIds` 守卫，跳过 tombstone 已标记 ID
  - 移除“导入后删除 tombstone”的路径，保持删除语义优先级

### [P1][已修复] WebDAV Store 未拦截百分号编码的父目录段，存在路径穿越键旁路

- 证据：
  - [webdavStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/contentStore/webdavStore.js:48) 旧 `normalizeStorageKey` 仅拦截明文 `.`/`..`，未校验 `decodeURIComponent(part)` 结果
  - 新增回归测试：
    - [webdav-store-timeout.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-store-timeout.test.js:85)
- 冲突点：
  - Local store 已对路径穿越段有严格拦截
  - WebDAV store 对 `%2e%2e` 这类编码段放行，导致跨存储策略安全边界不一致
- 影响：
  - 攻击者可构造编码路径段尝试越界访问远端 WebDAV 路径
  - 在代理/中间件存在解码归一化时，可能触发路径语义偏移
- 修复：
  - `normalizeStorageKey` 增加“解码后段校验”
  - 拦截 `decodeURIComponent(part)` 为 `.`/`..`、含 `/` 或 `\\` 的危险段，并对非法编码直接判定无效键

### [P1][已修复] WebDAV Store 允许 `?/#` 出现在存储键中，导致路径语义漂移

- 证据：
  - [webdavStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/contentStore/webdavStore.js:64) 旧键校验未拦截 `?` / `#`
  - 新增回归测试：
    - [webdav-store-timeout.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-store-timeout.test.js:106)
- 冲突点：
  - 存储键语义应表示“纯路径段”
  - `new URL(rel, base)` 会把 `?/#` 解释为 query/fragment，导致键名与实际请求路径不一致
- 影响：
  - 同一逻辑键可能落到错误远端资源路径，产生读写错位
  - 在边界情况下可被用作 URL 语义注入，放大调试与审计复杂度
- 修复：
  - `normalizeStorageKey` 增加 `?/#` 拦截（raw 与 decode 后双重校验）
  - 对含 query/fragment 标记的键统一返回 `invalid_storage_key`

### [P1][已修复] ZIP 风险上传在确认前先写存储，形成“先落盘后拒绝”的时序冲突

- 证据：
  - [uploadZipIngest.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/items/uploadZipIngest.js:128) 旧流程在风险检查前即调用 `writeUploadBuffer`
  - 新增回归测试：
    - [items-upload-zip-total-bytes.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/items-upload-zip-total-bytes.test.js:75)
- 冲突点：
  - HTML 单文件上传会先进行风险判定，再决定是否写入
  - ZIP 上传旧逻辑先写后判定，依赖调用方 `catch` 清理，语义与 HTML 路径不一致
- 影响：
  - 当存储清理失败（网络抖动/远端异常）时，未确认的高风险内容可能残留
  - 增加“拒绝响应但存储侧已有痕迹”的运维排障复杂度
- 修复：
  - ZIP 上传改为两阶段：先解压+扫描风险并缓存待写列表，再批量写入存储
  - 未确认风险场景在写入前直接返回 `risky_html_requires_confirmation`

### [P2][已修复] 前端 Library 映射层会把异常数值映射为 `NaN`，污染管理端状态

- 证据：
  - [libraryApiMappers.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/features/library/libraryApiMappers.ts:4) 旧实现直接 `Number(value?.order || 0)` / `Number(value?.fileSize || 0)`
  - 新增回归测试：
    - [library-api-mappers-robustness.test.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/test/library-api-mappers-robustness.test.ts:1)
- 冲突点：
  - 映射层承担“后端异常值清洗”职责
  - 旧实现在 `order/fileSize/assetCount` 遇到非空非数字字符串时返回 `NaN`，与 UI 期望的 number 语义冲突
- 影响：
  - 可能导致排序、计数显示、条件判断出现异常（例如 `NaN` 比较恒为 false）
  - `parentId` 透传非字符串值时，会破坏前端类型假设
- 修复：
  - 增加 `toFiniteNumber` 兜底，保证数值字段无效时回退到 `0`
  - `parentId` 统一归一为 `string|null`，避免跨层类型漂移

### [P1][已修复] `stateDb` 的 `createReadStream(items.json)` 仍优先镜像缓存，可能返回陈旧状态

- 证据：
  - [wrappedStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/stateDb/wrappedStore.js:208) 旧 `createReadStream` 对状态文件先读 `mirror.readBuffer`，命中即直接返回
  - 新增回归测试：
    - [state-db-wrapped-store.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/state-db-wrapped-store.test.js:210)
- 冲突点：
  - `readBuffer(items.json)` 已修复为“源 store 优先，镜像仅在源读取异常时兜底”
  - `createReadStream(items.json)` 仍走“镜像优先”，同一状态对象出现两套读取语义
- 影响：
  - 通过流式读取状态文件的路径可能读到旧快照，和 `readBuffer` 结果不一致
  - 在备份/导出或后续扩展到状态流读取场景时，会引入隐式一致性风险
- 修复：
  - `createReadStream` 状态分支改为复用 `readBuffer`（源优先）再封装 `Readable.from`
  - 保持单一读取语义，消除镜像优先旁路

### [P1][已修复] Library JSON 选项归一化存在原型污染入口（`__proto__`/`constructor`）

- 证据：
  - [normalizers.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/core/normalizers.js:36) 旧 `sanitizeJsonValue` 直接写入对象键，未过滤危险键名
  - 新增回归测试：
    - [library-normalizers-security.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-normalizers-security.test.js:1)
- 冲突点：
  - `normalizeJsonObject` 目标是把外部 JSON（Embed 默认参数/覆盖参数）清洗为安全对象
  - 旧实现对 `__proto__` 等键会触发对象原型链变更，违背“只做值清洗、不改变对象语义”的约束
- 影响：
  - 归一化结果对象可能携带被污染的原型属性，导致后续属性读取出现隐式脏数据
  - 在多处复用该对象（viewer 渲染、资产更新）时放大不可预测行为与安全风险
- 修复：
  - 引入危险键黑名单：`__proto__` / `prototype` / `constructor`
  - 在对象递归清洗阶段统一跳过上述键，阻断原型污染路径

### [P1][已修复] State 解析器对 map key 未过滤，`__proto__` 可污染 `groups/items/tombstones`

- 证据：
  - [parsers.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/state/parsers.js:69) 旧实现将 JSON key 直接写入普通对象
  - 新增回归测试：
    - [state-parsers-security.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/state-parsers-security.test.js:1)
- 冲突点：
  - 解析器职责是“容错+规范化”状态文件，不应让特殊键改变结果对象原型
  - 旧实现在 `parseCategoriesState/parseBuiltinItemsState/parseItemTombstonesState` 三条路径共享同类风险
- 影响：
  - `groups/categories/items/tombstones` 返回对象可能带污染原型，导致读取统计和合并逻辑出现隐式脏字段
  - 在同步与状态持久化链路中可能放大为跨模块语义污染
- 修复：
  - 增加统一安全键校验，屏蔽 `__proto__` / `prototype` / `constructor`
  - 所有对象 map 解析路径统一复用该校验，阻断原型污染入口

### [P1][已修复] Library State 正规化对 `embedOptions/defaultOptions` 未过滤危险键，存在原型污染旁路

- 证据：
  - [libraryState normalizers](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/libraryState/normalizers.js:24) 旧 `sanitizeJsonValue` 未过滤 `__proto__/prototype/constructor`
  - 新增回归测试：
    - [library-state.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-state.test.js:165)
- 冲突点：
  - `services/library/core/normalizers` 已补齐危险键过滤
  - `lib/libraryState/normalizers` 仍保留旧实现，导致“同类 JSON 清洗逻辑在不同层行为不一致”
- 影响：
  - 通过状态文件加载的 `embedOptions/defaultOptions` 可携带污染原型
  - 与运行时参数合并、渲染配置生成链路叠加时，会出现隐式脏属性风险
- 修复：
  - `libraryState` 清洗链路引入同样的危险键黑名单
  - 对 JSON option 字段递归清洗时统一跳过危险键，保持与服务层策略一致

### [P1][已修复] Catalog 聚合链路对 `categoryId="__proto__"` 崩溃，且分类映射存在原型污染风险

- 证据：
  - [catalog.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/catalog.js:61) 旧路径在 `ensureCategory(categories, { id: item.categoryId })` 中对普通对象 map 使用危险键
  - [helpers.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/catalog/helpers.js:40) 旧 `ensureCategory` 通过 `categories[id]` 判断存在性，`id="__proto__"` 会命中原型链对象
  - 新增回归测试：
    - [catalog-security-category-id.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/catalog-security-category-id.test.js:1)
- 冲突点：
  - `itemModel.normalizeCategoryId` 旧实现允许危险键透传（仅做 trim）
  - `catalog/builtinLoader`、`catalog` 聚合层都以普通对象承担 ID->实体映射，遇到危险键会触发对象语义漂移
- 影响：
  - 动态条目可触发 `TypeError`（`category.items.push` 读到非预期对象）
  - 在分类/分组 map 中可形成原型污染旁路，导致聚合结果不稳定
- 修复：
  - `catalog`/`builtinLoader` 的分类分组 map 统一改为 `Object.create(null)`
  - `helpers.ensureCategory` 增加危险键归一化（`__proto__/prototype/constructor` -> 安全回退）
  - `itemModel.normalizeCategoryId` 同步拦截危险分类 ID，阻断新写入脏数据
  - 动态输出条目的 `categoryId` 统一回写为归一化后的桶 ID，消除输出语义漂移

### [P1][已修复] SQL 分类计数路径对危险分类键未做防护，可能崩溃或污染汇总结果

- 证据：
  - [queryRunner.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/stateDb/sqliteMirror/queryRunner.js:264) 旧 `byCategory = {}` 直接 `byCategory[categoryId] = ...`
  - [categoriesPayload.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/categoriesPayload.js:45) 旧 `normalizeDynamicCountMap` 同样对普通对象写入外部键
  - 新增回归测试：
    - [state-db-sqlite-mirror.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/state-db-sqlite-mirror.test.js:34)
    - [categories-query-repo-port.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/categories-query-repo-port.test.js:8)
- 冲突点：
  - 分类计数来自动态条目 category_id 聚合，理论上会承接历史脏数据
  - `__proto__` 等键在普通对象上属于高风险键，会引发原型语义冲突
- 影响：
  - 可能出现计数构建阶段抛错（写入 `__proto__` 触发异常）导致 `/api/categories` 失败
  - 计数 map 被污染后，后续分类补齐逻辑可能产生不可预期分类结果
- 修复：
  - `queryDynamicCategoryCounts` 改为 null-prototype map 并归一化危险键到 `other`
  - `categoriesPayload` 的 dynamicCountMap、groups/categories 构建链路统一使用 null-prototype map
  - 补齐 category/group ID 归一化，保证计数补齐路径与 catalog 主链路一致

### [P1][已修复] WebDAV 状态合并对 map key 未做安全过滤，`__proto__` 可导致合并数据丢失与原型污染

- 证据：
  - [stateMerge.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/stateMerge.js:36) 旧 `mergeBuiltinItems/mergeCategories/mergeItemsAndTombstones` 使用普通对象承载外部 ID 映射
  - 复现：远端 JSON 含 `\"__proto__\"` 键时，合并结果对象会把该值写入原型链，`JSON.stringify` 后条目消失
  - 新增回归测试：
    - [webdav-state-merge.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-state-merge.test.js:118)
    - [webdav-state-merge.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-state-merge.test.js:133)
- 冲突点：
  - `state/parsers` 已对状态 map key 做危险键过滤
  - WebDAV 远端合并链路仍直接信任 map key，跨模块安全策略不一致
- 影响：
  - 远端污染键可能导致 builtin/category/tombstone 合并条目被“隐式吞掉”
  - 合并对象语义漂移后，会放大为后续同步状态不一致与调试困难
- 修复：
  - 新增统一 `isSafeMapKey`/`sanitizeObjectMap`，屏蔽 `__proto__/prototype/constructor`
  - 合并中间 map 全部改为 null-prototype（`Object.create(null)`）
  - 保持已有冲突判定规则不变，仅修复键安全与对象语义

### [P1][已修复] 分类/分组路由对保留键 ID 缺少显式拦截，存在原型链误判与状态写入冲突

- 证据：
  - [categories.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/categories.js:99) 旧代码使用 `state.categories[id]` 判定存在性
  - [groups.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/groups.js:79) 旧代码使用 `state.groups?.[id]` 判定存在性
  - `constructor/prototype` 等键可通过旧正则校验，触发“继承属性被当作真实记录”的误判
  - 新增回归测试：
    - [taxonomy-title-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/taxonomy-title-validation.test.js:113)
- 冲突点：
  - 状态 map 使用普通对象，直接索引会读到原型链属性
  - 路由层 ID 校验仅做格式限制，未对危险保留键做语义拦截
- 影响：
  - 创建接口可能把保留键错误判定为 `already_exists`
  - 更新/删除接口在边界情况下可能误操作原型链属性，造成不可预期行为
- 修复：
  - 分类/分组 ID schema 增加保留键拦截（`__proto__/prototype/constructor`）
  - 所有存在性检查统一改为 `hasOwnProperty.call(...)`
  - 保持接口返回语义一致：非法保留键统一返回 `invalid_input`

### [P2][已修复] StateDB 镜像解析器对危险 map key/分类 ID 缺少归一化，存在脏数据透传与对象语义漂移风险

- 证据：
  - [mirrorHelpers.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/stateDb/mirrorHelpers.js:67) 旧 `parseBuiltinOverridesFromBuffer` 使用普通对象承接外部 key
  - [mirrorHelpers.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/stateDb/mirrorHelpers.js:27) 旧 `parseDynamicItemsFromBuffer` 对 `categoryId` 仅做字符串透传
  - 新增回归测试：
    - [state-db-mirror-helpers-security.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/state-db-mirror-helpers-security.test.js:1)
- 冲突点：
  - 运行态 `catalog/query` 路径已逐步对危险分类键做防护
  - SQLite 镜像入库前解析仍可把危险键与危险分类 ID 带入中间层
- 影响：
  - 在边界输入下可能出现解析 map 原型语义异常
  - 危险分类 ID 会在镜像链路中继续传播，增加后续聚合路径负担
- 修复：
  - 解析器新增 `isSafeMapKey`，屏蔽 `__proto__/prototype/constructor`
  - override map 改为 null-prototype 对象，避免继承属性干扰
  - 动态项与内建项分类 ID 统一归一化到安全值（危险键回退 `other`）

### [P1][已修复] Logger 允许元数据覆盖 `ts/level/msg`，可导致日志伪造与事件语义漂移

- 证据：
  - [logger.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/logger.js:75) 旧日志组装顺序为 `{ ts, level, msg, ...normalizeMeta(meta) }`
  - 旧 `logger.error(msg, errObj)` 会把普通对象 `errObj` 扁平展开到顶层（含 `msg/level/ts`）
  - 复现可让输出日志行出现伪造 `msg/level/ts`
  - 新增回归测试：
    - [logger-behavior.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/logger-behavior.test.js:87)
    - [logger-behavior.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/logger-behavior.test.js:116)
- 冲突点：
  - 日志系统应保证 `ts/level/msg/requestId` 由 logger 核心生成，不能被业务 payload 覆盖
  - 普通对象错误与 Error 对象在旧实现中的序列化策略不一致（前者顶层展开，后者挂 `error`）
- 影响：
  - 可构造“看似合法但语义被篡改”的日志，影响告警、审计和排障
  - 结构化日志消费者可能按伪造字段做错误分级或时间归档
- 修复：
  - 保留字段黑名单：`ts/level/msg/requestId`，在 `normalizeMeta` 中忽略
  - 日志组装改为先展开 meta，再由核心字段覆盖，保证核心字段不可被污染
  - `logger.error` 对非 Error 值统一收敛到 `error` 字段，取消顶层扁平展开

### [P1][已修复] WebDAV 同步会对状态文件做“二次目录镜像上传”，本地写失败时可把远端新状态回滚为旧状态

- 证据：
  - [webdavSync.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync.js:78) 旧流程先将合并后的 `items/categories/builtin_items/items_tombstones` 写远端
  - 随后 `walkFiles(contentDir)` 会再次上传整个 `content/`，旧实现未排除上述状态文件
  - 新增回归测试：
    - [webdav-sync-state-file-overwrite-guard.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-sync-state-file-overwrite-guard.test.js:1)
- 冲突点：
  - 状态文件在同步中本应由“合并结果”唯一来源写入远端
  - 目录镜像阶段再次上传状态文件，形成双写路径，且两路径的数据来源可能不一致
- 影响：
  - 当本地状态文件写入失败（只读文件/权限问题）时，目录镜像会把本地旧文件重新上传到远端
  - 可导致远端已合并的新状态被旧状态覆盖，产生隐蔽的数据回滚
- 修复：
  - 增加 `stateFileKeys` 白名单，目录镜像阶段跳过 4 个状态文件
  - 统一状态文件远端写入路径为“合并输出直写”，消除双写冲突

### [P2][已修复] Local Store 与 WebDAV Store 键校验规则不一致，`?/#` 键名在 hybrid 下会产生隐式分叉

- 证据：
  - [localStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/contentStore/localStore.js:10) 旧本地键校验允许 `?/#`
  - [webdavStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/contentStore/webdavStore.js:51) 已明确拦截 `?/#`
  - 新增回归测试：
    - [content-store-key-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/content-store-key-validation.test.js:26)
- 冲突点：
  - 同一逻辑键在 local 与 webdav 的合法性定义不一致
  - hybrid 写路径为“先 local 后镜像 webdav”，若 local 接受但 webdav 拒绝，会落入“本地成功、远端失败”的隐式分叉
- 影响：
  - 内容状态在 hybrid 模式下可能悄然不一致
  - 运维侧只看到 `webdav_mirror_failed` 警告，但业务数据已经在本地落盘
- 修复：
  - local/readOnly local 键校验补齐 `?/#`（raw + decode 后）拦截
  - 与 webdav store 保持同一套存储键语义，消除跨后端行为漂移

### [P3][已清理] `normalizeZipPath` 在 Upload/Screenshot 服务重复实现，存在后续规则漂移风险（无行为变更）

- 证据：
  - [screenshotService.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/items/screenshotService.js:20) 旧实现内置一份 `normalizeZipPath`
  - [uploadIngestUtils.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/items/uploadIngestUtils.js:38) 已有同名工具函数
- 冲突点：
  - 两处逻辑等价但维护点分叉，后续修规则时容易只改一处
  - 安全规则（路径标准化/穿越拦截）属于应保持单一事实源的基础约束
- 影响：
  - 当前无直接线上缺陷，但存在“未来修一处漏一处”的回归风险
- 清理：
  - `screenshotService` 直接复用 `uploadIngestUtils.normalizeZipPath`
  - 移除重复实现，不改变现有行为和接口

### [P2][已修复] 远端上传扫描对目录名与 manifest 读取异常缺少隔离，单个异常目录可污染导入结果或中断整轮扫描

- 证据：
  - [remoteScan.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/remoteScan.js:5) 旧实现仅检查 `id.startsWith("u_")`，未拦截 `id` 中的 `/` 或 `\\`
  - [remoteScan.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/remoteScan.js:16) 旧 `manifest.json` 读取未做单条 `try/catch`，读取异常会直接抛出
  - 新增回归测试：
    - [webdav-remote-scan-entry-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-remote-scan-entry-validation.test.js:69)
    - [webdav-remote-scan-entry-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-remote-scan-entry-validation.test.js:133)
- 冲突点：
  - 扫描器把远端目录名直接拼接到 `items.id` 与 `content/uploads/<id>/...` 路径，缺少最小安全约束
  - 远端扫描属于“批处理容错”流程，单条目录失败不应导致全量扫描退出
- 影响：
  - 异常目录名可被错误导入，生成非法 item id/path（后续路由与渲染语义漂移）
  - 任一目录 `manifest.json` 读取失败时，整轮扫描会被中断，导致其它合法目录无法导入
- 修复：
  - 增加 `isSafeUploadDirName`：仅接受 `u_` 前缀且不包含 `/`、`\\` 的目录名
  - `manifest.json` 读取失败改为单条跳过，继续处理后续目录
  - 保持既有导入字段与排序策略不变，仅补齐边界防护与容错

### [P2][已修复] 系统存储接口对非法 `mode` 静默忽略并返回 200，导致调用方状态认知错误

- 证据：
  - [system.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/system.js:102) 旧逻辑将 `mode` 通过 `normalizeMode` 归一化后，仅在合法值时写入；非法值被忽略但请求仍成功
  - 新增回归测试：
    - [system-state.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/system-state.test.js:192)
  - 复现结果：`POST /api/system/storage` 传 `mode: "not-a-real-mode"` 返回 `200`，未显式报错
- 冲突点：
  - API 的“部分更新”语义与“输入非法”语义被混淆：`mode` 缺失和 `mode` 非法都走成功路径
  - 调用方无法区分“未修改”与“成功切换”，易产生控制面板状态误判
- 影响：
  - 管理端或自动化脚本可能误以为模式切换成功
  - 后续调试会出现“请求成功但存储模式未变化”的隐蔽一致性问题
- 修复：
  - 新增显式校验：仅当请求包含非空 `mode` 且归一化失败时，返回 `400 invalid_storage_mode`
  - 保持 `mode` 缺失时的部分更新行为不变（仍可只更新 `webdav` 配置）

### [P2][已修复] 远端扫描未统一 `entry` 路径分隔符，Windows 风格 `\\` 会写入异常 item.path

- 证据：
  - [fileUtils.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/fileUtils.js:98) 旧 `normalizeRemotePath` 未先把 `\\` 归一化为 `/`
  - [remoteScan.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/remoteScan.js:52) 导入项直接使用 `entryRel` 组装 `path`
  - 新增回归测试：
    - [webdav-remote-scan-entry-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-remote-scan-entry-validation.test.js:172)
- 冲突点：
  - 本地 zip 上传链路已统一使用 POSIX `/` 路径
  - 远端扫描链路对 Windows 风格路径未归一化，导致状态中路径语义不一致
- 影响：
  - 导入后的 `item.path` 可出现 `content/uploads/<id>/nested\\index.html`
  - 后续渲染/拼接 URL 时路径风格不一致，增加跨平台兼容风险
- 修复：
  - `normalizeRemotePath` 增加 `\\ -> /` 预归一化，再执行 `path.posix.normalize`
  - 保持其余路径安全规则不变（去前导 `/`、阻断 `..` 穿越）

### [P3][已修复] 远端扫描对 `createdAt` 使用 truthy 判定，合法 Epoch 时间会被误替换为当前时间

- 证据：
  - [remoteScan.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/remoteScan.js:57) 旧逻辑用 `toTimeMs(manifest.createdAt)` 作为真假判断
  - `1970-01-01T00:00:00.000Z` 对应毫秒值 `0`，被误判为“无效时间”
  - 新增回归测试：
    - [webdav-remote-scan-entry-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-remote-scan-entry-validation.test.js:205)
- 冲突点：
  - 时间有效性判定不应依赖数值 truthy/falsy
  - `0` 是合法时间戳，但旧逻辑把它与“解析失败”混为一类
- 影响：
  - 远端历史上传在导入时会丢失原始 `createdAt`
  - 依赖创建时间排序/审计的场景会出现非预期漂移
- 修复：
  - 增加 `isValidTimestamp`（基于 `Date.parse` + `Number.isFinite`）做显式有效性判定
  - 有效时保留原始 `createdAt`（trim 后），无效时才回退到 `new Date().toISOString()`

### [P2][已修复] 状态合并对 tombstone 时间使用 truthy 判定，Epoch 删除记录会失效并导致条目复活

- 证据：
  - [stateMerge.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/stateMerge.js:165) 旧删除判定为 `if (deletedTime && ...)`
  - 当 `deletedAt = 1970-01-01T00:00:00.000Z` 时，`deletedTime === 0`（falsy），删除分支不执行
  - 新增回归测试：
    - [webdav-state-merge.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-state-merge.test.js:237)
- 冲突点：
  - 0ms 是合法时间戳，不应与“无时间”共用 falsy 语义
  - 同步合并应以“时间是否有效”判断，而不是以数值真值判断
- 影响：
  - 合法 Epoch tombstone 在合并时会被忽略
  - 已删除条目在边界数据下可被错误保留（复活）
- 修复：
  - 新增 `hasValidTime`（`Date.parse` + `Number.isFinite`）用于显式校验 tombstone 时间有效性
  - 删除判定改为 `hasValidTime(deletedAt) && deletedTime >= ...`，保留原有比较规则

### [P1][已修复] StateDB 动态索引在源读取异常且镜像无缓存时会“静默清空索引”，导致查询返回空结果而非故障

- 证据：
  - [storeFactory.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/stateDb/storeFactory.js:92) 旧 `ensureDynamicItemsIndexed` 对 `store.readBuffer("items.json")` 异常仅置 `sourceReadFailed`，随后在镜像也无缓存时走 `clearDynamicItems`
  - 新增回归测试：
    - [state-db-dynamic-index-stale-fallback.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/state-db-dynamic-index-stale-fallback.test.js:254)
- 冲突点：
  - “源读取失败”与“源文件不存在”语义不同：前者是故障，后者才可视为空状态
  - 旧实现把两者统一下沉为“空索引”，会掩盖真实故障
- 影响：
  - 在存储层瞬时异常（网络/权限/IO）时，`stateDbQuery.queryItems` 可能返回空集合，表现为业务数据“瞬时消失”
  - 上游无法收到 `state_db_unavailable`，故障可观测性下降
- 修复：
  - 动态索引构建中新增 `sourceReadError` 追踪
  - 当源读取异常且镜像无缓存时，直接抛出源错误，不再执行 `clearDynamicItems`
  - 保持“源文件正常缺失”场景仍清空索引（防止旧缓存复活）

### [P3][已修复] `state-db-dynamic-index-stale-fallback` 测试加载器存在模块缓存串扰，后续用例可能复用首个 mirror 假体

- 证据：
  - [state-db-dynamic-index-stale-fallback.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/state-db-dynamic-index-stale-fallback.test.js:7) 旧 `loadStateDbWithMockedMirror` 仅清理 `stateDb.js` 缓存，未清理 `storeFactory`
  - `storeFactory` 顶层已解构绑定 `createSqliteMirror`，缓存未清时会持续引用旧 mirror
- 影响：
  - 测试隔离性不足，个别用例可能隐式依赖前序用例环境
  - 新增边界回归在该状态下可能出现假阳性/假阴性
- 修复：
  - loader/restore 两处补充清理 `server/lib/stateDb/storeFactory` 模块缓存
  - 确保每个用例都按当前 mock mirror 重新装配 `createStateDbStore`

### [P1][已修复] StateDB 内建覆盖索引在源读取异常且镜像无缓存时会静默降级，掩盖真实故障

- 证据：
  - [storeFactory.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/stateDb/storeFactory.js:128) 旧 `ensureBuiltinItemsIndexed` 对 `builtin_items.json` 源读取异常仅记录 `sourceReadFailed`，镜像无缓存时继续 `syncBuiltinItems(null)`
  - 新增回归测试：
    - [state-db-dynamic-index-stale-fallback.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/state-db-dynamic-index-stale-fallback.test.js:352)
- 冲突点：
  - 源读取失败（IO/网络/权限）不应被等同于“覆盖文件为空”
  - 旧逻辑会在故障下继续执行 builtin 索引同步，导致调用方无法感知底层异常
- 影响：
  - `queryBuiltinItems/queryItems` 在特定故障场景可能返回“看似正常但缺覆盖”的结果
  - 运维和调用方难以及时识别 `builtin_items.json` 读取链路故障
- 修复：
  - `ensureBuiltinItemsIndexed` 改为跟动态索引一致的故障语义：
    - 源读取异常时优先尝试镜像缓存
    - 镜像也无缓存则直接抛出源错误，不再静默继续
  - 仅在“源文件确实不存在（正常返回 null）”场景保留现有索引收敛行为

### [P2][已修复] 状态合并对 item 时间使用 truthy 回退，合法 `updatedAt=Epoch` 会被误降级到 `createdAt`

- 证据：
  - [stateMerge.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/stateMerge.js:162) 旧逻辑 `toTimeMs(updatedAt) || toTimeMs(createdAt)` 把 `updatedAt=0` 视为 falsy
  - 新增回归测试：
    - [webdav-state-merge.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-state-merge.test.js:264)
- 冲突点：
  - `updatedAt` 是主时间字段，应以“是否有效”判断是否回退，而非以数值真值判断
  - 0ms 是合法时间戳，不应触发回退
- 影响：
  - 在边界数据下，合并冲突决策会错误地使用 `createdAt`
  - 可能导致本应由较新 `updatedAt` 决定的条目被错误保留/覆盖
- 修复：
  - 新增 `resolveItemTimeMs`：优先取有效 `updatedAt`，否则取有效 `createdAt`，都无效则 0
  - `mergeItemsAndTombstones` 统一改用 `resolveItemTimeMs` 参与冲突比较

### [P3][已修复] `/api/library/deleted-assets` 的 `folderId` 查询参数缺少统一 ID 校验，存在路由语义不一致

- 证据：
  - [assetRoutes.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/library/assetRoutes.js:29) 旧实现直接 `String(...).trim()` 后传给 service，未走 `idSchema`
  - 新增回归测试：
    - [library-deleted-assets-query-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-deleted-assets-query-validation.test.js:64)
  - 复现结果：超长 `folderId`（>128）请求返回 `200`，与其他依赖 `idSchema` 的库路由行为不一致
- 冲突点：
  - 同一域内路径参数使用统一 ID 约束（`idSchema`），查询参数却绕过约束
  - 造成“非法 ID 在不同端点返回不一致”的 API 语义漂移
- 影响：
  - 调用方对输入错误处理不可预测（部分接口 `invalid_input`，该接口静默接受）
  - 增加客户端和自动化脚本的分支复杂度
- 修复：
  - `deleted-assets` 路由在 `folderId` 非空时改用 `parseWithSchema(idSchema, folderIdInput)` 校验
  - 保持 `folderId` 省略时语义不变（查询全部 deleted assets）

### [P1][已修复] `uploadFolderCover` 会信任原始文件名后缀，`image/*` 上传可被写成 `.html`

- 证据：
  - [foldersService.js](/Users/lvxiaoer/Documents/physicsAnimations/server/services/library/foldersService.js:100) 旧逻辑 `ext = extByName || IMAGE_EXT_BY_MIME.get(mime)`
  - 当 `mimeType=image/png` 且 `originalName=cover.html` 时，服务会写入 `library/covers/<id>.html`（可稳定复现）
  - 新增回归测试：
    - [library-folder-cover-replace-cleanup.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/library-folder-cover-replace-cleanup.test.js:59)
- 冲突点：
  - 封面上传语义是“仅图片资源”，但旧逻辑把任意后缀优先作为持久化后缀
  - MIME 与文件名后缀冲突时，应该以受控白名单后缀决策，而不是信任原始文件名
- 影响：
  - 攻击者可上传 `image/*` MIME 但 `.html` 后缀的内容并落盘为 `content/library/covers/*.html`
  - 在静态托管链路按扩展名判定类型时，存在同源脚本注入/XSS 风险
- 修复：
  - 增加 `ALLOWED_COVER_EXTS` 白名单（来自 `IMAGE_EXT_BY_MIME.values()`）
  - 后缀选择改为：
    - 优先 `IMAGE_EXT_BY_MIME.get(mime)`（受控映射）
    - 文件名后缀仅在白名单内时才允许作为回退
  - 保证不会持久化 `.html/.js` 等非图片后缀

### [P3][已修复] `createContentStore` 未传 `rootDir` 时会在本地模式抛出 `path` 参数异常

- 证据：
  - [localStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/contentStore/localStore.js:82) 旧实现 `path.join(rootDir, "content")` 未处理 `rootDir` 缺省
  - 新增回归测试：
    - [content-store-rootdir-default.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/content-store-rootdir-default.test.js:7)
  - 复现：调用 `createContentStore({ config: { storage: { mode: "local" } } })` 会抛出 `ERR_INVALID_ARG_TYPE`
- 冲突点：
  - `createContentStore({ rootDir, config } = {})` 的签名允许省略 `rootDir`
  - `createReadOnlyLocalStore` 已使用 `rootDir || process.cwd()`，`createLocalStore` 语义应一致
- 影响：
  - 直接调用 `createContentStore()`（或漏传 `rootDir`）时无法创建本地存储实例
  - 破坏 API 的默认参数契约，增加脚本/集成调用脆弱性
- 修复：
  - `createLocalStore` 改为 `path.join(rootDir || process.cwd(), "content")`
  - 保持其余行为不变，并通过新增回归测试锁定缺省路径语义

### [P2][已修复] 通用 `idSchema` 未做 `trim`，空白字符串会被当作合法 ID

- 证据：
  - [validation.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/validation.js:19) 旧定义为 `z.string().min(1).max(128)`，`"   "` 会通过
  - 新增回归测试：
    - [validation-id-schema-whitespace.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/validation-id-schema-whitespace.test.js:6)
- 冲突点：
  - 多数路由都把 `idSchema` 作为统一 ID 门禁，预期语义应排除空白 ID
  - 旧逻辑会把“非法输入”降级为业务层 `not_found`，破坏错误语义一致性
- 影响：
  - 路径/查询中空白 ID 可绕过输入校验，接口返回 `404` 而非 `400 invalid_input`
  - 客户端难以区分“输入无效”与“资源不存在”
- 修复：
  - `idSchema` 改为 `z.string().trim().min(1).max(128)`
  - 全局保持同一校验器下的 ID 语义一致，空白输入统一落入 `invalid_input`

### [P2][已修复] `htmlMeta` 对超范围数字实体会抛 `RangeError`，上传解析链路可被异常中断

- 证据：
  - [htmlMeta.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/htmlMeta.js:20) 旧逻辑直接 `String.fromCodePoint(code)`，对 `&#9999999999;` 抛错
  - 新增回归测试：
    - [html-meta-entity-safety.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/html-meta-entity-safety.test.js:6)
  - 复现：`extractHtmlTitleAndDescription("<title>&#9999999999;</title>")` 会抛 `RangeError: Invalid code point`
- 冲突点：
  - 元数据提取属于“尽力解析”链路，不应因单个脏实体导致整个解析失败
  - 旧逻辑把可忽略脏数据升级为异常，破坏上传稳定性
- 影响：
  - 含异常数字实体的 HTML/ZIP 入口页在提取标题/描述时会中断
  - 上游上传流程可能返回 500，导致用户无法完成导入
- 修复：
  - 新增安全码点转换：仅接受 `0..0x10FFFF` 的整数，异常或越界实体降级为空串
  - `extractMetaContent` 改为逐个 `<meta>` 标签解析属性（`name/property/content`），避免复杂正则在边界 HTML 下漏匹配

### [P3][已修复] `createApp` 省略 `rootDir` 时会在启动阶段崩溃

- 证据：
  - [app.js](/Users/lvxiaoer/Documents/physicsAnimations/server/app.js:144) 旧逻辑直接 `path.join(rootDir, "content", "tasks.json")`
  - `createApp({})` 可稳定复现 `ERR_INVALID_ARG_TYPE: The "path" argument must be of type string`
  - 新增回归测试：
    - [app-rootdir-default.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/app-rootdir-default.test.js:19)
- 冲突点：
  - `createApp` 作为构造入口，在 `server/index.js` 中有默认根目录语义
  - 旧实现要求外部调用必须显式传 `rootDir`，与常见“直接创建 app”调用方式不兼容
- 影响：
  - 复用 `createApp`（测试、脚本、嵌入式启动）时，漏传 `rootDir` 会直接崩溃
  - 降低应用入口的健壮性与可复用性
- 修复：
  - `createApp` 参数默认值改为 `rootDir = path.join(__dirname, "..")`
  - 与 `server/index.js` 的默认根目录保持一致

### [P3][已修复] Viewer 截图 `src` 未走公共 URL 归一化，非根部署下会出现预览图 404

- 证据：
  - [ViewerView.vue](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/views/ViewerView.vue:146) 旧实现直接 `:src="model.screenshotUrl"`
  - 在 `BASE_URL != "/"`（如 `/physics/`）时，`content/...` 相对路径会按当前路由拼接，导致截图资源请求 404
  - 回归测试：
    - [viewer-actionbar.test.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/test/viewer-actionbar.test.ts:72)
- 冲突点：
  - Catalog/Library 页面已统一使用 `normalizePublicUrl` 处理公开资源路径
  - Viewer 页面未对截图路径做同样归一化，形成跨页面 URL 语义不一致
- 影响：
  - 子路径部署场景下，Viewer 截图模式显示异常（交互 iframe 正常、截图图层丢失）
  - 用户会误判为截图任务失败，实际是前端路径拼接错误
- 修复：
  - `ViewerView` 引入并使用 `normalizePublicUrl(model.screenshotUrl)` 作为截图 `img` 源
  - 保持其余交互逻辑不变（仅修正 URL 归一化）

### [P2][已修复] 系统超时字段会把非法字符串静默截断（`"3000ms"` 被当作 `3000`）

- 证据：
  - 前端 [systemFormState.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/features/admin/systemFormState.ts:33) 旧逻辑 `Number.parseInt(raw, 10)`
  - 后端 [system.js](/Users/lvxiaoer/Documents/physicsAnimations/server/routes/system.js:25) 旧逻辑同样 `parseInt(...)`
  - 回归测试：
    - [system-form-state.test.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/test/system-form-state.test.ts:28)
    - [system-state.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/system-state.test.js:326)
- 冲突点：
  - UI 文案与 API 语义是“毫秒数值”，但实现允许带后缀字符串并隐式截断
  - 非法输入被当成合法值，破坏配置可预期性
- 影响：
  - 运维误填如 `3000ms`、`15s` 时不会收到错误信号，而是被静默改写为意外值
  - 配置审计难以区分“真实输入”与“被截断后值”
- 修复：
  - 前端 `parseTimeoutMs` 改为仅接受纯数字字符串（`/^\d+$/`）
  - 后端 `applyIncomingWebdav` 对字符串 `timeoutMs` 仅在纯数字时才解析；非法字符串保持原配置不变

### [P4][已修复] 前端资源库 API 存在未引用导出（死代码）`getLibraryAssetOpenInfo`

- 证据：
  - [libraryApi.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/features/library/libraryApi.ts) 中 `getLibraryAssetOpenInfo` 全仓库无调用
  - 配套类型 [types.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/features/library/types.ts) 的 `LibraryAssetOpenInfo` 仅被该函数引用
  - 全局搜索确认无外部使用点
- 冲突点：
  - 该导出不参与当前 Viewer/Library 页面链路，长期保留会增加 API 面积与维护负担
  - 与“按实际使用收敛前端域接口”的维护策略冲突
- 影响：
  - 增加误用概率和后续重构成本（调用方会以为这是受支持链路）
  - 无实际用户价值，属于纯维护负债
- 修复：
  - 删除 `getLibraryAssetOpenInfo` 与 `LibraryAssetOpenInfo` 未使用类型定义
  - 前端全量测试验证行为无回归

### [P2][已修复] `webdav/system` 超时解析对后缀字符串容错过宽，`"15s"` 会退化为 `1000ms`

- 证据：
  - [webdavStore.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/contentStore/webdavStore.js:10) 旧逻辑 `parseInt(String(rawValue), 10)` 会把 `"15s"` 解析为 `15`
  - [systemState.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/systemState.js:27) 旧逻辑同样使用宽松 `parseInt`
  - 回归测试：
    - [webdav-store-timeout.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-store-timeout.test.js:46)
    - [system-state-normalization.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/system-state-normalization.test.js:45)
- 冲突点：
  - 同一超时字段在 UI/API 层已要求“纯毫秒值”，底层持久化与 WebDAV store 却接受后缀字符串并截断
  - 造成配置语义跨层不一致
- 影响：
  - 误填 `15s` 会变成 `15` 再被最小值钳成 `1000ms`，而非回落默认 `15000ms`
  - 导致请求超时过短、远端同步/读取稳定性下降，问题定位困难
- 修复：
  - `webdavStore.normalizeTimeoutMs` 改为：数字值按数值处理；字符串仅接受 `^\d+$`
  - `systemState.normalizeTimeoutMs` 同步采用纯数字字符串校验，非法字符串回落默认值

### [P1][已修复] `errorHandler` 未校验 HTTP 状态码范围，`err.status=0` 会触发二次崩溃

- 证据：
  - [errorHandler.js](/Users/lvxiaoer/Documents/physicsAnimations/server/middleware/errorHandler.js:13) 旧逻辑仅 `Number.isInteger(err.status)`，未限制 `400..599`
  - 复现：`err.status=0` 时调用 `res.status(0)` 抛 `ERR_HTTP_INVALID_STATUS_CODE`
  - 回归测试：
    - [error-handler-status-guard.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/error-handler-status-guard.test.js:20)
- 冲突点：
  - 错误处理中间件本应兜底，但旧实现在异常状态码下自身崩溃
  - 导致原始业务错误被二次异常覆盖，输出退化为 Express 默认错误页
- 影响：
  - API 错误响应可能丢失 JSON 结构，调用方收到不可解析响应
  - 增加线上排障复杂度，且对监控告警信号造成噪声
- 修复：
  - 状态码改为显式限域：仅接受 `400..599`，否则强制降级 `500`
  - `500` 统一返回 `server_error`，避免泄露非预期业务错误码

### [P2][已修复] 远端上传扫描会把“单 HTML 且入口非 index.html”误判为 ZIP

- 证据：
  - [remoteScan.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/remoteScan.js:59) 旧逻辑用固定条件 `f !== "index.html"` 判定 ZIP
  - 当 manifest 入口是 `nested/index.html` 且 files 仅包含该入口时，会被错误标为 `uploadKind="zip"`
  - 回归测试：
    - [webdav-remote-scan-entry-validation.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-remote-scan-entry-validation.test.js:172)
- 冲突点：
  - 入口文件语义由 `manifest.entry` 定义，旧逻辑却硬编码 `index.html`
  - 与已有路径归一化（Windows 反斜杠入口）规则不一致
- 影响：
  - 上传类型错误会影响前端展示和后续处理分支（把纯 HTML 场景按 ZIP 分支处理）
  - 在远端扫描导入链路中产生稳定的行为偏差，难以通过 UI 直接定位根因
- 修复：
  - `manifest.files` 逐项做 `normalizeRemotePath`
  - ZIP 判定从“是否不是 `index.html`”改为“是否存在非 `deps/` 且不等于 `entryRel` 的额外文件”

### [P2][已修复] `mergeItemsAndTombstones` 对重复 ID 采用“最后一条覆盖”，可能把新数据回退成旧数据

- 证据：
  - [stateMerge.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync/stateMerge.js:146) 旧逻辑构建 `localById/remoteById` 时直接 `Map#set`，同 ID 后写覆盖前写
  - 当同一状态文件存在重复 ID 且顺序为“新 -> 旧”时，最终会保留旧条目
  - 回归测试：
    - [webdav-state-merge.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-state-merge.test.js:74)
- 冲突点：
  - 合并策略整体是“按更新时间选新”，但重复 ID 去重阶段却退化为“按数组顺序选最后”
  - 去重策略与核心合并语义不一致
- 影响：
  - 遇到异常/污染状态文件时会放大错误，把更新内容回退为陈旧内容
  - 后续同步可能把错误状态再写回远端，形成跨端扩散
- 修复：
  - 新增 `keepNewerItemById`，对同 ID 条目按 `resolveItemTimeMs` 选择更新者
  - 在本地和远端去重阶段统一采用“最新时间优先”

### [P3][已修复] `syncWithWebdav` 省略 `rootDir` 会直接抛 `ERR_INVALID_ARG_TYPE`

- 证据：
  - [webdavSync.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/webdavSync.js:27) 旧逻辑直接 `path.join(rootDir, "content")`
  - 当外部调用未传 `rootDir` 时，稳定复现：`The "path" argument must be of type string. Received undefined`
  - 回归测试：
    - [webdav-sync-rootdir-default.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/webdav-sync-rootdir-default.test.js:30)
- 冲突点：
  - 同仓库多处入口支持“缺省根目录”语义，`syncWithWebdav` 却要求必须显式传参
  - 调用约束不一致，导致脚本化/复用调用容易踩崩溃点
- 影响：
  - 非路由场景（脚本、测试、工具调用）漏传 `rootDir` 会直接崩溃
  - 同步功能无法执行，且错误定位信息落在底层 `path.join`，不利于排障
- 修复：
  - 增加 `resolvedRootDir`：`rootDir` 非空字符串时使用传入值，否则回退 `process.cwd()`
  - 本地状态读写统一改用 `resolvedRootDir`

### [P2][已修复] 系统向导超时输入解析与表单层语义不一致，`parseInt` 会发生截断

- 证据：
  - [SystemWizardConnectionStep.vue](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/views/admin/system/SystemWizardConnectionStep.vue:51) 旧逻辑 `Number.parseInt(raw, 10)`
  - 表单层 [systemFormState.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/src/features/admin/systemFormState.ts:37) 已要求“纯数字字符串”才接受
  - 回归测试：
    - [admin-system-timeout-clear.test.ts](/Users/lvxiaoer/Documents/physicsAnimations/frontend/test/admin-system-timeout-clear.test.ts:15)
- 冲突点：
  - 同一个 `timeoutMs` 字段在不同层存在两套解析规则（向导宽松截断、表单严格校验）
  - 破坏“输入语义一致性”，增加前后端排查成本
- 影响：
  - 特殊输入（如科学计数法或其他非纯数字字符串）可能被向导层错误截断并发出错误数值
  - 与后端/表单校验策略不一致，导致行为不可预测
- 修复：
  - 向导组件改为复用 `parseTimeoutMs` 统一解析逻辑
  - 非法输入统一映射为 `NaN`（保持“无效值不提交有效超时”的现有行为）

### [P2][已修复] `/content/*` 路由未拦截编码穿越片段，`%2e%2e%2f` 会被当成普通文件路径

- 证据：
  - [app.js](/Users/lvxiaoer/Documents/physicsAnimations/server/app.js:81) 旧 `safeContentKey` 仅做 `path.normalize` 与字符串前缀判断
  - 对请求 `/content/uploads/%2e%2e%2fitems.json`，旧逻辑返回键值 `uploads/%2e%2e%2fitems.json`，落入 store 查询并最终返回 `404`
  - 回归测试：
    - [upload-paths.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/upload-paths.test.js:100)
- 冲突点：
  - storage 层已对编码穿越做严格拦截，但 HTTP 路由入口未同步同等级防护
  - 导致同类非法输入在不同模式（local/webdav）表现不一致（`404` 与 `400` 混用）
- 影响：
  - 非法路径请求可能伪装为“资源不存在”，弱化安全审计信号
  - 增加排障成本（调用方难区分“路径非法”与“资源缺失”）
- 修复：
  - `safeContentKey` 增加逐段 `decodeURIComponent` 校验
  - 拒绝解码后为 `.`/`..`、包含 `/`、`\\`、`?`、`#` 的片段，统一返回 `400 invalid_path`

### [P2][已修复] state-db 动态索引未处理重复 ID，脏状态会触发 SQLite 主键冲突

- 证据：
  - [mirrorHelpers.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/stateDb/mirrorHelpers.js:44) 旧 `parseDynamicItemsFromBuffer` 直接返回原始数组
  - [sqliteMirror.js](/Users/lvxiaoer/Documents/physicsAnimations/server/lib/stateDb/sqliteMirror.js:106) 在 `state_dynamic_items(id PRIMARY KEY)` 上逐条插入
  - 当 `items.json` 含重复 `id` 时稳定复现：`UNIQUE constraint failed: state_dynamic_items.id`
  - 回归测试：
    - [state-db-query-items.test.js](/Users/lvxiaoer/Documents/physicsAnimations/tests/state-db-query-items.test.js:314)
- 冲突点：
  - state-merge 层已对重复 ID 采用“按时间选新”，state-db 索引层却无相同兜底
  - 两条数据路径在脏输入下行为不一致
- 影响：
  - SQL 查询路径会因约束错误失败，触发 state-db 错误计数增长，严重时可能打开熔断
  - `/api/items` 在 sqlite 模式下可用性下降
- 修复：
  - `parseDynamicItemsFromBuffer` 增加按 `id` 去重逻辑
  - 以 `updatedAt`（无效则 `createdAt`）时间更新者优先保留，避免主键冲突并保持与合并语义一致

## 无效代码候选（低置信度，建议二次确认）

- 暂无新增候选（本轮唯一高置信死代码 `getLibraryAssetOpenInfo` 已清理）

## 下一轮建议

1. 处理 P2（历史 `output/mobile-audit` 数据清理与重建，避免误判）
2. 继续移动端专项回归（触控尺寸、横向溢出、暗色主题）
3. 继续检查文档与运行链路一致性（部署、门禁、回滚路径）
