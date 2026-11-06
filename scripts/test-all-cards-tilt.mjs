import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');
import path from 'node:path';

async function testPage() {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Index Page
  console.log('--- Testing index.html ---');
  await page.goto('http://localhost:8328/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const productCard = await page.$('article[data-project-id="filebutler"]');
  if (!productCard) throw new Error('Product card filebutler not found');
  await productCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const box1 = await productCard.boundingBox();
  console.log('Product card box:', box1);

  // Move left
  await page.mouse.move(box1.x + 80, box1.y + box1.height / 2);
  await page.waitForTimeout(300);
  const tiltLeft = await productCard.evaluate(el => ({
    transform: el.style.transform,
    boxShadow: el.style.boxShadow
  }));
  console.log('Index Tilt Left:', tiltLeft);
  await page.screenshot({ path: 'test-index-tilt-left.png' });

  // Move right
  await page.mouse.move(box1.x + box1.width - 80, box1.y + box1.height / 2);
  await page.waitForTimeout(300);
  const tiltRight = await productCard.evaluate(el => ({
    transform: el.style.transform,
    boxShadow: el.style.boxShadow
  }));
  console.log('Index Tilt Right:', tiltRight);
  await page.screenshot({ path: 'test-index-tilt-right.png' });

  // Move away
  await page.mouse.move(10, 10);
  await page.waitForTimeout(300);
  const tiltReset = await productCard.evaluate(el => el.style.transform);
  console.log('Index Tilt Reset:', tiltReset === '' ? 'PASS (empty string)' : tiltReset);

  // 2. Archive Page
  console.log('\n--- Testing archive.html ---');
  await page.goto('http://localhost:8328/archive.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const arcCard = await page.$('.arc-card');
  if (!arcCard) throw new Error('Archive card .arc-card not found');
  await arcCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const box2 = await arcCard.boundingBox();
  console.log('Archive card box:', box2);

  await page.mouse.move(box2.x + 40, box2.y + box2.height / 2);
  await page.waitForTimeout(300);
  const arcTiltLeft = await arcCard.evaluate(el => ({
    transform: el.style.transform,
    boxShadow: el.style.boxShadow
  }));
  console.log('Archive Tilt Left:', arcTiltLeft);
  await page.screenshot({ path: 'test-archive-tilt-left.png' });

  await page.mouse.move(box2.x + box2.width - 40, box2.y + box2.height / 2);
  await page.waitForTimeout(300);
  const arcTiltRight = await arcCard.evaluate(el => ({
    transform: el.style.transform,
    boxShadow: el.style.boxShadow
  }));
  console.log('Archive Tilt Right:', arcTiltRight);
  await page.screenshot({ path: 'test-archive-tilt-right.png' });

  // 3. Gallery Page
  console.log('\n--- Testing gallery.html ---');
  await page.goto('http://localhost:8328/gallery.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const galTile = await page.$('.gal-tile');
  if (!galTile) throw new Error('Gallery tile .gal-tile not found');
  await galTile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const box3 = await galTile.boundingBox();
  console.log('Gallery tile box:', box3);

  await page.mouse.move(box3.x + 40, box3.y + box3.height / 2);
  await page.waitForTimeout(300);
  const galTilt = await galTile.evaluate(el => ({
    transform: el.style.transform,
    boxShadow: el.style.boxShadow
  }));
  console.log('Gallery Tilt:', galTilt);
  await page.screenshot({ path: 'test-gallery-tilt.png' });

  await browser.close();
  console.log('\nAll Playwright Tilt tests completed successfully!');
}

testPage().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
