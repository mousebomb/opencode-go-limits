# Coding Agent 套餐 · 每月可用请求数

零依赖单文件 HTML 工具集，打开页面即自动抓取各套餐官方文档数据，按模型绘制"每月可用请求数"横向条状图（对数刻度）。**视觉风格是手绘素描**：米白纸面、手写楷体、rough.js 画的抖动墨线与斜排线填充。

| 工具 | 页面 | 数据源 |
| --- | --- | --- |
| OpenCode Go 用量 | `index.html` | [opencode.ai/docs/go](https://opencode.ai/docs/zh-cn/go/#usage-limits) |
| OpenCode Go Plus 用量 | `go-plus-limits.html` | 同上（取文档中第二套表） |
| Command Code GOAT 用量 | `goat-limits.html` | [commandcode.ai/docs/plans/goat](https://commandcode.ai/docs/plans/goat) |

- **在线预览**：[mousebomb.org/opencode-go-limits/](https://mousebomb.org/opencode-go-limits/)（各 HTML 同目录，可通过顶部导航互相跳转）
- 本地使用：双击打开对应 HTML 即可，无需安装、无需服务器、无需手动刷新。

- 打开页面时自动抓取最新数据；抓取失败自动回退到上一次成功的本地缓存（localStorage）。
- 顶部"立即刷新"按钮可强制重新抓取。
- 悬停任意条显示明细：单价、额度、每请求成本、token 请求模式、官方对照值。
- 底部"查看原始数据明细"可展开完整计算过程表。
- 中英双语，自动识别系统语言，可手动切换（记忆在 localStorage）。

---

## 视觉风格：手绘素描（paper sketch）

三个页面共用同一套主题，**主题的唯一定义源是 `index.html`**：`go-plus-limits.html` 由替换脚本从它派生，`goat-limits.html` 由拼装脚本从它抽取共享片段（CSS / 手绘滤镜 / rough.js / 绘制 helpers）后拼上自己的页面逻辑。改主题请改 `index.html`，再重新派生另两页。

### 手绘感由四样东西堆出来

1. **抖动的线条** —— [rough.js](https://roughjs.com) 4.6.6（MIT）**内联进 HTML**。刻意不走 CDN：
   本工具承诺"双击可用的单文件"，且 `mbtools/deploy.cjs` 只上传根目录 `*.html`，
   外部 js 既传不上去、也会让离线（走 localStorage 缓存）时图表画不出来。
   - 条形 = 淡彩底色（实色 alpha 0.14）+ 斜排线 `hachure`（间距取条长的 1/70）+ 单独一笔轮廓。
     轮廓单独画一份，是为了悬停时能用 CSS 只加粗描边、不动填充。
   - 每行换一个 `seed`，条形各画各的；网格竖线则共用 `seed`，跨行才能连成一条对齐的线。
   - 整条填充只生成 1 个 `<path>`，所以排线再密也不拖慢渲染。
2. **手绘边框** —— SVG 滤镜 `feTurbulence + feDisplacementMap`（`#sk`）作用在面板/卡片的
   `::after` 边框上，只抖边框不动文字。细横线（页头分隔、表头分隔）另用一张内联 SVG 波浪线
   平铺，起止点同高以保证拼接无缝。
3. **纸纹** —— `body::before` 平铺灰阶噪点 + `mix-blend-mode: multiply`。噪点必须过一遍
   `feColorMatrix saturate=0`，否则 feTurbulence 默认输出彩色噪点，会给整页染一层粉调。
4. **手写字体** —— 字体栈优先用本机装的**霞鹜文楷**（楷体手写感且易读），退到 macOS 的
   手札体/翩翩体，再退到各系统的楷体。标题用**马善政楷书**，数字用**霞鹜文楷等宽**
   （保住手写感的同时让小数点对齐）。访客没装这些字体时会退到系统楷体，观感会弱一档但不会坏。

配色只用「墨 + 靛蓝 + 松绿」，刻意避开紫/赤（火）与黄/棕（土）。

### 改主题时的两个坑

- `:root` 里的 CSS 变量被解析失败时**不会报错**，只会静默让所有 `var()` 失效
  （面板变透明、网格塌成一列）。改完样式务必确认 `<style>` 标签没被重复拼进去。
- 轨道 `<svg>` 必须是**绝对定位**的。否则 svg 的显式宽度会顶住网格列的 `min-content`，
  窗口变窄时图表不会跟着收缩。窗口尺寸变化走 `resize` 事件重画（手绘线条是按像素坐标画的，
  不能靠 CSS 拉伸）。

---

## OpenCode Go（index.html）

抓取 [OpenCode Go 官方文档](https://opencode.ai/docs/zh-cn/go/#usage-limits) 的"价格 + 每月额度"表，估算每模型每月请求数。数据源为 GitHub 仓库 `anomalyco/opencode` 的 `dev` 分支原始 mdx（jsdelivr CDN 兜底）。

## OpenCode Go Plus（go-plus-limits.html）

同一份官方文档、同一套单价与 token 请求模式，**只有每月额度不同**（`$40/月`，额度为 Go 的 ×2 / ×3 / ×4 / ×8）。文档里两套表表头完全相同，靠出现序号区分（`parseTableByHeader` 的 `occurrence` 参数：0 = Go，1 = Go Plus）。

代码与 `index.html` 同源，仅套餐参数与缓存 key 不同；两个页面顶部导航互通，便于订阅者按自己购买的方案查看。

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
├── index.html          # OpenCode Go 工具（同时是三页主题的唯一定义源）
├── go-plus-limits.html # OpenCode Go Plus 工具（由 index.html 派生，取第二套表）
├── goat-limits.html    # Command Code GOAT 工具（共享 index.html 的主题片段）
├── package.json       # 依赖（ssh2-sftp-client）与脚本（deploy / setup:hooks）
├── mbtools/deploy.cjs # 自动部署脚本（读 .env，SFTP 上传根目录全部 *.html）
├── .githooks/pre-push # git hook：push 时检测任意 *.html 变更并自动部署
├── .env.example       # 部署配置模板（真实配置填到 .env，不入库）
├── README.md          # 本文档
└── devlog/            # 开发日志
```

> 每个 HTML 内联了压缩后的 rough.js（约 27 KB）。三个文件都仍是"双击即用"的独立单文件，
> 不引入任何运行时外部依赖。

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