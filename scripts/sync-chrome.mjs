/**
 * 站点外壳一致性：校验（默认）/ 注入（--write）
 * ----------------------------------------------------
 * 用法：
 *   node scripts/sync-chrome.mjs           # 校验：页面登记、导航/页脚入口是否齐全
 *   node scripts/sync-chrome.mjs --write   # 把标记块内容刷成配置渲染的结果（只动标记块内部）
 *
 * 覆盖两件事（2026-10-17 第 1 轮「站点配置收口」）：
 *   ① 防漂移：js/site-config.js 的 entries（归档/照片墙/…）与 externals（GitHub/邮箱）
 *      必须出现在每个 chrome:true 的页面里；首页额外要求 nav 与 more 的每个锚点。
 *   ② 免手写：新页面只写两个标记块，导航与页脚由这里生成
 *        <!-- chrome:nav:start -->  … <!-- chrome:nav:end -->
 *        <!-- chrome:footer:start --> … <!-- chrome:footer:end -->
 *   ❗既有三页（index/archive/gallery）的导航页脚仍是手写块（里面带 data-page-node-id，
 *     是可视化编辑器依赖的属性），本脚本对它们只校验、不重写。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('../js/site-config.js');
const CFG = globalThis.SITE_CONFIG;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WRITE = process.argv.includes('--write');

let pass = 0, fail = 0;
const ok = (n, extra) => { pass++; console.log('PASS  ' + n + (extra ? '  ' + extra : '')); };
const bad = (n, extra) => { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); };
const assert = (cond, n, extra) => (cond ? ok : bad)(n, extra);

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---------------- 渲染：导航与页脚（新页面用，既有页只校验）----------------
const link = (href, label, cls = '') =>
  `<a href="${href}"${cls ? ` class="${cls}"` : ''}>${label}</a>`;

function renderSubNav(current) {
  const items = CFG.entries.map((e) =>
    e.href === current
      ? `        <a href="${e.href}" class="subpage-nav-active" aria-current="page">${e.label}</a>`
      : `        <a href="${e.href}" class="hover:text-black dark:hover:text-white transition">${e.label}</a>`
  );
  return [
    '  <header class="site-header sticky top-0 z-40 w-full site-nav glass-spec bg-white/80 dark:bg-[#0a0a0c]/80 border-b border-[#d2d2d7]/50 dark:border-white/10 transition-colors">',
    '    <div class="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between text-xs">',
    '      <a href="index.html" class="flex items-center gap-2 font-semibold text-sm tracking-tight text-[#1d1d1f] dark:text-white hover:opacity-80 transition">',
    `        <span>${CFG.name}</span>`,
    '      </a>',
    // flex-wrap：入口变多后（归档/照片墙/花园/友链/连载）小屏能换行，不挤成一条
    '      <nav class="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 sm:gap-x-6 text-[#1d1d1f] dark:text-[#86868b] text-xs">',
    '        <a href="index.html#blog" class="hidden sm:inline hover:text-black dark:hover:text-white transition">技术手记</a>',
    ...items,
    '        <a href="index.html" class="hover:text-black dark:hover:text-white transition">返回首页</a>',
    '      </nav>',
    '    </div>',
    '  </header>'
  ].join('\n');
}

function renderFooter() {
  const ext = CFG.externals.map((e) =>
    e.href.startsWith('http')
      ? `          <a href="${e.href}" target="_blank" rel="noopener noreferrer" class="hover:text-black dark:hover:text-white transition">${e.label}</a>`
      : `          <a href="${e.href}" class="hover:text-black dark:hover:text-white transition">${e.label}</a>`
  );
  return [
    '  <footer class="border-t border-[#d2d2d7]/50 dark:border-white/10 py-12 bg-slate-50 dark:bg-[#0a0a0c] text-xs text-[#86868b]">',
    '    <div class="max-w-5xl mx-auto px-4 sm:px-6 space-y-4">',
    '      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">',
    '        <div>',
    `          <span class="font-semibold text-black dark:text-white">${CFG.name}</span>`,
    `          <span> · ${CFG.tagline}</span>`,
    '        </div>',
    '        <div class="flex items-center gap-6">',
    '          <a href="index.html" class="hover:text-black dark:hover:text-white transition">首页</a>',
    ...CFG.entries.map((e) => `          <a href="${e.href}" class="hover:text-black dark:hover:text-white transition">${e.label}</a>`),
    ...ext,
    '        </div>',
    '      </div>',
    '      <p class="text-[11px] text-[#86868b]/80 border-t border-[#d2d2d7]/30 dark:border-white/5 pt-4">',
    `        © <span id="footer-year">2026</span> ${CFG.name}. 慢慢写，慢慢看。`,
    '      </p>',
    '    </div>',
    '  </footer>'
  ].join('\n');
}

const BLOCK = (name) =>
  new RegExp(`(<!-- chrome:${name}:start -->\\n?)([\\s\\S]*?)(\\n?<!-- chrome:${name}:end -->)`);

// ---------------- 校验 ----------------
console.log('== 站点外壳一致性（js/site-config.js 为准）==');

const onDisk = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
const registered = new Set(CFG.pages.map((p) => p.href));
const unregistered = onDisk.filter((f) => !registered.has(f));
assert(unregistered.length === 0, `根目录 HTML 全部已登记（${onDisk.length} 个）`, unregistered.join(','));

for (const page of CFG.pages) {
  const file = path.join(ROOT, page.href);
  if (!fs.existsSync(file)) {
    bad(`页面存在：${page.href}`, '文件缺失');
    continue;
  }
  if (page.chrome === false) {
    ok(`页面存在：${page.href}（chrome:false，不校验导航）`);
    continue;
  }

  const html = read(page.href);
  const missing = [];

  // ① 站内入口 + 外链（所有 chrome:true 页面）
  for (const e of [...CFG.entries, ...CFG.externals]) {
    if (!html.includes(`href="${e.href}"`)) missing.push(e.href);
  }
  // ② 首页额外要求主导航与「更多」的锚点
  if (page.href === 'index.html') {
    for (const e of [...CFG.nav, ...CFG.more]) {
      if (!html.includes(`href="${e.href}"`)) missing.push(e.href);
    }
  }
  // ③ 标记块内容是否与配置渲染一致（新页面走这条）
  const drift = [];
  for (const [name, render] of [['nav', renderSubNav(page.href)], ['footer', renderFooter()]]) {
    const m = html.match(BLOCK(name));
    if (!m) continue;                       // 手写块：不参与内容比对
    if (m[2].trim() !== render.trim()) drift.push(name);
  }

  assert(missing.length === 0, `导航/页脚入口齐全：${page.href}`, missing.length ? '缺 ' + [...new Set(missing)].join(', ') : '');
  if (drift.length) {
    if (WRITE) {
      let out = html;
      if (drift.includes('nav')) out = out.replace(BLOCK('nav'), (_, a, __, c) => a + renderSubNav(page.href) + c);
      if (drift.includes('footer')) out = out.replace(BLOCK('footer'), (_, a, __, c) => a + renderFooter() + c);
      fs.writeFileSync(file, out);
      ok(`已注入标记块：${page.href}`, drift.join(','));
    } else {
      bad(`标记块与配置一致：${page.href}`, drift.join(',') + '（跑 --write 可自动刷新）');
    }
  } else if (html.match(BLOCK('nav'))) {
    ok(`标记块与配置一致：${page.href}`);
  }
}

// ---------------- 摘要 ----------------
console.log(`\nsync-chrome: ${pass} 项通过 / ${fail} 项失败`);
if (fail) {
  console.log('提示：漏入口时先在 js/site-config.js 里改，再手工补既有页面；新页面写标记块后 --write。');
  process.exit(1);
}
