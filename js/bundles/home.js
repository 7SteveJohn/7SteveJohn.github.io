// build-bundles: {"name":"home","version":"9d03bd7b969c","sources":[{"path":"js/search.js","sha256":"0a6ebd1c951e7e46426ca2fa5497bd25e143f2c0fed8755a7d30f9d565319fc9"},{"path":"js/video-gate.js","sha256":"31c5a72caf1e34746746063d51e8c686a5924467e08c09cfc569cee5208e61b7"},{"path":"js/app.js","sha256":"1b02486bc6a7eec10061eab38bb05c3311b7dfcbda5e2f61abca026611a04c5f"},{"path":"js/nav-indicator.js","sha256":"6af08d84d883f9627327d7bd421a2d2d2c513df369552cdc36fecb424dbdfbd5"},{"path":"js/player.js","sha256":"8ca8a374c56f02e0f669c18f081e2b0fc3067786ab770c3ac9e5aeecec04eb33"}]}
/* 仅首页：搜索 → 视频门控 → 主应用 → 导航胶囊 → 播放器
   ❗生成物：由 node scripts/build-bundles.mjs 从下列源文件拼接，请改源文件后重建。
   源文件顺序：js/search.js → js/video-gate.js → js/app.js → js/nav-indicator.js → js/player.js */

// ---- js/search.js (0a6ebd1c951e) ----
/**
 * ⌘K 站内搜索命令面板 (search.js)
 * ----------------------------------------------------
 * - 零依赖：索引直接取自 projects.js / articles.js + 页面锚点区块
 * - 多关键词 AND 匹配，标题 > 标签/摘要 > 正文的加权评分，命中片段 <mark> 高亮
 * - ↑ ↓ 选择、Enter 打开、Esc 关闭；Ctrl/⌘+K 或 "/" 随时唤起
 * - 结果支持三类：文字内容（手记/小说/随笔）、个人工具、页面区块
 */
(function () {
  const palette = document.getElementById('search-palette');
  const input = document.getElementById('search-input');
  const resultsEl = document.getElementById('search-results');
  const openBtn = document.getElementById('search-open');
  if (!palette || !input || !resultsEl) return;

  let items = [];
  let filtered = [];
  let selected = 0;
  let lastFocus = null;

  /* ---------- 索引 ---------- */
  function buildIndex() {
    items = [];

    (window.ARTICLES_DATA || []).forEach((a) => {
      items.push({
        type: '文章',
        typeColor: '#86868b',
        title: a.title,
        summary: a.summary || '',
        meta: [a.category || '技术手记', a.date].filter(Boolean).join(' · '),
        keywords: [a.category || '', ...(a.tags || []), a.summary || ''],
        body: a.content || '',
        run: (q) => window.openArticleModal(a.id, false, { highlightQuery: q })
      });
    });

    (window.PROJECTS_DATA || []).forEach((p) => {
      items.push({
        type: '工具',
        typeColor: '#86868b',
        title: p.title,
        summary: p.description || '',
        meta: p.categoryName || p.category || '',
        keywords: [p.categoryName || '', ...(p.tags || []), p.description || ''],
        body: p.details || '',
        run: (q) => window.openProjectModal(p.id, { highlightQuery: q })
      });
    });

    [
      ['概览', '#home'],
      ['个人工具', '#products'],
      ['理念', '#philosophy'],
      ['AI 学习', '#ai'],
      ['技术手记', '#blog'],
      ['创作', '#creation'],
      ['随笔', '#essays'],
      ['关于', '#about']
    ].forEach(([label, href]) => {
      if (!document.querySelector(href)) return;
      items.push({
        type: '区块',
        typeColor: '#8e8e93',
        title: label,
        meta: '页面区块',
        keywords: ['区块', '导航', label],
        body: '',
        run: () => {
          const target = document.querySelector(href);
          if (!target) return;
          const y = href === '#home' ? 0 : target.getBoundingClientRect().top + window.scrollY - 64;
          if (window.smoothScrollTo) window.smoothScrollTo(Math.max(0, y));
          else window.scrollTo(0, Math.max(0, y));
          history.pushState(null, '', href);
        }
      });
    });
  }

  /* ---------- 检索 ---------- */
  function search(query) {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    return items
      .map((item) => {
        const haystackTitle = item.title.toLowerCase();
        const haystackKeywords = item.keywords.join(' ').toLowerCase();
        const haystackBody = (item.body || '').toLowerCase();
        let score = 0;
        for (const t of tokens) {
          let s = 0;
          if (haystackTitle.includes(t)) s += 100;
          if (haystackKeywords.includes(t)) s += 40;
          if (haystackBody.includes(t)) s += 10;
          if (s === 0) return null; // 所有关键词都需命中（AND）
          score += s;
        }
        return { item, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.item);
  }

  /* ---------- 渲染 ---------- */
  function highlight(text, query) {
    let html = escapeHtml(text);
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    tokens.forEach((t) => {
      const safe = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(`(${safe})`, 'gi'), '<mark>$1</mark>');
    });
    return html;
  }

  function render(query) {
    filtered = search(query);
    selected = 0;
    if (!query) {
      resultsEl.innerHTML = '<div class="search-empty">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>'
        + '<p class="t1">输入关键词搜索手记、小说、工具</p>'
        + '<p class="t2">或用 ↑ ↓ 选择区块</p>'
        + '</div>';
      return;
    }
    if (!filtered.length) {
      resultsEl.innerHTML = '<div class="search-empty">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>'
        + '<p class="t1">没有找到相关内容</p>'
        + '<p class="t2">换个关键词试试</p>'
        + '</div>';
      return;
    }
    resultsEl.innerHTML = filtered
      .map((item, i) => {
        // 标题未直接命中时（命中在标签/摘要/正文），展示带高亮的摘要片段说明命中原因
        const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
        const titleHit = tokens.some((t) => item.title.toLowerCase().includes(t));
        const snippet = !titleHit && item.summary
          ? `<span class="block text-xs text-[#86868b] truncate mt-0.5">${highlight(item.summary.slice(0, 90), query)}</span>`
          : '';
        return `
      <button type="button" role="option" data-index="${i}" aria-selected="${i === selected}"
        class="search-item w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-3 transition-colors ${i === selected ? 'is-selected' : ''}">
        <span class="flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono border" style="color:${item.typeColor};border-color:${item.typeColor}44;background:${item.typeColor}14">${item.type}</span>
        <span class="min-w-0">
          <span class="block text-sm font-medium text-[#1d1d1f] dark:text-white truncate">${highlight(item.title, query)}</span>
          ${snippet}
          <span class="block text-xs text-[#86868b] truncate">${escapeHtml(item.meta)}</span>
        </span>
      </button>`;
      })
      .join('');
    if (window.lucide) window.lucide.createIcons();
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function updateSelection() {
    resultsEl.querySelectorAll('.search-item').forEach((el) => {
      const isSel = Number(el.dataset.index) === selected;
      el.classList.toggle('is-selected', isSel);
      el.setAttribute('aria-selected', String(isSel));
      if (isSel) el.scrollIntoView({ block: 'nearest' });
    });
  }

  function runSelected() {
    const item = filtered[selected];
    if (!item) return;
    const activeQuery = input.value.trim();
    close();
    // 等面板关闭、滚动锁释放后再执行跳转，并将检索词传入阅读器触发 CSS.highlights 原生高亮
    setTimeout(() => item.run(activeQuery), 60);
  }

  /* ---------- 开关 ---------- */
  function open() {
    if (!palette.classList.contains('hidden') && !palette.classList.contains('is-closing')) return;
    const hadFull = window.__ARTICLES_FULL_LOADED === true
      || (Array.isArray(window.ARTICLES_DATA) && window.ARTICLES_DATA.some((a) => typeof a.content === 'string' && a.content.length > 0));
    buildIndex();
    if (!hadFull && typeof window.ensureArticles === 'function') {
      window.ensureArticles().then((ok) => {
        if (!ok) return;
        buildIndex();
        const q = input.value.trim();
        if (q && !palette.classList.contains('hidden') && !palette.classList.contains('is-closing')) {
          render(q);
        }
      });
    }
    lastFocus = document.activeElement;
    if (palette._closeTimer) { clearTimeout(palette._closeTimer); palette._closeTimer = null; }
    palette.classList.remove('hidden', 'is-closing');
    document.body.style.overflow = 'hidden';
    input.value = '';
    render('');
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  function close() {
    if (palette.classList.contains('hidden') || palette.classList.contains('is-closing')) return;
    const articleModal = document.getElementById('article-modal');
    const projectModal = document.getElementById('project-modal');
    const hasOpenModal =
      (articleModal && !articleModal.classList.contains('hidden') && !articleModal.classList.contains('is-closing')) ||
      (projectModal && !projectModal.classList.contains('hidden') && !projectModal.classList.contains('is-closing'));
    if (!hasOpenModal) document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    // 收起淡出（与弹窗同款退场节奏），动画结束后再隐藏
    palette.classList.add('is-closing');
    if (palette._closeTimer) clearTimeout(palette._closeTimer);
    palette._closeTimer = setTimeout(() => {
      palette.classList.add('hidden');
      palette.classList.remove('is-closing');
      palette._closeTimer = null;
    }, 220);
  }

  function toggle() {
    if (palette.classList.contains('hidden') || palette.classList.contains('is-closing')) open();
    else close();
  }

  /* ---------- 事件 ---------- */
  if (openBtn) openBtn.addEventListener('click', open);

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')) {
      e.preventDefault();
      toggle();
      return;
    }
    // "/" 快速唤起（输入框内不触发）
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      open();
      return;
    }
    if (palette.classList.contains('hidden')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      close();
      return;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length) {
        selected = (selected + 1) % filtered.length;
        updateSelection();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length) {
        selected = (selected - 1 + filtered.length) % filtered.length;
        updateSelection();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runSelected();
    }
  }, true); // 捕获阶段：Esc 只关面板，不穿透到文章弹窗

  input.addEventListener('input', () => render(input.value.trim()));

  resultsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.search-item');
    if (!btn) return;
    selected = Number(btn.dataset.index);
    runSelected();
  });

  resultsEl.addEventListener('mouseover', (e) => {
    const btn = e.target.closest('.search-item');
    if (!btn) return;
    selected = Number(btn.dataset.index);
    updateSelection();
  });

  // 点击遮罩关闭
  palette.addEventListener('click', (e) => {
    if (e.target === palette) close();
  });

  // 随便看看：随机打开一篇旧文（盘活历史内容）
  const randomBtn = document.getElementById('search-random');
  if (randomBtn) {
    randomBtn.addEventListener('click', () => {
      buildIndex();
      const articles = items.filter((it) => it.type === '文章');
      if (!articles.length) return;
      const pick = articles[Math.floor(Math.random() * articles.length)];
      close();
      setTimeout(() => pick.run(), 60);
    });
  }

  // 支持深链或次级页按 Ctrl+K 传参 ?search=1 唤起搜索
  if (new URLSearchParams(location.search).get('search') === '1') {
    setTimeout(open, 80);
    try {
      const u = new URL(location.href);
      u.searchParams.delete('search');
      const qs = u.searchParams.toString();
      history.replaceState(null, '', u.pathname + (qs ? '?' + qs : '') + (u.hash || ''));
    } catch (_) {}
  }
})();

;

// ---- js/video-gate.js (31c5a72caf1e) ----
/**
 * 介绍视频「海报 + 播放键」体验（2026-09-30，C1；同日修不显示 bug）
 * ----------------------------------------------------
 * 播放前：视频不带原生 controls（黑底控制条与卡片气质不搭），海报上叠一枚居中
 * 圆形播放键；点击后移除覆盖层并唤出原生控件 + 播放。视频结束/暂停时恢复覆盖层。
 * ⚠️ 覆盖层必须挂在 .cover-box 父容器上，不能做 <video> 的子元素——video 是
 *    替换元素，内部子元素渲染不一致（桌面 Chromium 显示、移动端内核直接 0×0
 *    不渲染，实测），这正是"视频播放键不见了"的根因。
 * 与视频×音乐互斥（player.js）天然协同：本模块只动覆盖层，不碰 play/pause 链。
 */
(function () {
  'use strict';

  // 近屏元信息 + 悬停/触控/聚焦关键帧预热：
  // 1. 首屏所有视频保持 preload=none（零首屏带宽消耗）
  // 2. 用户滚动进入卡片附近（rootMargin 600px）升级为 preload=metadata
  // 3. 指针悬停 / 触控 / 聚焦卡片或 .cover-box 时立即升级 preload=auto 缓冲起播关键帧，
  //    canplay 后（或 8s 兜底）在仍暂停态回落到 metadata（保留已缓冲帧与解码器就绪，不再退回 none）
  // 2G / 省流量模式不执行 auto 预热。
  const canWarm = () => {
    const c = navigator.connection;
    return !(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
  };
  let metaScheduled = false;

  function promoteMetadata(v) {
    if (!v) return;
    if (v.preload === 'none') {
      v.preload = 'metadata';
    }
  }

  function warm(v) {
    if (!canWarm() || !v || v.dataset.warmed === '1' || !v.paused || v.dataset.opening === '1') return;
    v.dataset.warmed = '1';
    // 若已达到 HAVE_FUTURE_DATA（readyState >= 3），说明起播关键帧已就绪，直接保持 metadata 即可
    if (v.readyState >= 3) {
      if (v.preload !== 'metadata') v.preload = 'metadata';
      return;
    }
    v.preload = 'auto';
    let settled = false;
    const dialBack = () => {
      if (settled) return;
      settled = true;
      v.removeEventListener('canplay', dialBack);
      if (v.paused && v.dataset.opening !== '1') {
        v.preload = 'metadata';   // 保留已缓冲起播帧与元数据，绝不回落到 none
      }
    };
    v.addEventListener('canplay', dialBack, { once: true });
    if (v.readyState >= 3) dialBack();
    else setTimeout(dialBack, 8000);
  }

  function scheduleMetadata() {
    if (metaScheduled || !('IntersectionObserver' in window)) return;
    metaScheduled = true;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const v = en.target.querySelector('video.cover-video');
        io.unobserve(en.target);
        promoteMetadata(v);
      });
    }, { rootMargin: '600px 0px' });
    document.querySelectorAll('#products .cover-box').forEach((box) => io.observe(box));
  }

  function init() {
    document.querySelectorAll('#products video.cover-video').forEach((v) => {
      if (v.dataset.playGate) return;
      v.dataset.playGate = '1';
      v.removeAttribute('controls');            // 播放前不显示原生控制条

      const box = v.closest('.cover-box') || v.parentElement;
      const card = v.closest('article[data-project-id]') || box;
      const layer = document.createElement('div');
      layer.className = 'video-play-gate';
      layer.setAttribute('aria-hidden', 'false');
      layer.innerHTML =
        '<button type="button" class="video-play-btn" aria-label="播放介绍视频">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
        '</button>';

      let openToken = 0;
      let fromGateClick = false;

      function close(force) {
        if (force) {
          openToken++;
          fromGateClick = false;
          delete v.dataset.opening;
        }
        if (!force && !layer.isConnected && !v.paused) return;
        if (!layer.isConnected) box.appendChild(layer);
        layer.classList.remove('is-loading');
        v.removeAttribute('controls');
      }

      function open() {
        if (v.dataset.opening === '1' || !v.paused) return;
        const myToken = ++openToken;
        fromGateClick = true;
        // 先标 opening + 通知互斥层暂停音乐，再停其他视频并起播，彻底消除音视频重叠空窗
        v.dataset.opening = '1';
        try {
          window.dispatchEvent(new CustomEvent('sj-video-intent', { detail: { video: v } }));
        } catch (_) {}

        document.querySelectorAll('#products video').forEach((other) => {
          if (other === v) return;
          if (!other.paused || other.dataset.opening === '1') {
            delete other.dataset.opening;
            if (!other.paused) {
              try { other.pause(); } catch (_) {}
            }
            try {
              window.dispatchEvent(new CustomEvent('sj-video-force-stop', { detail: { video: other } }));
            } catch (_) {}
          }
        });

        // 海报先留着：等真正出画（playing）再撤覆盖层，避免点完先闪一块黑。
        layer.classList.add('is-loading');
        v.preload = 'auto';
        v.setAttribute('controls', '');

        const p = v.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            if (openToken !== myToken) {
              delete v.dataset.opening;
              try { v.pause(); } catch (_) {}
              close(true);
            }
          }).catch(() => {
            const stillMine = (openToken === myToken);
            delete v.dataset.opening;
            close(true);
            if (stillMine) {
              try {
                window.dispatchEvent(new CustomEvent('sj-video-abort', { detail: { video: v } }));
              } catch (_) {}
            }
          });
        }
      }

      layer.addEventListener('click', open);
      v.addEventListener('playing', () => {
        if (v.paused) return;
        delete v.dataset.opening;
        layer.classList.remove('is-loading');
        if (layer.isConnected) layer.remove();
        if (!v.hasAttribute('controls')) v.setAttribute('controls', '');
        if (fromGateClick) {
          fromGateClick = false;
          try { v.focus({ preventScroll: true }); } catch (_) {}
        }
      });
      v.addEventListener('ended', () => {
        delete v.dataset.opening;
        close(true);
      });
      v.addEventListener('pause', () => {
        delete v.dataset.opening;
        close(true);
      });

      window.addEventListener('sj-video-force-stop', (ev) => {
        if (ev.detail && ev.detail.video === v) {
          openToken++;
          fromGateClick = false;
          delete v.dataset.opening;
          if (!v.paused) {
            try { v.pause(); } catch (_) {}
          }
          close(true);
        }
      });
      window.addEventListener('sj-video-abort', (ev) => {
        if (ev.detail && ev.detail.video === v) {
          openToken++;
          fromGateClick = false;
          delete v.dataset.opening;
          if (!v.paused) {
            try { v.pause(); } catch (_) {}
          }
          close(true);
        }
      });

      box.appendChild(layer);

      // 首屏保持 preload=none，避免初始载入抢跑下载视频
      if (v.preload !== 'none') {
        v.preload = 'none';
      }

      // 悬停 / 触控 / 聚焦产品卡片或视频视窗即刻预热关键帧
      const triggerWarm = () => warm(v);
      card.addEventListener('pointerenter', triggerWarm, { once: true, passive: true });
      card.addEventListener('touchstart', triggerWarm, { once: true, passive: true });
      card.addEventListener('focusin', triggerWarm, { once: true, passive: true });
    });

    // 只在用户开始浏览（滚动）后再挂近屏 metadata 预加载：首屏零带宽消耗
    const arm = () => scheduleMetadata();
    window.addEventListener('scroll', arm, { once: true, passive: true });
    if (window.scrollY > 0) arm();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

