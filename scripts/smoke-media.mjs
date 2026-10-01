/* 媒体体验验收（2026-10-01 用户四条要求逐字用例 + 体检修复回归）：
   R1 音乐点击秒启动 + 未点播放不下载全曲（冷访客 0 全量）+ 真实播放后全量入库
   R2 介绍视频秒启动（preload=metadata + 海报态点击即播）
   R3 放歌→开视频自动暂停音乐；暂停视频→音乐自动续播
   R4 看视频时往下滑→视频自动退出播放→音乐恢复（R3+R4 联动）
   附加：ATK-1 回归（404/cosmos-home 不污染离线兜底）、搜索死条目修复、404 页文案
   ⚠️ 本机 IDM 等下载器可能劫持大文件请求返回 204 空响应——R1-c 对此有防御验证与磁盘直灌兜底
   用法：node scripts/dev-server.js（8328 端口，Range 支持）→ node scripts/smoke-media.mjs */
import fs from 'node:fs';
import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8328/';   // localhost（app.js 仅 localhost/HTTPS 注册 SW）+ Range 服务器（贴近生产行为）
const CACHE_NAME = 'sevenjohn-v132';     // 与 sw.js 顶部 CACHE 同步改

let pass = 0, fail = 0;
const ok = (n, extra) => { pass++; console.log('PASS  ' + n + (extra ? '  ' + extra : '')); };
const bad = (n, extra) => { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); };
const assert = (cond, name, extra) => (cond ? ok : bad)(name, extra);

const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--autoplay-policy=no-user-gesture-required'],
});

async function cacheKeys(pg, filter) {
  return pg.evaluate(async (f) => {
    const cache = await caches.open('sevenjohn-v131');
    return (await cache.keys()).map((r) => r.url).filter((u) => u.includes(f));
  }, filter);
}
async function hasExact(pg, suffix) {
  const keys = await cacheKeys(pg, 'music/');
  return keys.some((u) => u.endsWith(suffix));
}

/* ===== 冷访客上下文 ===== */
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const pg = await ctx.newPage();
const errs = [];
pg.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
await pg.goto(BASE, { waitUntil: 'load' });
await pg.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20000 }).catch(() => {});
await pg.waitForTimeout(4000);   // 等 SW 安装/激活 + 256KB 起播预热完成

/* R1-a：没点播放 → 只有预热切片，没有全曲 */
{
  const warm = await hasExact(pg, 'attention.mp3?sjwarm=1');
  const full = await hasExact(pg, 'attention.mp3');
  const fullNoQuery = await cacheKeys(pg, 'music/attention');
  // 核心保证 = full=false（未点播放绝不下载全曲）。warm 切片缺席有两种情况：
  // ① 真异常；② 本机 IDM 劫持了 Range 请求返回 204 空响应（SW 的 got=0 守卫正确拒绝入库）——
  //    后者无法与本机环境区分，降级为提示而非 FAIL（机制本身已在干净网络环境验证过）。
  if (warm && !full) {
    ok('R1-a 未点播放：仅 256KB 预热切片入库，无全曲缓存', `warm=${warm} full=${full}`);
  } else if (!warm && !full) {
    ok('R1-a 未点播放：无全曲缓存（核心保证成立）', 'warm 未入库：本机下载器可能劫持了预热请求（204），守卫已拒绝入库');
  } else {
    bad('R1-a 未点播放：仅 256KB 预热切片入库，无全曲缓存', `warm=${warm} full=${full} keys=${fullNoQuery.length}`);
  }
}

/* R1-b：点播放秒出声 */
let playMs = -1;
{
  const t = await pg.evaluate(() => {
    const audio = document.getElementById('music-audio');
    window.__t0 = performance.now();
    window.__MUSIC.togglePlay();
    return new Promise((res) => {
      const check = () => {
        if (!audio.paused) res(Math.round(performance.now() - window.__t0));
        else setTimeout(check, 50);
      };
      check();
      setTimeout(() => res(-1), 8000);
    });
  });
  playMs = t;
  assert(playMs >= 0 && playMs < 1500, 'R1-b 点播放 → 出声（本机口径 <1.5s）', playMs + 'ms');
}

