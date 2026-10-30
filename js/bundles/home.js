// build-bundles: {"name":"home","version":"995e8b5cbe38","sources":[{"path":"js/status.js","sha256":"a7c77fe6d3562d4cfa45a24a7dc2005a7f0a0d7290daca20a77d2c95f22d5900"},{"path":"js/search.js","sha256":"f393eb767118268497c809996ff8f435994680e81abee80e3618f70024a241a5"},{"path":"js/video-gate.js","sha256":"18b7765c76347cbd7b87347b8cb8da0a3fbc6ecfb7b3ea1006151d41346343ec"},{"path":"js/app.js","sha256":"04baff858aca573af985148a961e480c10e6eccd3e48275900feb7004bef1f90"},{"path":"js/nav-indicator.js","sha256":"6af08d84d883f9627327d7bd421a2d2d2c513df369552cdc36fecb424dbdfbd5"},{"path":"js/player.js","sha256":"c1e0fc6b32f552a10af1a3ac20909ecf9baec8cfd1b5a2c77f42b07f9770ab8e"}]}
/* 仅首页：状态 → 搜索 → 视频门控 → 主应用 → 导航胶囊 → 播放器
   ❗生成物：由 node scripts/build-bundles.mjs 从下列源文件拼接，请改源文件后重建。
   源文件顺序：js/status.js → js/search.js → js/video-gate.js → js/app.js → js/nav-indicator.js → js/player.js */

// ---- js/status.js (a7c77fe6d356) ----
/**
 * 个人状态仪表盘数据 (status.js)
 * ----------------------------------------------------
 * 手动更新这里的数据，首页 Hero 头像区会自动展示"当前状态"一行。
 * 全部字段可选：留空 '' 的项不展示。
 */
window.SITE_STATUS = {
  reading: '',                                  // 当前在读，如：'《失控》'
  building: '自制 Live2D 看板娘「7steve」',       // 正在进行的项目
  mood: '',                                     // 一句话心情，如：'🔋 电量 80%'
  updated: '2026-10-23'                         // 最近更新日期
};

;

// ---- js/search.js (f393eb767118) ----
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
        run: () => window.openArticleModal(a.id)
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
        run: () => window.openProjectModal(p.id)
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
    close();
    // 等面板关闭、滚动锁释放后再执行跳转
    setTimeout(() => item.run(), 60);
  }

  /* ---------- 开关 ---------- */
  function open() {
    if (!palette.classList.contains('hidden')) return;
    buildIndex();
    lastFocus = document.activeElement;
    if (palette._closeTimer) { clearTimeout(palette._closeTimer); palette._closeTimer = null; }
    palette.classList.remove('hidden', 'is-closing');
    document.body.style.overflow = 'hidden';
    input.value = '';
    render('');
    input.focus();
  }

  function close() {
    if (palette.classList.contains('hidden')) return;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    // 收起淡出（与弹窗同款退场节奏），动画结束后再隐藏
    palette.classList.add('is-closing');
    palette._closeTimer = setTimeout(() => {
      palette.classList.add('hidden');
      palette.classList.remove('is-closing');
      palette._closeTimer = null;
    }, 220);
  }

  function toggle() {
    if (palette.classList.contains('hidden')) open();
    else close();
  }

  /* ---------- 事件 ---------- */
  if (openBtn) openBtn.addEventListener('click', open);

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
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
      e.stopPropagation();
      close();
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
})();

;

// ---- js/video-gate.js (18b7765c7634) ----
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
  function init() {
    document.querySelectorAll('#products video.cover-video').forEach((v) => {
      if (v.dataset.playGate) return;
      v.dataset.playGate = '1';
      v.removeAttribute('controls');            // 播放前不显示原生控制条

      const box = v.closest('.cover-box') || v.parentElement;
      const layer = document.createElement('div');
      layer.className = 'video-play-gate';
      layer.setAttribute('aria-hidden', 'false');
      layer.innerHTML =
        '<button type="button" class="video-play-btn" aria-label="播放介绍视频">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
        '</button>';

      function open() {
        layer.remove();
        v.setAttribute('controls', '');
        v.play().catch(() => {});               // 用户手势内，直接起播
        v.focus({ preventScroll: true });       // 键盘用户焦点落回视频
      }
      function close() {
        if (!layer.isConnected && !v.paused) return;
        if (!layer.isConnected) box.appendChild(layer);
        v.removeAttribute('controls');
      }
      layer.addEventListener('click', open);
      v.addEventListener('ended', close);
      v.addEventListener('pause', close);       // 暂停也收回控制条，回到海报态
      v.addEventListener('play', () => { layer.remove(); });
      box.appendChild(layer);

      // 元数据懒加载（2026-10-05）：四个视频都在首屏之下，preload=metadata 会让
      // 每次打开都发 4 个 Range 请求（慢网/本机 IDM 劫持场景下平白拖慢开屏）。
      // 预加载放行推迟到"滚动接近"时——接近视口才恢复 metadata 提示。
      if ('IntersectionObserver' in window && v.preload !== 'none') {
        v.preload = 'none';
      }
      if ('IntersectionObserver' in window) {
        const near = new IntersectionObserver((entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              v.preload = 'metadata';
              near.disconnect();
            }
          });
        }, { rootMargin: '600px 0px' });
        near.observe(v);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

;

// ---- js/app.js (04baff858aca) ----
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
  initCreation();
  initEssays();
  initAi();

  // 4. 初始化移动端抽屉菜单与滚动状态导航
  initNavigation();
  initNavScrollState();
  // 2026-10-17：滚轮阻尼滚动已撤（见 smoothScrollTo 处注释），滚动交回浏览器原生
  initSmoothAnchors();
  initScrollSpy();
  initPageNext();
  initWheelPaging();   // 滚轮一屏一停（页单位 = 区块 / 产品卡）
  initScrollSettle();  // 滚动条/键盘松手后吸附到停靠点

 // 5. 滚动浮现编排（ section reveal，含错峰）
  observeReveals();

  // 6. 页脚版权年份自动更新
  initFooterYear();

  // 7. 阅读进度条监听（弹窗内滚动）
  initArticleProgress();

  // 8. 本地趣味件：时段问候 / 状态仪表盘 / 键盘彩蛋
  initHeroGreeting();
  initHeroStatus();
  initKonami();
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

  // 9. Service Worker 离线缓存（仅 HTTPS / localhost 环境生效，file:// 下静默跳过）
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

});

