/* 扫描各滚动位置的"运动量"：帧间像素差 + __GL.state() */
import { createRequire } from 'module';
const require = createRequire('C:/Users/SevenJohn/.workbuddy/binaries/node/workspace/index.js');
const { chromium } = require('playwright-core');
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:8327/index.html';
const OUT = 'C:/Users/SevenJohn/AppData/Local/Temp/pw-test/scan';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  channel: 'msedge',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
});
const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
pg.on('pageerror', e => errs.push(String(e)));
pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await pg.goto(URL, { waitUntil: 'load' });
await pg.waitForTimeout(3500);

const pos = await pg.evaluate(() => {
  const ids = ['#home', '#metrics', '#products', '#philosophy', '#about', '#blog'];
  const o = {};
  for (const s of ids) { const el = document.querySelector(s); o[s] = el ? el.offsetTop : null; }
  const arts = [...document.querySelectorAll('#products article')].map(a => a.offsetTop);
  return { ids: o, arts, docH: document.body.scrollHeight };
});
console.log('sections', JSON.stringify(pos));

const targets = [
  ['hero-top', 0],
  ['hero-settle', 0],
  ['metrics', pos.ids['#metrics']],
  ['prod0', pos.arts[0] || pos.ids['#products']],
  ['prod1', pos.arts[1] || pos.ids['#products'] + 900],
  ['prod2', pos.arts[2] || pos.ids['#products'] + 1800],
  ['philosophy', pos.ids['#philosophy']],
  ['about', pos.ids['#about']],
];

for (const [name, y] of targets) {
  await pg.evaluate(v => window.scrollTo(0, v), y);
  await pg.waitForTimeout(1600);            // 让凝聚/镜头都落定
  const s1 = await pg.evaluate(() => window.__GL && window.__GL.state());
  const a = await pg.screenshot({ path: `${OUT}/${name}-a.png` });
  await pg.waitForTimeout(700);
  const b2 = await pg.screenshot({ path: `${OUT}/${name}-b.png` });
  const op = await pg.evaluate(() => {
    const c = document.querySelector('.gl-stage canvas');
    return c ? +(getComputedStyle(c).opacity) : null;
  });
  console.log(name.padEnd(12), 'y=' + String(y).padEnd(6), 'op=' + op, JSON.stringify(s1),
    'bytes', a.length, b2.length);
}
console.log('errors', errs.length ? errs.slice(0, 6) : '无');
await b.close();
