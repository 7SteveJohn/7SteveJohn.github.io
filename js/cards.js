/* 札签卷宗核心模块（从 cards.html 内联脚本整体提取，逻辑零重写）
   cards.html（独立页）与首页内嵌卷宗架 / 全屏 portal 共用本文件。
   mount(rootEl, opts):
     opts.mode       'full'  全屏体验（卷宗架→拆封仪式→牌堆→阅读 + 总目抽屉 + 已入册托盘）
                     'shelf' 仅卷宗架（首页 #blog 内嵌；点卷宗走 opts.requestOpen(cat)）
     opts.standalone true=独立页（接管主题钮、完整 history 语义）；false=嵌入宿主
     opts.startPack  full 模式挂载后自动拆这一卷（portal 进场）
     opts.onExit     full+嵌入：Esc 退到卷宗架档位时回调，宿主负责关层销毁
     opts.requestOpen shelf 模式：点卷宗回调
     opts.themeBtn   standalone 模式的主题钮元素（在壳顶栏里，不在挂载根内）
     opts.filter     文条目过滤（首页嵌 #blog 传 a=>!a.section 只收手记；独立页不传=全库）
   返回 { destroy }；嵌入宿主负责建/删挂载根与 history 条目。 */
window.CardsCore = (function(){
'use strict';
const SK_FULL = "<div class=\"aurora\" aria-hidden=\"true\"><i></i><i></i><i></i></div>\n\n<header class=\"hud\" id=\"hud\"></header>\n\n<main class=\"stage\" id=\"stage\">\n  <!-- 卡包架 -->\n  <section id=\"packsView\">\n    <div class=\"packs\" id=\"packs\" role=\"list\" aria-label=\"札签卷宗架\"></div>\n  </section>\n  <!-- 单包牌堆 -->\n  <section id=\"deckView\" hidden>\n    <div class=\"deck-wrap\">\n      <div class=\"deck-tilt\" id=\"deckTilt\">\n        <div class=\"deck idle-wobble\" id=\"deck\" role=\"list\" aria-label=\"文章牌堆\"></div>\n      </div>\n      <div class=\"deck-pos\" id=\"deckPos\" hidden>1 / 7</div>\n    </div>\n  </section>\n  <p class=\"hint\" id=\"hint\"></p>\n</main>\n\n  <!-- 总目浮层：叠在卷宗架/牌堆之上，毛玻璃透出底下，不切视野 -->\n  <div id=\"catalogOv\" class=\"cat-ov\" hidden>\n    <div class=\"cat-backdrop\" id=\"catBackdrop\"></div>\n    <div class=\"cat-shade\" id=\"catShade\"></div>\n    <div class=\"cat-panel\" role=\"dialog\" aria-modal=\"true\" aria-label=\"总目\">\n      <div class=\"cat-panel-head\">\n        <h2>总目<small id=\"catPanelMeta\"></small></h2>\n        <button class=\"btn\" id=\"catCloseBtn\" aria-label=\"关闭总目\">✕ 收回</button>\n      </div>\n      <div class=\"catalog\" id=\"catalog\"></div>\n    </div>\n  </div>\n\n<aside class=\"pile\" id=\"pile\" aria-label=\"已读文章\"></aside>\n\n<article class=\"reader\" id=\"reader\" hidden aria-modal=\"true\">\n  <div class=\"reader-bar\">\n    <button class=\"btn\" id=\"closeBtn\">← 收回牌堆</button>\n    <span id=\"readerCat\"></span>\n  </div>\n  <div class=\"reader-main\">\n    <div class=\"reader-hero\" id=\"readerHero\"><img id=\"readerCover\" alt=\"\"></div>\n    <h1 id=\"readerTitle\" class=\"serif\"></h1>\n    <div class=\"meta\" id=\"readerMeta\"></div>\n    <div class=\"tags\" id=\"readerTags\"></div>\n    <a class=\"reader-more\" id=\"readerMore\" href=\"./\" rel=\"noopener\">在博客中阅读 →</a>\n    <div class=\"reader-body\" id=\"readerBody\"></div>\n  </div>\n</article>";
const SK_SHELF = "<main class=\"stage\" id=\"stage\">\n  <section id=\"packsView\">\n    <div class=\"packs\" id=\"packs\" role=\"list\" aria-label=\"札签卷宗架\"></div>\n  </section>\n  <p class=\"hint\" id=\"hint\"></p>\n</main>";

function createInstance(root, opts){
const DATA = ((opts.filter ? (window.ARTICLES_DATA || []).filter(opts.filter) : window.ARTICLES_DATA) || []).slice();
if (!DATA.length) { const h0 = root.querySelector('#hint'); if (h0) h0.textContent = '未找到文章数据 js/articles.js'; return null; }

// 恒 false 是定案：本机 prefers-reduced-motion:reduce 误报，接 matchMedia 等于自断全部特效（2026-11-16 收尾）
const reduce = false;
const $ = id => root.querySelector('#' + id);
const scopeEl = root.closest('.cards-scope') || root;
const hud = $('hud'), stage = $('stage'),
      packsView = $('packsView'), packsEl = $('packs'),
      deckView = $('deckView'), deck = $('deck'), deckTilt = $('deckTilt'),
      catalogOv = $('catalogOv'), catalogEl = $('catalog'), catPanelMeta = $('catPanelMeta'),
      pile = $('pile'), reader = $('reader'), hint = $('hint');

const serif = c => `<span class="serif">${c}</span>`;

/* ---------- 状态 ---------- */
// 每个分类一包；deck 数组末尾 = 顶卡（最新一篇先抽），抽走/读完的牌回收进牌底，永不空
let packs = new Map();          // category -> { deck:[], readEver:Set }
let cardEls = new Map();        // id -> 牌堆/目录里的卡元素
let chipEls = new Map();        // id -> 已读小卡
let borrowed = new Set();       // 目录里为已读文章临时建的卡（退出目录时销毁）
let view = 'packs';             // packs | deck | catalog | reader
let currentPack = null;
let catalogReturn = 'packs';
let fanMode = false;
let animating = false;
let lastFocus = null;           // 阅读页关闭后归还焦点用
let packBusy = false;           // 开包仪式进行中
let motesReady = false;         // 抽卡舞台浮尘已生成


const catHash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const SPRING = 'linear(0, 0.006, 0.028 2.3%, 0.104 4.9%, 0.228 7.6%, 0.552 14.2%, 0.812 19.7%, 0.944 24.2%, 1.034 28.9%, 1.092 34.2%, 1.11 38.6%, 1.108 42.4%, 1.088 47.2%, 1.032 56.8%, 0.99 66.2%, 0.968 75.8%, 0.968 87.7%, 0.984 97.4%, 1)';  // WAAPI 不解析 CSS 变量，JS 动画用这份
const packName = cat => 'pack-' + catHash(cat).toString(36);
const hueOf = cat => catHash(cat) % 360;
// 深色布面精装调色板：烫金细节需要足够深的底色才压得住
const PALETTE = {
  '系统调优': '#a34e28', '架构设计': '#46608a', '本地 AI': '#3f7048', 'AIGC': '#7d5590',
  '刷机': '#2e6e60', '随笔': '#a8842c', '游戏创作': '#8f3d3a', '前端工程': '#33589b',
  'AI 学习': '#6446a0'
};
const colorOf = cat => PALETTE[cat] || `hsl(${hueOf(cat)} 40% 46%)`;
const cardName = id => 'card-' + id;
// card-<id> 这个 morph 锚点同一时刻只能挂在一个元素上：目录卡 / 书脊 / 已读小卡 / 阅读页 hero
function giveName(id, el){
  [cardEls.get(id), chipEls.get(id), $('readerHero')].forEach(h => {
    if (h && h !== el) h.style.setProperty('view-transition-name', 'none');
  });
  el.style.viewTransitionName = cardName(id);
}
const articlesOf = cat => DATA.filter(a => a.category === cat);
const cats = [...new Set(DATA.map(a => a.category))]; // 按数据出现顺序

/* ---------- 构建 ---------- */
function build(){
  packs = new Map(); cardEls.clear(); chipEls.clear(); borrowed.clear();
  packsEl.innerHTML = ''; if (deck) deck.innerHTML = ''; if (catalogEl) catalogEl.innerHTML = '';
  if (pile) pile.innerHTML = '<div class="pile-head">已入册</div><div class="pile-row" id="pileRow"></div>';
  fanMode = false; currentPack = null; animating = false;
  if (deck){ deck.classList.remove('fan'); deckTilt.classList.remove('wide'); deck.classList.add('idle-wobble'); }
  for (const cat of cats){
    const arts = articlesOf(cat);
    packs.set(cat, { deck: arts.slice(), readEver: new Set() });
    const btn = document.createElement('button');
    btn.className = 'pack'; btn.dataset.cat = cat; btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-label', `札签卷宗：${cat}，共 ${arts.length} 札`);
    btn.style.viewTransitionName = packName(cat);
    btn.style.setProperty('--pc', colorOf(cat));
    btn.innerHTML = `
      <i class="pack-shadow"></i>
      <span class="pk-halo"></span>
      <i class="pk-sheen"></i>
      <span class="seal"></span>
      <i class="frame"></i>
      <i class="pk-rule t"></i>
      <span class="pk-name">${cat}</span>
      <i class="pk-rule b"></i>
      <span class="pk-count">收录 ${arts.length} 札</span>
      <span class="pk-foot">
        <span class="pk-read" data-read>已翻 0</span>
        <span class="pk-dots" data-dots></span>
        <i class="pk-holo" title="卷宗签孔"></i>
      </span>
      <span class="pk-new" data-new></span>`;
    btn.addEventListener('click', () => { if (opts.mode === 'shelf'){ if (opts.requestOpen) opts.requestOpen(cat); } else openPack(cat); });
    packsEl.appendChild(btn);
  }
  [...packsEl.children].forEach((p, i) => {   // 卡包架入场：柔和浮入（结束后清内联，让 class 动画能接管）
    p.style.animation = `pack-in .7s var(--spring) ${i * 70}ms backwards`;
    setTimeout(() => { p.style.animation = ''; }, 900 + i * 70);
  });
  showPacks(false);
}

function showPacks(animate = true){
  view = 'packs'; currentPack = null;
  const go = () => {
    if (deckView) deckView.hidden = true; closeCatalogNow();
    packsView.hidden = false;
    renderHUD(); updatePackBadges();
    hint.textContent = '点一卷拆封 · 每卷是一个分类';
  };
  animate && !reduce ? vt(go) : go();
}

function renderHUD(){
  if (!hud) return;
  const total = DATA.length, read = [...packs.values()].reduce((n, p) => n + p.readEver.size, 0);
  if (view === 'packs'){
    hud.innerHTML = `<div class="brand">
        ${serif('<h1>楠屿札记 <em>·</em> 札签</h1>')}
        <p class="hud-sub">// 收录 ${total} 札 · 分 ${cats.length} 卷 · 拆签即读</p>
      </div>
      <div class="hud-actions">
        <span id="counter">藏 ${total} 札 · 已启 ${read}</span>
        <button class="btn" id="catalogBtn">总目录</button>
        <button class="btn" id="resetBtn">重置</button>
      </div>`;
    $('catalogBtn').addEventListener('click', () => openCatalog('packs'));
    $('resetBtn').addEventListener('click', build);
  } else if (view === 'deck'){
    const p = packs.get(currentPack);
    hud.innerHTML = `<h1><button class="btn" id="backBtn">← 卷宗架</button><span class="sub serif">${currentPack}</span></h1>
      <div class="hud-actions">
        <span id="counter">已启 ${p.readEver.size} / ${p.deck.length}</span>
        <button class="btn" id="fanBtn">摊开本卷</button>
        <button class="btn" id="catalogBtn2">总目录</button>
      </div>`;
    $('backBtn').addEventListener('click', () => showPacks());
    $('fanBtn').addEventListener('click', toggleFan);
    $('catalogBtn2').addEventListener('click', () => openCatalog('deck'));
  }
}

function updatePackBadges(){
  packsEl.querySelectorAll('.pack').forEach(btn => {
    const p = packs.get(btn.dataset.cat);
    const n = articlesOf(btn.dataset.cat).length;
    const unread = n - p.readEver.size;
    btn.querySelector('[data-read]').textContent = `已启 ${p.readEver.size}`;
    btn.querySelector('[data-new]').textContent = `未启 ${unread} 札`;
    // 有货没拆 → 呼吸金晕 + 流光 + 徽章；集齐的包自动沉静
    btn.classList.toggle('has-new', unread > 0);
    // 进度点：一眼看出每包读到哪了
    const dots = btn.querySelector('[data-dots]');
    dots.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < p.readEver.size ? 'on' : ''}"></i>`).join('');
    // 拆过的包：封条撕开（叙事闭环）
    btn.classList.toggle('opened', p.readEver.size > 0);
  });
}

/* ---------- 卡包 → 牌堆（开包仪式：摇包 → 金光 → 卡背四散 → 变牌堆） ---------- */
function openPack(cat){
  if (view !== 'packs' || packBusy) return;
  currentPack = cat;
  const go = () => {
    view = 'deck';
    packsView.hidden = true; closeCatalogNow();
    deckView.hidden = false;
    deck.style.viewTransitionName = packName(cat); // 包 morph 成牌堆
    if (deck){ deck.classList.remove('fan'); deckTilt.classList.remove('wide'); deck.classList.add('idle-wobble'); }
    fanMode = false;
    ensureMotes();                                 // 浮尘一次性布好
    renderHUD(); buildDeck(cat);
  };
  if (reduce){ vt(go); return; }   // demo 阶段 reduce 恒为 false，仪式全开
  const btn = packsEl.querySelector(`.pack[data-cat="${cat}"]`);
  if (!btn){ vt(go); return; }
  packBusy = true;
  btn.classList.add('opening', 'tearing');             // 封条先撕飞，光从裂口出
  const r = btn.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const fx = (cls, x, y) => { const e = document.createElement('i'); e.className = cls; e.style.left = x + 'px'; e.style.top = y + 'px'; scopeEl.appendChild(e); return e; };
  // ① 闪光 + 双向光轮（细密正向 + 稀疏反向，转速错开）
  const fxList = [fx('gacha-flash', cx, cy), fx('gacha-ring', cx, cy),
    fx('gacha-burst', cx, cy), fx('gacha-burst r2', cx, cy)];
  // ② 金屑：十粒随机方向抛洒
  for (let i = 0; i < 10; i++){
    const s = fx('gacha-sp', cx, cy);
    s.style.background = [getComputedStyle(scopeEl).getPropertyValue('--ink').trim() || '#1d1d1f', '#2563eb', colorOf(currentPack), '#94a3b8'][i % 4];
    const ang = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 120;
    s.style.setProperty('--sx', (Math.cos(ang) * dist).toFixed(0) + 'px');
    s.style.setProperty('--sy', (Math.sin(ang) * dist - 40).toFixed(0) + 'px');
    s.style.animationDelay = (60 + Math.random() * 160).toFixed(0) + 'ms';
  }
  // ③ 卡背：上抛后四散，弧线带中段抬升
  const fanH = Math.round(Math.max(...articlesOf(currentPack).map(x => 198 + (catHash(x.id) >> 3) % 72)) * 0.55);
  for (let i = 0; i < 5; i++){                    // 五张升起排成扇面，停住展示
    const c = fx('gacha-card', cx, cy);
    const s = i - 2;
    c.style.setProperty('--fx', (s * 62).toFixed(0) + 'px');
    c.style.setProperty('--fy', (-fanH - Math.abs(s) * 12).toFixed(0) + 'px');
    c.style.setProperty('--fr', (s * 8).toFixed(0) + 'deg');
    c.style.animationDelay = (260 + i * 85) + 'ms';
  }
  setTimeout(() => fxList.forEach(e => e.remove()), 1600);
  setTimeout(() => {
    btn.classList.remove('opening', 'tearing');
    packBusy = false;
    vt(() => {
      go();
      // 扇面卡：随过渡向下汇入牌堆后依次淡出——不再凭空消失
      scopeEl.querySelectorAll('.gacha-card').forEach((c, i) => {
        c.style.animation = 'none';                    // 停掉钉住扇面的 CSS 动画，改由内联接管
        c.style.transition = `transform .45s var(--spring) ${i * 26}ms, opacity .3s ease ${i * 26}ms`;
        c.style.transform = `translate(var(--fx), var(--fy)) rotate(var(--fr)) translateY(58px) scale(.82)`;
        c.style.opacity = '0';
        setTimeout(() => c.remove(), 1200 + i * 26);
      });
    });
  }, 1350);
}

function buildDeck(cat){
  deck.innerHTML = '';
  const p = packs.get(cat);
  p.deck.forEach(a => {
    const el = ensureCard(a);
    el.classList.toggle('is-read', p.readEver.has(a.id));
    deck.appendChild(el);
  });
  layout();
  dealIn();
}

/* ---------- 抽卡舞台浮尘 ---------- */
function ensureMotes(){
  if (motesReady || reduce) return;
  const box = document.createElement('div');
  box.className = 'motes';
  for (let i = 0; i < 12; i++){
    const m = document.createElement('i');
    m.style.left = (8 + Math.random() * 84).toFixed(1) + '%';
    m.style.top = (14 + Math.random() * 68).toFixed(1) + '%';
    m.style.setProperty('--d', (10 + Math.random() * 14).toFixed(1) + 's');
    m.style.setProperty('--dx', (Math.random() * 120 - 60).toFixed(0) + 'px');
    m.style.setProperty('--dy', (-60 - Math.random() * 110).toFixed(0) + 'px');
    m.style.setProperty('--o', (0.22 + Math.random() * 0.38).toFixed(2));
    m.style.animationDelay = (-Math.random() * 14).toFixed(1) + 's';
    box.appendChild(m);
  }
  deckView.appendChild(box);
  motesReady = true;
}

/* ---------- 卡片元素 ---------- */
function jitter(id){
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  const r = n => ((h = (h * 1103515245 + 12345) | 0) >>> 16) % n - (n >> 1);
  return { x: r(7), y: r(5), rot: r(7) * 0.45 };
}
function ensureCard(a){
  let el = cardEls.get(a.id);
  if (el) return el;
  const idx = DATA.indexOf(a);
  el = document.createElement('article');
  el.className = 'card';
  el.dataset.id = a.id;
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', `翻开文章：${a.title}`);
  el._j = jitter(a.id);
  el.style.viewTransitionName = cardName(a.id);
  el.innerHTML = `
    <div class="card-inner">
      <div class="cover"><img src="${a.cover}" alt="" loading="lazy"><span class="chip">${a.category}</span></div>
      <h2>${a.title}</h2>
      <div class="meta"><span>${a.date} · ${a.readTime}</span><span class="no">No.${String(DATA.length - idx).padStart(2, '0')}</span></div>
      <span class="tear">轻点拆签</span>
      <span class="done">已启</span>
      <div class="shine"></div>
    </div>`;
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    el.style.setProperty('--shx', (50 + (e.clientX - r.left) / r.width * 60 - 30) + '%');
  });
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardActivate(el, deck.contains(el) ? 'deck-top' : 'catalog'); return; }
    // 键盘翻牌：←/→ 把顶卡翻到牌底
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && el.classList.contains('is-top') && view === 'deck' && !fanMode && !animating){
      e.preventDefault();
      cycleAway(el, e.key === 'ArrowLeft' ? -1 : 1, e.key === 'ArrowLeft' ? -80 : 80, -14);
    }
  });
  cardEls.set(a.id, el);
  return el;
}
function markRead(el){
  el.classList.add('is-read');
  el.setAttribute('aria-label', `重读文章：${DATA.find(x => x.id === el.dataset.id).title}`);
}

