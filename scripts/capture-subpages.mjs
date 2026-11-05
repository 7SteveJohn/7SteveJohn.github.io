import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  // 1. Visit archive.html (defaults to light mode in v6)
  await page.goto('http://localhost:8328/archive.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/screenshots/subpage-archive-light.png', fullPage: false });
  console.log('Saved archive-light');

  // Test interactive theme toggle button
  const toggleBtn = await page.$('#theme-toggle');
  if (toggleBtn) {
    await toggleBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'docs/screenshots/subpage-archive-dark.png', fullPage: false });
    console.log('Saved archive-dark after clicking theme-toggle');
  }

  // 2. Visit gallery.html
  await page.goto('http://localhost:8328/gallery.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/screenshots/subpage-gallery-dark.png', fullPage: false });
  console.log('Saved gallery-dark');

  // Click theme toggle button to switch to light mode
  const galToggleBtn = await page.$('#theme-toggle');
  if (galToggleBtn) {
    await galToggleBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'docs/screenshots/subpage-gallery-light.png', fullPage: false });
    console.log('Saved gallery-light after clicking theme-toggle');
  }

  // Also capture mobile viewport for archive and gallery
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:8328/archive.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots/subpage-archive-mobile.png', fullPage: false });
  console.log('Saved archive-mobile');

  await page.goto('http://localhost:8328/gallery.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots/subpage-gallery-mobile.png', fullPage: false });
  console.log('Saved gallery-mobile');

  await browser.close();
}

main().catch(console.error);
