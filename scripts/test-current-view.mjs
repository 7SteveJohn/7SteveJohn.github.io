import { devRequire as require } from './_dev-require.mjs';

async function main() {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // 监听 console 错误
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[Browser Error]', msg.text());
  });

  await page.goto('http://127.0.0.1:8328/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  const mode = await page.evaluate(() => localStorage.getItem('sj.cosmos-mode'));
  const tier = await page.evaluate(() => window.__COSMOS_TIER);
  console.log('Current COSMOS_TIER:', tier, 'COSMOS_MODE:', mode);
  
  await page.screenshot({ path: 'docs/screenshots/current-index-state.png' });
  console.log('Screenshot saved to docs/screenshots/current-index-state.png');

  await browser.close();
}

main().catch(console.error);
