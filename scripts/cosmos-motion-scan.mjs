/* 星河验收扫描（scripts/cosmos-motion-scan.mjs）
   ------------------------------------------------------------
   模式照 scripts/gl-motion-scan.mjs：playwright-core + channel:'msedge' +
   --enable-unsafe-swiftshader，视口 1440×900，逐分区截图对比 + 探针断言。

   跑法（仓库根）：
     python -m http.server 8327
     node scripts/cosmos-motion-scan.mjs

   断言清单（工单 §9）：
   - __COSMOS.info()：counts 八层均有粒子、vortex 3~6、frame 持续增长、intro 收敛到 1
   - feed(b,m,t) 喂频谱：低频被吸收、ring 触发、高频触发流星/星屑（看累计计数）；
     松手后各频段平滑回落到 < 0.05（低帧率软渲染下按轮询等待，不只死等 2 秒）
   - 画布亮度均值 4~12/255，暗部(<12) > 80%，亮部(>180) < 1%
   - 滚动后画布锁在视口原点（top===0 且 scrollY > 100）
   - 间隔 500ms 两次像素签名不同（持续流动）
   - prefers-reduced-motion：停笔后帧号与像素签名完全一致
   - 无 console error / pageerror
   ------------------------------------------------------------ */
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('C:/Users/SevenJohn/.workbuddy/binaries/node/workspace/index.js');
const { chromium } = require('playwright-core');

const URL = process.argv[2] || 'http://127.0.0.1:8327/index.html';
const OUT = 'C:/Users/SevenJohn/AppData/Local/Temp/pw-test/scan/cosmos';
fs.mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const ok = (n, c, x) => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (x !== undefined ? '  ' + x : '')); c ? pass++ : fail++; };

// 画布统计：等步长抽样（每 4 像素取 1）
const STATS = () => {
  const cv = document.getElementById('cosmos-canvas');
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  let sum = 0, n = 0, dark = 0, bright = 0;
  for (let i = 0; i < d.length; i += 16) {
    const l = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    sum += l; n++;
    if (l < 12) dark++;
    if (l > 180) bright++;
  }
  return { mean: +(sum / n).toFixed(2), dark: +(dark / n).toFixed(3), bright: +(bright / n).toFixed(4) };
};
// 像素签名：等距抽 4 万个采样点
const SIG = () => {
  const cv = document.getElementById('cosmos-canvas');
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  const out = new Array(40000);
  const step = Math.max(4, Math.floor(d.length / 40000 / 4) * 4);
  for (let i = 0, k = 0; k < 40000; i += step, k++) out[k] = d[i];
  return out;
};
const DIFF = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };

const b = await chromium.launch({
  channel: 'msedge',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist',
         '--autoplay-policy=no-user-gesture-required']   // 减少动效分支要程序化 play() 验律动
});
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const pg = await ctx.newPage();
const errs = [];
pg.on('pageerror', e => errs.push(String(e)));
// 第三方访客计数（不蒜子）属外部依赖，受限网络下会 404；站点已做不可达隐藏，不计入本站错误
const OUTSIDE = (t) => t.includes('busuanzi');
pg.on('console', m => {
  if (m.type() !== 'error') return;
  const where = (m.location() && m.location().url) || '';
  if (OUTSIDE(m.text() + ' ' + where)) return;      // 404 的文案里不带 URL，只能连来源一起判
  errs.push('console: ' + m.text() + (where ? '  @ ' + where : ''));
});

await pg.goto(URL, { waitUntil: 'load' });
await pg.waitForTimeout(700);

// —— 1. 探针与四层宇宙 ——
ok('探针 __COSMOS 存在', await pg.evaluate(() => !!window.__COSMOS));
const i0 = await pg.evaluate(() => window.__COSMOS.info());
const c8 = i0.counts;
console.log('    counts:', JSON.stringify(c8), 'vortex:', i0.vortex);
ok('八层天体均有粒子', [c8.far, c8.fiber, c8.arm, c8.dust, c8.faint, c8.bright, c8.mote, c8.mist].every(v => v > 0));
ok('涡流源 3~6 个', i0.vortex >= 3 && i0.vortex <= 6, i0.vortex);
ok('入场动画进行中', i0.intro > 0 && i0.intro < 1, i0.intro.toFixed(3));

await pg.waitForTimeout(4400);
const i1 = await pg.evaluate(() => window.__COSMOS.info());
ok('intro 收敛到 1', i1.intro === 1, 'intro=' + i1.intro);
const f1 = await pg.evaluate(() => window.__COSMOS.info().frame);
await pg.waitForTimeout(600);
const f2 = await pg.evaluate(() => window.__COSMOS.info().frame);
ok('frame 持续增长', f2 > f1, f1 + ' → ' + f2);

