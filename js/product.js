/**
 * 产品页（product.html?id=…）与产品索引（products.html）
 * ----------------------------------------------------
 * 数据只读 js/projects.js（首页卡片用的同一份），所以改产品信息只改那一处。
 * 页面是「单模板 + 查询参数」，不加构建步骤：?id=filebutler 这种地址可直接分享、可被收录
 * （canonical 指向自身带 id 的地址，sitemap 由 scripts/gen-rss.js 统一生成）。
 *
 * 依赖：
 *   · window.PROJECTS_DATA —— js/projects.js
 *   · window.ensureMarkdown —— core bundle 里的 js/markdown-loader.js（详情正文按需渲染）
 *   · js/articles.js —— 「相关手记」用，只有真需要时才异步拉（不在首屏）
 */
(function () {
  'use strict';

  const DATA = window.PROJECTS_DATA || [];
  const byId = (id) => DATA.find((p) => String(p.id) === String(id));

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const initial = (s) => (String(s || '?').replace(/[·｜|].*$/, '').trim().charAt(0) || '?');

  function coverHtml(p) {
    if (p.image) {
      // onerror 里把图删掉 → 露出下面的品牌渐变兜底，避免裂图
      return `<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="eager" decoding="async"
        onerror="this.remove()"><span class="prod-cover-fallback" aria-hidden="true">${esc(initial(p.title))}</span>`;
    }
    return `<span class="prod-cover-fallback" aria-hidden="true">${esc(initial(p.title))}</span>`;
  }

  function actionsHtml(p) {
    const btns = [];
    if (p.downloadUrl) {
      btns.push(`<a class="prod-btn prod-btn-primary" href="${esc(p.downloadUrl)}" target="_blank" rel="noopener noreferrer">
        <i data-lucide="download" class="w-4 h-4"></i><span>下载${p.downloadPwd ? `（提取码 ${esc(p.downloadPwd)}）` : ''}</span></a>`);
    }
    if (p.githubUrl && p.githubUrl !== '#') {
      btns.push(`<a class="prod-btn" href="${esc(p.githubUrl)}" target="_blank" rel="noopener noreferrer">GitHub 源码</a>`);
    }
    if (p.demoUrl && p.demoUrl !== '#' && p.demoUrl !== p.githubUrl) {
      btns.push(`<a class="prod-btn" href="${esc(p.demoUrl)}" target="_blank" rel="noopener noreferrer">发布页 / 说明</a>`);
    }
    return btns.join('');
  }

  function changelogHtml(p) {
    const rows = Array.isArray(p.changelog) ? p.changelog : [];
    const head = `<div class="prod-section-head">
      <h2>版本与更新</h2>
      ${p.version ? `<span class="prod-version">${esc(p.version)}${p.updated ? ' · ' + esc(p.updated) : ''}</span>` : ''}
    </div>`;
    if (!rows.length) {
      // 没有逐版记录时，只陈述一个事实（当前版本 + 发布日期），不编造历史
      return head + `<ol class="prod-releases">
        <li class="prod-release">
          <div class="prod-release-head"><b>${esc(p.version || '当前版本')}</b><span>${esc(p.updated || '')}</span></div>
          <ul><li>这一版的能力见上方「它能做什么」。</li></ul>
        </li>
      </ol>
      <p class="prod-hint">逐版记录还没开始写。要补的话，在 <code>js/projects.js</code> 里给这个产品加
        <code>changelog</code> 数组（每条 <code>{ version, date, items: [] }</code>），这里会按顺序列出来。</p>`;
    }
    return head + `<ol class="prod-releases">` + rows.map((c) => `
      <li class="prod-release">
        <div class="prod-release-head"><b>${esc(c.version || '')}</b><span>${esc(c.date || '')}</span></div>
        ${Array.isArray(c.items) && c.items.length ? `<ul>${c.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
      </li>`).join('') + `</ol>`;
  }

  // 相关手记：按标签/标题重合度挑 3 篇（没有就不显示这一块）
  function pickRelated(arts, p) {
    const tags = (p.tags || []).map((t) => String(t).toLowerCase());
    const name = String(p.title || '').split('·')[0].trim().toLowerCase();
    return arts
      .map((a) => {
        const text = [a.title, a.summary, a.category, (a.tags || []).join(' '), String(a.content || '').slice(0, 600)]
          .join(' ').toLowerCase();
        let score = 0;
        tags.forEach((t) => { if (t && text.includes(t)) score += 2; });
        if (name && text.includes(name)) score += 4;
        return { a, score };
      })
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score || String(y.a.date).localeCompare(String(x.a.date)))
      .slice(0, 3)
      .map((x) => x.a);
  }

  function relatedHtml(arts, p) {
    const items = pickRelated(arts, p);
    if (!items.length) return '';
    return `<section class="prod-section">
      <div class="prod-section-head"><h2>相关手记</h2><a class="prod-more" href="archive.html">全部手记 →</a></div>
      <div class="prod-related">
        ${items.map((a) => `<a class="prod-related-item" href="index.html?post=${encodeURIComponent(a.id)}">
          <b>${esc(a.title)}</b><span>${esc(a.date || '')}${a.category ? ' · ' + esc(a.category) : ''}</span>
        </a>`).join('')}
      </div>
    </section>`;
  }

  function injectJsonLd(p) {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: p.title,
      applicationCategory: p.categoryName || 'DesktopApplication',
      operatingSystem: p.requires || 'Windows',
      softwareVersion: p.version || '',
      datePublished: p.updated || '',
      description: p.description || '',
      url: location.href,
      author: { '@type': 'Person', name: 'SevenJohn', url: 'https://7stevejohn.github.io/' }
    };
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  // ---------------- 详情页 ----------------
  async function renderDetail() {
    const id = new URLSearchParams(location.search).get('id') || '';
    const p = byId(id);
    const root = document.getElementById('product-detail');
    if (!root) return;

    if (!p) {
      document.title = '没有这个产品 · 楠屿札记';
      root.innerHTML = `<div class="prod-missing">
        <h1>没有这个产品</h1>
        <p>地址里的 <code>id</code> 对不上任何条目。可能是链接复制少了字符。</p>
        <a class="prod-btn prod-btn-primary" href="products.html">看全部产品 →</a>
      </div>`;
      return;
    }

    // 头部信息（SEO）
    document.title = `${p.title} · 楠屿札记`;
    const desc = String(p.description || '').slice(0, 150);
    const setMeta = (sel, attr, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); };
    setMeta('meta[name="description"]', 'content', desc);
    setMeta('link[rel="canonical"]', 'href', location.origin + location.pathname + '?id=' + encodeURIComponent(p.id));
    setMeta('meta[property="og:title"]', 'content', p.title);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[property="og:url"]', 'content', location.href);
    if (p.image) setMeta('meta[property="og:image"]', 'content', new URL(p.image, location.href).href);

    const idx = DATA.indexOf(p);
    const prev = DATA[(idx - 1 + DATA.length) % DATA.length];
    const next = DATA[(idx + 1) % DATA.length];

    // 桌面：左栏「封面 + 标题 + 版本 + 下载 + 标签」，右栏「正文与更新日志」；
    // 手机：单列（封面 → 标题 → 按钮 → 正文），避免宽屏下一列到底、页面被拉得过长
    root.innerHTML = `
      <nav class="prod-crumb" aria-label="面包屑">
        <a href="index.html">首页</a><span>/</span>
        <a href="products.html">产品</a><span>/</span>
        <span aria-current="page">${esc(p.title)}</span>
      </nav>

      <div class="prod-layout">
        <aside class="prod-rail">
          <div class="prod-hero-cover">${coverHtml(p)}</div>

          <header class="prod-hero">
            <div class="prod-hero-meta">
              ${p.categoryName ? `<span class="prod-chip">${esc(p.categoryName)}</span>` : ''}
              ${p.version ? `<span class="prod-chip prod-chip-quiet">${esc(p.version)}</span>` : ''}
              ${p.updated ? `<span class="prod-chip prod-chip-quiet">更新于 ${esc(p.updated)}</span>` : ''}
            </div>
            <h1>${esc(p.title)}</h1>
            <p class="prod-lede">${esc(p.description)}</p>
          </header>

          ${(p.tags || []).length ? `<ul class="prod-tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
          <div class="prod-actions">${actionsHtml(p)}</div>
          ${p.requires ? `<p class="prod-req">运行环境：${esc(p.requires)}</p>` : ''}
        </aside>

        <article class="prod-main">
          <section class="prod-section">
            <div class="prod-section-head"><h2>它能做什么</h2>${p.role ? `<span class="prod-role">我的角色：${esc(p.role)}</span>` : ''}</div>
            <div class="markdown-body prod-md" id="product-details"><p class="md-pending">正在准备阅读器…</p></div>
          </section>

          ${p.challenge ? `<section class="prod-section">
            <div class="prod-section-head"><h2>技术难点与解法</h2></div>
            <p class="prod-challenge">${esc(p.challenge)}</p>
          </section>` : ''}

          <section class="prod-section" id="product-changelog">${changelogHtml(p)}</section>

          <div id="product-related"></div>
        </article>
      </div>

      <nav class="prod-pager" aria-label="产品翻页">
        <a class="prod-pager-item" href="product.html?id=${encodeURIComponent(prev.id)}">
          <span>上一个</span><b>${esc(prev.title)}</b>
        </a>
        <a class="prod-pager-item prod-pager-next" href="product.html?id=${encodeURIComponent(next.id)}">
          <span>下一个</span><b>${esc(next.title)}</b>
        </a>
      </nav>`;

    // 详情正文：渲染器按需加载，失败回落纯文本
    const box = document.getElementById('product-details');
    if (box) {
      const ok = await (window.ensureMarkdown ? window.ensureMarkdown() : Promise.resolve(false));
      if (ok && p.details) {
        box.innerHTML = window.DOMPurify.sanitize(window.marked.parse(p.details), { ADD_TAGS: ['details', 'summary'], ADD_ATTR: ['open'] });
      } else {
        box.innerHTML = `<p>${esc(p.details || '（暂无更多说明）')}</p>`;
      }
      if (window.lucide) window.lucide.createIcons();
    }

    injectJsonLd(p);

    // 相关手记：只有需要时才拉 articles.js（133KB，不占首屏）
    const relHost = document.getElementById('product-related');
    if (relHost) {
      if (window.ARTICLES_DATA) relHost.innerHTML = relatedHtml(window.ARTICLES_DATA, p);
      else {
        const s = document.createElement('script');
        s.src = 'js/articles.js';
        s.onload = () => { relHost.innerHTML = relatedHtml(window.ARTICLES_DATA || [], p); };
        document.head.appendChild(s);
      }
    }
  }

  // ---------------- 索引页 ----------------
  function renderIndex() {
    const root = document.getElementById('product-index');
    if (!root) return;
    const groups = new Map();
    DATA.forEach((p) => {
      const k = p.categoryName || '其他';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(p);
    });

    root.innerHTML = [...groups.entries()].map(([name, items]) => `
      <section class="prod-group">
        <h2 class="prod-group-title">${esc(name)} <span>${items.length}</span></h2>
        <div class="prod-grid">
          ${items.map((p) => `
            <a class="prod-card" href="product.html?id=${encodeURIComponent(p.id)}">
              <div class="prod-card-cover">${coverHtml(p)}</div>
              <div class="prod-card-body">
                <b>${esc(p.title)}</b>
                <p>${esc(String(p.description || '').slice(0, 86))}…</p>
                <div class="prod-card-meta">
                  ${p.version ? `<span>${esc(p.version)}</span>` : ''}
                  ${p.updated ? `<span>${esc(p.updated)}</span>` : ''}
                </div>
              </div>
            </a>`).join('')}
        </div>
      </section>`).join('');
  }

  renderIndex();
  renderDetail();
})();
