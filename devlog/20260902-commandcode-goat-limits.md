# 20260902 Command Code GOAT 月度用量表工具

## 原始需求

仿照既有 `opencode-go-limits` 项目（单文件 HTML 自动抓取官方文档绘制每月请求数条形图），结合 commandcode 官方文档，实现一个反映 Command Code 各 Plan 月度用量表的工具。用户当前套餐为最热门的 GOAT Plan（$10/月），数据源：https://commandcode.ai/docs/plans/goat 。

用户选定方案：
1. 展示维度：**只要月度**（不做 5h/周 并排切换）。
2. 估算策略：**官方表为主 + 可调复算**（官方请求数表为权威主数据，另附 token 假设滑块供自定义重算）。
3. 落地位置：**旧项目仓库内新增** `goat-limits.html`，与 `index.html` 并存，复用旧自动部署 hook。

## 调研结论

- **数据源**：commandcode 文档站为 Next.js 静态预渲染，`https://commandcode.ai/docs/plans/goat` 返回完整 HTML，且响应头 `Access-Control-Allow-Origin: *`，浏览器可直接跨域 fetch（curl 实测）。GitHub 仓库 `CommandCodeAI/command-code` 无 docs 源文件（仅 readme），故数据源只能抓官网 HTML；`llms.txt`/`llms-full.txt` 均为其产品 profile 页，非标准文本清单，无纯文本备选。
- **页面结构**（GOAT 页共 4 张 table）：第 0 张为无表头"模型目录表"（含 intelligence 列，忽略）；第 1 张为官方"5h/周/月请求数表"（34 模型）；第 2、3 张为"月度 credits 表"（新模型 2x 区 + 老模型区，合计 34 模型，与官方表**一一对应无缺失**）。
- **窗口与额度**：GOAT 限额 $14/5h、$35/周、$70/月（usage-limits 页确认是 rolling 窗口，按 credit value 计）。**每模型月度 credits 不同**：$70/$60/$40/$33/$30/$20（新模型 2x = $20 起步），DeepSeek V4 Flash 为 $60、Qwen 3.7 系列 $33 等，非统一 $70。
- **复算公式验证**：官方估算基于 "~800 新输入 + ~50,000 缓存读取 + 按模型 125~200 输出 token"。用该公式 × 各模型真实 credits，并对每模型反演等效输出 token，可精确复现官方月请求数（34 模型偏差均 ≤0.04%）。反演出的 out token 范围 118~210，已作为各模型"默认输出tk"写入明细表 → 用户不动滑块时自定义估算即等于官方口径。

## 实现小结

- 新增 `goat-limits.html`：深色对数横向条形图，主数据 = 官方月请求数（精确权威），tooltip 显示官方 5h/周对照、单价、credits、每请求成本；底部"自定义估算"面板（勾选启用）含 新输入/缓存读取/输出 token 三滑块实时重算。
- 解析用正则 + tbody-only 提取，模型名归一化去尾括号匹配（如 `DeepSeek V4 Flash (latest)` → base 名）；数据抓取失败回退 localStorage 缓存。
- `index.html` / `goat-limits.html` 顶部加双工具导航互跳。
- `mbtools/deploy.cjs` 从"仅传 index.html"改为"上传根目录全部 *.html"（`.env` 的 `DEPLOY_FILES` 可覆盖白名单）；`.githooks/pre-push` 从"盯 index.html"改为"盯根目录任意 *.html"。
- 验证：node 冒烟测试解析 34 模型全部对齐、MiMo V2.5 97,400 居首、GLM-5.2 Fast 691 居尾、无 N/A；自定义模式（cache=0）请求数合理上升；浏览器端跨域抓取由用户手工验证可用。

## 使用方式

线上：`mousebomb.org/opencode-go-limits/goat-limits.html`（与 index.html 同目录部署）。本地：双击 `goat-limits.html` 即可，无需安装、无需服务器。

## TODO（已知边界）

- GOAT 页 DeepSeek V4 Flash Vision/Pro 等有 Peak/Off-Peak 双价，官方表与 credits 表只给 off-peak 单值，本工具按单值处理，未做档位拆条。
- MiniMax M3 价格标签含 "-50% deal" 折扣文字，clean 后如混入名称列需复核（当前实测正常解析）。
