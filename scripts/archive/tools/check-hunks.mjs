import { execSync } from 'child_process';

const diff = execSync('git diff HEAD index.html', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const hunkHeaders = diff.split('\n').filter(l => l.startsWith('@@'));
console.log('Modified hunks:', hunkHeaders);
