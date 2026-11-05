import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:8328/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const card = await page.$('article[data-project-id="filebutler"]');
  if (card) {
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await card.screenshot({ path: 'docs/screenshots/card-closeup-clean.png' });
    console.log('Saved card-closeup-clean.png');
  }

  // Also check hero index
  const heroIndex = await page.$('.hero-index');
  if (heroIndex) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await heroIndex.screenshot({ path: 'docs/screenshots/hero-index-closeup.png' });
    console.log('Saved hero-index-closeup.png');
  }

  // Check mobile 375px
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(300);
  if (heroIndex) {
    await heroIndex.screenshot({ path: 'docs/screenshots/hero-index-mobile.png' });
    console.log('Saved hero-index-mobile.png');
  }

  await browser.close();
  console.log('Done!');
}

main().catch(console.error);
