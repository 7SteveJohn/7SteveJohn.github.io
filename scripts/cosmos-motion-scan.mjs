/* 2.5D 规格书场景 · 视觉/运动验收（替代原星系盘版）
   覆盖规格书 §16 视觉/音乐项 + 用户回归：静默永远微动态（不停笔）、律动克制
   跑法：python -m http.server 8327 → node scripts/cosmos-motion-scan.mjs http://localhost:8327/index.html */
import { createRequire } from 'module';
import fs from 'fs';
import crypto from 'crypto';
const require = createRequire('C:/Users/SevenJohn/.workbuddy/binaries/node/workspace/index.js');
const { chromium } = require('playwright-core');
const URL0 = process.argv[2] || 'http://localhost:8327/index.html';

let pass = 0, fail = 0;
const ok = (name, extra) => { pass++; console.log('PASS ', name, extra || ''); };
const bad = (name, extra) => { fail++; console.log('FAIL ', name, extra || ''); };
const assert = (cond, name, extra) => cond ? ok(name, extra) : bad(name, extra);

const b = await chromium.launch({
  channel: 'msedge',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist',
         '--autoplay-policy=no-user-gesture-required']
});

async function newPg(ctxOpts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', ...ctxOpts });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e));
  pg.on('console', m => {
    if (m.type() !== 'error') return;
    const where = (m.location() && m.location().url) || '';
    if ((m.text() + ' ' + where).includes('busuanzi')) return;
    if (m.text().includes('404') && !where) return;
    errs.push('console: ' + m.text() + ' @ ' + where);
  });
  await pg.goto(URL0, { waitUntil: 'load' });
  return { pg, errs, ctx };
}

// 画布截图 → 页面内解码统计 + 文件 sha1（WebGL 下 toDataURL/readPixels 不可靠）
async function canvasShot(pg, path) {
  await pg.evaluate(() => {
    for (const el of document.body.children) {
      if (el.id !== 'cosmos-canvas' && el.id !== 'cosmos-veil') el.style.visibility = 'hidden';
    }
  });
  await pg.waitForTimeout(80);
  const box = await pg.locator('#cosmos-canvas').boundingBox();
  await pg.screenshot({ path, clip: box });
  const dataUrl = 'data:image/png;base64,' + fs.readFileSync(path).toString('base64');
  const stats = await pg.evaluate(async (du) => {
    const img = new Image();
    await new Promise(res => { img.onload = res; img.src = du; });
    const o = document.createElement('canvas'); o.width = img.width; o.height = img.height;
    const g = o.getContext('2d');
    g.drawImage(img, 0, 0);
    const zone = (x0, y0, x1, y1) => {
      const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      let sum = 0, n = 0, dark = 0;
      for (let i = 0; i < d.length; i += 16) {
        const l = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        sum += l; n++; if (l < 12) dark++;
      }
      return { mean: +(sum / n).toFixed(2), dark: +(dark / n).toFixed(3) };
    };
    const W = o.width, H = o.height;
    return {
      all: zone(0, 0, W, H),
      top: zone(0, 0, W, H * 0.3),
      band: zone(0, H * 0.35, W, H * 0.62),
      lake: zone(0, H * 0.8, W, H)
    };
  }, dataUrl);
  return { stats, sha: crypto.createHash('sha1').update(fs.readFileSync(path)).digest('hex').slice(0, 10) };
}

const OUT = 'C:/Users/SevenJohn/AppData/Local/Temp/pw-test/scan/cosmos/';
const info = (pg) => pg.evaluate(() => window.__COSMOS.info());

