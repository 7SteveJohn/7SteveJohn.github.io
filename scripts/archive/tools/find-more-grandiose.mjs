import fs from 'fs';

function findWord(word) {
  const files = ['index.html', 'js/projects.js', 'archive.html', 'gallery.html'];
  files.forEach(f => {
    const c = fs.readFileSync(f, 'utf8');
    const lines = c.split('\n');
    lines.forEach((l, i) => {
      if (l.includes(word)) console.log(`${f}:L${i+1} [${word}]: ${l.trim()}`);
    });
  });
}

findWord('全量');
findWord('算力');
findWord('留存');
findWord('自持');
findWord('闭环');
findWord('底线');
findWord('单页架构');