function layout(){
  if (!currentPack) return;
  const p = packs.get(currentPack);
  const arr = p.deck;
  const n = arr.length;
  const spread = deck.classList.contains('spread') && !fanMode;   // 悬停展牌
  arr.forEach((a, i) => {
    const el = cardEls.get(a.id);
    if (!el) return;
    const d = n - 1 - i;
    el.classList.toggle('is-top', i === n - 1);
    el.classList.toggle('is-read', p.readEver.has(a.id));
    el.style.zIndex = 100 + i;
    if (i === n - 1) el.style.transform = '';
    else if (spread && d <= 2) el.style.transform = `translate(${d * 30}px, ${-d * 5}px) rotate(${d * 5}deg)`;  // 扇开露出侧边
    else el.style.transform = baseTransform(i, n, el._j);
    el.style.opacity = d > 8 ? 0 : 1;
    el.style.pointerEvents = d <= 2 ? 'auto' : 'none';   // 上三张（含顶卡）可直接点选
  });
  if (fanMode) arr.forEach(a => { const el = cardEls.get(a.id); if (el){ el.style.transform = ''; el.style.opacity = 1; el.style.pointerEvents = 'auto'; } });
  else if (view === 'deck'){
    // 顶卡若已翻过，提示语跟着换——用户不用猜这张还能不能点
    const top = arr[n - 1];
    // 牌堆位置指示：第 k / n 张（按包内原序，最新=1）
    const dp = $('deckPos');
    if (dp){
      const rev = articlesOf(currentPack).slice().reverse();
      const k = rev.findIndex(x => x.id === top.id) + 1;
      dp.textContent = `${k} / ${n}`;
      dp.hidden = !!fanMode;
    }
    hint.textContent = top && p.readEver.has(top.id)
      ? '这篇启过了 · 轻点重读，或左右拖动翻下一签'
      : '左右拖动翻阅 · 点侧边卡直接选 · 轻点拆签';
  }
}
function baseTransform(i, n, j){
  const d = Math.min(n - 1 - i, 8);
  return `translate(${d * 3 + j.x * (d ? 1 : 0)}px, ${d * 7 + j.y}px) rotate(${(j.rot * (0.5 + d * 0.12)).toFixed(2)}deg) scale(${(1 - d * 0.012).toFixed(3)})`;
}
function topBase(el){
  const arr = packs.get(currentPack).deck;
  const i = arr.findIndex(a => a.id === el.dataset.id);
  return i === arr.length - 1 ? '' : baseTransform(i, arr.length, el._j);
}

