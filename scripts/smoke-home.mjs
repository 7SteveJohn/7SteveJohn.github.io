/* 首页体检：站名/副标题、卡片顺序、拍案卡片（视频+网盘）、无 pageerror
   用法：先起 127.0.0.1:8327 静态服务，再 node scripts/smoke-home.mjs */
import { createRequire } from 'module';
const require = createRequire('C:/Users/SevenJohn/.workbuddy/binaries/node/workspace/index.js');
const { chromium } = require('playwright-core');

const BASE = process.env.SITE_BASE || 'http://127.0.0.1:8327/';
const checks = [];
const ok = (name, pass, detail) => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(3500);

const info = await p.evaluate(() => {
  const sub = document.getElementById('site-subtitle');
  const cs = sub ? getComputedStyle(sub) : null;
  const ids = [...document.querySelectorAll('#products article[data-project-id]')].map((e) => e.dataset.projectId);
  const paian = document.querySelector('[data-project-id="paian"]');
  const v = paian && paian.querySelector('video');
  const dl = paian && paian.querySelector('[data-link="download"]');
  const pwd = paian && paian.querySelector('[data-pwd]');
  return {
    title: document.title,
    brand: document.querySelector('header a[href="#home"]')?.textContent.trim(),
    h1: document.querySelector('#home h1')?.textContent.trim(),
    sub: sub?.textContent.trim(),
    subColor: cs?.color,
    subClip: cs?.webkitBackgroundClip || cs?.backgroundClip,
    eyebrow: document.querySelector('#home .hero-eyebrow')?.textContent.trim(),
    heroP: [...document.querySelectorAll('#home p')].map((e) => e.textContent.trim()),
    sections: ['products', 'blog', 'creation', 'essays'].map(
      (id) => document.getElementById(id)?.querySelector('p.font-display')?.textContent.trim() || null
    ),
    about: [...document.querySelectorAll('#about p')].map((e) => e.textContent.trim()).join(' | '),
    ids,
    videoSrc: v?.getAttribute('src'),
    poster: v?.getAttribute('poster'),
    dlHref: dl?.getAttribute('href'),
    pwdText: pwd?.textContent.trim(),
  };
});

ok('#site-subtitle 存在且取自 config 文案', info.sub === '屿间汇叙 · 一隅存工码，亦叙尘世星文', info.sub);
ok('副标题继承渐变字（透明色 + background-clip）', info.subClip?.includes('text'), `${info.subColor} / ${info.subClip}`);
ok('hero 大标题 = 站名', info.h1 === '楠屿札记', info.h1);
ok('顶栏品牌 = 站名', info.brand === '楠屿札记', info.brand);
ok('眉标不再重复 SevenJohn', !/SevenJohn/.test(info.eyebrow || ''), info.eyebrow);
ok('#home 只剩眉标 + 副标题两行（自白/描述行已按用户要求删除）', info.heroP.length === 2, info.heroP.join(' ／ '));
ok('浏览器标题 = 楠屿札记…', /^楠屿札记/.test(info.title), info.title);
const WANT_SECTIONS = [
  '屿间汇叙 · 一隅存工码，亦叙尘世星文',
  '岁稿存匣 · 收纳工具手记，贮藏随笔与星章',
  '星砚耕行 · 研器书行迹，落笔揽晚星',
  '尘页实录 · 于此留存工具实践、技术手记与笔下故事',
];
ok('四个内容栏目的副标题 = 四字题 · 对句', JSON.stringify(info.sections) === JSON.stringify(WANT_SECTIONS), info.sections.join(' ／ '));
ok('关于我：去专业化（依托 AI + 试错）', /我并非擅长编码的人/.test(info.about) && /学习路上留下的脚印/.test(info.about) && !/应届|求职|平时写 Python/.test(info.about), info.about.slice(0, 34));
ok(
  '卡片顺序 FileButler → 拍案 → NetOps → Fluxion → GameBoost → DLSSG',
  info.ids.join(',') === 'filebutler,paian,netops-handbook,fluxion,gameboost,gameboost-dlssg',
  info.ids.join(',')
);
ok('拍案卡片大图 = 介绍片', info.videoSrc === 'assets/video/paian-intro.mp4', String(info.videoSrc));
ok('拍案海报存在', !!info.poster, String(info.poster));
ok('拍案网盘胶囊指向百度网盘', /pan\.baidu\.com\/s\/1FW267yG4QVrCdbYKOy5UsQ/.test(info.dlHref || ''), String(info.dlHref));
ok('拍案提取码 = vgym', /vgym/.test(info.pwdText || ''), String(info.pwdText));

// 视频真的能播（拿到元数据）
const playable = await p.evaluate(async () => {
  const v = document.querySelector('[data-project-id="paian"] video');
  if (!v) return 'no-video';
  if (v.readyState >= 1) return `meta ${v.videoWidth}x${v.videoHeight} ${Math.round(v.duration)}s`;
  return await new Promise((res) => {
    v.addEventListener('loadedmetadata', () => res(`meta ${v.videoWidth}x${v.videoHeight} ${Math.round(v.duration)}s`), { once: true });
    v.addEventListener('error', () => res('error'), { once: true });
    v.preload = 'metadata';
    v.load();
    setTimeout(() => res('timeout'), 15000);
  });
});
ok('拍案介绍片可读元数据', /^meta 1280x720 38s/.test(playable), playable);

ok('无 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));

await b.close();
const failed = checks.filter((c) => !c.pass).length;
console.log(`\n${checks.length - failed}/${checks.length} passed`);
process.exit(failed ? 1 : 0);
