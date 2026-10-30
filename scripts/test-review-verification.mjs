import { devRequire } from './_dev-require.mjs';
const { chromium } = devRequire('playwright-core');

const BASE = 'http://localhost:8328/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

let pass = 0, fail = 0;
const ok = (msg, extra = '') => { pass++; console.log(`PASS  ${msg} ${extra ? '  ' + extra : ''}`); };
const bad = (msg, extra = '') => { fail++; console.error(`FAIL  ${msg} ${extra ? '  ' + extra : ''}`); };
const assert = (cond, msg, extra = '') => (cond ? ok : bad)(msg, extra);

const errorsOf = (page) => {
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') {
      if (/music\/.*\.mp3|ERR_ABORTED/.test(m.text())) return;
      errs.push('console.error: ' + m.text());
    }
  });
  return errs;
};

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']
});

try {
  // Test 1: Desktop Home
  console.log('\n--- 1. Desktop Homepage Verification ---');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = errorsOf(page);
    await page.goto(BASE + 'index.html?fx=full', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Verify blog list articles
    const blogList = await page.evaluate(() => {
      const items = [...document.querySelectorAll('#articles-list article')];
      return items.map(el => ({
        id: el.getAttribute('data-open-article'),
        title: el.querySelector('h3')?.textContent?.trim()
      }));
    });

    const hasPrompt = blogList.some(a => a.id === 'prompt-optimizer-engine');
    const hasVideo = blogList.some(a => a.id === 'local-video-reading-pipeline');
    assert(hasPrompt, '1.1 #articles-list contains prompt-optimizer-engine', String(hasPrompt));
    assert(hasVideo, '1.2 #articles-list contains local-video-reading-pipeline', String(hasVideo));

    // Verify creation game articles
    const gameList = await page.evaluate(() => {
      const items = [...document.querySelectorAll('#creation-game [data-creation-list] article')];
      return items.map(el => ({
        id: el.getAttribute('data-open-article'),
        title: el.querySelector('h3')?.textContent?.trim()
      }));
    });

    const hasPixel = gameList.some(a => a.id === 'pixel-narrative-devlog');
    const hasAbyss = gameList.some(a => a.id === 'abysswalker-roguelike-engine');
    assert(hasPixel, '1.3 #creation-game contains pixel-narrative-devlog', String(hasPixel));
    assert(hasAbyss, '1.4 #creation-game contains abysswalker-roguelike-engine', String(hasAbyss));

    // Verify modal reading of each target article
    const targets = [
      'prompt-optimizer-engine',
      'pixel-narrative-devlog',
      'local-video-reading-pipeline',
      'abysswalker-roguelike-engine'
    ];

    for (const t of targets) {
      await page.evaluate((id) => window.openArticleModal(id), t);
      await page.waitForTimeout(1000);

      const modalInfo = await page.evaluate(() => {
        const modal = document.getElementById('article-modal');
        const hidden = modal.classList.contains('hidden');
        const title = modal.querySelector('h1')?.textContent?.trim();
        const body = modal.querySelector('.markdown-body');
        const headings = [...body.querySelectorAll('h3, h4')].map(h => h.textContent.trim());
        const hasTable = !!body.querySelector('table');
        const hasCode = !!body.querySelector('pre code');
        return { hidden, title, headingsCount: headings.length, hasTable, hasCode };
      });

      assert(!modalInfo.hidden, `1.5 [${t}] Modal opened successfully`, modalInfo.title);
      assert(modalInfo.headingsCount >= 2, `1.6 [${t}] Markdown headings rendered`, `Count: ${modalInfo.headingsCount}`);

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    assert(errs.length === 0, '1.7 Homepage console clean without errors', errs.join('; '));
    await page.close();
  }

  // Test 2: Deep Link directly to article
  console.log('\n--- 2. Deep Linking Verification ---');
  {
    for (const t of ['prompt-optimizer-engine', 'pixel-narrative-devlog']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const errs = errorsOf(page);
      await page.goto(BASE + `index.html?post=${t}`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2000);

      const state = await page.evaluate(() => {
        const modal = document.getElementById('article-modal');
        return {
          isOpen: !modal.classList.contains('hidden'),
          title: modal.querySelector('h1')?.textContent?.trim()
        };
      });

      assert(state.isOpen, `2.1 Deep link ?post=${t} automatically opened modal`, state.title);
      assert(errs.length === 0, `2.2 Deep link for ${t} has no errors`, errs.join('; '));
      await page.close();
    }
  }

  // Test 3: Archive page
  console.log('\n--- 3. Archive Page Timeline & Filter Verification ---');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = errorsOf(page);
    await page.goto(BASE + 'archive.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);

    const count = await page.evaluate(() => {
      const countEl = document.getElementById('archive-count');
      const items = [...document.querySelectorAll('.arc-item')];
      return { totalBadge: countEl?.textContent?.trim(), itemsCount: items.length };
    });

    assert(count.itemsCount === 19, `3.1 Archive has all 19 articles`, `${count.itemsCount} items, badge: ${count.totalBadge}`);

    // Click creation filter
    await page.click('.arc-chip[data-key="creation"]');
    await page.waitForTimeout(500);
    const creationVisible = await page.evaluate(() => {
      const visible = [...document.querySelectorAll('.arc-item:not([hidden])')];
      return visible.map(el => el.querySelector('a')?.href);
    });

    const hasPixelInArchive = creationVisible.some(href => href.includes('pixel-narrative-devlog'));
    const hasAbyssInArchive = creationVisible.some(href => href.includes('abysswalker-roguelike-engine'));
    assert(hasPixelInArchive && hasAbyssInArchive && creationVisible.length === 2,
      '3.2 Archive creation filter shows exactly the 2 game creation articles',
      `Count: ${creationVisible.length}`);

    // Click tech filter
    await page.click('.arc-chip[data-key="tech"]');
    await page.waitForTimeout(500);
    const techVisible = await page.evaluate(() => {
      const visible = [...document.querySelectorAll('.arc-item:not([hidden])')];
      return visible.map(el => el.querySelector('a')?.href);
    });

    const hasPromptInArchive = techVisible.some(href => href.includes('prompt-optimizer-engine'));
    const hasVideoInArchive = techVisible.some(href => href.includes('local-video-reading-pipeline'));
    assert(hasPromptInArchive && hasVideoInArchive,
      '3.3 Archive tech filter shows prompt-optimizer and video pipeline',
      `Count: ${techVisible.length}`);

    assert(errs.length === 0, '3.4 Archive console clean', errs.join('; '));
    await page.close();
  }

  // Test 4: Search modal indexing
  console.log('\n--- 4. Search Modal Indexing Verification ---');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = errorsOf(page);
    await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Open search with Ctrl+K
    await page.keyboard.press('Control+KeyK');
    await page.waitForTimeout(500);

    const checkSearch = async (term, expectedTitleMatch) => {
      await page.fill('#search-input', term);
      await page.waitForTimeout(300);
      return page.evaluate((exp) => {
        const results = [...document.querySelectorAll('#search-results .search-item')];
        const match = results.some(r => r.querySelector('.font-medium')?.textContent?.includes(exp));
        return { match, count: results.length };
      }, expectedTitleMatch);
    };

    const s1 = await checkSearch('RPG Maker MZ', '像素叙事游戏开发手记');
    assert(s1.match, '4.1 Search "RPG Maker MZ" hits pixel-narrative-devlog', `Hits: ${s1.count}`);

    const s2 = await checkSearch('PySceneDetect', '本地视频阅读工作流');
    assert(s2.match, '4.2 Search "PySceneDetect" hits local-video-reading-pipeline', `Hits: ${s2.count}`);

    const s3 = await checkSearch('Mulberry32', '矢量 Roguelike');
    assert(s3.match, '4.3 Search "Mulberry32" hits abysswalker-roguelike-engine', `Hits: ${s3.count}`);

    const s4 = await checkSearch('提示词', '纯本地提示词优化器');
    assert(s4.match, '4.4 Search "提示词" hits prompt-optimizer-engine', `Hits: ${s4.count}`);

    assert(errs.length === 0, '4.5 Search modal clean', errs.join('; '));
    await page.close();
  }

  // Test 5: Mobile viewport audit
  console.log('\n--- 5. Mobile (375x812) Viewport Verification ---');
  {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    const errs = errorsOf(page);
    await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Check no horizontal scrollbar on body
    const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    assert(bodyWidth, '5.1 Mobile viewport has no horizontal overflow on homepage');

    // Open an article in mobile
    await page.evaluate(() => window.openArticleModal('prompt-optimizer-engine'));
    await page.waitForTimeout(1000);

    const modalMobile = await page.evaluate(() => {
      const modal = document.getElementById('article-modal');
      const dialog = modal.querySelector('.relative.w-full');
      const isOpen = !modal.classList.contains('hidden');
      const noOverflow = document.documentElement.scrollWidth <= window.innerWidth;
      return { isOpen, noOverflow };
    });

    assert(modalMobile.isOpen && modalMobile.noOverflow, '5.2 Mobile article modal renders cleanly without overflow');
    assert(errs.length === 0, '5.3 Mobile console clean', errs.join('; '));
    await page.close();
  }

} finally {
  await browser.close();
}

console.log(`\n========================================`);
console.log(`TOTAL: ${pass} passed / ${fail} failed`);
console.log(`========================================\n`);

process.exit(fail ? 1 : 0);