/* ============================================================
   1. 主题管理 (Dark / Light Mode)
   ============================================================ */
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const mobileThemeToggleBtn = document.getElementById('mobile-theme-toggle');
  
  // 站点恒深色：hero / 3D 舞台 / 变形带都是深色设计，浅色从未完整做——
  // 之前允许"跟随系统进浅色"，系统浅色 + 浏览器强制深色（auto dark）会变成黑底深字（2026-09-24 用户截图翻车）。
  // 切换按钮已隐藏；这里无条件挂 dark，覆盖任何 localStorage 残留。
  document.documentElement.classList.add('dark');

  function toggle(e) {
    const applyNow = () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('sj.theme', isDark ? 'dark' : 'light');   // 全站访客本地键统一 sj. 前缀
    };

    // 明暗切换：从点击位置圆形扩散开新主题（View Transitions，减少动效时直接切换）
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduce) {
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

// 更新公告：桌面贴在卡片右上侧，窄屏收成一行；没填 announcement 就不渲染
function buildAnnouncement(project) {
  const a = project.announcement;
  if (!a || !Array.isArray(a.items) || !a.items.length) return '';
  const ver = a.version ? `<span class="announce-ver">${escapeHtml(a.version)}</span>` : '';
  const items = a.items.map(t => `<li>${escapeHtml(t)}</li>`).join('');
  const date = a.date ? `<div class="announce-date">${escapeHtml(a.date)}</div>` : '';
  const line = ['更新', a.version, a.summary || a.items.join(' / ')].filter(Boolean).map(escapeHtml).join(' · ');
  return `
    <div class="announce-card">
      <div class="announce-top"><span class="announce-label">更新公告</span>${ver}</div>
      <ul class="announce-items">${items}</ul>
      ${date}
    </div>
    <p class="announce-line"><span class="announce-dot" aria-hidden="true"></span><span class="announce-line-text">${line}</span></p>`;
}

function hydrateProductLinks() {
  document.querySelectorAll('article[data-project-id]').forEach(card => {
    const project = (window.PROJECTS_DATA || []).find(p => p.id === card.dataset.projectId);
    if (!project) return;

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

    const pwd = card.querySelector('[data-pwd]');
    if (pwd) pwd.textContent = project.downloadPwd ? ` (提取码: ${project.downloadPwd})` : '';

    // 更新公告（数据驱动：只给写了 announcement 的项目渲染）
    const announceHtml = buildAnnouncement(project);
    if (announceHtml) {
      const aside = document.createElement('aside');
      aside.className = 'card-announce';
      aside.setAttribute('aria-label', '更新公告');
      aside.innerHTML = announceHtml;
      card.firstElementChild.appendChild(aside);
      card.classList.add('has-announce');
    }
  });
}

// 打开项目详情弹窗
window.openProjectModal = function(id) {
  const project = (window.PROJECTS_DATA || []).find(p => p.id === id);
  if (!project) return;

  const modal = document.getElementById('project-modal');
  const modalContent = document.getElementById('project-modal-content');
  if (!modal || !modalContent) return;
  if (modal._closeTimer) { clearTimeout(modal._closeTimer); modal._closeTimer = null; }
  modal.classList.remove('is-closing');
  modal._lastFocus = document.activeElement;

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
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-1 text-xs font-mono font-medium rounded-md border border-black/8 dark:border-white/12 text-[#86868b]">
            ${escapeHtml(project.categoryName || project.category)}
          </span>
        </div>
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
      <!-- 版本 / 运行环境 / 校验（数据缺失时整块不渲染） -->
      <div class="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] p-4 space-y-2 text-xs">
        ${project.version ? `<div class="flex gap-2"><span class="text-[#86868b] shrink-0">当前版本</span><span class="font-mono text-[#1d1d1f] dark:text-[#f5f5f7]">${escapeHtml(project.version)}${project.updated ? ' · ' + escapeHtml(project.updated) : ''}</span></div>` : ''}
        ${project.requires ? `<div class="flex gap-2"><span class="text-[#86868b] shrink-0">运行环境</span><span class="text-[#1d1d1f] dark:text-[#f5f5f7]">${escapeHtml(project.requires)}</span></div>` : ''}
        ${project.sha256 ? `<div class="flex gap-2"><span class="text-[#86868b] shrink-0">SHA256</span><span class="font-mono text-[#1d1d1f] dark:text-[#f5f5f7] break-all">${escapeHtml(project.sha256)}</span></div>` : ''}
      </div>
      ` : ''}
      <!-- Markdown 正文内容 -->
      <div class="markdown-body text-[#1d1d1f] dark:text-[#f5f5f7]">
        ${detailsHtml}
      </div>

      <!-- 操作链接栏 -->
      <div class="pt-6 border-t border-black/10 dark:border-white/10 flex flex-wrap gap-3 items-center justify-end">
        ${project.downloadUrl ? `
          <a href="${project.downloadUrl}" target="_blank" rel="noopener noreferrer"
             class="btn-primary px-5 py-2 text-xs flex items-center gap-1.5">
            <i data-lucide="download" class="w-3.5 h-3.5"></i>
            <span>网盘下载${project.downloadPwd ? ' (提取码: ' + project.downloadPwd + ')' : ''}</span>
          </a>
        ` : ''}
        ${project.githubUrl && project.githubUrl !== '#' ? `
          <a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer"
             class="btn-secondary px-4 py-2 text-xs bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[#1d1d1f] dark:text-white flex items-center gap-1.5 border border-black/10 dark:border-white/10">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            <span>GitHub 源码</span>
          </a>
        ` : ''}
        ${project.demoUrl && project.demoUrl !== '#' ? `
          <a href="${project.demoUrl}" target="_blank" rel="noopener noreferrer"
             class="btn-secondary px-4 py-2 text-xs bg-slate-100 dark:bg-white/10 text-[#1d1d1f] dark:text-white flex items-center gap-1.5 border border-black/10 dark:border-white/10">
            <span>GitHub Releases</span>
            <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
          </a>
        ` : ''}
      </div>
    </div>
  `;

  modalContent.dataset.openProject = project.id;   // 供延时补写正文时校验（防止串篇）
  modalContent.classList.remove('modal-content-in');
  void modalContent.offsetWidth;
  modalContent.classList.add('modal-content-in');

  addCopyButtons(modalContent);
  ensureHighlight(modalContent);

  // 渲染器就绪后补写正文（期间又点了别的项目就放弃，避免覆盖错内容）
  if (needMd && project.details) {
    const token = project.id;
    window.ensureMarkdown().then((ok) => {
      if (modalContent.dataset.openProject !== token) return;
      const body = modalContent.querySelector('.markdown-body');
      if (!body) return;
      body.innerHTML = ok
        ? sanitizeMarkdownHtml(window.marked.parse(project.details))
        : `<p>${escapeHtml(project.details)}</p>`;
      addCopyButtons(modalContent);
      ensureHighlight(modalContent);
      if (window.lucide) window.lucide.createIcons();
      modal.scrollTop = 0;
      modalContent.scrollTop = 0;
    });
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  modal.scrollTop = 0;
  modalContent.scrollTop = 0;
  requestAnimationFrame(() => {
    modal.scrollTop = 0;
    modalContent.scrollTop = 0;
  });
  if (window.lucide) window.lucide.createIcons();
  modal.querySelector('button[aria-label="关闭"]')?.focus({ preventScroll: true });
};

window.closeProjectModal = function() {
  // 关闭时必须停掉弹窗内所有视频，否则声音会在背后继续
  document.querySelectorAll('#project-modal video').forEach(v => { try { v.pause(); } catch (e) {} });
  const modal = document.getElementById('project-modal');
  const modalContent = document.getElementById('project-modal-content');
  if (modal) modal.scrollTop = 0;
  if (modalContent) modalContent.scrollTop = 0;
  animateModalClose(modal);
};

/* ============================================================
   3. 文字内容模块：技术手记 / 创作 / 随笔 / AI 学习
      （共用 ARTICLES_DATA，按 section 字段路由，空模块自动隐藏）
   ============================================================ */

// 全部内容统一按日期倒序——新增条目无论插在数组哪个位置，最新的永远排最前
function getSortedArticles() {
  return [...(window.ARTICLES_DATA || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
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
  modalContent.addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(paint);
  }, { passive: true });
  if (modal) {
    modal.addEventListener('scroll', () => {
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });
  }
  paint();
  // 弹窗还在入场动画（transform 未归位）时首算会误判成最后一节，动画落定后再对一次
  setTimeout(paint, 400);
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
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://7stevejohn.github.io/?post=${encodeURIComponent(article.id)}` }
  });
}

/* ============================================================
   时光回溯：文章版本切换（数据结构见 README）
   activeVersion = 0 表示最新稿，>0 指向 revisions[n-1]
   ============================================================ */
let activeArticle = null;
let activeVersion = 0;

function versionedContent(article) {
  if (activeVersion > 0 && article.revisions && article.revisions[activeVersion - 1]) {
    return article.revisions[activeVersion - 1].content;
  }
  return article.content;
}

/* ============================================================
   本地文本批注：选中正文 → 写批注 → 高亮持久化（仅存本机 LocalStorage）
   ============================================================ */
const annStoreKey = (id) => `sj.ann.${id}`;

function getAnnotations(id) {
  try { return JSON.parse(localStorage.getItem(annStoreKey(id))) || []; } catch (_) { return []; }
}

function saveAnnotations(id, list) {
  localStorage.setItem(annStoreKey(id), JSON.stringify(list));
}

function markAnnotationQuote(modalContent, quote, noteId) {
  const body = modalContent.querySelector('.markdown-body');
  if (!body) return false;
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const idx = node.textContent.indexOf(quote);
    if (idx === -1) continue;
    try {
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + quote.length);
      const mark = document.createElement('mark');
      mark.className = 'sj-note';
      mark.dataset.noteId = noteId;
      mark.title = '点击查看批注';
      range.surroundContents(mark);
      return true;
    } catch (_) { return false; // 跨节点选区无法高亮，批注仍保留在存储中
    }
  }
  return false;
}

