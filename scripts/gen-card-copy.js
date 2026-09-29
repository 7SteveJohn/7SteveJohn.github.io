/**
 * 卡片文案同步器（零构建：改了项目描述后手动运行一次）
 * ----------------------------------------------------
 * 用法：node scripts/gen-card-copy.js          同步 index.html 里六张卡片的描述
 *      node scripts/gen-card-copy.js --check  只检查是否一致（不一致 exit 1，给体检用）
 *
 * 单一数据源 = js/projects.js 的 description。
 * 页面仍保留静态文案（SEO 与无 JS 环境都能读到），但内容由本脚本从数据源刷进去，
 * 避免「卡片一份、弹窗一份」两处措辞各自漂移（2026-09-30 收敛）。
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const checkOnly = process.argv.includes('--check');

// projects.js 是浏览器脚本（挂 window.PROJECTS_DATA），这里模拟 window 环境后加载
global.window = {};
require('../js/projects.js');
const projects = global.window.PROJECTS_DATA || [];

const htmlPath = path.join(root, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const escapeHtml = (s) =>
  String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let changed = 0;
let checked = 0;
const stale = [];

for (const p of projects) {
  const artRe = new RegExp(`(<article data-project-id="${p.id}"[\\s\\S]*?</article>)`);
  const art = html.match(artRe);
  if (!art) continue;
  const descRe = /(<p data-card-desc[^>]*>)([\s\S]*?)(<\/p>)/;
  const m = art[1].match(descRe);
  if (!m) {
    console.log(`⚠ ${p.id}：卡片里没有 <p data-card-desc>，跳过`);
    continue;
  }
  checked++;
  const want = m[1] + escapeHtml(p.description) + m[3];
  if (m[0] === want) continue;                 // 已一致
  const block = art[0];
  html = html.replace(block, block.replace(m[0], want));
  changed++;
  stale.push(`${p.id}（现 ${m[2].trim().length} 字 → 数据源 ${p.description.length} 字）`);
}

if (checkOnly) {
  if (changed) {
    console.log(`✗ index.html 卡片文案与 projects.js 不一致：${stale.join('、')}`);
    console.log('  修复：node scripts/gen-card-copy.js');
    process.exit(1);
  }
  console.log(`✓ 卡片文案与数据源一致（${checked} 张）`);
  process.exit(0);
}

if (changed) {
  fs.writeFileSync(htmlPath, html);
  console.log(`✓ 已同步 ${changed} 张卡片描述 → index.html（${stale.join('、')}）`);
} else {
  console.log(`✓ 无需改动（${checked} 张卡片与数据源一致）`);
}
