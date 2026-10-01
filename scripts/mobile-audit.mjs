/* 移动端适配体检：横向溢出 / 过小字号 / 过小点按区 / 正文对比度 / 浮层压字
   用法：先起 127.0.0.1:8327 静态服务，再 node scripts/mobile-audit.mjs
   产物：Temp/mob-*.png + 控制台分宽度报告 */
import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');

const BASE = process.env.SITE_BASE || 'http://127.0.0.1:8327/';
const SIZES = [
  ['320x640', 320, 640],
  ['360x780', 360, 780],
  ['390x844', 390, 844],
  ['430x932', 430, 932],
];

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });

for (const [tag, w, h] of SIZES) {
  const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForTimeout(3200);

  const r = await p.evaluate(() => {
    const lum = (c) => {
      const [r1, g1, b1] = c.map((v) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1;
    };
    const parse = (s) => {
      const m = s.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const v = m[1].split(',').map((x) => parseFloat(x));
      return { rgb: v.slice(0, 3), a: v.length > 3 ? v[3] : 1 };
    };
    const bgOf = (el) => {
      let cur = el;
      while (cur && cur !== document.documentElement) {
        const cs = getComputedStyle(cur);
        const c = parse(cs.backgroundColor);
        if (c && c.a > 0.85) return c.rgb;
        cur = cur.parentElement;
      }
      return [0, 0, 0];
    };
    const ratio = (fg, bg) => {
      const [l1, l2] = [lum(fg), lum(bg)].sort((a, b2) => b2 - a);
      return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
    };

    // 1) 横向溢出
    const de = document.documentElement;
    const overflow = de.scrollWidth - de.clientWidth;
    const offenders = [];
    if (overflow > 0) {
      document.querySelectorAll('body *').forEach((el) => {
        const rc = el.getBoundingClientRect();
        if (rc.width > 2 && rc.right > de.clientWidth + 1 + window.scrollX) {
          offenders.push(
            `${el.tagName.toLowerCase()}.${String(el.className).split(' ').filter(Boolean).slice(0, 2).join('.')} right=${Math.round(rc.right)}`
          );
        }
      });
    }

    // 2) 过小字号（< 12px）
    const small = {};
    document.querySelectorAll('body *').forEach((el) => {
      if (el.children.length || !(el.textContent || '').trim()) return;
      const rc = el.getBoundingClientRect();
      if (rc.width < 2 || rc.height < 2) return;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 12) {
        const k = `${fs}px`;
        small[k] = small[k] || { n: 0, eg: (el.textContent || '').trim().slice(0, 14) };
        small[k].n++;
      }
    });

    // 3) 点按区 < 40px（可点元素）
    // ❗命中区可能被透明 ::after 撑大（本站顶栏就是这么做的），所以按 ::after 的 inset 折算有效尺寸
    const taps = [];
    document.querySelectorAll('a[href], button, [role="button"]').forEach((el) => {
      const rc = el.getBoundingClientRect();
      if (rc.width < 2 || rc.height < 2) return;
      if (rc.top > innerHeight * 3) return; // 只看前几屏，够代表性
      let w = rc.width;
      let h = rc.height;
      const af = getComputedStyle(el, '::after');
      if (af.content && af.content !== 'none' && af.position === 'absolute') {
        const num = (v) => (v.endsWith('px') ? Math.abs(parseFloat(v)) : 0);
        w += num(af.left) + num(af.right);
        h += num(af.top) + num(af.bottom);
      }
      if (h < 40 || w < 40) {
        taps.push(
          `${(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 12)} ${Math.round(w)}x${Math.round(h)}`
        );
      }
    });

    // 4) 代表性文字对比度
    const pick = (sel, name) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const fg = parse(cs.color);
      if (!fg) return null;
      const bg = bgOf(el);
      return `${name}: ${cs.color} on rgb(${bg.join(',')}) = ${ratio(fg.rgb, bg)}:1 · ${parseFloat(cs.fontSize)}px/${cs.lineHeight === 'normal' ? 'normal' : Math.round(parseFloat(cs.lineHeight))}`;
    };
    const contrasts = [
      pick('#products article p.text-sm', '卡片描述'),
      pick('#about p.text-sm', '关于我正文'),
      pick('#blog .sec-eyebrow', '栏目标题'),
      pick('.project-facts', '卡片 facts'),
      pick('#site-subtitle', 'hero 副标题'),
    ].filter(Boolean);

    // 5) 浮层压字
    const floats = ['#page-next', '.music-fab'].map((s) => document.querySelector(s)).filter(Boolean).map((e) => e.getBoundingClientRect());
    let hits = 0;
    document.querySelectorAll('#products p, #products h3, #about p, #blog p').forEach((el) => {
      const rc = el.getBoundingClientRect();
      if (rc.width < 2 || rc.height < 2 || rc.bottom < 0 || rc.top > innerHeight) return;
      if (floats.some((c) => rc.left < c.right && rc.right > c.left && rc.top < c.bottom && rc.bottom > c.top)) hits++;
    });

    return { overflow, offenders: [...new Set(offenders)].slice(0, 4), small, taps: [...new Set(taps)].slice(0, 6), contrasts, hits, pageerrors: 0 };
  });

  console.log(`\n=== ${tag} ===`);
  console.log(`横向溢出: ${r.overflow}px ${r.offenders.length ? '→ ' + r.offenders.join(' | ') : ''}`);
  console.log(`小于 12px 的字: ${Object.keys(r.small).length ? Object.entries(r.small).map(([k, v]) => `${k}×${v.n}(如「${v.eg}」)`).join(' ') : '无'}`);
  console.log(`小于 40px 的点按区: ${r.taps.length ? r.taps.join(' | ') : '无'}`);
  console.log(`对比度/字号:\n  ${r.contrasts.join('\n  ')}`);
  console.log(`浮层压字: ${r.hits}`);
  console.log(`pageerrors: ${errs.length}`);

  await p.screenshot({ path: `D:/HTML/Temp/mob-${tag}.png` });
  await p.close();
}
await b.close();
