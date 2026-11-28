/* 札签典藏补充包与双面 3D 翻牌陈列核心模块
   cards.html（独立页）与首页 #blog 内嵌典藏舞台共用本文件。
   mount(rootEl, opts):
     opts.mode          'full'   全屏体验（补充包架 → 撕封仪式 → 3D 典藏列阵 → 阅读 + 总目抽屉 + 已入册托盘）
                        'inline' 首页 #blog 原地体验（补充包架 → 撕封仪式 → 3D 典藏列阵 → 调 opts.onOpenArticle）
                        'shelf'  仅补充包架（点卡包走 opts.requestOpen(cat)）
     opts.standalone    true=独立页（接管主题钮、完整 history 语义）；false=嵌入宿主
     opts.startPack     full 模式挂载后自动拆这一包
     opts.startArticle  full 模式挂载后直接打开指定文章
     opts.onExit        full+嵌入：Esc 退到补充包架档位时回调
     opts.requestOpen   shelf 模式：点补充包回调
     opts.onOpenArticle inline 模式：点已翻开卡片阅读时的宿主弹窗回调
     opts.themeBtn      standalone 模式的主题钮元素
     opts.filter        文章过滤函数
   返回 { destroy, openPack, showPacks, refreshBadges, unrevealPack, flipAll, root } */
