/* 本地推理场（neural-field）· 视觉/运动验收
   覆盖：静默永不停笔、脉冲沿边推进、前传波、律动克制、减少动效慢动不停
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
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
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
      top: zone(0, 0, W, H * 0.22),        // 标题区（hero 文字所在带）
      core: zone(W * 0.3, H * 0.3, W * 0.7, H * 0.7)   // 深层向内收的核心区
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
  assert(i0 && i0.engine === 'neural-field', '探针 __COSMOS 存在（推理场引擎）', i0 && i0.engine);
  assert(i0.field.nodes >= 150, '桌面节点数 ≥150', i0.field.nodes);
  assert(i0.field.edges >= i0.field.nodes, '连边已建立（≥节点数）', i0.field.edges);
  assert(i0.field.pulses >= 15, '常驻推理脉冲 ≥15', i0.field.pulses);
  assert(i0.dpr <= 2, 'DPR ≤ 2', i0.dpr);

  await pg.waitForTimeout(1200);
  const i1 = await info(pg);
  assert(i1.frame > i0.frame, 'frame 持续增长', i0.frame + ' → ' + i1.frame);
  assert(i1.sceneT > i0.sceneT, 'sceneT 持续递增（环境时间不止）', i0.sceneT + ' → ' + i1.sceneT);
  assert(i1.field.pulseT !== i0.field.pulseT, '脉冲沿边推进（pulseT 变化）',
    i0.field.pulseT + ' → ' + i1.field.pulseT);
  assert(i1.field.heatMax > 0, '脉冲余温存在（heatMax>0）', i1.field.heatMax);

  const s1 = await canvasShot(pg, OUT + 'm1.png');
  assert(s1.stats.all.mean >= 4 && s1.stats.all.mean <= 45, '亮度均值 4~45/255（暗但不死黑）', JSON.stringify(s1.stats.all));
  assert(s1.stats.all.dark >= 0.45 && s1.stats.all.dark <= 0.95, '暗部占比 45%~95%（网不糊成一片）', s1.stats.all.dark);
  assert(s1.stats.top.mean <= s1.stats.core.mean, '顶部带不亮于核心区（标题不被压）',
    'top=' + s1.stats.top.mean + ' core=' + s1.stats.core.mean);

  // ❗用户回归：静默态永远微动态 —— 连拍 3 张（间隔 2s），签名两两不同
  await pg.waitForTimeout(2000);
  const s2 = await canvasShot(pg, OUT + 'm2.png');
  await pg.waitForTimeout(2000);
  const s3 = await canvasShot(pg, OUT + 'm3.png');
  assert(s1.sha !== s2.sha && s2.sha !== s3.sha, '静默持续微动态（2s 间隔签名三连不同，不停笔）',
    s1.sha + '/' + s2.sha + '/' + s3.sha);

  // 滚动：画布锁在视口原点 + 纵深视差
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
  await pg.waitForTimeout(400);

  // Bass：连边底亮随低频抬升（呼吸，不是爆闪）
  const base0 = (await info(pg)).field.edgeLum;
  for (let k = 0; k < 25; k++) { await pg.evaluate(() => window.__COSMOS.feed(0.8, 0.3, 0.2, 0)); await pg.waitForTimeout(60); }
  const iB = await info(pg);
  assert(iB.audio.bass > 0.5, 'Bass 包络被吸收', iB.audio.bass);
  assert(iB.field.edgeLum > base0 * 1.2, 'Bass → 连边底亮抬升（不是爆闪）', base0 + ' → ' + iB.field.edgeLum);
  assert(iB.cam.fov <= 60.5, '无 Beat 时 FOV 不动（律动克制）', iB.cam.fov);

  // Mid：脉冲推进加速
  const pA = (await info(pg)).field.pulseT;
  await pg.waitForTimeout(120);
  const pB = (await info(pg)).field.pulseT;
  assert(pA !== pB, 'Mid 注入下脉冲持续推进', pA + ' → ' + pB);

  // Beat：一次完整前传（wave 起、波前推进）+ FOV 脉冲
  // ❗feed 持续给 beat 时 pulse 停在高位，justBeat 只在上穿瞬间触发一次；
  //   先断 feed 让包络落回，再喂一记短 beat，抓 wave 飞行窗口（waveSpeed 1.6，约 0.9s）
  for (let k = 0; k < 20; k++) { await pg.evaluate(() => window.__COSMOS.feed(0.3, 0.2, 0.1, 0.9)); await pg.waitForTimeout(60); }
  const iBeat = await info(pg);
  assert(iBeat.pulse > 0.3, 'Beat 脉冲被吸收', iBeat.pulse);
  assert(iBeat.field.young >= 1, 'Beat → 从输入层放出一批脉冲', iBeat.field.young);
  assert(iBeat.cam.fov > 60.1 && iBeat.cam.fov <= 61.0, 'Beat → FOV 脉冲（60.0→≤61.0，看得见的呼吸）', iBeat.cam.fov);
  await pg.waitForTimeout(1400);                       // pulse 衰减回 0（release 0.07）
  await pg.evaluate(() => window.__COSMOS.feed(0.3, 0.2, 0.1, 0.9));
  await pg.waitForTimeout(150);
  const iWave = await info(pg);
  assert(iWave.field.wave > 0 || iWave.field.wavePos > -0.3, 'Beat → 前传波起（逐层点亮）',
    'wave=' + iWave.field.wave + ' wavePos=' + iWave.field.wavePos);
  const wp1 = iWave.field.wavePos;
  await pg.waitForTimeout(250);
  const wp2 = (await info(pg)).field.wavePos;
  assert(wp2 !== wp1, '前传波波前在推进（wavePos 变化）', wp1 + ' → ' + wp2);

  // Treble：只碰少数节点（uTreble 生效）
  for (let k = 0; k < 20; k++) { await pg.evaluate(() => window.__COSMOS.feed(0.1, 0.2, 0.8, 0)); await pg.waitForTimeout(60); }
  const iT = await info(pg);
  assert(iT.audio.treble > 0.4, 'Treble 包络被吸收', iT.audio.treble);
  assert(iT.field.trebleU > 0.05, 'Treble → 节点提亮 uniform 生效', iT.field.trebleU);

  // 停 feed：包络平滑回落（单调不升 + 总体回落；软渲染帧稀疏，逐点严格递减会误判）
  const r1 = (await info(pg)).audio.bass;
  await pg.waitForTimeout(700);
  const r2 = (await info(pg)).audio.bass;
  await pg.waitForTimeout(1200);
  const r3 = (await info(pg)).audio.bass;
  assert(r1 >= r2 && r2 >= r3 && r1 > r3, '停 feed 后平滑回落（不回弹，总体递减）', r1 + ' → ' + r2 + ' → ' + r3);

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
  assert(rs1.stats.all.mean >= 4, '减少动效下仍画出成型网络', JSON.stringify(rs1.stats.all));
  // 放歌（feed）→ 视觉仍响应
  for (let k = 0; k < 20; k++) { await pg.evaluate(() => window.__COSMOS.feed(0.8, 0.3, 0.2, 0.5)); await pg.waitForTimeout(60); }
  const iF = await info(pg);
  assert(iF.audio.bass > 0.4 && iF.field.edgeLum > 0.1, '减少动效下放歌仍随拍响应',
    'bass=' + iF.audio.bass + ' edgeLum=' + iF.field.edgeLum);
  assert(errs.length === 0, 'reduce-motion 上下文无报错', errs.slice(0, 4).join(' | '));
  await ctx.close();
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
await b.close();
process.exit(fail ? 1 : 0);
