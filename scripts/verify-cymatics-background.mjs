import { devRequire as require } from './_dev-require.mjs';

async function main() {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('[Browser Error]', msg.text());
    }
  });

  await page.goto('http://127.0.0.1:8328/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500); // 确保 3D 背景完整启动并淡入

  const activeMode = await page.evaluate(() => localStorage.getItem('sj.cosmos-mode'));
  const hasSeparateBox = await page.evaluate(() => !!document.getElementById('hero-3d-viewport'));
  console.log('Active cosmos mode in localStorage:', activeMode, 'Separate box in DOM:', hasSeparateBox);

  // 截图 1：白昼模式全景（3D 拓扑谐振核心在深空背景中呼吸，正文与4大微沙盘自然融景）
  await page.screenshot({ path: 'docs/screenshots/cymatics-bg-light.png' });
  console.log('Saved cymatics-bg-light.png');

  // 截图 2：深色模式全景（深黑矿石宇宙 + 3D 拓扑谐振粒子球与晶格）
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/screenshots/cymatics-bg-dark.png' });
  console.log('Saved cymatics-bg-dark.png');

  // 模拟鼠标交互微倾角与音频脉冲
  await page.mouse.move(900, 300);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots/cymatics-bg-interaction.png' });
  console.log('Saved cymatics-bg-interaction.png');

  await browser.close();

  if (errors.length > 0) {
    console.warn('Encountered errors:', errors);
  } else {
    console.log('SUCCESS: Verified 0 console errors!');
  }
}

main().catch(console.error);