;

// ---- js/app.js (1b02486bc6a7) ----
/**
 * 个人网站核心交互脚本 (app.js)
 * 极简、干脆、快速，无多余性能开销
 */

/* 代码高亮按需加载：highlight.min.js 119KB + 主题 CSS，只有正文里真有代码块时才值得拉。
   首屏不带（2026-09-30 性能体检：手机 4G 首屏因此少 120KB）。加载完自动回来补高亮。 */
function ensureHighlight(root) {
  const run = (scope) => scope.querySelectorAll('pre code').forEach((el) => window.hljs.highlightElement(el));
  if (window.hljs) { run(root); return; }
  if (!root || !root.querySelector('pre code')) return;   // 这份内容没有代码块，不加载
  if (ensureHighlight.loading) return;
  ensureHighlight.loading = true;
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'assets/vendor/github-dark.min.css';
  document.head.appendChild(css);
  const js = document.createElement('script');
  js.src = 'assets/vendor/highlight.min.js';
  js.onload = () => {
    ensureHighlight.loading = false;
    // 补高亮：打开中的弹窗正文此时已经渲染过，直接全量补一遍（隐藏的弹窗无成本）
    document.querySelectorAll('.markdown-body').forEach(run);
  };
  js.onerror = () => { ensureHighlight.loading = false; };
  document.head.appendChild(js);
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化主题（暗色/亮色）
  initTheme();

  // 2. 将 projects.js 中的下载/仓库链接水合到产品卡片（单一数据源）
  hydrateProductLinks();

  // 3. 渲染四个文字模块：技术手记 / 创作（小说·游戏创作）/ 随笔 / AI 学习（无内容自动隐藏）
  initArticles();

  // 3.5 技术手记区：札签卷宗 ⇄ 文章列表视图切换（cards.js 懒加载，sj.blogView 记忆）
  initBlogCards();

  // 4. 初始化移动端抽屉菜单与滚动状态导航
  initNavigation();
  initNavScrollState();
  // 2026-10-17：滚轮阻尼滚动已撤（见 smoothScrollTo 处注释），滚动交回浏览器原生
  initSmoothAnchors();
  initScrollSpy();
  initPageNext();
  initProjectSnap();   // 产品区滚动吸附（snap-products 只在这一段挂）

 // 5. 滚动浮现编排（ section reveal，含错峰）
  observeReveals();

  // 6. 页脚版权年份自动更新
  initFooterYear();

  // 7. 阅读进度条监听（弹窗内滚动）
  initArticleProgress();

  // 8. 首屏交互：时段问候 / 作品索引 / 最近更新 / 液态玻璃光泽
  initHeroGreeting();
  initHeroIndex();
  initHeroUpdated();
  initGlassSpec();

  // 7. 支持 ?post=文章id 深链（分享单篇内容链接）
  const postId = new URLSearchParams(location.search).get('post');
  if (postId) {
    window.openArticleModal(postId, true);
  }

  // 8. 渲染图标
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 9. Service Worker 离线缓存（仅安全上下文且非 file:// 环境生效）
  if ('serviceWorker' in navigator && window.isSecureContext && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // 10. 首屏后空闲静默预取文章正文（省流量 / 2G 跳过），确保随后点文章或 ⌘K 全文检索零等待
  const scheduleIdleArticles = () => {
    const c = navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return;
    const warmArticles = () => {
      const conn = navigator.connection;
      if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) return;
      if (typeof window.ensureArticles === 'function') window.ensureArticles();
    };
    setTimeout(() => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(warmArticles, { timeout: 2200 });
      } else {
        setTimeout(warmArticles, 1700);
      }
    }, 1800);
  };
  if (document.readyState === 'complete') scheduleIdleArticles();
  else window.addEventListener('load', scheduleIdleArticles, { once: true });

});

/* ============================================================
   1. 主题管理 (Dark / Light Mode)
   ============================================================ */
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const mobileThemeToggleBtn = document.getElementById('mobile-theme-toggle');
  
  // 默认晨曦明亮科技风（通透开阔、告别压抑沉闷）：白昼晨曦底色与高质感光影
  try {
    if (localStorage.getItem('sj.theme-v6') !== 'daylight-v1') {
      localStorage.removeItem('sj.theme');
      localStorage.setItem('sj.theme-v6', 'daylight-v1');
    }
  } catch (_) {}

  const syncColorScheme = (isDark) => {
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.content = isDark ? 'dark' : 'light';
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.content = isDark ? '#060911' : '#f8fafc';
  };

  let savedTheme = null;
  try { savedTheme = localStorage.getItem('sj.theme'); } catch (_) {}
  const initDark = savedTheme === 'dark';
  document.documentElement.classList.toggle('dark', initDark);
  syncColorScheme(initDark);

  window.addEventListener('storage', (ev) => {
    if (ev.key === 'sj.theme') {
      const nextDark = ev.newValue === 'dark';
      document.documentElement.classList.toggle('dark', nextDark);
      syncColorScheme(nextDark);
    }
  });

  let vtBusy = false;
  function toggle(e) {
    const applyNow = () => {
      const isDark = document.documentElement.classList.toggle('dark');
      syncColorScheme(isDark);
      try { localStorage.setItem('sj.theme', isDark ? 'dark' : 'light'); } catch (_) {}   // 全站访客本地键统一 sj. 前缀
    };

    // 明暗切换：从点击位置圆形扩散开新主题（View Transitions，减少动效或过渡进行中时直接切换）
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduce && !vtBusy) {
      vtBusy = true;
      const rect = (e && e.currentTarget ? e.currentTarget : themeToggleBtn).getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const vt = document.startViewTransition(applyNow);
      vt.ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 480, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(() => {});
      vt.finished.finally(() => { vtBusy = false; });
    } else {
      applyNow();
    }
    if (window.lucide) window.lucide.createIcons();
  }

  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggle);
  if (mobileThemeToggleBtn) mobileThemeToggleBtn.addEventListener('click', toggle);
}

/* ============================================================
   2. 项目作品集模块 (Projects)
   ============================================================ */
/* 将 projects.js 数据水合到首页产品卡片（下载/仓库/Releases 链接与提取码单一数据源） */
/* 项目「角色 / 技术难点」两行：数据只写在 projects.js，卡片与详情弹窗共用同一份 */
// 卡片上的「技术难点」只保留首句钩子：第一句说的正是"难在哪"，后面的解法细节
// 属于「了解更多」弹窗（2026-09-30 用户反馈：卡片上难点文字太多，一张卡被长文压垮）
function challengeHook(challenge) {
  const text = String(challenge || '');
  const m = text.match(/^[\s\S]*?[。！？]/);
  let hook = m ? m[0] : text;
  if (hook.length > 64) hook = hook.slice(0, 63).replace(/[，、；：,;]$/, '') + '……';
  return hook;
}

// hookOnly：卡片传 true（首句钩子），弹窗不传（全文）
function buildProjectFacts(project, hookOnly) {
  return [
    ['角色', project.role],
    ['技术难点', hookOnly ? challengeHook(project.challenge) : project.challenge]
  ]
    .filter(([, value]) => value)
    .map(([key, value]) => `
      <div class="pf-row">
        <span class="pf-k">${escapeHtml(key)}</span>
        <span class="pf-v">${escapeHtml(value)}</span>
      </div>`)
    .join('');
}

// 更新公告：精炼胶囊指示条，嵌入产品卡左栏（完整版在详情弹窗）
function buildAnnouncement(project) {
  const a = project.announcement;
  if (!a || !Array.isArray(a.items) || !a.items.length) return '';
  const ver = a.version ? `<span class="announce-ver font-mono">${escapeHtml(a.version)}</span>` : '';
  const summaryText = escapeHtml(a.summary || a.items.join(' / '));
  const line = [ver, summaryText].filter(Boolean).join(' · ');
  const more = Array.isArray(project.changelog) && project.changelog.length
    ? `<button class="announce-more cursor-pointer" data-open-project="${escapeHtml(project.id)}" data-open-changelog>全部 ${project.changelog.length} 个版本 →</button>`
    : '';
  return `
    <div class="announce-card" aria-hidden="true">
      <div class="announce-top"><span class="announce-label">更新公告</span>${ver}</div>
      <ul class="announce-items">${a.items.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
      ${a.date ? `<div class="announce-date">${escapeHtml(a.date)}</div>` : ''}
    </div>
    <div class="announce-line" role="note" aria-label="最新版本公告">
      <span class="announce-dot" aria-hidden="true"></span>
      <span class="announce-line-text">${line}</span>
      ${more}
    </div>`;
}

