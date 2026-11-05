import { devRequire as require } from './_dev-require.mjs';
import fs from 'node:fs';
import path from 'node:path';

async function capture() {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });

  const artifactDir = 'C:/Users/SevenJohn/.gemini/antigravity/brain/7ade5c98-86e3-4a6c-8356-405556e2978f';
  const docsDir = 'D:/HTML/docs/screenshots';
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Navigating to http://127.0.0.1:8328/ ...');
  await page.goto('http://127.0.0.1:8328/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // --- LIGHT MODE CAPTURES ---
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.waitForTimeout(500);

  // 1. Hero Buttons Closeup (Light)
  await page.locator('#home').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const heroBtnGroup = page.locator('#home div[data-page-node-id="9k9USFkpWLPqOIc8MoG9Az"]');
  const heroBtnLight = path.join(artifactDir, 'buttons-01-hero-light.png');
  await heroBtnGroup.screenshot({ path: heroBtnLight });
  fs.copyFileSync(heroBtnLight, path.join(docsDir, 'buttons-01-hero-light.png'));
  console.log('Captured:', heroBtnLight);

  // 2. Product 1 Card & Buttons Closeup (Light)
  const prodCard = page.locator('#products article:first-of-type');
  await prodCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const prodBtnLight = path.join(artifactDir, 'buttons-02-product-light.png');
  await prodCard.screenshot({ path: prodBtnLight });
  fs.copyFileSync(prodBtnLight, path.join(docsDir, 'buttons-02-product-light.png'));
  console.log('Captured:', prodBtnLight);

  // 3. About Card & Contact Chips Closeup (Light)
  const aboutCard = page.locator('#about .bento-card');
  await aboutCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const aboutChipsLight = path.join(artifactDir, 'buttons-03-about-light.png');
  await aboutCard.screenshot({ path: aboutChipsLight });
  fs.copyFileSync(aboutChipsLight, path.join(docsDir, 'buttons-03-about-light.png'));
  console.log('Captured:', aboutChipsLight);

  // --- DARK MODE CAPTURES ---
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(600);

  // 4. Hero Buttons Closeup (Dark)
  await page.locator('#home').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const heroBtnDark = path.join(artifactDir, 'buttons-04-hero-dark.png');
  await heroBtnGroup.screenshot({ path: heroBtnDark });
  fs.copyFileSync(heroBtnDark, path.join(docsDir, 'buttons-04-hero-dark.png'));
  console.log('Captured:', heroBtnDark);

  // 5. Product 1 Card & Buttons Closeup (Dark)
  await prodCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const prodBtnDark = path.join(artifactDir, 'buttons-05-product-dark.png');
  await prodCard.screenshot({ path: prodBtnDark });
  fs.copyFileSync(prodBtnDark, path.join(docsDir, 'buttons-05-product-dark.png'));
  console.log('Captured:', prodBtnDark);

  // 6. About Card & Contact Chips Closeup (Dark)
  await aboutCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const aboutChipsDark = path.join(artifactDir, 'buttons-06-about-dark.png');
  await aboutCard.screenshot({ path: aboutChipsDark });
  fs.copyFileSync(aboutChipsDark, path.join(docsDir, 'buttons-06-about-dark.png'));
  console.log('Captured:', aboutChipsDark);

  // 7. Full Hero Viewport (Dark)
  await page.locator('#home').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const heroDarkFull = path.join(artifactDir, 'showcase-07-hero-dark.png');
  await page.screenshot({ path: heroDarkFull });
  fs.copyFileSync(heroDarkFull, path.join(docsDir, 'showcase-07-hero-dark.png'));
  console.log('Captured:', heroDarkFull);

  await browser.close();
  console.log('ALL BUTTON SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
