import { devRequire as require } from './_dev-require.mjs';

async function verify() {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  console.log('Navigating to http://127.0.0.1:8328/ ...');
  await page.goto('http://127.0.0.1:8328/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Check texts
  const h1Text = (await page.textContent('#home h1')).trim();
  const eyebrowText = (await page.textContent('#home .hero-eyebrow')).trim();
  const subtitleText = (await page.textContent('#home #site-subtitle')).trim();
  const descText = (await page.locator('#home p').nth(2).textContent()).trim();
  
  const btn1 = (await page.locator('#home a[href="#products"]').first().textContent()).trim();
  const btn2 = (await page.locator('#home a[href*="github.com"]').first().textContent()).trim();
  const btn3 = (await page.locator('#home #cosmos-enter').textContent()).trim();

  const avatarName = (await page.locator('#home .hero-who .font-bold').textContent()).trim();
  const avatarDesc = (await page.locator('#home .hero-who div[data-page-node-id="9RgoOd30lFlk8cqyW1TArl"]').textContent()).trim();

  console.log('--- VERIFICATION RESULTS ---');
  console.log('H1:', h1Text, '->', h1Text === '楠屿札记' ? 'PASS' : 'FAIL');
  console.log('Eyebrow:', eyebrowText, '->', eyebrowText === '本地 AI 应用 · 桌面工具 · Android' ? 'PASS' : 'FAIL');
  console.log('Subtitle:', subtitleText, '->', subtitleText === '屿间汇叙 · 一隅写字，一隅造物' ? 'PASS' : 'FAIL');
  console.log('Description:', descText, '->', descText.includes('只在本地跑的 AI 应用') ? 'PASS' : 'FAIL');
  console.log('Button 1:', btn1, '->', btn1 === '浏览项目' ? 'PASS' : 'FAIL');
  console.log('Button 2:', btn2, '->', btn2.includes('更多项目见 GitHub') ? 'PASS' : 'FAIL');
  console.log('Button 3 (music):', btn3, '->', btn3.includes('播放音乐') ? 'PASS' : 'FAIL');
  console.log('Avatar Name:', avatarName, '->', avatarName === 'SevenJohn' ? 'PASS' : 'FAIL');
  console.log('Avatar Desc:', avatarDesc, '->', avatarDesc === '做端侧 AI 与轻量桌面工具' ? 'PASS' : 'FAIL');

  // Check 3D Canvas
  const canvasExists = await page.locator('#cosmos-canvas').isVisible();
  console.log('3D Canvas visible:', canvasExists);

  // Filter out any non-critical errors
  const realErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('manifest'));
  console.log('Console Errors count:', realErrors.length);
  if (realErrors.length > 0) {
    console.log('Errors:', realErrors);
  }

  // Take screenshot in current mode
  await page.screenshot({ path: 'test-restored-hero-current.png' });
  console.log('Screenshot saved to test-restored-hero-current.png');

  // Toggle theme to dark and screenshot
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-restored-hero-dark.png' });
  console.log('Screenshot saved to test-restored-hero-dark.png');

  // Toggle theme to light and screenshot
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-restored-hero-light.png' });
  console.log('Screenshot saved to test-restored-hero-light.png');

  await browser.close();
  console.log('ALL CHECKS COMPLETE!');
}

verify().catch(e => {
  console.error('Verification failed:', e);
  process.exit(1);
});
