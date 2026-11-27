import fs from 'fs';
import path from 'path';

const GRANDIOSE_WORDS = [
  '算力', '留存', '全量', '宿主', '资产', '边界', '底线', '机制', '闭环',
  '调优', '生态', '赋能', '痛点', '卡点', '自持', '解耦', '架构'
];

function checkFile(file) {
  const c = fs.readFileSync(file, 'utf8');
  const lines = c.split('\n');
  const hits = [];
  lines.forEach((l, idx) => {
    // skip comments if they are pure jsdoc or git history notes
    if (l.trim().startsWith('*') || l.trim().startsWith('//') || l.trim().startsWith('<!--')) return;
    GRANDIOSE_WORDS.forEach(w => {
      if (l.includes(w)) {
        hits.push({ line: idx + 1, word: w, text: l.trim() });
      }
    });
  });
  return hits;
}

const targetFiles = [
  'index.html',
  'js/projects.js',
  'archive.html',
  'gallery.html',
  '404.html'
];

targetFiles.forEach(f => {
  if (fs.existsSync(f)) {
    const hits = checkFile(f);
    if (hits.length > 0) {
      console.log(`\n=== In ${f} (${hits.length} hits) ===`);
      hits.forEach(h => console.log(`  L${h.line} [${h.word}]: ${h.text}`));
    }
  }
});
