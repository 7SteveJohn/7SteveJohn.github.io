import { execSync } from 'child_process';
import fs from 'fs';

const content = execSync('git show HEAD:index.html', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const start = content.indexOf('<section id="home"');
const end = content.indexOf('</section>', start);
console.log('=== ORIGINAL SECTION HOME IN HEAD ===');
console.log(content.slice(start, end + 10));