window.CardsCore = (function(){
'use strict';

const SK_FULL = "<div class=\"aurora\" aria-hidden=\"true\"><i></i><i></i><i></i></div>\n\n<header class=\"hud\" id=\"hud\"></header>\n\n<div class=\"stage\" id=\"stage\">\n  <!-- 补充包架 -->\n  <section id=\"packsView\">\n    <div class=\"packs\" id=\"packs\" role=\"list\" aria-label=\"札签补充包架\"></div>\n  </section>\n  <!-- 典藏陈列舞台 -->\n  <section id=\"deckView\" hidden>\n    <div class=\"deck-wrap\">\n      <div class=\"deck-tilt\" id=\"deckTilt\">\n        <div class=\"deck\" id=\"deck\" role=\"list\" aria-label=\"文章典藏列阵\"></div>\n      </div>\n      <div class=\"deck-pos\" id=\"deckPos\" hidden></div>\n    </div>\n  </section>\n  <p class=\"hint\" id=\"hint\"></p>\n</div>\n\n  <!-- 总目浮层 -->\n  <div id=\"catalogOv\" class=\"cat-ov\" hidden>\n    <div class=\"cat-backdrop\" id=\"catBackdrop\"></div>\n    <div class=\"cat-shade\" id=\"catShade\"></div>\n    <div class=\"cat-panel\" role=\"dialog\" aria-modal=\"true\" aria-label=\"总目\">\n      <div class=\"cat-panel-head\">\n        <h2>总目<small id=\"catPanelMeta\"></small></h2>\n        <button class=\"btn\" id=\"catCloseBtn\" type=\"button\" aria-label=\"关闭总目\">✕ 收回</button>\n      </div>\n      <div class=\"catalog\" id=\"catalog\"></div>\n    </div>\n  </div>\n\n<aside class=\"pile\" id=\"pile\" aria-label=\"已读文章\"></aside>\n\n<article class=\"reader\" id=\"reader\" hidden aria-modal=\"true\">\n  <div class=\"reader-bar\">\n    <button class=\"btn\" id=\"closeBtn\" type=\"button\">← 返回本卷</button>\n    <span id=\"readerCat\"></span>\n  </div>\n  <div class=\"reader-main\">\n    <div class=\"reader-hero\" id=\"readerHero\"><img id=\"readerCover\" alt=\"\"></div>\n    <h1 id=\"readerTitle\" class=\"serif\"></h1>\n    <div class=\"meta\" id=\"readerMeta\"></div>\n    <div class=\"tags\" id=\"readerTags\"></div>\n    <a class=\"reader-more\" id=\"readerMore\" href=\"./\" rel=\"noopener\">在博客中阅读 →</a>\n    <div class=\"reader-body\" id=\"readerBody\"></div>\n    <nav class=\"reader-nav\" id=\"readerNav\" hidden></nav>\n  </div>\n</article>";

const SK_SHELF = "<div class=\"stage\" id=\"stage\">\n  <section id=\"packsView\">\n    <div class=\"packs\" id=\"packs\" role=\"list\" aria-label=\"札签补充包架\"></div>\n  </section>\n  <p class=\"hint\" id=\"hint\"></p>\n</div>";

const SK_INLINE = "<header class=\"hud\" id=\"hud\" hidden></header>\n<div class=\"stage\" id=\"stage\">\n  <section id=\"packsView\">\n    <div class=\"packs\" id=\"packs\" role=\"list\" aria-label=\"札签补充包架\"></div>\n  </section>\n  <section id=\"deckView\" hidden>\n    <div class=\"deck-wrap\">\n      <div class=\"deck-tilt\" id=\"deckTilt\">\n        <div class=\"deck\" id=\"deck\" role=\"list\" aria-label=\"文章典藏列阵\"></div>\n      </div>\n      <div class=\"deck-pos\" id=\"deckPos\" hidden></div>\n    </div>\n  </section>\n  <p class=\"hint\" id=\"hint\"></p>\n</div>";

function createInstance(root, opts){
const DATA = ((opts.filter ? (window.ARTICLES_DATA || []).filter(opts.filter) : window.ARTICLES_DATA) || []).slice();
if (!DATA.length) {
  const h0 = root.querySelector('#hint');
  if (h0) h0.textContent = '未找到文章数据 js/articles.js';
  return null;
}

// 恒 false 是定案：本机 prefers-reduced-motion:reduce 误报，接 matchMedia 等于自断全部交互动效
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
let packs = new Map();          // category -> { deck:Article[], readEver:Set }
let revealedIds = new Set();    // 已翻开揭晓过牌面的文章 ID（sj.cardsRevealed）
let cardEls = new Map();        // id -> 典藏舞台 / 总目抽屉里的卡元素
let chipEls = new Map();        // id -> 已入册小书脊
let borrowed = new Set();       // 总目抽屉里为非当前包临时借建的卡（关抽屉时回收）
let view = 'packs';             // packs | deck | catalog | reader
let currentPack = null;
let catalogReturn = 'packs';
let animating = false;
let lastFocus = null;           // 阅读页关闭后归还焦点用
let packBusy = false;           // 撕封仪式进行中
let packCascading = false;      // 全部翻开 / 重新覆牌波浪动画进行中

const catHash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
// 厚重特种卡纸单次微过冲弹簧（~0.80 阻尼，5.6% 过冲，沉稳不晃）
const SPRING_SETTLE = 'linear(0, 0.009, 0.035 2.1%, 0.141 4.8%, 0.723 15.6%, 0.938 21.6%, 1.017 25.8%, 1.053 29.8%, 1.056 34.4%, 1.036 41.2%, 1.006 51.8%, 0.996 64.2%, 1)';
const packName = cat => 'pack-' + catHash(cat).toString(36);
const hueOf = cat => catHash(cat) % 360;
const PALETTE = {
  '系统调优': '#a34e28', '架构设计': '#46608a', '本地 AI': '#3f7048', 'AIGC': '#7d5590',
  '刷机': '#2e6e60', '随笔': '#a8842c', '游戏创作': '#8f3d3a', '前端工程': '#33589b',
  'AI 学习': '#6446a0'
};
const colorOf = cat => PALETTE[cat] || `hsl(${hueOf(cat)} 40% 46%)`;
const cardName = id => 'card-' + id;

function giveName(id, el){
  [cardEls.get(id), chipEls.get(id), $('readerHero')].forEach(h => {
    if (h && h !== el) h.style.setProperty('view-transition-name', 'none');
  });
  if (el) el.style.viewTransitionName = cardName(id);
}

const articlesOf = cat => DATA.filter(a => a.category === cat);
const cats = [...new Set(DATA.map(a => a.category))];

/* ---------- 卷内陈列排序（系列卷按章节一→七正序，常规卷按日期倒序最新居首） ---------- */
const CN_NUM = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
function parseCnNum(s){
  if (!s) return Infinity;
  if (s.length === 1 && CN_NUM[s]) return CN_NUM[s];
  if (s.length === 2 && s[0] === '十' && CN_NUM[s[1]]) return 10 + CN_NUM[s[1]];
  if (s.length === 2 && CN_NUM[s[0]] && s[1] === '十') return CN_NUM[s[0]] * 10;
  if (s.length === 3 && CN_NUM[s[0]] && s[1] === '十' && CN_NUM[s[2]]) return CN_NUM[s[0]] * 10 + CN_NUM[s[2]];
  return Infinity;
}
function parseSeriesIndex(title){
  if (!title) return Infinity;
  const t = String(title).trim();
  const mLead = t.match(/^([一二三四五六七八九十]+)[、.·\s]/);
  if (mLead) return parseCnNum(mLead[1]);
  const mParen = t.match(/[（(]([一二三四五六七八九十]+)[）)]/);
  if (mParen) return parseCnNum(mParen[1]);
  const mNum = t.match(/^(\d+)[、.·\s]/);
  if (mNum) return parseInt(mNum[1], 10);
  return Infinity;
}
function orderedArticlesOf(cat){
  const arts = articlesOf(cat);
  const isSeries = arts.some(a => a.section === 'ai' || Number.isFinite(parseSeriesIndex(a.title)));
  if (isSeries){
    return arts.slice().sort((a, b) => {
      const oa = parseSeriesIndex(a.title), ob = parseSeriesIndex(b.title);
      if (oa !== ob) return oa - ob;
      return (a.date || '').localeCompare(b.date || '');
    });
  }
  return arts.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (DATA.indexOf(b) - DATA.indexOf(a)));
}

/* ---------- 品质分级（真实长文深度稿或首页代表作 = foil 深研闪签） ---------- */
const FOIL_IDS = new Set(['filebutler-local-rag', 'local-llm-8gb-vram']);
function isFoilArticle(a){
  if (!a) return false;
  if (FOIL_IDS.has(a.id)) return true;
  const mins = parseInt(String(a.readTime || ''), 10);
  return Number.isFinite(mins) && mins >= 9;
}

/* ---------- 零本地进度追踪（仅会话内存记录当前翻牌态，主动清理旧历史键） ---------- */
try {
  localStorage.removeItem('sj.cardsRead');
  localStorage.removeItem('sj.cardsRevealed');
} catch (e) {}

function saveRevealedId(id){
  if (id) revealedIds.add(id);
}
function removeRevealedIds(ids){
  for (const id of ids) revealedIds.delete(id);
}
function isRevealed(id){
  return revealedIds.has(id);
}

/* 分类英文微标映射 */
const CAT_META = {
  '系统调优': { en: 'SYSTEM TUNING' },
  '架构设计': { en: 'SYSTEM ARCHITECTURE' },
  '本地 AI': { en: 'LOCAL LLM & EDGE AI' },
  'AIGC': { en: 'GENERATIVE CREATIVE' },
  '刷机': { en: 'FIRMWARE & FLASHING' },
  '随笔': { en: 'ESSAYS & OBSERVATION' },
  '游戏创作': { en: 'GAME DEV & MECHANICS' },
  '前端工程': { en: 'WEB CRAFT & ENGINE' },
  'AI 学习': { en: 'AI MODELS & LEARNING' }
};

function esc(s){
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function packStats(cat){
  const p = packs.get(cat);
  if (!p) return { total: 0, revealed: 0, unrevealed: 0 };
  const total = p.deck.length;
  const revealed = p.deck.filter(a => isRevealed(a.id)).length;
  return { total, revealed, unrevealed: total - revealed };
}

/* ---------- 构建补充包架 ---------- */
function build(){
  packs = new Map(); cardEls.clear(); chipEls.clear(); borrowed.clear();
  packsEl.replaceChildren();
  if (deck) { deck.replaceChildren(); delete deck.dataset.count; }
  if (catalogEl) catalogEl.replaceChildren();
  if (pile) { pile.replaceChildren(); pile.hidden = true; }
  currentPack = null; animating = false; packBusy = false; packCascading = false;
  if (deckTilt) deckTilt.style.transform = '';

  revealedIds = new Set();

  for (const cat of cats){
    const ordered = orderedArticlesOf(cat);
    packs.set(cat, { deck: ordered });
    const catIdx = String(cats.indexOf(cat) + 1).padStart(2, '0');
    const meta = CAT_META[cat] || { en: 'ARCHIVE ESSAY' };

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pack';
    btn.dataset.cat = cat;
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-label', `札签补充包：${cat}，共 ${ordered.length} 札`);
    btn.style.viewTransitionName = packName(cat);
    btn.style.setProperty('--pc', colorOf(cat));
    btn.innerHTML = `
      <i class="pack-shadow"></i>
      <div class="pk-pocket" aria-hidden="true">
        <i class="pk-sheet s1"></i><i class="pk-sheet s2"></i><i class="pk-sheet s3"></i>
      </div>
      <div class="pk-crimp-top" aria-hidden="true">
        <span class="pk-notch pk-notch-l"></span>
        <span class="pk-notch pk-notch-r"></span>
        <span class="seal">SEAL · 拆封</span>
      </div>
      <span class="pk-seam-glow" aria-hidden="true"></span>
      <div class="pk-sleeve">
        <span class="pk-halo"></span>
        <i class="pk-sheen"></i>
        <div class="pk-body">
          <div class="pk-topbar">
            <div class="pk-meta-group">
              <span class="pk-vol">VOL. ${catIdx}</span>
              <span class="pk-tag">${meta.en}</span>
            </div>
          </div>
          <div class="pk-center">
            <span class="pk-emblem" aria-hidden="true"></span>
            <h2 class="pk-name serif">${esc(cat)}</h2>
            <span class="pk-divider"></span>
            <span class="pk-count">PACK · ${String(ordered.length).padStart(2, '0')} 札</span>
          </div>
          <div class="pk-foot">
            <span class="pk-pull-hint">撕封 →</span>
          </div>
        </div>
        <span class="pk-crimp-bottom" aria-hidden="true"></span>
      </div>`;

    const triggerOpen = () => {
      if (opts.mode === 'shelf'){
        if (opts.requestOpen) opts.requestOpen(cat);
      } else {
        openPack(cat);
      }
    };

    // 支持点击卡包 + 横向划过封口/上半部（dx > 36px）双触发撕封
    let ripSwipe = null;
    btn.addEventListener('pointerdown', e => {
      if (packBusy) return;
      const br = btn.getBoundingClientRect();
      if (!br.height || (e.clientY - br.top) > br.height * 0.56) return;
      ripSwipe = { id: e.pointerId, x0: e.clientX, y0: e.clientY, fired: false };
    });
    btn.addEventListener('pointermove', e => {
      if (!ripSwipe || ripSwipe.id !== e.pointerId || ripSwipe.fired || packBusy) return;
      const dx = Math.abs(e.clientX - ripSwipe.x0);
      const dy = Math.abs(e.clientY - ripSwipe.y0);
      if (dy > 24 && dy > dx) { ripSwipe = null; return; }
      if (dx > 36 && dx > dy * 1.15){
        ripSwipe.fired = true;
        btn._ripTriggered = true;
        setTimeout(() => { btn._ripTriggered = false; }, 450);
        triggerOpen();
      }
    });
    const clearRipSwipe = () => { ripSwipe = null; };
    btn.addEventListener('pointerup', clearRipSwipe);
    btn.addEventListener('pointercancel', clearRipSwipe);
    btn.addEventListener('pointerleave', clearRipSwipe);

    btn.addEventListener('click', () => {
      if (btn._ripTriggered) return;
      triggerOpen();
    });

    packsEl.appendChild(btn);
  }

  if (pile) pile.hidden = true;

  [...packsEl.children].forEach((p, i) => {
    p.animate(
      [
        { opacity: 0, transform: 'translate3d(0, 18px, 0) scale(0.95)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
      ],
      { duration: 460, delay: i * 36, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }
    );
  });
  showPacks(false);
}

function showPacks(animate = true){
  view = 'packs';
  currentPack = null;
  packCascading = false;
  const go = () => {
    if (deckView) deckView.hidden = true;
    closeCatalogNow();
    packsView.hidden = false;
    renderHUD();
    updatePackBadges();
    if (hint) hint.textContent = '点选补充包或横向划过封口拆封 · 每包收录一类手记';
    if (animate && !reduce && opts.mode === 'inline'){
      [...packsEl.children].forEach((p, i) => {
        p.animate(
          [
            { opacity: 0, transform: 'translate3d(0, 14px, 0) scale(0.96)' },
            { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
          ],
          { duration: 400, delay: i * 28, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }
        );
      });
    }
  };
  animate && !reduce ? vt(go) : go();
}

function updateCounterOnly(){}

function renderHUD(){
  if (!hud) return;
  if (opts.mode === 'inline'){
    if (view !== 'deck' || !currentPack){
      hud.hidden = true;
      hud.replaceChildren();
      return;
    }
    hud.hidden = false;
    const st = packStats(currentPack);
    hud.innerHTML = `<h3 class="hud-title"><button class="btn" id="backBtn" type="button">← 返回卡包架</button><span class="sub serif">${esc(currentPack)}</span></h3>
      <div class="hud-actions">
        ${st.unrevealed > 0
          ? '<button class="btn btn-reveal-all" id="flipAllBtn" type="button">✦ 全部翻开</button>'
          : '<button class="btn" id="reflipBtn" type="button">↺ 重新覆牌</button>'}
      </div>`;
    $('backBtn')?.addEventListener('click', () => showPacks());
    $('flipAllBtn')?.addEventListener('click', flipAllInPack);
    $('reflipBtn')?.addEventListener('click', () => { if (currentPack) unrevealPack(currentPack); });
    return;
  }

  const total = DATA.length;
  if (view === 'packs'){
    hud.innerHTML = `<div class="brand">
        ${serif('<h1>楠屿札记 <em>·</em> 札签</h1>')}
        <p class="hud-sub">// 收录 ${total} 札 · 分 ${cats.length} 卷 · 撕封翻签即读</p>
      </div>
      <div class="hud-actions">
        <button class="btn" id="catalogBtn" type="button">总目录</button>
      </div>`;
    $('catalogBtn')?.addEventListener('click', () => openCatalog('packs'));
  } else if (view === 'deck' && currentPack){
    const st = packStats(currentPack);
    hud.innerHTML = `<h1><button class="btn" id="backBtn" type="button">← 卷宗架</button><span class="sub serif">${esc(currentPack)}</span></h1>
      <div class="hud-actions">
        ${st.unrevealed > 0
          ? '<button class="btn btn-reveal-all" id="flipAllBtn" type="button">✦ 全部翻开</button>'
          : '<button class="btn" id="reflipBtn" type="button">↺ 重新覆牌</button>'}
        <button class="btn" id="catalogBtn2" type="button">总目录</button>
      </div>`;
    $('backBtn')?.addEventListener('click', () => showPacks());
    $('flipAllBtn')?.addEventListener('click', flipAllInPack);
    $('reflipBtn')?.addEventListener('click', () => { if (currentPack) unrevealPack(currentPack); });
    $('catalogBtn2')?.addEventListener('click', () => openCatalog('deck'));
  }
}

function updatePackBadges(){}

function updateDeckHint(){
  if (!hint || view !== 'deck' || !currentPack) return;
  const st = packStats(currentPack);
  hint.textContent = st.unrevealed > 0
    ? '点卡背翻开揭晓 · 亦可点右上「全部翻开」'
    : '移动指针检视卡面微光 · 点击任意卡片展卷阅读';
}

/* ---------- 补充包 → 4 拍物理撕封仪式 → 典藏舞台列阵 ---------- */
function openPack(cat, openOpts){
  if (packBusy || !packs.has(cat)) return;
  if (view !== 'packs' && !(openOpts && openOpts.direct)){
    if (currentPack === cat) return;
  }
  currentPack = cat;
  try {
    const pInfo = packs.get(cat);
    window.dispatchEvent(new CustomEvent('sj:pack-open', {
      detail: { category: cat, count: pInfo ? pInfo.deck.length : 0 }
    }));
  } catch (_) {}

  const go = (origin) => {
    view = 'deck';
    packCascading = false;
    packsView.hidden = true;
    closeCatalogNow();
    deckView.hidden = false;
    if (deck) deck.style.viewTransitionName = packName(cat);
    if (deckTilt) deckTilt.style.transform = '';
    renderHUD();
    buildDeck(cat, origin);
    if (opts.mode === 'inline'){
      requestAnimationFrame(() => {
        const rect = scopeEl.getBoundingClientRect();
        if (rect.top < 64 || rect.top > window.innerHeight * 0.72){
          window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - 84), behavior: 'smooth' });
        }
      });
    }
  };

  if (openOpts && openOpts.direct){ go(null); return; }
  if (reduce){ go(null); return; }

  const btn = [...packsEl.querySelectorAll('.pack')].find(b => b.dataset.cat === cat);
  if (!btn){ go(null); return; }

  packBusy = true;
  const pr = packsEl.getBoundingClientRect();
  const br = btn.getBoundingClientRect();
  const focusX = Math.max(-110, Math.min(110, Math.round(((pr.left + pr.width / 2) - (br.left + br.width / 2)) * 0.42)));
  btn.style.setProperty('--focus-x', focusX + 'px');
  packsEl.classList.add('is-unboxing');
  btn.classList.add('is-opening');

  const ripAnims = [];

  // 邻卷柔和退场聚焦
  packsEl.querySelectorAll('.pack').forEach(other => {
    if (other === btn) return;
    ripAnims.push(other.animate([
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0.12, transform: 'scale(0.95)' }
    ], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));
  });

  // Beat 1 (0ms): 目标包微压蓄力后聚光抬升 + 顶部撕口细光缝横掠
  ripAnims.push(btn.animate([
    { transform: 'translate3d(0, 0, 0) scale(1)', offset: 0 },
    { transform: `translate3d(${Math.round(focusX * 0.35)}px, 2px, 0) scale(0.975)`, offset: 0.18, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    { transform: `translate3d(${focusX}px, -6px, 0) scale(1.035)`, offset: 0.48, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    { transform: `translate3d(${focusX}px, -4px, 0) scale(1.02)`, offset: 1 }
  ], { duration: 530, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));

  const seam = btn.querySelector('.pk-seam-glow');
  if (seam){
    ripAnims.push(seam.animate([
      { transform: 'scaleX(0)', opacity: 0, offset: 0 },
      { transform: 'scaleX(0.32)', opacity: 1, offset: 0.18 },
      { transform: 'scaleX(1.02)', opacity: 0.96, offset: 0.74 },
      { transform: 'scaleX(1.05)', opacity: 0, offset: 1 }
    ], { duration: 255, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));
  }

  // Beat 2 (115ms): 锯齿顶封条撕裂向右上抛飞，同时包体显露锯齿裂口
  const ripTimer = setTimeout(() => {
    btn.classList.add('is-ripped');
  }, 115);

  const crimpTop = btn.querySelector('.pk-crimp-top');
  if (crimpTop){
    ripAnims.push(crimpTop.animate([
      { transform: 'translate3d(0, 0, 0) rotate(0deg) scale(1)', opacity: 1, offset: 0 },
      { transform: 'translate3d(6px, -6px, 0) rotate(-3.5deg) scale(1.01)', opacity: 1, offset: 0.28 },
      { transform: 'translate3d(54px, -48px, 0) rotate(15deg) scale(0.92)', opacity: 0, offset: 1 }
    ], { duration: 260, delay: 115, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));
  }

  // Beat 3 (160ms): 深色馆藏牌背剪影从裂口上浮探出
  btn.querySelectorAll('.pk-sheet').forEach((sh, idx) => {
    const spreadX = (idx - 1) * 7;
    const rot = (idx - 1) * 2.6;
    const liftY = -64 + Math.abs(idx - 1) * 6;
    ripAnims.push(sh.animate([
      { transform: 'translate3d(0, 0, 0) rotate(0deg) scale(0.96)', opacity: 0.86 },
      { transform: `translate3d(${spreadX}px, ${liftY}px, 0) rotate(${rot}deg) scale(1)`, opacity: 1 }
    ], { duration: 290, delay: 160 + idx * 18, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }));
  });

  // Beat 4 (245ms): 外层封套向下滑落消散，让位给飞出的典藏列阵
  const sleeve = btn.querySelector('.pk-sleeve');
  if (sleeve){
    ripAnims.push(sleeve.animate([
      { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
      { transform: 'translate3d(0, 76px, 0) scale(0.95)', opacity: 0 }
    ], { duration: 280, delay: 245, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }));
  }

  setTimeout(() => {
    clearTimeout(ripTimer);
    const pocket = btn.querySelector('.pk-pocket') || btn;
    const kr = pocket.getBoundingClientRect();
    const origin = (kr.width > 0 && kr.height > 0)
      ? { cx: kr.left + kr.width / 2, cy: kr.top + kr.height / 2 }
      : null;
    ripAnims.forEach(a => { try { a.cancel(); } catch (_) {} });
    packsEl.classList.remove('is-unboxing');
    btn.classList.remove('is-opening', 'is-ripped');
    btn.style.removeProperty('--focus-x');
    packBusy = false;
    go(origin);
  }, 530);
}

/* ---------- 典藏陈列舞台构建与 0° 端正入阵 ---------- */
function buildDeck(cat, origin){
  if (!deck) return;
  deck.replaceChildren();
  const p = packs.get(cat);
  if (!p) return;
  const ordered = p.deck;
  deck.dataset.count = String(ordered.length);
  ordered.forEach(a => {
    const el = ensureCard(a);
    el.style.zIndex = '';
    el.style.transform = '';
    el.style.opacity = '';
    el.style.pointerEvents = '';
    resetCardTiltVars(el);
    syncCardState(el, a, false);
    giveName(a.id, el);
    deck.appendChild(el);
  });
  updateDeckHint();
  dealIn(origin);
}

function dealIn(origin){
  if (reduce || !currentPack || !deck) return;
  const ordered = packs.get(currentPack)?.deck || [];
  ordered.forEach((a, i) => {
    const el = cardEls.get(a.id);
    if (!el) return;
    if (origin && Number.isFinite(origin.cx) && Number.isFinite(origin.cy)){
      const cr = el.getBoundingClientRect();
      const dx = cr.width > 0 ? Math.max(-460, Math.min(460, Math.round(origin.cx - (cr.left + cr.width / 2)))) : 0;
      const dy = cr.height > 0 ? Math.max(-380, Math.min(380, Math.round(origin.cy - (cr.top + cr.height / 2)))) : 24;
      el.animate([
        { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.76)`, opacity: 0 },
        { opacity: 1, offset: 0.22 },
        { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 }
      ], {
        duration: 520,
        delay: i * 48,
        easing: SPRING_SETTLE,
        fill: 'backwards'
      });
    } else {
      el.animate([
        { transform: 'translate3d(0, 18px, 0) scale(0.94)', opacity: 0 },
        { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 }
      ], {
        duration: 380,
        delay: i * 36,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'backwards'
      });
    }
  });
}

/* ---------- 双面 3D 典藏卡牌 DOM、倾斜视差与翻牌交互 ---------- */
function resetCardTiltVars(el){
  if (!el) return;
  if (el._tiltTimer) { clearTimeout(el._tiltTimer); el._tiltTimer = 0; }
  if (el._tiltRaf) { cancelAnimationFrame(el._tiltRaf); el._tiltRaf = 0; }
  el.classList.remove('is-tilting');
  el.style.setProperty('--rx', '0deg');
  el.style.setProperty('--ry', '0deg');
  el.style.setProperty('--px', '0.5');
  el.style.setProperty('--py', '0.5');
  el.style.setProperty('--hyp', '0');
}

function syncCardAria(el, a, inCatalog = false){
  if (!el || !a) return;
  if (!inCatalog && el.classList.contains('is-facedown')){
    el.setAttribute('aria-label', `未翻开札签：${a.category}，轻点翻牌揭晓`);
  } else {
    el.setAttribute('aria-label', `阅读文章：${a.title}`);
  }
}

function syncCardState(el, a, inCatalog = false){
  if (!el || !a) return;
  const rev = isRevealed(a.id);
  if (!inCatalog){
    el.classList.toggle('is-facedown', !rev);
    const flipper = el.querySelector('.card-flipper');
    if (flipper && !el._flipping) flipper.style.transform = '';
  }
  syncCardAria(el, a, inCatalog);
}

function runAutoFoilShimmer(cardEl, duration = 500){
  if (!cardEl || !cardEl.isConnected) return;
  if (cardEl._shimmerRaf) cancelAnimationFrame(cardEl._shimmerRaf);
  const t0 = performance.now();
  const tick = (now) => {
    if (!cardEl.isConnected || cardEl.classList.contains('is-tilting')){
      cardEl._shimmerRaf = 0;
      return;
    }
    const u = Math.min(1, Math.max(0, (now - t0) / duration));
    const ease = 1 - Math.pow(1 - u, 3);
    const px = 0.14 + ease * 0.72;
    const py = 0.22 + ease * 0.56;
    const hyp = Math.sin(u * Math.PI) * 0.78;
    cardEl.style.setProperty('--px', px.toFixed(3));
    cardEl.style.setProperty('--py', py.toFixed(3));
    cardEl.style.setProperty('--hyp', u < 1 ? hyp.toFixed(3) : '0');
    if (u < 1){
      cardEl._shimmerRaf = requestAnimationFrame(tick);
    } else {
      cardEl.style.setProperty('--px', '0.5');
      cardEl.style.setProperty('--py', '0.5');
      cardEl.style.setProperty('--hyp', '0');
      cardEl._shimmerRaf = 0;
    }
  };
  cardEl._shimmerRaf = requestAnimationFrame(tick);
}

function flipCardReveal(cardEl, delay = 0, batchMode = false){
  if (!cardEl || !cardEl.classList.contains('is-facedown') || cardEl._flipping) return Promise.resolve();
  cardEl._flipping = true;
  resetCardTiltVars(cardEl);
  cardEl.style.zIndex = '30';

  const id = cardEl.dataset.id;
  const a = DATA.find(x => x.id === id);
  if (a){
    const isFoil = isFoilArticle(a);
    const emitFlip = () => {
      try {
        window.dispatchEvent(new CustomEvent('sj:card-flip', {
          detail: { id: a.id, title: a.title, category: a.category, rarity: isFoil ? 'foil' : 'standard' }
        }));
      } catch (_) {}
    };
    if (delay > 0) setTimeout(emitFlip, delay);
    else emitFlip();
  }
  const flipper = cardEl.querySelector('.card-flipper');
  const sheen = cardEl.querySelector('.card-reveal-sheen');

  if (!flipper){
    cardEl.classList.remove('is-facedown');
    saveRevealedId(id);
    if (a) syncCardAria(cardEl, a, false);
    cardEl.style.zIndex = '';
    cardEl._flipping = false;
    if (!batchMode){
      if (view === 'deck') { renderHUD(); updateDeckHint(); }
      updatePackBadges();
    }
    return Promise.resolve();
  }

  const anim = flipper.animate([
    // 0%: 牌背静止态
    { transform: 'translate3d(0, 0, 0) rotateY(180deg) rotateZ(0deg) scale(1)', offset: 0 },
    // 16%: 微压蓄力 + 6deg 反向预备
    { transform: 'translate3d(0, 4px, -10px) rotateY(186deg) rotateZ(-1.2deg) scale(0.965)', offset: 0.16, easing: 'cubic-bezier(0.4, 0, 1, 1)' },
    // 50%: 90deg 侧锋凌空抬升（跃过邻卡，背→正切换瞬间）
    { transform: 'translate3d(0, -18px, 42px) rotateY(90deg) rotateZ(0.8deg) scale(1.08)', offset: 0.50, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    // 80%: 7.5deg 弹簧微过冲
    { transform: 'translate3d(0, -3px, 8px) rotateY(-7.5deg) rotateZ(0deg) scale(1.018)', offset: 0.80, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    // 100%: 0deg 端正落定（零 3D 文字模糊）
    { transform: 'translate3d(0, 0, 0) rotateY(0deg) rotateZ(0deg) scale(1)', offset: 1 }
  ], { duration: 580, delay, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'both' });

  let midDone = false;
  const applyMidpoint = () => {
    if (midDone) return;
    midDone = true;
    cardEl.classList.remove('is-facedown');
    saveRevealedId(id);
    if (a) syncCardAria(cardEl, a, false);
    if (batchMode) updateCounterOnly();
    if (sheen && cardEl.isConnected){
      sheen.animate([
        { transform: 'translateX(-125%) skewX(-18deg)', opacity: 0 },
        { opacity: 0.88, offset: 0.35 },
        { transform: 'translateX(145%) skewX(-18deg)', opacity: 0 }
      ], { duration: 430, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    }
    runAutoFoilShimmer(cardEl, 500);
  };

  const midTimer = setTimeout(applyMidpoint, delay + 290);

  return anim.finished.catch(() => {}).finally(() => {
    clearTimeout(midTimer);
    applyMidpoint();
    flipper.style.transform = '';
    try { anim.cancel(); } catch (_) {}
    cardEl.style.zIndex = '';
    cardEl._flipping = false;
    if (!batchMode){
      if (view === 'deck') { renderHUD(); updateDeckHint(); }
      updatePackBadges();
    }
  });
}

function flipCardUnreveal(cardEl, delay = 0){
  if (!cardEl || cardEl.classList.contains('is-facedown') || cardEl._flipping) return Promise.resolve();
  cardEl._flipping = true;
  resetCardTiltVars(cardEl);
  cardEl.style.zIndex = '30';

  const id = cardEl.dataset.id;
  const a = DATA.find(x => x.id === id);
  const flipper = cardEl.querySelector('.card-flipper');

  if (!flipper){
    cardEl.classList.add('is-facedown');
    if (a) syncCardAria(cardEl, a, false);
    cardEl.style.zIndex = '';
    cardEl._flipping = false;
    return Promise.resolve();
  }

  const anim = flipper.animate([
    { transform: 'translate3d(0, 0, 0) rotateY(0deg) scale(1)', offset: 0 },
    { transform: 'translate3d(0, -14px, 34px) rotateY(90deg) scale(1.05)', offset: 0.48, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    { transform: 'translate3d(0, 0, 0) rotateY(180deg) scale(1)', offset: 1 }
  ], { duration: 440, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });

  const midTimer = setTimeout(() => {
    cardEl.classList.add('is-facedown');
    if (a) syncCardAria(cardEl, a, false);
  }, delay + 210);

  return anim.finished.catch(() => {}).finally(() => {
    clearTimeout(midTimer);
    cardEl.classList.add('is-facedown');
    if (a) syncCardAria(cardEl, a, false);
    flipper.style.transform = '';
    try { anim.cancel(); } catch (_) {}
    cardEl.style.zIndex = '';
    cardEl._flipping = false;
  });
}

function flipAllInPack(){
  if (!deck || view !== 'deck' || !currentPack || packCascading) return Promise.resolve();
  const targets = [...deck.querySelectorAll('.card.is-facedown')];
  if (!targets.length) return Promise.resolve();
  packCascading = true;
  const btn = $('flipAllBtn');
  if (btn) btn.disabled = true;
  return Promise.all(targets.map((el, idx) => flipCardReveal(el, idx * 65, true))).finally(() => {
    packCascading = false;
    if (view === 'deck') { renderHUD(); updateDeckHint(); }
    updatePackBadges();
  });
}

function unrevealPack(cat){
  const p = packs.get(cat);
  if (!p || packCascading) return Promise.resolve();
  const ids = p.deck.map(a => a.id);
  removeRevealedIds(ids);

  if (view === 'deck' && currentPack === cat && deck){
    const visibleCards = [...deck.querySelectorAll('.card:not(.is-facedown)')];
    if (visibleCards.length){
      packCascading = true;
      const btn = $('reflipBtn');
      if (btn) btn.disabled = true;
      return Promise.all(visibleCards.map((el, idx) => flipCardUnreveal(el, idx * 45))).finally(() => {
        packCascading = false;
        if (view === 'deck' && currentPack === cat) { renderHUD(); updateDeckHint(); }
        updatePackBadges();
      });
    }
  }
  if (view === 'deck' && currentPack === cat) { renderHUD(); updateDeckHint(); }
  updatePackBadges();
  return Promise.resolve();
}

function ensureCard(a){
  let el = cardEls.get(a.id);
  if (el) return el;

  const idx = DATA.indexOf(a);
  const serial = String(idx >= 0 ? idx + 1 : 1).padStart(2, '0');
  const isFoil = isFoilArticle(a);
  const tagsText = (a.tags || []).slice(0, 2).join(' · ') || 'ARCHIVE';

  el = document.createElement('article');
  el.className = 'card';
  if (!isRevealed(a.id)) el.classList.add('is-facedown');
  el.dataset.id = a.id;
  el.dataset.rarity = isFoil ? 'foil' : 'standard';
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.style.setProperty('--pc', colorOf(a.category));
  el.style.setProperty('--rx', '0deg');
  el.style.setProperty('--ry', '0deg');
  el.style.setProperty('--px', '0.5');
  el.style.setProperty('--py', '0.5');
  el.style.setProperty('--hyp', '0');
  el.style.viewTransitionName = cardName(a.id);

  el.innerHTML = `
    <div class="card-rotator">
      <div class="card-flipper">
        <div class="card-face card-front">
          <div class="card-clip">
            <i class="card-foil-rim" aria-hidden="true"></i>
            <header class="cf-head">
              <span class="cf-cat"><i class="cf-dot"></i>${esc(a.category)}</span>
              <span class="cf-no">${isFoil ? '✦ FOIL · ' : ''}NO.${serial}</span>
            </header>
            <div class="cf-art">
              <img src="${esc(a.cover || '')}" alt="" loading="lazy">
              <i class="cf-art-foil" aria-hidden="true"></i>
            </div>
            <div class="cf-typebar">
              <span class="cf-tags">${esc(tagsText)}</span>
              <span class="cf-time">${esc(a.readTime || '')}</span>
            </div>
            <div class="cf-body">
              <h2>${esc(a.title)}</h2>
              <p class="cf-lore">${esc(a.summary || '')}</p>
            </div>
            <footer class="cf-foot">
              <span class="cf-date">${esc(a.date || '')}</span>
              <span class="cf-cta" data-cta>拆阅全文 →</span>
            </footer>
            <i class="card-glare" aria-hidden="true"></i>
            <i class="card-reveal-sheen" aria-hidden="true"></i>
          </div>
        </div>
        <div class="card-face card-back" aria-hidden="true">
          <div class="card-clip">
            <i class="card-foil-rim" aria-hidden="true"></i>
            <div class="cb-frame">
              <span class="cb-corner tl"></span><span class="cb-corner tr"></span>
              <span class="cb-corner bl"></span><span class="cb-corner br"></span>
              <div class="cb-emblem">
                <svg viewBox="0 0 120 120" class="cb-svg" aria-hidden="true">
                  <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" stroke-width="0.8" stroke-dasharray="3 3"/>
                  <circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" stroke-width="1"/>
                  <polygon points="60,14 70,50 106,60 70,70 60,106 50,70 14,60 50,50" fill="none" stroke="currentColor" stroke-width="0.95"/>
                  <circle cx="60" cy="60" r="4.5" fill="currentColor" fill-opacity="0.4"/>
                </svg>
                <span class="cb-cat">${esc(a.category)}</span>
                <span class="cb-brand serif">楠屿札签</span>
                <span class="cb-rarity">${isFoil ? '✦ DEEP ARCHIVE' : 'COLLECTOR EDITION'}</span>
              </div>
              <span class="cb-tap">轻点翻牌</span>
            </div>
            <i class="card-glare" aria-hidden="true"></i>
          </div>
        </div>
      </div>
    </div>`;

  syncCardAria(el, a, false);

  // 桌面鼠标 rAF 3D 视差微倾与金属闪膜坐标追踪
  el.addEventListener('pointerenter', e => {
    if (e.pointerType !== 'mouse' || (catalogEl && catalogEl.contains(el))) return;
    el._hovered = true;
    if (el._tiltTimer) clearTimeout(el._tiltTimer);
    el._tiltTimer = setTimeout(() => {
      el._tiltTimer = 0;
      if (el._hovered && !el._flipping) el.classList.add('is-tilting');
    }, 140);
  });

  el.addEventListener('pointermove', e => {
    if (catalogEl && catalogEl.contains(el)) return;
    if (e.pointerType === 'mouse'){
      if (!el._hovered) el._hovered = true;
      if (!el._flipping && !el.classList.contains('is-tilting') && !el._tiltTimer){
        el._tiltTimer = setTimeout(() => {
          el._tiltTimer = 0;
          if (el._hovered && !el._flipping) el.classList.add('is-tilting');
        }, 120);
      }
      el._pm = { x: e.clientX, y: e.clientY };
      if (el._tiltRaf) return;
      el._tiltRaf = requestAnimationFrame(() => {
        el._tiltRaf = 0;
        if (!el._hovered || el._flipping || (catalogEl && catalogEl.contains(el))) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const px = Math.max(0, Math.min(1, (el._pm.x - r.left) / r.width));
        const py = Math.max(0, Math.min(1, (el._pm.y - r.top) / r.height));
        const hyp = Math.min(1, Math.hypot(px - 0.5, py - 0.5) * 1.8);
        const maxDeg = el.classList.contains('is-facedown') ? 6 : 10;
        const rx = ((0.5 - py) * maxDeg * 2).toFixed(2) + 'deg';
        const ry = ((px - 0.5) * maxDeg * 2).toFixed(2) + 'deg';
        el.style.setProperty('--px', px.toFixed(3));
        el.style.setProperty('--py', py.toFixed(3));
        el.style.setProperty('--hyp', hyp.toFixed(3));
        el.style.setProperty('--rx', rx);
        el.style.setProperty('--ry', ry);
      });
      return;
    }

    // 移动端触控：已翻开卡面支持非阻塞横向轻搓检视闪膜（绝不拦截纵向页面滚动）
    if (e.pointerType === 'touch' && el._touchScrub){
      const ts = el._touchScrub;
      if (ts.id !== e.pointerId || ts.canceled) return;
      const dx = e.clientX - ts.x0;
      const dy = e.clientY - ts.y0;
      if (!ts.scrubbing){
        if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) { ts.canceled = true; return; }
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.3){
          ts.scrubbing = true;
          el.classList.add('is-tilting');
        }
      }
      if (ts.scrubbing){
        const ryVal = Math.max(-11, Math.min(11, dx * 0.18));
        const pxVal = Math.max(0, Math.min(1, 0.5 + dx / 160));
        const hypVal = Math.min(1, Math.abs(dx) / 95);
        el.style.setProperty('--ry', ryVal.toFixed(2) + 'deg');
        el.style.setProperty('--px', pxVal.toFixed(3));
        el.style.setProperty('--py', '0.45');
        el.style.setProperty('--hyp', hypVal.toFixed(3));
      }
    }
  });

  el.addEventListener('pointerleave', e => {
    if (e.pointerType === 'mouse'){
      el._hovered = false;
      resetCardTiltVars(el);
    }
  });

  el.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    if (el.classList.contains('is-facedown') || el._flipping || (catalogEl && catalogEl.contains(el))) return;
    el._touchScrub = { id: e.pointerId, x0: e.clientX, y0: e.clientY, scrubbing: false, canceled: false };
  });

  const endTouchScrub = e => {
    if (e.pointerType !== 'touch' || !el._touchScrub) return;
    if (el._touchScrub.scrubbing){
      el._suppressed = true;
      setTimeout(() => { el._suppressed = false; }, 320);
      resetCardTiltVars(el);
    }
    el._touchScrub = null;
  };
  el.addEventListener('pointerup', endTouchScrub);
  el.addEventListener('pointercancel', endTouchScrub);

  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      handleCardInteraction(el, (catalogEl && catalogEl.contains(el)) ? 'catalog' : 'deck');
      return;
    }
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && deck && deck.contains(el) && view === 'deck'){
      const siblings = [...deck.querySelectorAll('.card')];
      const pos = siblings.indexOf(el);
      if (pos >= 0 && siblings.length > 1){
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        siblings[(pos + dir + siblings.length) % siblings.length].focus();
      }
    }
  });

  cardEls.set(a.id, el);
  return el;
}

/* ---------- 点击 / 键盘激活状态机：背态翻牌揭晓，正态提牌展卷阅读 ---------- */
function handleCardInteraction(el, src){
  if (!el || el._suppressed || el._flipping || animating || view === 'reader') return;
  if (src !== 'catalog' && el.classList.contains('is-facedown')){
    flipCardReveal(el, 0, false);
    return;
  }
  onCardActivate(el, src);
}

if (deck){
  deck.addEventListener('click', e => {
    const el = e.target.closest('.card');
    if (!el || el._suppressed) return;
    handleCardInteraction(el, 'deck');
  });
  deck.addEventListener('dragstart', e => e.preventDefault());
}

if (catalogEl){
  catalogEl.addEventListener('click', e => {
    const el = e.target.closest('.card');
    if (!el || el._suppressed) return;
    handleCardInteraction(el, 'catalog');
  });
}

function onCardActivate(el, src){
  if (animating || view === 'reader' || el._flipping) return;
  const a = DATA.find(x => x.id === el.dataset.id);
  if (!a) return;
  resetCardTiltVars(el);

  const finishOpen = () => {
    if (el) el.classList.remove('is-opening-read');
    animating = false;
    if (typeof opts.onOpenArticle === 'function'){
      settleAfterRead(a, src || 'deck');
      if (currentPack === a.category) { renderHUD(); updateDeckHint(); }
      updatePackBadges();
      opts.onOpenArticle(a);
    } else {
      // full 模式下先持久化已读标记，保留卡面 view-transition-name 供阅读页 hero 无缝变形
      recordReadState(a, src || 'deck');
      if (currentPack === a.category) { renderHUD(); updateDeckHint(); }
      updatePackBadges();
      openReader(a, src || 'deck');
    }
  };

  if (reduce || src === 'catalog' || !el || !el.isConnected){
    finishOpen();
    return;
  }

  animating = true;
  el.classList.add('is-opening-read');
  const liftAnim = el.animate([
    { transform: 'translate3d(0, 0, 0) scale(1)' },
    { transform: 'translate3d(0, -6px, 0) scale(1.028)', offset: 0.65, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    { transform: 'translate3d(0, -3px, 0) scale(1.015)', offset: 1 }
  ], { duration: 170, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  setTimeout(() => {
    try { liftAnim.cancel(); } catch (_) {}
    finishOpen();
  }, 170);
}

/* ---------- 打开阅读后仅维持当前卡面展开态，不记录已读数据 ---------- */
function recordReadState(a){
  if (!a) return null;
  const id = a.id;
  saveRevealedId(id);
  const el = cardEls.get(id);
  if (el){
    const inCat = !!(catalogEl && catalogEl.contains(el));
    el.classList.remove('is-facedown');
    syncCardAria(el, a, inCat);
    if (inCat && currentPack !== a.category){
      borrowed.add(id);
    }
  }
  return null;
}

function settleAfterRead(a, srcOverride){
  if (!a) return;
  const chip = recordReadState(a, srcOverride);
  const el = cardEls.get(a.id);
  if (el && ((deck && deck.contains(el) && view === 'deck') || (catalogEl && catalogEl.contains(el)))){
    giveName(a.id, el);
  } else if (chip){
    giveName(a.id, chip);
  } else if (el){
    giveName(a.id, el);
  }
}

/* ---------- 阅读页（full 模式） ---------- */
function openReader(a, src = 'other'){
  if (view === 'reader') return;
  const prevView = src === 'catalog' ? 'catalog' : view;
  view = 'reader';
  pushOv('reader');
  const hero = $('readerHero'), cover = $('readerCover');
  hero.style.viewTransitionName = cardName(a.id);
  cover.src = a.cover;
  $('readerTitle').textContent = a.title;
  $('readerCat').textContent = a.category;
  $('readerMeta').textContent = `${a.date} · ${a.readTime}`;
  $('readerTags').innerHTML = (a.tags || []).map(t => `<span>${esc(t)}</span>`).join('');
  $('readerMore').href = './?post=' + encodeURIComponent(a.id);
  renderBody(a.content || '', $('readerBody'));
  renderReaderNav(a);
  reader.dataset.id = a.id;
  reader.dataset.src = src;
  reader.dataset.return = prevView;
  lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  $('closeBtn').textContent = prevView === 'deck' ? '← 返回本卷'
    : prevView === 'catalog' ? '← 返回目录'
    : '← 返回卡包架';
  const go = () => {
    giveName(a.id, hero);
    stage.style.visibility = 'hidden';
    reader.hidden = false;
    reader.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    $('closeBtn').focus({ preventScroll: true });
  };
  vt(go);
}

function closeReaderNow(){
  if (view !== 'reader') return;
  const ret = reader.dataset.return || 'deck';
  const id = reader.dataset.id;
  const a = DATA.find(x => x.id === id);
  view = ret === 'catalog' ? (catalogReturn || 'packs') : ret;
  const go = () => {
    reader.hidden = true;
    stage.style.visibility = '';
    if (opts.standalone) document.body.style.overflow = '';
    settleAfterRead(a);
    if (currentPack && a && currentPack === a.category) { renderHUD(); updateDeckHint(); }
    else renderHUD();
    updatePackBadges();
    lastFocus?.focus?.({ preventScroll: true });
  };
  vt(go);
}

/* ---------- 阅读页：卷内顺序导航渲染 ---------- */
function renderReaderNav(a){
  const nav = $('readerNav');
  if (!nav) return;
  const p = packs.get(a.category);
  const arts = p ? p.deck : orderedArticlesOf(a.category);
  if (arts.length <= 1){
    nav.replaceChildren();
    nav.hidden = true;
    return;
  }
  const idx = arts.findIndex(x => x.id === a.id);
  const prev = idx > 0 ? arts[idx - 1] : null;
  const next = idx < arts.length - 1 ? arts[idx + 1] : null;
  nav.hidden = false;
  nav.innerHTML = `
    <button class="rnav-btn prev" ${prev ? `data-id="${esc(prev.id)}"` : 'disabled'} type="button" aria-label="上一札">
      <span class="rnav-sub">← 上一札 · ${esc(a.category)}</span>
      <span class="rnav-title">${prev ? esc(prev.title) : '已是本卷首篇'}</span>
    </button>
    <button class="rnav-btn next" ${next ? `data-id="${esc(next.id)}"` : 'disabled'} type="button" aria-label="下一札">
      <span class="rnav-sub">下一札 · ${esc(a.category)} →</span>
      <span class="rnav-title">${next ? esc(next.title) : '已是本卷末篇'}</span>
    </button>
  `;
}

if (reader){
  $('closeBtn').addEventListener('click', closeReader);
  $('readerNav')?.addEventListener('click', e => {
    const btn = e.target.closest('.rnav-btn');
    if (!btn || btn.disabled) return;
    const targetId = btn.dataset.id;
    if (!targetId) return;
    const targetA = DATA.find(x => x.id === targetId);
    if (!targetA) return;
    const currentId = reader.dataset.id;
    const currentA = DATA.find(x => x.id === currentId);
    if (currentA) settleAfterRead(currentA);
    recordReadState(targetA, 'reader-nav');
    const hero = $('readerHero'), cover = $('readerCover');
    const go = () => {
      reader.dataset.id = targetA.id;
      giveName(targetA.id, hero);
      cover.src = targetA.cover;
      $('readerTitle').textContent = targetA.title;
      $('readerCat').textContent = targetA.category;
      $('readerMeta').textContent = `${targetA.date} · ${targetA.readTime}`;
      $('readerTags').innerHTML = (targetA.tags || []).map(t => `<span>${esc(t)}</span>`).join('');
      $('readerMore').href = './?post=' + encodeURIComponent(targetA.id);
      renderBody(targetA.content || '', $('readerBody'));
      renderReaderNav(targetA);
      reader.scrollTop = 0;
      if (currentPack === targetA.category) renderHUD();
      updatePackBadges();
    };
    vt(go);
  });
}

/* ---------- 总目录抽屉（full 模式，复用 .card 节点压平为横条索引） ---------- */
function openCatalog(from){
  if (view === 'reader' || !catalogOv || !catalogOv.hidden) return;
  catalogReturn = from;
  buildCatalog();
  catPanelMeta.textContent = `全库 ${DATA.length} 札 · 共 ${cats.length} 卷`;
  scopeEl.classList.add('cat-open');
  pushOv('catalog');
  catalogOv.hidden = false;
  setTimeout(() => catalogOv.classList.add('open'), 30);
  $('catCloseBtn')?.focus({ preventScroll: true });
}

function buildCatalog(){
  if (!catalogEl) return;
  catalogEl.replaceChildren();
  borrowed.clear();
  for (const cat of cats){
    const p = packs.get(cat);
    const ordered = p ? p.deck : orderedArticlesOf(cat);
    const sec = document.createElement('section');
    sec.className = 'cat-group';
    sec.style.setProperty('--pc', colorOf(cat));
    sec.innerHTML = `<h3><span class="dot"></span>${esc(cat)}<small>${ordered.length} 札</small></h3>`;
    const grid = document.createElement('div');
    grid.className = 'cat-grid';
    for (const a of ordered){
      const inThisDeck = currentPack === cat && cardEls.has(a.id);
      const el = ensureCard(a);
      if (!inThisDeck){
        borrowed.add(a.id);
      }
      resetCardTiltVars(el);
      el.style.zIndex = '';
      el.style.transform = '';
      el.style.opacity = '';
      el.style.pointerEvents = '';
      syncCardState(el, a, true);
      giveName(a.id, el);
      grid.appendChild(el);
    }
    sec.appendChild(grid);
    catalogEl.appendChild(sec);
  }
}

function closeCatalogNow(){
  if (!catalogOv || catalogOv.hidden) return;
  for (const id of borrowed){
    cardEls.get(id)?.remove();
    cardEls.delete(id);
  }
  borrowed.clear();
  catalogEl.replaceChildren();
  catalogOv.hidden = true;
  catalogOv.classList.remove('open');
  scopeEl.classList.remove('cat-open');
  if (catalogReturn === 'deck' && currentPack && view === 'deck' && deck){
    deck.style.viewTransitionName = packName(currentPack);
    const p = packs.get(currentPack);
    if (p){
      deck.dataset.count = String(p.deck.length);
      p.deck.forEach(a => {
        const el = cardEls.get(a.id);
        if (el){
          syncCardState(el, a, false);
          deck.appendChild(el);
          giveName(a.id, el);
        }
      });
      for (const a of DATA){
        if (chipEls.has(a.id) && !p.deck.includes(a)) giveName(a.id, chipEls.get(a.id));
      }
    }
    renderHUD();
    updateDeckHint();
  } else if (view === 'packs'){
    if (deck) { deck.replaceChildren(); delete deck.dataset.count; }
    cardEls.clear();
    for (const a of DATA){
      if (chipEls.has(a.id)) giveName(a.id, chipEls.get(a.id));
    }
    renderHUD();
    updatePackBadges();
    if (hint) hint.textContent = '点选补充包或横向划过封口拆封 · 每包收录一类手记';
  }
}

function closeCatalog(){
  if (histDepth > 0){ history.back(); return; }
  closeCatalogNow();
}
if (catalogOv) $('catBackdrop')?.addEventListener('click', closeCatalog);
if (catalogOv) $('catShade')?.addEventListener('click', closeCatalog);
if (catalogOv) $('catCloseBtn')?.addEventListener('click', closeCatalog);

/* ---------- 历史：浏览器后退 = 关浮层 ---------- */
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
  if (histDepth > 0){ history.back(); return; }
  closeReaderNow();
}

/* ---------- 全局键盘快捷键 ---------- */
const onKey = e => {
  if (e.key === 'Escape'){
    if (view === 'reader') closeReader();
    else if (catalogOv && !catalogOv.hidden) closeCatalog();
    else if (view === 'deck') showPacks();
    else if (!opts.standalone && opts.onExit) opts.onExit();
  }
};

const onInlineKey = e => {
  if (e.key !== 'Escape' || view !== 'deck') return;
  if (document.querySelector('#article-modal:not(.hidden), #project-modal:not(.hidden), #search-palette:not(.hidden)')) return;
  showPacks();
};

/* ---------- 主题：与博客同键（sj.theme）+ color-scheme 与跨标签页同步 ---------- */
const themeBtn = opts.standalone ? (opts.themeBtn || null) : null;
function applyTheme(dark){
  document.documentElement.classList.toggle('dark', dark);
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.content = dark ? 'dark' : 'light';
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.content = dark ? '#060911' : '#f8fafc';
  if (themeBtn) themeBtn.textContent = dark ? '☀' : '☾';
}
if (themeBtn) try {
  applyTheme(document.documentElement.classList.contains('dark'));
  themeBtn.addEventListener('click', () => {
    const dark = !document.documentElement.classList.contains('dark');
    applyTheme(dark);
    try { localStorage.setItem('sj.theme', dark ? 'dark' : 'light'); } catch (e) {}
  });
  window.addEventListener('storage', (ev) => {
    if (ev.key === 'sj.theme') applyTheme(ev.newValue === 'dark');
  });
} catch (e) {}

/* ---------- 正文渲染：按需加载 marked+DOMPurify，miniMd 兜底 ---------- */
function ensureMdLoader(){
  if (window.ensureMarkdown) return window.ensureMarkdown();
  if (window.marked && window.DOMPurify) return Promise.resolve(true);
  return new Promise(resolve => {
    let loaded = 0;
    const check = () => { if (++loaded === 2) resolve(!!(window.marked && window.DOMPurify)); };
    const s1 = document.createElement('script');
    s1.src = 'assets/vendor/marked.min.js';
    s1.onload = check; s1.onerror = () => resolve(false);
    document.head.appendChild(s1);
    const s2 = document.createElement('script');
    s2.src = 'assets/vendor/purify.min.js';
    s2.onload = check; s2.onerror = () => resolve(false);
    document.head.appendChild(s2);
  });
}
function renderBody(src, el){
  const paint = html => { el.innerHTML = html; ensureBodyHl(el); };
  ensureMdLoader().then(ok => {
    if (ok && window.marked && window.DOMPurify){
      paint(window.DOMPurify.sanitize(window.marked.parse(src || '')));
    } else paint(miniMd(src || ''));
  });
}
function ensureBodyHl(root){
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
function inlineMd(s){
  return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
}
function miniMd(src){
  const lines = esc(src).split('\n');
  let html = '', ul = false, ol = false;
  const closeLists = () => { if (ul){ html += '</ul>'; ul = false; } if (ol){ html += '</ol>'; ol = false; } };
  for (const raw of lines){
    const t = raw.trim();
    if (!t){ closeLists(); continue; }
    if (/^###\s/.test(t)){ closeLists(); html += `<h3>${inlineMd(t.slice(4))}</h3>`; }
    else if (/^##\s/.test(t)){ closeLists(); html += `<h3>${inlineMd(t.slice(3))}</h3>`; }
    else if (/^[-*]\s/.test(t)){ if (!ul){ closeLists(); html += '<ul>'; ul = true; } html += `<li>${inlineMd(t.slice(2))}</li>`; }
    else if (/^\d+\.\s/.test(t)){ if (!ol){ closeLists(); html += '<ol>'; ol = true; } html += `<li>${inlineMd(t.replace(/^\d+\.\s/, ''))}</li>`; }
    else { closeLists(); html += `<p>${inlineMd(t)}</p>`; }
  }
  closeLists();
  return html;
}

/* ---------- View Transition 助手（240ms 超时防隐藏页签冻结） ---------- */
function vt(fn){
  if (opts.mode === 'inline' || !document.startViewTransition || reduce){ fn(); return; }
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
} else if (opts.mode === 'inline'){
  addEventListener('keydown', onInlineKey);
}
if (opts.mode === 'full' && opts.startPack) setTimeout(() => { openPack(opts.startPack); }, 60);
if (opts.mode === 'full' && opts.startArticle){
  const a0 = DATA.find(x => x.id === opts.startArticle);
  if (a0) setTimeout(() => { recordReadState(a0, 'start'); openReader(a0, 'other'); }, 60);
}

function destroy(){
  removeEventListener('popstate', onPop);
  removeEventListener('keydown', onKey);
  removeEventListener('keydown', onInlineKey);
  document.body.style.overflow = '';
  scopeEl.classList.remove('cat-open');
  delete root.dataset.cardsMounted;
}

return {
  destroy,
  openPack,
  showPacks,
  refreshBadges: updatePackBadges,
  unrevealPack,
  flipAll: flipAllInPack
};
}

function mount(root, opts){
  opts = Object.assign({ mode: 'full', standalone: false }, opts || {});
  if (!root || root.dataset.cardsMounted === '1') return null;
  root.dataset.cardsMounted = '1';
  root.innerHTML = opts.mode === 'shelf' ? SK_SHELF : (opts.mode === 'inline' ? SK_INLINE : SK_FULL);
  if (opts.mode === 'full' && !opts.standalone){
    const more = root.querySelector('#readerMore');
    if (more) more.setAttribute('hidden', '');
  }
  const inst = createInstance(root, opts);
  return inst ? {
    destroy: inst.destroy,
    openPack: inst.openPack,
    showPacks: inst.showPacks,
    refreshBadges: inst.refreshBadges,
    unrevealPack: inst.unrevealPack,
    flipAll: inst.flipAll,
    root: root
  } : null;
}
return { mount: mount };
})();