function initAnnotations(modalContent, articleId) {
  let popover = null;
  const closePopover = () => { if (popover) { popover.remove(); popover = null; } };

  const placePopover = (rect) => {
    const base = modalContent.getBoundingClientRect();
    popover.style.left = `${Math.max(8, rect.left - base.left)}px`;
    popover.style.top = `${rect.bottom - base.top + modalContent.scrollTop + 8}px`;
  };

  function openAnnotatePopover(range) {
    closePopover();
    const articleId = activeArticle ? activeArticle.id : null;
    if (!articleId) return;
    const quote = range.toString().replace(/\s+/g, ' ').trim();
    if (quote.length < 2 || quote.length > 300) return;
    popover = document.createElement('div');
    popover.className = 'sj-popover';
    popover.innerHTML = `
      <textarea rows="3" placeholder="写下你的批注（仅保存在本机）"></textarea>
      <div class="sj-popover-actions">
        <button type="button" data-act="cancel">取消</button>
        <button type="button" data-act="save">保存批注</button>
      </div>`;
    modalContent.appendChild(popover);
    placePopover(range.getBoundingClientRect());
    const textarea = popover.querySelector('textarea');
    textarea.focus();
    popover.querySelector('[data-act="cancel"]').onclick = closePopover;
    popover.querySelector('[data-act="save"]').onclick = () => {
      const note = textarea.value.trim();
      if (!note) { closePopover(); return; }
      const ann = { id: 'a' + Date.now(), quote, note, ts: Date.now() };
      const list = getAnnotations(articleId);
      list.push(ann);
      saveAnnotations(articleId, list);
      markAnnotationQuote(modalContent, quote, ann.id);
      closePopover();
      showToast('已添加批注（仅本机可见）');
    };
  }

  function openViewPopover(ann, markEl) {
    closePopover();
    popover = document.createElement('div');
    popover.className = 'sj-popover';
    popover.innerHTML = `
      <div class="sj-note-view">“${escapeHtml(ann.note)}”</div>
      <div class="sj-popover-actions">
        <button type="button" data-act="del">删除批注</button>
        <button type="button" data-act="cancel">关闭</button>
      </div>`;
    modalContent.appendChild(popover);
    placePopover(markEl.getBoundingClientRect());
    popover.querySelector('[data-act="cancel"]').onclick = closePopover;
    popover.querySelector('[data-act="del"]').onclick = () => {
      const articleId = activeArticle ? activeArticle.id : null;
      saveAnnotations(articleId, getAnnotations(articleId).filter((a) => a.id !== ann.id));
      const mark = modalContent.querySelector(`.sj-note[data-note-id="${ann.id}"]`);
      if (mark) mark.replaceWith(...mark.childNodes);
      closePopover();
      showToast('批注已删除');
    };
  }

  // 监听器只挂一次（modalContent 是常驻节点，重复挂会导致浮层叠加）
  if (!modalContent.dataset.annInit) {
    modalContent.dataset.annInit = '1';

    // 选中正文弹出批注框
    modalContent.addEventListener('mouseup', () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !modalContent.contains(sel.anchorNode)) return;
      if (sel.toString().trim().length >= 2) openAnnotatePopover(sel.getRangeAt(0).cloneRange());
    });

    // 点击高亮查看/删除批注
    modalContent.addEventListener('click', (e) => {
      const mark = e.target.closest('.sj-note');
      if (!mark) return;
      const articleId = activeArticle ? activeArticle.id : null;
      const ann = getAnnotations(articleId).find((a) => a.id === mark.dataset.noteId);
      if (ann) openViewPopover(ann, mark);
    });

    modalContent.addEventListener('scroll', closePopover, { passive: true });
  }

  // 渲染本次打开内容的已存批注高亮
  getAnnotations(articleId).forEach((a) => markAnnotationQuote(modalContent, a.quote, a.id));
}

