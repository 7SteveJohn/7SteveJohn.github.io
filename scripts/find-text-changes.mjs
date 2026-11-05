import { execSync } from 'child_process';

const diff = execSync('git diff HEAD index.html', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const lines = diff.split('\n');
const textChanges = lines.filter(l => {
  return (l.startsWith('+') || l.startsWith('-')) &&
         !l.startsWith('---') && !l.startsWith('+++') &&
         (l.includes('<h') || l.includes('title') || l.includes('<p') || l.includes('class="btn') || l.includes('hi-name'));
});
console.log('Heading and text diffs in index.html:');
console.log(textChanges.join('\n'));
