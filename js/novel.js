/**
 * 连载阅读器（novel.html）
 * ----------------------------------------------------
 * 数据来自 js/novel-data.js（window.NOVEL_BOOKS），正文用自托管 marked + purify 渲染，
 * 代码块出现时才按需拉 highlight（与首页手记同一套策略）。
 *
 * 能力：
 *   · 书架：书名/作者/简介/章节数；封面缺省用「书名首字 + 渐变」
 *   · 阅读：窄版心中文长文排版、章节抽屉、上一章/下一章、键盘 ←/→ 翻章、Esc 关抽屉
 *   · 记忆：sj.novel.last.<bookId> = { chapter, scroll }，回到书里接着上次的位置读
 *   · 排版：字号 16–22、行高 1.6–2.1，滑杆即时生效并持久化（sj.novel.type）
 *   · 沉浸模式：隐藏站点导航/页脚与阅读器头部，只留一枚悬浮退出键（Esc 也退出）
 *   · 深链：novel.html#<bookId>/<chapterId>，翻章时用 replaceState 同步，可直接分享
 *   · 空态：没有书时给出说明（并提示示例内容与写作台的关系）
 */
(function () {
  'use strict';

  const BOOKS = (Array.isArray(window.NOVEL_BOOKS) ? window.NOVEL_BOOKS : []).filter(
    (b) => b && b.id && Array.isArray(b.volumes)
  );

  const shelf = document.getElementById('novel-shelf');
  const reader = document.getElementById('novel-reader');
  if (!shelf || !reader) return;

  const K_LAST = (id) => 'sj.novel.last.' + id;
  const K_TYPE = 'sj.novel.type';
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* 无痕模式：仅本次 */ } };
  const getJSON = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };

  // ---- 章节索引：把 卷/章 摊平成线性列表，便于上下一章 ----
  function flat(book) {
    const out = [];
    book.volumes.forEach((v, vi) => (v.chapters || []).forEach((c) => out.push({ ...c, volume: v.title, vi })));
    return out;
  }

  const state = {
    book: null,
    chapters: [],
    index: 0,
    type: getJSON(K_TYPE) || { size: 18, lh: 1.9 }
  };

  // ---- 排版变量 ----
  function applyType() {
    document.documentElement.style.setProperty('--novel-size', state.type.size + 'px');
    document.documentElement.style.setProperty('--novel-lh', String(state.type.lh));
    const s1 = document.getElementById('novel-size');
    const s2 = document.getElementById('novel-lh');
    const o1 = document.getElementById('novel-size-val');
    const o2 = document.getElementById('novel-lh-val');
    if (s1) s1.value = String(state.type.size);
    if (s2) s2.value = String(state.type.lh);
    if (o1) o1.textContent = state.type.size + 'px';
    if (o2) o2.textContent = state.type.lh.toFixed(1);
  }

  // ---- Markdown ----
  let hlLoading = false;
  function ensureHighlight() {
    if (window.hljs || hlLoading) return;
    if (!document.querySelector('.novel-body pre code')) return;
    hlLoading = true;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'assets/vendor/github-dark.min.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = 'assets/vendor/highlight.min.js';
    s.onload = () => {
      if (window.hljs) document.querySelectorAll('.novel-body pre code').forEach((el) => window.hljs.highlightElement(el));
    };
    document.head.appendChild(s);
  }

  // Markdown 渲染器按需加载（2026-10-17）：章节正文才需要 marked + purify，
  // 图书架与目录不依赖它们，所以首屏不再加载这两个库。
  function paintBody(chapter) {
    const body = document.getElementById('novel-body');
    if (!body) return;
    body.innerHTML = (window.marked && window.DOMPurify)
      ? window.DOMPurify.sanitize(window.marked.parse(chapter.content || ''))
      : `<p>${esc(chapter.content || '')}</p>`;      // 加载失败：纯文本兜底，不白屏
    ensureHighlight();
  }

  // ---- 书架 ----
  function renderShelf() {
    shelf.textContent = '';
    const emptyEl = document.getElementById('novel-empty');
    const usable = BOOKS.filter((b) => flat(b).length);
    if (!usable.length) {
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    usable.forEach((b) => {
      const chs = flat(b);
      const a = document.createElement('button');
      a.type = 'button';
      a.className = 'novel-book';
      a.innerHTML = `
        <span class="novel-cover" aria-hidden="true">${b.cover
          ? `<img src="${esc(b.cover)}" alt="" loading="lazy" onerror="this.remove()">`
          : esc((b.title || '?').slice(0, 1))}</span>
        <span class="novel-meta">
          <b>${esc(b.title || '')}${b.sample ? '<i class="novel-badge">示例</i>' : ''}</b>
          <span class="novel-author">${esc(b.author || '')} · ${chs.length} 章</span>
          <span class="novel-intro">${esc(b.intro || '')}</span>
        </span>`;
      a.addEventListener('click', () => {
        const last = getJSON(K_LAST(b.id));
        const idx = last && chs.findIndex((c) => c.id === last.chapter) >= 0 ? chs.findIndex((c) => c.id === last.chapter) : 0;
        open(b, idx);
      });
      shelf.appendChild(a);
    });
  }

  // ---- 抽屉（目录）----
  const drawer = document.getElementById('novel-drawer');
  let lastFocus = null;

  function renderDrawer() {
    const body = document.getElementById('novel-toc');
    body.textContent = '';
    let n = 0;
    state.book.volumes.forEach((v) => {
      const h = document.createElement('p');
      h.className = 'novel-vol';
      h.textContent = v.title || '';
      body.appendChild(h);
      (v.chapters || []).forEach((c) => {
        const i = n++;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'novel-toc-item' + (i === state.index ? ' is-current' : '');
        b.textContent = c.title || c.id;
        b.addEventListener('click', () => { go(i); closeDrawer(); });
        body.appendChild(b);
      });
    });
  }

  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    document.addEventListener('keydown', onDrawerKey);
    const cur = drawer.querySelector('.is-current');
    if (cur) cur.focus({ preventScroll: true });
    else (drawer.querySelector('.novel-toc-item') || drawer).focus({ preventScroll: true });
  }
  function closeDrawer() {
    drawer.classList.remove('is-open');
    setTimeout(() => { drawer.hidden = true; }, 180);
    document.removeEventListener('keydown', onDrawerKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function onDrawerKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDrawer(); } }

  // ---- 阅读 ----
  const body = document.getElementById('novel-body');
  const titleEl = document.getElementById('novel-chapter');

  function go(i, restoreScroll) {
    if (!state.chapters.length) return;
    state.index = Math.max(0, Math.min(state.chapters.length - 1, i));
    const c = state.chapters[state.index];
    titleEl.textContent = c.title || c.id;
    // 渲染器未就绪就先出占位，加载完再补写（期间又翻章则放弃，避免覆盖错章节）
    if (window.marked && window.DOMPurify) {
      paintBody(c);
    } else {
      body.innerHTML = '<p class="md-pending">正在准备阅读器…</p>';
      const load = window.ensureMarkdown ? window.ensureMarkdown() : Promise.resolve(false);
      load.then(() => {
        if (state.chapters[state.index] === c) paintBody(c);
      });
    }
    renderDrawer();

    const prev = document.getElementById('novel-prev');
    const next = document.getElementById('novel-next');
    prev.disabled = state.index === 0;
    next.disabled = state.index === state.chapters.length - 1;

    document.getElementById('novel-progress').textContent = `${state.index + 1} / ${state.chapters.length}`;
    history.replaceState(null, '', `#${state.book.id}/${c.id}`);

    if (restoreScroll) {
      window.requestAnimationFrame(() => window.scrollTo({ top: restoreScroll, behavior: 'auto' }));
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    document.title = `${c.title || ''} · ${state.book.title || ''} | ${(window.SITE_CONFIG || {}).name || ''}`;
  }

  function save() {
    if (!state.book || !state.chapters.length) return;
    set(K_LAST(state.book.id), JSON.stringify({ chapter: state.chapters[state.index].id, scroll: Math.round(window.scrollY) }));
  }

  function open(book, index, restoreScroll) {
    state.book = book;
    state.chapters = flat(book);
    shelf.hidden = true;
    reader.hidden = false;
    document.getElementById('novel-book-title').textContent = book.title || '';
    document.getElementById('novel-book-meta').textContent = `${book.author || ''} · ${state.chapters.length} 章`;
    const tip = document.getElementById('novel-sample-tip');
    if (tip) tip.hidden = !book.sample;
    go(index || 0, restoreScroll);
  }

  function backToShelf() {
    save();
    reader.hidden = true;
    shelf.hidden = false;
    document.documentElement.classList.remove('novel-immersive');
    history.replaceState(null, '', location.pathname);
    document.title = `连载 | ${(window.SITE_CONFIG || {}).name || ''}`;
  }

  // ---- 事件绑定 ----
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  on('novel-back', backToShelf);
  on('novel-toc-open', openDrawer);
  on('novel-toc-close', closeDrawer);
  on('novel-prev', () => { go(state.index - 1); save(); });
  on('novel-next', () => { go(state.index + 1); save(); });
  on('novel-immersive', () => document.documentElement.classList.toggle('novel-immersive'));
  on('novel-immersive-exit', () => document.documentElement.classList.remove('novel-immersive'));
  on('novel-tip-close', () => {
    const tip = document.getElementById('novel-sample-tip');
    if (tip) tip.hidden = true;
    set('sj.novel.tip', 'off');       // 与站点其它偏好一样走 localStorage
  });

  const sizeEl = document.getElementById('novel-size');
  if (sizeEl) sizeEl.addEventListener('input', () => { state.type.size = Number(sizeEl.value); set(K_TYPE, JSON.stringify(state.type)); applyType(); });
  const lhEl = document.getElementById('novel-lh');
  if (lhEl) lhEl.addEventListener('input', () => { state.type.lh = Number(lhEl.value); set(K_TYPE, JSON.stringify(state.type)); applyType(); });

  // 键盘：←/→ 翻章（抽屉打开时交给抽屉处理）；Esc 退出沉浸
  document.addEventListener('keydown', (e) => {
    if (reader.hidden || !state.book) return;
    const tag = (document.activeElement || {}).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft') { go(state.index - 1); save(); }
    else if (e.key === 'ArrowRight') { go(state.index + 1); save(); }
    else if (e.key === 'Escape' && document.documentElement.classList.contains('novel-immersive')) {
      document.documentElement.classList.remove('novel-immersive');
    }
  });

  // 滚动停 500ms 记一次进度（节流，不写帧）
  let saveT = 0;
  window.addEventListener('scroll', () => {
    clearTimeout(saveT);
    saveT = setTimeout(save, 500);
  }, { passive: true });

  function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- 启动：先渲染书架，再按深链决定是否直接进阅读 ----
  applyType();
  renderShelf();

  const m = /^#([\w-]+)\/([\w-]+)$/.exec(location.hash || '');
  if (m) {
    const book = BOOKS.find((b) => b.id === m[1]);
    if (book) {
      const chs = flat(book);
      const idx = chs.findIndex((c) => c.id === m[2]);
      if (idx >= 0) open(book, idx, 0);
    }
  }
  if (get('sj.novel.tip') === 'off') {
    const tip = document.getElementById('novel-sample-tip');
    if (tip) tip.hidden = true;
  }
})();
