import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://127.0.0.1:8328/';
const outDir = path.resolve('docs/screenshots');

console.log('--- 开始首页背景方案切换 Dock 与联动测试 ---');
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', err => {
    console.error('页面报错:', err);
    errors.push(String(err));
  });

  console.log(`正在访问 ${BASE_URL} ...`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 检查 dock 元素
  const dockVisible = await page.isVisible('#cosmos-dock');
  console.log(`[首页 Dock 可见性]: ${dockVisible}`);

  const tabs = ['neural', 'aurora', 'chladni', 'monolith', 'isolines'];
  for (const mode of tabs) {
    console.log(`点击切换模式: ${mode} ...`);
    await page.click(`#cosmos-dock button[data-mode="${mode}"]`);
    await page.waitForTimeout(1000);

    const isActive = await page.evaluate(m => {
      const btn = document.querySelector(`#cosmos-dock button[data-mode="${m}"]`);
      return btn?.classList.contains('active');
    }, mode);
    console.log(`  模式 [${mode}] active 状态: ${isActive}`);

    const screenshotPath = path.join(outDir, `homepage-dock-${mode}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`  ✓ 截图已保存: ${screenshotPath}`);
  }

  console.log(`\n首页 Dock 联动测试完成！总报错数: ${errors.length}`);
  if (errors.length > 0) {
    process.exit(1);
  }
} finally {
  await browser.close();
}