// 更新记录（全部版本）：来自 projects.js 的 changelog，弹窗里折叠展示
function buildChangelog(project) {
  const list = Array.isArray(project.changelog) ? project.changelog : [];
  if (!list.length) return '';
  const items = list.map((e) => `
    <div class="cl-item">
      <div class="cl-head"><span class="cl-v">${escapeHtml(e.v || '')}</span><span class="cl-date">${escapeHtml(e.date || '')}</span></div>
      ${Array.isArray(e.items) && e.items.length ? `<ul class="cl-list">${e.items.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>` : ''}
    </div>`).join('');
  return `
    <details class="changelog">
      <summary><span>更新记录</span><span class="cl-count">${list.length} 个版本</span></summary>
      <div class="cl-body">${items}</div>
    </details>`;
}

function hydrateProductLinks() {
  document.querySelectorAll('article[data-project-id]').forEach(card => {
    const project = (window.PROJECTS_DATA || []).find(p => p.id === card.dataset.projectId);
    if (!project) return;

    // 首屏作品索引的版本号：静态 HTML 只作无 JS 兜底，这里按数据源对齐，升版不用再手改
    const hiVer = document.querySelector(`[data-hi="${project.id}"] .hi-ver`);
    if (hiVer && project.version) hiVer.textContent = project.version;

    // 卡片上的两行署名信息（容器在 index.html 里是空壳，没数据就保持隐藏）
    const facts = card.querySelector('[data-facts]');
    const factsHtml = buildProjectFacts(project, true);
    if (facts && factsHtml) {
      facts.innerHTML = factsHtml;
      facts.hidden = false;
    }

    const linkMap = {
      download: project.downloadUrl,
      releases: project.demoUrl,
      github: project.githubUrl
    };
    Object.entries(linkMap).forEach(([role, url]) => {
      const anchor = card.querySelector(`[data-link="${role}"]`);
      if (anchor && url) anchor.href = url;
    });

    const downloadAnchor = card.querySelector('[data-link="download"]');
    if (downloadAnchor && project.downloadPwd) {
      downloadAnchor.dataset.copyPwd = project.downloadPwd;
    }

    const pwd = card.querySelector('[data-pwd]');
    if (pwd) pwd.textContent = project.downloadPwd ? ` (提取码: ${project.downloadPwd})` : '';

    // 更新公告（数据驱动：只给写了 announcement 的项目渲染，插在卡片内 h3 标题下方）
    const existingAside = card.querySelector('.card-announce');
    if (existingAside) existingAside.remove();
    const announceHtml = buildAnnouncement(project);
    if (announceHtml) {
      const aside = document.createElement('aside');
      aside.className = 'card-announce';
      aside.setAttribute('aria-label', '更新公告');
      aside.innerHTML = announceHtml;
      const titleEl = card.querySelector('h3');
      if (titleEl) {
        titleEl.insertAdjacentElement('afterend', aside);
      } else {
        const bodyCol = card.querySelector('.p-8, .p-6, div:not(.window-header)');
        if (bodyCol) bodyCol.appendChild(aside);
        else card.appendChild(aside);
      }
      card.classList.add('has-announce');
    }
  });
}

// 弹窗遮挡保护：打开文章或项目详情弹窗时暂停一切在播/起播中的介绍视频，避免后台继续发声
function pauseActiveProductVideos() {
  document.querySelectorAll('#products video').forEach((v) => {
    const wasOpening = v.dataset.opening === '1';
    if (!v.paused || wasOpening) {
      delete v.dataset.opening;
      if (!v.paused) {
        try { v.pause(); } catch (_) {}
      }
      try {
        window.dispatchEvent(new CustomEvent(wasOpening ? 'sj-video-abort' : 'sj-video-force-stop', { detail: { video: v } }));
      } catch (_) {}
    }
  });
}

// 打开项目详情弹窗
window.openProjectModal = function(id, opts = {}) {
  const project = (window.PROJECTS_DATA || []).find(p => p.id === id);
  if (!project) {
    // 新增项目后，旧版 SW 可能缓存了不含该项目的 projects.js，导致点击静默无反应。
    // 带唯一参数补拉一次数据文件再打开，避免用户看到「点不开」。
    if (!window.__projectsRetry) {
      window.__projectsRetry = true;
      const s = document.createElement('script');
      s.src = 'js/projects.js?retry=' + Date.now();
      s.onload = () => { window.__projectsRetry = false; window.openProjectModal(id, opts); };
      s.onerror = () => { window.__projectsRetry = false; };
      document.head.appendChild(s);
    }
    return;
  }

  pauseActiveProductVideos();

  const modal = document.getElementById('project-modal');
  const modalContent = document.getElementById('project-modal-content');
  if (!modal || !modalContent) return;
  if (modal._closeTimer) { clearTimeout(modal._closeTimer); modal._closeTimer = null; }
  modal.classList.remove('is-closing');
  modal._lastFocus = document.activeElement;

  const wantChangelog = Boolean(opts && opts.openChangelog) || modalContent.dataset.openChangelog === '1';
  if (wantChangelog) modalContent.dataset.openChangelog = '1';

  const barTitle = document.getElementById('project-bar-title');
  if (barTitle) barTitle.textContent = project.title || '';
  const barCategory = document.getElementById('project-bar-category');
  if (barCategory) barCategory.textContent = project.categoryName || project.category || '项目详情';

  // Markdown 渲染器按需加载（2026-10-17）：先出骨架，正文等渲染器就绪后补写
  const needMd = !(window.marked && window.DOMPurify);
  const detailsHtml = project.details
    ? (needMd
      ? '<p class="md-pending">正在准备阅读器…</p>'
      : sanitizeMarkdownHtml(window.marked.parse(project.details)))
    : `<p class="text-[#86868b]">暂无更多详细说明。</p>`;

  const factsHtml = buildProjectFacts(project);

  modalContent.innerHTML = `
    <div class="p-6 sm:p-8 space-y-6">
      <!-- 头部 -->
      <div class="space-y-2 border-b border-black/10 dark:border-white/10 pb-5">
        ${project.archived ? `
        <div class="flex items-center gap-2">
          <span class="archived-badge">历史项目</span>
        </div>` : ''}
        <h2 class="text-2xl font-semibold text-[#1d1d1f] dark:text-white tracking-tight">${escapeHtml(project.title)}</h2>
        <p class="text-[#86868b] text-sm sm:text-base leading-relaxed">${escapeHtml(project.description)}</p>
      </div>

      <!-- 标签 -->
      <div class="flex flex-wrap gap-1.5">
        ${(project.tags || []).map(tag => `
          <span class="text-xs px-2.5 py-1 rounded-md bg-black/5 dark:bg-white/10 text-[#86868b] dark:text-slate-300 font-mono">
            ${escapeHtml(tag)}
          </span>
        `).join('')}
      </div>

      ${factsHtml ? `
      <!-- 角色 / 技术难点与解法 -->
      <div class="project-facts">${factsHtml}</div>
      ` : ''}

      ${(project.version || project.updated || project.requires || project.sha256) ? `
      <!-- 版本 / 运行环境 / 校验：纯净轻量呈现，无多余边框与脏底色 -->
      <div class="space-y-1.5 text-xs pt-1">
        ${project.version ? `<div class="flex items-center gap-2 text-[#86868b]"><span class="shrink-0">当前版本</span><span class="font-mono text-[#1d1d1f] dark:text-[#f5f5f7]">${escapeHtml(project.version)}${project.updated ? ' · ' + escapeHtml(project.updated) : ''}</span></div>` : ''}
        ${project.requires ? `<div class="flex items-center gap-2 text-[#86868b]"><span class="shrink-0">运行环境</span><span class="text-[#1d1d1f] dark:text-[#f5f5f7]">${escapeHtml(project.requires)}</span></div>` : ''}
        ${project.sha256 ? `<div class="flex items-center gap-2 text-[#86868b]"><span class="shrink-0">SHA256</span><span class="font-mono text-[#1d1d1f] dark:text-[#f5f5f7] break-all">${escapeHtml(project.sha256)}</span></div>` : ''}
      </div>
      ` : ''}
      ${buildChangelog(project)}

      ${(project.image && !project.details?.includes('<img')) ? `
      <!-- 项目封面横幅（回退保障） -->
      <div class="w-full rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 aspect-[16/9] max-h-72">
        <img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}" class="w-full h-full object-cover">
      </div>` : ''}

      <!-- Markdown 正文内容 -->
      <div class="markdown-body text-[#1d1d1f] dark:text-[#f5f5f7]">
        ${detailsHtml}
      </div>

      <!-- 操作链接栏 -->
      <div class="pt-6 border-t border-black/10 dark:border-white/10 flex flex-wrap gap-3 items-center justify-end">
        ${project.downloadUrl ? `
          <a href="${escapeHtml(project.downloadUrl)}" target="_blank" rel="noopener noreferrer"
             ${project.downloadPwd ? `data-copy-pwd="${escapeHtml(project.downloadPwd)}"` : ''}
             class="btn-primary px-5 py-2 text-xs flex items-center gap-1.5">
            <i data-lucide="download" class="w-3.5 h-3.5"></i>
            <span>网盘下载${project.downloadPwd ? ' (提取码: ' + escapeHtml(project.downloadPwd) + ')' : ''}</span>
          </a>
        ` : ''}
        ${project.githubUrl && project.githubUrl !== '#' ? `
          <a href="${escapeHtml(project.githubUrl)}" target="_blank" rel="noopener noreferrer"
             class="btn-secondary px-4 py-2 text-xs bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[#1d1d1f] dark:text-white flex items-center gap-1.5 border border-black/10 dark:border-white/10">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            <span>GitHub 源码</span>
          </a>
        ` : ''}
        ${project.demoUrl && project.demoUrl !== '#' ? `
          <a href="${escapeHtml(project.demoUrl)}" target="_blank" rel="noopener noreferrer"
             class="btn-secondary px-4 py-2 text-xs bg-slate-100 dark:bg-white/10 text-[#1d1d1f] dark:text-white flex items-center gap-1.5 border border-black/10 dark:border-white/10">
            <span>GitHub Releases</span>
            <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
          </a>
        ` : ''}
      </div>
    </div>
  `;

  modalContent._projectToken = project.id;   // 供延时补写正文时校验（防止串篇；别用 data-*，会撞上点击委托的选择器）
  modalContent.classList.remove('modal-content-in');
  void modalContent.offsetWidth;
  modalContent.classList.add('modal-content-in');

  addCopyButtons(modalContent);
  ensureHighlight(modalContent);
  const projHlQuery = opts && typeof opts.highlightQuery === 'string' ? opts.highlightQuery.trim() : '';
  if (!needMd) applyModalSearchHighlight(modal, modalContent, projHlQuery);

  const focusChangelog = () => {
    if (modalContent.dataset.openChangelog !== '1') return;
    delete modalContent.dataset.openChangelog;
    const box = modalContent.querySelector('.changelog');
    if (box) {
      box.open = true;
      requestAnimationFrame(() => {
        setTimeout(() => {
          box.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }, 30);
      });
    }
  };

  // 渲染器就绪后补写正文（期间又点了别的项目或已关闭弹窗就放弃，避免覆盖错内容/泄漏高亮）
  if (needMd && project.details) {
    const token = project.id;
    window.ensureMarkdown().then((ok) => {
      if (modalContent._projectToken !== token || modal.classList.contains('hidden') || modal.classList.contains('is-closing')) return;
      const body = modalContent.querySelector('.markdown-body');
      if (!body) return;
      body.innerHTML = ok
        ? sanitizeMarkdownHtml(window.marked.parse(project.details))
        : `<p>${escapeHtml(project.details)}</p>`;
      addCopyButtons(modalContent);
      ensureHighlight(modalContent);
      if (projHlQuery) applyModalSearchHighlight(modal, modalContent, projHlQuery);
      if (window.lucide) window.lucide.createIcons();
      if (!wantChangelog) {
        modal.scrollTop = 0;
        modalContent.scrollTop = 0;
      }
      // 从公告「全部 N 个版本」进来：正文补写完后展开更新记录并滚到它
      focusChangelog();
    });
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (wantChangelog) {
    if (!needMd || !project.details) focusChangelog();
  } else {
    modal.scrollTop = 0;
    modalContent.scrollTop = 0;
    requestAnimationFrame(() => {
      modal.scrollTop = 0;
      modalContent.scrollTop = 0;
    });
  }
  if (window.lucide) window.lucide.createIcons();
  modal.querySelector('button[aria-label="关闭"]')?.focus({ preventScroll: true });
};

window.closeProjectModal = function() {
  clearModalSearchHighlight(document.getElementById('project-modal'));
  // 关闭时必须停掉弹窗内所有视频，否则声音会在背后继续
  document.querySelectorAll('#project-modal video').forEach(v => { try { v.pause(); } catch (e) {} });
  const modal = document.getElementById('project-modal');
  const modalContent = document.getElementById('project-modal-content');
  if (modal) modal.scrollTop = 0;
  if (modalContent) {
    modalContent._projectToken = null;
    modalContent.scrollTop = 0;
  }
  animateModalClose(modal);
};

/* ============================================================
   3. 文字内容模块：技术手记 / 创作 / 随笔 / AI 学习
      （共用 ARTICLES_DATA，按 section 字段路由，空模块自动隐藏）
   ============================================================ */

// 全部内容统一按日期倒序——新增条目无论插在数组哪个位置，最新的永远排最前
function getSortedArticles() {
  return (window.ARTICLES_DATA || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

// 阅读时长兜底估算：中文按 400 字/分钟，英文按 200 词/分钟
function estimateReadTime(text) {
  const plain = String(text || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#>*`\-\[\]()!]/g, '');
  const cjk = (plain.match(/[\u4e00-\u9fff]/g) || []).length;
  const latin = (plain.match(/[A-Za-z0-9]+/g) || []).length;
  return `${Math.max(1, Math.round(cjk / 400 + latin / 200))} 分钟`;
}

function getReadTime(article) {
  return article.readTime || estimateReadTime(article.content);
}

// 相关阅读：标签重合度加权，同模块优先，最多 3 篇
function getRelatedArticles(article) {
  const tagSet = new Set(article.tags || []);
  return getSortedArticles()
    .filter((a) => a.id !== article.id)
    .map((a) => ({
      a,
      score:
        (a.section === article.section ? 2 : 0) +
        (a.tags || []).reduce((n, t) => n + (tagSet.has(t) ? 1 : 0), 0) * 3
    }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
    .map((x) => x.a);
}

// 长文自动目录：≥3 个 h2/h3 时生成可折叠 TOC（点击在弹窗内平滑跳转）
function buildArticleToc(modalContent) {
  const body = modalContent.querySelector('.markdown-body');
  if (!body) return;
  const headings = body.querySelectorAll('h2, h3');
  if (headings.length < 3) return;

  headings.forEach((h, i) => { h.id = `article-heading-${i}`; });
  const box = document.createElement('details');
  box.className = 'toc-box';
  box.innerHTML = `
    <summary>目录</summary>
    <nav class="mt-2 space-y-0.5">
      ${[...headings].map((h, i) => `
        <a href="#article-heading-${i}" data-toc-id="article-heading-${i}"
           class="toc-link ${h.tagName === 'H3' ? 'pl-5' : ''}">${escapeHtml(h.textContent)}</a>
      `).join('')}
    </nav>
  `;
  box.addEventListener('click', (e) => {
    const link = e.target.closest('[data-toc-id]');
    if (!link) return;
    e.preventDefault();
    const heading = modalContent.querySelector(`#${CSS.escape(link.dataset.tocId)}`);
    if (!heading) return;
    const top = heading.getBoundingClientRect().top - modalContent.getBoundingClientRect().top + modalContent.scrollTop - 16;
    modalContent.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  // 条目不多时默认展开，超长目录（如长篇小说章节）保持折叠
  if (headings.length <= 8) box.open = true;
  body.parentNode.insertBefore(box, body);
}

// 目录高亮当前章节（2026-10-17 加）：滚动容器内取「距顶部最近的标题」，
// 给对应目录项加 .is-current。用滚动容器自算而不是 IntersectionObserver —— 容器是
// #article-modal-content（不是文档），观察器在嵌套滚动容器里要反复换算 root，反而更绕，
// 而这里是「同一时刻只有一个当前章节」的场景，一行比较就够了。
function initTocSpy(modalContent) {
  if (modalContent._tocSpyAbort) {
    modalContent._tocSpyAbort.abort();
    modalContent._tocSpyAbort = null;
  }
  const box = modalContent.querySelector('.toc-box');
  if (!box) return;
  const links = [...box.querySelectorAll('.toc-link[data-toc-id]')];
  if (!links.length) return;

  const heads = links.map((a) => ({ a, el: modalContent.querySelector('#' + CSS.escape(a.dataset.tocId)) }));
  let raf = 0;
  let currentId = '';

  const paint = () => {
    raf = 0;
    const line = modalContent.getBoundingClientRect().top + 32;   // 容器顶部往下 32px 作为判读线
    let cur = heads[0].a.dataset.tocId;
    for (const h of heads) {
      if (h.el && h.el.getBoundingClientRect().top <= line) cur = h.a.dataset.tocId;
    }
    if (cur === currentId) return;
    currentId = cur;
    links.forEach((a) => {
      const on = a.dataset.tocId === cur;
      a.classList.toggle('is-current', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };

  const modal = document.getElementById('article-modal');
  const ac = typeof AbortController === 'function' ? new AbortController() : null;
  if (ac) modalContent._tocSpyAbort = ac;
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(paint);
  };
  const listenerOpts = ac ? { passive: true, signal: ac.signal } : { passive: true };
  modalContent.addEventListener('scroll', onScroll, listenerOpts);
  if (modal) {
    modal.addEventListener('scroll', onScroll, listenerOpts);
  }
  paint();
  // 弹窗还在入场动画（transform 未归位）时首算会误判成最后一节，动画落定后再对一次
  const settleTimer = setTimeout(paint, 400);
  if (ac) {
    ac.signal.addEventListener('abort', () => {
      clearTimeout(settleTimer);
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { once: true });
  }
}

// 文章结构化数据（Google 会执行 JS，可吃到每篇的富摘要）
function injectArticleJsonLd(article) {
  let el = document.getElementById('json-ld-article');
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'json-ld-article';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    datePublished: article.date,
    dateModified: article.date,
    articleSection: article.category || '技术手记',
    keywords: (article.tags || []).join(', '),
    inLanguage: 'zh-CN',
    author: { '@type': 'Person', name: 'SevenJohn', url: 'https://7stevejohn.github.io/' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://7stevejohn.github.io/p/${encodeURIComponent(article.id)}.html` }
  });
}

let activeArticle = null;

/* ============================================================
   全局辅助件：toast / 时段问候
   ============================================================ */
let toastTimer = null;
function showToast(msg, opt = {}) {
  const duration = typeof opt === 'number' ? opt : (opt.duration || 2600);
  const position = typeof opt === 'object' && opt.position ? opt.position : 'bottom';
  let el = document.getElementById('sj-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sj-toast';
    document.body.appendChild(el);
  }
  el.className = 'sj-toast' + (position === 'top-right' ? ' toast-top-right' : '');
  el.textContent = msg;
  void el.offsetWidth;
  el.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-show'), duration);
}

// 网盘下载：自动写入提取码至剪贴板，并在右上角呈现微弱优雅 Toast 提示
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-copy-pwd]');
  if (!btn) return;
  const pwd = btn.dataset.copyPwd;
  if (!pwd) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(pwd).catch(() => {});
  }
  showToast(`已复制提取码: ${pwd}`, { duration: 1500, position: 'top-right' });
});

// 时段感知问候（读取访客本地时间）
function initHeroGreeting() {
  const el = document.getElementById('hero-greeting');
  if (!el) return;
  const h = new Date().getHours();
  const g = h < 5 ? '夜深清寂，慢慢看' : h < 9 ? '清晨好' : h < 12 ? '上午好' : h < 14 ? '午间安适' : h < 18 ? '下午好' : h < 23 ? '晚风渐起，晚上好' : '夜深了，注意休息';
  el.textContent = g;
}

// 首屏作品索引与卡片悬浮聚焦（2026-11-06）：
// 1. 首屏对称药丸索引（.hero-index .hi-row）极简悬浮与高亮联动
// 2. 旗舰卡片真·悬浮状态（translateY(-8px) + 景深羽化投影 + 3D 物理微倾斜）
// 3. 页面自然滚动黄金视口监听（IntersectionObserver）
function initHeroIndex() {
  const nav = document.querySelector('#home .hero-index');
  const productCards = document.querySelectorAll('#products article[data-project-id]');

  if (!productCards.length) return;

  function selectProductCard(projectId, smoothScroll = true) {
    const card = document.querySelector('#products article[data-project-id="' + projectId + '"]');
    if (!card) return;

    // 1. 同步首屏 hero-index 状态
    if (nav) {
      nav.querySelectorAll('[data-hi]').forEach(el => {
        el.classList.toggle('active', el.dataset.hi === projectId);
      });
    }

    // 2. 触发旗舰级卡片真·悬浮聚焦状态
    productCards.forEach(c => c.classList.remove('card-selected'));
    card.classList.add('card-selected');

    // 3. 平滑居中入屏
    if (smoothScroll) {
      const root = document.documentElement;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      root.classList.add('no-snap');
      card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      setTimeout(() => root.classList.remove('no-snap'), 900);
    }
  }

  // 首屏目录点击
  if (nav) {
    nav.addEventListener('click', (e) => {
      const link = e.target.closest('[data-hi]');
      if (!link) return;
      e.preventDefault();
      e.stopPropagation();
      selectProductCard(link.dataset.hi, true);
      history.pushState(null, '', '#products');
    });
  }

  // 点击卡片本身触发悬浮聚焦状态
  productCards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button, video, input, select, textarea')) return;
      const pid = card.getAttribute('data-project-id');
      if (pid) selectProductCard(pid, false);
    });
  });



  // 页面滚动时自动监听高亮首屏对应的条目
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const pid = entry.target.getAttribute('data-project-id');
          if (pid && nav) {
            nav.querySelectorAll('[data-hi]').forEach(el => {
              el.classList.toggle('active', el.dataset.hi === pid);
            });
          }
        }
      });
    }, {
      rootMargin: '-20% 0px -40% 0px',
      threshold: 0.1
    });
    productCards.forEach(c => observer.observe(c));
  }
}

// 首屏「最近更新」证据：从项目数据里取最新一条，不写死日期，点击直达对应卡片
function initHeroUpdated() {
  const el = document.getElementById('hero-updated');
  const list = window.PROJECTS_DATA;
  if (!el || !Array.isArray(list)) return;
  const latest = list.filter(p => p.updated && !p.archived).sort((a, b) => b.updated.localeCompare(a.updated))[0];
  if (!latest) return;
  const short = String(latest.title).split(' · ')[0];
  el.textContent = `最近更新 ${latest.updated} · ${short}${latest.version ? ' ' + latest.version : ''} →`;
  el.title = `点击跳到 ${short} 卡片`;
  el.hidden = false;
  el.addEventListener('click', () => {
    const card = document.querySelector(`#products article[data-project-id="${latest.id}"]`);
    if (card) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }
  });
}

// 页脚版权年份
function initFooterYear() {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = String(new Date().getFullYear());
}

// 液态玻璃跟手 specular：指针在 .glass-spec 上移动时写 --sx/--sy（rAF 节流，触摸设备跳过）
function initGlassSpec() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  let raf = 0, lastEl = null, mx = 0, my = 0;
  const apply = () => {
    raf = 0;
    if (!lastEl) return;
    const r = lastEl.getBoundingClientRect();
    lastEl.style.setProperty('--sx', (mx - r.left) + 'px');
    lastEl.style.setProperty('--sy', (my - r.top) + 'px');
  };
  document.addEventListener('pointermove', (e) => {
    const t = e.target && e.target.closest ? e.target.closest('.glass-spec') : null;
    if (!t) { lastEl = null; return; }
    lastEl = t; mx = e.clientX; my = e.clientY;
    if (!raf) raf = requestAnimationFrame(apply);
  }, { passive: true });
}

