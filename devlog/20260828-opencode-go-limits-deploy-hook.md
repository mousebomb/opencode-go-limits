# 2026-08-28 opencode-go-limits 自动部署方案（本地 git hook）

## 原始需求

用户想在改完 `index.html` 提交推送 Git 时，自动发布到线上 `https://mousebomb.org/opencode-go-limits/`（阿里云 ECS + nginx 静态托管）。

## 方案选型讨论

- **方案 A（GitHub Actions CI）**：需把 ECS 的 SSH 私钥放到 GitHub Secrets，第三方持钥有安全暴露面，用户否决。
- **方案 B（本地 git hook）**：密钥全程留在本机，与用户既有 `mousebomb-backend/mbtools/publish.cjs`（ssh2-sftp-client）同构，选定。
- **方案 C（一键脚本）**：与 B 的部署脚本相同，区别仅是手动触发，被 B 取代。

## 关键决策

- **fork 安全性**：`.githooks/` 入库但 `core.hooksPath` 不入库（本地 config），fork 者 clone 后 hook 默认不执行；即使执行，无 `.env` 时跳过（exit 0），看不到任何服务器信息。
- **敏感配置隔离**：全部放 `.env`（gitignore），仓库只提交 `.env.example` 占位模板，用户自行填写。
- **失败策略**：用户明确"部署失败放行，只告警"（exit 0），不阻塞 push。
- **不预留 CDN 刷新**：本项目单 HTML，未走 CDN，直接发 ECS。
- **触发条件**：仅 `index.html` 有变更才部署；hook 读取 pre-push 的 stdin（local/remote sha 配对）精确判断，而非简单比较 origin/main。

## 产物

- `mbtools/deploy.cjs`：读 `.env`，SFTP 上传 `index.html` 到 `DEPLOY_TARGET_DIR`
- `.githooks/pre-push`：push 时自动触发，无 `.env` 跳过、无变更跳过、失败放行
- `.env.example`：配置模板（DEPLOY_HOST / DEPLOY_PORT / DEPLOY_USER / DEPLOY_KEY_PATH / DEPLOY_KEY_PASSPHRASE / DEPLOY_TARGET_DIR）
- `package.json`：devDependency `ssh2-sftp-client`，脚本 `deploy` / `setup:hooks`
- README 新增"自动部署（可选）"章节

## 验证

- 无 `.env`：deploy.cjs 与 hook 均跳过（模拟 fork 者），exit 0
- 有 `.env` + `index.html` 变更：hook 触发部署，连假 IP 失败但放行（exit 0）
- 有 `.env` + 仅 README 变更：hook 判定无变更跳过