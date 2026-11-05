import { devRequire as require } from './_dev-require.mjs';

async function main() {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('[Console Error]', msg.text());
    }
  });

  // 1. 测试从旧版残留 neural 自动净化迁移到 aurora
  await page.goto('http://127.0.0.1:8328/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('sj.cosmos-mode', 'neural'); // 模拟旧版存留
  });
  
  // 重新加载页面，验证自动净化
  await page.goto('http://127.0.0.1:8328/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const activeMode = await page.evaluate(() => localStorage.getItem('sj.cosmos-mode'));
  const tier = await page.evaluate(() => window.__COSMOS_TIER);
  console.log('Sanitized Active Mode:', activeMode, 'Tier:', tier);

  // 截图 1：白天模式 (清爽、无杂乱线条、无靶心同心圆)
  await page.screenshot({ path: 'docs/screenshots/index-aurora-clean-light.png' });
  console.log('Light mode clean screenshot saved');

  // 截图 2：深色模式 (极夜深空水墨流体)
  const themeToggle = await page.$('#theme-toggle, .theme-toggle, button[aria-label*="主题"], button[title*="主题"]');
  if (themeToggle) {
    await themeToggle.click();
  } else {
    await page.evaluate(() => document.documentElement.classList.add('dark'));
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'docs/screenshots/index-aurora-clean-dark.png' });
  console.log('Dark mode clean screenshot saved');

  // 截图 3：模拟音频播放与律动 (测试冲击波扩散与低音潮汐)
  await page.evaluate(() => {
    if (window.switchCosmosMode) {
      // 触发一次 kick
      window.dispatchEvent(new PointerEvent('pointerdown', { clientX: 720, clientY: 450 }));
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/screenshots/index-aurora-kick.png' });
  console.log('Kick / Beat wave screenshot saved');

  await browser.close();

  if (errors.length > 0) {
    console.warn('Encountered console errors:', errors);
  } else {
    console.log('SUCCESS: 0 console errors!');
  }
}

main().catch(console.error);