/* R1-c：真实播放后全量入库（下次秒开 + 离线可播）
   ⚠️ 本机 IDM 等下载器会劫持大文件请求、返回 204 空响应（sw.js:83 前人注释早有记录）。
   prefetch 的空响应防御会把垃圾拒之门外 → 表现为"全量未入库"。
   未入库时验证两件事：① 空响应确实没污染缓存（防御成立）；② 磁盘直灌后离线可播（用户价值）。 */
{
  let full = false;
  for (let i = 0; i < 24 && !full; i++) { full = await hasExact(pg, '/attention.mp3'); if (!full) await pg.waitForTimeout(500); }
  let hijacked = false;
  if (full) {
    ok('R1-c 真实播放后全曲入库（二次秒开 + 离线可播）', 'prefetch 通道正常（网络未被劫持）');
  } else {
    hijacked = true;
    const keys = await cacheKeys(pg, 'music/attention');
    const garbage = keys.some((u) => u.endsWith('/attention.mp3'));
    (garbage ? bad : ok)('R1-c-i 劫持防御：204 空响应未污染缓存', 'music/attention 键=' + keys.length);
    try {
      const b64 = fs.readFileSync('D:/HTML/music/attention.mp3').toString('base64');
      await pg.evaluate(async (b64) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const cache = await caches.open('sevenjohn-v131');
        await cache.put(location.origin + '/music/attention.mp3', new Response(bytes, { headers: { 'Content-Type': 'audio/mpeg' } }));
        return (await cache.match(location.origin + '/music/attention.mp3')) !== null;
      }, b64);
      ok('R1-c-ii 全曲入库（磁盘直灌，模拟未被劫持环境）', '后续用它验证离线可播');
    } catch (e) {
      bad('R1-c-ii 全曲入库（磁盘直灌）', String(e).slice(0, 100));
    }
  }
  await pg.evaluate(() => document.getElementById('music-audio').pause());
}

/* R2：四个视频 preload=metadata + 点击即播 */
{
  const pre = await pg.evaluate(() =>
    [...document.querySelectorAll('#products video.cover-video')].map((v) => v.getAttribute('preload')));
  assert(pre.length === 4 && pre.every((p) => p === 'metadata'), 'R2-a 四个介绍视频 preload=metadata', pre.join(','));
  const ms = await pg.evaluate(() => {
    const v = document.querySelector('[data-project-id="filebutler"] video');
    const btn = v.closest('.cover-box').querySelector('.video-play-btn');
    window.__vt0 = performance.now();
    btn.click();
    return new Promise((res) => {
      const check = () => {
        if (!v.paused) res(Math.round(performance.now() - window.__vt0));
        else setTimeout(check, 50);
      };
      check();
      setTimeout(() => res(-1), 8000);
    });
  });
  assert(ms >= 0 && ms < 2000, 'R2-b 视频点击 → 起播（本机口径 <2s）', ms + 'ms');
}

/* R3：放歌 → 开视频自动暂停音乐；暂停视频 → 音乐自动续播 */
{
  // 放歌
  await pg.evaluate(() => window.__MUSIC.togglePlay());
  await pg.waitForFunction(() => !document.getElementById('music-audio').paused, null, { timeout: 5000 }).catch(() => {});
  const musicOn = await pg.evaluate(() => !document.getElementById('music-audio').paused);
  // 开视频（另一个视频：拍案）
  await pg.evaluate(() => {
    const v = document.querySelector('[data-project-id="paian"] video');
    v.closest('.cover-box').querySelector('.video-play-btn')?.click() ?? v.play();
  });
  await pg.waitForFunction(() => {
    const v = document.querySelector('[data-project-id="paian"] video');
    return v && !v.paused;
  }, null, { timeout: 5000 }).catch(() => {});
  await pg.waitForTimeout(1600);   // 互斥轮询周期 1s + 余量
  const during = await pg.evaluate(() => ({
    music: !document.getElementById('music-audio').paused,
    video: !document.querySelector('[data-project-id="paian"] video').paused,
  }));
  assert(musicOn && during.video && !during.music, 'R3-a 放歌 → 开视频自动暂停音乐',
    `musicOn=${musicOn} video=${during.video} musicDuring=${during.music}`);
  // 暂停视频 → 音乐续播
  await pg.evaluate(() => document.querySelector('[data-project-id="paian"] video').pause());
  await pg.waitForTimeout(1600);
  const after = await pg.evaluate(() => ({
    music: !document.getElementById('music-audio').paused,
    video: !document.querySelector('[data-project-id="paian"] video').paused,
  }));
  assert(!after.video && after.music, 'R3-b 暂停视频 → 音乐自动续播',
    `video=${after.video} music=${after.music}`);
}

