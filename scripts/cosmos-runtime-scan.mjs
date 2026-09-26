/* 2.5D 规格书场景 · 交互/容灾验收（替代原星系盘版）
   覆盖规格书 §16 交互/工程项：视差 damping、星尘排斥回弹、湖面水波、滚动视差、
   后台休眠、WebGL context 恢复、移动端降级、真实音频链路
   跑法：python -m http.server 8327 → node scripts/cosmos-runtime-scan.mjs http://localhost:8327/index.html */
import { createRequire } from 'module';
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
const info = (pg) => pg.evaluate(() => window.__COSMOS.info());

/* ========== 交互（桌面） ========== */
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e));
  pg.on('console', m => {
    if (m.type() !== 'error') return;
    const where = (m.location() && m.location().url) || '';
    if ((m.text() + ' ' + where).includes('busuanzi')) return;
    errs.push('console: ' + m.text() + ' @ ' + where);
  });
  await pg.goto(URL0, { waitUntil: 'load' });
  await pg.waitForTimeout(4500);

  // 1) Camera Parallax：damped 逼近（不硬跳 = 相邻读数差值有界；最终收敛）
  await pg.mouse.move(720, 450);
  await pg.waitForTimeout(200);
  await pg.mouse.move(1350, 200, { steps: 3 });
  const c1 = (await info(pg)).cam;
  const c2 = (await info(pg)).cam;
  const jump = Math.abs(c2.x - c1.x);
  assert(jump < 0.2, '视差阻尼：相邻采样无硬跳（target+damping，非直接跟随）', 'Δ=' + jump.toFixed(4));
  await pg.waitForTimeout(2500);
  const c3 = (await info(pg)).cam;
  assert(c3.x > 0.15, '视差收敛到目标方向（鼠标右侧 → cam.x>0）', c3.x);

  // 2) 星尘排斥：鼠标划过星层 → starMaxOff 抬升
  for (let k = 0; k < 8; k++) { await pg.mouse.move(400 + k * 80, 300, { steps: 2 }); await pg.waitForTimeout(90); }
  const sOff = (await info(pg)).starMaxOff;
  assert(sOff > 0.03, '星尘受鼠标排斥（maxOff 抬升）', sOff);

  // 3) 回弹：鼠标真正离场（hasMouse=false）后弹簧衰减到 ~0
  //    （鼠标停在星层上是"按住"状态，位移有平衡值，不会回落 —— 那不是回弹失败）
  await pg.evaluate(() => window.dispatchEvent(new PointerEvent('pointerleave')));
  await pg.waitForTimeout(2500);
  const sOff2 = (await info(pg)).starMaxOff;
  assert(sOff2 < 0.05, '星尘弹簧回弹（离场后位移衰减到 ~0）', sOff + ' → ' + sOff2);

  // 4) 湖面水波：鼠标在水面区（底部 25%）移动 → ripple 注入；静止后衰减
  for (let k = 0; k < 8; k++) { await pg.mouse.move(400 + k * 70, 800, { steps: 2 }); await pg.waitForTimeout(80); }
  const r1 = (await info(pg)).ripple;
  assert(r1 > 0.05, '湖面鼠标水波已注入（ripple>0.05）', r1);
  await pg.mouse.move(720, 200);   // 离开水面
  await pg.waitForTimeout(2000);
  const r2 = (await info(pg)).ripple;
  assert(r2 < r1 * 0.5, '水波自然衰减（rippleDecay）', r1 + ' → ' + r2);

  // 5) Treble：只驱动少量星尘（uTreble 生效；粒子属性 1/4 分组，量由探针旁证）
  for (let k = 0; k < 20; k++) { await pg.evaluate(() => window.__COSMOS.feed(0.1, 0.2, 0.8, 0)); await pg.waitForTimeout(60); }
  const iT = await info(pg);
  assert(iT.audio.treble > 0.4, 'Treble 包络被吸收', iT.audio.treble);
  await pg.evaluate(() => window.__COSMOS.feed(0, 0, 0, 0));

  // 6) 后台休眠：emulate hidden → frame 停止；恢复 → 继续（规格书 §12 页面不可见暂停）
  await pg.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await pg.waitForTimeout(400);
  const h1 = (await info(pg)).frame;
  await pg.waitForTimeout(900);
  const h2 = (await info(pg)).frame;
  assert(h1 === h2, '页面不可见时暂停更新（frame 冻结）', h1 + ' vs ' + h2);
  await pg.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await pg.waitForTimeout(800);
  const h3 = (await info(pg)).frame;
  assert(h3 > h2, '页面恢复可见后继续渲染', h2 + ' → ' + h3);

  // 7) WebGL context lost / restored
  // ❗ ext 引用必须跨步骤挂在 window 上：context 丢失后 getExtension 返回 null，
  //    第二次 evaluate 重新取 ext 会拿到 null（restore 静默不执行）
  await pg.evaluate(() => {
    const c = document.getElementById('cosmos-canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    window.__loseExt = gl.getExtension('WEBGL_lose_context');
    if (window.__loseExt) window.__loseExt.loseContext();
  });
  await pg.waitForTimeout(500);
  const l1 = await info(pg);
  assert(l1.contextLost === true, 'webglcontextlost 被捕获（停帧防白屏）', l1.contextLost);
  await pg.evaluate(() => { if (window.__loseExt) window.__loseExt.restoreContext(); });
  // restore 是异步的（软渲染下更慢），轮询等事件落地
  let restored = false;
  try {
    await pg.waitForFunction(() => window.__COSMOS.info().contextLost === false, null, { timeout: 9000 });
    restored = true;
  } catch (e) {}
  assert(restored, 'webglcontextrestored 后恢复渲染', restored);

  // 8) 星河控制台 DOM 在位（本地音乐入口不丢）
  const dock = await pg.evaluate(() => !!(document.getElementById('cosmos-file') && document.getElementById('cosmos-vol')));
  assert(dock, '星河音频控制台在位（本地音乐/音量）');
  assert(errs.length === 0, '交互上下文无 console error', errs.slice(0, 4).join(' | '));
  await ctx.close();
}