/* ============================================================
   全局趣味件：toast / 时段问候 / 状态仪表盘 / Konami 彩蛋 / 赞赏
   ============================================================ */
let toastTimer = null;
function showToast(msg) {
  let el = document.getElementById('sj-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sj-toast';
    el.className = 'sj-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-show'), 2600);
}

// 时段感知问候（读取访客本地时间）
function initHeroGreeting() {
  const el = document.getElementById('hero-greeting');
  if (!el) return;
  const h = new Date().getHours();
  const g = h < 5 ? '夜还长，随你折腾' : h < 9 ? '早安' : h < 12 ? '上午好' : h < 14 ? '中午好' : h < 18 ? '下午好' : h < 23 ? '晚上好' : '夜深了，注意休息';
  el.textContent = g;
}

// 静态 JSON 驱动的状态仪表盘（数据见 js/status.js，留空不展示）
function initHeroStatus() {
  const el = document.getElementById('hero-status');
  const s = window.SITE_STATUS || {};
  const parts = [s.reading && `在读 ${s.reading}`, s.building && `在做 ${s.building}`, s.mood].filter(Boolean);
  if (!el || !parts.length) return;
  el.textContent = parts.join(' · ') + (s.updated ? `（更新于 ${s.updated}）` : '');
  el.classList.remove('hidden');
}

