/**
 * 链接页渲染（links.html）
 * ----------------------------------------------------
 * 两块内容：
 *   · 友情链接（js/friends.js）—— 卡片网格；没有数据时给空态，说明怎么申请
 *   · 收藏夹（js/bookmarks.js）—— 分组 + 分类胶囊筛选 + 本地关键词搜索（纯前端过滤）
 * 站内相对链接（如 archive.html）直接跳转，外链统一带 rel="noopener noreferrer"。
 */
(function () {
  'use strict';

  // ---------------- 友情链接 ----------------
  const friendGrid = document.getElementById('friends-grid');
  const friendEmpty = document.getElementById('friends-empty');
  const friends = Array.isArray(window.FRIENDS_DATA) ? window.FRIENDS_DATA : [];

  const isOut = (url) => /^https?:/i.test(url || '');
  const safeUrl = (url) => (isOut(url) || /^[\w./#?%\-]+$/.test(url || '') ? url : '#');

  if (friendGrid) {
    if (!friends.length) {
      if (friendEmpty) friendEmpty.hidden = false;
    } else {
      friends.forEach((f) => {
        const a = document.createElement('a');
        a.className = 'link-card';
        a.href = safeUrl(f.url);
        if (isOut(f.url)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        a.innerHTML = `
          <span class="link-avatar" aria-hidden="true">${f.avatar
            ? `<img src="${f.avatar}" alt="" loading="lazy" onerror="this.remove()">`
            : escapeHtml((f.name || '?').slice(0, 1))}</span>
          <span class="link-body">
            <b>${escapeHtml(f.name || '')}</b>
            <span class="link-desc">${escapeHtml(f.desc || '')}</span>
          </span>`;
        friendGrid.appendChild(a);
      });
    }
  }

  // ---------------- 收藏夹 ----------------
  const list = document.getElementById('bookmark-list');
  const chips = document.getElementById('bookmark-filters');
  const search = document.getElementById('bookmark-search');
  const countEl = document.getElementById('bookmark-count');
  const emptyEl = document.getElementById('bookmark-empty');
  const groups = Array.isArray(window.BOOKMARKS_DATA) ? window.BOOKMARKS_DATA : [];
  if (!list) return;

  const all = [];
  groups.forEach((g) => (g.items || []).forEach((it) => all.push({ ...it, group: g.group })));
  const groupNames = groups.map((g) => g.group);

  let activeGroup = '全部';
  let query = '';

  // 分类胶囊
  if (chips) {
    ['全部', ...groupNames].forEach((name) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'arc-chip';
      b.textContent = name;
      b.setAttribute('aria-pressed', String(name === activeGroup));
      b.addEventListener('click', () => {
        activeGroup = name;
        [...chips.children].forEach((c) => c.setAttribute('aria-pressed', String(c.textContent === name)));
        render();
      });
      chips.appendChild(b);
    });
  }

  if (search) {
    search.addEventListener('input', () => {
      query = search.value.trim().toLowerCase();
      render();
    });
  }

  function match(it) {
    if (activeGroup !== '全部' && it.group !== activeGroup) return false;
    if (!query) return true;
    const hay = [it.name, it.desc, it.group, ...(it.tags || [])].join(' ').toLowerCase();
    return query.split(/\s+/).every((t) => hay.includes(t));
  }

  function render() {
    const hits = all.filter(match);
    list.textContent = '';
    hits.forEach((it) => {
      const a = document.createElement('a');
      a.className = 'bm-card';
      a.href = safeUrl(it.url);
      if (isOut(it.url)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      a.innerHTML = `
        <span class="bm-head"><b>${escapeHtml(it.name || '')}</b>
          <span class="bm-group">${escapeHtml(it.group || '')}</span></span>
        <span class="bm-desc">${escapeHtml(it.desc || '')}</span>
        <span class="bm-tags">${(it.tags || []).map((t) => '#' + escapeHtml(t)).join('  ')}</span>`;
      list.appendChild(a);
    });
    if (countEl) countEl.textContent = String(hits.length);
    if (emptyEl) emptyEl.hidden = hits.length > 0;
  }

  render();

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