/* ========== 真实音频链路（dock 文件上传 → AudioContext → Analyser FFT → 频段包络） ========== */
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e));
  await pg.goto(URL0, { waitUntil: 'load' });
  await pg.waitForTimeout(3000);
  // node 侧合成 WAV（鼓点 120BPM + 中频持续音 + 高频嚓音），走 dock 真实上传路径
  const sr = 22050, dur = 4.0, n = sr * dur;
  const wav = Buffer.alloc(44 + n * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sr, 24); wav.writeUInt32LE(sr * 2, 28); wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let v = Math.sin(2 * Math.PI * 440 * t) * 0.30;
    const beatT = t % 0.5;
    if (beatT < 0.09) v += Math.sin(2 * Math.PI * 55 * beatT) * Math.exp(-beatT * 30) * 0.85;
    if ((t % 0.25) < 0.03) v += (Math.random() * 2 - 1) * 0.35;
    wav.writeInt16LE(Math.max(-1, Math.min(1, v)) * 32767, 44 + i * 2);
  }
  await pg.setInputFiles('#cosmos-file', { name: 'scan-beat.wav', mimeType: 'audio/wav', buffer: wav });
  await pg.waitForTimeout(3000);
  const iA = await info(pg);
  assert(iA.audio.playing === true, '本地音乐上传后真实播放（playing 事件）', iA.audio.playing);
  assert(iA.audio.bass > 0.05, 'Analyser FFT → Bass 包络（真实链路，非 feed 后门）', iA.audio.bass);
  assert(iA.audio.mid > 0.05, 'Analyser FFT → Mid 包络', iA.audio.mid);
  const pulseSeen = iA.pulse > 0.05 || iA.audio.beat > 0.02 || iA.audio.bass > 0.15;
  assert(pulseSeen, '鼓点被频段吸收（bass/pulse 有响应）', 'bass=' + iA.audio.bass + ' pulse=' + iA.pulse);
  await pg.evaluate(() => { const el = document.getElementById('cosmos-audio'); if (el) el.pause(); });
  assert(errs.length === 0, '音频上下文无 pageerror', errs.slice(0, 4).join(' | '));
  await ctx.close();
}

/* ========== 移动端降级 ========== */
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', hasTouch: true, isMobile: true });
  const pg = await ctx.newPage();
  await pg.goto(URL0, { waitUntil: 'load' });
  await pg.waitForTimeout(4000);
  const iM = await info(pg);
  assert(iM.counts.stars <= 500, '移动端星尘 ≤500 粒子', iM.counts.stars);
  assert(iM.dpr <= 1.5, '移动端 DPR ≤1.5', iM.dpr);
  assert(iM.frame > 10, '移动端正常渲染', iM.frame);
  await ctx.close();
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
await b.close();
process.exit(fail ? 1 : 0);