// 键盘序列彩蛋：↑↑↓↓←→←→BA 触发粒子彩色庆典
function initKonami() {
  const seq = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let buf = [];
  document.addEventListener('keydown', (e) => {
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    buf.push(e.key.toLowerCase());
    buf = buf.slice(-seq.length);
    if (buf.join(',') === seq.join(',')) {
      buf = [];
      if (window.particlesParty) window.particlesParty(20);
      showToast('🎉 彩蛋触发：粒子庆典 20 秒');
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
    : `<span class="px-2 py-0.5 rounded-md border border-black/8 dark:border-white/12 font-medium">
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
  // 栏目头右侧计数（blog-count / ai-count / essays-count），格式与创作模块一致
  const countEl = document.getElementById(`${sectionId}-count`);
  if (countEl) countEl.textContent = items.length === 1 ? '共 1 篇' : `共 ${items.length} 篇`;
  if (listContainer) {
    listContainer.innerHTML = items.map(articleCardHtml).join('');
    if (window.lucide) window.lucide.createIcons();
    observeReveals();
  }
}

// 创作模块：按 category 分「小说 / 游戏创作」两个子列表，空子列表单独隐藏
function initCreation() {
  const sectionEl = document.getElementById('creation');
  if (!sectionEl) return;

  const navLinks = document.querySelectorAll('a[href="#creation"]');
  const items = getSortedArticles().filter(a => a.section === 'creation');

  if (items.length === 0) {
    sectionEl.style.display = 'none';
    navLinks.forEach(link => link.style.display = 'none');
    return;
  }

  sectionEl.style.display = '';
  navLinks.forEach(link => link.style.display = '');

  const groups = [
    { wrapId: 'creation-novel', match: (a) => a.category !== '游戏创作' },
    { wrapId: 'creation-game', match: (a) => a.category === '游戏创作' }
  ];
  groups.forEach(g => {
    const wrap = document.getElementById(g.wrapId);
    if (!wrap) return;
    const list = wrap.querySelector('[data-creation-list]');
    const groupItems = items.filter(g.match);
    if (groupItems.length === 0) {
      wrap.style.display = 'none';
      return;
    }
    wrap.style.display = '';
    const countEl = wrap.querySelector('[data-group-count]');
    if (countEl) countEl.textContent = groupItems.length === 1 ? '1 篇' : `${groupItems.length} 篇`;
    if (list) {
      list.innerHTML = groupItems.map((a) => articleCardHtml(a, { hideCategory: true })).join('');
      if (window.lucide) window.lucide.createIcons();
      observeReveals();
    }
  });

  // 栏目头右侧总数
  const countEl = document.getElementById('creation-count');
  if (countEl) countEl.textContent = items.length === 1 ? '共 1 篇' : `共 ${items.length} 篇`;
}

function initArticles() {
  renderArticleSection({
    match: (a) => !a.section,
    sectionId: 'blog',
    navHref: '#blog',
    listId: 'articles-list'
  });
}

function initEssays() {
  renderArticleSection({
    match: (a) => a.section === 'essay',
    sectionId: 'essays',
    navHref: '#essays',
    listId: 'essays-list'
  });
}

function initAi() {
  renderArticleSection({
    match: (a) => a.section === 'ai',
    sectionId: 'ai',
    navHref: '#ai',
    listId: 'ai-list',
    useArrayOrder: true
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
    delete modalContent.dataset.thanked;
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

window.openArticleModal = function(id, skipUrlSync) {
  const article = (window.ARTICLES_DATA || []).find(a => a.id === id);
  if (!article) return;

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
  activeVersion = 0;

  // Markdown 渲染器按需加载（2026-10-17）：先出骨架，正文等渲染器就绪后补写
  const needMd = !(window.marked && window.DOMPurify);
  const parsedMarkdown = needMd
    ? '<p class="md-pending">正在准备阅读器…</p>'
    : sanitizeMarkdownHtml(window.marked.parse(versionedContent(article)));

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

  // 时光回溯：文章版本切换（数据结构见 README revisions 字段）
  const revisions = article.revisions || [];
  const versionChips = revisions.length ? `
        <div class="flex flex-wrap items-center gap-1.5 pt-3" data-version-bar>
          <span class="text-xs text-[#86868b] mr-1">版本回溯</span>
          <button data-version="0" class="pref-btn is-active">最新</button>
          ${revisions.map((r, i) => `<button data-version="${i + 1}" class="pref-btn">${escapeHtml(r.label || r.date || 'v' + (i + 1))}</button>`).join('')}
        </div>` : '';

  // 情绪反馈（本地版：仅保存在访客本机，不做跨访客统计）
  const EMOTIONS = [['resonance', '💫', '共鸣'], ['insight', '💡', '启发'], ['doubt', '❓', '疑惑'], ['sigh', '🌧', '唏嘘']];
  const myEmotion = localStorage.getItem('sj.emo.' + article.id);
  const emotionsHtml = `
      <div class="pt-5 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center gap-2">
        <span class="text-xs font-semibold text-[#86868b] mr-1">这一篇给你的感觉<span class="opacity-70">（仅存本机）</span></span>
        ${EMOTIONS.map(([key, icon, label]) => `
          <button data-emotion="${key}" class="emotion-btn px-2.5 py-1 rounded-full text-xs border transition cursor-pointer ${myEmotion === key ? 'is-active' : ''}">${icon} ${label}</button>
        `).join('')}
      </div>`;

  // 把「换内容 + 重建事件」包成函数：首开直接执行；已开时等旧内容滑出后再执行
  const renderNow = () => {
  modalContent.innerHTML = `
    <div class="p-6 sm:p-8 space-y-5">
      <div class="space-y-2 border-b border-black/10 dark:border-white/10 pb-5">
        <div class="flex items-center gap-2 text-xs font-mono text-[#86868b]">
          <span class="px-2 py-0.5 rounded-md border border-black/8 dark:border-white/12 font-medium">
            ${escapeHtml(article.category || '技术手记')}
          </span>
          <span>${escapeHtml(article.date)}</span>
          <span>· ${escapeHtml(getReadTime(article))}</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">${escapeHtml(article.title)}</h1>
        ${versionChips}
      </div>
      ${article.cover ? `
      <div class="w-full rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 aspect-[16/9] max-h-72">
        <img src="${escapeHtml(article.cover)}" alt="${escapeHtml(article.title)}" class="w-full h-full object-cover">
      </div>` : ''}
      <div class="markdown-body text-[#1d1d1f] dark:text-[#f5f5f7]">
        ${parsedMarkdown}
      </div>
      ${pagerHtml}${relatedHtml}${emotionsHtml}
    </div>
  `;

  ensureHighlight(modalContent);
  addCopyButtons(modalContent);
  buildArticleToc(modalContent);
  initTocSpy(modalContent);
  injectArticleJsonLd(article);
  initAnnotations(modalContent, article.id);

  // 渲染器就绪后补写正文，并重建依赖正文的目录/复制按钮/高亮
  if (needMd) {
    ensureMarkdown().then((ok) => {
      if (activeArticle !== article) return;           // 期间切篇了就放弃，避免覆盖
      const body = modalContent.querySelector('.markdown-body');
      if (!body) return;
      body.innerHTML = ok
        ? sanitizeMarkdownHtml(window.marked.parse(versionedContent(article)))
        : `<p>${escapeHtml(versionedContent(article))}</p>`;
      ensureHighlight(modalContent);
      addCopyButtons(modalContent);
      buildArticleToc(modalContent);
      initTocSpy(modalContent);
      resetArticleModalScroll();
    });
  }

  // 情绪标记：单选可取消，仅写本机 LocalStorage
  modalContent.querySelectorAll('[data-emotion]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = 'sj.emo.' + article.id;
      const current = localStorage.getItem(key);
      const next = current === btn.dataset.emotion ? null : btn.dataset.emotion;
      if (next) localStorage.setItem(key, next); else localStorage.removeItem(key);
      modalContent.querySelectorAll('[data-emotion]').forEach((b) => b.classList.toggle('is-active', b.dataset.emotion === next));
      showToast(next ? `已标记「${{ resonance: '共鸣', insight: '启发', doubt: '疑惑', sigh: '唏嘘' }[next]}」（仅本机）` : '已取消标记');
    });
  });

  // 版本切换：仅重渲染正文区，批注/目录/复制按钮重建
  if (revisions.length) {
    modalContent.querySelectorAll('[data-version]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeVersion = Number(btn.dataset.version);
        modalContent.querySelectorAll('[data-version]').forEach((b) => b.classList.toggle('is-active', Number(b.dataset.version) === activeVersion));
        // 正文区上下交替过渡：旧内容先淡出，再换内容淡入
        swapModalContent(modalContent, () => {
          const write = () => {
            const body = modalContent.querySelector('.markdown-body');
            if (body) {
              body.innerHTML = window.marked
                ? sanitizeMarkdownHtml(window.marked.parse(versionedContent(activeArticle)))
                : `<p>${escapeHtml(versionedContent(activeArticle))}</p>`;
            }
            ensureHighlight(modalContent);
            addCopyButtons(modalContent);
            buildArticleToc(modalContent);
            initTocSpy(modalContent);
            initAnnotations(modalContent, article.id);
            modalContent.scrollTop = 0;
            const bar = document.getElementById('article-progress');
            if (bar) bar.style.width = '0%';
            delete modalContent.dataset.thanked;
          };
          // 同首次打开：渲染器没就绪就先等它（切换版本也可能发生在懒加载完成前）
          if (window.marked && window.DOMPurify) write();
          else ensureMarkdown().then(write);
        }, 'fade');
      });
    });
  }

  // 切换篇目后回到正文顶部、复位进度条与致谢状态
  resetArticleModalScroll();
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
      window.openProjectModal(projectTrigger.getAttribute('data-open-project'));
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
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
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

// 导航：顶部无边框，下滑后浮现边框与模糊；同时驱动回到顶部按钮的显隐
function initNavScrollState() {
  const header = document.querySelector('header.site-header');
  const backTop = document.getElementById('back-to-top');
  const update = () => {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 12);
      // 深色粒子封面上：强制 dark 配色，滚过封面即还原（见 style.css .on-cover）
      // 深色叙事区的终点：随首屏高度走（3D 舞台已移除，背景由推理场 canvas 全程接管）
      const coverEnd = window.__COVER_END || window.innerHeight * 0.72;
      header.classList.toggle('on-cover', y < coverEnd - window.innerHeight * 0.5);
    }
    if (backTop) {
      const show = y > 600;
      backTop.classList.toggle('opacity-0', !show);
      backTop.classList.toggle('pointer-events-none', !show);
    }
    // 阅读中让底部浮层退场：手机上音乐 FAB 会压住正文（实测 390×844 命中卡片末行），
    // 滚动期间降到 .28，停手 700ms 复原。不改位置、不影响拖拽与点击
    document.body.classList.add('is-scrolling');
    clearTimeout(update._t);
    update._t = setTimeout(() => document.body.classList.remove('is-scrolling'), 700);
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
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
  navLinks.forEach((a) => {
    const id = a.getAttribute('href').slice(1);
    (byId[id] = byId[id] || []).push(a);
  });

  const setActive = (id) => {
    const hit = byId[id] || [];
    navLinks.forEach((a) => a.classList.toggle('nav-active', hit.includes(a)));
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
    add(products.querySelector(':scope > .reveal'));            // 产品区标题页
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

// 翻页停靠点：页单位顶 + 高页内的补点（滚轮 / 滚动条 / 键盘共用同一份）
// ----------------------------------------------------
// 页单位复用 collectPageUnits()（与底部箭头、ScrollSpy 同一份序列）：
//   · 产品卡一律单独一停（保持「一屏一卡」）
//   · 普通区块只有 ≥45% 视口高才单独停；百来像素的矮页并进相邻一屏，避免连跳
//   · 比一屏高的区块（AI / 手记）在中间按 ~0.82 屏补点，不跳内容
const HEADER_OFFSET = 64;          // 吸顶导航高度
let scrollHoldUntil = 0;           // 程序化滚动期间暂停「停手吸附」

function pageStops() {
  const vh = window.innerHeight;
  const y = window.scrollY;
  const gap = vh * 0.3;
  const stops = [{ y: 0, soft: false }];
  const addHard = (t) => {
    if (t < 4) return;
    // 高页补点如果紧贴在这个区块顶前面，让位给区块顶
    while (stops.length > 1 && t - stops[stops.length - 1].y < gap && stops[stops.length - 1].soft) stops.pop();
    if (t - stops[stops.length - 1].y >= 4) stops.push({ y: t, soft: false });
  };
  const addSoft = (t) => {
    if (t - stops[stops.length - 1].y >= gap) stops.push({ y: t, soft: true });
  };
  for (const el of collectPageUnits()) {
    const h = el.offsetHeight;
    const top = el.getBoundingClientRect().top + y - HEADER_OFFSET;
    const card = el.matches('#products > article.bento-card');
    if (card || h >= vh * 0.45) addHard(top);
    if (h > vh * 1.05) {
      for (let t = top + vh * 0.82; t < top + h - 40; t += vh * 0.82) addSoft(t);
    }
  }
  return stops.map((s) => s.y);
}

// 滚轮：一次手势 = 一屏，落在下一个/上一个停靠点；触屏 / 减少动效 / 弹层内原生
function initWheelPaging() {
  const mq = window.matchMedia('(min-width: 900px) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const step = () => window.innerHeight * 0.82;
  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
  const root = document.documentElement;

  const nextTop = (y, dir) => {
    const list = pageStops();
    const cap = window.innerHeight * 1.5;
    if (dir > 0) {
      for (const t of list) if (t > y + 8 && t <= y + cap) return t;
      return Math.min(maxScroll(), y + step());
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i] < y - 8 && list[i] >= y - cap) return list[i];
    return Math.max(0, y - step());
  };

  // 程序化翻页期间临时摘掉 CSS 吸附：否则 proximity 会把落点拽回上一张卡
  let snapOff = 0;
  const jump = (top) => {
    root.classList.add('no-snap');
    clearTimeout(snapOff);
    snapOff = setTimeout(() => root.classList.remove('no-snap'), 1100);
    smoothScrollTo(Math.max(0, top));
  };

  let acc = 0;
  let lockUntil = 0;
  let idle = 0;
  window.addEventListener('wheel', (e) => {
    if (!mq.matches) return;
    if (e.ctrlKey || e.metaKey) return;                      // 捏合缩放
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;     // 横向手势不管
    if (!e.deltaY) return;
    if (e.target.closest('.modal-overlay, #music-panel, #settings-panel, .tabnav-panel')) return;

    const y = window.scrollY;
    if ((y <= 0 && e.deltaY < 0) || (y >= maxScroll() - 1 && e.deltaY > 0)) return;  // 到头放行
    e.preventDefault();

    const now = performance.now();
    if (now < lockUntil) { acc = 0; return; }                // 同一手势的连发
    acc += e.deltaY;
    clearTimeout(idle);
    idle = setTimeout(() => { acc = 0; }, 200);
    if (Math.abs(acc) < 45) return;                          // 触控板小增量先累计

    acc = 0;
    lockUntil = now + 430;
    jump(nextTop(y, e.deltaY > 0 ? 1 : -1));
  }, { passive: false });
}

// 滚动条 / 键盘 / 触控板惯性：滚动停手 240ms 后，若没停在停靠点上，补一段平滑吸附
// （原生滚动条没法拦截步进，只能在松手后对齐；触屏与减少动效不接管）
function initScrollSettle() {
  const mq = window.matchMedia('(min-width: 900px) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  let timer = 0;
  // 键盘是细粒度阅读工具：方向键 / 翻页键 / 空格 / Home / End 之后不做停手吸附
  window.addEventListener('keydown', (e) => {
    if (/^(ArrowDown|ArrowUp|PageDown|PageUp|Home|End| |Spacebar)$/.test(e.key)) {
      scrollHoldUntil = performance.now() + 700;
    }
  }, { passive: true });
  window.addEventListener('scroll', () => {
    if (!mq.matches) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (performance.now() < scrollHoldUntil) return;       // 程序化滚动还没结束
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (y <= 1 || y >= max - 1) return;                    // 首尾不吸
      let best = null;
      for (const t of pageStops()) {
        if (best === null || Math.abs(t - y) < Math.abs(best - y)) best = t;
      }
      if (best !== null && Math.abs(best - y) > 3) smoothScrollTo(best);
    }, 240);
  }, { passive: true });
}

// 锚点/按钮滚动：直接用**原生平滑滚动**（合成器线程驱动，不逐帧写 scrollTo）
// ----------------------------------------------------
// 2026-10-17 撤掉原先的 Lenis 式阻尼滚动（滚轮 preventDefault + 每帧 scrollTo 追 150ms lerp）。
// 实测代价（1440×900 / 165Hz）：滚轮停下后页面还会继续滑 ~989ms，最长单帧 55ms ——
// 桌面指针与触控板的手感会明显发黏，且与系统惯性、无障碍设置打架。
// 现在：滚轮完全交给浏览器；只有锚点/回顶/翻页这类"程序化跳转"才做平滑，且由合成器执行。
// 想找回阻尼版：git show 7f1e57e:js/app.js（initDampedScroll 仍在历史里）。
let smoothScrollTo = function (targetY) {
  scrollHoldUntil = performance.now() + 900;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: targetY, behavior: reduce ? 'auto' : 'smooth' });
};
// 暴露给 search.js / tab-nav.js 等模块复用
window.smoothScrollTo = function (y) { smoothScrollTo(y); };

// 阻尼滚动：滚轮驱动目标位，页面每帧向目标指数趋近（Lenis 手法，自写精简版）
// 仅精确指针（桌面）+ 未开减少动效时启用；触摸/键盘/滚动条/弹窗内滚动保持原生
function initDampedScroll() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const html = document.documentElement;
  html.style.scrollBehavior = 'auto';   // 每帧 scrollTo 不能再被 CSS smooth 拖慢

  let TIME_CONST = 150;                 // 阻尼时间常数 ms：60fps 下每帧系数 ≈0.105（Lenis 默认观感）
  let target = window.scrollY;
  let current = target;
  let rafId = null;
  let lastTs = 0;

  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

  const tick = (ts) => {
    const dt = Math.min(100, ts - lastTs || 16.7);   // 帧率无关：指数趋近按真实耗时算
    lastTs = ts;
    current += (target - current) * (1 - Math.exp(-dt / TIME_CONST));
    if (Math.abs(target - current) < 0.5) {
      current = target;
      window.scrollTo(0, current);
      rafId = null;
      return;
    }
    window.scrollTo(0, current);
    rafId = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (rafId != null) return;
    current = window.scrollY;
    lastTs = performance.now();
    rafId = requestAnimationFrame(tick);
  };

  window.__dampedScroll = {
    setTarget(y) {
      target = Math.max(0, Math.min(y, maxScroll()));
      wake();
    },
    // 可调口子（对齐 lenis 的 lerp 选项）：数值越大越"绵"，越小越跟手；30~500ms 限幅
    setDamping(ms) { TIME_CONST = Math.max(30, Math.min(500, ms)); },
    get damping() { return TIME_CONST; },
  };

  // 滚轮 → 累加目标位；弹窗（overlay 与其内部滚动区）保持原生滚动
  window.addEventListener('wheel', (e) => {
    if (e.defaultPrevented || !e.deltaY) return;
    if (e.target.closest('.modal-overlay')) return;
    e.preventDefault();
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 40;                       // 行
    else if (e.deltaMode === 2) dy *= window.innerHeight;  // 页
    target = Math.max(0, Math.min(target + dy, maxScroll()));
    wake();
  }, { passive: false });

  // 外部滚动（滚动条/键盘/hash 直达/位置恢复）与本系统对齐，避免下次滚轮跳位
  window.addEventListener('scroll', () => {
    if (rafId == null || Math.abs(window.scrollY - current) > 1.5) {
      current = target = window.scrollY;
    }
  }, { passive: true });
}

// 兜底入口：默认关闭（原生滚动），想找回"阻尼手感"可在控制台执行 window.enableDampedScroll()
// —— 只影响滚动条以外的滚轮，弹窗内滚动始终原生；刷新即恢复默认。
window.enableDampedScroll = function () {
  if (window.__dampedScroll) return '阻尼滚动已启用';
  initDampedScroll();
  return window.__dampedScroll ? '阻尼滚动已启用（本次会话生效）' : '当前环境不适用（触摸设备或已开减少动效）';
};

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
    const ratio = max > 40 ? Math.min(Math.max(scroller.scrollTop / max, 0), 1) : 0;
    bar.style.width = `${(ratio * 100).toFixed(1)}%`;
    // 读完致谢：滚动到底一次性提示
    if (max > 40 && ratio >= 0.985 && content && !content.dataset.thanked) {
      content.dataset.thanked = '1';
      showToast('读完了，谢谢你 ❤');
    }
  };

  if (content) content.addEventListener('scroll', onScroll, { passive: true });
  if (modal) modal.addEventListener('scroll', onScroll, { passive: true });
}

// 为弹窗内的代码块追加一键复制按钮（剪贴板 API 不可用时静默跳过）
function addCopyButtons(modalContent) {
  if (!navigator.clipboard) return;
  modalContent.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.code-copy-btn')) return;
    pre.style.position = 'relative';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy-btn';
    btn.textContent = '复制';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector('code')?.innerText || pre.innerText);
        btn.textContent = '已复制 ✓';
        setTimeout(() => { btn.textContent = '复制'; }, 1200);
      } catch (_) { /* 用户拒绝剪贴板权限时保持原样 */ }
    });
    pre.appendChild(btn);
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

// ---- js/player.js (c1e0fc6b32f5) ----
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
    window.__BEAT = {
      level: Math.min(1, beatPulse), lv: lv, slow: beatPeak, rise: e,
      mid: mid, treble: tre, ctx: actx ? actx.state : '-'
    };
    beatRaf = requestAnimationFrame(beatLoop);   // 续帧放帧尾：帧内任何早退都不会留下悬空句柄
  }
  function startBeat() {
    try {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        actx = new AC();
        const srcNode = actx.createMediaElementSource(audio);   // 只能建一次；建后声音经 analyser 回到扬声器
        analyser = actx.createAnalyser();
        analyser.fftSize = 2048;                 // bin ≈ 23Hz@48k：kick 40-150Hz 可分辨
        analyser.smoothingTimeConstant = 0;      // 平滑交给 beatLoop 的非对称指数包络
        analyser.minDecibels = -85;              // 默认 -30 上限对响歌大量钳 255
        analyser.maxDecibels = -20;
        srcNode.connect(analyser);
        analyser.connect(actx.destination);
      }
      if (actx.state === 'suspended') actx.resume().catch(function () {});
      if (!beatRaf) beatRaf = requestAnimationFrame(beatLoop);
    } catch (e) { /* 建图失败不影响播放本身 */ }
  }
  function stopBeat() {
    if (beatRaf) { cancelAnimationFrame(beatRaf); beatRaf = 0; }
    window.__BEAT = { level: 0 };
  }

  // —— 循环模式 ——
  function applyMode() {
    audio.loop = (mode === 'one');   // 单曲循环交给浏览器：loop 时 ended 不触发，行为最稳
    modeBtn.classList.toggle('mode-one', mode === 'one');
    modeBtn.setAttribute('aria-label', '循环模式：' + (mode === 'one' ? '单曲循环' : '顺序循环'));
  }

  // —— 渲染 ——
  function renderList() {
    listEl.innerHTML = '';
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
  function load(i, autoplay) {
    current = (i + SONGS.length) % SONGS.length;
    audio.src = SONGS[current].src;
    titleEl.textContent = SONGS[current].title;
    renderList();
    renderMediaSession();
    if (autoplay) {
      audio.play().catch(() => { /* 用户未交互等场景静默 */ });
    } else {
      seekEl.value = 0;
      curEl.textContent = '0:00';
      durEl.textContent = '0:00';
    }
  }

  // 起播稳定后让 SW 预热这首歌的全量入库（下次秒开 + 离线可播）：
  // 消息走 message 事件 + waitUntil，SW 里裸 setTimeout 会被提前终止（2026-09-30 踩过）；
  // 延迟 2.5s 发，让起播缓冲先把带宽用完。
  audio.addEventListener('playing', function () {
    setTimeout(function () {
      var url = audio.currentSrc || audio.src;
      if (url && navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'prefetch-media', url: url });
      }
    }, 2500);
  });

  // 首曲预热（2026-10-17 加）：只在「用户真的可能听」时才发起网络 ——
  // 首次交互 / 打开播放面板 / 点播放三者任一，且只做一次。
  let primed = false;
  function prime() {
    if (primed) return;
    primed = true;
    try { audio.preload = 'metadata'; } catch (e) {}
    audio.src = SONGS[current].src;
    const swRef = navigator.serviceWorker;
    const warmUp = function () {
      try {
        const conn = navigator.connection;
        if (conn && (conn.saveData || /2g$/i.test(conn.effectiveType || ''))) return;   // 省流模式不预热
        if (swRef && swRef.controller) swRef.controller.postMessage({ type: 'warm-media', url: SONGS[current].src });
      } catch (e) {}
    };
    if (swRef && swRef.controller) warmUp();
    else if (swRef) swRef.addEventListener('controllerchange', warmUp, { once: true });
  }

  function togglePlay() {
    if (!audio.src) { load(current, true); return; }
    if (audio.paused) audio.play().catch(() => {});
    else { audio.pause(); }
  }

  function restore() {
    clearResume();          // 零播放记录：老访客的续听键一并清掉
    applyOrder();
    // 2026-10-17 加载优化（D）：首屏**不再**设 audio.src、也不再让 SW 预热首曲。
    // 原先恢复阶段就 `preload='metadata'; audio.src=…` 并 postMessage 预热 256KB，
    // 实测首屏会发起一个卡住 10.5 秒、0 字节的 /music/*.mp3 请求，白占一个连接槽。
    // 现在改成「首次交互 / 打开播放面板 / 点播放」时才 prime()：
    //   交互时 prime() → metadata 只取时长（几 KB）+ SW 预热首曲前 256KB（点播放零等待）
    //   真实播放 2.5s 后再全量入库（下方 playing 监听不变）。
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
    panel.style.left = cx + 'px';
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

  // 首次交互也预热：通常早于"点播放"，给 SW 留出把首曲前 256KB 拿到手的窗口
  ['pointerdown', 'keydown', 'wheel'].forEach((ev) => {
    window.addEventListener(ev, prime, { once: true, passive: true });
  });
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
  });
  audio.addEventListener('pause', () => {
    playBtn.classList.remove('is-playing');
    fab.classList.remove('is-playing');
    stopBeat();
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
    navigator.mediaSession.setActionHandler('previoustrack', () => { startBeat(); load(current - 1, !audio.paused); });
    navigator.mediaSession.setActionHandler('nexttrack', () => { startBeat(); load(current + 1, !audio.paused); });
  }

  // —— 介绍视频 × 音乐互斥 + 视口自动暂停（2026-09-30 用户需求）——
  // 看介绍视频时自动暂停音乐（站点歌单或本地音乐，谁在响停谁），视频暂停/播完自动恢复；
  // 视频滚出视口自动暂停（走 pause 事件 → 同样恢复音乐）。多视频互斥：任一在播即"观看中"。
  // 恢复的唯一凭据是 musicPausedByVideo：用户本来就没开音乐时，视频结束不会强行播放。
  (function initVideoMusicMutex() {
    const videos = Array.from(document.querySelectorAll('#products video'));
    if (!videos.length) return;
    const siteAudio = audio;                        // 站点歌单
    const localAudio = document.getElementById('cosmos-audio');
    let musicPausedByVideo = '';                    // '' | 'site' | 'local'：音乐因视频被暂停的凭据（只服务恢复方向）
    let userOverride = false;                       // 用户在视频播放期间手动放歌 → 尊重到视频会话结束
    let resumingByVideo = false;                    // 互斥自己的恢复进行中（不算用户 override）

    const playingVideo = () => videos.find((v) => !v.paused && !v.ended);
    // 无凭据守卫、幂等：轮询每秒都会调，事件丢失后照样能把状态拉回来
    // （v112 前的 `if (musicPausedByVideo) return` 会让丢事件环境的暂停路径永久短路——实测根因）
    function pauseMusicForVideo() {
      if (!siteAudio.paused) {
        siteAudio.pause();
        musicPausedByVideo = 'site';
      } else if (localAudio && localAudio.src && !localAudio.paused) {
        localAudio.pause();
        musicPausedByVideo = 'local';
      }
    }
    function resumeMusicIfIdle() {
      if (!musicPausedByVideo || playingVideo()) return;   // 还有别的视频在播就不恢复
      const which = musicPausedByVideo;
      musicPausedByVideo = '';
      resumingByVideo = true;                       // 自己的恢复不算用户 override
      setTimeout(function () { resumingByVideo = false; }, 400);   // 事件丢失时的兜底复位
      const el = which === 'site' ? siteAudio : localAudio;
      if (el) el.play().catch(function () { resumingByVideo = false; });   // FAB 图标经 audio 的 play/pause 监听自动同步
    }
    // 用户在视频播放期间手动恢复了音乐 → 本会话尊重用户（音乐与视频同播到视频结束）
    [siteAudio, localAudio].forEach((el) => {
      if (el) el.addEventListener('play', function () {
        if (playingVideo() && !resumingByVideo) userOverride = true;
        resumingByVideo = false;
      });
    });

    videos.forEach((v) => {
      v.addEventListener('play', function () {
        videos.forEach(function (o) { if (o !== v && !o.paused) o.pause(); });   // 视频互斥
        pauseMusicForVideo();
      });
      v.addEventListener('pause', resumeMusicIfIdle);
      v.addEventListener('ended', resumeMusicIfIdle);
    });

    // 状态轮询兜底（2026-09-30 用户实测部分环境仍能同时播放）：事件在个别内核
    // （X5/后台标签页等）会丢或乱序，事件链再对也架不住漏一个。每秒对齐一次理想态——
    // 有视频在播 → 音乐必须停（除非用户本会话明确 override）；无视频在播且有凭据 → 恢复。
    setInterval(function () {
      const vPlaying = playingVideo();
      if (!vPlaying) {
        userOverride = false;                       // 视频会话结束，override 失效
        if (musicPausedByVideo) resumeMusicIfIdle();
        return;
      }
      if (!userOverride) pauseMusicForVideo();
    }, 1000);

    // 滚出视口：可见比例 <15% 且仍在播 → 自动暂停（pause 事件链会恢复音乐）
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting && !en.target.paused && !en.target.ended && en.target.currentTime > 0) {
            en.target.pause();
          }
        });
      }, { threshold: 0.15 });
      videos.forEach((v) => io.observe(v));
    }
  })();

  restore();
})();