// 单条内容卡片（技术手记 / 创作 / 随笔共用同一卡片样式）；可键盘聚焦，Enter/Space 触发打开
// opts.hideCategory：分组头已表达分类时（创作模块），卡片内不再重复渲染分类 pill
// 封面（2026-10-17 加）：art.cover 有图就渲染缩略图；没有就用「品牌渐变 + 栏目首字」——
// 首字始终垫在图片下面，图 404 时 onerror 摘掉 img 就自然露出首字，不留破图框
function articleCardHtml(art, opts = {}) {
  const metaLead = opts.hideCategory
    ? `<span>${escapeHtml(art.date)}</span><span>· ${escapeHtml(getReadTime(art))}</span>`
    : `<span class="px-2 py-0.5 rounded-md border border-black/10 dark:border-white/15 font-medium">
         ${escapeHtml(art.category || '技术手记')}
       </span>
       <span>${escapeHtml(art.date)}</span>
       <span>· ${escapeHtml(getReadTime(art))}</span>`;
  const cover = typeof art.cover === 'string' && art.cover ? art.cover : '';
  const initial = escapeHtml((art.category || '技术手记').slice(0, 1));
  return `
    <article tabindex="0" role="button" aria-label="阅读：${escapeHtml(art.title)}" data-open-article="${escapeHtml(art.id)}" class="bento-card reveal ac-with-cover p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group">
      <div class="ac-media" aria-hidden="true">
        <span class="ac-fallback">${initial}</span>
        ${cover ? `<img src="${escapeHtml(cover)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}
      </div>
      <div class="space-y-2 flex-1">
        <div class="flex items-center gap-2 text-xs font-mono text-[#86868b] flex-wrap">
          ${metaLead}
        </div>
        <h3 class="text-base font-semibold text-[#1d1d1f] dark:text-white leading-snug">
          ${escapeHtml(art.title)}
        </h3>
        <p class="text-[#86868b] text-sm line-clamp-2 leading-relaxed">
          ${escapeHtml(art.summary)}
        </p>
      </div>
      <div class="text-xs text-[#86868b] inline-flex items-center gap-1 self-start md:self-auto group-hover:translate-x-0.5 transition-transform whitespace-nowrap">
        <span>阅读</span>
        <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
      </div>
    </article>
  `;
}

// 通用单列表块渲染（AI 学习 / 技术手记 / 随笔）：过滤 → 渲染 → 空则连导航一起隐藏
// useArrayOrder: 系列模块（AI 学习）按数组序渲染，阅读顺序写死在数组里，不随日期变
// 提取标题序号（一、二、三... 或 1、2、3...），供系列文章排序与同系列翻页
function getTitleOrder(title) {
  if (!title) return Infinity;
  const CN_MAP = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
  };
  const mCn = String(title).match(/^([一二三四五六七八九十]+)[、.·\s]/);
  if (mCn) {
    const s = mCn[1];
    if (s.length === 1 && CN_MAP[s]) return CN_MAP[s];
    if (s.length === 2 && s[0] === '十' && CN_MAP[s[1]]) return 10 + CN_MAP[s[1]];
    if (s.length === 2 && CN_MAP[s[0]] && s[1] === '十') return CN_MAP[s[0]] * 10;
    if (s.length === 3 && CN_MAP[s[0]] && s[1] === '十' && CN_MAP[s[2]]) return CN_MAP[s[0]] * 10 + CN_MAP[s[2]];
  }
  const mNum = String(title).match(/^(\d+)[、.·\s]/);
  if (mNum) return parseInt(mNum[1], 10);
  return Infinity;
}

function renderArticleSection({ match, sectionId, navHref, listId, useArrayOrder = false }) {
  const sectionEl = document.getElementById(sectionId);
  if (!sectionEl) return;

  const navLinks = document.querySelectorAll(`a[href="${navHref}"]`);
  const listContainer = document.getElementById(listId);
  const source = useArrayOrder ? (window.ARTICLES_DATA || []) : getSortedArticles();
  let items = source.filter(match);

  if (useArrayOrder) {
    // 系列文章：若包含标题序号（如 一、二、三...），按标题序号严格升序，确保展示与章节标题对齐
    items = items.slice().sort((a, b) => {
      const oa = getTitleOrder(a.title);
      const ob = getTitleOrder(b.title);
      if (oa !== ob) return oa - ob;
      return (a.date || '').localeCompare(b.date || '');
    });
  }

  if (items.length === 0) {
    sectionEl.style.display = 'none';
    navLinks.forEach(link => link.style.display = 'none');
    return;
  }

  sectionEl.style.display = '';
  navLinks.forEach(link => link.style.display = '');
  // 栏目头右侧计数（blog-count）
  const countEl = document.getElementById(`${sectionId}-count`);
  if (countEl) countEl.textContent = items.length === 1 ? '共 1 篇' : `共 ${items.length} 篇`;
  if (listContainer) {
    listContainer.innerHTML = items.map(articleCardHtml).join('');
    if (window.lucide) window.lucide.createIcons();
    observeReveals();
  }
}

// 文章区唯一渲染入口：列表视图 = 全库（与卷宗架同口径）
function initArticles() {
  renderArticleSection({
    match: () => true,
    sectionId: 'blog',
    navHref: '#blog',
    listId: 'articles-list'
  });
}

// 同模块内的兄弟篇目（创作模块再按「小说 / 游戏创作」分组），供弹窗上一篇/下一篇翻页
function getSiblingList(article) {
  const all = getSortedArticles();
  if (article.section === 'creation') {
    return all.filter(a => a.section === 'creation' && (a.category === '游戏创作') === (article.category === '游戏创作'));
  }
  if (article.section === 'essay') {
    return all.filter(a => a.section === 'essay');
  }
  if (article.section === 'ai') {
    // AI 学习系列：按数组顺序翻页即阅读顺序（一→七），与列表渲染同序，日期只作展示
    // AI 学习系列：按标题序号顺序（一→七）翻页即阅读顺序，与列表渲染同序，日期只作展示
    return (window.ARTICLES_DATA || [])
      .filter(a => a.section === 'ai')
      .slice()
      .sort((a, b) => {
        const oa = getTitleOrder(a.title);
        const ob = getTitleOrder(b.title);
        if (oa !== ob) return oa - ob;
        return (a.date || '').localeCompare(b.date || '');
      });
  }
  return all.filter(a => !a.section);
}

// 复位文章弹窗滚动位置（包含外层遮罩容器与内层滚动容器，彻底杜绝切篇/重开时保留滚动位置）
function resetArticleModalScroll() {
  const modal = document.getElementById('article-modal');
  const modalContent = document.getElementById('article-modal-content');
  if (modal) {
    modal.scrollTop = 0;
    if (typeof modal.scrollTo === 'function') {
      try { modal.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (_) { modal.scrollTop = 0; }
    }
  }
  if (modalContent) {
    modalContent.scrollTop = 0;
    if (typeof modalContent.scrollTo === 'function') {
      try { modalContent.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (_) { modalContent.scrollTop = 0; }
    }
  }
  const progress = document.getElementById('article-progress');
  if (progress) progress.style.width = '0%';
}

// 弹窗内容方向性切换
// 首选 View Transitions API：新旧快照真·交叉溶解（旧滑出的同时新滑入，无两段式空档）
// 回退：立即换内容 + 单段淡入
// dir: 'next' 向左翻页 | 'prev' 向右翻页 | 'fade' 上下交替
function swapModalContent(el, mutate, dir = 'fade') {
  if (!el || typeof mutate !== 'function') return;
  // 减少动效 / 弹窗不可见时直接换内容，不做过渡
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !el.offsetParent) {
    mutate();
    resetArticleModalScroll();
    return;
  }
  if (el._swapTimer) { clearTimeout(el._swapTimer); el._swapTimer = null; }
  const CLS = ['content-out-next', 'content-out-prev', 'content-out-fade', 'content-in-next', 'content-in-prev', 'content-in-fade', 'modal-content-in'];

  if (document.startViewTransition) {
    const apply = () => {
      CLS.forEach((c) => el.classList.remove(c));
      mutate();
      resetArticleModalScroll();
    };
    document.documentElement.classList.add('vt-' + dir);
    const vt = document.startViewTransition(apply);
    vt.finished.finally(() => {
      document.documentElement.classList.remove('vt-' + dir);
      resetArticleModalScroll();
    });
    return;
  }

  mutate();
  resetArticleModalScroll();
  void el.offsetWidth; // 强制回流，确保入场动画从头播放
  el.classList.add('content-in-' + dir);
  el._swapTimer = setTimeout(() => {
    el.classList.remove('content-in-' + dir);
    resetArticleModalScroll();
  }, 450);
}

/* ⌘K 搜索词「零 DOM 侵入」正文高亮与词间巡航（CSS Custom Highlight API） */
let modalHighlightState = null;

function clearModalSearchHighlight(modalEl) {
  modalHighlightState = null;
  if (window.CSS && CSS.highlights) {
    CSS.highlights.delete('sj-search-hit');
    CSS.highlights.delete('sj-search-current');
  }
  const scope = modalEl || document;
  scope.querySelectorAll('.modal-find-bar').forEach((el) => el.remove());
}

function applyModalSearchHighlight(modal, modalContent, rawQuery) {
  clearModalSearchHighlight(modal);
  if (!modal || !modalContent || !rawQuery) return;
  const tokens = [...new Set(String(rawQuery).toLowerCase().split(/\s+/).filter((t) => t.length >= 1))];
  if (!tokens.length) return;
  if (!(window.CSS && CSS.highlights && typeof window.Highlight === 'function')) return;

  const body = modalContent.querySelector('.markdown-body');
  if (!body) return;

  // MANDATORY: 用 TreeWalker 收集纯文本节点，不改动 innerHTML，零破坏代码复制按钮与目录锚点
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let cur = walker.nextNode();
  while (cur) {
    if (cur.nodeValue && cur.nodeValue.trim()) textNodes.push(cur);
    cur = walker.nextNode();
  }

  const ranges = [];
  for (const textNode of textNodes) {
    const lower = textNode.nodeValue.toLowerCase();
    const spans = [];
    for (const tk of tokens) {
      let from = 0;
      while (from < lower.length) {
        const hit = lower.indexOf(tk, from);
        if (hit === -1) break;
        spans.push([hit, hit + tk.length]);
        from = hit + tk.length;
      }
    }
    if (!spans.length) continue;
    spans.sort((a, b) => a[0] - b[0] || (b[1] - b[0]) - (a[1] - a[0]));
    let lastEnd = -1;
    for (const [st, ed] of spans) {
      if (st < lastEnd) continue;
      const range = new Range();
      range.setStart(textNode, st);
      range.setEnd(textNode, ed);
      ranges.push(range);
      lastEnd = ed;
    }
  }

  if (!ranges.length) return;

  const allHl = new Highlight(...ranges);
  allHl.priority = 0;
  CSS.highlights.set('sj-search-hit', allHl);

  const topBar = modal.querySelector('.modal-top-bar');
  const closeBtn = topBar ? topBar.querySelector('[data-close-modal]') : null;
  const insertAnchor = topBar ? (topBar.querySelector('.modal-top-actions') || closeBtn) : null;
  let bar = null;
  let countEl = null;
  if (topBar && insertAnchor && insertAnchor.parentNode === topBar) {
    bar = document.createElement('div');
    bar.className = 'modal-find-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', '正文检索定位');
    bar.innerHTML =
      '<span class="mfb-count font-mono"></span>' +
      '<button type="button" class="mfb-btn" data-mfb="prev" aria-label="上一处匹配" title="上一处 (Shift+F3)">↑</button>' +
      '<button type="button" class="mfb-btn" data-mfb="next" aria-label="下一处匹配" title="下一处 (F3)">↓</button>' +
      '<button type="button" class="mfb-btn" data-mfb="clear" aria-label="清除搜索高亮" title="清除高亮">×</button>';
    topBar.insertBefore(bar, insertAnchor);
    countEl = bar.querySelector('.mfb-count');
  }

  let activeIdx = 0;
  const focusMatch = (idx, smooth = true) => {
    activeIdx = ((idx % ranges.length) + ranges.length) % ranges.length;
    const curHl = new Highlight(ranges[activeIdx]);
    curHl.priority = 1;
    CSS.highlights.set('sj-search-current', curHl);
    if (countEl) countEl.textContent = `命中 ${activeIdx + 1}/${ranges.length}`;
    const rect = ranges[activeIdx].getBoundingClientRect();
    const boxRect = modalContent.getBoundingClientRect();
    if (rect.height > 0 && boxRect.height > 0) {
      const targetTop = Math.max(0, modalContent.scrollTop + (rect.top - boxRect.top) - boxRect.height * 0.28);
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      modalContent.scrollTo({ top: targetTop, behavior: (!smooth || reduce) ? 'auto' : 'smooth' });
    }
  };

  if (bar) {
    bar.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-mfb]');
      if (!btn) return;
      ev.stopPropagation();
      const act = btn.getAttribute('data-mfb');
      if (act === 'prev') focusMatch(activeIdx - 1, true);
      else if (act === 'next') focusMatch(activeIdx + 1, true);
      else if (act === 'clear') clearModalSearchHighlight(modal);
    });
  }

  modalHighlightState = { modal, step: (delta) => focusMatch(activeIdx + delta, true) };
  requestAnimationFrame(() => focusMatch(0, false));
}

window.openArticleModal = function(id, skipUrlSync, opts) {
  const article = (window.ARTICLES_DATA || []).find(a => a.id === id);
  if (!article) return;

  pauseActiveProductVideos();

  const modal = document.getElementById('article-modal');
  const modalContent = document.getElementById('article-modal-content');
  if (!modal || !modalContent) return;
  if (modal._closeTimer) { clearTimeout(modal._closeTimer); modal._closeTimer = null; }
  modal.classList.remove('is-closing');
  modal._lastFocus = document.activeElement;
  resetArticleModalScroll();
  // 记录切换前的状态：弹窗已打开时切篇走方向性交叉过渡
  const wasOpen = !modal.classList.contains('hidden') && !modal.classList.contains('is-closing');
  const prevActiveArticle = activeArticle;
  activeArticle = article;
  const reqId = (modalContent._articleReqId || 0) + 1;
  modalContent._articleReqId = reqId;

  const barTitle = document.getElementById('article-bar-title');
  if (barTitle) barTitle.textContent = article.title || '';
  const barCategory = document.getElementById('article-bar-category');
  if (barCategory) barCategory.textContent = article.category || '技术手记';
  const hlQuery = (opts && typeof opts.highlightQuery === 'string' && opts.highlightQuery.trim())
    || new URLSearchParams(location.search).get('hl')
    || '';

  // 文章正文与 Markdown 渲染器均按需加载：先出骨架，二者并齐后补写正文与目录
  const needBody = !(typeof article.content === 'string' && article.content.length > 0);
  const needMd = !(window.marked && window.DOMPurify);
  const needAsync = needBody || needMd;
  const parsedMarkdown = needAsync
    ? '<p class="md-pending">正在准备阅读器…</p>'
    : sanitizeMarkdownHtml(window.marked.parse(article.content || ''));

  // 同模块翻页：首篇无上一篇、末篇无下一篇，仅一篇时不显示翻页栏
  const siblings = getSiblingList(article);
  const idx = siblings.findIndex(a => a.id === article.id);
  const prevArticle = idx > 0 ? siblings[idx - 1] : null;
  const nextArticle = idx > -1 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const pagerBtn = (target, label, icon) => `
    <button data-pager="${icon === 'left' ? 'prev' : 'next'}" data-open-article="${escapeHtml(target.id)}" class="btn-secondary px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-[#1d1d1f] dark:text-white flex items-center gap-1.5 cursor-pointer">
      ${icon === 'left' ? '<i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>' : ''}
      <span>${label}</span>
      ${icon === 'right' ? '<i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>' : ''}
    </button>
  `;
  const pagerHtml = (prevArticle || nextArticle) ? `
      <div class="pt-5 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-3">
        ${prevArticle ? pagerBtn(prevArticle, '上一篇', 'left') : '<span></span>'}
        ${nextArticle ? pagerBtn(nextArticle, '下一篇', 'right') : '<span></span>'}
      </div>
  ` : '';

  // 相关阅读：按标签重合度推荐，没有相关内容时整块省略
  const related = getRelatedArticles(article);
  const relatedHtml = related.length ? `
      <div class="pt-4 flex flex-wrap items-center gap-2">
        <span class="text-xs font-semibold text-[#86868b] mr-1">相关阅读</span>
        ${related.map((r) => `
          <button data-open-article="${escapeHtml(r.id)}" class="px-3 py-1.5 rounded-full text-xs bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/20 transition cursor-pointer max-w-full truncate">
            ${escapeHtml(r.title)}
          </button>
        `).join('')}
      </div>
  ` : '';

  // 把「换内容 + 重建事件」包成函数：首开直接执行；已开时等旧内容滑出后再执行
  const renderNow = () => {
  modalContent.innerHTML = `
    <div class="p-6 sm:p-8 space-y-5">
      <div class="space-y-2 border-b border-black/10 dark:border-white/10 pb-5">
        <div class="flex items-center gap-2 text-xs font-mono text-[#86868b]">
          <span>${escapeHtml(article.date)}</span>
          <span>·</span>
          <span>${escapeHtml(getReadTime(article))}</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">${escapeHtml(article.title)}</h1>
      </div>
      ${article.cover ? `
      <div class="w-full rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 aspect-[16/9] max-h-72">
        <img src="${escapeHtml(article.cover)}" alt="${escapeHtml(article.title)}" class="w-full h-full object-cover">
      </div>` : ''}
      <div class="markdown-body text-[#1d1d1f] dark:text-[#f5f5f7]">
        ${parsedMarkdown}
      </div>
      ${pagerHtml}${relatedHtml}
    </div>
  `;

  ensureHighlight(modalContent);
  addCopyButtons(modalContent);
  buildArticleToc(modalContent);
  initTocSpy(modalContent);
  injectArticleJsonLd(article);

  // 正文与渲染器就绪后补写正文，并重建依赖正文的目录/复制按钮/高亮
  if (needAsync) {
    const bodyTask = needBody
      ? (typeof window.ensureArticles === 'function' ? window.ensureArticles() : Promise.resolve(false))
      : Promise.resolve(true);
    const mdTask = needMd
      ? (typeof window.ensureMarkdown === 'function' ? window.ensureMarkdown() : Promise.resolve(false))
      : Promise.resolve(true);
    Promise.all([bodyTask, mdTask]).then(([bodyOk, mdOk]) => {
      if (
        modalContent._articleReqId !== reqId
        || !activeArticle
        || activeArticle.id !== id
        || modal.classList.contains('hidden')
        || modal.classList.contains('is-closing')
      ) return;
      const latest = (window.ARTICLES_DATA || []).find((a) => a.id === id) || article;
      activeArticle = latest;
      const body = modalContent.querySelector('.markdown-body');
      if (!body) return;
      const raw = latest.content || '';
      if (!raw && !bodyOk) {
        body.innerHTML = '<p class="text-[#86868b]">正文加载失败，请检查网络后重试。</p>';
        return;
      }
      body.innerHTML = (mdOk && window.marked && window.DOMPurify)
        ? sanitizeMarkdownHtml(window.marked.parse(raw))
        : `<p>${escapeHtml(raw)}</p>`;
      modalContent.querySelectorAll('.toc-box').forEach((el) => el.remove());
      ensureHighlight(modalContent);
      addCopyButtons(modalContent);
      buildArticleToc(modalContent);
      initTocSpy(modalContent);
      resetArticleModalScroll();
      if (hlQuery) applyModalSearchHighlight(modal, modalContent, hlQuery);
    });
  }

  // 切换篇目后回到正文顶部、复位进度条；若从 ⌘K 搜索进入则无损高亮命中词并定位首处
  resetArticleModalScroll();
  if (!needAsync && hlQuery) {
    applyModalSearchHighlight(modal, modalContent, hlQuery);
  } else if (!hlQuery) {
    clearModalSearchHighlight(modal);
  }
  if (window.lucide) window.lucide.createIcons();
  };

  // 已打开时切篇/翻章：按同模块列表顺序决定左右方向；首开仅内容淡入（面板自带入场）
  if (wasOpen && prevActiveArticle && prevActiveArticle.id !== article.id) {
    const sib = getSiblingList(prevActiveArticle);
    const a = sib.findIndex((x) => x.id === prevActiveArticle.id);
    const b = sib.findIndex((x) => x.id === article.id);
    const dir = a > -1 && b > -1 && a !== b ? (b > a ? 'next' : 'prev') : 'fade';
    swapModalContent(modalContent, renderNow, dir);
  } else {
    renderNow();
    modalContent.classList.remove('modal-content-in');
    void modalContent.offsetWidth;
    modalContent.classList.add('modal-content-in');
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  resetArticleModalScroll();
  requestAnimationFrame(() => {
    resetArticleModalScroll();
  });
  if (!skipUrlSync) {
    const url = new URL(location.href);
    url.searchParams.set('post', id);
    history.pushState(null, '', url);
    modal._urlPushed = true; // 该历史条目由打开动作压入，关闭时应回退而不是再压一条
  }
  modal.querySelector('button[aria-label="关闭"]')?.focus({ preventScroll: true });
};

window.closeArticleModal = function(skipUrlSync) {
  const modal = document.getElementById('article-modal');
  const modalContent = document.getElementById('article-modal-content');
  if (modalContent) {
    modalContent._articleReqId = (modalContent._articleReqId || 0) + 1;
    if (modalContent._tocSpyAbort) {
      modalContent._tocSpyAbort.abort();
      modalContent._tocSpyAbort = null;
    }
  }
  activeArticle = null;
  clearModalSearchHighlight(modal);
  const wasOpen = modal && !modal.classList.contains('hidden') && !modal.classList.contains('is-closing');
  resetArticleModalScroll();
  if (modal) animateModalClose(modal);
  if (wasOpen && !skipUrlSync) {
    if (modal && modal._urlPushed) {
      modal._urlPushed = false;
      history.back(); // 回退掉打开时压入的条目，返回键不会重新弹开文章
    } else {
      // 直接带 ?post= 打开的场景没有可回退的条目，就地替换即可
      const url = new URL(location.href);
      url.searchParams.delete('post');
      history.replaceState(null, '', url);
    }
  }
};

// 浏览器前进/后退时同步文章弹窗状态（深链可分享、返回键可关闭）
window.addEventListener('popstate', () => {
  const id = new URLSearchParams(location.search).get('post');
  const modal = document.getElementById('article-modal');
  const isOpen = modal && !modal.classList.contains('hidden');

  if (id && (window.ARTICLES_DATA || []).some(a => a.id === id)) {
    if (!isOpen) {
      window.openArticleModal(id, true);
      if (modal) modal._urlPushed = true; // 前进回到该条目，条目本身仍在历史里
    }
  } else if (isOpen) {
    window.closeArticleModal(true);
  }
});

/* ============================================================
   3.5 技术手记区视图切换：札签卷宗（cards.js inline 原地抽卡）⇄ 文章列表
   - 视图记忆 sj.blogView（默认卷宗）；cards.css/js 在 #blog 接近视口时才注入，首屏零成本
   - 点卷宗 → 就在 #blog 原地拆封变成牌堆抽卡，绝不弹去另一个全屏页面；
     点中卡片阅读 → 直接打开博客原生文章阅读弹窗（openArticleModal）；
   - 列表 DOM 永远保留（只切显示），验收脚本不破
   ============================================================ */
function initBlogCards() {
  const sec = document.getElementById('blog');
  const wrap = document.getElementById('blog-cards');
  const list = document.getElementById('articles-list');
  const btnDeck = document.getElementById('blog-view-deck');
  const btnList = document.getElementById('blog-view-list');
  if (!sec || !wrap || !list || !btnDeck || !btnList) return;

  let view = 'deck';
  try { if (localStorage.getItem('sj.blogView') === 'list') view = 'list'; } catch (_) {}
  const supportsUntilFound = 'onbeforematch' in HTMLElement.prototype;

  function setView(v) {
    view = v;
    try { localStorage.setItem('sj.blogView', v); } catch (_) {}
    wrap.hidden = v !== 'deck';
    if (v === 'list') {
      list.removeAttribute('hidden');
      // 确保切到列表视图时卡片立即可见，不被未触发的 reveal 遮蔽
      list.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => el.classList.add('is-visible'));
    } else if (supportsUntilFound) {
      // hidden="until-found"：默认收起不占布局，但浏览器原生 Ctrl+F 查找命中任意文章时自动唤醒展开
      list.setAttribute('hidden', 'until-found');
    } else {
      list.hidden = true;
    }
    const paint = (btn, active) => {
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    };
    paint(btnDeck, v === 'deck');
    paint(btnList, v === 'list');
  }

  function transitionBlogView(nextView, focusEl, afterFn) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce || view === nextView) {
      setView(nextView);
      if (focusEl) focusEl.focus({ preventScroll: true });
      if (afterFn) afterFn();
      return;
    }
    const vt = document.startViewTransition(() => {
      setView(nextView);
    });
    vt.finished.finally(() => {
      if (focusEl) focusEl.focus({ preventScroll: true });
      if (afterFn) afterFn();
    });
  }

  if (supportsUntilFound) {
    list.addEventListener('beforematch', () => {
      if (view !== 'list') setView('list');
    });
  }

  let loading = null;
  function ensureCards() {
    if (window.CardsCore) return Promise.resolve(true);
    if (loading) return loading;
    loading = new Promise((resolve) => {
      const cssHref = 'css/cards.css?v=20261128a';
      let css = document.querySelector(`link[href="${cssHref}"]`);
      let addedCss = false;
      if (!css) {
        css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = cssHref;
        document.head.appendChild(css);
        addedCss = true;
      }
      const s = document.createElement('script');
      s.src = 'js/cards.js?v=20261128a';
      s.onload = () => {
        const ok = !!window.CardsCore;
        if (!ok) {
          if (s.parentNode) s.parentNode.removeChild(s);
          if (addedCss && css.parentNode) css.parentNode.removeChild(css);
          loading = null;
        }
        resolve(ok);
      };
      s.onerror = () => {
        if (s.parentNode) s.parentNode.removeChild(s);
        if (addedCss && css.parentNode) css.parentNode.removeChild(css);
        loading = null;
        resolve(false);
      };
      document.head.appendChild(s);
    });
    return loading;
  }

  function fallbackToList(reason) {
    console.warn('[blog-cards] 卷宗视图不可用，回落文章列表：' + reason);
    btnDeck.hidden = true;
    setView('list');
  }

  let inlineInst = null;
  function mountShelf() {
    return ensureCards().then((ok) => {
      if (!ok) { fallbackToList('cards.js 加载失败'); return null; }
      if (!wrap.dataset.cardsMounted) {
        inlineInst = window.CardsCore.mount(wrap, {
          mode: 'inline',
          onOpenArticle: (art) => {
            if (art && art.id) openArticleModal(art.id);
          },
        });
        if (!inlineInst) { fallbackToList('文章数据为空'); return null; }
      }
      return inlineInst;
    });
  }

  function openPackInline(cat) {
    setView('deck');
    mountShelf().then((inst) => {
      if (inst && inst.openPack) inst.openPack(cat, { direct: true });
    });
  }

  btnDeck.addEventListener('click', () => {
    const wasDeck = view === 'deck';
    transitionBlogView('deck', btnDeck, () => {
      mountShelf().then((inst) => {
        if (wasDeck && inst && inst.showPacks) inst.showPacks();
      });
    });
  });
  btnList.addEventListener('click', () => transitionBlogView('list', btnList));

  // 分类目录（卡包架下方附录，默认收起）：summary 一行 mono；展开=两级索引
  const toc = document.getElementById('blog-toc');
  if (toc) {
    const data = window.ARTICLES_DATA || [];
    const cats = [...new Set(data.map((a) => a.category))];
    const details = document.createElement('details');
    details.style.cssText = 'margin-top:10px;';
    const summary = document.createElement('summary');
    summary.style.cssText = 'list-style:none;cursor:pointer;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;'
      + 'font-size:12px;color:var(--accent);letter-spacing:.06em;';
    summary.textContent = '// 目录 · ' + cats.length + ' 卷 ' + data.length + ' 篇 · 点开看全部文章标题';
    details.appendChild(summary);
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 44px;margin-top:16px;';
    cats.forEach((cat) => {
      const arts = data.filter((a) => a.category === cat);
      const group = document.createElement('div');
      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'text-xs font-bold text-[#1d1d1f] dark:text-white transition cursor-pointer';
      head.innerHTML = escapeHtml(cat) + '&thinsp;<span class="font-mono" style="font-weight:400;color:var(--accent)">' + arts.length + '</span>';
      head.setAttribute('aria-label', `打开卷宗：${cat}（${arts.length} 篇）`);
      head.addEventListener('click', () => openPackInline(cat));
      group.appendChild(head);
      arts.forEach((a) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'block text-left text-xs text-[#86868b] hover:text-black dark:hover:text-white transition cursor-pointer';
        item.textContent = a.title;
        item.setAttribute('aria-label', '阅读：' + a.title);
        item.addEventListener('click', () => openArticleModal(a.id));
        group.appendChild(item);
      });
      grid.appendChild(group);
    });
    details.appendChild(grid);
    toc.appendChild(details);
  }

  // 真懒加载 + 轻度空闲预热：#blog 接近视口（1200px）立即挂载；首屏 load 后空闲期轻度预热（省流/2G 跳过），不与首屏/3D/音视频抢道
  let shelfStarted = false;
  const startShelfOnce = () => {
    if (shelfStarted) return;
    shelfStarted = true;
    io.disconnect();
    if (view === 'deck') mountShelf();
  };
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      startShelfOnce();
    }
  }, { rootMargin: '1200px 0px' });
  const scheduleIdleShelf = () => {
    const c = navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return;
    setTimeout(() => {
      const conn = navigator.connection;
      if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) return;
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => startShelfOnce(), { timeout: 2000 });
      } else {
        setTimeout(startShelfOnce, 1500);
      }
    }, 1500);
  };
  if (document.readyState === 'complete') {
    scheduleIdleShelf();
  } else {
    window.addEventListener('load', scheduleIdleShelf, { once: true });
  }
  io.observe(sec);

  setView(view);
}

/* ============================================================
   4. 响应式导航与弹窗基础交互
   ============================================================ */
function initNavigation() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (menuBtn && mobileMenu) {
    // 子项错峰浮起用
    [...mobileMenu.children].forEach((c, i) => c.style.setProperty('--i', i));
    const closeMenu = () => {
      if (mobileMenu.classList.contains('hidden') || mobileMenu.classList.contains('is-closing')) return;
      mobileMenu.classList.add('is-closing');
      mobileMenu._closeTimer = setTimeout(() => {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('is-closing');
        mobileMenu._closeTimer = null;
      }, 200);
    };
    menuBtn.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('hidden');
      if (mobileMenu._closeTimer) { clearTimeout(mobileMenu._closeTimer); mobileMenu._closeTimer = null; }
      if (isOpen) {
        mobileMenu.classList.remove('hidden', 'is-closing');
      } else {
        closeMenu();
      }
      menuBtn.setAttribute('aria-expanded', String(isOpen));
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        closeMenu();
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // 二级导航「更多」：details 原生开合，补上点外面/点链接/按 Esc 关闭
  const navMore = document.getElementById('nav-more');
  if (navMore) {
    const closeNavMore = () => { navMore.open = false; };
    navMore.querySelectorAll('a').forEach(link => link.addEventListener('click', closeNavMore));
    document.addEventListener('click', (e) => {
      if (navMore.open && !navMore.contains(e.target)) closeNavMore();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMore.open) { closeNavMore(); navMore.querySelector('summary')?.focus(); }
    });
  }

  // 事件委托：文章/项目卡片与弹窗内跳转按钮统一走 data 属性派发（2026-10-01 体检 SEC-3），
  // 取代内联 onclick——id 不再拼进 JS 字符串上下文，未来数据源变更也不会重新引入注入面。
  // 卡片的 Enter/Space 键盘操作（.click()）与 ← → 翻章（btn.click()）同样经由此处派发。
  document.addEventListener('click', (e) => {
    const articleTrigger = e.target.closest?.('[data-open-article]');
    if (articleTrigger) {
      window.openArticleModal(articleTrigger.getAttribute('data-open-article'));
      return;
    }
    const projectTrigger = e.target.closest?.('[data-open-project]');
    if (projectTrigger) {
      const openChangelog = projectTrigger.hasAttribute('data-open-changelog');
      window.openProjectModal(projectTrigger.getAttribute('data-open-project'), { openChangelog });
      return;
    }
    const closeTrigger = e.target.closest?.('[data-close-modal]');
    if (closeTrigger) {
      if (closeTrigger.getAttribute('data-close-modal') === 'project') window.closeProjectModal();
      else window.closeArticleModal();
    }
  });

  // 点击遮罩关闭弹窗
  const projectModal = document.getElementById('project-modal');
  if (projectModal) {
    projectModal.addEventListener('click', (e) => {
      if (e.target === projectModal) window.closeProjectModal();
    });
  }
  const articleModal = document.getElementById('article-modal');
  if (articleModal) {
    articleModal.addEventListener('click', (e) => {
      if (e.target === articleModal) window.closeArticleModal();
    });
  }
  const shareBtn = document.getElementById('article-share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (!activeArticle || !activeArticle.id) return;
      const base = (location.protocol === 'http:' || location.protocol === 'https:')
        ? location.origin
        : 'https://7stevejohn.github.io';
      const shareUrl = `${base}/p/${encodeURIComponent(activeArticle.id)}.html`;
      const fallbackCopy = () => {
        try {
          const prevFocus = document.activeElement;
          const ta = document.createElement('textarea');
          ta.value = shareUrl;
          ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;top:-9999px;opacity:0;';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
        } catch (_) {}
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).catch(fallbackCopy);
      } else {
        fallbackCopy();
      }
      showToast('已复制分享链接', { duration: 1800, position: 'top-right' });
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeProjectModal();
      window.closeArticleModal();
      return;
    }

    // 卡片可键盘操作：Enter / Space 触发打开（无弹窗时也要生效）
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('article[role="button"]')) {
      e.preventDefault();
      e.target.click();
      return;
    }

    const articleModal = document.getElementById('article-modal');
    const projectModal = document.getElementById('project-modal');
    const openModal = [articleModal, projectModal].find(
      (m) => m && !m.classList.contains('hidden') && !m.classList.contains('is-closing')
    );
    if (!openModal) return;

    // 正文搜索高亮巡航快捷键：F3 / Shift+F3
    if (e.key === 'F3' && modalHighlightState && modalHighlightState.modal === openModal) {
      e.preventDefault();
      modalHighlightState.step(e.shiftKey ? -1 : 1);
      return;
    }

    // 文章弹窗内 ← → 方向键翻章
    if (openModal === articleModal && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const btn = articleModal.querySelector(`[data-pager="${e.key === 'ArrowRight' ? 'next' : 'prev'}"]`);
      if (btn) {
        e.preventDefault();
        btn.click();
      }
      return;
    }

    // Tab 焦点锁定在当前打开的弹窗内
    if (e.key === 'Tab') trapModalFocus(openModal, e);
  });
}

/* ============================================================
 滚动浮现编排与导航滚动状态（ 行为）
   仅动 transform / opacity；无 IntersectionObserver 或减少动效时直出内容
   ============================================================ */
const revealObserver = ('IntersectionObserver' in window)
  ? new IntersectionObserver((entries, io) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // 同一 [data-reveal-stagger] 容器内的兄弟卡片按序错峰（motion-craft stagger 规则）
        const group = el.closest('[data-reveal-stagger]');
        if (group && !el.style.getPropertyValue('--reveal-delay')) {
          const siblings = [...group.querySelectorAll('.reveal')];
          const i = siblings.indexOf(el);
          if (i > 0) el.style.setProperty('--reveal-delay', `${Math.min(i * 90, 360)}ms`);
        }
        el.classList.add('is-visible');
        io.unobserve(el);
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 40px 0px' })
  : null;

// 幂等：动态列表重渲染后再次调用即可观察新节点
function observeReveals() {
  document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => {
    if (revealObserver) {
      revealObserver.observe(el);
    } else {
      el.classList.add('is-visible');
    }
  });
}

// 导航：顶部无边框，下滑后浮现边框与模糊；同时经 rAF 合成驱动滚动进度光丝与回到顶部按钮
function initNavScrollState() {
  const header = document.querySelector('header.site-header');
  const backTop = document.getElementById('back-to-top');
  const progressBar = document.getElementById('page-scroll-bar');
  let rafPending = false;
  const paintScroll = () => {
    rafPending = false;
    const y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 12);
      const coverEnd = window.__COVER_END || window.innerHeight * 0.72;
      header.classList.toggle('on-cover', y < coverEnd - window.innerHeight * 0.5);
    }
    if (progressBar) {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const ratio = Math.min(1, Math.max(0, y / maxScroll));
      progressBar.style.transform = `scaleX(${ratio.toFixed(4)})`;
    }
    if (backTop) {
      const show = y > 600;
      backTop.classList.toggle('opacity-0', !show);
      backTop.classList.toggle('pointer-events-none', !show);
    }
    document.documentElement.classList.toggle('wp-fade', y > window.innerHeight * 0.62);
  };
  const onScroll = () => {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(paintScroll);
    }
    document.body.classList.add('is-scrolling');
    clearTimeout(onScroll._t);
    onScroll._t = setTimeout(() => document.body.classList.remove('is-scrolling'), 700);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { if (!rafPending) { rafPending = true; requestAnimationFrame(paintScroll); } }, { passive: true });
  paintScroll();
  if (backTop) {
    backTop.addEventListener('click', () => {
      smoothScrollTo(0);
      history.pushState(null, '', location.pathname);
    });
  }
}

// ScrollSpy：滚动时高亮当前区块对应的导航链接（产品页式"你在哪一节"）
// 判据：视口 38% 高度这条线落在哪个区块内（短区块也能命中，IO 阈值法会漏）
// 从顶部导航收集可见区块并按文档顺序排序（ScrollSpy 与逐页下翻共用）
// 桌面导航与移动抽屉两套 nav 指向同一批区块：按 id 去重，抽屉关闭时其链接也会命中
function collectNavSections() {
  const navLinks = [...document.querySelectorAll('header.site-header nav a[href^="#"]')];
  const seen = new Set();
  const sections = [];
  for (const a of navLinks) {
    const id = a.getAttribute('href').slice(1);
    if (seen.has(id)) continue;
    const s = document.getElementById(id);
    if (s && s.offsetHeight > 0) { seen.add(id); sections.push(s); }   // 空模块被 display:none 隐藏，rect.top=0 会抢高亮，剔除
  }
  sections.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  return { navLinks, sections };
}

function initScrollSpy() {
  const { navLinks, sections } = collectNavSections();
  if (!navLinks.length || !sections.length) return;
  // ❗一个区块对应多个链接（桌面导航 + 移动抽屉是两套 nav，href 相同）：
  // 以前按 href 去重只留最后一个，于是 .nav-active 永远落在抽屉里那条上，
  // 桌面导航其实从不高亮（2026-10-17 做导航胶囊时发现）。这里改成「同一 href 全部标记」。
  const byId = {};
  for (const a of navLinks) {
    const k = a.getAttribute('href').slice(1);
    (byId[k] || (byId[k] = [])).push(a);
  }

  const hudSecEl = document.getElementById('hud-sec-code');
  const hudSecLabels = {
    home: '01 · OVERVIEW',
    products: '02 · TOOLS',
    blog: '03 · NOTES',
    philosophy: '04 · PRINCIPLES',
    about: '05 · PROFILE'
  };
  const setActive = (id) => {
    const hit = byId[id] ?? [];
    navLinks.forEach((a) => a.classList.toggle('nav-active', hit.includes(a)));
    if (hudSecEl && hudSecLabels[id]) hudSecEl.textContent = hudSecLabels[id];
  };
  let ticking = false;
  const update = () => {
    ticking = false;
    const line = window.scrollY + window.innerHeight * 0.38;
    let cur = sections[0].id;
    for (const s of sections) {
      const top = s.getBoundingClientRect().top + window.scrollY;
      if (top <= line) cur = s.id;
    }
    // 滚到页底：点亮最后一个导航区块（尾部长内容不抢高亮）
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      cur = sections[sections.length - 1].id;
    }
    setActive(cur);
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

// 书页序列：封面 → 产品区头 → 每张产品卡各一页 → 其余导航区块（像一本书一页页翻）
function collectPageUnits() {
  const units = [];
  const add = (el) => { if (el && el.offsetHeight > 0) units.push(el); };
  add(document.getElementById('home'));
  const products = document.getElementById('products');
  if (products && products.offsetHeight > 0) {
    // 产品区标题页已删（2026-10-31，见 index.html products 注释）。
    // ❗不能保留 querySelector(':scope > .reveal')：栏目标题删掉后它会命中第一张卡，
    // 与下面的 :scope > article 重复入队
    products.querySelectorAll(':scope > article').forEach(add); // 每张产品卡一页
  }
  for (const s of collectNavSections().sections) {
    if (s.id !== 'home' && s.id !== 'products') add(s);
  }
  units.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  return units;
}

// 逐页下翻：底部居中箭头，像翻书一样每次点击滑到下一页顶部（产品区内逐卡翻）
function initPageNext() {
  const btn = document.getElementById('page-next');
  if (!btn) return;
  const units = collectPageUnits();
  if (units.length < 2) return;

  // 下一页 = 文档序里第一个页顶落在当前滚动位之下（阈值 = 页顶对齐位 64px + ε）的页。
  // 不用 ScrollSpy 的 38% 判线：矮页（区头/理念）会让判线跨页命中，导致提前"没有下一页"。
  const nextPage = () => {
    const threshold = window.scrollY + 70;
    for (const el of units) {
      if (el.getBoundingClientRect().top + window.scrollY >= threshold) return el;
    }
    return null;
  };

  const update = () => {
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    const hasNext = !atBottom && !!nextPage();
    btn.classList.toggle('opacity-0', !hasNext);
    btn.classList.toggle('pointer-events-none', !hasNext);
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();

  btn.addEventListener('click', () => {
    const next = nextPage();
    if (!next) return;
    const y = next.getBoundingClientRect().top + window.scrollY - 64;
    smoothScrollTo(Math.max(0, y));
    history.pushState(null, '', next.id ? '#' + next.id : location.pathname);
  });
}

// 产品区滚动吸附：CSS Scroll Snap 的两个补丁（吸附本体在 css/style.css）
// ----------------------------------------------------
// 吸附本身是标准 CSS：html { scroll-snap-type: y proximity } + 卡片 scroll-snap-align: start。
// 这里只补两件 CSS 自己做不到的事（2026-10-17 实测 1440×900）：
//   ① 滚轮一格 = 翻一屏：proximity 在整屏卡片上会留死区（单次滚 500px 停在半张卡上，
//      既不翻页也不自由），鼠标滚轮两格之间还会被回弹吃掉（连滚 5 格位移 0）；
//   ② 到头逃生口：滚到最后一张还想往下（或第一张往上）时先给 html 挂 .no-snap 摘掉吸附，
//      否则 proximity 会把页面吸回原卡（实测滚 240px 位移 0）；回到卡序列里再恢复。
// 锚点 / 键盘 / 触屏全程原生，不接管。断点与 CSS 那条媒体查询一致。
function initProjectSnap() {
  // 左右双栏紧凑化重构后，卡片采用左右网格排列，全面使用原生平滑滚动；
  // 移除滚轮 preventDefault 拦截，确保用户往下滑动时毫无黏滞与冲突。
}

// 锚点/按钮滚动：直接用**原生平滑滚动**（合成器线程驱动，不逐帧写 scrollTo）
// ----------------------------------------------------
// 2026-10-17 撤掉原先的 Lenis 式阻尼滚动（滚轮 preventDefault + 每帧 scrollTo 追 150ms lerp）。
// 实测代价（1440×900 / 165Hz）：滚轮停下后页面还会继续滑 ~989ms，最长单帧 55ms ——
// 桌面指针与触控板的手感会明显发黏，且与系统惯性、无障碍设置打架。
// 现在：滚轮完全交给浏览器；只有锚点/回顶/翻页这类"程序化跳转"才做平滑，且由合成器执行。
// 想找回阻尼版：git show 7f1e57e:js/app.js（initDampedScroll 仍在历史里）。
let smoothScrollTo = function (targetY) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: targetY, behavior: reduce ? 'auto' : 'smooth' });
};
// 暴露给 search.js 等模块复用
window.smoothScrollTo = function (y) { smoothScrollTo(y); };

function initSmoothAnchors() {
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const y = href === '#home' ? 0 : target.getBoundingClientRect().top + window.scrollY - 64;
    // 产品页式切换：缓动滑到目标区块，区块内容由 reveal 级联浮现
    smoothScrollTo(Math.max(0, y));
    history.pushState(null, '', href);
  });
}

// 文章弹窗阅读进度条：随弹窗内滚动更新宽度（内容不满一屏时保持 0）
function initArticleProgress() {
  const modal = document.getElementById('article-modal');
  const content = document.getElementById('article-modal-content');
  const bar = document.getElementById('article-progress');
  if (!bar) return;

  const onScroll = () => {
    const scroller = (modal && modal.scrollTop > 5) ? modal : (content || modal);
    if (!scroller) return;
    const max = scroller.scrollHeight - scroller.clientHeight;
    const ratio = max > 20 ? Math.min(Math.max(scroller.scrollTop / max, 0), 1) : 0;
    bar.style.width = `${(ratio * 100).toFixed(1)}%`;
  };

  if (content) content.addEventListener('scroll', onScroll, { passive: true });
  if (modal) modal.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
}

// 为弹窗内的代码块追加微语言徽标与一键复制按钮（含状态反馈）
function addCopyButtons(modalContent) {
  modalContent.querySelectorAll('pre').forEach((pre) => {
    // 语言徽标识别与挂载
    const codeEl = pre.querySelector('code');
    let lang = '';
    if (codeEl) {
      const cls = codeEl.className || '';
      const m = cls.match(/(?:language|lang)-([a-zA-Z0-9_+-]+)/);
      if (m) lang = m[1];
    }
    const langMap = {
      js: 'JS',
      javascript: 'JavaScript',
      ts: 'TypeScript',
      typescript: 'TypeScript',
      py: 'Python',
      python: 'Python',
      cs: 'C#',
      csharp: 'C#',
      html: 'HTML',
      css: 'CSS',
      json: 'JSON',
      bash: 'Bash',
      sh: 'Shell',
      shell: 'Shell',
      powershell: 'PowerShell',
      ps1: 'PowerShell',
      sql: 'SQL',
      rust: 'Rust',
      rs: 'Rust',
      go: 'Go',
      yaml: 'YAML',
      yml: 'YAML'
    };
    const displayLang = langMap[lang.toLowerCase()] || (lang ? lang.toUpperCase() : 'CODE');

    // 保证 pre 拥有固定的外层定位容器 .code-wrap，横向滚动超长代码时不拉扯按钮与徽标
    let wrap = pre.closest('.code-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'code-wrap';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
    }

    if (!wrap.querySelector('.code-lang-badge')) {
      const badge = document.createElement('span');
      badge.className = 'code-lang-badge';
      badge.textContent = displayLang;
      wrap.appendChild(badge);
    }

    if (!navigator.clipboard || wrap.querySelector('.code-copy-btn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy-btn';
    btn.textContent = '复制';
    btn.setAttribute('aria-label', '复制代码');

    btn.addEventListener('click', async () => {
      try {
        let textToCopy = '';
        if (codeEl) {
          textToCopy = codeEl.innerText || codeEl.textContent || '';
        } else {
          const clone = pre.cloneNode(true);
          clone.querySelectorAll('.code-copy-btn, .code-lang-badge').forEach((el) => el.remove());
          textToCopy = clone.innerText || clone.textContent || '';
        }
        await navigator.clipboard.writeText(textToCopy);
        if (btn._copyTimer) clearTimeout(btn._copyTimer);
        btn.textContent = '✓ 已复制';
        btn.classList.add('is-copied');
        btn._copyTimer = setTimeout(() => {
          btn.textContent = '复制';
          btn.classList.remove('is-copied');
          btn._copyTimer = null;
        }, 1500);
      } catch (_) { /* 用户拒绝剪贴板权限时保持原样 */ }
    });
    wrap.appendChild(btn);
  });
}

// 弹窗焦点管理：Tab 在弹窗内循环，不落到背景页面
function trapModalFocus(modal, e) {
  const focusables = [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((el) => el.offsetParent !== null);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

// 弹窗关闭动画（加速退出），重开时取消未完成的关闭定时器
function animateModalClose(modal) {
  if (!modal || modal.classList.contains('hidden') || modal.classList.contains('is-closing')) return;
  document.body.style.overflow = '';
  if (modal._lastFocus && modal._lastFocus.focus) modal._lastFocus.focus({ preventScroll: true });
  modal.classList.add('is-closing');
  modal._closeTimer = setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('is-closing');
    modal._closeTimer = null;
    modal.scrollTop = 0;
    const inner = modal.querySelector('#article-modal-content, #project-modal-content');
    if (inner) inner.scrollTop = 0;
  }, 240);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// marked v15 起不再内置 sanitize，解析结果里的原生 HTML 会原样透传——
// 正文数据虽为仓库内静态内容，这里仍统一过一层 DOMPurify 白名单净化（2026-10-01 体检 SEC-4），
// 未来接入评论/远程内容源时不再有"直接 innerHTML"的注入面。
// details/summary 是 README 折叠注解的官方写法，显式放行防止净化误伤。
function sanitizeMarkdownHtml(html) {
  if (window.DOMPurify) {
    return window.DOMPurify.sanitize(html, { ADD_TAGS: ['details', 'summary'], ADD_ATTR: ['open'] });
  }
  return html;
}

/* 清理早期多背景切换遗留的 localStorage 键（现统一锁定 3D 声学谐振场） */
try { localStorage.removeItem('sj.cosmos-mode'); } catch (e) {}

/* ============================================================
   首屏伴读音乐胶囊与 HUD 声学谐振指示联动
   ============================================================ */
(function initHeroMusic() {
  const heroMusicCapsule = document.getElementById('cosmos-enter');
  const heroMusicStatus = document.getElementById('hero-music-status');
  const hudRight = document.querySelector('.cosmos-hud.tr');
  const audio = document.getElementById('music-audio') || document.querySelector('audio');

  const updateAudioUI = (isPlaying, trackTitle) => {
    if (heroMusicCapsule) {
      heroMusicCapsule.classList.toggle('is-playing', isPlaying);
    }
    if (hudRight) {
      hudRight.classList.toggle('is-resonating', isPlaying);
    }
    if (heroMusicStatus) {
      const name = trackTitle || document.getElementById('music-title')?.textContent || '';
      heroMusicStatus.textContent = isPlaying
        ? (name && name !== '背景音乐' ? `律动 · ${name}` : '正在律动')
        : '播放音乐';
    }
  };

  window.addEventListener('sj-music-state', (e) => {
    if (e.detail) updateAudioUI(!!e.detail.playing, e.detail.title);
  });

  if (audio) {
    audio.addEventListener('play', () => updateAudioUI(true));
    audio.addEventListener('pause', () => updateAudioUI(false));
    audio.addEventListener('ended', () => updateAudioUI(false));
    audio.addEventListener('error', () => updateAudioUI(false));
    setTimeout(() => {
      updateAudioUI(!audio.paused && audio.currentTime > 0);
    }, 100);
  }
})();

/* ============================================================
   全站产品视频自适应预加载与单路播放互斥（PC / 移动端）
   ============================================================ */
(function initAdaptiveVideos() {
  const videos = Array.from(document.querySelectorAll('video.cover-video'));
  if (!videos.length) return;

  // 单路播放互斥：同时只允许一个产品视频解码播放，避免移动端内存峰值与带宽竞争
  videos.forEach((v) => {
    if (v.preload !== 'none') v.preload = 'none';
    v.addEventListener('play', () => {
      videos.forEach((other) => {
        if (other !== v && (!other.paused || other.dataset.opening === '1')) {
          delete other.dataset.opening;
          if (!other.paused) {
            try { other.pause(); } catch (_) {}
          }
          try {
            window.dispatchEvent(new CustomEvent('sj-video-force-stop', { detail: { video: other } }));
          } catch (_) {}
        }
      });
    });
  });
})();

;

// ---- js/nav-indicator.js (6af08d84d883) ----
/**
 * 导航当前项胶囊（js/app.js 的 ScrollSpy 已经算出当前区块，这里只负责"把它画出来"）
 * ----------------------------------------------------
 * 参考站的 Navbar 用 layoutID 共享布局动画做这件事；本站零依赖，等价做法是：
 *   跟 .nav-active 的类变化 → 把胶囊的 transform/width 写成当前项的 offsetLeft/offsetWidth。
 * 只动 transform 与 width，不碰 left/top，避免每帧触发布局；过渡曲线用站点既有的 --ease-swift。
 *
 * 兼容与退让：
 *   - 只在桌面细指针启用（触摸设备上小屏导航本来就不显示，胶囊没有意义）
 *   - 启用后由 html.nav-pill-on 把原来的下划线高亮关掉，避免双标记
 *   - 窗口 resize / 字体加载完成 / 弹窗开关导致偏移变化时重算
 *   - prefers-reduced-motion：不写过渡（位置直接跳），CSS 里兜住
 */
(function () {
  'use strict';

  const nav = document.querySelector('header.site-header .max-w-6xl > nav');
  if (!nav) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const links = [...nav.querySelectorAll('a[href^="#"]')];
  if (links.length < 2) return;

  const pill = document.createElement('span');
  pill.className = 'nav-pill';
  pill.setAttribute('aria-hidden', 'true');
  nav.appendChild(pill);
  nav.classList.add('nav-pill-on');     // CSS 借它关掉下划线

  let current = null;

  function place(el) {
    // 导航在 md 以下是被 hidden 掉的，offsetParent 为 null —— 这时别把胶囊画出来
    if (!el || nav.offsetParent === null) {
      pill.style.opacity = '0';
      return;
    }
    pill.style.opacity = '1';
    pill.style.width = el.offsetWidth + 12 + 'px';
    pill.style.height = el.offsetHeight + 8 + 'px';
    // 左右各留 6px 内边距，视觉上包住文字；垂直靠 translateY(-50%) 居中
    pill.style.transform = `translate3d(${el.offsetLeft - 6}px, -50%, 0)`;
  }

  function sync() {
    const active = links.find((a) => a.classList.contains('nav-active')) || null;
    if (active === current) return;
    current = active;
    place(active);
  }

  // app.js 是 classList.toggle('nav-active') 改的状态 —— 观察属性比轮询精确
  const mo = new MutationObserver(sync);
  links.forEach((a) => mo.observe(a, { attributes: true, attributeFilter: ['class'] }));

  // 首屏定位：app.js 的首次 update 可能在字体就位前后各跑一次，这里三重保险
  sync();
  requestAnimationFrame(sync);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync).catch(() => {});

  let raf = 0;
  const relayout = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const keep = current;
      current = null;
      place(keep);          // 直接按当前项重算偏移
    });
  };
  window.addEventListener('resize', relayout);
  // 弹窗打开会锁滚动（影响 ScrollSpy 的值），关掉时再对一次
  ['#article-modal', '#project-modal'].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) new MutationObserver(relayout).observe(el, { attributes: true, attributeFilter: ['class'] });
  });
})();

;

// ---- js/player.js (8ca8a374c56f) ----
/**
 * 右下角悬浮背景音乐播放器
 * ----------------------------------------------------
 * - 音频不进 SW 预缓存：首次在线播放后由 SW 运行时缓存接管，断网也能复播
 * - ❗零播放记录（2026-09-29 应要求移除续听记忆）：不记听到哪首/听到几秒，
 *   每个访客都从第一首开始；旧续听键主动清除——共用设备不留下上一个人的收听痕迹
 * - 歌单改动直接改 SONGS 数组（src 用 ASCII 文件名，title 保留原名）
 * - 循环模式：顺序循环（默认）/ 单曲循环，模式按钮切换，localStorage 持久化
 * - 自定义歌曲顺序：歌单每项 ↑↓ 移动，顺序持久化（按 src 记录，新增曲目排尾）
 * - 音乐律动：AnalyserNode 产出 window.__BEAT（level/lv/mid/treble），js/cosmos/ 推理场每帧读取
 *   驱动外扩 / 涡流 / 云核爆亮 / 流星（同源 mp3 无 CORS 问题；MediaElementSource 对同一元素只能建一次）
 */
(function () {
  'use strict';

  const SONGS = [
    { src: 'music/attention.mp3',          title: 'Attention' },
    { src: 'music/call-of-silence.mp3',    title: 'Call of Silence' },
    { src: 'music/dark-aria.mp3',          title: 'DARK ARIA' },
    { src: 'music/episode-33.mp3',         title: 'Episode 33' },
    { src: 'music/letting-go.mp3',         title: 'LETTING GO' },
    { src: 'music/sakura.mp3',             title: 'SAKURA' },
    { src: 'music/take-me-hand.mp3',       title: 'Take Me Hand' },
    { src: 'music/tek-it.mp3',             title: 'Tek It' },
    { src: 'music/time-machine.mp3',       title: 'time machine (feat. aren park)' },
    { src: 'music/hoshi-to-bokura-to.mp3', title: '星と僕らと' },
    { src: 'music/kami-no-manimani.mp3',   title: '神のまにまに' }
  ];

  // 全站访客本地数据统一 sj. 前缀；旧版「续听」键在这里主动清除（零播放记录）
  const LS_RESUME = 'sj.music-resume';
  const LS_MODE = 'sj.music-mode';
  const LS_ORDER = 'sj.music-order';
  const legacy = (k) => { try { return localStorage.getItem(k.replace('sj.', '')); } catch (e) { return null; } };

  const audio = document.getElementById('music-audio');
  const fab = document.getElementById('music-fab');
  const panel = document.getElementById('music-panel');
  const titleEl = document.getElementById('music-title');
  const listEl = document.getElementById('music-list');
  const seekEl = document.getElementById('music-seek');
  const curEl = document.getElementById('music-cur');
  const durEl = document.getElementById('music-dur');
  const playBtn = document.getElementById('music-play');
  const prevBtn = document.getElementById('music-prev');
  const nextBtn = document.getElementById('music-next');
  const closeBtn = document.getElementById('music-close');
  const modeBtn = document.getElementById('music-mode');

  let current = 0;      // 当前曲目索引
  let seeking = false;  // 进度条拖动中，暂停 timeupdate 覆盖
  let mode = 'list';    // 'list' 顺序循环 | 'one' 单曲循环

  // —— 工具 ——
  const fmt = (s) => {
    if (!isFinite(s)) return '0:00';
    s = Math.floor(s);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  // 零播放记录：清掉老版本留下的续听键（含旧前缀）
  const clearResume = () => {
    try {
      localStorage.removeItem(LS_RESUME);
      localStorage.removeItem('music-resume');
    } catch (e) { /* 隐私模式等场景静默跳过 */ }
  };

  // —— 自定义顺序 ——
  function applyOrder() {
    try {
      const order = JSON.parse(localStorage.getItem(LS_ORDER) || legacy(LS_ORDER) || 'null');
      if (Array.isArray(order) && order.length) {
        const bySrc = new Map(SONGS.map(function (s) { return [s.src, s]; }));
        const next = [];
        for (const src of order) {
          const s = bySrc.get(src);
          if (s) { next.push(s); bySrc.delete(src); }
        }
        for (const s of bySrc.values()) next.push(s);   // 新增曲目排尾
        SONGS.length = 0;
        for (const s of next) SONGS.push(s);
      }
    } catch (e) { /* 数据损坏则用内置顺序 */ }
  }
  const saveOrder = () => {
    try { localStorage.setItem(LS_ORDER, JSON.stringify(SONGS.map(function (s) { return s.src; }))); } catch (e) {}
  };

  // —— 音乐律动：节拍包络 → window.__BEAT ——
  // 不用低频均值（那是恒定值，眼睛看不出"律动"）：瞬时能量对比慢速均值，
  // 超过阈值算一拍，冲高立即、回落带衰减 —— 视觉上是"哐→散"的冲击感。
  let actx = null, analyser = null, beatRaf = 0;
  let beatPulse = 0, beatLock = 0, beatPrevT = 0;
  const BEAT_ARR = new Float32Array(1024);   // fftSize 2048 → 1024 bins（dB 域）
  const BEAT_HIST = [];                      // bass 功率历史（~0.8s，自适应中值阈值用）
  let beatPeak = 0.05;                       // AGC：3s 衰减式峰值跟随（初值取典型 RMS 量级，过高会让开头律动沉底）
  let bassEnv = 0, midEnv = 0, treEnv = 0;   // 非对称指数包络（attack 10ms / release 120ms）
  // 缓存视频节点与频谱控件：彻底消除 beatLoop 每秒 60~120 次的 querySelectorAll 开销
  let cachedProductVideos = null;
  let cachedHeroMusicBtn = null;
  let cachedHudRight = null;
  function getProductVideos() {
    if (!cachedProductVideos) {
      cachedProductVideos = Array.from(document.querySelectorAll('#products video')).map((v) => ({
        v,
        box: v.closest('.cover-box')
      }));
    }
    return cachedProductVideos;
  }
  function emitMusicState() {
    try {
      window.dispatchEvent(new CustomEvent('sj-music-state', {
        detail: {
          playing: !!(audio && !audio.paused),
          title: SONGS[current] ? SONGS[current].title : '背景音乐',
          index: current,
          total: SONGS.length
        }
      }));
    } catch (e) {}
  }

  function beatLoop() {
    // ❗句柄必须"只在本帧排下一帧"时赋值：早先写成帧首 beatRaf = rAF(...)，
    // 而切歌/暂停会触发 stopBeat() 把这个句柄 cancel 掉——但此时下一帧其实已经
    // 排进队列，cancel 的却是"再下一帧"的句柄，于是出现"取消后又复活"的错位；
    // 反复几次句柄就永久失真，视觉上表现为放歌一段时间后律动整体消失（实测 9s 后归零）。
    if (!analyser) { beatRaf = 0; return; }
    const nw = performance.now();
    const dt = beatPrevT ? Math.min(0.1, (nw - beatPrevT) / 1000) : 0.016;
    beatPrevT = nw;
    // 信号链对齐 cosmos/audio 的深度调研结论（2026-09-30）：
    // float 数据（byte 是 dB 重映射且 -30dBFS 上限对响歌大量钳 255）+ smoothing 0
    // （内置 EMA 抹瞬态，平滑交给下面的非对称指数包络）+ Hz 边界频段（采样率自适应）。
    analyser.getFloatFrequencyData(BEAT_ARR);
    const fs = actx.sampleRate, nBins = analyser.fftSize / 2;
    const hz0 = (f) => Math.min(nBins - 1, Math.max(0, Math.round(f * nBins / fs)));
    const bandRMS = (lo, hi) => {
      let s = 0, n = 0;
      for (let i = lo; i <= hi && i < nBins; i++) { const lin = Math.pow(10, BEAT_ARR[i] / 20); s += lin * lin; n++; }
      return Math.sqrt(s / Math.max(1, n));
    };
    const energy = bandRMS(hz0(60), hz0(250));       // bass 60-250Hz：kick/贝斯冲击区
    const midRaw = bandRMS(hz0(250), hz0(4000));
    const treRaw = bandRMS(hz0(4000), hz0(12000));
    // 非对称指数包络：起音快（10ms 跟瞬态）、回落慢（120ms 有余韵），帧率无关
    const envStep = (cur, tgt) => cur + (tgt - cur) * (1 - Math.exp(-dt / (tgt > cur ? 0.010 : 0.120)));
    bassEnv = envStep(bassEnv, energy);
    midEnv = envStep(midEnv, midRaw);
    treEnv = envStep(treEnv, treRaw);
    // AGC：对 3s 衰减式峰值归一——安静歌有反应、响歌不过冲（写死的幅度必然顾此失彼）
    beatPeak = Math.max(bassEnv, beatPeak * Math.exp(-dt / 3.0));
    const lv = Math.min(1, bassEnv / (beatPeak + 1e-4));
    const mid = Math.min(1, midEnv / (beatPeak + 1e-4));
    const tre = Math.min(1, treEnv / (beatPeak + 1e-4));
    // 节拍：bass 瞬时功率 vs 最近 ~0.8s 历史中值 ×1.35（自适应中值阈值）+ 噪声门 + 280ms 不应期
    // （与 js/cosmos/audio/BeatDetector.js 同一套算法；检测在功率域 e=bassEnv² 上做）
    const e = bassEnv * bassEnv;
    BEAT_HIST.push(e);
    if (BEAT_HIST.length > 48) BEAT_HIST.shift();
    if (BEAT_HIST.length > 20) {
      const sorted = BEAT_HIST.slice().sort((a, b) => a - b);
      const med = sorted[sorted.length >> 1];
      let peak = 0;
      for (const v of BEAT_HIST) if (v > peak) peak = v;
      if (e > peak * 0.1 && e > med * 1.35 && nw - beatLock > 280) {
        beatLock = nw;
        beatPulse = Math.min(1, Math.sqrt(e / (med + 1e-6)) * 0.8);
      }
    }
    beatPulse *= Math.exp(-dt / 0.30);               // 指数回落（线性回落观感生硬）
    if (beatPulse < 0.02) beatPulse = 0;
    const bp = Math.min(1, beatPulse);
    window.__BEAT = {
      level: bp, lv: lv, slow: beatPeak, rise: e,
      mid: mid, treble: tre, ctx: actx ? actx.state : '-'
    };

    // 实时驱动首屏音频胶囊四段频谱柱与悬浮 FAB 微律动（纯 transform scaleY 变量，零回流）
    if (!cachedHeroMusicBtn) cachedHeroMusicBtn = document.getElementById('cosmos-enter');
    if (!cachedHudRight) cachedHudRight = document.querySelector('.cosmos-hud.tr');
    const e1 = (0.24 + Math.min(1, lv * 0.65 + bp * 0.35) * 0.76).toFixed(3);
    const e2 = (0.28 + Math.min(1, mid * 0.60 + bp * 0.40) * 0.72).toFixed(3);
    const e3 = (0.22 + Math.min(1, (mid + tre) * 0.42 + bp * 0.30) * 0.78).toFixed(3);
    const e4 = (0.20 + Math.min(1, tre * 0.70 + bp * 0.25) * 0.80).toFixed(3);
    if (cachedHeroMusicBtn && cachedHeroMusicBtn.classList.contains('is-playing')) {
      cachedHeroMusicBtn.style.setProperty('--eq-1', e1);
      cachedHeroMusicBtn.style.setProperty('--eq-2', e2);
      cachedHeroMusicBtn.style.setProperty('--eq-3', e3);
      cachedHeroMusicBtn.style.setProperty('--eq-4', e4);
    }
    if (fab && fab.classList.contains('is-playing')) {
      fab.style.setProperty('--beat-scale', (1 + bp * 0.06).toFixed(3));
    }
    if (cachedHudRight) {
      cachedHudRight.style.setProperty('--hud-beat', bp.toFixed(3));
    }

    // 若当前有介绍视频正在播放，驱动对应视频视窗的外框光晕律动（走缓存列表，零 DOM 查询）
    const vids = getProductVideos();
    for (let k = 0; k < vids.length; k++) {
      const item = vids[k];
      if (!item.v.paused && !item.v.ended) {
        if (item.box) {
          item.box.classList.add('is-playing-beat');
          item.box.style.setProperty('--beat-pulse', (bp * 0.75 + lv * 0.25).toFixed(3));
        }
        break;
      }
    }

    beatRaf = requestAnimationFrame(beatLoop);   // 续帧放帧尾：帧内任何早退都不会留下悬空句柄
  }
  function ensureAudioGraph() {
    if (actx && analyser) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    analyser = actx.createAnalyser();
    analyser.fftSize = 2048;                 // bin ≈ 23Hz@48k：kick 40-150Hz 可分辨
    analyser.smoothingTimeConstant = 0;      // 平滑交给 beatLoop 的非对称指数包络
    analyser.minDecibels = -85;              // 默认 -30 上限对响歌大量钳 255
    analyser.maxDecibels = -20;
    analyser.connect(actx.destination);
  }

  function connectMediaSource(el) {
    if (!el || el._audioSourceNode) return;
    try {
      ensureAudioGraph();
      if (!actx || !analyser) return;
      const srcNode = actx.createMediaElementSource(el);
      srcNode.connect(analyser);
      el._audioSourceNode = srcNode;
    } catch (e) {
      /* 跨源或重复建图守卫，失败不影响播放 */
    }
  }

  function startBeat(sourceEl) {
    try {
      ensureAudioGraph();
      if (!actx || !analyser) return;
      if (sourceEl) connectMediaSource(sourceEl);
      else if (audio) connectMediaSource(audio);
      if (actx.state === 'suspended') actx.resume().catch(function () {});
      if (!beatRaf) beatRaf = requestAnimationFrame(beatLoop);
    } catch (e) { /* 建图失败不影响播放本身 */ }
  }

  function stopBeat() {
    const anyVideoPlaying = Array.from(document.querySelectorAll('#products video')).some(function (v) {
      return !v.paused && !v.ended;
    });
    // 若当前仍有介绍视频在播，不要中止视频驱动的律动图
    if (anyVideoPlaying) return;

    if (beatRaf) { cancelAnimationFrame(beatRaf); beatRaf = 0; }
    window.__BEAT = { level: 0, lv: 0, mid: 0, treble: 0 };
    document.querySelectorAll('#products .cover-box').forEach(function (box) {
      box.classList.remove('is-playing-beat');
      box.style.removeProperty('--beat-pulse');
    });
  }

  // —— 循环模式 ——
  function applyMode() {
    audio.loop = (mode === 'one');   // 单曲循环交给浏览器：loop 时 ended 不触发，行为最稳
    modeBtn.classList.toggle('mode-one', mode === 'one');
    modeBtn.setAttribute('aria-label', '循环模式：' + (mode === 'one' ? '单曲循环' : '顺序循环'));
  }

  // —— 渲染 ——
  function renderList() {
    listEl.replaceChildren();
    SONGS.forEach((song, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = (i + 1) + '. ' + song.title;
      btn.setAttribute('aria-label', '播放 ' + song.title);
      if (i === current) btn.classList.add('is-current');
      btn.addEventListener('click', () => { startBeat(); load(i, true); });
      li.appendChild(btn);
      // 上移/下移：自定义歌单顺序
      const mk = (dir) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'song-move';
        b.textContent = dir < 0 ? '↑' : '↓';
        b.setAttribute('aria-label', (dir < 0 ? '上移' : '下移') + '：' + song.title);
        b.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const j = i + dir;
          if (j < 0 || j >= SONGS.length) return;
          const tmp = SONGS[i]; SONGS[i] = SONGS[j]; SONGS[j] = tmp;
          if (current === i) current = j; else if (current === j) current = i;
          saveOrder(); renderList();
        });
        return b;
      };
      li.appendChild(mk(-1));
      li.appendChild(mk(1));
      listEl.appendChild(li);
    });
  }

  function renderMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: SONGS[current].title,
      artist: '楠屿札记 · 博客 BGM'
    });
  }

  // —— 播放控制 ——
  let hasUserPlayed = false;
  let stopAllVideosForMusic = () => {};
  const isSaveNet = () => {
    const c = navigator.connection;
    return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
  };

  function prefetchCurrentAndNext() {
    if (!hasUserPlayed && audio.paused) return;
    const curUrl = audio.currentSrc || audio.src;
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      if (curUrl) navigator.serviceWorker.controller.postMessage({ type: 'prefetch-media', url: curUrl });
      const nextSong = SONGS[(current + 1) % SONGS.length];
      if (nextSong) navigator.serviceWorker.controller.postMessage({ type: 'prefetch-media', url: nextSong.src });
    }
  }

  function load(i, autoplay) {
    current = (i + SONGS.length) % SONGS.length;
    if (autoplay) {
      hasUserPlayed = true;
      stopAllVideosForMusic();
      try { audio.preload = 'auto'; } catch (e) {}
    }
    audio.src = SONGS[current].src;
    titleEl.textContent = SONGS[current].title;
    renderList();
    renderMediaSession();
    emitMusicState();
    if (autoplay) {
      audio.play().catch(() => { /* 用户未交互等场景静默 */ });
    } else {
      seekEl.value = 0;
      curEl.textContent = '0:00';
      durEl.textContent = '0:00';
    }
  }

  // 当前曲目真实起播且已缓冲就绪后再静默入库（未点播放绝不触发全曲缓存）：
  audio.addEventListener('canplaythrough', prefetchCurrentAndNext);
  audio.addEventListener('playing', function () {
    hasUserPlayed = true;
    if (audio.readyState >= 4) prefetchCurrentAndNext();
  });

  // 首曲瞬启预热：仅缓冲首段可播帧（canplay 或 8s 后若仍暂停则回落 metadata，绝不下全曲）：
  let primed = false;
  function prime() {
    if (primed) return;
    primed = true;
    const saveNet = isSaveNet();
    try { audio.preload = saveNet ? 'metadata' : 'auto'; } catch (e) {}
    if (!audio.src) audio.src = SONGS[current].src;
    if (!saveNet) {
      let settled = false;
      const dialBack = () => {
        if (settled) return;
        settled = true;
        audio.removeEventListener('canplay', dialBack);
        if (audio.paused) {
          try { audio.preload = 'metadata'; } catch (e) {}
        }
      };
      audio.addEventListener('canplay', dialBack, { once: true });
      if (audio.readyState >= 3) dialBack();
      else setTimeout(dialBack, 8000);
    }
  }

  function togglePlay() {
    if (!audio.src) { load(current, true); return; }
    if (audio.paused) {
      hasUserPlayed = true;
      stopAllVideosForMusic();
      try { audio.preload = 'auto'; } catch (e) {}
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  function restore() {
    clearResume();          // 零播放记录：老访客的续听键一并清掉
    applyOrder();
    try { mode = (localStorage.getItem(LS_MODE) || legacy(LS_MODE)) === 'one' ? 'one' : 'list'; } catch (e) {}
    titleEl.textContent = SONGS[current].title;
    applyMode();
    renderList();
    renderMediaSession();
  }

  // —— 事件绑定 ——
  // 给外部入口用（hero「放首歌」按钮）：手势内建图 + 播放/暂停
  window.__MUSIC = { togglePlay: function () { startBeat(); togglePlay(); } };
  const enterBtn = document.getElementById('cosmos-enter');
  if (enterBtn) enterBtn.addEventListener('click', function () { window.__MUSIC.togglePlay(); });
  // —— FAB 拖拽换位（无极定位，位置持久化；拖完松手的那次 click 不触发开合）——
  const FAB_KEY = 'sj.music-fab-pos';
  let drag = null, dragMoved = false;
  function applyFabPos(x, y) {
    const w = fab.offsetWidth, h = fab.offsetHeight;
    x = Math.min(Math.max(8, x), innerWidth - w - 8);
    y = Math.min(Math.max(8, y), innerHeight - h - 8);
    fab.style.left = x + 'px';
    fab.style.top = y + 'px';
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
    fab.style.marginLeft = '0';
    // 面板跟随 FAB 上方弹出（水平 clamp 防溢出）
    const cx = Math.min(Math.max(165, x + w / 2), innerWidth - 165);
    panel.style.left = (cx - panel.offsetWidth / 2) + 'px';
    panel.style.bottom = (innerHeight - y + 12) + 'px';
    panel.style.right = 'auto';
  }
  try {
    const savedPos = JSON.parse(localStorage.getItem(FAB_KEY) || 'null');
    if (savedPos) applyFabPos(savedPos.x, savedPos.y);
  } catch (e) {}
  fab.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const r = fab.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    dragMoved = false;
    try { fab.setPointerCapture(e.pointerId); } catch (err) {}
  });
  fab.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!dragMoved && Math.abs(e.movementX) + Math.abs(e.movementY) < 2) return;
    dragMoved = true;
    applyFabPos(e.clientX - drag.dx, e.clientY - drag.dy);
  });
  const endDrag = () => {
    if (drag && dragMoved) {
      try {
        localStorage.setItem(FAB_KEY, JSON.stringify({ x: parseFloat(fab.style.left), y: parseFloat(fab.style.top) }));
      } catch (err) {}
    }
    drag = null;
  };
  fab.addEventListener('pointerup', endDrag);
  fab.addEventListener('pointercancel', endDrag);
  fab.addEventListener('click', () => {
    if (dragMoved) { dragMoved = false; return; }
    const open = panel.classList.toggle('music-open');
    fab.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) prime();          // 打开面板 = 有听歌意图，这时才开始加载音轨
  });

  // 悬停/触控/聚焦播放入口即刻预热首帧；首次交互与首屏空闲后也轻度预热（省流/2G 跳过非主动预热）
  [enterBtn, fab].forEach((el) => {
    if (!el) return;
    ['pointerenter', 'touchstart', 'focus'].forEach((ev) => {
      el.addEventListener(ev, prime, { once: true, passive: true });
    });
  });
  const primeOnInteract = () => {
    if (!isSaveNet()) prime();
  };
  ['pointerdown', 'keydown', 'wheel'].forEach((ev) => {
    window.addEventListener(ev, primeOnInteract, { once: true, passive: true });
  });
  const scheduleIdlePrime = () => {
    if (isSaveNet()) return;
    setTimeout(() => {
      if (isSaveNet()) return;
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(prime, { timeout: 1000 });
      } else {
        setTimeout(prime, 600);
      }
    }, 1200);
  };
  if (document.readyState === 'complete') scheduleIdlePrime();
  else window.addEventListener('load', scheduleIdlePrime, { once: true });
  closeBtn.addEventListener('click', () => {
    panel.classList.remove('music-open');
    fab.setAttribute('aria-expanded', 'false');
  });

  playBtn.addEventListener('click', () => { startBeat(); togglePlay(); });   // 点击即建音频图（用户手势内 resume 最稳）
  prevBtn.addEventListener('click', () => { startBeat(); load(current - 1, !audio.paused); });
  nextBtn.addEventListener('click', () => { startBeat(); load(current + 1, !audio.paused); });
  modeBtn.addEventListener('click', () => {
    mode = mode === 'one' ? 'list' : 'one';
    try { localStorage.setItem(LS_MODE, mode); } catch (e) {}
    applyMode();
  });

  audio.addEventListener('play', () => {
    playBtn.classList.add('is-playing');
    fab.classList.add('is-playing');
    startBeat();   // 兜底（正常路径已在手势里建图）
    renderMediaSession();
    emitMusicState();
  });
  audio.addEventListener('pause', () => {
    playBtn.classList.remove('is-playing');
    fab.classList.remove('is-playing');
    fab.style.removeProperty('--beat-scale');
    const anyVideoPlaying = getProductVideos().some(function (it) {
      return !it.v.paused && !it.v.ended;
    });
    if (!anyVideoPlaying) stopBeat();
    emitMusicState();
  });
  audio.addEventListener('error', stopBeat);
  // 单曲循环（mode==='one'）由 audio.loop 处理，ended 只在顺序循环走到这里
  audio.addEventListener('ended', () => { load(current + 1, true); });
  audio.addEventListener('loadedmetadata', () => { durEl.textContent = fmt(audio.duration); });
  audio.addEventListener('timeupdate', () => {
    if (seeking || !isFinite(audio.duration)) return;
    seekEl.value = (audio.currentTime / audio.duration) * 100 || 0;
    curEl.textContent = fmt(audio.currentTime);
  });

  seekEl.addEventListener('input', () => {
    seeking = true;
    curEl.textContent = fmt((seekEl.value / 100) * audio.duration);
  });
  seekEl.addEventListener('change', () => {
    if (isFinite(audio.duration)) audio.currentTime = (seekEl.value / 100) * audio.duration;
    seeking = false;
  });

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        startBeat();
        if (!audio.src) load(current, true);
        else if (audio.paused) {
          hasUserPlayed = true;
          stopAllVideosForMusic();
          try { audio.preload = 'auto'; } catch (e) {}
          audio.play().catch(() => {});
        }
      });
    } catch (e) {}
    try {
      navigator.mediaSession.setActionHandler('pause', () => {
        if (!audio.paused) audio.pause();
      });
    } catch (e) {}
    try {
      navigator.mediaSession.setActionHandler('previoustrack', () => { startBeat(); load(current - 1, !audio.paused); });
    } catch (e) {}
    try {
      navigator.mediaSession.setActionHandler('nexttrack', () => { startBeat(); load(current + 1, !audio.paused); });
    } catch (e) {}
  }

  // —— 介绍视频 × 音乐严格双向互斥 + 视口自动暂停（永不同播）——
  // · 视频起播/起播意图（sj-video-intent）→ 立即暂停音乐并记录凭据 musicPausedByVideo
  // · 音乐起播（站点歌单或本地音频，且非视频触发的自动恢复）→ 立即暂停一切在播/起播中视频并清空凭据
  // · 视频暂停/播完/中止/滑出视口 → 若无其他活跃视频且持有凭据，自动恢复音乐（原未放歌绝不强开）
  // · 全屏播放保护：视频处于全屏态时禁止被视口检测误停
  (function initVideoMusicMutex() {
    const videos = Array.from(document.querySelectorAll('#products video'));
    if (!videos.length) return;
    const siteAudio = audio;                        // 站点歌单
    const localAudio = document.getElementById('cosmos-audio');
    let musicPausedByVideo = '';                    // '' | 'site' | 'local'：音乐因视频被暂停的凭据
    let resumingByVideo = false;                    // 互斥自动恢复进行中

    const isVideoActive = (v) => (!v.paused && !v.ended) || v.dataset.opening === '1';
    const activeVideo = () => videos.find(isVideoActive);
    const isFullscreen = (v) =>
      (document.fullscreenElement && (document.fullscreenElement === v || document.fullscreenElement.contains(v))) ||
      (document.webkitFullscreenElement && (document.webkitFullscreenElement === v || document.webkitFullscreenElement.contains(v))) ||
      !!v.webkitDisplayingFullscreen;

    function clearVideoBeatUI(v) {
      const box = v && v.closest('.cover-box');
      if (box) {
        box.classList.remove('is-playing-beat');
        box.style.removeProperty('--beat-pulse');
      }
    }

    function stopVideoElement(v, emitAbortIfOpening) {
      if (!v) return;
      const wasOpening = v.dataset.opening === '1';
      delete v.dataset.opening;
      if (!v.paused) {
        try { v.pause(); } catch (_) {}
      }
      clearVideoBeatUI(v);
      const evName = (emitAbortIfOpening && wasOpening) ? 'sj-video-abort' : 'sj-video-force-stop';
      try {
        window.dispatchEvent(new CustomEvent(evName, { detail: { video: v } }));
      } catch (_) {}
    }

    stopAllVideosForMusic = function () {
      if (resumingByVideo) return;
      musicPausedByVideo = '';                      // 用户主动切回音乐，清空自动恢复凭据
      videos.forEach((v) => {
        if (isVideoActive(v)) stopVideoElement(v, false);
      });
    };

    let resumingTimer = 0;

    function pauseMusicForVideo() {
      if (!siteAudio.paused) {
        siteAudio.pause();
        musicPausedByVideo = 'site';
      }
      if (localAudio && !localAudio.paused) {
        localAudio.pause();
        if (!musicPausedByVideo) musicPausedByVideo = 'local';
      }
    }

    function resumeMusicIfIdle() {
      if (!musicPausedByVideo || activeVideo()) return;   // 还有别的视频在播/起播中就不恢复
      const which = musicPausedByVideo;
      musicPausedByVideo = '';
      resumingByVideo = true;
      if (resumingTimer) clearTimeout(resumingTimer);
      resumingTimer = setTimeout(function () {
        resumingTimer = 0;
        resumingByVideo = false;
      }, 400);
      const el = which === 'site' ? siteAudio : localAudio;
      if (el) {
        try { el.preload = 'auto'; } catch (_) {}
        el.play().catch(function () {
          if (resumingTimer) { clearTimeout(resumingTimer); resumingTimer = 0; }
          resumingByVideo = false;
        });
      }
    }

    // 音乐起播 → 严格双向互斥：立即停掉一切在播/起播中的介绍视频，永不同播
    [siteAudio, localAudio].forEach((el) => {
      if (el) el.addEventListener('play', function () {
        if (!resumingByVideo) {
          stopAllVideosForMusic();
        }
        if (resumingTimer) { clearTimeout(resumingTimer); resumingTimer = 0; }
        resumingByVideo = false;
      });
    });

    // 视频起播意图（早于 v.play() 缓冲完成）→ 零延迟先停音乐与其他视频
    window.addEventListener('sj-video-intent', function (ev) {
      const target = ev.detail && ev.detail.video;
      videos.forEach(function (o) {
        if (o !== target && isVideoActive(o)) stopVideoElement(o, false);
      });
      pauseMusicForVideo();
    });

    // 视频被强制停止 → 同步清理 opening 与律动外框
    window.addEventListener('sj-video-force-stop', function (ev) {
      const v = ev.detail && ev.detail.video;
      if (v) {
        delete v.dataset.opening;
        clearVideoBeatUI(v);
      }
    });

    // 视频起播被中止（play reject 或起播途中滑走）→ 清理并按凭据恢复音乐
    window.addEventListener('sj-video-abort', function (ev) {
      const v = ev.detail && ev.detail.video;
      if (v) {
        delete v.dataset.opening;
        clearVideoBeatUI(v);
      }
      resumeMusicIfIdle();
      if (siteAudio.paused && !activeVideo()) stopBeat();
    });

    videos.forEach((v) => {
      v.addEventListener('play', function () {
        videos.forEach(function (o) {
          if (o !== v && isVideoActive(o)) stopVideoElement(o, false);
        });
        pauseMusicForVideo();
        const box = v.closest('.cover-box');
        if (box) box.classList.add('is-playing-beat');
        startBeat(v);
      });
      v.addEventListener('pause', function () {
        delete v.dataset.opening;
        clearVideoBeatUI(v);
        resumeMusicIfIdle();
        if (siteAudio.paused && !activeVideo()) stopBeat();
      });
      v.addEventListener('ended', function () {
        delete v.dataset.opening;
        clearVideoBeatUI(v);
        resumeMusicIfIdle();
        if (siteAudio.paused && !activeVideo()) stopBeat();
      });
    });

    // 1000ms 状态兜底：严格互斥（无 userOverride，绝不允许音视频同时发声）
    setInterval(function () {
      const vActive = activeVideo();
      if (!vActive) {
        if (musicPausedByVideo) resumeMusicIfIdle();
        return;
      }
      pauseMusicForVideo();
    }, 1000);

    // 视窗可见度检查（含 opening 缓冲态 + 全屏保护 + 顶栏 64px 避让）
    function checkVideoVisibility() {
      const vh = window.innerHeight || 900;
      const headerBottom = 64;
      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        if (!isVideoActive(v) || isFullscreen(v)) continue;
        const rect = v.getBoundingClientRect();
        if (rect.height <= 0) continue;
        const visibleTop = Math.max(rect.top, headerBottom);
        const visibleBottom = Math.min(rect.bottom, vh);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const visibleRatio = visibleHeight / rect.height;
        if (rect.bottom < 160 || rect.top > vh - 120 || visibleRatio < 0.45) {
          stopVideoElement(v, true);
        }
      }
    }

    // 滚出视口自动暂停：IO 阈值 0.45 + 顶栏避让（自动唤醒曾被暂停的背景音乐）
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const v = en.target;
          if (!isVideoActive(v) || isFullscreen(v)) return;
          if (!en.isIntersecting || en.intersectionRatio < 0.45) {
            stopVideoElement(v, true);
          }
        });
      }, {
        threshold: [0, 0.2, 0.45, 0.6, 0.8, 1.0],
        rootMargin: '-64px 0px -40px 0px'
      });
      videos.forEach((v) => io.observe(v));
    }

    window.addEventListener('scroll', checkVideoVisibility, { passive: true });
    window.addEventListener('resize', checkVideoVisibility, { passive: true });
  })();

  restore();
})();

