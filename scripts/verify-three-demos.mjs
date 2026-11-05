import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8328;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function run() {
  const screenshotDir = path.resolve('docs/screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console error on ${page.url()}: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`Page error on ${page.url()}: ${err.message}`);
  });

  console.log('--- Testing Demo 1: 仿 Anthony Fu (antfu.me) ---');
  await page.goto(`${BASE_URL}/demo-anthony-fu.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const canvasA = await page.$('#plum-canvas');
  console.log('Plum canvas exists:', !!canvasA);
  await page.screenshot({ path: path.join(screenshotDir, 'demo-1-antfu.png'), fullPage: false });
  console.log('Saved demo-1-antfu.png');

  console.log('--- Testing Demo 2: 仿 Shu Ding (shud.in) ---');
  await page.goto(`${BASE_URL}/demo-shuding.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const cobeCanvas = await page.$('#cobe-canvas');
  console.log('COBE canvas exists:', !!cobeCanvas);
  await page.screenshot({ path: path.join(screenshotDir, 'demo-2-shuding.png'), fullPage: false });
  console.log('Saved demo-2-shuding.png');

  console.log('--- Testing Demo 3: 仿 Rauno Freiberg (rauno.me) ---');
  await page.goto(`${BASE_URL}/demo-rauno.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const craftBoxes = await page.$$('.craft-box');
  console.log('Craft boxes count:', craftBoxes.length);
  await page.screenshot({ path: path.join(screenshotDir, 'demo-3-rauno.png'), fullPage: false });
  console.log('Saved demo-3-rauno.png');

  await browser.close();

  if (errors.length > 0) {
    console.error('Errors encountered:', errors);
    process.exit(1);
  } else {
    console.log('SUCCESS! ALL 3 REAL BLOG DEMOS VERIFIED WITH 0 CONSOLE ERRORS!');
  }
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
