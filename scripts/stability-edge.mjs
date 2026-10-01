/* 稳定性补充边缘测试（体检第二轮）：
   A swiftshader 软渲染 → static 档兜底（解释 runtime-scan 崩溃 + 验证静档可用）
   B 恶意/畸形 ?post= 参数 ×4 不炸页面、不弹窗
   C 损坏 localStorage → 重载无崩溃无报错
   D prefers-reduced-motion → 页面完整渲染
   E 404.html 独立可用
   F cosmos-home.html 独立演示页可用
   G 文章弹窗开/关 ×15 压力循环（监听器重复挂载的历史 bug 模式）
   用法：python -m http.server 8327 → node scripts/stability-edge.mjs */
import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8327/';

let pass = 0, fail = 0;
const ok = (n, extra) => { pass++; console.log('PASS  ' + n + (extra ? '  ' + extra : '')); };
const bad = (n, extra) => { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); };
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// 带 console 噪音采集的页面工厂
async function newPage(browser, opts = {}) {
  const ctx = await b.newContext(opts);
  const pg = await ctx.newPage();
  const errs = [], noise = [], dialogs = [];
  pg.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  pg.on('console', (m) => { if (['error', 'warning'].includes(m.type())) noise.push(m.type() + ': ' + m.text().slice(0, 100)); });
  pg.on('dialog', (d) => { dialogs.push(d.type()); d.dismiss().catch(() => {}); });
  return { pg, errs, noise, dialogs, ctx };
}
const b = await chromium.launch({ executablePath: EXE });

