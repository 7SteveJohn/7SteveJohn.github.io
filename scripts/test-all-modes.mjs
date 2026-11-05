import { devRequire as require } from './_dev-require.mjs';

async function main() {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:8328/cosmos-demo.html?mode=chladni', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/screenshots/cosmos-demo-chladni.png' });

  await page.goto('http://127.0.0.1:8328/cosmos-demo.html?mode=monolith', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/screenshots/cosmos-demo-monolith.png' });

  console.log('Chladni and Monolith screenshots saved');
  await browser.close();
}

main().catch(console.error);
