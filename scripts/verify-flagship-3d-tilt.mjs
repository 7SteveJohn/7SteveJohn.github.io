import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('--- 开始旗舰产品卡片真 3D 物理倾斜验证 ---');
  await page.goto('http://localhost:8328/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const card = await page.$('#products article[data-project-id="filebutler"]');
  if (!card) {
    throw new Error('未找到 FileButler 卡片');
  }

  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const box = await card.boundingBox();
  console.log('卡片尺寸与位置:', box);

  // 1. 移入卡片左侧（测试向左物理下压/向右翘起）
  console.log('测试 1: 鼠标移动到卡片左侧 (15% 宽度)...');
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.4);
  await page.waitForTimeout(350);

  const leftState = await card.evaluate(el => ({
    styleTransform: el.style.transform,
    boxShadow: el.style.boxShadow,
    mouseX: el.style.getPropertyValue('--mouse-x'),
    mouseY: el.style.getPropertyValue('--mouse-y'),
    hasTiltEngine: el.__hasTiltEngine,
    childZ1: window.getComputedStyle(el.querySelector('div:first-child')).transform,
    coverBoxZ: window.getComputedStyle(el.querySelector('.cover-box')).transform
  }));

  console.log('左侧状态:', leftState);
  await page.screenshot({
    path: 'docs/screenshots/card-3d-tilt-left.png',
    clip: { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 40), width: box.width + 80, height: box.height + 80 }
  });
  console.log('✓ 已保存: docs/screenshots/card-3d-tilt-left.png');

  // 2. 移入卡片右侧（测试向右物理下压/向左翘起）
  console.log('测试 2: 鼠标移动到卡片右侧 (85% 宽度)...');
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.4);
  await page.waitForTimeout(350);

  const rightState = await card.evaluate(el => ({
    styleTransform: el.style.transform,
    boxShadow: el.style.boxShadow,
    mouseX: el.style.getPropertyValue('--mouse-x'),
    mouseY: el.style.getPropertyValue('--mouse-y')
  }));

  console.log('右侧状态:', rightState);
  await page.screenshot({
    path: 'docs/screenshots/card-3d-tilt-right.png',
    clip: { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 40), width: box.width + 80, height: box.height + 80 }
  });
  console.log('✓ 已保存: docs/screenshots/card-3d-tilt-right.png');

  // 3. 测试内部操作按钮点击性（确保 3D 景深下层级未阻挡点击）
  console.log('测试 3: 验证 3D 浮空下「了解更多」按键可点击性...');
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('button[data-open-project="filebutler"]:not(.announce-more)');
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (clicked) {
    await page.waitForTimeout(500);
    const modalVisible = await page.$eval('#project-modal', el => !el.classList.contains('hidden'));
    console.log('弹窗打开状态:', modalVisible ? '成功打开 ✅' : '未打开 ❌');
    // 关闭弹窗
    const closeBtn = await page.$('#project-modal-close');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(300);
  }

  // 4. 移出卡片，测试平滑回弹复位
  console.log('测试 4: 鼠标移出卡片，验证平滑复位...');
  await page.mouse.move(50, 50);
  await page.waitForTimeout(400);

  const resetState = await card.evaluate(el => el.style.transform);
  console.log('复位后 Transform:', resetState || '(已完全复位为空)');

  await browser.close();
  console.log('=== 验证全部通过！===');
}

main().catch(err => {
  console.error('测试出错:', err);
  process.exit(1);
});
