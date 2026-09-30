/* 冒烟：卡片介绍视频布局 + 弹窗图片/链接 + 关弹窗停声
   跑法：python -m http.server 8327 → node scripts/smoke-videos.mjs */
import { createRequire } from 'module';
const require = createRequire('C:/Users/SevenJohn/.workbuddy/binaries/node/workspace/index.js');
const { chromium } = require('playwright-core');

/* 网盘链接与提取码的期望值取自数据源，别在本文件里硬编码：
   2026-09-30 换蓝奏云链接时，就是这里写死的旧 slug 让断言假报 LINK-MISSING。 */
global.window = {};
createRequire(import.meta.url)('../js/projects.js');
const NETOPS = global.window.PROJECTS_DATA.find((x) => x.id === 'netops-handbook');

const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('http://127.0.0.1:8327/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(2500);

const vids = await p.evaluate(() =>
  ['filebutler', 'netops-handbook', 'fluxion'].map((id) => {
    const v = document.getElementById('video-' + id);
    if (!v) return id + ':MISSING';
    const r = v.getBoundingClientRect();
    const cs = getComputedStyle(v);
    const pill = [...document.querySelectorAll('button')].some((b2) => b2.textContent.includes('介绍视频'));
    return `${id}: ${Math.round(r.width)}x${Math.round(r.height)} controls=${v.controls} fit=${cs.objectFit} pill-leftover=${pill}`;
  })
);
console.log(vids.join('\n'));

await p.evaluate(() => document.querySelector('article[data-project-id="netops-handbook"]').scrollIntoView());
await p.waitForTimeout(900);
await p.screenshot({ path: 'D:/HTML/Temp/smoke-netops-card.png' });

await p.evaluate(() => {
  window.openProjectModal('netops-handbook');
});
await p.waitForTimeout(800);
const modal = await p.evaluate(() => {
  const m = document.getElementById('project-modal');
  const pick = (root) => root.querySelector('a[data-link="download"], a[href*="lanzouu"], a[href*="pan.baidu"]');
  const pwd = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : '');
  const cardA = pick(document.querySelector('article[data-project-id="netops-handbook"]'));
  const modalA = pick(m);
  return {
    videos: m.querySelectorAll('video').length,
    imgs: m.querySelectorAll('.markdown-body img').length,
    cardHref: cardA ? cardA.getAttribute('href') : 'MISSING',
    cardPwd: pwd(cardA),
    modalHref: modalA ? modalA.getAttribute('href') : 'MISSING',
    modalPwd: pwd(modalA),
  };
});
console.log('modal →', `videos=${modal.videos} imgs=${modal.imgs}`);

const wantPwd = `网盘下载 (提取码: ${NETOPS.downloadPwd})`;
let bad = 0;
const check = (ok, label, got) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ${got}`);
  if (!ok) bad++;
};
check(modal.cardHref === NETOPS.downloadUrl, '卡片下载链接 = projects.js downloadUrl', modal.cardHref);
check(modal.cardPwd === wantPwd, '卡片提取码 = projects.js downloadPwd', modal.cardPwd);
check(modal.modalHref === NETOPS.downloadUrl, '弹窗下载链接 = projects.js downloadUrl', modal.modalHref);
check(modal.modalPwd === wantPwd, '弹窗提取码 = projects.js downloadPwd', modal.modalPwd);
await p.screenshot({ path: 'D:/HTML/Temp/smoke-netops-modal.png' });

await p.evaluate(() => window.closeProjectModal());
await p.waitForTimeout(400);
const errLine = errs.length ? errs.join(' | ') : 'none';
console.log(errLine === 'none' ? 'PASS  无 pageerror' : `FAIL  有 pageerror  ${errLine}`);
if (errLine !== 'none') bad++;
if (bad) { console.log(`${bad} 项未通过`); process.exitCode = 1; }
await b.close();
