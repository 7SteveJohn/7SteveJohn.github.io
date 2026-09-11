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
      ['核心数据', '#metrics'],
      ['个人工具', '#products'],
      ['设计原则', '#philosophy'],
      ['技术手记', '#blog'],
      ['创作', '#creation'],
      ['随笔', '#essays']
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
      resultsEl.innerHTML = '<div class="px-3 py-6 text-center text-xs text-[#86868b]">输入关键词搜索手记、小说、工具，或用 ↑ ↓ 选择区块</div>';
      return;
    }
    if (!filtered.length) {
      resultsEl.innerHTML = '<div class="px-3 py-6 text-center text-xs text-[#86868b]">没有找到相关内容</div>';
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
