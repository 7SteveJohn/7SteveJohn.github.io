import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:8328/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const card = await page.$('article[data-project-id="filebutler"]');
  if (!card) {
    console.error('Filebutler card not found');
    await browser.close();
    return;
  }

  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const box = await card.boundingBox();
  if (!box) {
    console.error('Could not get bounding box');
    await browser.close();
    return;
  }

  // 1. Move to left side of the card (20% from left, vertically center)
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.5);
  await page.waitForTimeout(400); // let lerp settle
  const transformLeft = await card.evaluate(el => el.style.transform);
  console.log('Tilt Left Transform:', transformLeft);
  await card.screenshot({ path: 'docs/screenshots/card-tilt-left.png' });
  console.log('Saved card-tilt-left.png');

  // 2. Move to right side of the card (85% from left, vertically center)
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.5);
  await page.waitForTimeout(400); // let lerp settle
  const transformRight = await card.evaluate(el => el.style.transform);
  console.log('Tilt Right Transform:', transformRight);
  await card.screenshot({ path: 'docs/screenshots/card-tilt-right.png' });
  console.log('Saved card-tilt-right.png');

  // 3. Move outside to test smooth reset
  await page.mouse.move(50, 50);
  await page.waitForTimeout(600);
  const transformReset = await card.evaluate(el => el.style.transform);
  console.log('Tilt Reset Transform (should be empty):', transformReset || '(empty)');

  await browser.close();
  console.log('Test completed successfully!');
}

main().catch(console.error);
