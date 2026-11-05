import { devRequire as require } from './_dev-require.mjs';
import path from 'node:path';
import fs from 'node:fs';

async function capture() {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const artifactDir = 'C:/Users/SevenJohn/.gemini/antigravity/brain/7ade5c98-86e3-4a6c-8356-405556e2978f';
  const docsDir = 'D:/HTML/docs/screenshots';

  console.log('Navigating to http://localhost:8328/ ...');
  await page.goto('http://localhost:8328/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Light Mode Card Selection: Click Hero Index '01 FileButler'
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.waitForTimeout(500);

  const heroIndexRow = page.locator('#home [data-hi="filebutler"]');
  await heroIndexRow.click();
  await page.waitForTimeout(1000);

  // Capture selected card in Light mode
  const targetCard = page.locator('#products article[data-project-id="filebutler"]');
  const shot1 = path.join(artifactDir, 'card-selected-01-light.png');
  await targetCard.screenshot({ path: shot1 });
  fs.copyFileSync(shot1, path.join(docsDir, 'card-selected-01-light.png'));
  console.log('Saved:', shot1);

  // 2. Dark Mode Card Selection: Click Hero Index '02 拍案'
  await page.click('#theme-toggle');
  await page.waitForTimeout(600);

  // Scroll back to hero and click '02 paian'
  await page.locator('#home').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.locator('#home [data-hi="paian"]').click();
  await page.waitForTimeout(1000);

  const targetCard2 = page.locator('#products article[data-project-id="paian"]');
  const shot2 = path.join(artifactDir, 'card-selected-02-dark.png');
  await targetCard2.screenshot({ path: shot2 });
  fs.copyFileSync(shot2, path.join(docsDir, 'card-selected-02-dark.png'));
  console.log('Saved:', shot2);

  // 3. Hero Index Selected Active State (Hero Index Tabs)
  await page.locator('#home').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const heroIndexGroup = page.locator('#home .hero-index');
  const shot3 = path.join(artifactDir, 'card-selected-03-hero-tabs.png');
  await heroIndexGroup.screenshot({ path: shot3 });
  fs.copyFileSync(shot3, path.join(docsDir, 'card-selected-03-hero-tabs.png'));
  console.log('Saved:', shot3);

  await browser.close();
  console.log('ALL CARD SELECTION SCREENSHOTS SAVED!');
}

capture().catch(e => {
  console.error(e);
  process.exit(1);
});
