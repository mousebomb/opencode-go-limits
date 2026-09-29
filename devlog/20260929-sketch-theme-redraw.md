# 2026-09-29 · 三个页面整体改为手绘素描风

## 原始需求

> 帮我基于 https://github.com/jwilber/roughViz 这个开源库，把当前项目的图表显示风格
> 整体风格做一轮全面调整。改成手绘风格，类似一个画师范儿的

## 关键决策

### 1. 没用 roughViz 本体，改用它的底层绘制引擎 rough.js

`roughViz` 的 `BarH` 接不住这个页面的需求，实测确认四条硬伤：

| 问题 | 影响 |
| --- | --- |
| 只有 `scaleLinear`，**不支持对数刻度** | 数据跨 423 ~ 226,586 三个数量级，线性刻度下小值直接不可见 |
| `margin.left` 默认 100px，y 轴标签交给 d3 text，无省略处理 | 模型名长（`DeepSeek V4 Flash Vision Exp (Off-Peak)`）会溢出 |
| 内置 tooltip 只能显示 label+value | 现在悬停要展示单价/额度/每请求成本/官方对照值四类信息 |
| 每次 `new` 都 `window.addEventListener('resize')` | goat 页滑块拖动会高频重画，监听器会持续堆积 |

另外它 dist 有 348 KB，大头是内联的 Gaegu/Indie Flower 字体，而这俩字体不含中文。

改用 **rough.js 4.6.6**（roughViz 的绘制引擎，同一套 `hachure`/`roughness`/`bowing` 参数，
观感同源），自己按对数刻度画条形——roughViz 的招牌斜排线观感完整保留，但刻度、悬浮卡、
明细表、i18n 全部可控。

### 2. rough.js 内联进 HTML，不走 CDN

两个约束逼出来的：README 承诺"双击可用的单文件 HTML"；`mbtools/deploy.cjs` 只上传根目录
`*.html`，外部 js 根本传不上去。且页面离线时会走 localStorage 缓存，此时 CDN 拉不到就白图。
代价是每个文件 +27 KB（压缩后）。

### 3. 主题唯一定义源 = index.html，另两页派生

- `go-plus-limits.html`：从 index.html 做 10 处精确替换（标题、导航高亮、PLAN=1、缓存 key…）
- `goat-limits.html`：从 index.html 抽取共享片段（CSS / 手绘滤镜 / rough.js / 绘制 helpers）
  再拼上自己的页面逻辑与复算面板

三页共用同一套 `:root` 变量与绘制函数，避免各自漂移。

## 踩到的坑

1. **`:root` 变量失效不报错**。拼装脚本第一次多写了一个 `<style>` 标签，
   浏览器把第二个当 CSS 文本解析，整段样式（含 `:root`）静默报废：
   面板背景变透明、`grid-template-columns` 塌成单列、字体回落到衬线。
   现象很像"CSS 没写"，实际是标签重复。已在拼装脚本里加断言。
2. **轨道 `<svg>` 必须绝对定位**。给 svg 写死 `width` 会顶住网格列的 `min-content`，
   窗口变窄时 1fr 列不收缩、图表横向溢出。用 `position:absolute` + `.axis-svg` 脱离文档流，
   `clientWidth` 量到的才是干净列宽。
3. **排线密度要按条长缩放**。固定间距在 550px 长条上会排出 80+ 根线、糊成一块黑；
   取 `max(5.5, 条长/70)` 后长短条疏密一致。整条填充只生成 1 个 `<path>`，密度不影响性能。
4. **纸纹噪点必须去色**。`feTurbulence` 默认输出彩色噪点，正片叠底后整页泛粉。
   加一层 `feColorMatrix saturate=0` 才是中性纸纤维。
5. **本机手写字体实测**。用 canvas 宽度比对法（而非 `document.fonts.check`，
   后者对不存在的字体族也返回 true）确认可用：霞鹜文楷 / 霞鹜文楷等宽 / 马善政楷书 /
   手札体 / 翩翩体 / 行楷 / 娃娃体 / 圆体。最终选中：正文与数值用霞鹜文楷（等宽用于数字），
   标题用马善政楷书。另发现 `PingFang SC` 在比对上会与 `sans-serif` 同宽产生假阴性。

## 视觉配方（四层）

1. **抖动的线** — rough.js：淡彩底（实色 α0.14）+ 斜排线 `hachure` + 单独一笔轮廓。
   轮廓独立成组是为了让悬停能用 CSS 只加粗描边。每行换 `seed`，网格线共用 `seed` 保证跨行对齐。
2. **手绘边框** — `feTurbulence + feDisplacementMap`（`#sk`）作用在 `::after` 边框，只抖框不动字；
   细横线另用内联 SVG 波浪线平铺（起止同高，拼接无缝）。
3. **纸纹** — 灰阶噪点平铺 + `multiply`。
4. **手写字体** — 三级回退：本机楷体手写体 → macOS 手札体/翩翩体 → 系统楷体。

配色只用「墨 + 靛蓝 + 松绿」，避开紫/赤（火）与黄/棕（土）。

## 验证方式

本地起 `python3 -m http.server`，用 `playwright-core` 驱动 ms-playwright 已缓存的 Chromium
（`~/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/...`）出图核对，并跑功能回归：

| 项 | 结果 |
| --- | --- |
| 中英切换后条形数 / 宽度完全一致 | ✅ 37 / 37，切回中文复原 |
| 窗口 1100 → 760 重画 | ✅ svg 宽 551 → 311，与量到的列宽一致 |
| goat 自定义模式重算 | ✅ 首行 691 → 1,437，51 条中 49 条宽度变化 |
| 取消勾选回官方值 | ✅ 复原 |
| go-plus 取第二套表 | ✅ 423/490 → 1,690/1,961（×4，符合 Go Plus 额度） |
| JS 错误 | ✅ 无 |

## 改动文件

- `index.html` / `go-plus-limits.html` / `goat-limits.html` — 整体换主题（含内联 rough.js）
- `README.md` — 新增「视觉风格：手绘素描」章节，记录配方、主题定义源与两个坑

## 未做（按需求边界）

- 没有部署。`npm run deploy` / `git push` 都没执行，线上仍是旧版，由你自己决定何时发布。
