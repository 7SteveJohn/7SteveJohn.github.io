/* CSSOM 检查：样式表在哪断的 */
import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:8327/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(1500);
const r = await p.evaluate(() => {
  const sheet = [...document.styleSheets].find((s) => (s.href || '').includes('style.css'));
  const rules = [...sheet.cssRules];
  const find = (txt) => rules.findIndex((r2) => r2.selectorText && r2.selectorText.includes(txt));
  const panel = getComputedStyle(document.getElementById('music-panel'));
  const supportsRule = rules.filter((r2) => r2 instanceof CSSSupportsRule);
  return {
    total: rules.length,
    glassSpecIdx: find('.glass-spec'),
    heroGhostIdx: find('.hero-ghost'),
    supportsBlocks: supportsRule.map((r2) => r2.conditionText.slice(0, 50)),
    supportsLastIdx: supportsRule.length ? rules.indexOf(supportsRule[supportsRule.length - 1]) : -1,
    musicPanelPos: panel.position,
    musicPanelOpacity: panel.opacity,
    lastRuleText: rules[rules.length - 1].cssText.slice(0, 80),
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
