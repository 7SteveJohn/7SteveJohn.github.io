import { devRequire as require } from './_dev-require.mjs';

async function main() {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Cosmos demo light aurora
  await page.goto('http://127.0.0.1:8328/cosmos-demo.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/screenshots/aurora-light.png' });

  // 2. Cosmos demo dark aurora
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/screenshots/aurora-dark.png' });

  console.log('Saved aurora-light and aurora-dark screenshots');
  await browser.close();
}

main().catch(console.error);
