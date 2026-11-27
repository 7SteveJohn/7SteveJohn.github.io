import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const articlesJs = path.join(ROOT, 'js/articles.js');

const code = fs.readFileSync(articlesJs, 'utf8');
const context = { window: {} };
vm.createContext(context);

try {
  vm.runInContext(code, context);
} catch (e) {
  console.error('❌ Failed to evaluate js/articles.js:', e);
  process.exit(1);
}

const articles = context.window.ARTICLES_DATA;
if (!Array.isArray(articles) || articles.length === 0) {
  console.error('❌ ARTICLES_DATA is empty or not an array');
  process.exit(1);
}

console.log(`✓ ARTICLES_DATA parsed cleanly with ${articles.length} articles.`);

// Verify required fields
const requiredFields = ['id', 'title', 'date', 'readTime', 'category', 'summary', 'tags', 'content'];
const ids = new Set();
let hasErrors = false;

for (const art of articles) {
  for (const field of requiredFields) {
    if (!art[field]) {
      console.error(`❌ Article ${art.id || 'UNKNOWN'} is missing required field: ${field}`);
      hasErrors = true;
    }
  }
  if (ids.has(art.id)) {
    console.error(`❌ Duplicate article ID: ${art.id}`);
    hasErrors = true;
  }
  ids.add(art.id);

  // Check date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(art.date)) {
    console.error(`❌ Article ${art.id} has invalid date format: ${art.date}`);
    hasErrors = true;
  }
}

// Check newly added / updated articles
const targets = [
  'prompt-optimizer-engine',
  'pixel-narrative-devlog',
  'local-video-reading-pipeline',
  'abysswalker-roguelike-engine'
];

for (const t of targets) {
  const item = articles.find(a => a.id === t);
  if (!item) {
    console.error(`❌ Target article ${t} not found in ARTICLES_DATA`);
    hasErrors = true;
  } else {
    console.log(`✓ Verified article [${t}]: "${item.title}" (${item.category}, ${item.date})`);
  }
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log('✓ All runtime checks passed successfully!');
}