function dealIn(){
  if (reduce || !currentPack) return;
  const arr = packs.get(currentPack).deck, n = arr.length;
  arr.forEach((a, i) => {
    const el = cardEls.get(a.id);
    const to = el.style.transform || 'translate(0px,0px)';
    el.animate(
      [{ transform: `translate(46vw,-34vh) rotate(24deg) scale(.7)`, opacity: 0 },
       { transform: to, opacity: 1 }],
      { duration: 620, delay: (n - i) * 55, easing: SPRING, fill: 'backwards' }
    );
  });
}

/* ---------- 拖拽翻看 / 点侧边卡直接选 ---------- */
let drag = null;
if (deck) deck.addEventListener('pointerdown', e => {
  if (animating || fanMode || view !== 'deck') return;
  const el = e.target.closest('.card');
  if (!el || !el.classList.contains('is-top')) return;
  deck.classList.remove('spread');
  deck.classList.add('no-t');
  try { el.setPointerCapture(e.pointerId); } catch (_) {}
  drag = { el, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, samples: [{ t: performance.now(), x: e.clientX, y: e.clientY }], moved: false };
  el.classList.add('dragging');
});
if (deck) deck.addEventListener('pointermove', e => {
  if (!drag || drag.el !== e.target.closest?.('.card')) return;
  const d = drag;
  d.dx = e.clientX - d.x0; d.dy = e.clientY - d.y0;
  if (Math.hypot(d.dx, d.dy) > 6) d.moved = true;
  d.samples.push({ t: performance.now(), x: e.clientX, y: e.clientY });
  if (d.samples.length > 6) d.samples.shift();
  const base = topBase(d.el);
  d.el.style.transform = `${base} translate(${d.dx}px,${d.dy}px) rotate(${(d.dx * 0.055).toFixed(2)}deg)`;
  // 牌堆跟手：底下三张被轻轻带动，松手随 layout 归位
  const arr = packs.get(currentPack).deck, ti = arr.length - 1;
  for (let k = 1; k <= 3 && ti - k >= 0; k++){
    const ue = cardEls.get(arr[ti - k].id);
    if (!ue) continue;
    ue.style.transform = baseTransform(ti - k, arr.length, ue._j) +
      ` translate(${(d.dx * 0.10 / k).toFixed(1)}px, ${(d.dy * 0.06 / k).toFixed(1)}px) rotate(${(d.dx * 0.012 / k).toFixed(2)}deg)`;
  }
});
function endDrag(){
  if (!drag) return;
  const d = drag; drag = null;
  d.el.classList.remove('dragging');
  if (d.moved){                                 // 只有真拖过的卡才拦住随后的 click
    d.el._suppressed = true;
    setTimeout(() => { d.el._suppressed = false; }, 350);
  }
  const s = d.samples, last = s[s.length - 1];
  let prev = last;                               // 速度只看最后 100ms：中途停顿不稀释翻页力度
  for (let i = s.length - 2; i >= 0; i--){ prev = s[i]; if (last.t - s[i].t > 100) break; }
  const dt = Math.max(1, last.t - prev.t);
  const vx = (last.x - prev.x) / dt;
  const dist = Math.hypot(d.dx, d.dy);
  const dir = (Math.abs(vx) > 0.55 ? Math.sign(vx) : Math.sign(d.dx || vx)) || 1;
  const power = dist / Math.max(innerWidth, 1) + Math.abs(vx) / 2.2;
  if (d.moved && (dist > 60 || Math.abs(vx) > 0.5) && power > 0.05){
    cycleAway(d.el, dir, d.dx, d.dy);            // 拖动 = 翻到下一张（低门槛浏览）
  } else if (d.moved){
    springBack(d.el);
  }
}
if (deck) deck.addEventListener('pointerup', e => {
  if (drag && drag.el === e.target.closest?.('.card')) endDrag();
  deck.classList.remove('no-t');
});
if (deck) deck.addEventListener('pointercancel', () => {
  if (!drag) return;
  const d = drag; drag = null;
  d.el.classList.remove('dragging');
  deck.classList.remove('no-t');
  if (d.moved){                                 // 同上：拖过的才拦 click
    d.el._suppressed = true;
    setTimeout(() => { d.el._suppressed = false; }, 350);
  }
  if (d.moved) springBack(d.el); else animating = false;
});
if (deck) deck.addEventListener('dragstart', e => e.preventDefault());   // 原生拖图/选字是抽卡杀手，双保险
function springBack(el){
  animating = true;
  const done = () => { el.style.transform = topBase(el); layout(); animating = false; };  // layout 顺带归位被带动的底牌
  const a = el.animate(
    [{ transform: el.style.transform || 'none' }, { transform: topBase(el) || 'none' }],
    { duration: 480, easing: SPRING }
  );
  a.onfinish = done;
  a.oncancel = () => { el.style.transform = topBase(el); layout(); animating = false; };
  setTimeout(() => { if (animating) done(); }, 700);   // 自愈：动画异常时强制归位
}
function cycleAway(el, dir, dx, dy){
  animating = true;
  let committed = false;
  const commit = () => {
    if (committed) return; committed = true;     // 兜底：双路触发只收一次
    vt(() => {
      const id = el.dataset.id;
      const p = packs.get(currentPack);
      const i = p.deck.findIndex(x => x.id === id);
      if (i >= 0){ const [a] = p.deck.splice(i, 1); p.deck.unshift(a); }  // 翻过的牌沉到牌底，转一圈回来
      el.style.transform = '';
      deck.appendChild(el);                                            // 元素不销毁：morph 回牌底
      layout(); renderHUD(); animating = false;
    });
  };
  const a2 = el.animate(
    [{ transform: el.style.transform || 'none', opacity: 1 },
     { transform: `translate(${dx * 5 + dir * innerWidth * 0.7}px, ${dy * 3 - innerHeight * 0.12}px) rotate(${dir * 20}deg) scale(.94)`, opacity: .95 }],
    { duration: 430, easing: 'cubic-bezier(.3,.6,.35,1)' }
  );
  a2.onfinish = commit;
  a2.oncancel = commit;
  setTimeout(commit, 700);                         // 自愈：VT/动画异常时 700ms 强制收牌
}

