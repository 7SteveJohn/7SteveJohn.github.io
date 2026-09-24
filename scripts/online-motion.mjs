/* 线上站动效终检：静止 2 秒的帧间像素差，判定"背景是不是活的" */
import { createRequire } from 'module';
const require = createRequire('C:/Users/SevenJohn/.workbuddy/binaries/node/workspace/index.js');
const { chromium } = require('playwright-core');
import fs from 'fs';

const OUT = 'C:/Users/SevenJohn/AppData/Local/Temp/pw-test/online';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
pg.on('pageerror', e => errs.push(String(e)));
await pg.goto('https://7stevejohn.github.io/', { waitUntil: 'load' });
await pg.waitForTimeout(6000);

const stops = await pg.evaluate(() => {
  const arts = [...document.querySelectorAll('#products article')].map(a => a.offsetTop);
  return { arts, phil: document.querySelector('#philosophy').offsetTop };
});

const cases = [['hero', 0], ['prod0', stops.arts[0]], ['prod2', stops.arts[2]], ['phil', stops.phil]];
for (const [nm, y] of cases) {
  await pg.evaluate(v => window.scrollTo(0, v), y);
  await pg.waitForTimeout(2200);                 // 落定后再测：这才是"静止时是否还是动的"
  await pg.screenshot({ path: `${OUT}/${nm}-a.png` });
  await pg.waitForTimeout(800);
  await pg.screenshot({ path: `${OUT}/${nm}-b.png` });
  const st = await pg.evaluate(() => {
    const c = document.querySelector('.gl-stage canvas');
    return { gl: window.__GL ? window.__GL.state() : null, op: c ? +getComputedStyle(c).opacity : null };
  });
  console.log(nm.padEnd(7), 'op=' + st.op, JSON.stringify(st.gl));
}
console.log('errors:', errs.length ? errs.slice(0, 5) : '无');
await b.close();
