/* 拍案截图 v2：进写作页 */
import { createRequire } from 'module';
const require = createRequire('C:/Users/SevenJohn/.workbuddy/binaries/node/workspace/index.js');
const { chromium } = require('playwright-core');

const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const p = await b.newPage({ viewport: { width: 1298, height: 667 } });
await p.goto('http://127.0.0.1:4399/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(3000);

// 点「回到现场」（断点卡）
const clicked = await p.evaluate(() => {
  const cands = [...document.querySelectorAll('button, a, [role="button"], div, span')];
  const t = cands.find((el) => (el.textContent || '').trim() === '回到现场' || /回到现场/.test(el.textContent || '') && (el.textContent || '').length < 12);
  if (t) { t.click(); return (t.textContent || '').trim(); }
  return null;
});
console.log('clicked:', clicked);
await p.waitForTimeout(3500);
await p.screenshot({ path: 'D:/HTML/Temp/paian-editor.png' });

// 顶部模式：场景 / 牵线 / 复盘
for (const name of ['场景', '牵线']) {
  const ok = await p.evaluate((n) => {
    const cands = [...document.querySelectorAll('button, a, [role="tab"], span, div')];
    const t = cands.find((el) => (el.textContent || '').trim() === n && el.children.length === 0);
    if (t) { t.click(); return true; }
    return false;
  }, name);
  console.log('mode', name, ':', ok);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `D:/HTML/Temp/paian-${name}.png` });
  // 回写作模式
  await p.evaluate(() => {
    const cands = [...document.querySelectorAll('button, a, [role="tab"], span, div')];
    const t = cands.find((el) => (el.textContent || '').trim() === '写作' && el.children.length === 0);
    if (t) t.click();
  });
  await p.waitForTimeout(1200);
}
await b.close();