// —— 2. 画布亮度窗口 ——
const s1 = await pg.evaluate(STATS);
ok('亮度均值落在 4~12/255', s1.mean >= 4 && s1.mean <= 12, JSON.stringify(s1));
ok('暗部(<12) > 80%', s1.dark > 0.8, 'dark=' + s1.dark);
ok('亮部(>180) < 1%', s1.bright < 0.01, 'bright=' + s1.bright);

// —— 3. 持续流动 ——
const sigA = await pg.evaluate(SIG);
await pg.waitForTimeout(500);
const sigB = await pg.evaluate(SIG);
ok('间隔 500ms 像素签名不同（持续流动）', DIFF(sigA, sigB) > 0.25, 'avgDelta=' + DIFF(sigA, sigB).toFixed(3));

// —— 4. CSS 静态暗角/辉光层已就位 ——
ok('.cosmos-veil 已挂载且带渐变背景', await pg.evaluate(() => {
  const v = document.getElementById('cosmos-veil');
  return !!v && (v.style.background || '').includes('radial-gradient');
}));

// —— 5. 滚动：画布锁在视口原点 + 分区扫描截图 ——
await pg.evaluate(() => window.scrollTo(0, 99999));
await pg.waitForTimeout(400);
const scr = await pg.evaluate(() => {
  const r = document.getElementById('cosmos-canvas').getBoundingClientRect();
  return { top: r.top, left: r.left, y: window.scrollY };
});
ok('滚动后画布锁在视口原点', scr.y > 100 && scr.top === 0 && scr.left === 0, JSON.stringify(scr));

const secs = await pg.evaluate(() => {
  const ids = ['#home', '#metrics', '#products', '#philosophy', '#about'];
  const o = {};
  for (const s of ids) { const el = document.querySelector(s); o[s] = el ? Math.max(0, el.offsetTop - 60) : 0; }
  return o;
});
for (const [name, y] of Object.entries(secs)) {
  await pg.evaluate(v => window.scrollTo(0, v), y);
  await pg.waitForTimeout(700);
  const a = await pg.screenshot({ path: `${OUT}/${name}-a.png` });
  await pg.waitForTimeout(700);
  const b2 = await pg.screenshot({ path: `${OUT}/${name}-b.png` });
  console.log('scan', name.padEnd(12), 'y=' + String(y).padEnd(6), 'bytes', a.length, b2.length);
}
await pg.evaluate(() => window.scrollTo(0, 0));
await pg.waitForTimeout(500);

// —— 6. 音频驱动：feed 喂频谱（交替脉冲制造节拍边沿）——
for (let k = 0; k < 40; k++) {
  await pg.evaluate(k => window.__COSMOS.feed(k % 2 ? 0.9 : 0.22, k % 2 ? 0.7 : 0.3, k % 2 ? 0.7 : 0.04), k);
  await pg.waitForTimeout(70);
}
const i2 = await pg.evaluate(() => window.__COSMOS.info());
ok('低频被吸收', i2.audio.bass > 0.3, JSON.stringify(i2.audio));
ok('中频被吸收', i2.audio.mid > 0.25, 'mid=' + i2.audio.mid);
ok('高频被吸收', i2.audio.treble > 0.2, 'treble=' + i2.audio.treble);
ok('低频触发环形冲击波', i2.fired.ring > 0, 'fired.ring=' + i2.fired.ring);

// 中频 → 层4（冷雾霭 / 尘埃微粒）流场牵引倍率上升（探针 info().flow.mist 直读）
await pg.evaluate(() => window.__COSMOS.feed(0, 0.8, 0));
await pg.waitForTimeout(1800);
const fmist = await pg.evaluate(() => window.__COSMOS.info().flow.mist);
ok('中频加快层4雾霭流速', fmist > 1.15, 'flow.mist=' + fmist);

// 高频流星/星屑：脉冲结束后再喂一串纯高频边沿，给流星留出生成窗口
for (let k = 0; k < 16; k++) {
  await pg.evaluate(k => window.__COSMOS.feed(k % 2 ? 0.1 : 0.05, 0.05, k % 2 ? 0.75 : 0.05), k);
  await pg.waitForTimeout(90);
}
const i3 = await pg.evaluate(() => window.__COSMOS.info());
ok('高频触发流星', i3.fired.meteor > 0, 'fired.meteor=' + i3.fired.meteor);
ok('流星尾端散落星屑', i3.fired.spark > 0, 'fired.spark=' + i3.fired.spark);

