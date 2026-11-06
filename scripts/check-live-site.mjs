import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('console', msg => console.log('LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err);
    errors.push(err);
  });

  console.log('Navigating to live site https://7stevejohn.github.io/ ...');
  await page.goto('https://7stevejohn.github.io/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const card = await page.$('article[data-project-id="filebutler"]');
  if (!card) {
    console.log('No card found!');
    await browser.close();
    return;
  }

  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const box = await card.boundingBox();
  console.log('Card bounding box:', box);

  // Hover left
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.5);
  await page.waitForTimeout(500);
  const tfLeft = await card.evaluate(el => el.style.transform);
  console.log('LIVE Tilt Left Transform:', tfLeft);

  // Hover right
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.5);
  await page.waitForTimeout(500);
  const tfRight = await card.evaluate(el => el.style.transform);
  console.log('LIVE Tilt Right Transform:', tfRight);

  await browser.close();
  console.log('Done check.');
}

main().catch(console.error);