/* ========== 主上下文 ========== */
{
  const { pg, errs, ctx } = await newPg();
  await pg.waitForTimeout(5000);

  const i0 = await info(pg);
  assert(i0 && i0.engine === 'spec-2.5d', '探针 __COSMOS 存在（2.5D 引擎）', i0 && i0.engine);
  assert(i0.counts.stars >= 700, '桌面星尘 ≥700 粒子', i0.counts.stars);
  assert(i0.dpr <= 2, 'DPR ≤ 2', i0.dpr);

  await pg.waitForTimeout(1200);
  const i1 = await info(pg);
  assert(i1.frame > i0.frame, 'frame 持续增长', i0.frame + ' → ' + i1.frame);
  assert(i1.sceneT > i0.sceneT, 'sceneT 持续递增（环境时间不止）', i0.sceneT + ' → ' + i1.sceneT);

  const s1 = await canvasShot(pg, OUT + 'm1.png');
  assert(s1.stats.all.mean >= 6 && s1.stats.all.mean <= 45, '亮度均值 6~45/255（深邃但看得见）', JSON.stringify(s1.stats.all));
  assert(s1.stats.top.mean < s1.stats.band.mean, '顶部负空间暗于银河带（标题区不被干扰）',
    'top=' + s1.stats.top.mean + ' band=' + s1.stats.band.mean);
  assert(s1.stats.lake.mean > 1.5, '湖面非死黑（倒影/基色可见）', s1.stats.lake.mean);

  // ❗用户回归：静默态永远微动态 —— 连拍 3 张（间隔 2s），签名两两不同
  await pg.waitForTimeout(2000);
  const s2 = await canvasShot(pg, OUT + 'm2.png');
  await pg.waitForTimeout(2000);
  const s3 = await canvasShot(pg, OUT + 'm3.png');
  assert(s1.sha !== s2.sha && s2.sha !== s3.sha, '静默持续微动态（2s 间隔签名三连不同，不停笔）',
    s1.sha + '/' + s2.sha + '/' + s3.sha);

  // 滚动：画布锁在视口原点
  await pg.evaluate(() => scrollTo(0, innerHeight * 1.2));
  await pg.waitForTimeout(600);
  const rect = await pg.evaluate(() => {
    const r = document.getElementById('cosmos-canvas').getBoundingClientRect();
    return { top: r.top, left: r.left };
  });
  assert(rect.top === 0 && rect.left === 0, '滚动后画布锁在视口原点', JSON.stringify(rect));
  const iScr = await info(pg);
  assert(iScr.cam.y < -0.15, '滚动产生纵深视差（cam.y 下沉）', iScr.cam.y);
  await pg.evaluate(() => scrollTo(0, 0));

  // Bass：feed 后 SkyLayer/WaterLayer uBass 生效（呼吸，不是爆闪）
  for (let k = 0; k < 25; k++) { await pg.evaluate(() => window.__COSMOS.feed(0.8, 0.3, 0.2, 0)); await pg.waitForTimeout(60); }
  const iB = await info(pg);
  assert(iB.audio.bass > 0.5, 'Bass 包络被吸收', iB.audio.bass);
  assert(iB.uBass > 0.3, 'Bass 驱动湖面反射（uBass）', iB.uBass);
  assert(iB.cam.fov <= 60.5, '无 Beat 时 FOV 不动（律动克制）', iB.cam.fov);

  // Beat：pulse 触发极轻微 FOV 脉冲（60→≤60.35）
  for (let k = 0; k < 20; k++) { await pg.evaluate(() => window.__COSMOS.feed(0.3, 0.2, 0.1, 0.9)); await pg.waitForTimeout(60); }
  const iBeat = await info(pg);
  assert(iBeat.pulse > 0.3, 'Beat 脉冲被吸收', iBeat.pulse);
  assert(iBeat.cam.fov > 60.02 && iBeat.cam.fov <= 60.35, 'Beat → FOV 极轻微脉冲（60.0→≤60.35，空间呼吸不是网页震动）', iBeat.cam.fov);

  // 停 feed：包络平滑回落（连续读数递减，无硬跳）
  const r1 = (await info(pg)).audio.bass;
  await pg.waitForTimeout(700);
  const r2 = (await info(pg)).audio.bass;
  await pg.waitForTimeout(1200);
  const r3 = (await info(pg)).audio.bass;
  assert(r1 > r2 && r2 >= r3 && r2 > 0.005, '停 feed 后平滑回落（递减不硬跳）', r1 + ' → ' + r2 + ' → ' + r3);

  const veil = await pg.evaluate(() => !!document.querySelector('.cosmos-veil'));
  assert(veil, '.cosmos-veil 已挂载');
  assert(errs.length === 0, '主上下文无 console error / pageerror', errs.slice(0, 4).join(' | '));
  await ctx.close();
}

/* ========== reduce-motion：极慢连续动，不再停笔（用户回归） ========== */
{
  const { pg, errs, ctx } = await newPg({ reducedMotion: 'reduce' });
  await pg.waitForTimeout(4500);
  const i0 = await info(pg);
  assert(i0.reduceMotion === true, 'reduce-motion 已识别', i0.reduceMotion);
  assert(i0.timeScale < 1, 'timeScale 降速（而非停笔）', i0.timeScale);
  await pg.waitForTimeout(1500);
  const i1 = await info(pg);
  assert(i1.frame > i0.frame, '减少动效下帧持续推进（不停笔）', i0.frame + ' → ' + i1.frame);
  assert(i1.sceneT > i0.sceneT, '减少动效下场景时间仍流动', i0.sceneT + ' → ' + i1.sceneT);
  const rs1 = await canvasShot(pg, OUT + 'rm1.png');
  assert(rs1.stats.all.mean >= 5, '减少动效下仍画出成型星图', JSON.stringify(rs1.stats.all));
  // 放歌（feed）→ 视觉仍响应
  for (let k = 0; k < 20; k++) { await pg.evaluate(() => window.__COSMOS.feed(0.8, 0.3, 0.2, 0.5)); await pg.waitForTimeout(60); }
  const iF = await info(pg);
  assert(iF.audio.bass > 0.4 && iF.uBass > 0.2, '减少动效下放歌仍随拍呼吸', 'bass=' + iF.audio.bass + ' uBass=' + iF.uBass);
  assert(errs.length === 0, 'reduce-motion 上下文无报错', errs.slice(0, 4).join(' | '));
  await ctx.close();
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
await b.close();
process.exit(fail ? 1 : 0);