/* ---------- 轻点 / 回车 → 拆卡阅读；点侧边卡 → 抽到最前 ---------- */
if (deck) deck.addEventListener('click', e => {
  const el = e.target.closest('.card');
  if (!el || el._suppressed) return;
  if (!fanMode && !el.classList.contains('is-top')){ raiseCard(el); return; }   // 直接选后面的卡
  onCardActivate(el, fanMode ? 'catalog' : 'deck-top');
});
/* 点侧边卡：整卡从堆里抽到最前（举起-平移-放下的三段弧线，让人看清换了一张） */
function raiseCard(el){
  if (animating || !currentPack) return;
  const id = el.dataset.id;
  const p = packs.get(currentPack);
  const i = p.deck.findIndex(x => x.id === id);
  if (i < 0 || i === p.deck.length - 1) return;
  const from = getComputedStyle(el).transform;
  const [a] = p.deck.splice(i, 1);
  p.deck.push(a);
  deck.appendChild(el);
  layout();
  el.style.zIndex = 500;                       // 旅行途中压过全场，绝不从邻卡底下钻
  const to = getComputedStyle(el).transform;
  if (!reduce && from !== to){
    el.animate([
      { transform: from, translate: '0 0' },
      { transform: to, translate: '0 -34px', offset: 0.55, easing: 'cubic-bezier(.2,.7,.3,1)' },
      { transform: to, translate: '0 0' }
    ], { duration: 680, easing: 'ease-out' }).onfinish = () => { el.style.zIndex = ''; layout(); };
  } else {
    el.style.zIndex = '';
  }
}
/* 悬停展牌：整叠牌右侧微微扇开，露出后几张的边 */
if (deck) deck.addEventListener('pointerenter', () => {
  if (view === 'deck' && !fanMode && !drag && !deck.classList.contains('spread')){
    deck.classList.add('spread');
    layout();
  }
});
if (deck) deck.addEventListener('pointerleave', () => {
  if (deck.classList.contains('spread')){
    deck.classList.remove('spread');
    layout();
  }
});
if (catalogEl) catalogEl.addEventListener('click', e => {
  const el = e.target.closest('.card');
  if (!el || el._suppressed) return;
  onCardActivate(el, 'catalog');
});
function onCardActivate(el, src){
  if (animating || view === 'reader') return;
  const a = DATA.find(x => x.id === el.dataset.id);
  if (a) openReader(a, src || 'other');   // src='catalog'：读完回到浮层
}

