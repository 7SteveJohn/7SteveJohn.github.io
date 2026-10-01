/**
 * 背景引擎验收（2026-10-01 重写，替代针对旧「推理场」引擎的 cosmos-motion-scan / cosmos-runtime-scan）
 * ----------------------------------------------------
 * 覆盖：设备分档（full/lite/static）、等高线引擎探针、帧推进与容灾标志、
 *       reduce-motion、swiftshader 静态档兜底、3D 拉取失败回退。
 * 跑法：python -m http.server 8327 → node scripts/cosmos-scan.mjs
 *      （需 SITE_BASE 用 localhost，SW 注册与分档探针都依赖它）
 * 输出 PASS/FAIL 清单；FAIL 任何一条 exit 1
 */
import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

const BASE = process.env.SITE_BASE || 'http://localhost:8327/';
const EXE = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

let pass = 0, fail = 0;
const ok = (n, extra) => { pass++; console.log('PASS  ' + n + (extra ? '  ' + extra : '')); };
const bad = (n, extra) => { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); };
const assert = (cond, n, extra) => (cond ? ok : bad)(n, extra);

const info = (pg) => pg.evaluate(() => (window.__COSMOS && window.__COSMOS.info ? window.__COSMOS.info() : null));
async function waitProbe(pg, timeout = 20000) {
  await pg.waitForFunction(() => !!(window.__COSMOS && window.__COSMOS.info), null, { timeout }).catch(() => {});
  return info(pg);
}

const b = await chromium.launch({ executablePath: EXE });

/* ===== 1. 桌面 full 档：等高线引擎 ===== */
{
  const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' })).newPage();
  const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e).slice(0, 100)));
  await pg.goto(BASE, { waitUntil: 'load' });
  const i0 = await waitProbe(pg);
  assert(!!i0, '探针 __COSMOS.info 存在');
  assert(i0 && i0.engine === 'isolines', '引擎 = 等高线岛图（isolines）', i0 && i0.engine);
  assert((await pg.evaluate(() => window.__COSMOS_TIER)) === 'full', '桌面档位 = full', await pg.evaluate(() => window.__COSMOS_TIER));
  assert(i0 && i0.dpr <= 2, 'DPR ≤ 2', i0 && i0.dpr);
  assert(i0 && i0.contextLost === false, '无 WebGL context 丢失', i0 && i0.contextLost);
  assert(i0 && i0.reduceMotion === false, '正常环境 reduceMotion = false', i0 && i0.reduceMotion);

  const f1 = i0 ? i0.frame : 0;
  await pg.waitForTimeout(1300);
  const i1 = await info(pg);
  assert(i1 && i1.frame > f1, '帧计数持续推进（渲染循环活着）', `${f1} → ${i1 && i1.frame}`);
  assert(i1 && i1.sceneT > (i0 ? i0.sceneT : 0), '场景时间推进', `${i0 && i0.sceneT} → ${i1 && i1.sceneT}`);
  assert(i1 && i1.audio && ['bass', 'mid', 'treble', 'beat'].every((k) => k in i1.audio), '音频包络字段齐全', i1 && JSON.stringify(i1.audio));
  assert(errs.length === 0, '桌面 full 档零 pageerror', errs.join(' | '));
  await pg.context().close();
}

/* ===== 2. reduce-motion：引擎静息但不黑屏 ===== */
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e).slice(0, 100)));
  await pg.goto(BASE, { waitUntil: 'load' });
  const i = await waitProbe(pg);
  assert(!!i && i.reduceMotion === true, 'reduce-motion 环境探针标记生效', i && i.reduceMotion);
  const h1 = await pg.evaluate(() => {
    const el = document.querySelector('#home h1');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  assert(h1, 'reduce-motion 页面完整可见（不黑屏）', '');
  assert(errs.length === 0, 'reduce-motion 零 pageerror', errs.join(' | '));
  await ctx.close();
}

/* ===== 3. 手机 lite 档：2D 星河 ===== */
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e).slice(0, 100)));
  await pg.goto(BASE, { waitUntil: 'load' });
  await pg.waitForTimeout(4000);
  const tier = await pg.evaluate(() => window.__COSMOS_TIER || '(未定义)');
  const threeLoaded = await pg.evaluate(() => performance.getEntriesByType('resource').some((r) => r.name.includes('three.module.min.js')));
  const h1 = await pg.evaluate(() => (document.querySelector('#home h1')?.textContent || '').length > 0);
  assert(tier === 'lite', '手机档位 = lite（2D 星河）', tier);
  assert(!threeLoaded, '手机不下载 three.js（692KB 省流）', '');
  assert(h1, 'lite 档页面完整', '');
  assert(errs.length === 0, 'lite 档零 pageerror', errs.join(' | '));
  await ctx.close();
}

/* ===== 4. swiftshader 软渲染 → static 档兜底 ===== */
{
  const b2 = await chromium.launch({ executablePath: EXE, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b2.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e).slice(0, 100)));
  await pg.goto(BASE, { waitUntil: 'load' });
  await pg.waitForTimeout(4000);
  const st = await pg.evaluate(() => ({
    tier: window.__COSMOS_TIER || '(未定义)',
    probe: typeof window.__COSMOS,
    h1: (document.querySelector('#home h1')?.textContent || '').length > 0,
    cards: document.querySelectorAll('[data-project-id]').length,
  }));
  assert(st.tier === 'static' && st.probe === 'undefined', '软渲染识别为 static 档（不加载引擎）', `tier=${st.tier} probe=${st.probe}`);
  assert(st.h1 && st.cards >= 6 && errs.length === 0, 'static 档页面完整（暗角兜底）', `h1=${st.h1} cards=${st.cards} errs=${errs.length}`);
  await b2.close();
}

/* ===== 5. 3D 拉取失败 → 页面不白屏 ===== */
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage();
  await pg.route('**/three.module.min.js', (r) => r.abort());
  await pg.route('**/js/cosmos/main3d.js', (r) => r.abort());
  const errs = [];
  pg.on('pageerror', (e) => errs.length < 3 && errs.push(String(e).slice(0, 80)));
  await pg.goto(BASE, { waitUntil: 'load' });
  await pg.waitForTimeout(3500);
  const st = await pg.evaluate(() => ({
    text: (document.querySelector('#home h1')?.textContent || '').length > 0,
    bg: getComputedStyle(document.body).backgroundColor,
  }));
  assert(st.text, '3D 拉取失败页面仍完整', `bg=${st.bg} errs=${errs.length}`);
  await ctx.close();
}

await b.close();
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
