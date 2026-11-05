import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const context = await browser.newContext();
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  console.log('--- Step 1: Initial visit to install Service Worker & prefetch first song ---');
  await page.goto('http://localhost:8328/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const sw1 = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return {
      active: !!reg?.active,
      controller: !!navigator.serviceWorker.controller
    };
  });
  console.log('SW state after visit 1:', sw1);

  console.log('--- Step 2: Re-enter page (reloading to simulate repeat visit) ---');
  const t0 = Date.now();
  await page.reload({ waitUntil: 'networkidle' });
  const loadTime = Date.now() - t0;
  console.log(`Page re-enter load time: ${loadTime}ms`);

  console.log('--- Step 3: Play first song (Attention) ---');
  const playStart = Date.now();
  await page.click('#cosmos-enter');

  let playedFast = false;
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(200);
    const state = await page.evaluate(() => {
      const a = document.getElementById('music-audio');
      return {
        paused: a.paused,
        currentTime: a.currentTime,
        duration: a.duration,
        readyState: a.readyState,
        error: a.error ? a.error.message : null
      };
    });
    console.log(`Poll ${i} (${Date.now() - playStart}ms):`, state);
    if (state.error) {
      throw new Error(`First song failed to play: ${state.error}`);
    }
    if (!state.paused && state.currentTime > 0.1) {
      playedFast = true;
      console.log(`SUCCESS: First song started playing within ${Date.now() - playStart}ms!`);
      break;
    }
  }

  if (!playedFast) {
    throw new Error('First song took too long to start or did not start!');
  }

  console.log('--- Step 4: Test Next Song (Call of Silence) ---');
  await page.click('#music-fab');
  await page.waitForTimeout(300);
  await page.click('#music-next');
  await page.waitForTimeout(1000);

  const nextState = await page.evaluate(() => {
    const a = document.getElementById('music-audio');
    const title = document.getElementById('music-title');
    return {
      title: title ? title.textContent : null,
      paused: a.paused,
      currentTime: a.currentTime,
      duration: a.duration,
      error: a.error ? a.error.message : null
    };
  });
  console.log('Next song state:', nextState);
  if (nextState.error) {
    throw new Error(`Next song failed: ${nextState.error}`);
  }

  console.log('--- Step 5: Test Seeking in Song ---');
  await page.evaluate(() => {
    const a = document.getElementById('music-audio');
    a.currentTime = 30; // seek to 30s
  });
  await page.waitForTimeout(800);

  const seekState = await page.evaluate(() => {
    const a = document.getElementById('music-audio');
    return {
      paused: a.paused,
      currentTime: a.currentTime,
      error: a.error ? a.error.message : null
    };
  });
  console.log('Seek state:', seekState);
  if (seekState.error) {
    throw new Error(`Seek failed: ${seekState.error}`);
  }

  console.log('--- Step 6: 3rd visit (Closing and reopening page) ---');
  await page.goto('http://localhost:8328/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Instant play test
  await page.click('#cosmos-enter');
  await page.waitForTimeout(500);

  const thirdVisitState = await page.evaluate(() => {
    const a = document.getElementById('music-audio');
    return {
      paused: a.paused,
      currentTime: a.currentTime,
      duration: a.duration,
      error: a.error ? a.error.message : null
    };
  });
  console.log('Third visit play state:', thirdVisitState);
  if (thirdVisitState.error || thirdVisitState.paused) {
    throw new Error('Third visit failed to start instantly!');
  }

  await browser.close();
  console.log('=== ALL AUDIO PERFORMANCE & PLAYBACK VERIFICATIONS PASSED ===');
}

main().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
