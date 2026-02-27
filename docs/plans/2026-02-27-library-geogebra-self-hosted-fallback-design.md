# Library GeoGebra 自托管优先 + 在线兜底 设计

日期：2026-02-27  
状态：已落地（本分支实现）

## 1. 目标

在校园内网（可能无法出网）环境下，保证 `.ggb` 的 `embed` 打开能力可用，并在具备外网时自动兜底：

1. 默认走内网自托管 GeoGebra 资源。
2. 自托管不可用时自动回退到官方在线脚本。
3. 保留 `download` 模式，不受影响。
4. 提供可重复执行的“定期更新官方 bundle”流程。

## 2. 现状问题

旧实现将容器页脚本固定为：

- `https://www.geogebra.org/apps/deployggb.js`

因此在无法出网的局域网部署中，`embed` 模式会失败。

## 3. 方案概览

### 3.1 资源加载策略

GeoGebra adapter 生成的容器页内实现“来源列表顺序尝试”：

1. 自托管源（默认）：
   - `script`: `/content/library/vendor/geogebra/current/deployggb.js`
   - `HTML5Codebase`: `/content/library/vendor/geogebra/current/web3d/`
2. 在线兜底源（默认）：
   - `script`: `https://www.geogebra.org/apps/deployggb.js`
   - `HTML5Codebase`: 空（按官方默认行为）

容器页逻辑：

1. 若来源配置了 `preflightUrl`，先进行可用性检查（HEAD）。
2. 再加载 `deployggb.js`。
3. 创建 `GGBApplet`，并在来源配置存在时调用 `setHTML5Codebase(...)` 后 `inject(...)`。
4. 当前来源失败则继续尝试下一来源。
5. 全部失败时展示错误提示和 `.ggb` 下载链接。

### 3.2 自托管目录约定

约定稳定公共路径（供容器页默认引用）：

1. `/content/library/vendor/geogebra/current/deployggb.js`
2. `/content/library/vendor/geogebra/current/web3d/`

更新脚本负责把官方 bundle 的真实目录结构映射到以上稳定路径（通过 symlink）。

### 3.3 更新流程（周期性执行）

新增命令：

```bash
npm run update:geogebra-bundle
```

执行动作：

1. 下载官方 `Math Apps Bundle`（支持重定向）。
2. 解压到 `content/library/vendor/geogebra/releases/<version>/bundle/`。
3. 自动探测：
   - `deployggb.js`
   - 含 `web3d.nocache.js` 的 `web3d` 目录
4. 在 release 下生成稳定入口：
   - `deployggb.js`（symlink）
   - `web3d`（symlink）
5. 将 `content/library/vendor/geogebra/current` 原子切到新 release。
6. 写入 `manifest.json` 记录版本和来源。

## 4. 配置项

新增环境变量：

1. `LIBRARY_GGB_SELF_HOST_SCRIPT_URL`
2. `LIBRARY_GGB_SELF_HOST_HTML5_CODEBASE_URL`
3. `LIBRARY_GGB_ENABLE_ONLINE_FALLBACK`
4. `LIBRARY_GGB_ONLINE_FALLBACK_SCRIPT_URL`
5. `LIBRARY_GGB_ONLINE_FALLBACK_HTML5_CODEBASE_URL`

均已在 `docs/guides/configuration.md` 中说明。

## 5. 风险与边界

1. 若局域网部署不可写 `content/`，更新脚本无法本地落盘；需在可写节点执行并同步制品。
2. 若在线兜底也不可访问（完全离线且本地包缺失），容器页会降级为错误提示 + 下载入口。
3. 若使用 `webdav` 纯远端模式，建议在运行节点维持本地可读缓存或将自托管包一并同步到可读路径。

## 6. 验证策略

1. Adapter 单测：
   - 默认自托管 + 在线兜底脚本均写入 HTML。
   - 自定义源配置生效。
2. 现有 library service / route 用例回归。
3. 前端与后端全量测试回归。

## 7. 参考

1. GeoGebra 官方 Embedding 文档（含 Offline and Self-Hosted）：  
   https://geogebra.github.io/docs/reference/en/GeoGebra_Apps_Embedding/
2. GeoGebra 官方 bundle 下载入口：  
   https://download.geogebra.org/package/geogebra-math-apps-bundle
