// 临时校验：用站点自托管的 marked 渲染全部 posts/*.md，统计输出 HTML 里残留的字面 **（CJK 定界符失效）
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'D:/HTML';
const markedSrc = readFileSync(join(root, 'assets/vendor/marked.min.js'), 'utf8');
// UMD 在 node 里跑：包一层 module 作用域
const mod = { exports: {} };
new Function('module', 'exports', markedSrc)(mod, mod.exports);
const marked = mod.exports.marked || mod.exports.default || mod.exports;

const dir = join(root, 'posts');
const files = readdirSync(dir).filter(f => f.endsWith('.md'));
let total = 0;
const report = [];
for (const f of files) {
  const md = readFileSync(join(dir, f), 'utf8');
  const html = marked.parse(md);
  // 只统计正文残留（排除合法的 <strong>），找字面 ** 
  const leftover = (html.match(/\*\*/g) || []).length;
  if (leftover > 0) {
    // 抽出带 ** 的片段前后各 20 字
    const frags = [];
    const re = /[^<>]{0,25}\*\*[^<>]{0,25}/g;
    let m;
    while ((m = re.exec(html)) && frags.length < 4) frags.push(m[0]);
    report.push({ file: f, leftover, frags });
    total += leftover;
  }
}
console.log('files checked:', files.length);
console.log('files with literal ** :', report.length, '| total pairs:', total);
for (const r of report) {
  console.log('\n--', r.file, '(' + r.leftover + ')');
  for (const s of r.frags) console.log('   ', JSON.stringify(s));
}
writeFileSync('D:/HTML/out/_md-star-scan.json', JSON.stringify(report, null, 2));
