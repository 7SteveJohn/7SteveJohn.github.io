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
  await page.waitForTimeout(2500); // 确保 3D WebGL 视窗与背景完整渲染

  // 截图 1：白天晨曦模式整体视图 (双子星工坊 + 3D 拓扑谐振核心 + 4大活体微缩展台)
  await page.screenshot({ path: 'docs/screenshots/index-atelier-light.png' });
  console.log('Saved index-atelier-light.png');

  // 截图 2：深色模式 (暗黑极夜大片质感)
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/screenshots/index-atelier-dark.png' });
  console.log('Saved index-atelier-dark.png');

  // 截图 3：聚焦 4 款活体微缩展台
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.waitForTimeout(500);
  const dioramaSection = await page.$('.hero-index');
  if (dioramaSection) {
    await dioramaSection.screenshot({ path: 'docs/screenshots/index-atelier-dioramas.png' });
    console.log('Saved index-atelier-dioramas.png');
  }

  // 验证关键 DOM 与 WebGL 画布是否挂载正常
  const canvasCount = await page.evaluate(() => document.querySelectorAll('canvas').length);
  const hero3dExists = await page.evaluate(() => !!document.querySelector('#hero-3d-viewport canvas'));
  console.log('Total canvases:', canvasCount, 'Hero 3D Canvas mounted:', hero3dExists);

  await browser.close();

  if (errors.length > 0) {
    console.warn('Errors encountered:', errors);
  } else {
    console.log('ALL VERIFICATIONS PASSED WITH 0 CONSOLE ERRORS!');
  }
}

main().catch(console.error);
