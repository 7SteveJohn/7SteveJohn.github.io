/**
 * 视频效果移植验收（2026-10-16：深空壁纸 / Live2D 看板娘 / 波浪归档 / 照片墙 / 按住 Tab）
 * ----------------------------------------------------
 * 逐条对应交付清单，全部可复现：
 *   A 首页   无控制台错误、壁纸层生效（桌面为 screen 混合）、看板娘加载并可关闭且持久化
 *   B 归档   卡片数=文章数、曲线 path 存在、筛选写 hash、点卡片回首页并打开阅读弹窗
 *   C 照片墙 瓷砖数=数据数、无裂图、灯箱开合与 ←/→/Esc
 *   D 按住Tab 轻点不接管、按住弹层、循环高亮、松开跳转、Esc 取消
 *   E 手机   375×812：归档单列、照片墙单列、看板娘隐藏、壁纸不做混合
 *   F 离线   断网后 archive/gallery 仍能打开（SW 白名单 SWR）
 *   G 降级   prefers-reduced-motion 不加载看板娘、粒子画布隐藏；file:// 下看板娘静默跳过
 * 用法：node scripts/dev-server.js（8328）→ node scripts/video-fx-smoke.mjs
 */
import { spawnSync } from 'node:child_process';
import { devRequire as require } from './_dev-require.mjs';
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8328/';

let pass = 0, fail = 0;
const ok = (n, extra) => { pass++; console.log('PASS  ' + n + (extra ? '  ' + extra : '')); };
const bad = (n, extra) => { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); };
const assert = (cond, name, extra) => (cond ? ok : bad)(name, extra);

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
// 主实例走软件渲染（swiftshader）：结果稳定、不挑机器；强机档位用 ?fx=full 显式声明。
// 弱机 / 无 WebGL 两条路径各自另起实例（见 H、I 段）。
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});

const errorsOf = (page) => {
  const list = [];
  page.on('pageerror', (e) => list.push('pageerror: ' + String(e).slice(0, 120)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // 播放器对 mp3 的 idle 预取会被浏览器 abort（既有行为，非本次改动引入）；tab-nav/懒图不受影响
    if (/music\/.*\.mp3|ERR_ABORTED/.test(m.text())) return;
    list.push('console: ' + m.text().slice(0, 120));
  });
  return list;
};

