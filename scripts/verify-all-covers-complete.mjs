import { devRequire } from './_dev-require.mjs';
const { chromium } = devRequire('playwright-core');
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  const filePath = path.join(ROOT, u.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found: ' + u);
  }
});

await new Promise((resolve) => server.listen(8330, resolve));

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']
});

let pass = 0, fail = 0;
const ok = (msg, extra = '') => { pass++; console.log(`PASS  ${msg} ${extra ? '  ' + extra : ''}`); };
const bad = (msg, extra = '') => { fail++; console.error(`FAIL  ${msg} ${extra ? '  ' + extra : ''}`); };
const assert = (cond, msg, extra = '') => (cond ? ok : bad)(msg, extra);

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:8330/index.html', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);

  console.log('\n--- 1. Testing All 19 Article Cards & Covers ---');
  const articles = await page.evaluate(() => {
    const cards = document.querySelectorAll('article[data-open-article]');
    return [...cards].map(c => {
      const img = c.querySelector('.ac-media img');
      return {
        id: c.dataset.openArticle,
        src: img ? img.getAttribute('src') : null
      };
    });
  });
  assert(articles.length === 19, 'Found all 19 article cards on homepage', `count: ${articles.length}`);
  articles.forEach(a => {
    assert(!!a.src && a.src.startsWith('assets/images/covers/'), `Article [${a.id}] has valid SVG cover`, a.src);
  });

  console.log('\n--- 2. Testing All 6 Project Modals Covers ---');
  const projects = ['filebutler', 'paian', 'netops-handbook', 'fluxion', 'gameboost', 'gameboost-dlssg'];
  for (const pid of projects) {
    await page.evaluate((id) => window.openProjectModal(id), pid);
    await page.waitForTimeout(400);

    const info = await page.evaluate(() => {
      const modal = document.getElementById('project-modal');
      const content = document.getElementById('project-modal-content');
      const imgs = [...content.querySelectorAll('img')].map(i => i.getAttribute('src'));
      return {
        isOpen: modal && !modal.classList.contains('hidden'),
        imgs
      };
    });

    assert(info.isOpen, `Project modal [${pid}] opens`);
    assert(info.imgs.length > 0, `Project modal [${pid}] has cover image`, JSON.stringify(info.imgs));

    await page.evaluate(() => window.closeProjectModal());
    await page.waitForTimeout(300);
  }

  console.log('\n--- 3. Testing Novel Shelf on novel.html ---');
  await page.goto('http://localhost:8330/novel.html', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);

  const novelCover = await page.evaluate(() => {
    const shelf = document.querySelector('.novel-cover img');
    return shelf ? shelf.getAttribute('src') : null;
  });
  assert(!!novelCover, 'Novel shelf displays cover image', novelCover);

} finally {
  await browser.close();
  server.close();
}

console.log(`\n========================================`);
console.log(`TOTAL: ${pass} passed / ${fail} failed`);
console.log(`========================================\n`);

process.exit(fail ? 1 : 0);
