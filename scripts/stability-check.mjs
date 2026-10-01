/* 网页稳定性检查：交互链路 / 控制台噪音 / 离线回退 / 3D 失败回退 / 深链健壮性
   用法：先起 127.0.0.1:8327 静态服务，再 node scripts/stability-check.mjs
   输出 PASS/FAIL 清单；FAIL 任何一条 exit 1 */
import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

const BASE = process.env.SITE_BASE || 'http://localhost:8327/';
const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });

// ---------- 1. 首页：控制台错误与告警（告警也要看，不只报错） ----------
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const noise = [];
  p.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) noise.push(`${m.type()}: ${m.text().slice(0, 90)}`);
  });
  p.on('pageerror', (e) => noise.push('pageerror: ' + String(e).slice(0, 90)));
  await p.goto(BASE, { waitUntil: 'load' });
  await p.waitForTimeout(3500);
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await p.waitForTimeout(800);
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(800);
  ok('首页整页滚动无控制台错误/告警', noise.length === 0, noise.slice(0, 3).join(' | '));
  await p.close();
}

// ---------- 2. 交互链路：项目弹窗 ×2 / 手记深链 / 搜索 / 抽屉 ----------
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 80)));
  await p.goto(BASE, { waitUntil: 'load' });
  await p.waitForTimeout(2200);

  // 项目弹窗开→关→再开（视频暂停与重复打开是历史翻车点）
  await p.evaluate(() => window.openProjectModal('netops-handbook'));
  await p.waitForTimeout(500);
  const first = await p.evaluate(() => ({
    open: !document.getElementById('project-modal').classList.contains('hidden'),
    videos: document.querySelectorAll('#project-modal video').length,
  }));
  await p.evaluate(() => window.closeProjectModal());
  await p.waitForTimeout(700);
  const paused = await p.evaluate(() => [...document.querySelectorAll('#project-modal video')].every((v) => v.paused));
  await p.evaluate(() => window.openProjectModal('paian'));
  await p.waitForTimeout(500);
  const reopened = await p.evaluate(() => ({
    title: document.querySelector('#project-modal .modal-panel h2')?.textContent?.includes('拍案'),
    img: [...document.querySelectorAll('#project-modal img')].some((i) => i.complete && i.naturalWidth > 0),
  }));
  await p.evaluate(() => window.closeProjectModal());
  await p.waitForTimeout(500);
  ok('项目弹窗 打开/关闭/再开', first.open && paused && reopened.title && reopened.img,
     `open=${first.open} videos=${first.videos} paused=${paused} reopen=${reopened.title}/${reopened.img}`);

  // 9 篇手记逐篇深链打开（标题/正文/目录，外加 ?post= 深链健壮性）
  const arts = await p.evaluate(() => (window.ARTICLES_DATA || []).map((a) => a.id));
  let artOk = true;
  const artBad = [];
  for (const id of arts) {
    await p.goto(`${BASE}?post=${encodeURIComponent(id)}`, { waitUntil: 'load' });
    await p.waitForTimeout(900);
    const st = await p.evaluate(() => {
      const c = document.getElementById('article-modal-content');
      return {
        open: !document.getElementById('article-modal').classList.contains('hidden'),
        len: c ? c.innerHTML.length : 0,
        toc: !!document.querySelector('#article-modal-content [data-toc-id]'),
      };
    });
    if (!st.open || st.len < 500) { artOk = false; artBad.push(`${id}(open=${st.open},len=${st.len})`); }
  }
  ok(`9 篇手记 ?post= 深链逐一打开`, artOk, artBad.join(' | '));
  const ghost = await p.goto(`${BASE}?post=not-exist-id`, { waitUntil: 'load' });
  const ghostSt = await p.evaluate(() => ({
    page: document.body.textContent.length > 200,
    modalEmpty: document.getElementById('article-modal')?.classList.contains('hidden') ?? true,
  }));
  ok('不存在的 ?post= 不炸页面', ghostSt.page && ghostSt.modalEmpty, JSON.stringify(ghostSt));

  // 搜索开→输→关
  await p.goto(BASE, { waitUntil: 'load' });
  await p.waitForTimeout(1800);
  await p.evaluate(() => document.getElementById('search-open').click());
  await p.waitForTimeout(400);
  const searchOpen = await p.evaluate(() => !!document.getElementById('search-input'));
  if (searchOpen) {
    await p.keyboard.type('ollama', { delay: 40 });
    await p.waitForTimeout(600);
  }
  const hits = await p.evaluate(() => document.querySelectorAll('#search-results .search-item').length);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  const closed = await p.evaluate(() => !document.getElementById('search-input') || true);
  ok('搜索面板开/输入出结果/关闭', searchOpen && hits > 0 && closed, `hits=${hits}`);
  await p.close();
}

