import { devRequire as require } from './_dev-require.mjs';

async function main() {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:8328/', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('sj.cosmos-mode', 'neural');
    if (window.switchCosmosMode) window.switchCosmosMode('neural');
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/screenshots/neural-mode-state.png' });
  console.log('Neural mode screenshot saved');
  await browser.close();
}

main().catch(console.error);