/* ---------- 阅读页 ---------- */
function openReader(a, src = 'other'){
  if (view === 'reader') return;
  const prevView = src === 'catalog' ? 'catalog' : view;   // 浮层里点卡：来路记目录
  view = 'reader';
  pushOv('reader');
  const hero = $('readerHero'), cover = $('readerCover');
  hero.style.viewTransitionName = cardName(a.id);
  cover.src = a.cover;
  $('readerTitle').textContent = a.title;
  $('readerCat').textContent = a.category;
  $('readerMeta').textContent = `${a.date} · ${a.readTime}`;
  $('readerTags').innerHTML = (a.tags || []).map(t => `<span>${t}</span>`).join('');
  $('readerMore').href = './?post=' + encodeURIComponent(a.id);   // 博客 ?post= 深链：札签读完可回正席
  renderBody(a.content || '', $('readerBody'));
  reader.dataset.id = a.id;
  reader.dataset.src = src;
  reader.dataset.return = prevView;
  lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  // 返回按钮跟着来路变文案，落点一目了然
  $('closeBtn').textContent = prevView === 'deck' ? '← 收回牌堆'
    : prevView === 'catalog' ? '← 返回目录'
    : '← 返回卡包架';
  const go = () => {
    giveName(a.id, hero);                       // 名字统一移交：书脊/卡/小卡都让位
    stage.style.visibility = 'hidden';
    reader.hidden = false; reader.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    $('closeBtn').focus({ preventScroll: true });  // 焦点进阅读页，Esc/Tab 语义连续
  };
  vt(go);
}
function closeReaderNow(){
  if (view !== 'reader') return;
  const ret = reader.dataset.return || 'deck';
  const id = reader.dataset.id;
  const a = DATA.find(x => x.id === id);
  view = ret === 'catalog' ? (catalogReturn || 'packs') : ret;   // 目录来路：落回浮层底下的视图，浮层保持开着
  const go = () => {
    reader.hidden = true;
    stage.style.visibility = '';
    if (opts.standalone) document.body.style.overflow = '';
    settleAfterRead(a);          // 标记已翻 + 顶卡回收进牌底 + 名字归小书脊
    if (currentPack === a.category) renderHUD();
    updatePackBadges();
    lastFocus?.focus?.({ preventScroll: true });   // 焦点还回去
  };
  vt(go);
}
function settleAfterRead(a){
  const id = a.id;
  const p = packs.get(a.category);
  p.readEver.add(id);
  const el = cardEls.get(id);
  if (el && catalogEl.contains(el)){
    el.classList.add('is-read');                // 目录平摊里：原地打已翻标
    borrowed.add(id);
  } else if (el && deck.contains(el)){
    el.classList.add('is-read');
    if (reader.dataset.src === 'deck-top'){     // 从牌堆顶读的：回收进牌底，转一圈还会回来
      const i = p.deck.findIndex(x => x.id === id);
      if (i >= 0){ const [x] = p.deck.splice(i, 1); p.deck.unshift(x); }
      deck.appendChild(el);
      el.style.transform = '';
      layout();
    }
  }
  // 目录平摊里的分组小计数同步刷新
  {
    const sec = cardEls.get(id)?.closest('.cat-group');
    const sm = sec?.querySelector('h3 small');
    if (sm) sm.textContent = `${articlesOf(a.category).length} 札 · 已启 ${p.readEver.size}`;
  }
  let chip = chipEls.get(id);
  if (!chip){
    chip = document.createElement('button');
    chip.className = 'pile-book';
    chip.style.setProperty('--pc', colorOf(a.category));
    chip.title = `${a.category} · ${a.title}`;
    chip.setAttribute('aria-label', '重读：' + a.title);
    chip.innerHTML = `<span class="t">${a.title}</span>`;   // 带书名的小书脊：读过的随时找得回
    chip.addEventListener('click', () => { if (view !== 'reader') openReader(a, 'tray'); });
    $('pileRow').appendChild(chip);
    chipEls.set(id, chip);
    const head = pile.querySelector('.pile-head');
    if (head) head.textContent = `已入册 ${chipEls.size}`;
  }
  giveName(id, chip);                           // hero morph 回小书脊
}
if (reader) $('closeBtn').addEventListener('click', closeReader);

