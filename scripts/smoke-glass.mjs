/* 冒烟：液态玻璃控件层 */
import { createRequire } from 'module';
const require = createRequire('C:/Users/SevenJohn/.workbuddy/binaries/node/workspace/index.js');
const { chromium } = require('playwright-core');

const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: false,
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.emulateMedia({ reducedTransparency: 'no-preference' });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('http://127.0.0.1:8327/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(2500);

// 1. 滚动后吸顶导航玻璃生效
await p.evaluate(() => window.scrollTo(0, document.querySelector('#products').offsetTop + 200));
await p.waitForTimeout(900);
const header = await p.evaluate(() => {
  const h = document.querySelector('header.site-header');
  const cs = getComputedStyle(h);
  return `scrolled=${h.classList.contains('is-scrolled')} bf=${cs.backdropFilter.slice(0, 30)} bg=${cs.backgroundImage.slice(0, 40)}`;
});
console.log('header →', header);
await p.screenshot({ path: 'D:/HTML/Temp/lg-header.png' });

// 2. 项目弹窗玻璃 + specular 跟手
await p.evaluate(() => window.openProjectModal('netops-handbook'));
await p.waitForTimeout(700);
const panel = await p.evaluate(() => {
  const m = document.querySelector('#project-modal .modal-panel');
  const cs = getComputedStyle(m);
  return `bf=${cs.backdropFilter.slice(0, 30)} tint=${cs.backgroundColor}`;
});
// 指针扫过面板中上部 → --sx/--sy 应更新
await p.mouse.move(720, 300);
await p.waitForTimeout(300);
const spec = await p.evaluate(() => {
  const m = document.querySelector('#project-modal .modal-panel');
  return `sx=${m.style.getPropertyValue('--sx')} sy=${m.style.getPropertyValue('--sy')}`;
});
console.log('panel →', panel, '| spec →', spec);
await p.screenshot({ path: 'D:/HTML/Temp/lg-modal.png' });

// 2.5 全玻璃面清单：position / 圆角 / 配方 / 是否挂 specular / rim 层数
// （核对「整个网页对液态玻璃的把控」时直接看这一份，别靠肉眼翻 CSS）
const inventory = await p.evaluate(() => {
  const sel = [
    ['header.site-header', '吸顶导航'],
    ['.modal-panel', '弹窗面板'],
    ['.music-fab', '音乐 FAB'],
    ['.music-panel', '音乐面板'],
    ['#page-next', '下翻箭头'],
    ['#home .hero-ghost', 'hero 音乐入口'],
  ];
  return sel
    .map(([s, name]) => {
      const el = document.querySelector(s);
      if (!el) return `${name.padEnd(12)} MISSING (${s})`;
      const cs = getComputedStyle(el);
      return [
        name.padEnd(12),
        `pos=${cs.position}`.padEnd(12),
        `radius=${cs.borderRadius.split(' ')[0]}`.padEnd(16),
        `blur=${(cs.backdropFilter || 'none').replace(/\s+/g, ' ').slice(0, 26)}`.padEnd(38),
        `spec=${el.classList.contains('glass-spec') ? 'yes' : 'NO '}`.padEnd(10),
        `rim=${(cs.boxShadow.match(/inset/g) || []).length}层`,
      ].join(' ');
    })
    .join('\n');
});
console.log('--- 玻璃面清单 ---\n' + inventory);

// 3. 关弹窗 → FAB 玻璃
await p.evaluate(() => window.closeProjectModal());
await p.waitForTimeout(600);
const fab = await p.evaluate(() => {
  const f = document.querySelector('.music-fab');
  const cs = getComputedStyle(f);
  return `bf=${cs.backdropFilter.slice(0, 26)}`;
});
console.log('fab →', fab);
console.log('pageerrors:', errs.length ? errs.join(' | ') : 'none');
await b.close();
