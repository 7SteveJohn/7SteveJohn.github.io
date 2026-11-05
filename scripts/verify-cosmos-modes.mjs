import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');
import fs from 'node:fs';
import path from 'node:path';

const DEMO_URL = 'http://127.0.0.1:8328/cosmos-demo.html';
const outDir = path.resolve('docs/screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('--- 开始 4 种去等高线【晨曦明亮白昼】背景视觉方案全面渲染测试 ---');
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

  console.log(`正在访问 ${DEMO_URL} ...`);
  await page.goto(DEMO_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // 验证默认是否为明亮晨曦模式（非暗黑）
  const isDarkInit = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  const bodyBgInit = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  console.log(`[初始状态检测] isDark: ${isDarkInit} (期望为 false), bodyBg: ${bodyBgInit}`);

  const modes = ['aurora', 'neural', 'chladni', 'monolith', 'isolines'];

  // 测试明亮白昼模式下 5 种方案的表现
  for (const mode of modes) {
    console.log(`【晨曦白昼】切换到模式: ${mode} ...`);
    await page.click(`button[data-mode="${mode}"]`);
    await page.waitForTimeout(1200);

    const title = await page.textContent('#scheme-title');
    console.log(`  [${mode}] 标题: ${title}`);

    const screenshotPath = path.join(outDir, `cosmos-demo-light-${mode}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`  ✓ 晨曦白昼截图已保存: ${screenshotPath}`);
  }

  // 测试切换至暗黑模式
  console.log('测试点击切换至极夜深空模式...');
  await page.click('#theme-btn');
  await page.waitForTimeout(1000);
  const isDarkAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  console.log(`[切换后状态] isDark: ${isDarkAfter} (期望为 true)`);

  await page.screenshot({ path: path.join(outDir, 'cosmos-demo-dark-aurora.png') });
  console.log('  ✓ 极夜深空截图已保存');

  console.log(`\n测试完成！总报错数: ${errors.length}`);
  if (errors.length > 0) {
    process.exit(1);
  }
} finally {
  await browser.close();
}
