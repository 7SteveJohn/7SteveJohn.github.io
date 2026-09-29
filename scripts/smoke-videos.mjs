/* 冒烟：卡片介绍视频布局 + 弹窗图片/链接 + 关弹窗停声
   跑法：python -m http.server 8327 → node scripts/smoke-videos.mjs */
import { createRequire } from 'module';
const require = createRequire('C:/Users/SevenJohn/.workbuddy/binaries/node/workspace/index.js');
const { chromium } = require('playwright-core');

const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('http://127.0.0.1:8327/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(2500);

const vids = await p.evaluate(() =>
  ['filebutler', 'netops-handbook', 'fluxion'].map((id) => {
    const v = document.getElementById('video-' + id);
    if (!v) return id + ':MISSING';
    const r = v.getBoundingClientRect();
    const cs = getComputedStyle(v);
    const pill = [...document.querySelectorAll('button')].some((b2) => b2.textContent.includes('介绍视频'));
    return `${id}: ${Math.round(r.width)}x${Math.round(r.height)} controls=${v.controls} fit=${cs.objectFit} pill-leftover=${pill}`;
  })
);
console.log(vids.join('\n'));

await p.evaluate(() => document.querySelector('article[data-project-id="netops-handbook"]').scrollIntoView());
await p.waitForTimeout(900);
await p.screenshot({ path: 'D:/HTML/Temp/smoke-netops-card.png' });

await p.evaluate(() => {
  window.openProjectModal('netops-handbook');
});
await p.waitForTimeout(800);
const modal = await p.evaluate(() => {
  const m = document.getElementById('project-modal');
  return `videos=${m.querySelectorAll('video').length} imgs=${m.querySelectorAll('.markdown-body img').length} dl=${m.querySelector('a[href*="iejHb4adbxpc"]') ? 'fyii-link-ok' : 'LINK-MISSING'}`;
});
console.log('modal →', modal);
await p.screenshot({ path: 'D:/HTML/Temp/smoke-netops-modal.png' });

await p.evaluate(() => window.closeProjectModal());
await p.waitForTimeout(400);
console.log('pageerrors:', errs.length ? errs.join(' | ') : 'none');
await b.close();