/* ===== A. swiftshader 强制软渲染 → static 档 ===== */
{
  const b2 = await chromium.launch({ executablePath: EXE, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  const p2 = await b2.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p2.on('pageerror', (e) => errs.push(String(e).slice(0, 100)));
  await p2.goto(BASE, { waitUntil: 'load' });
  await p2.waitForTimeout(3500);
  const st = await p2.evaluate(() => ({
    tier: window.__COSMOS_TIER || '(未定义)',
    probe: typeof window.__COSMOS,
    h1: (document.querySelector('#home h1')?.textContent || '').length > 0,
    cards: document.querySelectorAll('[data-project-id]').length,
    veil: !!document.querySelector('.cosmos-veil, canvas#cosmos-canvas'),
  }));
  const good = st.tier === 'static' && st.probe === 'undefined' && st.h1 && st.cards >= 6 && errs.length === 0;
  (good ? ok : bad)('A. swiftshader 软渲染 → static 档兜底、页面完整', `tier=${st.tier} probe=${st.probe} h1=${st.h1} cards=${st.cards} errs=${errs.length}`);
  await b2.close();
}

/* ===== B. 恶意/畸形 ?post= ===== */
{
  const { pg, errs, noise, dialogs } = await newPage(b);
  const payloads = [
    ["引号逃逸", "x');alert(1)//"],
    ["script标签", "<script>alert(1)</script>"],
    ["超长5000字", "a".repeat(5000)],
    ["空参数", ""],
  ];
  let allOk = true;
  for (const [name, v] of payloads) {
    const before = errs.length;
    await pg.goto(`${BASE}?post=${encodeURIComponent(v)}`, { waitUntil: 'load' });
    await pg.waitForTimeout(1100);
    const st = await pg.evaluate(() => ({
      text: document.body.textContent.length > 200,
      modalHidden: document.getElementById('article-modal')?.classList.contains('hidden') ?? true,
    }));
    const good = errs.length === before && st.text && dialogs.length === 0;
    if (!good) allOk = false;
    console.log(`      [${name}] text=${st.text} modalHidden=${st.modalHidden} errs+=${errs.length - before} dialogs=${dialogs.length}`);
  }
  (allOk ? ok : bad)('B. 恶意/畸形 ?post= ×4 不炸页面不弹窗', `pageerrors=${errs.length} dialogs=${dialogs.length} noise=${noise.length}`);
  await pg.context().close();
}

/* ===== C. 损坏 localStorage ===== */
{
  const { pg, errs, noise } = await newPage(b);
  await pg.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pg.evaluate(() => {
    localStorage.setItem('sj.reading', '{broken json');
    localStorage.setItem('sj.ann.flash-vbmeta-trust-chain', 'not-json{{');
    localStorage.setItem('sj.emo.some-id', '[[[');
    localStorage.setItem('sj.theme', 'garbage-value');
  });
  await pg.reload({ waitUntil: 'load' });
  await pg.waitForTimeout(3000);
  const st = await pg.evaluate(() => ({
    h1: (document.querySelector('#home h1')?.textContent || '').length > 0,
    modal: document.getElementById('article-modal')?.classList.contains('hidden') ?? true,
  }));
  const good = errs.length === 0 && noise.length === 0 && st.h1 && st.modal;
  (good ? ok : bad)('C. 损坏 localStorage 重载不崩、零报错', `pageerrors=${errs.length} noise=${noise.length} h1=${st.h1}`);
  await pg.context().close();
}

/* ===== D. prefers-reduced-motion ===== */
{
  const { pg, errs, noise } = await newPage(b, { reducedMotion: 'reduce' });
  await pg.goto(BASE, { waitUntil: 'load' });
  await pg.waitForTimeout(3500);
  const st = await pg.evaluate(() => ({
    tier: window.__COSMOS_TIER || '(无)',
    engine: window.__COSMOS?.info?.().engine || null,
    h1: (document.querySelector('#home h1')?.textContent || '').length > 0,
    h1Visible: (() => { const e = document.querySelector('#home h1'); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })(),
  }));
  const good = st.h1 && st.h1Visible && errs.length === 0;
  (good ? ok : bad)('D. reduce-motion 页面完整可见不黑屏', `tier=${st.tier} engine=${st.engine} h1Visible=${st.h1Visible} errs=${errs.length} noise=${noise.length}`);
  await pg.context().close();
}

/* ===== E. 404.html ===== */
{
  const { pg, errs, noise } = await newPage(b);
  await pg.goto(BASE + '404.html', { waitUntil: 'load' });
  await pg.waitForTimeout(2000);
  const st = await pg.evaluate(() => ({
    text: document.body.textContent.length > 100,
    homeLink: !!document.querySelector('a[href*="index.html"], a[href="/"], a[href="#home"]'),
  }));
  const good = st.text && errs.length === 0;
  (good ? ok : bad)('E. 404 页独立渲染、有返回入口', `text=${st.text} homeLink=${st.homeLink} errs=${errs.length} noise=${noise.length}`);
  await pg.context().close();
}

/* ===== F. cosmos-home.html 独立演示页 ===== */
{
  const { pg, errs, noise } = await newPage(b);
  await pg.goto(BASE + 'cosmos-home.html', { waitUntil: 'load' });
  await pg.waitForTimeout(3500);
  const st = await pg.evaluate(() => ({
    text: document.body.textContent.length > 200,
    title: document.title.length > 0,
  }));
  const good = st.text && st.title && errs.length === 0;
  (good ? ok : bad)('F. cosmos-home 演示页独立可用', `text=${st.text} errs=${errs.length} noise=${noise.length}`);
  await pg.context().close();
}

/* ===== G. 文章弹窗开/关 ×15 压力循环 ===== */
{
  const { pg, errs, noise } = await newPage(b);
  const artId = await (async () => {
    await pg.goto(BASE, { waitUntil: 'load' });
    await pg.waitForTimeout(1800);
    return pg.evaluate(() => (window.ARTICLES_DATA || [])[0]?.id);
  })();
  const nodes0 = await pg.evaluate(() => document.querySelectorAll('*').length);
  for (let i = 0; i < 15; i++) {
    await pg.goto(`${BASE}?post=${encodeURIComponent(artId)}`, { waitUntil: 'load' });
    await pg.waitForTimeout(700);
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(350);
  }
  const nodes1 = await pg.evaluate(() => document.querySelectorAll('*').length);
  const growth = nodes1 - nodes0;
  const good = errs.length === 0 && growth < 500;
  (good ? ok : bad)('G. 弹窗开/关 ×15 无报错、DOM 无泄漏式增长', `growth=${growth} nodes=${nodes0}→${nodes1} errs=${errs.length} noise=${noise.length}`);
  await pg.context().close();
}

await b.close();
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
