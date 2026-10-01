/* 路人视角首访截图 + 浮层压字体检。
   用法：先起 127.0.0.1:8327 静态服务，再 node scripts/first-look.mjs
   产物：Temp/look-*.png；控制台输出 footer/主题/压字统计 */
import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

const BASE = 'http://127.0.0.1:8327/';
const OUT = 'D:/HTML/Temp/';

// 下翻箭头 / 音乐 FAB 是否盖住产品区正文（在卡片页调用）
const overlapProbe = () => {
  const floats = ['#page-next', '#music-fab', '.music-fab']
    .map((s) => document.querySelector(s))
    .filter(Boolean)
    .map((e) => e.getBoundingClientRect());
  const hits = [];
  document.querySelectorAll('#products p, #products h3, #products button, #products a span').forEach((el) => {
    if (el.closest('#page-next, .music-fab, .music-panel, #project-modal')) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) return;
    if (floats.some((c) => r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top)) {
      hits.push((el.textContent || '').trim().slice(0, 20));
    }
  });
  return { count: hits.length, samples: hits.slice(0, 5) };
};

const lastCard = () => {
  const cards = document.querySelectorAll('[data-project-id]');
  const el = cards[cards.length - 1];
  if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 40);
};

const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});

// ---------- 桌面 ----------
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(4500); // 首屏动画 / WebGL 背景
await p.screenshot({ path: OUT + 'look-1-hero.png' });

await p.evaluate(() => window.scrollBy(0, window.innerHeight));
await p.waitForTimeout(1500);
await p.screenshot({ path: OUT + 'look-2-projects.png' });

await p.evaluate(lastCard);
await p.waitForTimeout(1600);
await p.screenshot({ path: OUT + 'look-3-card-paian.png' });
console.log('desktop-overlap', JSON.stringify(await p.evaluate(overlapProbe)));

// 页尾：压到底，看 footer 与音乐面板
await p.evaluate(async () => {
  const h = document.body.scrollHeight;
  for (let y = window.scrollY; y < h; y += 900) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, document.body.scrollHeight);
});
await p.waitForTimeout(1500);
await p.screenshot({ path: OUT + 'look-4-footer.png' });

console.log('desktop', JSON.stringify(await p.evaluate(() => {
  const f = document.querySelector('footer');
  const panel = document.getElementById('music-panel');
  return {
    footerBottomGap: Math.round(document.body.scrollHeight - (f ? f.getBoundingClientRect().bottom + window.scrollY : 0)),
    panelPos: panel ? getComputedStyle(panel).position : 'none',
    dark: document.documentElement.classList.contains('dark'),
  };
})));

// ---------- 移动 ----------
const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await m.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await m.waitForTimeout(4000);
await m.screenshot({ path: OUT + 'look-5-mobile-hero.png' });

await m.evaluate(lastCard);
await m.waitForTimeout(1600);
await m.screenshot({ path: OUT + 'look-6-mobile-card.png' });
console.log('mobile-overlap', JSON.stringify(await m.evaluate(overlapProbe)));
console.log('mobile', JSON.stringify(await m.evaluate(() => ({
  dark: document.documentElement.classList.contains('dark'),
  fabBottomGap: Math.round(innerHeight - document.querySelector('.music-fab').getBoundingClientRect().bottom),
}))));

await b.close();
