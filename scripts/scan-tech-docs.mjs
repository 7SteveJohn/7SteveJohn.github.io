import fs from 'node:fs';
import path from 'node:path';

const files = fs.readdirSync('d:/HTML/posts').filter(f => f.endsWith('.md'));
const keywords = [
  '断网', '隐私', '云端', '离线', '纯本地', '全在本地', '真问题', '好工具', 
  '初心', '朴素', '克制', '优雅', '极致', '由头', '于我而言', '不用借助'
];

console.log('=== POSTS SCAN RESULTS ===');
for (const f of files) {
  const content = fs.readFileSync(path.join('d:/HTML/posts', f), 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    for (const kw of keywords) {
      if (line.includes(kw)) {
        console.log(`${f}:${idx + 1} [${kw}] ${line.trim()}`);
      }
    }
  });
}
