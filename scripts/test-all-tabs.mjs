import { devRequire as require } from './_dev-require.mjs';

async function main() {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:8328/cosmos-demo.html', { waitUntil: 'networkidle' });
  
  // 1. Chladni
  await page.click('button[data-mode="chladni"]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/screenshots/mode-chladni.png' });

  // 2. Monolith
  await page.click('button[data-mode="monolith"]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/screenshots/mode-monolith.png' });

  // 3. Neural
  await page.click('button[data-mode="neural"]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/screenshots/mode-neural.png' });

  // 4. Isolines
  await page.click('button[data-mode="isolines"]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/screenshots/mode-isolines.png' });

  console.log('All 4 modes screenshotted!');
  await browser.close();
}

main().catch(console.error);
