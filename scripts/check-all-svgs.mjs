import fs from 'node:fs';
import path from 'node:path';
import { devRequire } from './_dev-require.mjs';
const { chromium } = devRequire('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']
});

try {
  const page = await browser.newPage();
  const dir = 'assets/images/covers';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));
  
  console.log(`Checking ${files.length} svg files...`);
  const results = [];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const parse = await page.evaluate((xml) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'image/svg+xml');
      const err = doc.querySelector('parsererror');
      return {
        hasError: !!err,
        error: err ? err.textContent.slice(0, 150) : null
      };
    }, content);

    if (parse.hasError) {
      results.push({ file, error: parse.error });
    }
  }

  console.log(`Failed files (${results.length}):`, JSON.stringify(results, null, 2));

} finally {
  await browser.close();
}
