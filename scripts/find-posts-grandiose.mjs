import fs from 'fs';
import path from 'path';

const files = fs.readdirSync('posts').filter(f => f.endsWith('.md'));
const checkWords = ['全量', '算力', '留存', '自持', '底线', '闭环', '痛点', '合规', '架构设计'];

files.forEach(f => {
  const content = fs.readFileSync(path.join('posts', f), 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    checkWords.forEach(w => {
      if (l.includes(w)) {
        console.log(`${f}:L${i+1} [${w}]: ${l.trim()}`);
      }
    });
  });
});
