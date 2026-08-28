# 20260828 OpenCode Go 每月用量条状图工具

## 原始需求

需要一个辅助工具，随时读取 `https://opencode.ai/docs/zh-cn/go/#usage-limits` 页面中"预估值还基于以下每 1M tokens 的价格以及每个模型包含的每月使用额度"表格的数据，根据单价和额度绘制横向条状图，显示每个模型的预估使用额度，用量越大条越长，样式参考 `https://opencode.ai/go` 页面的条状图（但显示每月而非每5小时）。产出物放到 `/Users/rhett/MyWork/2026/opencode-go-limits`。

补充需求：打开页面时自动更新数据（纯前端方案，无需手动跑脚本）。

## 实现小结

- 单文件 `go-limits.html`，零依赖，纯前端（浏览器 fetch + 正则解析 + DOM 渲染）。
- 数据源：GitHub raw mdx `anomalyco/opencode` 仓库（与 opencode.ai 文档页同源同步），jsdelivr CDN 作 fallback；两者均返回 `Access-Control-Allow-Origin: *`。
- 解析三块数据：价格+额度表（每行一个价格档位）、请求模式表（每请求 input/cache/output token 构成）、官方请求数表（对照）。
- 计算逻辑：每月请求数 = 使用额度 ÷ 每请求成本，成本 = (输入×输入价 + 缓存×缓存价 + 输出×输出价) / 1M；结果与官方值高度吻合（多数偏差 <0.5%）。
- 图表：横向条状图 + 对数刻度（数据跨度 110~226,600，线性刻度小值不可见），深色风格仿 go 页面；hover tooltip 显示单价/额度/每请求成本/token 构成；多档位模型（Grok 4.6、DeepSeek Peak/Off-Peak 等）每档独立成条。
- 容错：模型名归一化+最长前缀匹配（处理 "GLM-5.3/5.2/5.1" 合并写法、"Kimi K2.7 Code" 前缀匹配）；官方未提供请求模式的模型（MiniMax M2.5）显示 N/A；抓取失败回退 localStorage 缓存；计算值与官方值偏差 >10% 标 ▲ 提示。
- 交互：打开自动抓取最新数据，提供"立即刷新"按钮，明细表格可展开复查原始数据。

## 使用方式

双击打开 `go-limits.html` 即可，无需任何安装或服务器。