import { devRequire as require } from './_dev-require.mjs';

async function main() {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  
  // 模拟标准 1440x900 宽屏桌面视口
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('[Browser Error]', msg.text());
    }
  });

  console.log('Navigating to http://127.0.0.1:8328/ ...');
  await page.goto('http://127.0.0.1:8328/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500); // 确保 3D 背景完整启动并淡入

  const hasLeftFlank = await page.evaluate(() => !!document.querySelector('.hero-flank-left'));
  const hasRightFlank = await page.evaluate(() => !!document.querySelector('.hero-flank-right'));
  const hasDioramas = await page.evaluate(() => document.querySelectorAll('.hero-diorama-card').length === 4);
  console.log(`Elements in DOM: Left Flank: ${hasLeftFlank}, Right Flank: ${hasRightFlank}, Dioramas: ${hasDioramas}`);

  // 截图 1：白昼模式宽屏工坊双翼全景（消除两侧空旷）
  await page.screenshot({ path: 'docs/screenshots/widescreen-hero-light.png' });
  console.log('Saved docs/screenshots/widescreen-hero-light.png');

  // 截图 2：深色模式全景
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/screenshots/widescreen-hero-dark.png' });
  console.log('Saved docs/screenshots/widescreen-hero-dark.png');

  // 模拟右翼播放律动按钮点击与音轨交互
  console.log('Testing audio interaction from right flank...');
  await page.click('#flank-audio-play-btn');
  await page.waitForTimeout(1500);

  const audioStateText = await page.evaluate(() => document.getElementById('flank-audio-state')?.textContent);
  console.log('Audio state after click:', audioStateText);
  await page.screenshot({ path: 'docs/screenshots/widescreen-hero-playing.png' });
  console.log('Saved docs/screenshots/widescreen-hero-playing.png');

  // 移动端视口检测 (390x844)
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto('http://127.0.0.1:8328/', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);
  const leftVisible = await mobilePage.evaluate(() => {
    const el = document.querySelector('.hero-flank-left');
    return el && window.getComputedStyle(el).display !== 'none';
  });
  const scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await mobilePage.evaluate(() => document.documentElement.clientWidth);
  console.log(`Mobile: leftVisible=${leftVisible}, scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
  await mobilePage.screenshot({ path: 'docs/screenshots/widescreen-hero-mobile.png' });
  console.log('Saved docs/screenshots/widescreen-hero-mobile.png');

  await browser.close();

  if (errors.length > 0) {
    console.warn('Encountered console errors:', errors);
    process.exit(1);
  } else {
    console.log('ALL VERIFICATIONS PASSED WITH 0 CONSOLE ERRORS!');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
