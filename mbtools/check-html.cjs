#!/usr/bin/env node
// 检查根目录 HTML 页面中的内联脚本语法，只解析、不执行页面代码。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const files = fs.readdirSync(root).filter((name) => name.endsWith('.html')).sort();
let failed = false;

for (const file of files) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => !/\bsrc\s*=/.test(match[1]));

  if (!scripts.length) {
    console.error(`[检查] ${file} 未找到内联脚本`);
    failed = true;
    continue;
  }

  scripts.forEach((match, index) => {
    try {
      new vm.Script(match[2], { filename: `${file}#script-${index + 1}` });
    } catch (error) {
      console.error(`[检查] ${file} 第 ${index + 1} 个内联脚本语法错误：${error.message}`);
      failed = true;
    }
  });
}

if (failed) process.exit(1);
console.log(`[检查] ${files.length} 个 HTML 页面的内联脚本语法通过`);
