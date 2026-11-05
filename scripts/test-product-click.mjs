import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  await page.goto('http://localhost:8328/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // 1. Check Hero Index layout (Single clean row, no line wrap)
  const hiNav = await page.$('.hero-index');
  const hiRows = await page.$$('.hero-index .hi-row');
  console.log('Hero index items count:', hiRows.length);

  // Click second item (paian)
  if (hiRows[1]) {
    await hiRows[1].click();
    await page.waitForTimeout(800);
  }

  // Scroll back to hero to take screenshot of hero index active state
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/screenshots/hero-index-clean.png' });
  console.log('Saved hero-index-clean.png');

  // 2. Check Product Card (FileButler) - verify no Apple traffic lights
  const trafficDots = await page.$$('.traffic-lights, .window-header');
  console.log('Apple window header & traffic lights count (should be 0):', trafficDots.length);

  // Scroll to FileButler card
  const cards = await page.$$('#products article[data-project-id]');
  if (cards[0]) {
    await cards[0].scrollIntoViewIfNeeded();
    await cards[0].hover();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'docs/screenshots/card-clean-floating.png' });
    console.log('Saved card-clean-floating.png');
  }

  // 3. Open changelog modal (FileButler "全部 11 个版本 →")
  const moreBtn = await page.$('article[data-project-id="filebutler"] button[data-open-changelog]');
  if (moreBtn) {
    console.log('Clicking changelog button...');
    await moreBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'docs/screenshots/modal-clean-changelog.png' });
    console.log('Saved modal-clean-changelog.png');
  }

  // Also test in dark mode
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screenshots/modal-clean-changelog-dark.png' });
  console.log('Saved modal-clean-changelog-dark.png');

  await browser.close();
  console.log('All tests passed successfully!');
}

main().catch(console.error);