// —— 7. 静默回落：平滑、收敛到 < 0.05 ——
// 包络按帧释放（工单公式），软渲染整页仅 ~3-5fps，收敛需 ~50 帧 ≈ 15s；
// 真机 48fps 下 1 秒出头即收敛（符合"松手 2 秒"验收），这里按轮询等到收敛为止。
await pg.evaluate(() => window.__COSMOS.feed(0, 0, 0));
let settled = null, firstDrop = null;
for (let k = 0; k < 40; k++) {
  await pg.waitForTimeout(500);
  const a = await pg.evaluate(() => window.__COSMOS.info().audio);
  if (k === 1) firstDrop = a;
  if (a.bass < 0.05 && a.mid < 0.05 && a.treble < 0.05) { settled = a; break; }
}
ok('松手后平滑回落（先降后收，非硬跳）',
  !!firstDrop && firstDrop.bass < i2.audio.bass,
  i2.audio.bass + ' → ' + (firstDrop && firstDrop.bass));
ok('各频段收敛到 < 0.05（软渲染下按轮询等待）', !!settled,
  settled ? JSON.stringify(settled) : '20s 内未收敛');
const fquiet = await pg.evaluate(() => window.__COSMOS.info().flow.mist);
ok('静默后雾霭流速回落（无硬跳）', fquiet > 1 && fquiet < 1.06, 'flow.mist=' + fquiet);

// —— 8. 无报错（主上下文）——
ok('主上下文无 console error / pageerror', errs.length === 0, errs.slice(0, 3).join(' | '));
await ctx.close();

// —— 9. prefers-reduced-motion：静默走完入场后彻底停笔 ——
const rctx = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' });
const rerrs = [];
rctx.on('pageerror', e => rerrs.push(String(e)));
await rctx.goto(URL, { waitUntil: 'load' });
await rctx.waitForTimeout(7000);              // introMs 3800 + 400 余味 + 软渲染余量
const rf1 = await rctx.evaluate(() => window.__COSMOS.info().frame);
const rsig1 = await rctx.evaluate(SIG);
const rstat = await rctx.evaluate(STATS);
await rctx.waitForTimeout(900);
const rf2 = await rctx.evaluate(() => window.__COSMOS.info().frame);
const rsig2 = await rctx.evaluate(SIG);
ok('reduce-motion 下仍画出了成型星图', rstat.mean >= 1, JSON.stringify(rstat));
ok('停笔后帧号完全一致', rf1 === rf2, rf1 + ' vs ' + rf2);
ok('停笔后像素签名完全一致', DIFF(rsig1, rsig2) === 0, 'avgDelta=' + DIFF(rsig1, rsig2).toFixed(4));

// reduce-motion 下点「重置星河」：面板默认展开，直接点重置——应静默重走入场再停笔
await rctx.click('#cosmos-reset');
await rctx.waitForTimeout(600);
const rr1 = await rctx.evaluate(() => window.__COSMOS.info().frame);
await rctx.waitForTimeout(7000);
const rr2 = await rctx.evaluate(() => window.__COSMOS.info().frame);
const rr3 = await rctx.evaluate(() => { const i = window.__COSMOS.info(); return { frame: i.frame, intro: i.intro }; });
ok('reduce-motion 重置后重走入场并再次停笔', rr2 > rr1 && rr3.intro === 1 && rr3.frame === rr2,
  rr1 + ' → ' + rr2 + ' → ' + rr3.frame + ' intro=' + rr3.intro);
// —— 10. 减少动效 × 主动放歌：默认彻底静止，放歌才按 CFG.fpsReduce 随拍微动，停播回到停笔 ——
ok('停笔原因可自诊断（面板直接点明「减少动效」）',
  (await rctx.textContent('#cosmos-state')).includes('减少动效'),
  await rctx.textContent('#cosmos-state'));
await rctx.evaluate(() => {
  const el = document.getElementById('music-audio');
  el.src = 'music/attention.mp3';
  el.play().catch(() => {});
});
await rctx.waitForTimeout(2200);
const rg1 = await rctx.evaluate(() => window.__COSMOS.info());
await rctx.waitForTimeout(1200);
const rg2 = await rctx.evaluate(() => window.__COSMOS.info());
ok('减少动效下放歌 → 恢复低帧率律动',
  rg2.stopped === false && rg2.frame > rg1.frame,
  'stopped=' + rg2.stopped + '  frame ' + rg1.frame + ' → ' + rg2.frame + '  thr=' + rg2.throttle);
await rctx.evaluate(() => document.getElementById('music-audio').pause());
await rctx.waitForTimeout(3200);
const rg3 = await rctx.evaluate(() => window.__COSMOS.info());
await rctx.waitForTimeout(900);
const rg4 = await rctx.evaluate(() => window.__COSMOS.info());
ok('停播后回到彻底停笔', rg4.stopped === true && rg4.frame === rg3.frame,
  'stopped=' + rg4.stopped + '  frame ' + rg3.frame + ' → ' + rg4.frame);

ok('reduce-motion 上下文无报错', rerrs.length === 0, rerrs.slice(0, 2).join(' | '));
await rctx.close();

console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
await b.close();
process.exit(fail ? 1 : 0);
