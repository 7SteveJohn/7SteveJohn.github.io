import { devRequire as require } from './_dev-require.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ARTIFACTS_DIR = 'C:/Users/SevenJohn/.gemini/antigravity/brain/7ade5c98-86e3-4a6c-8356-405556e2978f';

(async () => {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('Navigating to http://127.0.0.1:8328/ ...');
  await page.goto('http://127.0.0.1:8328/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Philosophy section in Light mode
  const phil = page.locator('#philosophy');
  await phil.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await phil.screenshot({ path: path.join(ARTIFACTS_DIR, 'copy-01-philosophy-light.png') });
  console.log('Saved copy-01-philosophy-light.png');

  // 2. About section in Light mode
  const about = page.locator('#about');
  await about.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await about.screenshot({ path: path.join(ARTIFACTS_DIR, 'copy-02-about-light.png') });
  console.log('Saved copy-02-about-light.png');

  // Switch to Dark mode
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  });
  await page.waitForTimeout(600);

  // 3. Philosophy section in Dark mode
  await phil.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await phil.screenshot({ path: path.join(ARTIFACTS_DIR, 'copy-03-philosophy-dark.png') });
  console.log('Saved copy-03-philosophy-dark.png');

  // 4. About section in Dark mode
  await about.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await about.screenshot({ path: path.join(ARTIFACTS_DIR, 'copy-04-about-dark.png') });
  console.log('Saved copy-04-about-dark.png');

  await browser.close();
  console.log('Capture complete!');
})();
