import { execSync } from 'child_process';

const css = execSync('git show HEAD:css/style.css', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const start = css.indexOf('#home .hero-index');
console.log(css.slice(start, start + 1200));
