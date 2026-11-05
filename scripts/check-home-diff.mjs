import { execSync } from 'child_process';

const diff = execSync('git diff HEAD index.html', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const lines = diff.split('\n');
const homeDiff = lines.filter((line, i) => {
  return i > 25 && i < 280;
});
console.log(homeDiff.join('\n'));
