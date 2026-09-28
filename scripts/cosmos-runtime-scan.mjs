/* 本地推理场（neural-field）· 交互/容灾验收
   覆盖：视差 damping、光标邻近提亮、点击触发局部推理、后台休眠、WebGL context 恢复、
   移动端降级、真实音频链路、hero 入口
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
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
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

  // 2) 光标邻近提亮：uGlow 只在指针在场时生效
  const g1 = (await info(pg)).field.glowU;
  assert(g1 > 0, '指针在场 → 节点邻近提亮生效', g1);
  await pg.evaluate(() => window.dispatchEvent(new PointerEvent('pointerleave')));
  await pg.waitForTimeout(500);
  const g2 = (await info(pg)).field.glowU;
  assert(g2 === 0, '指针离场 → 邻近提亮归零（不残留高亮）', g2);

  // 3) 点击 → 从最近节点放一记局部推理（young 脉冲数跳升）
  await pg.mouse.move(700, 500);
  await pg.waitForTimeout(400);
  const y0 = (await info(pg)).field.young;
  await pg.mouse.click(700, 500);
  let kicked = true;
  try {
    await pg.waitForFunction((v) => window.__COSMOS.info().field.young > v, y0, { timeout: 6000 });
  } catch (e) { kicked = false; }
  const y1 = (await info(pg)).field.young;
  assert(kicked && y1 > y0, '点击 → 局部放出推理脉冲（young 跳升）', y0 + ' → ' + y1);

  // 4) 脉冲始终在跑：轮询等 pulseT 变化（软渲染帧率极低，别用固定等待）
  const t1 = (await info(pg)).field.pulseT;
  let moved = true;
  try {
    await pg.waitForFunction((v) => window.__COSMOS.info().field.pulseT !== v, t1, { timeout: 9000 });
  } catch (e) { moved = false; }
  const t2 = (await info(pg)).field.pulseT;
  assert(moved && t1 !== t2, '静默下脉冲仍在推进（不停摆）', t1 + ' → ' + t2);

  // 5) 后台休眠：emulate hidden → frame 冻结；恢复 → 继续
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
  // 软渲染下帧率极低（个位），用轮询等"帧号真的往前走"，别用固定等待赌运气
  let resumed = false;
  try {
    await pg.waitForFunction((f) => window.__COSMOS.info().frame > f, h2, { timeout: 9000 });
    resumed = true;
  } catch (e) {}
  const h3 = (await info(pg)).frame;
  assert(resumed && h3 > h2, '页面恢复可见后继续渲染', h2 + ' → ' + h3);

  // 6) WebGL context lost / restored
  // ❗ ext 引用必须跨步骤挂在 window 上：context 丢失后 getExtension 返回 null
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
  let restored = false;
  try {
    await pg.waitForFunction(() => window.__COSMOS.info().contextLost === false, null, { timeout: 9000 });
    restored = true;
  } catch (e) {}
  assert(restored, 'webglcontextrestored 后恢复渲染', restored);

  // 7) 推理场音频链路 DOM 在位（悬浮面板已删，保留隐藏 input 与音轨）
  const dock = await pg.evaluate(() => !!(document.getElementById('cosmos-file') && document.getElementById('cosmos-audio')));
  assert(dock, '推理场音频链路在位（隐藏 input + 音轨）');
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
  assert(iA.audio.playing === true, '本地音乐上传后真实播放（playing）', iA.audio.playing);
  assert(iA.audio.bass > 0.05, 'Analyser FFT → Bass 包络（真实链路，非 feed 后门）', iA.audio.bass);
  assert(iA.audio.mid > 0.05, 'Analyser FFT → Mid 包络', iA.audio.mid);
  assert(iA.field.edgeLum > 0.11, '真实音乐 → 连边底亮抬升', iA.field.edgeLum);
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
  assert(iM.field.nodes <= 200, '移动端节点降级 ≤200', iM.field.nodes);
  assert(iM.field.pulses <= 20, '移动端脉冲降级 ≤20', iM.field.pulses);
  assert(iM.dpr <= 1.5, '移动端 DPR ≤1.5', iM.dpr);
  assert(iM.frame > 10, '移动端正常渲染', iM.frame);
  await ctx.close();
}

/* ========== hero「放首歌」入口 ========== */
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e));
  await pg.goto(URL0, { waitUntil: 'load' });
  await pg.waitForTimeout(3000);
  const btn = await pg.evaluate(() => !!document.getElementById('cosmos-enter') && !!window.__MUSIC);
  assert(btn, 'hero「放首歌」入口在位（按钮 + __MUSIC API）');
  if (btn) {
    await pg.click('#cosmos-enter');
    await pg.waitForTimeout(2500);
    const iE = await info(pg);
    assert(iE.audio.playing === true && iE.audio.bass > 0.02,
      '点击入口后推理场随站点歌单运行（bass>0）', 'bass=' + iE.audio.bass);
    await pg.click('#cosmos-enter');   // 再点 = 暂停
    await pg.waitForTimeout(1500);
    const iE2 = await info(pg);
    assert(iE2.audio.bass < iE.audio.bass, '再点入口暂停 → 包络回落', iE.audio.bass + ' → ' + iE2.audio.bass);
  }
  assert(errs.length === 0, '入口上下文无 pageerror', errs.slice(0, 3).join(' | '));
  await ctx.close();
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
await b.close();
process.exit(fail ? 1 : 0);
