# 2026-09-29 · 模型名左侧加厂商图标（三页）

## 原始需求

> 能不能为每一个大模型增加辨识度？也就是在大模型的名字的左侧加一个厂商图标啊，
> 比如 deepseek 系列就是蓝鲸，GLM 系列是智谱的"Z"形图标……这些图标可能要去网上
> 搜集下载，稍微小一点的图标就可以了

## 关键决策

### 1. 图标不能是「下载下来的图片文件」，必须内联

原始设想是下载图标文件，但本项目有两条硬约束挡着：

- `mbtools/deploy.cjs` 与 `.githooks/pre-push` **只 SFTP 上传根目录 `*.html`**，
  `icons/*.png` 这类文件传不上去；改部署脚本又会破坏现有的部署约定。
- 页面离线时走 localStorage 缓存，此时任何外部图片地址都拉不到，图标会成片变空白。

所以做成**内联 SVG path 字面量**（`const ICONS = {...}`），一格一图标、
用 `currentColor` 跟随文字颜色。代价：每页 +13 KB（未压缩，gzip 后比例更低）。

### 2. 只用单色矢量，不做彩色 logo

手绘主题是「纸面 + 墨线」，彩色 logo 会直接把视觉打散；15px 下彩色 logo 的细节也糊掉了。
选型落在两个单色矢量集合（都统一 24×24 单色，可无损缩到任意尺寸）：

| 集合 | 许可 | 命中的厂商 |
| --- | --- | --- |
| `simple-icons` | CC0 | deepseek / kimi / minimax / xiaomi / qwen / tencenthy / longcat 等 16 个 |
| `thesvg` | MIT | xai / stepfun |

### 3. 智谱的 Z 是从官网抓的，图标库里没有

`thesvg:zhipu` 是点阵圆（新版品牌标），`chatglm` 是犀牛吉祥物，`glm-v` 是龙 ——
都不是需求里说的 Z。改从 z.ai 官网 favicon 顺藤摸到
`https://z-cdn.chatglm.cn/z-ai/static/logo.svg`，是 30×30 的「圆角方框 + 白色 Z」。

官方 SVG 有 11 KB（Illustrator 导出，一堆 class 和渐变），只取核心四条子路径：
外框 + Z 的上横 / 斜带 / 下横，**用 `fill-rule="evenodd"` 把 Z 挖成负形**（283 字节）。

### 4. 厂商识别用关键词规则，不用官方 vendor 字段

GOAT 文档的 `__next_f` 里其实带 `"vendor":"Meta"` 这类字段，但它在 JS 序列化数据里、
解析成本高且易随改版失效；opencode 那边则完全没有。改用模型名关键词匹配：

```js
const VENDOR_RULES = [ [/deepseek/i,'deepseek'], [/glm/i,'zai'], ... ];
```

顺序敏感、关键词刻意收窄（腾讯混元只在 `hy + 数字` 或 `tencent` 时命中），
避免 MiMo / MiniMax 这类互相误判。**已对 50 个真实模型名跑过映射核对，零误判。**

### 5. 查不到 logo 的厂商回落通用占位

`Inkling`(Thinking Machines)、`Jev`(TypeSafe)、`Pixel Canary` / `Space Bunny`(Stealth)
这几家在图标库里没有收录，用一个「圆角方框 + 中心镂空圆点」的通用占位兜底，
保证**每一行都有图标**（需求原话是"每一个大模型"）。

## 踩到的坑

1. **iconify API 不带 UA 就 403**。Python `urllib` 默认 UA 被拒，加上 `Mozilla/5.0` 才通。
2. **不能给所有图标统一加 `fill-rule="evenodd"`**。自绘的负形图标（Z / 通用占位）必须用
   evenodd 才挖得空，但官方 logo 各有自己原本的填充规则——例如 openai 的花结，
   改规则会把线条糊死。用 `const ICON_NEGATIVE = new Set(['zai','generic'])` 只对自绘项开。
3. **`simple-icons:alibabacloud` 是个 `[-]` 符号，且和其它图标宽度不齐**，不能用。
   页面上模型叫 `Qwen3.8 Max`，直接改用 `qwen` 的六角星更贴。
4. **`kimi`(K 字母标) 比 `moonshot`(带纹理球体) 在 15px 下清楚得多**，同理
   `longcat`(猫脸) 优于 `meituan`(方块)——两个都试渲染后才定。

## 落点

| 位置 | 尺寸 |
| --- | --- |
| 主图行名左侧 | 15px（窄屏 ≤640px 时 14px） |
| 悬停卡片标题左侧 | 17px |
| 明细表模型列 | 13px |

颜色 `var(--ink-2)`，比正文浅一档不抢戏；`tr`/`.row` 悬停时压深到 `var(--ink)`。

## 验证方式

本地 `python3 -m http.server` + `playwright-core` 驱动 ms-playwright 缓存的 Chromium，
并用 `page.route` 拦掉官方文档请求、喂本地快照，绕开网络不确定性：

| 项 | 结果 |
| --- | --- |
| index / go-plus 主图图标覆盖 | ✅ 37 行 / 37 图标 / 明细表 37 |
| goat 主图图标覆盖 | ✅ 51 行 / 51 图标 / 明细表 51 |
| 悬停卡片图标 | ✅ 17px，未隐藏 |
| 窄屏 560px | ✅ 图标降到 14px，`scrollWidth == clientWidth`，无横向溢出 |
| 切 English 后重绘 | ✅ 37 / 37 / 37，图标未丢 |
| 厂商映射误判 | ✅ 50 个真实模型名零误判 |
| JS 错误 | ✅ 无（仅有本地 `/api/stats/t.js` 404，与本次改动无关） |

## 改动文件

- `index.html` — 图标数据 / 厂商规则 / 三处渲染调用 / `.v-icon` 样式（**权威定义源**）
- `go-plus-limits.html`、`goat-limits.html` — 用脚本从 index.html 抽取公共片段精确同步，
  七处替换全部命中 1 次，无残留

## 未做

- **没有 commit、没有 push**。push 会触发 `pre-push` 钩子部署上线，改动是否定稿、要不要
  同步到 `main`（main 目前仍是深色版），都留给你决定。
- 没有做路径压缩。`svgo` 大概还能再省 30%（约 3~4 KB/页），但要引入依赖 + 重跑一轮验证，
  判断不值，先留着。
