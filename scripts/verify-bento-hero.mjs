import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://127.0.0.1:8328/';
const outDir = path.resolve('docs/screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('--- 开始首屏 Bento 展台与视觉质感综合验证 ---');
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

try {
  // 1. 桌面端测试 (1440x900)
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));

  console.log(`正在访问 ${BASE} ...`);
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 检查首屏卡片可见性与内容
  const heroData = await page.evaluate(() => {
    const nav = document.querySelector('#home nav.hero-showcase-grid');
    const navStyle = nav ? window.getComputedStyle(nav) : null;
    const cards = [...document.querySelectorAll('#home .hero-bento-card')].map(c => {
      const rect = c.getBoundingClientRect();
      const cs = window.getComputedStyle(c);
      return {
        id: c.getAttribute('data-hi'),
        title: c.querySelector('h4')?.innerText.trim(),
        ver: c.querySelector('.hi-ver')?.innerText.trim(),
        visible: rect.width > 0 && rect.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        bg: cs.backgroundColor,
        border: cs.borderColor,
      };
    });

    const isDark = document.documentElement.classList.contains('dark');
    const bgBody = window.getComputedStyle(document.body).backgroundColor;

    // 检查指标条
    const metrics = [...document.querySelectorAll('#home nav.hero-showcase-grid .border-t span')].map(s => s.innerText.trim()).filter(Boolean);

    // 检查 #home p 数量 (smoke-home 测试标准)
    const homeP = [...document.querySelectorAll('#home p')].map(p => p.innerText.trim());

    return {
      navDisplay: navStyle ? navStyle.display : null,
      isDark,
      bgBody,
      cardsCount: cards.length,
      cards,
      metrics,
      homePCount: homeP.length,
      homeP,
    };
  });

  console.log('桌面端状态:', JSON.stringify(heroData, null, 2));

  // 截取暗色桌面端首屏截图
  await page.screenshot({ path: path.join(outDir, 'hero-dark-desktop.png') });
  console.log('✓ 已生成暗色模式桌面端截图: docs/screenshots/hero-dark-desktop.png');

  // 测试主题切换
  console.log('测试点击 #theme-toggle 切换明暗模式...');
  await page.click('#theme-toggle');
  await page.waitForTimeout(1000);

  const lightData = await page.evaluate(() => {
    return {
      isDark: document.documentElement.classList.contains('dark'),
      bgBody: window.getComputedStyle(document.body).backgroundColor,
      savedTheme: localStorage.getItem('sj.theme'),
    };
  });
  console.log('切换后状态:', lightData);
  await page.screenshot({ path: path.join(outDir, 'hero-light-desktop.png') });
  console.log('✓ 已生成亮色模式桌面端截图: docs/screenshots/hero-light-desktop.png');

  // 切回暗色模式（用户指定的夜空极客风）
  await page.click('#theme-toggle');
  await page.waitForTimeout(600);

  // 2. 移动端测试 (390x844)
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(1500);

  const mobileHero = await mobilePage.evaluate(() => {
    const cards = [...document.querySelectorAll('#home .hero-bento-card')].map(c => {
      const rect = c.getBoundingClientRect();
      return {
        id: c.getAttribute('data-hi'),
        visible: rect.width > 0 && rect.height > 0,
        width: Math.round(rect.width),
      };
    });
    return { cardsCount: cards.length, cards };
  });
  console.log('移动端状态:', mobileHero);

  await mobilePage.screenshot({ path: path.join(outDir, 'hero-dark-mobile.png') });
  console.log('✓ 已生成暗色模式移动端截图: docs/screenshots/hero-dark-mobile.png');

  console.log(`页面错误总数: ${errors.length}`);
  if (errors.length > 0) {
    console.error('页面报错:', errors);
  }

} finally {
  await browser.close();
}