try {
  // ---------------- A. 首页（桌面）----------------
  {
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    const errors = errorsOf(page);
    // ?fx=full 显式声明「按强机走」：验收脚本的浏览器是软件渲染（swiftshader），
    // 不声明的话会被 js/wallpaper.js 的弱机判定自动降到轻档（那时没有卡片磨砂）
    await page.goto(BASE + 'index.html?fx=full', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1200);

    const wp = await page.evaluate(() => {
      const el = document.getElementById('site-wallpaper');
      const cs = el ? getComputedStyle(el) : null;
      const card = document.querySelector('.bento-card');
      return {
        cls: document.documentElement.classList.contains('has-wallpaper'),
        opacity: cs ? Number(cs.opacity) : 0,
        blend: cs ? cs.mixBlendMode : '',
        // 轮换后壁纸由 --wp-image 提供，可能是任意一张 wallpaper[-n].webp，别再写死文件名
        imgAny: cs ? /wallpaper[^")]*\.webp/.test(cs.backgroundImage) : false,
        lite: document.documentElement.classList.contains('wallpaper-lite'),
        cardBlur: card ? (getComputedStyle(card).backdropFilter || 'none') : 'none',
        tier: (window.__fxTier || {}).tier || '',
      };
    });
    assert(wp.cls && wp.opacity > 0 && (wp.imgAny || wp.img), 'A1 深空壁纸层生效', `opacity=${wp.opacity}`);
    assert(wp.blend === 'screen', 'A2 桌面细指针用 screen 混合（壁纸从推理场深底透出）', wp.blend);
    assert(!wp.lite && wp.tier === 'full' && /blur/.test(wp.cardBlur),
      'A2b 强机档位：卡片磨砂在场、未被降成轻档', `tier=${wp.tier} blur=${wp.cardBlur.slice(0, 12)}`);

    // 看板娘：桌面档才会拉（首帧后 idle 加载，1.9MB 本地很快）
    let live = null;
    for (let i = 0; i < 24 && !live; i++) {
      await page.waitForTimeout(500);
      live = await page.evaluate(() => document.getElementById('waifu') ? {
        hasClass: document.documentElement.classList.contains('has-live2d'),
        close: !!document.getElementById('live2d-close'),
        backTop: getComputedStyle(document.getElementById('back-to-top')).right,
      } : null);
    }
    assert(!!live && live.hasClass && live.close, 'A3 Live2D 看板娘加载（含关闭键）', JSON.stringify(live));
    assert(live && parseFloat(live.backTop) > 100, 'A4 看板娘在场时「回到顶部」让位', live && live.backTop);

    if (live) {
      await page.click('#live2d-close');
      await page.waitForTimeout(400);
      const closed = await page.evaluate(() => ({
        hidden: (document.getElementById('waifu') || {}).className || '',
        flag: localStorage.getItem('sj.live2d'),
      }));
      assert(/waifu-hidden/.test(closed.hidden) && closed.flag === 'off', 'A5 关闭键登出并持久化', JSON.stringify(closed));
    }
    assert(errors.length === 0, 'A6 首页无控制台错误', errors.slice(0, 2).join(' | '));

    // 「更多」菜单里能找到两个新页面
    const navLinks = await page.evaluate(() => [...document.querySelectorAll('#nav-more .nav-menu a')].map((a) => a.getAttribute('href')));
    assert(navLinks.includes('archive.html') && navLinks.includes('gallery.html'), 'A7 导航「更多」收录归档与照片墙', navLinks.join(','));
    await page.context().close();
  }

  // ---------------- B. 归档页 ----------------
  {
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    const errors = errorsOf(page);
    await page.goto(BASE + 'archive.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);

    const arc = await page.evaluate(() => ({
      items: document.querySelectorAll('.arc-item').length,
      data: (window.ARTICLES_DATA || []).length,
      path: document.querySelector('.wave-line').getAttribute('d').length,
      sides: [...document.querySelectorAll('.arc-item')].slice(0, 4).map((el) => el.dataset.side).join(','),
      years: [...document.querySelectorAll('.wave-year')].filter((y) => y.textContent).length,
    }));
    assert(arc.items === arc.data && arc.items > 0, 'B1 归档卡片数=文章数', `${arc.items}/${arc.data}`);
    assert(arc.path > 40, 'B2 波浪曲线 path 已生成', 'd 长度 ' + arc.path);
    assert(/left,right/.test(arc.sides), 'B3 卡片左右交错挂在曲线两侧', arc.sides);
    assert(arc.years >= 1, 'B4 年份标出现', String(arc.years));

    await page.click('.arc-chip[data-key="creation"]');
    await page.waitForTimeout(700);
    const filt = await page.evaluate(() => ({
      hash: location.hash,
      visible: [...document.querySelectorAll('.arc-item')].filter((el) => !el.hidden).length,
      pressed: document.querySelector('.arc-chip[data-key="creation"]').getAttribute('aria-pressed'),
    }));
    assert(filt.hash === '#creation' && filt.pressed === 'true' && filt.visible > 0,
      'B5 分类筛选写 hash 且只留该分类', JSON.stringify(filt));

    await page.goto(BASE + 'archive.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.click('.arc-item:not([hidden]) a');
    await page.waitForTimeout(2200);
    const deep = await page.evaluate(() => ({
      url: location.href,
      modal: !document.getElementById('article-modal').classList.contains('hidden'),
    }));
    assert(/\?post=/.test(deep.url) && deep.modal, 'B6 卡片深链回首页并打开阅读弹窗', deep.url.split('/').pop());
    assert(errors.length === 0, 'B7 归档页无控制台错误', errors.slice(0, 2).join(' | '));
    await page.context().close();
  }

  // ---------------- C. 照片墙 ----------------
  {
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
    const errors = errorsOf(page);
    await page.goto(BASE + 'gallery.html', { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 100));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);

    const gal = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll('.gal-tile')];
      return {
        tiles: tiles.length,
        data: (window.GALLERY_DATA || []).length,
        broken: tiles.filter((t) => {
          const img = t.querySelector('img');
          return !img || (img.complete && img.naturalWidth === 0);
        }).length,
        cols: getComputedStyle(document.getElementById('gallery-grid')).gridTemplateColumns.split(' ').length,
      };
    });
    assert(gal.tiles === gal.data && gal.tiles > 0, 'C1 瓷砖数=数据数', `${gal.tiles}/${gal.data}`);
    assert(gal.broken === 0, 'C2 无裂图', String(gal.broken));
    assert(gal.cols === 3, 'C3 桌面三列混排', String(gal.cols));

    await page.click('.gal-tile:nth-child(3)');
    await page.waitForTimeout(600);
    const open = await page.evaluate(() => ({
      open: !document.getElementById('gal-lightbox').classList.contains('hidden'),
      idx: document.getElementById('gal-index').textContent,
      locked: document.body.style.overflow === 'hidden',
    }));
    assert(open.open && /3 \/ \d+/.test(open.idx) && open.locked, 'C4 灯箱打开（锁滚动 + 序号）', JSON.stringify(open));

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    const next = await page.evaluate(() => document.getElementById('gal-index').textContent);
    assert(next.startsWith('4'), 'C5 → 切到下一张', next);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const shut = await page.evaluate(() => ({
      hidden: document.getElementById('gal-lightbox').classList.contains('hidden'),
      unlocked: document.body.style.overflow === '',
    }));
    assert(shut.hidden && shut.unlocked, 'C6 Esc 关闭并解锁滚动', JSON.stringify(shut));
    assert(errors.length === 0, 'C7 照片墙无控制台错误', errors.slice(0, 2).join(' | '));
    await page.context().close();
  }

  // ---------------- D. 按住 Tab ----------------
  {
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    const errors = errorsOf(page);
    await page.goto(BASE + 'archive.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1200);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(150);
    const tapped = await page.evaluate(() => {
      const t = document.getElementById('tabnav');
      return !t || t.hidden;
    });
    assert(tapped, 'D1 轻点 Tab 不接管（浏览器原生焦点导航保留）');

    await page.keyboard.down('Tab');
    await page.waitForTimeout(420);
    const held = await page.evaluate(() => {
      const t = document.getElementById('tabnav');
      const items = t ? [...t.querySelectorAll('.tabnav-item')] : [];
      return {
        open: !!t && !t.hidden,
        n: items.length,
        active: items.findIndex((i) => i.classList.contains('is-active')),
        announce: (document.querySelector('.tabnav-live') || {}).textContent || '',
      };
    });
    assert(held.open && held.n > 2, 'D2 按住 Tab 弹出快速导航', JSON.stringify({ n: held.n }));
    assert(/快速导航/.test(held.announce), 'D3 aria-live 播报状态');

    await page.waitForTimeout(260);
    await page.keyboard.down('Tab');
    await page.waitForTimeout(120);
    const cycled = await page.evaluate(() => {
      const items = [...document.querySelectorAll('.tabnav-item')];
      return items.findIndex((i) => i.classList.contains('is-active'));
    });
    assert(cycled !== held.active, 'D4 按住期间循环高亮', `${held.active} → ${cycled}`);

    await page.keyboard.up('Tab');
    await page.waitForTimeout(1200);
    const jumped = await page.evaluate(() => ({
      gone: !document.getElementById('tabnav') || document.getElementById('tabnav').hidden,
      y: Math.round(window.scrollY),
    }));
    assert(jumped.gone, 'D5 松开后浮层关闭并按高亮项跳转', 'scrollY=' + jumped.y);

    // 上一轮松手跳到的是链接项（可能已经导航走），重新回归档页再做取消用例
    await page.goto(BASE + 'archive.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.keyboard.down('Tab');
    await page.waitForTimeout(320);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await page.keyboard.up('Tab');
    await page.waitForTimeout(300);
    const esc = await page.evaluate(() => {
      const t = document.getElementById('tabnav');
      return { closed: !t || t.hidden, url: location.pathname };
    });
    assert(esc.closed && /archive\.html$/.test(esc.url), 'D6 Esc 取消（不跳转、不退页）', JSON.stringify(esc));
    assert(errors.length === 0, 'D7 快速导航无控制台错误', errors.slice(0, 2).join(' | '));
    await page.context().close();
  }

  // ---------------- E. 手机档 ----------------
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const errors = errorsOf(page);

    await page.goto(BASE + 'archive.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1200);
    const arcMobile = await page.evaluate(() => {
      const it = document.querySelector('.arc-item');
      return {
        pos: it ? getComputedStyle(it).position : '',
        svg: getComputedStyle(document.getElementById('archive-svg')).display,
        x: it ? Math.round(it.getBoundingClientRect().x) : -1,
      };
    });
    assert(arcMobile.pos === 'relative' && arcMobile.svg === 'none',
      'E1 手机端归档退化为单列竖线（不绝对定位、不画曲线）', JSON.stringify(arcMobile));

    await page.goto(BASE + 'gallery.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1000);
    const galMobile = await page.evaluate(() => ({
      cols: getComputedStyle(document.getElementById('gallery-grid')).gridTemplateColumns.split(' ').length,
      wide: getComputedStyle(document.querySelector('.gal-tile.gal-wide')).gridColumn,
    }));
    assert(galMobile.cols === 1 && galMobile.wide === 'auto', 'E2 手机端照片墙单列（跨列复位）', JSON.stringify(galMobile));

    await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(4500);
    const mobile = await page.evaluate(() => {
      const el = document.getElementById('site-wallpaper');
      return {
        waifu: !!document.getElementById('waifu'),
        blend: getComputedStyle(el).mixBlendMode,
        wp: Number(getComputedStyle(el).opacity),
      };
    });
    assert(!mobile.waifu, 'E3 手机端不加载看板娘');
    assert(mobile.blend === 'normal' && mobile.wp > 0, 'E4 手机端壁纸走静态低透明度层（不做全屏混合）', JSON.stringify(mobile));
    assert(errors.length === 0, 'E5 手机档无控制台错误', errors.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ---------------- F. 离线（SW 白名单）----------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(async () => {
      const keys = await caches.keys();
      if (!keys.length) return false;
      const cache = await caches.open(keys[keys.length - 1]);
      return (await cache.keys()).length >= 40;
    }, null, { timeout: 30000, polling: 500 });
    await page.goto(BASE + 'archive.html', { waitUntil: 'load', timeout: 30000 });
    await page.goto(BASE + 'gallery.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1200);

    await ctx.setOffline(true);
    await page.goto(BASE + 'archive.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(900);
    const offlineArc = await page.evaluate(() => document.querySelectorAll('.arc-item').length);
    await page.goto(BASE + 'gallery.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(900);
    const offlineGal = await page.evaluate(() => document.querySelectorAll('.gal-tile').length);
    assert(offlineArc > 0 && offlineGal > 0, 'F1 断网后归档与照片墙仍可打开（SW 白名单 SWR）', `archive=${offlineArc} gallery=${offlineGal}`);
    await ctx.setOffline(false);
    await ctx.close();
  }

  // ---------------- G. 降级：reduce-motion / file:// ----------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const errors = errorsOf(page);
    await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(5000);
    const rm = await page.evaluate(() => ({
      waifu: !!document.getElementById('waifu'),
      particles: getComputedStyle(document.getElementById('particle-canvas')).display,
      revealed: Number(getComputedStyle(document.querySelector('#home')).opacity),
    }));
    assert(!rm.waifu, 'G1 prefers-reduced-motion 下不加载看板娘');
    assert(rm.particles === 'none' && rm.revealed === 1, 'G2 减少动态效果下粒子关闭、内容照常显示', JSON.stringify(rm));
    assert(errors.length === 0, 'G3 reduce-motion 下无控制台错误', errors.slice(0, 2).join(' | '));
    await ctx.close();

    const fileCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const filePage = await fileCtx.newPage();
    const fileErrors = [];
    filePage.on('pageerror', (e) => fileErrors.push(String(e).slice(0, 120)));
    await filePage.goto('file:///D:/HTML/index.html', { waitUntil: 'load', timeout: 30000 });
    await filePage.waitForTimeout(5000);
    const fileState = await filePage.evaluate(() => ({
      waifu: !!document.getElementById('waifu'),
      wp: document.documentElement.classList.contains('has-wallpaper'),
    }));
    assert(!fileState.waifu, 'G4 file:// 双击打开时看板娘静默跳过（不报错、不空白）');
    assert(fileState.wp, 'G5 file:// 下壁纸仍生效（纯 CSS 层，无需 fetch）');
    assert(fileErrors.filter((e) => /live2d|waifu/i.test(e)).length === 0, 'G6 file:// 无看板娘相关报错', fileErrors.slice(0, 2).join(' | '));
    await fileCtx.close();
  }

  // ---------------- J. 第 1 轮：配置收口 / 设置面板 / 三件动效 / 文章卡封面 ----------------
  {
    // J1 一致性：js/site-config.js 与各页导航页脚不漂移（脚本自己是权威）
    const r = spawnSync(process.execPath, ['scripts/sync-chrome.mjs'], { cwd: process.cwd(), encoding: 'utf8' });
    assert(r.status === 0, 'J1 sync-chrome 一致性校验通过', (r.stdout || '').trim().split('\n').pop());

    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    const errors = errorsOf(page);
    await page.goto(BASE + 'index.html?fx=full', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1600);

    // J2 站点配置读得到，且与页面标题同源
    const cfg = await page.evaluate(() => ({
      name: (window.SITE_CONFIG || {}).name, wallpapers: ((window.SITE_CONFIG || {}).wallpapers || []).length,
      title: document.title
    }));
    assert(cfg.name && cfg.title.startsWith(cfg.name) && cfg.wallpapers >= 1, 'J2 SITE_CONFIG 生效且与标题一致', JSON.stringify(cfg));

    // J3 设置面板：齿轮 → 打开 → 滑杆实时生效 + 落盘 → 档位写键
    await page.click('#fx-open');
    await page.waitForTimeout(350);
    const opened = await page.evaluate(() => ({
      open: !document.getElementById('fx-panel').hidden,
      focus: document.activeElement.className
    }));
    assert(opened.open && /fx-close/.test(opened.focus), 'J3a 设置面板可打开且焦点进入', JSON.stringify(opened));

    await page.evaluate(() => {
      const b = document.getElementById('fx-blur');
      b.value = '8';
      b.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(200);
    const slider = await page.evaluate(() => ({
      filter: getComputedStyle(document.getElementById('site-wallpaper')).filter,
      stored: localStorage.getItem('sj.wp-blur')
    }));
    assert(/blur\(8px\)/.test(slider.filter) && slider.stored === '8', 'J3b 模糊滑杆实时生效并持久化', JSON.stringify(slider));

    await page.click('[data-tier="lite"]');
    await page.waitForTimeout(250);
    const tier = await page.evaluate(() => ({
      stored: localStorage.getItem('sj.wallpaper'),
      lite: document.documentElement.classList.contains('wallpaper-lite'),
      note: !document.getElementById('fx-note').hidden
    }));
    assert(tier.stored === 'lite' && tier.lite && tier.note, 'J3c 档位切换即时生效并提示刷新', JSON.stringify(tier));

    // 开关：粒子/推理场/看板娘 → 类 + 键（看板娘这个环境本来就没加载，只验开关语义）
    await page.evaluate(() => {
      ['fx-particles', 'fx-cosmos'].forEach((id) => {
        const el = document.getElementById(id);
        el.checked = false;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    await page.waitForTimeout(200);
    const flags = await page.evaluate(() => ({
      cls: document.documentElement.className.split(' ').filter((c) => c.startsWith('fx-no')).sort().join(','),
      store: [localStorage.getItem('sj.particles'), localStorage.getItem('sj.cosmos')].join(',')
    }));
    assert(flags.cls === 'fx-no-cosmos,fx-no-particles' && flags.store === 'off,off', 'J3d 粒子/推理场开关生效并落盘', JSON.stringify(flags));

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    assert(await page.evaluate(() => document.getElementById('fx-panel').hidden), 'J3e Esc 关闭设置面板');

    // 复位（别把弱机档位带进后面的用例）
    await page.evaluate(() => { ['sj.wallpaper', 'sj.wp-blur', 'sj.wp-dim', 'sj.particles', 'sj.cosmos', 'sj.live2d', 'sj.fx-lite'].forEach((k) => localStorage.removeItem(k)); });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1500);

    // J4 导航胶囊：跟着 ScrollSpy 走
    await page.evaluate(() => document.querySelector('#philosophy').scrollIntoView());
    await page.waitForTimeout(1100);
    const pill = await page.evaluate(() => {
      const nav = document.querySelector('header.site-header .max-w-6xl > nav');
      const active = nav.querySelector('a.nav-active');
      const p = document.querySelector('.nav-pill');
      return {
        on: nav.classList.contains('nav-pill-on'),
        active: active ? active.textContent.trim() : null,
        expect: active ? active.offsetLeft - 6 : null,
        got: p.style.transform,
        opacity: getComputedStyle(p).opacity,
        underline: active ? getComputedStyle(active).textDecorationLine : null
      };
    });
    assert(pill.on && pill.active && pill.got.includes(`${pill.expect}px`) && pill.opacity === '1' && pill.underline === 'none',
      'J4 导航胶囊跟随当前区块（且下划线让位）', JSON.stringify(pill));

    // J5 目录高亮当前章节
    await page.goto(BASE + 'index.html?post=ai-frontier-mirror', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2600);
    const toc1 = await page.evaluate(() => {
      const links = [...document.querySelectorAll('.toc-box .toc-link')];
      return { n: links.length, cur: links.findIndex((l) => l.classList.contains('is-current')), aria: (links.find((l) => l.classList.contains('is-current')) || {}).getAttribute ? links.find((l) => l.classList.contains('is-current')).getAttribute('aria-current') : null };
    });
    await page.evaluate(() => { document.getElementById('article-modal-content').scrollTop = 2400; });
    await page.waitForTimeout(600);
    const toc2 = await page.evaluate(() => {
      const links = [...document.querySelectorAll('.toc-box .toc-link')];
      return { cur: links.findIndex((l) => l.classList.contains('is-current')), only: links.filter((l) => l.classList.contains('is-current')).length };
    });
    assert(toc1.n >= 3 && toc1.cur >= 0 && toc1.aria === 'true' && toc2.cur !== toc1.cur && toc2.only === 1,
      'J5 目录高亮当前章节且随滚动变化', `${toc1.cur} → ${toc2.cur}`);

    // J6 文章卡封面：每张卡都有媒体位（真图或品牌首字），数量与文章数一致
    await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1800);
    const cards = await page.evaluate(() => {
      const list = [...document.querySelectorAll('#articles-list .ac-with-cover')];
      const media = list.filter((c) => c.querySelector('.ac-media'));
      const filled = media.filter((c) => c.querySelector('.ac-media img') || (c.querySelector('.ac-fallback') || {}).textContent);
      const broken = [...document.querySelectorAll('.ac-media img')].filter((i) => i.complete && i.naturalWidth === 0).length;
      return { cards: list.length, media: media.length, filled: filled.length, broken, data: (window.ARTICLES_DATA || []).filter((a) => !a.section).length };
    });
    assert(cards.media === cards.cards && cards.cards > 0 && cards.filled === cards.cards && cards.broken === 0,
      'J6 文章卡全部有封面位（真图或品牌渐变首字）', JSON.stringify(cards));

    // J7 灯箱入场动画
    await page.goto(BASE + 'gallery.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.click('.gal-tile:nth-child(2)');
    await page.waitForTimeout(250);
    const zoom = await page.evaluate(() => {
      const img = document.getElementById('gal-img');
      return { cls: img.className, anim: getComputedStyle(img).animationName };
    });
    assert(/is-in/.test(zoom.cls) && zoom.anim === 'gal-zoom', 'J7 灯箱大图入场缩放', JSON.stringify(zoom));

    assert(errors.length === 0, 'J8 第 1 轮新增功能无控制台错误', errors.slice(0, 2).join(' | '));
    await page.context().close();
  }

  // ---------------- H. 弱机路径（无硬件加速 → 软件合成）----------------
  // 2026-10-17 用户报「明显变卡」后实测出来的一条真实路径：
  // 卡片磨砂在软件合成下把滚动从 60 帧打到 16–34 帧，所以必须自动降档。
  {
    const weakBrowser = await chromium.launch({ executablePath: CHROME, args: ['--disable-gpu'] });
    const ctx = await weakBrowser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors = errorsOf(page);
    const l2dReqs = [];
    page.on('request', (r) => { if (/vendor\/live2d/.test(r.url())) l2dReqs.push(r.url()); });

    await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(12000);          // 等壁纸层 + 静态弱机判定落地
    const weak = await page.evaluate(() => {
      const card = document.querySelector('.bento-card');
      return {
        wp: document.documentElement.classList.contains('has-wallpaper'),
        lite: document.documentElement.classList.contains('wallpaper-lite'),
        tier: (window.__fxTier || {}).tier || '',
        cardBlur: card ? (getComputedStyle(card).backdropFilter || 'none') : 'none',
      };
    });
    assert(weak.wp && weak.lite && weak.tier === 'lite', 'H1 软件合成自动降到轻档', JSON.stringify(weak));
    assert(!/blur/.test(weak.cardBlur), 'H2 轻档下卡片不做磨砂（最贵的一笔）', weak.cardBlur.slice(0, 12));
    assert(l2dReqs.length === 0, 'H3 轻档下不加载看板娘（省 1.9MB 与一份每帧渲染）', String(l2dReqs.length));

    const fps = await page.evaluate(() => new Promise((res) => {
      const t = document.querySelector('#products') || document.body;
      window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY - 40);
      let n = 0; const t0 = performance.now();
      const step = () => {
        n++; window.scrollBy(0, 14);
        if (performance.now() - t0 < 2500) requestAnimationFrame(step);
        else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1));
      };
      requestAnimationFrame(step);
    }));
    assert(fps >= 50, 'H4 轻档滚动帧率恢复到 60 帧档', fps + ' fps');

    // 用户仍可显式要完整效果（覆盖自动判定）
    await page.goto(BASE + 'index.html?fx=full', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);
    const forced = await page.evaluate(() => ({
      lite: document.documentElement.classList.contains('wallpaper-lite'),
      tier: (window.__fxTier || {}).tier || '',
    }));
    assert(!forced.lite && forced.tier === 'full', 'H5 ?fx=full 覆盖自动降档（用户说了算）', JSON.stringify(forced));
    assert(errors.length === 0, 'H6 弱机路径无控制台错误', errors.slice(0, 2).join(' | '));
    await weakBrowser.close();
  }

  // ---------------- I. 无 WebGL（完全跑不了看板娘）----------------
  {
    const noGl = await chromium.launch({ executablePath: CHROME, args: ['--disable-gpu', '--disable-software-rasterizer'] });
    const ctx = await noGl.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors = errorsOf(page);
    const l2dReqs = [];
    page.on('request', (r) => { if (/vendor\/live2d/.test(r.url())) l2dReqs.push(r.url()); });
    await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(8000);
    const st = await page.evaluate(() => {
      const w = document.getElementById('waifu');
      return {
        webgl: !!document.createElement('canvas').getContext('webgl'),
        waifu: !!w,
        visibility: w ? getComputedStyle(w).visibility : '-',
        close: !!document.getElementById('live2d-close'),
      };
    });
    assert(!st.webgl, 'I1 该环境确实没有 WebGL', String(st.webgl));
    assert(l2dReqs.length === 0, 'I2 无 WebGL 时零请求（不白下 1.9MB）', String(l2dReqs.length));
    assert(!st.close && st.visibility !== 'visible', 'I3 不留空白看板娘、不出关闭键、不挡点击', JSON.stringify(st));
    assert(errors.length === 0, 'I4 无 WebGL 路径无控制台错误', errors.slice(0, 2).join(' | '));
    await noGl.close();
  }
} finally {
  await browser.close();
}

console.log(`\n===== 视频效果移植验收：${pass} 通过 / ${fail} 失败 =====`);
process.exit(fail ? 1 : 0);
