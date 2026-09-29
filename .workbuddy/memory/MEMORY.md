# 项目长期约定 · opencode-go-limits

## 分支隔离：手绘主题只在 `sketch-theme` 分支

2026-09-29 把三页的手绘素描风整体隔离到 `sketch-theme` 分支（提交 `d90f003`），
**`main` 保持原来的深色版**。作者的判断是：这类数据密度大的对比图，手绘线稿会降低精确读数
的可读性，只适合作为试验分支存在。

→ 下文「主题唯一定义源」「手绘主题要点」两节描述的是 **`sketch-theme` 分支上的形态**，
   在 `main` 上不成立。改动前先确认 `git branch --show-current`。

### ⚠️ `pre-push` 不区分分支，push 任何分支都可能上线

`.githooks/pre-push` 第 24-28 行：远端**没有**该分支时（首次推送），只要提交里有
`index.html` 就直接 `NEED_DEPLOY=1` → 跑 `mbtools/deploy.cjs` SFTP 覆盖生产。
它**不判断当前是不是 main**。

→ 把 `sketch-theme` 推到远端做备份时，必须 `git push --no-verify origin sketch-theme`，
   否则手绘版会直接覆盖线上。
→ 反过来，如果哪天想让手绘版上线，正常 `git push` 到 main 即可（hook 会部署）。

## 硬约束：部署只上传 `*.html`

`mbtools/deploy.cjs` 与 `.githooks/pre-push` 只 SFTP 上传**根目录下的 `*.html`**。
→ 任何页面都**不能引用外部 `.js` / `.css`**，第三方库一律内联进 HTML。
（当前内联了压缩后的 rough.js ≈27 KB。）这条是"双击即用单文件"承诺的实现基础，也保证
离线走 localStorage 缓存时图表仍画得出来。

## 主题唯一定义源 = `index.html`

三个页面共用同一套手绘主题（`:root` 变量、CSS、`#sk` 手绘滤镜、rough.js、绘制 helpers）：

| 页面 | 来源 |
| --- | --- |
| `index.html` | **权威定义源**，改主题只改这里 |
| `go-plus-limits.html` | 由 index.html 做精确替换派生（仅套餐参数/文案/PLAN/CACHE_KEY 不同） |
| `goat-limits.html` | 从 index.html 抽取共享片段（CSS / 滤镜 / rough.js / helpers）拼上自己的逻辑 |

改完 index.html 必须同步重新派生另两页，否则三页会各自漂移。

## 手绘主题要点

- 绘制引擎：**rough.js 4.6.6**（roughViz 的底层引擎）。不用 roughViz 本体，因为它
  只有线性刻度、tooltip 装不下本项目的四类信息、且每次实例化都挂 window resize 监听。
- 配色只用「墨 `#2b2721` + 靛蓝 `#2f5d8a` + 松绿 `#3d7a63`」，避开紫/赤（火）与黄/棕（土）。
- 字体：正文/行名 = 霞鹜文楷；数字 = 霞鹜文楷等宽；标题 = 马善政楷书；
  三级回退到 macOS 手札体/翩翩体 → 系统楷体。

### 两个会静默出错的坑

1. **`:root` 变量解析失败不报错**。任何让 `<style>` 内文提前中断的原因（多写一个 `<style>` 标签、
   未闭合的规则）都会让所有 `var()` 静默失效：面板透明、`grid-template-columns` 塌成单列、
   字体回落。看到"CSS 好像没生效"先检查标签有没有重复。
2. **轨道 `<svg>` 必须 `position:absolute`**。给 svg 写死 `width` 会顶住网格列的 `min-content`，
   窗口变窄时 1fr 列不收缩、图表横向溢出。窗口尺寸变化必须走 `resize` 事件重画
   （手绘线条是按像素坐标画的，不能靠 CSS 拉伸）。

## 数据解析：结构驱动，不认正文文案

官方文档正文文案反复改版（已打挂解析 3 次），因此一律**按表头列名定位表格**
（`parseTableByHeader`，配合 `occurrence` 序号区分 Go / Go Plus 两套同表头表），
token 请求模式用全文正则扫描。不要再引入正文句子锚点。

## 验证方式

本地 `python3 -m http.server` + `playwright-core` 驱动 ms-playwright 已缓存的 Chromium
（`~/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/...`）出图核对，
并跑功能回归（中英切换 / 窗口改宽 / goat 自定义模式重算 / Plus 取第二套表）。

注意：Chrome 的 `--headless --virtual-time-budget` 遇到挂起网络请求会永久卡死，别用。