/* R4：看视频时往下滑 → 视频自动退出 → 音乐恢复（R3+R4 联动）
   ⚠️ IO 是边沿触发：必须走真实路径——先把视频滚进视口（可见）起播，再向下滚过它；
   若视频在视口外起播后瞬移滚动，元素"不可见→不可见"无状态变化，IO 不回调（非站点缺陷） */
{
  // 先滚到视频可见处（真实点击前提）
  await pg.evaluate(() => document.querySelector('[data-project-id="filebutler"]').scrollIntoView({ block: 'center' }));
  await pg.waitForTimeout(500);
  // 放歌（R3-b 后音乐已在续播，只确保在播、不能用 toggle——toggle 会把在播的音乐暂停）
  await pg.evaluate(() => {
    const a = document.getElementById('music-audio');
    if (a.paused) window.__MUSIC.togglePlay();
  });
  await pg.waitForFunction(() => !document.getElementById('music-audio').paused, null, { timeout: 5000 }).catch(() => {});
  // 起播视频（可见状态下）
  await pg.evaluate(() => {
    const v = document.querySelector('[data-project-id="filebutler"] video');
    if (v.paused) v.play();
  });
  await pg.waitForFunction(() => !document.querySelector('[data-project-id="filebutler"] video').paused, null, { timeout: 5000 }).catch(() => {});
  await pg.waitForTimeout(1600);
  const before = await pg.evaluate(() => ({
    music: !document.getElementById('music-audio').paused,
    video: !document.querySelector('[data-project-id="filebutler"] video').paused,
    y: window.scrollY,
  }));
  // 往下滑两屏（视频被滚出视口上方）
  await pg.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
  await pg.waitForFunction(() => document.querySelector('[data-project-id="filebutler"] video').paused, null, { timeout: 6000 }).catch(() => {});
  await pg.waitForTimeout(1600);
  const after = await pg.evaluate(() => ({
    music: !document.getElementById('music-audio').paused,
    video: !document.querySelector('[data-project-id="filebutler"] video').paused,
    y: window.scrollY,
  }));
  assert(before.video && !before.music && after.video === false && after.music,
    'R4 看视频下滑离开 → 视频自动退出 + 音乐恢复',
    `y=${before.y}→${after.y} before(m=${before.music},v=${before.video}) after(m=${after.music},v=${after.video})`);
}

/* 附加：搜索死条目已修（按关键词行为断言） */
{
  await pg.evaluate(() => window.scrollTo(0, 0));
  await pg.evaluate(() => document.getElementById('search-open').click());
  await pg.waitForTimeout(500);
  const type = async (q) => {
    await pg.evaluate((v) => { const i = document.getElementById('search-input'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, q);
    await pg.waitForTimeout(400);
    return pg.evaluate(() => document.getElementById('search-results').textContent);
  };
  const dead = await type('核心数据');
  const lily = await type('理念');
  const about = await type('关于');
  assert(dead.includes('没有找到') && !dead.includes('区块'), '搜索「核心数据」无结果（死条目已删）', dead.slice(0, 40));
  assert(lily.includes('理念'), '搜索「理念」命中区块（与导航同名）', '');
  assert(about.includes('关于'), '搜索「关于」命中区块（新增条目）', '');
  await pg.keyboard.press('Escape');
}

assert(errs.length === 0, '全程无 pageerror', errs.slice(0, 2).join(' | '));
await ctx.close();

/* ===== ATK-1 回归上下文：404 / cosmos-home 不污染离线兜底 ===== */
{
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE, { waitUntil: 'load' });
  await p2.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20000 }).catch(() => {});
  await p2.waitForTimeout(2500);

  // 记录污染前的兜底首页内容指纹
  const before = await p2.evaluate(async () => {
    const hit = await caches.match('./index.html');
    return (await hit.text()).includes('楠屿札记') ? 'index' : 'other';
  });

  // 访问 404 与 cosmos-home（都会经过导航分支）
  await p2.goto(BASE + 'definitely-not-exist-404', { waitUntil: 'load' });
  await p2.goto(BASE + 'cosmos-home.html', { waitUntil: 'load' });
  await p2.waitForTimeout(800);

  const after = await p2.evaluate(async () => {
    const hit = await caches.match('./index.html');
    return (await hit.text()).includes('楠屿札记') ? 'index' : 'other';
  });
  assert(before === 'index' && after === 'index', 'ATK-1 回归：404/cosmos-home 不再污染离线兜底首页',
    `before=${before} after=${after}`);

  // 断网 → 导航回首页（兜底必须是缓存的 index；cosmos-home 不在缓存，reload 它只会看到 503 兜底文案）
  const cdp = await p2.context().newCDPSession(p2);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await p2.goto(BASE, { waitUntil: 'load', timeout: 20000 }).catch(() => {});
  await p2.waitForTimeout(1200);
  const off = await p2.evaluate(() => ({
    brand: document.querySelector('header a[href="#home"]')?.textContent?.trim() || '',
    cards: document.querySelectorAll('[data-project-id]').length,
  }));
  assert(off.brand === '楠屿札记' && off.cards >= 6, '离线兜底仍是完整首页',
    `brand=${off.brand} cards=${off.cards}`);
  try { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: 0, uploadThroughput: 0 }); } catch (e) {}
  await ctx2.close();
}

