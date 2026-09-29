/* 性能与素材完整性体检
   用法：先起 127.0.0.1:8327 静态服务，再 node scripts/perf-audit.mjs
   关注四件事：秒启动（首屏可见耗时 / 总字节）、不卡顿（长任务）、手机不丢素材（404 / 加载失败）、
              手机不失真（图片 intrinsic 比例 vs 渲染比例 + object-fit） */
import { createRequire } from 'module';
const require = createRequire('C:/Users/SevenJohn/.workbuddy/binaries/node/workspace/index.js');
const { chromium } = require('playwright-core');

const BASE = process.env.SITE_BASE || 'http://127.0.0.1:8327/';

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });

for (const [tag, net] of [
  ['本机', null],
  ['手机4G', { offline: false, latency: 100, downloadThroughput: (4 * 1024 * 1024) / 8, uploadThroughput: (2 * 1024 * 1024) / 8 }],
  ['弱网3G', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 }],
]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  if (net) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', net);
  }

  const failed = [];
  p.on('requestfailed', (r) => failed.push(`${r.url().replace(BASE, '')} (${r.failure()?.errorText})`));
  p.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.url().replace(BASE, '')} → HTTP ${r.status()}`);
  });
  const longtasks = [];
  await p.addInitScript(() => {
    window.__lt = [];
    try {
      new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] });
    } catch {}
  });
  await p.evaluateOnNewDocument?.(() => {});

  const t0 = Date.now();
  await p.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  const loadMs = Date.now() - t0;

  // 首屏标题真正可见（起来）的耗时
  const heroMs = await p.evaluate(() => {
    const e = performance.getEntriesByName('first-contentful-paint')[0];
    return e ? Math.round(e.startTime) : null;
  });

  const nav = await p.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    const sum = res.reduce((a, r) => a + (r.transferSize || 0), 0);
    const top = res
      .map((r) => [r.name.replace(location.origin + '/', ''), Math.round((r.transferSize || 0) / 1024)])
      .filter(([n]) => !n.startsWith('http'))
      .sort((a, b2) => b2[1] - a[1])
      .slice(0, 6);
    const waterfall = res
      .filter((r) => r.name.startsWith(location.origin))
      .sort((a, b2) => a.startTime - b2.startTime)
      .slice(0, 8)
      .map((r) => `${r.name.replace(location.origin + '/', '').slice(-34)} ${Math.round(r.startTime)}→${Math.round(r.responseEnd)}`);
    return {
      waterfall,
      domInteractive: Math.round(n.domInteractive),
      domComplete: Math.round(n.domComplete),
      reqCount: res.length,
      totalKB: Math.round(sum / 1024),
      top,
    };
  });

  // 滚动一遍量长任务与卡顿
  await p.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
  });
  await p.waitForTimeout(600);
  const lt = await p.evaluate(() => window.__lt.slice(0, 8));

  // 素材完整性 + 失真
  const media = await p.evaluate(() => {
    const bad = [];
    const dist = [];
    document.querySelectorAll('img').forEach((im) => {
      const r = im.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      if (!im.complete || im.naturalWidth === 0) {
        bad.push(`${im.getAttribute('src')} 未加载`);
        return;
      }
      const nat = im.naturalWidth / im.naturalHeight;
      const ren = r.width / r.height;
      const fit = getComputedStyle(im).objectFit;
      // object-fit: cover/contain 下比例不同是设计意图；只有 none/fill 或默认(fill) 才会拉变形
      if ((fit === 'fill' || fit === 'none') && Math.abs(nat - ren) / nat > 0.02) {
        dist.push(`${im.getAttribute('src')} 原比 ${nat.toFixed(2)} → 渲染 ${ren.toFixed(2)} (fit=${fit})`);
      }
    });
    return { bad, dist };
  });

  console.log(`\n=== ${tag} ===`);
  console.log(`首屏可见(FCP): ${heroMs}ms · load: ${loadMs}ms · DOMInteractive: ${nav.domInteractive}ms`);
  console.log(`请求 ${nav.reqCount} 个 · 传输 ${nav.totalKB}KB · 最大几项: ${nav.top.map(([n, k]) => `${n} ${k}KB`).join(' | ')}`);
  console.log(`关键路径(开始→响应完): ${nav.waterfall.join(' | ')}`);
  console.log(`长任务(滚动期间): ${lt.length ? lt.join('ms, ') + 'ms' : '无'}`);
  console.log(`加载失败/404: ${failed.length ? failed.join(' | ') : '无'}`);
  console.log(`图片未加载: ${media.bad.length ? media.bad.join(' | ') : '无'}`);
  console.log(`图片失真: ${media.dist.length ? media.dist.join(' | ') : '无'}`);
  await ctx.close();
}
await b.close();
