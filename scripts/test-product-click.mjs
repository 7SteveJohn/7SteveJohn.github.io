import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:8328/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check product tabs bar
  const tabs = await page.$$('.product-tab-btn');
  console.log('Product tab buttons count:', tabs.length);

  // Check product cards
  const cards = await page.$$('#products article[data-project-id]');
  console.log('Product cards count:', cards.length);

  // Check window headers and traffic lights
  const headers = await page.$$('.window-header');
  console.log('Window headers count:', headers.length);

  // Test clicking tab 2 (paian)
  if (tabs[1]) {
    console.log('Clicking paian tab...');
    await tabs[1].click();
    await page.waitForTimeout(800);
    
    const cardSelectedClasses = await page.$$eval('#products article[data-project-id]', els => 
      els.map(el => ({ id: el.dataset.projectId, classes: el.className }))
    );
    console.log('Cards after tab click:', JSON.stringify(cardSelectedClasses, null, 2));

    await page.screenshot({ path: 'docs/screenshots/product-tabs-light.png' });
  }

  // Test mousemove 3D tilt on card 1 (filebutler)
  if (cards[0]) {
    console.log('Simulating mousemove 3D tilt on first card...');
    const box = await cards[0].boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2);
      await page.waitForTimeout(300);
      const transform = await cards[0].evaluate(el => el.style.transform);
      console.log('Card transform during mousemove:', transform);
    }
  }

  // Switch to dark mode
  console.log('Toggling to dark mode...');
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(500);

  // Click tab 4 (fluxion) in dark mode
  if (tabs[3]) {
    console.log('Clicking fluxion tab in dark mode...');
    await tabs[3].click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'docs/screenshots/product-tabs-dark.png' });
  }

  // Test mobile view
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots/product-tabs-mobile.png' });

  await browser.close();
  console.log('All tests completed successfully!');
}

main().catch(console.error);
