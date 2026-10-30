import { devRequire } from './_dev-require.mjs';
const { chromium } = devRequire('playwright-core');

const BASE = 'http://localhost:8328/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

let pass = 0, fail = 0;
const ok = (msg, extra = '') => { pass++; console.log(`PASS  ${msg} ${extra ? '  ' + extra : ''}`); };
const bad = (msg, extra = '') => { fail++; console.error(`FAIL  ${msg} ${extra ? '  ' + extra : ''}`); };
const assert = (cond, msg, extra = '') => (cond ? ok : bad)(msg, extra);

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1000);

  console.log('\n--- 1. Testing Cover Images on Cards ---');
  const cardImages = await page.evaluate(() => {
    const cards = document.querySelectorAll('[data-open-article]');
    const results = [];
    cards.forEach((c) => {
      const id = c.dataset.openArticle;
      const img = c.querySelector('.ac-media img');
      const src = img ? img.getAttribute('src') : null;
      results.push({ id, hasImg: !!img, src });
    });
    return results;
  });

  const missing = cardImages.filter(c => !c.hasImg || !c.src);
  assert(missing.length === 0, `All article cards have dedicated covers (checked ${cardImages.length} cards)`, missing.length ? JSON.stringify(missing) : '');

  // Check specific AI articles
  const aiCards = cardImages.filter(c => c.id && c.id.startsWith('ai-'));
  assert(aiCards.length === 7, `All 7 AI learning cards have covers`, `Found ${aiCards.length}`);
  aiCards.forEach(c => {
    assert(c.src && c.src.includes('assets/images/covers/ai-'), `AI card [${c.id}] has valid cover path`, c.src);
  });

  console.log('\n--- 2. Testing Modal Scroll Reset ---');
  // Open first AI article
  await page.evaluate(() => window.openArticleModal('ai-concepts-primer'));
  await page.waitForTimeout(600);

  // Verify modal is open and has cover inside
  const modalInfo = await page.evaluate(() => {
    const m = document.getElementById('article-modal');
    const heroImg = m.querySelector('#article-modal-content img[src*="covers/ai-01"]');
    return {
      isOpen: m && !m.classList.contains('hidden'),
      hasHeroCover: !!heroImg
    };
  });
  assert(modalInfo.isOpen, 'Modal opened for ai-concepts-primer');
  assert(modalInfo.hasHeroCover, 'Modal has hero cover image at top');

  // Simulate scrolling down 600px
  await page.evaluate(() => {
    const modal = document.getElementById('article-modal');
    const content = document.getElementById('article-modal-content');
    modal.scrollTop = 600;
    content.scrollTop = 600;
  });

  const scrolled = await page.evaluate(() => {
    const modal = document.getElementById('article-modal');
    const content = document.getElementById('article-modal-content');
    return { modalScroll: modal.scrollTop, contentScroll: content.scrollTop };
  });
  assert(scrolled.modalScroll > 0 || scrolled.contentScroll > 0, 'User scrolled modal down', JSON.stringify(scrolled));

  // Close modal
  await page.evaluate(() => window.closeArticleModal());
  await page.waitForTimeout(400);

  // Open second article
  await page.evaluate(() => window.openArticleModal('ai-model-training'));
  await page.waitForTimeout(600);

  const resetPos = await page.evaluate(() => {
    const modal = document.getElementById('article-modal');
    const content = document.getElementById('article-modal-content');
    const progress = document.getElementById('article-progress');
    return {
      modalScroll: modal.scrollTop,
      contentScroll: content.scrollTop,
      progressWidth: progress ? progress.style.width : ''
    };
  });
  assert(resetPos.modalScroll === 0, 'Modal outer container scroll reset to 0', `modalScroll = ${resetPos.modalScroll}`);
  assert(resetPos.contentScroll === 0, 'Modal content inner container scroll reset to 0', `contentScroll = ${resetPos.contentScroll}`);
  assert(resetPos.progressWidth === '0%', 'Progress bar reset to 0%', `progressWidth = ${resetPos.progressWidth}`);

  console.log('\n--- 3. Testing Next Pager Button Inside Modal ---');
  // Scroll down again
  await page.evaluate(() => {
    const modal = document.getElementById('article-modal');
    const content = document.getElementById('article-modal-content');
    modal.scrollTop = 500;
    content.scrollTop = 500;
  });

  // Click pager "下一篇"
  await page.evaluate(() => {
    const btn = document.querySelector('#article-modal [data-pager="next"]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(600);

  const pagerPos = await page.evaluate(() => {
    const modal = document.getElementById('article-modal');
    const content = document.getElementById('article-modal-content');
    const title = modal.querySelector('h1')?.innerText;
    return {
      title,
      modalScroll: modal.scrollTop,
      contentScroll: content.scrollTop
    };
  });
  assert(pagerPos.modalScroll === 0, 'Modal scroll reset to 0 after clicking next pager', `modalScroll = ${pagerPos.modalScroll}`);
  assert(pagerPos.contentScroll === 0, 'Content scroll reset to 0 after clicking next pager', `contentScroll = ${pagerPos.contentScroll}`);
  assert(pagerPos.title && pagerPos.title.includes('学 AI 要不要先啃高数'), 'Swapped to article 3 correctly', pagerPos.title);

  await page.close();
} finally {
  await browser.close();
}

console.log(`\n========================================`);
console.log(`TOTAL: ${pass} passed / ${fail} failed`);
console.log(`========================================\n`);

process.exit(fail ? 1 : 0);
