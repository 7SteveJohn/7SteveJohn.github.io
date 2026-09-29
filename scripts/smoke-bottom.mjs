/* 复现：页底状态（桌面+移动） */
import { createRequire } from 'module';
const require = createRequire('C:/Users/SevenJohn/.workbuddy/binaries/node/workspace/index.js');
const { chromium } = require('playwright-core');

const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
// 桌面
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push('desktop:' + String(e)));
await p.goto('http://127.0.0.1:8327/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(2500);
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(1200);
const d = await p.evaluate(() => {
  const f = document.querySelector('footer');
  const r = f.getBoundingClientRect();
  return {
    footerBottomGap: Math.round(innerHeight - r.bottom),
    docH: document.documentElement.scrollHeight,
    bodyH: document.body.scrollHeight,
    dark: document.documentElement.classList.contains('dark'),
    theme: localStorage.getItem('sj.theme'),
    panelShow: document.getElementById('music-panel').className,
    panelRect: (() => { const r2 = document.getElementById('music-panel').getBoundingClientRect(); return `${Math.round(r2.width)}x${Math.round(r2.height)}@y${Math.round(r2.top)}`; })(),
  };
});
console.log('desktop →', JSON.stringify(d));
await p.screenshot({ path: 'D:/HTML/Temp/bottom-desktop.png' });

// 移动
const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
m.on('pageerror', (e) => errs.push('mobile:' + String(e)));
await m.goto('http://127.0.0.1:8327/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await m.waitForTimeout(2500);
await m.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await m.waitForTimeout(1200);
const mm = await m.evaluate(() => {
  const f = document.querySelector('footer');
  const r = f.getBoundingClientRect();
  return {
    footerBottomGap: Math.round(innerHeight - r.bottom),
    dark: document.documentElement.classList.contains('dark'),
    theme: localStorage.getItem('sj.theme'),
    headerBG: getComputedStyle(document.querySelector('header.site-header')).backgroundColor,
    footerBG: getComputedStyle(f).backgroundColor,
    panelShow: document.getElementById('music-panel').className,
    panelRect: (() => { const r2 = document.getElementById('music-panel').getBoundingClientRect(); return `${Math.round(r2.width)}x${Math.round(r2.height)}@y${Math.round(r2.top)}`; })(),
  };
});
console.log('mobile →', JSON.stringify(mm));
await m.screenshot({ path: 'D:/HTML/Temp/bottom-mobile.png' });
console.log('pageerrors:', errs.join(' | ') || 'none');
await b.close();
