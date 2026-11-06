import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:8328/');
  await page.waitForTimeout(500);

  const matched = await page.evaluate(() => {
    const list = document.querySelectorAll('#products article[data-project-id], .bento-card, .app-window-card');
    return Array.from(list).map(el => ({
      tagName: el.tagName,
      id: el.id,
      className: el.className,
      projectId: el.getAttribute('data-project-id'),
      parentTag: el.parentElement ? el.parentElement.tagName : null,
      parentId: el.parentElement ? el.parentElement.id : null
    }));
  });
  console.log('Matched elements count:', matched.length);
  console.log(matched);

  await browser.close();
}

main().catch(console.error);
