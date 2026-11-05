import { devRequire as require } from './_dev-require.mjs';

async function main() {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  
  // 1440x900 宽屏桌面视口
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

  const hasStudioLayout = await page.evaluate(() => !!document.querySelector('.hero-studio-layout'));
  const dioramaCount = await page.evaluate(() => document.querySelectorAll('.hero-diorama-card').length);
  const hasOldFlank = await page.evaluate(() => !!document.querySelector('.hero-flank-rail'));
  console.log(`Studio Layout: ${hasStudioLayout}, Diorama Count: ${dioramaCount}, Old Flank Removed: ${!hasOldFlank}`);

  // 截图 1：白昼模式温润工坊双栏（左人文 · 右真作品）
  await page.screenshot({ path: 'docs/screenshots/warm-atelier-light.png' });
  console.log('Saved docs/screenshots/warm-atelier-light.png');

  // 截图 2：深色模式全景
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/screenshots/warm-atelier-dark.png' });
  console.log('Saved docs/screenshots/warm-atelier-dark.png');

  // 移动端视口检测 (390x844)
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto('http://127.0.0.1:8328/', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);
  const scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await mobilePage.evaluate(() => document.documentElement.clientWidth);
  console.log(`Mobile: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
  await mobilePage.screenshot({ path: 'docs/screenshots/warm-atelier-mobile.png' });
  console.log('Saved docs/screenshots/warm-atelier-mobile.png');

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
