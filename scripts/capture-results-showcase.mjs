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

  // 1. Hero Viewport
  const heroPath = path.join(artifactDir, 'showcase-01-hero.png');
  await page.screenshot({ path: heroPath });
  fs.copyFileSync(heroPath, path.join(docsDir, 'showcase-01-hero.png'));
  console.log('Hero captured:', heroPath);

  // 2. Philosophy Viewport (#philosophy)
  await page.locator('#philosophy').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const philPath = path.join(artifactDir, 'showcase-02-philosophy.png');
  await page.screenshot({ path: philPath });
  fs.copyFileSync(philPath, path.join(docsDir, 'showcase-02-philosophy.png'));
  console.log('Philosophy captured:', philPath);

  // 3. About Viewport (#about)
  await page.locator('#about').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const aboutPath = path.join(artifactDir, 'showcase-03-about.png');
  await page.screenshot({ path: aboutPath });
  fs.copyFileSync(aboutPath, path.join(docsDir, 'showcase-03-about.png'));
  console.log('About captured:', aboutPath);

  // 4. Dark Mode Switch
  await page.click('#theme-toggle');
  await page.waitForTimeout(800);

  // 5. Dark Mode Philosophy
  await page.locator('#philosophy').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const philDarkPath = path.join(artifactDir, 'showcase-06-philosophy-dark.png');
  await page.screenshot({ path: philDarkPath });
  fs.copyFileSync(philDarkPath, path.join(docsDir, 'showcase-06-philosophy-dark.png'));
  console.log('Philosophy Dark captured:', philDarkPath);

  // 6. Dark Mode About
  await page.locator('#about').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const aboutDarkPath = path.join(artifactDir, 'showcase-05-about-dark.png');
  await page.screenshot({ path: aboutDarkPath });
  fs.copyFileSync(aboutDarkPath, path.join(docsDir, 'showcase-05-about-dark.png'));
  console.log('About Dark captured:', aboutDarkPath);

  await browser.close();
  console.log('ALL SHOWCASE SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
