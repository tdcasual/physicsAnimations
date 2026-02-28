# 无效代码/冲突/BUG 审计记录（2026-02-28）

## 审计范围

- 后端：`server/**`、`api/**`、部署配置
- 前端：`frontend/src/**`、管理台系统配置流程
- 仓库卫生：`.gitignore` 与运行产物目录

## 已执行验证

- 后端测试：`npm test`，`178/178` 通过（含性能预算回归与脚本守护）
- 前端测试：`npm --prefix frontend run test -- --run`，`55/55` 文件通过（`166/166` 用例）
- SPA 冒烟：`smoke:spa-public`、`smoke:spa-admin`、`smoke:spa-admin-write`、`smoke:spa-library-admin` 全部通过
- 前端依赖图扫描（`frontend/src`）：
  - 运行时代码可达性正常，未发现明显孤儿模块（`env.d.ts`、`main.ts` 为特例）
- 移动端运行态复测（`390px/375px/320px`）：
  - `/`、`/viewer/*`、`/login`、`/admin/*` 未复现横向溢出
  - 当前运行态交互控件最小高度复测为 `40px`

## 修复进展（本轮）

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
  - 回归验证：`npm test` 通过（`178/178`）
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
    - `npm test` 全量通过（`178/178`）

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

## 无效代码候选（低置信度，建议二次确认）

- 暂无新增高置信度候选（`vercel` legacy include 与根目录 `404.html` 已清理）

## 下一轮建议

1. 处理 P2（历史 `output/mobile-audit` 数据清理与重建，避免误判）
2. 继续移动端专项回归（触控尺寸、横向溢出、暗色主题）
3. 继续检查文档与运行链路一致性（部署、门禁、回滚路径）
