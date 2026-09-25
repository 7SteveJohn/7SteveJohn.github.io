/* 星河运行时链路扫描（scripts/cosmos-runtime-scan.mjs）
   ------------------------------------------------------------
   补 cosmos-motion-scan.mjs 覆盖不到的三块（全部走真实链路，不用 feed 后门）：

   A. 真实音频：
      ① 上传本地合成鼓点 WAV → 自有 AnalyserNode（createMediaElementSource 真建一次）
      ② 站点歌单（player.js beatLoop → window.__BEAT → 星河吸收）
      ③ 双向互斥让位：歌单开播本地曲闭嘴 / 本地曲再开播歌单闭嘴
   B. 性能看门狗：软渲染下必然超预算 → quality 自动降档且重建后八层仍齐
   C. 降帧机制（throttle 探针直读帧率档）：失焦 16 / 回焦 48 / 切后台 5（interval 接管）
   D. 移动端视口 390×844：密度自动折算、面板缩档、滚动锁定

   跑法（仓库根）：
     python -m http.server 8327
     node scripts/cosmos-runtime-scan.mjs
   ------------------------------------------------------------ */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire('C:/Users/SevenJohn/.workbuddy/binaries/node/workspace/index.js');
const { chromium } = require('playwright-core');

const URL = process.argv[2] || 'http://127.0.0.1:8327/index.html';
const OUT = 'C:/Users/SevenJohn/AppData/Local/Temp/pw-test/scan/cosmos';
const WAV = path.join('D:/HTML', '__cosmos-test-drum.wav');   // 临时鼓点音轨，跑完即删
const WAV_URL = '/__cosmos-test-drum.wav';
fs.mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const ok = (n, c, x) => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (x !== undefined ? '  ' + x : '')); c ? pass++ : fail++; };

/* —— 合成 8 秒 120BPM 鼓点loop：55Hz 底鼓（bins 1~8）+ 反拍嚓音（bins 70~210）+ 中频三音旋律 —— */
function makeDrumWav() {
  const SR = 22050, N = SR * 8;
  const data = Buffer.alloc(N * 2);
  for (let i = 0; i < N; i++) {
    const t = i / SR, tb = t % 0.5;
    let v = 0;
    if (tb < 0.35) v += Math.sin(2 * Math.PI * 55 * tb) * 0.9 * Math.exp(-tb / 0.10);       // 底鼓
    const th = (t + 0.25) % 0.5;
    if (th < 0.05) v += (Math.random() * 2 - 1) * 0.30 * Math.exp(-th / 0.012);             // 嚓音
    const te = t % 0.25, f = [330, 440, 550][Math.floor(t / 0.25) % 3];
    if (te < 0.2) v += Math.sin(2 * Math.PI * f * te) * 0.18 * Math.exp(-te / 0.09);        // 旋律
    data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 26000))), i * 2);
  }
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVE', 8);
  hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20);
  hdr.writeUInt16LE(1, 22); hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 2, 28);
  hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
  hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
  fs.writeFileSync(WAV, Buffer.concat([hdr, data]));
}

const b = await chromium.launch({
  channel: 'msedge',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist',
         '--autoplay-policy=no-user-gesture-required']   // 测试需程序化 play()，绕过自动播放手势限制
});
const errs = [];