/* ---------- 摊开本卷 ---------- */
function toggleFan(){
  if (view !== 'deck' || animating || !packs.get(currentPack).deck.length) return;
  vt(() => {
    fanMode = !fanMode;
    deck.classList.toggle('fan', fanMode);
    deckTilt.classList.toggle('wide', fanMode);
    deck.classList.toggle('idle-wobble', !fanMode);
    if (fanMode) packs.get(currentPack).deck.forEach(a => { const el = cardEls.get(a.id); if (el){ el.style.transform = ''; el.style.opacity = 1; el.style.pointerEvents = 'auto'; } });
    else layout();
    $('fanBtn').textContent = fanMode ? '收回牌堆' : '摊开本卷';
    if (fanMode) hint.textContent = '点任意一张拆签阅读 · Esc 收回';   // 收回时提示由 layout() 按顶卡状态接管
  });
}

/* ---------- 总目录 ---------- */
function openCatalog(from){
  if (view === 'reader' || !catalogOv.hidden) return;
  catalogReturn = from;
  buildCatalog();
  catPanelMeta.textContent = `全库 ${DATA.length} 札 · 已启 ${[...packs.values()].reduce((n, p) => n + p.readEver.size, 0)}`;
  scopeEl.classList.add('cat-open');
  pushOv('catalog');
  catalogOv.hidden = false;
  setTimeout(() => catalogOv.classList.add('open'), 30);   // timer 比 rAF 可靠（后台页签 rAF 冻结）
  $('catCloseBtn').focus({ preventScroll: true });
}
function buildCatalog(){
  catalogEl.innerHTML = '';
  borrowed.clear();
  // 平摊：每个分类一组网格
  for (const cat of cats){
    const arts = articlesOf(cat);
    const p = packs.get(cat);
    const ordered = arts.slice().reverse();     // 展示顺序与抽卡顺序一致：最新在前
    const sec = document.createElement('section');
    sec.className = 'cat-group';
    sec.style.setProperty('--pc', colorOf(cat));
    sec.innerHTML = `<h3><span class="dot"></span>${cat}<small>${arts.length} 札 · 已启 ${p.readEver.size}</small></h3>`;
    const grid = document.createElement('div');
    grid.className = 'cat-grid';
    for (const a of ordered){
      const isRead = p.readEver.has(a.id);
      const inThisDeck = currentPack === cat && cardEls.has(a.id);
      const el = ensureCard(a);
      if (inThisDeck){
        el.classList.remove('is-top');          // 同一元素从牌堆搬进目录 → 逐卡 morph
        el.style.zIndex = ''; el.style.transform = ''; el.style.opacity = 1; el.style.pointerEvents = 'auto';
      } else if (isRead){
        borrowed.add(a.id);                     // 其他包已读的：临时借一张卡展示
      }
      el.classList.toggle('is-read', isRead);
      giveName(a.id, el);
      grid.appendChild(el);
    }
    sec.appendChild(grid);
    catalogEl.appendChild(sec);
  }
}
function closeCatalogNow(){
  if (!catalogOv || catalogOv.hidden) return;
  // 目录展示元素回收：借来的卡
  for (const id of borrowed){
    cardEls.get(id)?.remove();
    cardEls.delete(id);
  }
  borrowed.clear();
  catalogEl.innerHTML = '';
  catalogOv.hidden = true;
  catalogOv.classList.remove('open');
  scopeEl.classList.remove('cat-open');
  if (catalogReturn === 'deck' && currentPack && view === 'deck'){
    deck.style.viewTransitionName = packName(currentPack);
    // 还在牌堆里的卡搬回牌堆容器，morph 锚点跟着回去
    packs.get(currentPack).deck.forEach(a => {
      const el = cardEls.get(a.id);
      if (el){ deck.appendChild(el); giveName(a.id, el); }
    });
    // 其余已读文章：名字归已读小卡
    for (const a of DATA){
      if (chipEls.has(a.id) && !packs.get(currentPack).deck.includes(a)) giveName(a.id, chipEls.get(a.id));
    }
    renderHUD(); layout();
  } else if (view === 'packs'){
    // 回卷宗架：卡元素全部销毁，名字归已读小卡，下次开包按需重建
    deck.innerHTML = '';
    cardEls.clear();
    for (const a of DATA){ if (chipEls.has(a.id)) giveName(a.id, chipEls.get(a.id)); }
    hint.textContent = '点一卷拆封 · 每卷是一个分类';
  }
}
function closeCatalog(){
  if (histDepth > 0){ history.back(); return; } // 后退由 popstate 做实际关闭
  closeCatalogNow();                           // 收层即收，不退场（blur 层渐出必卡）
}
if (catalogOv) $('catBackdrop').addEventListener('click', closeCatalog);
if (catalogOv) $('catShade').addEventListener('click', closeCatalog);
if (catalogOv) $('catCloseBtn').addEventListener('click', closeCatalog);

