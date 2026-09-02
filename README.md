# Coding Agent 套餐 · 每月可用请求数

零依赖单文件 HTML 工具集，打开页面即自动抓取各套餐官方文档数据，按模型绘制"每月可用请求数"横向条状图（对数刻度）。

| 工具 | 页面 | 数据源 |
| --- | --- | --- |
| OpenCode Go 用量 | `index.html` | [opencode.ai/docs/go](https://opencode.ai/docs/zh-cn/go/#usage-limits) |
| Command Code GOAT 用量 | `goat-limits.html` | [commandcode.ai/docs/plans/goat](https://commandcode.ai/docs/plans/goat) |

- **在线预览**：[mousebomb.org/opencode-go-limits/](https://mousebomb.org/opencode-go-limits/)（index.html 与 goat-limits.html 同目录，可互相跳转）
- 本地使用：双击打开对应 HTML 即可，无需安装、无需服务器、无需手动刷新。

- 打开页面时自动抓取最新数据；抓取失败自动回退到上一次成功的本地缓存（localStorage）。
- 顶部"立即刷新"按钮可强制重新抓取。
- 悬停任意条显示明细：单价、额度、每请求成本、token 请求模式、官方对照值。
- 底部"查看原始数据明细"可展开完整计算过程表。

---

## OpenCode Go（index.html）

抓取 [OpenCode Go 官方文档](https://opencode.ai/docs/zh-cn/go/#usage-limits) 的"价格 + 每月额度"表，估算每模型每月请求数。数据源为 GitHub 仓库 `anomalyco/opencode` 的 `dev` 分支原始 mdx（jsdelivr CDN 兜底）。

## Command Code GOAT（goat-limits.html）

抓取 [GOAT Plan 官方文档](https://commandcode.ai/docs/plans/goat)（Next.js 预渲染 HTML，返回 `Access-Control-Allow-Origin: *`，浏览器可直接跨域拉取）。

- 展示 **官方"每月请求数"表**（权威值），明细表另含官方 5 小时 / 周窗口请求数。
- 每模型按各自 credits（$70/$60/$40/$33/$30/$20）计，非统一 $70。
- 提供"自定义估算"面板：拖动 输入/缓存读取/输出 token 三个滑块，按
  `每请求成本 = (输入×单价 + 缓存×缓存读价 + 输出×输出价) / 1M`、`月请求 = credits ÷ 成本`
  实时重算。官方值本身即按 800 新输入 + 5 万缓存读取 + 各模型等效输出 token（已反演写入明细表）求得，偏差 <0.05%，因此不勾选时即为官方口径。
- 容错：模型名归一化匹配；抓取失败回退 localStorage 缓存。

---

## 文件说明

```
opencode-go-limits/
├── index.html         # OpenCode Go 工具
├── goat-limits.html   # Command Code GOAT 工具
├── package.json       # 依赖（ssh2-sftp-client）与脚本（deploy / setup:hooks）
├── mbtools/deploy.cjs # 自动部署脚本（读 .env，SFTP 上传根目录全部 *.html）
├── .githooks/pre-push # git hook：push 时检测任意 *.html 变更并自动部署
├── .env.example       # 部署配置模板（真实配置填到 .env，不入库）
├── README.md          # 本文档
└── devlog/            # 开发日志
```

## 自动部署（可选）

本仓库带一套**本地 git hook 自动部署**方案：修改任一页面 HTML 后 `git push`，会自动 SFTP 上传全部根目录 `*.html` 到你的服务器，无需手动操作。

### 原理与安全设计

- 部署脚本在**本地**运行（`mbtools/deploy.cjs`），SSH 密钥不出你本机，不经过任何第三方（对比 GitHub Actions 需把密钥交给 GitHub）。
- 服务器 IP、账号、密钥、目录等敏感配置全部放在 `.env`（已被 `.gitignore` 忽略，不入库），仓库只提交 `.env.example` 占位模板。
- **对 fork 者无影响**：fork/clone 下来的仓库没有 `.env`，hook 检测不到配置时自动跳过（exit 0），不会阻塞 push，也看不到任何服务器信息。

### 启用步骤

1. 安装依赖：`npm install`
2. 复制配置模板并填写真实值：`cp .env.example .env`（`DEPLOY_HOST` 服务器 IP、`DEPLOY_TARGET_DIR` 线上目录等）
3. 注册 hook：`npm run setup:hooks`（即 `git config core.hooksPath .githooks`，仅本地生效，不入库）

完成后，`git push` 时若任一页面 HTML 有变更会自动触发部署。

### 行为约定

- `.env` 不存在 → 跳过（fork 者不受影响）
- 根目录 `*.html` 无变更 → 跳过
- 部署失败 → **放行 push，仅告警**（exit 0），不会因部署问题阻塞你提交代码

如需手动部署：`npm run deploy`。