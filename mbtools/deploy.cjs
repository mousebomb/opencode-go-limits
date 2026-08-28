#!/usr/bin/env node
// 一键发布脚本：SFTP 上传 index.html 到服务器 nginx 静态目录
// 使用：node ./mbtools/deploy.cjs
// 配置：全部从 .env 读取（不入库，见 .env.example 模板）
// 行为约定：
//   - .env 不存在 → 打印提示并以 0 退出（fork 者 clone 后 push 不受影响）
//   - 部署失败 → 打印错误并以 0 退出（放行 push，仅告警，见用户约定）
const path = require('node:path');
const fs = require('node:fs');
const SftpClient = require('ssh2-sftp-client');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOCAL_FILE = path.join(PROJECT_ROOT, 'index.html');
const ENV_FILE = path.join(PROJECT_ROOT, '.env');

// ---- 解析 .env（零依赖，仅支持 KEY=VALUE 行）----
function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) return null;
  const env = {};
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

// ---- 主流程 ----
async function main() {
  if (!fs.existsSync(LOCAL_FILE)) {
    console.error(`[部署] 本地文件不存在：${LOCAL_FILE}`);
    process.exit(0);
  }

  const env = loadEnv();
  if (!env) {
    console.log('[部署] 未发现 .env，跳过自动部署（fork 者无需关心，配置见 .env.example）');
    process.exit(0);
  }

  const {
    DEPLOY_HOST,
    DEPLOY_PORT = 22,
    DEPLOY_USER,
    DEPLOY_KEY_PATH,
    DEPLOY_KEY_PASSPHRASE,
    DEPLOY_TARGET_DIR,
  } = env;

  const missing = ['DEPLOY_HOST', 'DEPLOY_USER', 'DEPLOY_KEY_PATH', 'DEPLOY_TARGET_DIR'].filter(
    (k) => !env[k],
  );
  if (missing.length) {
    console.error(`[部署] .env 缺少字段：${missing.join(', ')}，参考 .env.example`);
    process.exit(0);
  }

  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host: DEPLOY_HOST,
      port: Number(DEPLOY_PORT),
      username: DEPLOY_USER,
      privateKey: fs.readFileSync(DEPLOY_KEY_PATH),
      passphrase: DEPLOY_KEY_PASSPHRASE || undefined,
    });

    // 确保目标目录存在（递归创建）
    if (!(await sftp.exists(DEPLOY_TARGET_DIR))) {
      await sftp.mkdir(DEPLOY_TARGET_DIR, true);
    }

    await sftp.put(LOCAL_FILE, `${DEPLOY_TARGET_DIR}/index.html`);
    console.log(`[部署] 上传完成：${LOCAL_FILE} -> ${DEPLOY_TARGET_DIR}/index.html`);
    await sftp.end();
  } catch (err) {
    // 部署失败不阻断 push，仅告警
    console.error(`[部署] 失败：${err.message}`);
    try { await sftp.end(); } catch (_) { /* 忽略清理错误 */ }
  }
  process.exit(0);
}

main();