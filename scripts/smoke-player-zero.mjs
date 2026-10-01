/* 冒烟：播放器零记录——写入旧续听键 → 刷新 → 应回到第一首且键被清除 */
import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const ctx = await b.newContext();
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:8327/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(2000);

// 模拟老访客残留：上次听到第 6 首（Tek It）
await p.evaluate(() => {
  localStorage.setItem('sj.music-resume', JSON.stringify({ i: 5, src: 'music/tek-it.mp3' }));
});
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);

const r = await p.evaluate(() => ({
  title: document.getElementById('music-title').textContent,
  resumeKey: localStorage.getItem('sj.music-resume'),
  legacyKey: localStorage.getItem('music-resume'),
  paused: document.getElementById('music-audio').paused,
}));
console.log(`首曲=${r.title} resumeKey=${r.resumeKey} legacyKey=${r.legacyKey} paused=${r.paused}`);
console.log(r.title === 'Attention' && r.resumeKey === null && r.legacyKey === null && r.paused
  ? 'PASS 零播放记录' : 'FAIL');
await b.close();