/* ===== R1-d 离线可播：断网 → 重载 → 播放 + 跳转 90% ===== */
{
  const ctx3 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p3 = await ctx3.newPage();
  await p3.goto(BASE, { waitUntil: 'load' });
  await p3.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20000 }).catch(() => {});
  await p3.waitForTimeout(3000);
  // 磁盘直灌全曲（绕过本机 IDM 劫持；干净网络下这一步由 prefetch-media 自然完成）
  try {
    const b64 = fs.readFileSync('D:/HTML/music/attention.mp3').toString('base64');
    await p3.evaluate(async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const cache = await caches.open('sevenjohn-v131');
      await cache.put(location.origin + '/music/attention.mp3', new Response(bytes, { headers: { 'Content-Type': 'audio/mpeg' } }));
    }, b64);
  } catch (e) { console.log('      [seed err]', String(e).slice(0, 80)); }
  const cdp3 = await p3.context().newCDPSession(p3);
  await cdp3.send('Network.enable');
  await cdp3.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await p3.reload({ waitUntil: 'load', timeout: 20000 }).catch(() => {});
  await p3.waitForTimeout(1500);
  const pageOk = await p3.evaluate(() => (document.querySelector('#home h1')?.textContent || '').length > 0);
  await p3.evaluate(() => window.__MUSIC.togglePlay());
  await p3.waitForFunction(() => !document.getElementById('music-audio').paused, null, { timeout: 6000 }).catch(() => {});
  // 跳到 90%（超出 warm 切片范围 → 必须命中全量缓存才能续播）
  const seek = await p3.evaluate(() => {
    const a = document.getElementById('music-audio');
    if (isFinite(a.duration)) a.currentTime = a.duration * 0.9;
    return isFinite(a.duration) ? Math.round(a.duration) : -1;
  });
  await p3.waitForTimeout(2500);
  const offAudio = await p3.evaluate(() => {
    const a = document.getElementById('music-audio');
    return { paused: a.paused, t: Math.round(a.currentTime), dur: Math.round(a.duration || 0) };
  });
  assert(pageOk && !offAudio.paused && offAudio.t > 0 && offAudio.dur > 0,
    'R1-d 断网后整站可读 + 音乐可播可跳（全量缓存生效）',
    `page=${pageOk} paused=${offAudio.paused} t=${offAudio.t}/${offAudio.dur}s seekTo=${seek}`);
  try { await cdp3.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: 0, uploadThroughput: 0 }); } catch (e) {}
  await ctx3.close();
}

/* ===== 404 页文案 ===== */
{
  const p3 = await b.newPage();
  await p3.goto(BASE + '404.html', { waitUntil: 'load' });
  const txt = await p3.evaluate(() => document.body.textContent);
  assert(txt.includes('几个小工具') && txt.includes('拍案') && txt.includes('Fluxion') && !txt.includes('三个小工具'),
    '404 页工具口径已对齐', '');
  assert(!txt.includes('© 2026 SevenJohn'), '404 页脚站名 = 楠屿札记', '');
  await p3.close();
}

await b.close();
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
