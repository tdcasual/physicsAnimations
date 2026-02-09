# API 性能基准测试设计

日期：2026-02-09

## 背景与目标
本项目需要一套可重复、可比较的 API 性能基准测试，用于长期评估性能变化与回归风险。目标是为后端关键接口提供稳定、可控的数据规模与运行方式，在不引入外部依赖的情况下得到可靠的延迟与响应体积统计。

## 范围与非目标
范围内：`/api/catalog`、`/api/categories`、`/api/items` 的性能基准测试。覆盖公共端与管理端列表核心路径。
非目标：前端渲染性能、真实浏览器端到端体验、WebDAV 网络性能与上传/截图耗时。

## 方案比较
- **Node 测试（推荐）**：在 `tests/` 下新增性能测试文件，使用 `node:test` 启动真实 HTTP 服务进行基准测量。优点是可加入标准测试流程，脚本简单、可重复；缺点是不包含浏览器渲染。
- **独立脚本**：灵活但不在标准测试内。
- **运行时中间件统计**：适合线上观测但不具备可重复基准与对比基线。

## 选型与总体设计
采用 Node 测试方式，新增 `tests/perf-api.test.js`。测试流程：
1. 生成临时 root 目录并写入数据文件。
2. 启动 `createApp` 并监听随机端口。
3. 对每个 endpoint 进行热身请求，再进行多次测量。
4. 输出统计：avg / p50 / p95 / max 延迟与 payload bytes。
5. 默认只输出统计，不强制失败；可通过环境变量开启阈值断言。

## 数据规模（标准规模 B）
- 动画内置：约 20 个分类 × 10 项 ≈ 200 项（写入 `animations.json`）。
- 动态内容：约 2,000 项（`items.json`），其中约 1,200 uploads + 800 links。
- 分类配置：约 80 个二级分类，分布在 5 个大类（`categories.json`）。
- 分布：内容均匀分配到分类，避免极端集中。

所有数据使用固定 seed 的伪随机生成，确保跨次运行可复现。

## 测试覆盖与场景
- `/api/catalog`：公共端首页核心接口，覆盖分类、分组、排序与合并逻辑。
- `/api/categories`：分类配置与统计接口。
- `/api/items`：管理端列表接口，覆盖分页与筛选。
  - 基线：`page=1&pageSize=24`
  - 搜索：`q=<固定关键词>`
  - 过滤：`type=link` 或 `categoryId=<固定分类>`

## 断言策略与稳定性
- **默认不失败**：避免因环境抖动导致测试不稳定。
- **可选阈值**：通过 `PERF_ASSERT_P95_MS` / `PERF_ASSERT_AVG_MS` 设置门槛。
- **可调采样**：`PERF_RUNS`、`PERF_WARMUP` 控制测量次数。
- **错误记录**：任何非 2xx 或网络错误会记录并在输出中标注。

## 可配置参数
- `PERF_SCALE=B` 或显式 `PERF_ITEMS=2000`、`PERF_CATEGORIES=80`、`PERF_GROUPS=5`
- `PERF_RUNS=8`、`PERF_WARMUP=2`
- `PERF_ASSERT_P95_MS` / `PERF_ASSERT_AVG_MS`

## 输出示例（概念）
```
[perf] scale=B items=2000 categories=80 groups=5
[perf] /api/catalog avg=42.1ms p50=39.4ms p95=58.7ms max=64.2ms bytes=182,412
[perf] /api/categories avg=7.2ms p50=6.9ms p95=10.1ms max=12.8ms bytes=9,842
[perf] /api/items?page=1&pageSize=24 avg=12.4ms p50=11.8ms p95=16.9ms max=20.3ms bytes=6,201
```

## 风险与注意事项
- 运行结果依赖本机 CPU/IO 状态与 Node 版本，建议记录版本信息。
- 测试仅衡量后端逻辑性能，不代表真实用户体验。

## 后续步骤
- 实现 `tests/perf-api.test.js` 并可选更新 `README.md` 说明如何运行。
