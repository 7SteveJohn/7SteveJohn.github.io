// build-bundles: {"name":"links","version":"f863fa6214ed","sources":[{"path":"js/friends.js","sha256":"7f04d5bc0367d5907a1d0fdbec12c85075460b3a58925ebde90195c86179f76a"},{"path":"js/bookmarks.js","sha256":"a7466b5113605ba4e41d1d47a0d8fb6411a729fc9bf5b5e326b3ea37716f79d1"},{"path":"js/links.js","sha256":"a5e3d8effed5912157e6081d9b0930ecde9482c32d1089a6cc2ba1755c8a5591"}]}
/* 仅链接页：友链数据 → 收藏数据 → 渲染
   ❗生成物：由 node scripts/build-bundles.mjs 从下列源文件拼接，请改源文件后重建。
   源文件顺序：js/friends.js → js/bookmarks.js → js/links.js */

// ---- js/friends.js (7f04d5bc0367) ----
/**
 * 友链数据（links.html 的「友情链接」区）
 * ----------------------------------------------------
 * 加一条友链就是往数组里加一行，刷新即可见（与 articles.js / gallery.js 同约定）。
 * 字段：
 *   name   站点名（必填）
 *   url    首页地址（必填，https）
 *   desc   一句话介绍（必填）
 *   avatar 头像图（可选，相对路径或 https；缺省时用「站点名首字 + 渐变」兜底）
 *
 * 申请友链的方式写在 links.html 的说明块里（邮箱 + GitHub），
 * 收到后由你自己判断值不值得收 —— 这里不做自动抓取、不做外链头像的实时加载兜底。
 */
window.FRIENDS_DATA = [
  // 示例（把自己的友链按同样格式加进来即可；这条示例可以直接删掉）
  // { name: '某人的小站', url: 'https://example.com', desc: '一句话介绍', avatar: '' }
];

;

// ---- js/bookmarks.js (a7466b511360) ----
/**
 * 收藏数据（links.html 的「收藏夹」区）
 * ----------------------------------------------------
 * 结构：分组 → 条目。加一条就是加一行，刷新即可见。
 *   { group: '分组名',
 *     items: [{ name, url, desc, tags: ['标签'] }] }
 *
 * ❗这里只放**外链入口**，不加载任何第三方资源（站点的零外链红线不受影响：
 *   访客点开才离开本站，页面本身不会请求这些域名）。
 * 默认这几条是通用开发资源，可随意删改；你自己的常用链接建议放最上面一组。
 */
window.BOOKMARKS_DATA = [
  {
    group: '开发文档',
    items: [
      { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/zh-CN/', desc: 'Web 平台最权威的中文文档：HTML / CSS / JS 与浏览器 API', tags: ['前端', '参考'] },
      { name: 'Can I use', url: 'https://caniuse.com/', desc: '某个 CSS/JS 特性在各浏览器里的支持情况，写兼容代码前先查', tags: ['兼容性'] },
      { name: 'Android Developers', url: 'https://developer.android.com/', desc: 'Android 官方文档，权限模型与生命周期都在这里', tags: ['Android'] },
      { name: 'Python 官方文档', url: 'https://docs.python.org/zh-cn/3/', desc: '标准库速查，比搜索引擎更准', tags: ['Python'] }
    ]
  },
  {
    group: '工具与素材',
    items: [
      { name: 'Squoosh', url: 'https://squoosh.app/', desc: '浏览器内的图片压缩：本站封面转 webp 就用它（本地跑，不上传）', tags: ['图片', '性能'] },
      { name: 'regex101', url: 'https://regex101.com/', desc: '正则调试与逐段解释，写完先在这里试', tags: ['正则'] },
      { name: 'GitHub', url: 'https://github.com/', desc: '代码与部署的落脚点', tags: ['Git'] }
    ]
  },
  {
    group: '本站相关',
    items: [
      { name: '本站 GitHub 仓库', url: 'https://github.com/7SteveJohn/7SteveJohn.github.io', desc: '这个站的源码：纯静态、零外链、可双击打开', tags: ['源码'] },
      { name: '归档 · 时间河', url: 'archive.html', desc: '全部文章按时间排成一条曲线（站内页面）', tags: ['站内'] }
    ]
  }
];

;

// ---- js/links.js (a5e3d8effed5) ----
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

