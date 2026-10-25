/**
 * SWR 策略专项回归（2026-10-05 卡顿修复配套）
 * ----------------------------------------------------
 * 验证 sw.js 全面 stale-while-revalidate 的核心契约：
 *   ① 静态资源缓存优先：网络注延迟后，重复 fetch 秒回且是旧内容（没等网络）；
 *   ② 后台更新：等一拍后同 URL 返回新内容（后台 revalidate 已入库）；
 *   ③ 导航缓存优先：3s 网络延迟下 reload 的 responseStart 仍是毫秒级（SW 秒开）；
 *   ④ 离线兜底仍在：断网 reload 页面完整。
 * 用法：node scripts/dev-server.js（8328）→ node scripts/swr-check.mjs
 * 手法：CDP emulateNetworkConditions 注入 3000ms 延迟——网络优先实现必然 >3s，
 *       缓存优先实现 <1s，计时本身就是断言，不依赖实现细节。
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8328/';
const PROBE = 'swr-probe.txt';
const CACHE_NAME = 'sevenjohn-v151';   // 与 sw.js 顶部 CACHE 同步改

let pass = 0, fail = 0;
const ok = (n, extra) => { pass++; console.log('PASS  ' + n + (extra ? '  ' + extra : '')); };
const bad = (n, extra) => { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); };
const assert = (cond, name, extra) => (cond ? ok : bad)(name, extra);

const probePath = fileURLToPath(new URL('../' + PROBE, import.meta.url));
fs.writeFileSync(probePath, 'v1', 'utf8');

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
try {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));

  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(async (name) => {
    const cache = await caches.open(name);
    return (await cache.keys()).length >= 40;          // install 预缓存 CORE 全量就位
  }, CACHE_NAME, { timeout: 30000, polling: 500 });
  ok('SW 注册且 CORE 预缓存就位（≥40 项）');

  // 注入 3s 网络延迟：此后所有"走网络"的请求都要付 3s，缓存命中则毫秒级
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 3000, downloadThroughput: 1000000, uploadThroughput: 1000000,
  });

  await page.evaluate(async (u) => (await fetch(u)).text(), BASE + PROBE);   // 首次：网络入库（慢，不断言时长）
  fs.writeFileSync(probePath, 'v2', 'utf8');

  const second = await page.evaluate(async (u) => {
    const t0 = performance.now();
    const text = await (await fetch(u)).text();
    return { text, ms: performance.now() - t0 };
  }, BASE + PROBE);
  assert(second.text === 'v1' && second.ms < 1000,
    '① 静态资源缓存优先（3s 延迟下毫秒级返回旧内容）', `v=${second.text} ${Math.round(second.ms)}ms`);

  await page.waitForTimeout(4500);                      // 等后台 revalidate（3s 延迟 + 余量）
  const third = await page.evaluate(async (u) => (await fetch(u)).text(), BASE + PROBE);
  assert(third === 'v2', '② 后台更新生效（第三次 fetch 拿到新内容）', 'v=' + third);

  const nav = await page.reload({ waitUntil: 'load', timeout: 30000 });
  const timing = await page.evaluate(() => {
    const t = performance.getEntriesByType('navigation')[0];
    return { responseStart: t.responseStart, transferSize: t.transferSize };
  });
  assert(timing.responseStart < 1500,
    '③ 导航缓存优先（3s 延迟下 reload 响应仍是毫秒级）', `responseStart=${Math.round(timing.responseStart)}ms transferSize=${timing.transferSize}`);

  await cdp.send('Network.emulateNetworkConditions', {
    offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0,
  });
  await page.reload({ waitUntil: 'load', timeout: 20000 });
  const state = await page.evaluate(() => ({
    brand: document.querySelector('header a[href="#home"]')?.textContent?.trim() || '',
    cards: document.querySelectorAll('[data-project-id]').length,
  }));
  assert(state.brand === '楠屿札记' && state.cards >= 6, '④ 离线 reload 页面完整（SWR 缓存即离线兜底）', `brand=${state.brand} cards=${state.cards}`);
  assert(errors.length === 0, '全程无 pageerror', errors.join(' | '));
} finally {
  await browser.close();
  try { fs.unlinkSync(probePath); } catch (e) {}
}
console.log(`\nswr-check: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
