# 20260929 新增 OpenCode Go Plus 独立页面（go-plus-limits.html）

## 原始需求

在上一轮修复（官方改文案致锚点失配）之后，用户确认要把官方新增的 Go Plus 套餐也做进去，
并先问了一个方案选型：**合并到一个表格里每行两根柱，还是切页签独立一页？**

选型过程中用户补充了一个关键前提：**「需要看这个柱状图的人，不是用来决策购买的人，而是已经买了的人。」**
最终决定：**采用「独立页面」承载**（等价于我建议的「两套独立视图」方案的极致形式），
并额外新建一个 HTML 文件，而不是在 `index.html` 里加套餐页签。

## 选型依据（实测数据）

- 官方方案价：**Go `$10/月`、Go Plus `$40/月`（价格 ×4）**。
- 但额度倍数**不统一**：×2（6 行）、×3（7 行）、×4（23 行）、×8（1 行 `GLM-5.3`）。
  折算性价比（额度倍数 ÷ 4）= `0.50x` / `0.75x` / `1.00x` / `2.00x`；
  **只有 GLM-5.3 一个模型 Plus 更值**，整体合计 Plus 多 2.58 倍量但贵 4 倍（整体性价比 0.64x）。
- **37 行里 17 行排序名次会变**（`Grok 4.7`：Go 第 5 → Plus 第 1）。
  → 合并双柱视图只有一种排序键，另一个套餐的名次必然是错的，**排序冲突无法调和**。
- 倍数只有 4 个离散值，用对数柱长表达反而降级：×2 的差仅占轴长 10%，肉眼与 ×3 分不开。
- 两表 39 行、**模型名与顺序逐一相同**，单价与 token 请求模式完全共用，**唯一变量只有 quota 一列**。

## 实现小结

### 新增 `go-plus-limits.html`

- 由 `index.html` 复制改造，**与 index.html 同源**，仅 5 处差异：
  1. `<title>` / `page.title` 改为 Go Plus；新增 `page.sub` 副标题 `$40/月 · 每月额度按 Go Plus 方案计算`
  2. 顶部 nav 扩为三项（Go / Go Plus / GOAT），当前页高亮
  3. `CACHE_KEY` → `opencode-go-plus-limits-v1`（与 Go 页隔离，避免互相覆盖缓存）
  4. `parse()` 内 `const PLAN = 1` → 取文档里**第二套表**
  5. `footer.line2` 说明本页取 Go Plus 额度、与 Go 共用单价与 token 模式
- 语言记忆 key `ocgl-lang` **三页共用**，切换语言后各页同步。

### `parseTableByHeader` 增加 `occurrence` 参数

文档里 Go / Go Plus 两套价格表、两套官方对照表**表头完全相同**，只能靠出现序号区分：

```js
function parseTableByHeader(src, headers, occurrence = 0) {
  ...
  if (hit++ < occurrence) continue; // 需要第 N 套表时跳过前面几套
  ...
}
```

`index.html` 用 `PLAN = 0`（Go），`go-plus-limits.html` 用 `PLAN = 1`（Go Plus），
两文件的该函数实现**保持逐字一致**，日后官方改版时便于对照同步。

### 同步改动

- `index.html`：nav 加 Go Plus 链接 + DICT 补 `nav.goplus`（zh/en）；`parseTableByHeader` 升级为带 `occurrence` 版本。
- `goat-limits.html`：nav 加 Go Plus 链接 + DICT 补 `nav.goplus`（zh/en）。
- `README.md`：工具表加一行、新增「OpenCode Go Plus」小节、文件树补新文件。
- 部署无需改动：`.githooks/pre-push` 检测任意根目录 `*.html` 变更即自动 SFTP 上传全部 HTML。

## 验证

沿用「从 HTML 里切出真实代码 + DOM stub 在 node 下执行」的方式：

1. **两页解析/渲染**：`index.html` 39 档位 → 37 柱 / 柱宽 NaN 0 / 刻度 3 条；
   `go-plus-limits.html` 39 档位 → 37 柱 / NaN 0 / 刻度 2 条
   （两者刻度数不同是对数轴范围的正常结果：Plus 最小值 1692 使 1k 刻度落在轴外被过滤）。
2. **取表正确性（关键）**：逐档比对两页 quota —— 37 档 Plus quota 严格更大且倍数落在 2~8；
   2 档两边同为 `null`（`LongCat 2.5 Preview Free` / `Space Bunny Free`，价格"免费"无法估算）；**异常 0 条**。
   抽样：`GLM-5.3` `$15→$120` ×8（989 → 7,916）、`Grok 4.7 (≤200K)` `$15→$60` ×4（845 → 3,380）、
   `DeepSeek V4.1 Flash (Off-Peak)` `$60→$120` ×2（130,039 → 260,078）。
3. **i18n 完整性**：三页所有 `data-i18n` / `data-i18n-html` 的 key 在 zh 与 en 中均存在，**缺失 0 条**。
4. **隔离性**：三页 `CACHE_KEY` 各不相同；`PLAN` 分别为 0 / 1；语言 key 三页共用。
5. **nav 互通**：三页 nav 均为三项且各自高亮正确。

## 使用方式

- 双击 `index.html`（Go 订阅者）或 `go-plus-limits.html`（Go Plus 订阅者），
  或线上 `mousebomb.org/opencode-go-limits/` 后经顶部导航跳转。
- 本地改完 `git push` 会经 `.githooks/pre-push` 自动 SFTP 部署三个页面。

## TODO（已知边界）

- **两份 HTML 的解析代码是复制的**，官方改版时需同步改两个文件的 `parseTableByHeader`
  与表头常量（目前差异仅 `PLAN` 一行）。没有抽公共 JS 文件，是为了保持项目
  「零依赖单文件 HTML，双击即用」的设计契约 —— 若日后第 4 个页面出现，值得重新评估。
- Plus 页对数轴最小值偏小（1692），导致左端 1k 刻度被过滤、最左侧无标签。属原有刻度过滤逻辑，未改。
- 未做「跨套餐对比」功能（按用户定位：受众是已购买者，不需要购买决策信息）。
