/* 路人视角首访截图 */
import { createRequire } from 'module';
const require = createRequire('C:/Users/SevenJohn/.workbuddy/binaries/node/workspace/index.js');
const { chromium } = require('playwright-core');

const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:8327/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(4500); // 等首屏动画/背景起来
await p.screenshot({ path: 'D:/HTML/Temp/first-look-hero.png' });

// 往下滚两屏看节奏
await p.evaluate(() => window.scrollBy(0, window.innerHeight * 0.95));
await p.waitForTimeout(1200);
await p.screenshot({ path: 'D:/HTML/Temp/first-look-2.png' });
await p.evaluate(() => window.scrollBy(0, window.innerHeight * 0.95));
await p.waitForTimeout(1200);
await p.screenshot({ path: 'D:/HTML/Temp/first-look-3.png' });

// 手机视角
const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await m.goto('http://127.0.0.1:8327/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await m.waitForTimeout(4000);
await m.screenshot({ path: 'D:/HTML/Temp/first-look-mobile.png' });
await b.close();