try {
  makeDrumWav();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(String(e)));
  pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await pg.goto(URL, { waitUntil: 'load' });
  await pg.waitForTimeout(4500);            // 入场走完 + 探针就绪

  /* —— A. 真实音频链路 —— */
  await pg.evaluate(() => {                 // 音量拉满，排除 0.7 默认音量对 analyser 输入的衰减
    const el = document.getElementById('cosmos-vol');
    el.value = '100';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await pg.setInputFiles('#cosmos-file', WAV);
  await pg.waitForTimeout(1000);
  ok('① 上传后自动开播', await pg.evaluate(() => !document.getElementById('cosmos-audio').paused));
  ok('① 状态文案标记本地曲目', (await pg.textContent('#cosmos-state')).includes('本地曲目'));
  await pg.waitForTimeout(3000);
  const a1 = await pg.evaluate(() => window.__COSMOS.info().audio);
  ok('① 自有 AnalyserNode 吸收低频（底鼓）', a1.bass > 0.12, JSON.stringify(a1));
  ok('① 吸收中频（旋律）', a1.mid > 0.03, 'mid=' + a1.mid);
  ok('① 吸收高频（嚓音）', a1.treble > 0.015, 'treble=' + a1.treble);

  // ①' 拍点格式回归：站点歌单走 player.js 的 b.level（离散拍包络）。
  // 曾误用 b.lv 连续能量做二次检测——流行歌能量常年高企 → 包络饱和"只呼吸不跳"（用户实测律动失效）
  await pg.evaluate(() => { window.__BEAT = { level: 0.9, mid: 0.4, treble: 0.3 }; });
  await pg.waitForTimeout(700);
  const la = await pg.evaluate(() => window.__COSMOS.info().audio);
  ok('① 拍点走 b.level（level-only 新格式也响应）', la.bass > 0.25 && la.mid > 0.08, JSON.stringify(la));

  await pg.evaluate(wav => {                // 站点歌单开播（player.js 的 play 事件会兜底 startBeat）
    const el = document.getElementById('music-audio');
    el.loop = true;
    el.src = wav;
    return el.play().then(() => 'ok').catch(e => Promise.reject(new Error(e.message)));
  }, WAV_URL);
  await pg.waitForTimeout(1500);
  ok('② 站点歌单开播 → 本地曲目让位暂停', await pg.evaluate(() => document.getElementById('cosmos-audio').paused));
  const beat = await pg.evaluate(() => window.__BEAT || null);
  ok('② player.js 产出 __BEAT（lv/level/mid/treble）',
    !!beat && typeof beat.lv === 'number' && typeof beat.level === 'number' &&
    typeof beat.mid === 'number' && typeof beat.treble === 'number');
  await pg.waitForTimeout(3000);
  const a2 = await pg.evaluate(() => window.__COSMOS.info().audio);
  ok('② 星河从站点歌单吸收低频', a2.bass > 0.08, JSON.stringify(a2));
  ok('② 状态文案如实标记站点歌单', (await pg.textContent('#cosmos-state')).includes('站点歌单'));

  await pg.evaluate(() => document.getElementById('cosmos-audio').play());
  await pg.waitForTimeout(1400);
  ok('③ 本地曲再开播 → 站点歌单闭嘴', await pg.evaluate(() => document.getElementById('music-audio').paused));
  await pg.evaluate(() => document.getElementById('cosmos-audio').pause());   // 静下来再测 B/C
  const dcounts = await pg.evaluate(() => window.__COSMOS.info().counts);

  /* —— B. 性能看门狗：软渲染整页 ~3-5fps，必然超 26ms 预算 → 自动降档 —— */
  let q = 1;
  for (let k = 0; k < 16; k++) {
    await pg.waitForTimeout(2500);
    q = await pg.evaluate(() => window.__COSMOS.info().quality);
    if (q < 1) break;
  }
  ok('看门狗自动降档（quality < 1）', q < 1, 'quality=' + q);
  const rc = await pg.evaluate(() => window.__COSMOS.info().counts);
  ok('降档重建后八层仍齐', [rc.far, rc.fiber, rc.arm, rc.dust, rc.faint, rc.bright, rc.mote, rc.mist].every(v => v > 0));

  /* —— C. 降帧机制：throttle 探针直读帧率档 —— */
  const waitThrottle = async (expect, label) => {
    let got = null;
    for (let k = 0; k < 12; k++) {
      await pg.waitForTimeout(400);
      got = await pg.evaluate(() => window.__COSMOS.info().throttle);
      if (got === expect) break;
    }
    ok(label, got === expect, 'throttle=' + got);
  };
  await pg.evaluate(() => window.dispatchEvent(new Event('blur')));
  await waitThrottle(16, '失焦 → fpsBlur 16');
  await pg.evaluate(() => window.dispatchEvent(new Event('focus')));
  await waitThrottle(48, '回焦 → fpsActive 48');
  await pg.evaluate(() => {                 // 接管 document.hidden 并派发事件 → onVisibility 走 interval 分支
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await waitThrottle(5, '切后台 → fpsHidden 5');
  const fr1 = await pg.evaluate(() => window.__COSMOS.info().frame);
  await pg.waitForTimeout(1600);
  const fr2 = await pg.evaluate(() => window.__COSMOS.info().frame);
  ok('后台下循环仍以低频推进（interval 接管，帧增量≈5fps×1.6s）',
    fr2 > fr1 && fr2 - fr1 <= 14, fr1 + ' → ' + fr2);
  await pg.evaluate(() => {
    delete document.hidden;                 // 删掉实例属性，还原原型 getter
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await waitThrottle(48, '回前台 → 恢复 fpsActive 48');

  /* —— C+. 指针交互：搅动跟随 + 点击脉冲 + 交互守卫 —— */
  await pg.mouse.move(700, 420);
  await pg.waitForTimeout(700);
  const pt = await pg.evaluate(() => window.__COSMOS.info().pointer);
  ok('指针位置平滑跟随', Math.abs(pt.x - 700) < 80 && Math.abs(pt.y - 420) < 80, JSON.stringify(pt));
  ok('指针活跃度升起', pt.live > 0.3, 'live=' + pt.live);
  const fk1 = await pg.evaluate(() => window.__COSMOS.info().fired);
  await pg.mouse.down(); await pg.mouse.up();
  await pg.waitForTimeout(400);
  const fk2 = await pg.evaluate(() => window.__COSMOS.info().fired);
  ok('空白处点击 → 脉冲 + 涟漪 + 星屑',
    fk2.kick > fk1.kick && fk2.ring > fk1.ring && fk2.spark > fk1.spark, JSON.stringify(fk2));
  const btn = await pg.locator('#cosmos-reset').boundingBox();
  await pg.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
  await pg.mouse.down(); await pg.mouse.up();
  await pg.waitForTimeout(300);
  const fk3 = await pg.evaluate(() => window.__COSMOS.info().fired);
  ok('点面板按钮不误触脉冲（交互守卫）', fk3.kick === fk2.kick, fk2.kick + ' vs ' + fk3.kick);

  ok('A/B/C/E 全程无 console error / pageerror', errs.length === 0, errs.slice(0, 3).join(' | '));
  await ctx.close();

  /* —— D. 移动端视口 390×844 —— */
  const mctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  const merrs = [];
  mp.on('pageerror', e => merrs.push(String(e)));
  await mp.goto(URL, { waitUntil: 'load' });
  await mp.waitForTimeout(4500);
  const mi = await mp.evaluate(() => window.__COSMOS.info());
  ok('移动端密度自动折算（总粒子少于桌面）',
    mi.counts.faint < dcounts.faint, 'mobile faint=' + mi.counts.faint + ' desktop=' + dcounts.faint);
  const pw = await mp.evaluate(() => parseFloat(getComputedStyle(document.getElementById('cosmos-panel')).width));
  ok('面板窄屏缩一档（≈190px，不压正文）', pw > 180 && pw <= 196, 'width=' + pw);
  await mp.evaluate(() => window.scrollTo(0, 99999));
  await mp.waitForTimeout(400);
  const mscr = await mp.evaluate(() => {
    const r = document.getElementById('cosmos-canvas').getBoundingClientRect();
    return { top: r.top, y: window.scrollY };
  });
  ok('移动端滚动后画布锁在视口原点', mscr.y > 100 && mscr.top === 0, JSON.stringify(mscr));
  await mp.screenshot({ path: OUT + '/runtime-mobile.png' });
  ok('移动端无报错', merrs.length === 0, merrs.slice(0, 2).join(' | '));
  await mctx.close();
} finally {
  try { fs.unlinkSync(WAV); } catch (e) {}   // 临时鼓点音轨用完即删
}

console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
await b.close();
process.exit(fail ? 1 : 0);
