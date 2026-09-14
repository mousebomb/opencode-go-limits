# 20260914 修复 DeepSeek V4.1 quota 促销格式导致 NaN 崩表

## 原始需求

opencode 的表格渲染数据有问题：DeepSeek V4.1 档位数据有 NaN，导致整个柱状图无法正确渲染柱长。

## 查因结论

数据源 `anomalyco/opencode` dev 分支的 `go.mdx` 中，DeepSeek V4.1 Flash 两档的额度列（第 6 列）是促销新格式：

```
| DeepSeek V4.1 Flash (Off-Peak) | $0.15 | $0.60 | $0.003 | - | ~~$15~~ **$60**<br /><small>4x · 9 月 20 日结束</small> |
```

1. `money()` 是 `parseFloat(s.replace(/[$*\s]/g, ''))`，字符串以 `~~` 开头，parseFloat 直接返回 `NaN`（上次修复过的 `**$60**` 加粗前面这次又多了删除线）。普通 `**$60**` 能解析成功是因为删号后剩下 `60...` 前缀是数字；而 `~~$15~~...` 前缀是 `~`。
2. `NaN != null` 为 `true`，`render()` 的 `i.monthly != null` 过滤不掉 NaN 项。
3. NaN 进入 `Math.min/max(...)` → `lo/hi/span` 全变 NaN → `x(v)` 输出 NaN → 所有柱长 `width:NaN%`、刻度位置 `left:NaN%`，整图崩坏。

同源问题今年已第三次官方改版触发（`**$60**` 加粗 → 本次 `~~$15~~ **$60**` 删除线+促销小字），根源都是 `money()` 的「去符号后 parseFloat」策略太脆。

## 实现小结

- `money()` 重写：优先提取 markdown 粗体价 `**$60**`（语义 = 当前生效价，`4x`/日期等促销噪音被忽略）；去掉粗体提取后 parseFloat 仍失败（如另一种新格式）时返回 `null`，绝不返回 `NaN`。
- `parse()`：`monthly = cost > 0 && quota != null ? quota / cost : null`——quota 解析失败为 null 时不再硬算（`null / cost` 在 JS 是 0，会产生 monthly=0 假数据）。
- `render()` / `renderDetailTable()`：过滤条件从 `i.monthly != null` 收紧为 `Number.isFinite(i.monthly)`，任何解析异常的档位只被隐藏，不再污染对数刻度导致整图崩溃（官方文档格式再演进也不至于全崩）。

## 验证

- node 模拟完整解析：36 档位 0 个 NaN，35 个有限值，MiniMax M2.5（无请求模式）正常隐藏。
- DeepSeek V4.1 Flash 促销配额取粗体 `$60` → Off-Peak 每月 130,039、Peak 65,020，与官方促销对照表 130,000 吻合（官方对照锚点行也带促销 HTML，尚未匹配，偏差列显示 —，不影响图表）。
- 浏览器实测（本地 http.server）：35 行渲染，badCount=0，DeepSeek V4.1 柱宽 91%/80%，刻度轴 1k/10k/100k 正常，在线抓取 meta 正常。

## 使用方式

同前：双击 `index.html` 或线上 `mousebomb.org/opencode-go-limits/`。

## TODO（已知边界）

- 促销结束后官方文档若无须删改，删线格式会消失恢复 `**$60**`，现行 `money()` 两种格式都兼容，无需再动。
- 官方对照表（offMap）促销行带 `<br/>` 标签，norm 后与基准名不匹配，DeepSeek V4.1 的「官方对照值」显示为 —；仅影响 tooltip 对照展示，不影响图表。如需补齐可给 `offMap` 键值各做一次去标签处理。