/* ---------- 历史：浏览器后退 = 关浮层 ----------
   reader/抽屉打开时各压一条 history：Back 手势、Esc、✕ 按钮三路一致，
   不会一按后退就整页退回博客。 */
let histDepth = 0;
function pushOv(kind){
  history.pushState({ cardsOv: kind }, '');
  histDepth++;
}
const onPop = () => {
  if (histDepth > 0) histDepth--;
  if (reader && !reader.hidden) closeReaderNow();
  else if (catalogOv && !catalogOv.hidden) closeCatalogNow();
};
function closeReader(){
  if (view !== 'reader') return;
  if (histDepth > 0){ history.back(); return; }   // 后退由 popstate 做实际关闭
  closeReaderNow();
}

/* ---------- 键位 / 视差 ---------- */
const onKey = e => {
  if (e.key === 'Escape'){
    if (view === 'reader') closeReader();
    else if (catalogOv && !catalogOv.hidden) closeCatalog();
    else if (view === 'deck' && fanMode) toggleFan();
    else if (view === 'deck') showPacks();
    else if (!opts.standalone && opts.onExit) opts.onExit();
  }
};
const onMove = e => {
  if (view !== 'deck' || fanMode || scopeEl.classList.contains('cat-open')) return;
  const rx = (e.clientY / innerHeight - 0.5) * -4, ry = (e.clientX / innerWidth - 0.5) * 5;
  deckTilt.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
};

