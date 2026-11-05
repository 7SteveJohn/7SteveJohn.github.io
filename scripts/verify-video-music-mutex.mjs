import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Navigating to http://127.0.0.1:8328/ ...');
  await page.goto('http://127.0.0.1:8328/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // 1. Play background music
  console.log('1. Starting background music...');
  await page.click('#music-fab');
  await page.waitForTimeout(300);
  await page.click('#music-play');
  await page.waitForTimeout(800);

  const m1 = await page.evaluate(() => {
    const a = document.getElementById('music-audio');
    return { paused: a ? a.paused : null, time: a ? a.currentTime : 0 };
  });
  console.log('Music status (playing):', m1);
  if (m1.paused) throw new Error('Music failed to start!');

  // 2. Scroll to FileButler card
  console.log('2. Scrolling to FileButler card...');
  await page.evaluate(() => {
    const card = document.querySelector('#products article[data-project-id="filebutler"]');
    card.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(500);

  // 3. Play video
  console.log('3. Clicking intro video play button...');
  await page.click('#products article[data-project-id="filebutler"] .video-play-gate');
  await page.waitForTimeout(1000);

  const sVideoPlaying = await page.evaluate(() => {
    const v = document.getElementById('video-filebutler');
    const a = document.getElementById('music-audio');
    const box = v.closest('.cover-box');
    return {
      vPaused: v.paused,
      vTime: v.currentTime,
      mPaused: a.paused,
      mTime: a.currentTime,
      hasBeatClass: box.classList.contains('is-playing-beat')
    };
  });
  console.log('While watching video:', sVideoPlaying);
  if (sVideoPlaying.vPaused) throw new Error('Video failed to play!');
  if (!sVideoPlaying.mPaused) throw new Error('Requirement 1 FAILED: Music did NOT pause when video played!');

  // Take screenshot while video is playing with beat
  await page.screenshot({ path: 'docs/screenshots/video-mutex-01-playing.png' });

  // 4. Stay looking at video for 1.5 seconds (ensure it doesn't pause while in view)
  console.log('4. Staying in view for 1.5s...');
  await page.waitForTimeout(1500);
  const sStillInView = await page.evaluate(() => {
    const v = document.getElementById('video-filebutler');
    const a = document.getElementById('music-audio');
    return { vPaused: v.paused, mPaused: a.paused };
  });
  console.log('Still looking at video:', sStillInView);
  if (sStillInView.vPaused) throw new Error('Requirement 2 Part 1 FAILED: Video paused while user was still looking at it!');
  if (!sStillInView.mPaused) throw new Error('Music unpaused prematurely!');

  // 5. Scroll down (user scrolled down to read more / next section)
  console.log('5. Scrolling down (往下滑了)...');
  await page.evaluate(() => {
    window.scrollBy({ top: 380, behavior: 'instant' });
  });
  await page.waitForTimeout(600);

  const sScrolledDown = await page.evaluate(() => {
    const v = document.getElementById('video-filebutler');
    const a = document.getElementById('music-audio');
    const box = v.closest('.cover-box');
    const r = v.getBoundingClientRect();
    return {
      vPaused: v.paused,
      vTime: v.currentTime,
      mPaused: a.paused,
      mTime: a.currentTime,
      rectTop: Math.round(r.top),
      rectBottom: Math.round(r.bottom),
      gatePresent: !!box.querySelector('.video-play-gate')
    };
  });
  console.log('After scrolling down:', sScrolledDown);
  if (!sScrolledDown.vPaused) throw new Error('Requirement 2 Part 2 FAILED: Video did NOT auto-pause when scrolled down!');
  if (sScrolledDown.mPaused) throw new Error('Requirement 2 Part 2 FAILED: Background music did NOT resume when video paused!');

  // Take screenshot after scroll
  await page.screenshot({ path: 'docs/screenshots/video-mutex-02-scrolled.png' });

  // 6. Scroll back to video
  console.log('6. Scrolling back to video card...');
  await page.evaluate(() => {
    const card = document.querySelector('#products article[data-project-id="filebutler"]');
    card.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(600);

  const sScrolledBack = await page.evaluate(() => {
    const v = document.getElementById('video-filebutler');
    const a = document.getElementById('music-audio');
    return { vPaused: v.paused, mPaused: a.paused };
  });
  console.log('Scrolled back into view:', sScrolledBack);
  if (!sScrolledBack.vPaused) throw new Error('Video should remain paused until clicked!');
  if (sScrolledBack.mPaused) throw new Error('Music should remain playing until video is explicitly clicked!');

  // 7. Click video again
  console.log('7. Clicking video to watch again...');
  await page.click('#products article[data-project-id="filebutler"] .video-play-gate');
  await page.waitForTimeout(1000);

  const sWatchAgain = await page.evaluate(() => {
    const v = document.getElementById('video-filebutler');
    const a = document.getElementById('music-audio');
    return { vPaused: v.paused, mPaused: a.paused };
  });
  console.log('Watching again:', sWatchAgain);
  if (sWatchAgain.vPaused) throw new Error('Video failed to restart!');
  if (!sWatchAgain.mPaused) throw new Error('Music failed to pause on restart!');

  console.log('=== ALL TESTS PASSED WITH 100% SUCCESS ===');
  await browser.close();
})();