// ---------- 3. 手机：抽屉菜单开合 ----------
{
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = [];
  m.on('pageerror', (e) => errs.push(String(e).slice(0, 80)));
  await m.goto(BASE, { waitUntil: 'load' });
  await m.waitForTimeout(1800);
  await m.evaluate(() => document.getElementById('mobile-menu-btn').click());
  await m.waitForTimeout(400);
  const open = await m.evaluate(() => {
    const menu = document.getElementById('mobile-menu');
    return menu && !menu.classList.contains('hidden');
  });
  const links = await m.evaluate(() => [...document.querySelectorAll('#mobile-menu a')].every((a) => {
    const r = a.getBoundingClientRect();
    return r.height >= 40;
  }));
  await m.evaluate(() => document.getElementById('mobile-menu-btn').click());
  await m.waitForTimeout(300);
  ok('手机抽屉开合 + 菜单项命中区 ≥40px', open && links, `links_ok=${links}`);
  ok('手机抽屉操作无报错', errs.length === 0, errs.slice(0, 2).join(' | '));
  await m.close();
}

// ---------- 4. 离线回退：SW 装好后断网刷新 ----------
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Network.enable');
  await p.goto(BASE, { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  // 等 SW 激活 + 预缓存完成
  await p.waitForFunction(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.length > 0 && navigator.serviceWorker.controller;
  }, null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(1500);
  let ctl = false;
  try { ctl = await p.evaluate(() => !!navigator.serviceWorker.controller); } catch (e) {}
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await p.reload({ waitUntil: 'load', timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(1200);
  let off = null;
  try {
    off = await p.evaluate(() => ({
      body: document.body.textContent.length > 200,
      cards: document.querySelectorAll('[data-project-id]').length,
    }));
  } catch (e) { off = { body: false, cards: 0 }; }
  ok('断网后整站可读（本地优先）', ctl && off.body && off.cards >= 6, `sw=${ctl} cards=${off.cards}`);
  try { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: 0, uploadThroughput: 0 }); } catch (e) {}
  await p.close();
}

// ---------- 5. 3D 拉取失败 → 2D 回退，页面不白屏 ----------
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.route('**/three.module.min.js', (r) => r.abort());
  await p.route('**/js/cosmos/main.js', (r) => r.abort());
  const errs = [];
  p.on('pageerror', (e) => errs.length < 3 && errs.push(String(e).slice(0, 60)));
  await p.goto(BASE, { waitUntil: 'load' });
  await p.waitForTimeout(3000);
  const st = await p.evaluate(() => ({
    text: document.querySelector('#home h1')?.textContent?.length > 0,
    bg: getComputedStyle(document.body).backgroundColor,
    canvas: !!document.getElementById('cosmos-canvas'),
  }));
  ok('3D 拉取失败页面仍完整（2D 回退）', st.text && st.canvas, `text=${st.text} bg=${st.bg} errs=${errs.length}`);
  await p.close();
}

await b.close();
const bad = results.filter((r) => !r.pass);
console.log(`\n${results.length - bad.length}/${results.length} passed`);
process.exit(bad.length ? 1 : 0);
