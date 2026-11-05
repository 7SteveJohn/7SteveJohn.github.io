import { devRequire as require } from './_dev-require.mjs';
import path from 'node:path';
import fs from 'node:fs';

async function verify() {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const filePath = 'http://localhost:8328/neural-background-animation.html';
  console.log('Navigating to', filePath);
  await page.goto(filePath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const canvasExists = await page.locator('#webgl-canvas').isVisible();
  console.log('Canvas visible:', canvasExists);

  const artifactDir = 'C:/Users/SevenJohn/.gemini/antigravity/brain/7ade5c98-86e3-4a6c-8356-405556e2978f';
  const docsDir = 'D:/HTML/docs/screenshots';

  // 1. Screenshot in Light Mode (Cymatics Mesh Sphere - matching user upload)
  await page.evaluate(() => {
    const btn = document.querySelector('.pill-btn[data-mode=\"cymatics\"]');
    if (btn) btn.click();
    document.documentElement.classList.remove('dark');
  });
  await page.waitForTimeout(600);
  const shot1 = path.join(artifactDir, 'neural-demo-01-mesh-light.png');
  await page.screenshot({ path: shot1 });
  fs.copyFileSync(shot1, path.join(docsDir, 'neural-demo-01-mesh-light.png'));
  console.log('Saved:', shot1);

  // 2. Screenshot in Dark Mode (Cymatics Mesh Sphere)
  await page.click('#theme-btn');
  await page.waitForTimeout(600);
  const shot2 = path.join(artifactDir, 'neural-demo-02-mesh-dark.png');
  await page.screenshot({ path: shot2 });
  fs.copyFileSync(shot2, path.join(docsDir, 'neural-demo-02-mesh-dark.png'));
  console.log('Saved:', shot2);

  // 3. Switch to Neural Mode (Dark)
  await page.click('.pill-btn[data-mode=\"neural\"]');
  await page.waitForTimeout(600);
  const shot3 = path.join(artifactDir, 'neural-demo-03-neural-dark.png');
  await page.screenshot({ path: shot3 });
  fs.copyFileSync(shot3, path.join(docsDir, 'neural-demo-03-neural-dark.png'));
  console.log('Saved:', shot3);

  console.log('Console Errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('Errors:', consoleErrors);
  }

  await browser.close();
  console.log('VERIFICATION DONE!');
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
