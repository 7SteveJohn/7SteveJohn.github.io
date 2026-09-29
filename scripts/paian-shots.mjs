/* 拍案实机素材采集：隔离实例逐模块截图，产物 Temp/paian-cap/shot-*.png
   用法：先 PORT=4400 DATA_DIR=<副本> node server.js，再 node scripts/paian-shots.mjs
   点击用「叶子节点精确文本」匹配（app 用的是原生 div/span 按钮，role 不可靠） */
import { createRequire } from 'module';
const require = createRequire('C:/Users/SevenJohn/.workbuddy/binaries/node/workspace/index.js');
const { chromium } = require('playwright-core');

const BASE = process.env.PAIAN_BASE || 'http://127.0.0.1:4400/';
const OUT = 'D:/HTML/Temp/paian-cap/';

/* 文本点击：先找叶子节点精确匹配；找不到再按 button/a 的整体文本匹配
   （带图标的按钮没有独立的文本叶子节点，只有 button 自身 textContent） */
const clickText = (text) => {
  const norm = (e) => (e.textContent || '').trim().replace(/\s+/g, '');
  const leaf = [...document.querySelectorAll('button, a, [role="button"], [role="tab"], span, div, li')].find(
    (el) => el.children.length === 0 && norm(el) === text
  );
  if (leaf) {
    leaf.click();
    return true;
  }
  const own = [...document.querySelectorAll('button, a')].find((el) => norm(el) === text);
  if (own) {
    own.click();
    return true;
  }
  return false;
};

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(3500);

const shot = async (name) => {
  await p.screenshot({ path: OUT + 'shot-' + name + '.png' });
  console.log('shot', name);
};
const click = async (name, wait = 1600) => {
  const ok = await p.evaluate(clickText, name);
  if (ok) await p.waitForTimeout(wait);
  console.log('click', name, ok ? 'ok' : 'MISS');
  return ok;
};
// 文本前缀匹配（用于「素材抽屉3」这类带计数标签）
const clickContains = async (name, wait = 1600) => {
  const ok = await p.evaluate((t) => {
    const norm = (e) => (e.textContent || '').trim().replace(/\s+/g, '');
    const el =
      [...document.querySelectorAll('button, a, [role="button"], [role="tab"], span, div')].find(
        (e) => e.children.length === 0 && norm(e).startsWith(t)
      ) || [...document.querySelectorAll('button, a')].find((e) => norm(e).startsWith(t));
    if (el) {
      el.click();
      return true;
    }
    return false;
  }, name);
  if (ok) await p.waitForTimeout(wait);
  console.log('click~', name, ok ? 'ok' : 'MISS');
  return ok;
};

await shot('01-home');

await click('创作项目');
await shot('02-projects');

// 打开示例项目（点项目标题叶子节点）
const opened = await p.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find(
    (e) => e.children.length === 0 && /长夜拾荒者/.test(e.textContent || '') && (e.textContent || '').length < 24
  );
  if (el) {
    el.click();
    return (el.textContent || '').trim();
  }
  return null;
});
console.log('open project:', opened);
await p.waitForTimeout(2200);
await shot('03-editor');

for (const [work, tab] of [
  ['scene', '场景'],
  ['graph', '牵线'],
  ['review', '复盘'],
]) {
  if (work === 'graph') {
    // 牵线画布默认是空的，先一键牵线再拍
    if (await click('牵线', 1800)) {
      await click('一键牵线', 2600);
    }
  } else {
    await click(tab, 2200);
  }
  await shot('04-' + work);
  await click('写作', 1200);
}
await click('大纲', 2000);
await shot('05-outline');
await click('写作', 1200);

// 素材抽屉（面板展开态）
await clickContains('素材抽屉', 2200);
await shot('08-drawer');
await p.keyboard.press('Escape');
await p.waitForTimeout(800);

// 侧栏其余模块
await click('首页', 1500);
await click('灵感库', 1800);
await shot('09-ideas');
await click('统计复盘', 2200);
await shot('10-stats');
await click('卡池', 2000);
await shot('11-gacha');

await b.close();