/* ---------- 主题：与博客同键（sj.theme） ---------- */
const themeBtn = opts.standalone ? (opts.themeBtn || null) : null;
function applyTheme(dark){
  document.documentElement.classList.toggle('dark', dark);
  if (themeBtn) themeBtn.textContent = dark ? '☀' : '☾';
}
if (themeBtn) try {
  applyTheme(document.documentElement.classList.contains('dark'));
  themeBtn.addEventListener('click', () => {
    const dark = !document.documentElement.classList.contains('dark');
    applyTheme(dark);
    try { localStorage.setItem('sj.theme', dark ? 'dark' : 'light'); } catch (e) {}
  });
} catch (e) {}

/* ---------- 正文渲染：博客同款管线（ensureMarkdown 按需拉 marked+purify），miniMd 兜底 ---------- */
function renderBody(src, el){
  const paint = html => { el.innerHTML = html; ensureBodyHl(el); };
  if (window.ensureMarkdown){
    window.ensureMarkdown().then(ok => {
      if (ok && window.marked && window.DOMPurify){
        paint(window.DOMPurify.sanitize(window.marked.parse(src || '')));
      } else paint(miniMd(src || ''));
    });
  } else paint(miniMd(src || ''));
}
function ensureBodyHl(root){                    // 对齐博客 ensureHighlight：有代码块才拉
  const run = scope => scope.querySelectorAll('pre code').forEach(el => window.hljs?.highlightElement(el));
  if (window.hljs){ run(root); return; }
  if (!root.querySelector('pre code')) return;
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = 'assets/vendor/github-dark.min.css';
  document.head.appendChild(css);
  const js = document.createElement('script');
  js.src = 'assets/vendor/highlight.min.js';
  js.onload = () => run(root);
  document.head.appendChild(js);
}

/* ---------- 迷你 Markdown 渲染（兜底用） ---------- */
function esc(s){ return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function inline(s){
  return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
}
function miniMd(src){
  const lines = esc(src).split('\n');
  let html = '', ul = false, ol = false;
  const closeLists = () => { if (ul){ html += '</ul>'; ul = false; } if (ol){ html += '</ol>'; ol = false; } };
  for (const raw of lines){
    const t = raw.trim();
    if (!t){ closeLists(); continue; }
    if (/^###\s/.test(t)){ closeLists(); html += `<h3>${inline(t.slice(4))}</h3>`; }
    else if (/^##\s/.test(t)){ closeLists(); html += `<h3>${inline(t.slice(3))}</h3>`; }
    else if (/^[-*]\s/.test(t)){ if (!ul){ closeLists(); html += '<ul>'; ul = true; } html += `<li>${inline(t.slice(2))}</li>`; }
    else if (/^\d+\.\s/.test(t)){ if (!ol){ closeLists(); html += '<ol>'; ol = true; } html += `<li>${inline(t.replace(/^\d+\.\s/, ''))}</li>`; }
    else { closeLists(); html += `<p>${inline(t)}</p>`; }
  }
  closeLists();
  return html;
}

/* ---------- VT 助手 ----------
   startViewTransition 的回调在页签半隐藏/切窗口时可能被无限推迟，
   一旦冻结，开包/抽卡提交/视图切换全部卡死。兜底：240ms 内回调没跑就直接执行。 */
function vt(fn){
  if (!document.startViewTransition || reduce){ fn(); return; }
  let ran = false;
  const run = () => { if (ran) return; ran = true; fn(); };
  try {
    const t = document.startViewTransition(run);
    t.finished.catch(() => run());
  } catch (_) { run(); }
  setTimeout(run, 240);
}

build();
if (opts.mode === 'full'){
  addEventListener('popstate', onPop);
  addEventListener('keydown', onKey);
  addEventListener('pointermove', onMove);
}
if (opts.mode === 'full' && opts.startPack) setTimeout(() => { openPack(opts.startPack); }, 60);
function destroy(){
  removeEventListener('popstate', onPop);
  removeEventListener('keydown', onKey);
  removeEventListener('pointermove', onMove);
  document.body.style.overflow = '';
  scopeEl.classList.remove('cat-open');
  delete root.dataset.cardsMounted;
}
return { destroy: destroy, openPack: openPack };
}

function mount(root, opts){
  opts = Object.assign({ mode: 'full', standalone: false }, opts || {});
  if (!root || root.dataset.cardsMounted === '1') return null;
  root.dataset.cardsMounted = '1';
  root.innerHTML = opts.mode === 'shelf' ? SK_SHELF : SK_FULL;
  if (opts.mode === 'full' && !opts.standalone){
    const more = root.querySelector('#readerMore');
    if (more) more.setAttribute('hidden', '');   // 嵌入模式已在博客内，深链按钮藏掉，防文章弹窗叠 portal 抢 body 锁
  }
  const inst = createInstance(root, opts);
  return inst ? { destroy: inst.destroy, root: root } : null;
}
return { mount: mount };
})();
