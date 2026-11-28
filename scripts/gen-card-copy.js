/**
 * 卡片文案同步器（零构建：改了项目描述后手动运行一次）
 * ----------------------------------------------------
 * 用法：node scripts/gen-card-copy.js          同步 index.html 里六张卡片的标题与描述
 *      node scripts/gen-card-copy.js --check  只检查是否一致（不一致 exit 1，给体检用）
 *
 * 单一数据源 = js/projects.js 的 title 与 description。
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
let verChecked = 0;
const stale = [];

for (const p of projects) {
  const diffs = [];

  // 1) 首屏作品索引版本号（[data-hi="<id>"] .hi-ver）与 projects.js 的 version 保持一致
  if (p.version) {
    const hiRe = new RegExp(`(<a\\b[^>]*data-hi="${p.id}"[^>]*>[\\s\\S]*?</a>)`);
    const hiMatch = html.match(hiRe);
    if (hiMatch) {
      verChecked++;
      const verRe = /(<span\b[^>]*class="[^"]*\bhi-ver\b[^"]*"[^>]*>)([\s\S]*?)(<\/span>)/;
      const vm = hiMatch[0].match(verRe);
      if (vm) {
        const curVer = vm[2].trim();
        const wantVer = escapeHtml(p.version);
        if (curVer !== wantVer) {
          const nextHi = hiMatch[0].replace(vm[0], () => vm[1] + wantVer + vm[3]);
          html = html.replace(hiMatch[0], () => nextHi);
          diffs.push(`首屏版本 ${curVer} → ${wantVer}`);
        }
      }
    }
  }

  // 2) 产品卡片标题与描述
  const artRe = new RegExp(`(<article data-project-id="${p.id}"[\\s\\S]*?</article>)`);
  const art = html.match(artRe);
  if (art) {
    const targets = [
      { label: '标题', re: /(<h3[^>]*>)([\s\S]*?)(<\/h3>)/, want: escapeHtml(p.title), brief: false },
      { label: '描述', re: /(<p data-card-desc[^>]*>)([\s\S]*?)(<\/p>)/, want: escapeHtml(p.description), brief: true },
    ];

    let block = art[0];
    let cardChanged = false;
    for (const t of targets) {
      const m = block.match(t.re);
      if (!m) {
        console.log(`⚠ ${p.id}：卡片里没有${t.label}，跳过`);
        continue;
      }
      const cur = m[2].trim();
      if (cur === t.want) continue;                // 已一致（只比文字，缩进/换行不算差异）
      const lead = m[2].match(/^\s*/)[0];          // 保留原有缩进与换行，只换文字
      const tail = m[2].match(/\s*$/)[0];
      const next = m[1] + lead + t.want + tail + m[3];
      block = block.replace(m[0], () => next);     // 函数形式：内容里的 $ 不做替换展开
      cardChanged = true;
      diffs.push(t.brief
        ? `${t.label} ${cur.length} 字 → ${t.want.length} 字`
        : `${t.label}「${cur}」→「${t.want}」`);
    }

    checked++;
    if (cardChanged) {
      html = html.replace(art[0], () => block);
    }
  }

  if (!diffs.length) continue;
  changed++;
  stale.push(`${p.id}（${diffs.join('；')}）`);
}

if (checkOnly) {
  if (changed) {
    console.log(`✗ index.html 卡片文案/版本号与 projects.js 不一致：${stale.join('、')}`);
    console.log('  修复：node scripts/gen-card-copy.js');
    process.exit(1);
  }
  console.log(`✓ 卡片文案与首屏版本号均与数据源一致（${checked} 张卡片，${verChecked} 处版本号）`);
  process.exit(0);
}

if (changed) {
  fs.writeFileSync(htmlPath, html);
  console.log(`✓ 已同步 ${changed} 项产品文案/版本号 → index.html（${stale.join('、')}）`);
} else {
  console.log(`✓ 无需改动（${checked} 张卡片、${verChecked} 处首屏版本号与数据源一致）`);
}
