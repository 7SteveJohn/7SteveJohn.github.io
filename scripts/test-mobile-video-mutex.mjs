import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  // Mobile iPhone 14 / modern Android viewport
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  console.log('Testing mobile flow on http://127.0.0.1:8328/ ...');
  await page.goto('http://127.0.0.1:8328/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // 1. Play music
  await page.click('#music-fab');
  await page.waitForTimeout(300);
  await page.click('#music-play');
  await page.waitForTimeout(600);

  const mPlaying = await page.evaluate(() => !document.getElementById('music-audio').paused);
  console.log('Mobile: Music playing =', mPlaying);

  // 2. Scroll to FileButler card
  await page.evaluate(() => {
    const card = document.querySelector('#products article[data-project-id="filebutler"]');
    card.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(400);

  // 3. Play video
  await page.click('#products article[data-project-id="filebutler"] .video-play-gate');
  await page.waitForTimeout(1000);

  const sWatch = await page.evaluate(() => {
    const v = document.getElementById('video-filebutler');
    const a = document.getElementById('music-audio');
    return { vPaused: v.paused, mPaused: a.paused };
  });
  console.log('Mobile: While watching video =', sWatch);
  if (sWatch.vPaused || !sWatch.mPaused) throw new Error('Mobile video/music state invalid!');

  // Take mobile screenshot while watching
  await page.screenshot({ path: 'docs/screenshots/video-mutex-03-mobile-playing.png' });

  // 4. Scroll down 400px (scrolls past video)
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'instant' }));
  await page.waitForTimeout(600);

  const sScrolled = await page.evaluate(() => {
    const v = document.getElementById('video-filebutler');
    const a = document.getElementById('music-audio');
    return { vPaused: v.paused, mPaused: a.paused };
  });
  console.log('Mobile: After scrolling down =', sScrolled);
  if (!sScrolled.vPaused || sScrolled.mPaused) throw new Error('Mobile scroll pause/resume failed!');

  // Take mobile screenshot after scroll
  await page.screenshot({ path: 'docs/screenshots/video-mutex-04-mobile-scrolled.png' });

  console.log('=== MOBILE TEST PASSED ===');
  await browser.close();
})();
