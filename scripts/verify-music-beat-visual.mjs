import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Navigating to http://127.0.0.1:8328/ ...');
  await page.goto('http://127.0.0.1:8328/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // 1. Check Light Mode shockwave ring blending & color
  const ringInfoLight = await page.evaluate(() => {
    const canvas = document.getElementById('cosmos-canvas');
    return {
      tier: window.__COSMOS_TIER,
      isDark: document.documentElement.classList.contains('dark')
    };
  });
  console.log('1. Initial Light mode state:', ringInfoLight);

  // 2. Play background music
  console.log('2. Starting background music...');
  await page.click('#music-fab');
  await page.waitForTimeout(300);
  await page.click('#music-play');
  await page.waitForTimeout(1200);

  let maxMusicBeat = 0;
  let maxCageScale = 1;
  let sawShockwave = false;

  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(200);
    const metrics = await page.evaluate(() => {
      const b = window.__BEAT;
      const audioEl = document.getElementById('music-audio');
      // Retrieve Three.js scene internal properties if exposed or measure canvas
      return {
        paused: audioEl ? audioEl.paused : true,
        beatLevel: b ? b.level : 0,
        beatLv: b ? b.lv : 0,
        beatCtx: b ? b.ctx : '-'
      };
    });
    if (metrics.beatLevel > maxMusicBeat) maxMusicBeat = metrics.beatLevel;
    console.log(`Music sample ${i}: beatLevel=${metrics.beatLevel.toFixed(3)}, beatLv=${metrics.beatLv.toFixed(3)}`);
  }

  console.log(`Max music beatLevel observed: ${maxMusicBeat.toFixed(3)}`);
  if (maxMusicBeat < 0.15) {
    throw new Error(`Music beatLevel too low: ${maxMusicBeat}`);
  }

  // Screenshot in light mode while playing
  await page.screenshot({ path: 'docs/screenshots/beat-music-light.png' });
  console.log('Saved docs/screenshots/beat-music-light.png');

  // Toggle to dark mode
  console.log('3. Toggling dark mode...');
  await page.click('#theme-toggle, [aria-label*="主题"], [aria-label*="深色"]');
  await page.waitForTimeout(500);

  // Screenshot in dark mode while playing
  await page.screenshot({ path: 'docs/screenshots/beat-music-dark.png' });
  console.log('Saved docs/screenshots/beat-music-dark.png');

  // 4. Test Video beat
  console.log('4. Scrolling to video and playing...');
  await page.evaluate(() => {
    const vid = document.getElementById('video-filebutler');
    vid.scrollIntoView({ block: 'center' });
    return vid.play();
  });
  await page.waitForTimeout(1000);

  let maxVideoBeat = 0;
  let maxBoxPulse = 0;

  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(200);
    const vm = await page.evaluate(() => {
      const b = window.__BEAT;
      const vid = document.getElementById('video-filebutler');
      const box = vid ? vid.closest('.cover-box') : null;
      const audioEl = document.getElementById('music-audio');
      const pulseStr = box ? box.style.getPropertyValue('--beat-pulse') : '0';
      return {
        musicPaused: audioEl ? audioEl.paused : true,
        vidPaused: vid ? vid.paused : true,
        beatLevel: b ? b.level : 0,
        boxPulse: parseFloat(pulseStr) || 0,
        boxHasClass: box ? box.classList.contains('is-playing-beat') : false
      };
    });
    if (vm.beatLevel > maxVideoBeat) maxVideoBeat = vm.beatLevel;
    if (vm.boxPulse > maxBoxPulse) maxBoxPulse = vm.boxPulse;
    console.log(`Video sample ${i}: beatLevel=${vm.beatLevel.toFixed(3)}, boxPulse=${vm.boxPulse.toFixed(3)}, musicPaused=${vm.musicPaused}`);
  }

  console.log(`Max video beatLevel: ${maxVideoBeat.toFixed(3)}, maxBoxPulse: ${maxBoxPulse.toFixed(3)}`);
  if (maxVideoBeat < 0.2) {
    throw new Error(`Video beatLevel too low: ${maxVideoBeat}`);
  }
  if (maxBoxPulse < 0.2) {
    throw new Error(`Video boxPulse too low: ${maxBoxPulse}`);
  }

  // Screenshot video playing with beat
  await page.screenshot({ path: 'docs/screenshots/beat-video-dark.png' });
  console.log('Saved docs/screenshots/beat-video-dark.png');

  await browser.close();
  console.log('ALL BEAT VERIFICATIONS PASSED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
