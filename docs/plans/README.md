# 计划目录说明

`docs/plans/` 仅放当前正在执行或待执行的计划文档。

命名建议：`YYYY-MM-DD-<topic>-design.md` 或 `YYYY-MM-DD-<topic>-implementation-plan.md`。

计划完成后应移动到 `docs/archive/plans/`，避免根目录长期堆积历史方案。

## 单一真相规则（强约束）

1. 同一主题只允许一个“当前有效”方案。
2. 若新方案与旧方案语义冲突（例如 fallback vs hard-cut），旧方案必须先归档。
3. `docs/plans/` 仅保留“正在执行”文档；历史讨论、废弃路线、回滚预案统一进入 `docs/archive/plans/`。

## 当前状态

- 若本目录存在除 `README.md` 之外的计划文档，则这些文件就是当前有效计划。
- 计划完成后应移动到 `docs/archive/plans/`；如需追溯历史方案，请查看 `docs/archive/plans/`。
