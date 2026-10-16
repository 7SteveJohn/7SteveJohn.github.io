/**
 * 归档页：波浪曲线时间轴（archive.html）
 * ----------------------------------------------------
 * - 数据直接复用 window.ARTICLES_DATA（与首页同一份，含 section 路由），不重复维护
 * - 桌面（≥900px）：一条向下的正弦曲线串起所有卡片，卡片左右交错挂在曲线两侧，
 *   曲线用 JS 依真实节点坐标生成（Catmull-Rom 转三次贝塞尔），滚动到哪亮到哪
 * - 窄屏（<900px）：整体退化为单列 + 左侧竖线（纯 CSS，不做绝对定位，健壮优先）
 * - 筛选写进 location.hash（可分享 / 可后退），筛选后重新布局
 * - 卡片是 <a href="index.html?post=id">：键盘可达、能被爬虫抓，阅读弹窗仍由首页负责
 * - 一切动效尊重 prefers-reduced-motion（见 css/archive.css）
 */
(function () {
  'use strict';

  const WAVE = document.getElementById('archive-wave');
  const LIST = document.getElementById('archive-list');
  const SVG = document.getElementById('archive-svg');
  const LINE = SVG ? SVG.querySelector('.wave-line') : null;
  const PROG = SVG ? SVG.querySelector('.wave-progress') : null;
  const FILTERS = document.getElementById('archive-filters');
  const COUNT = document.getElementById('archive-count');
  if (!WAVE || !LIST) return;

  const SECTIONS = [
    { key: 'all', label: '全部', match: () => true },
    { key: 'tech', label: '技术手记', match: (a) => !a.section },
    { key: 'creation', label: '创作', match: (a) => a.section === 'creation' },
    { key: 'essay', label: '随笔', match: (a) => a.section === 'essay' },
    { key: 'ai', label: 'AI 学习', match: (a) => a.section === 'ai' }
  ];

  const wide = window.matchMedia('(min-width: 900px)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  const articles = (window.ARTICLES_DATA || [])
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const sectionName = (a) => {
    const s = SECTIONS.find((x) => x.key !== 'all' && x.match(a));
    return (s && s.label) || a.category || '手记';
  };

  // ---- 建卡片 ----
  const items = articles.map((art) => {
    const wrap = document.createElement('article');
    wrap.className = 'arc-item reveal';

    const card = document.createElement('a');
    card.className = 'arc-card bento-card glass-spec';
    card.href = 'index.html?post=' + encodeURIComponent(art.id);
    card.setAttribute('aria-label', `${art.title}（${art.date}）`);

    const meta = document.createElement('div');
    meta.className = 'arc-meta';
    [
      { cls: 'arc-pill', text: sectionName(art) },
      { cls: '', text: art.date || '' },
      { cls: '', text: art.readTime ? '· ' + art.readTime : '' }
    ].forEach(({ cls, text }) => {
      const span = document.createElement('span');
      if (cls) span.className = cls;
      span.textContent = text;
      meta.appendChild(span);
    });
    card.appendChild(meta);

    const title = document.createElement('h2');
    title.className = 'arc-title';
    title.textContent = art.title || '(无题)';
    card.appendChild(title);

    if (art.summary) {
      const sum = document.createElement('p');
      sum.className = 'arc-sum';
      sum.textContent = art.summary;
      card.appendChild(sum);
    }

    if (Array.isArray(art.tags) && art.tags.length) {
      const tags = document.createElement('p');
      tags.className = 'arc-tags';
      tags.textContent = art.tags.map((t) => '#' + t).join('  ');
      card.appendChild(tags);
    }

    wrap.appendChild(card);

    const node = document.createElement('span');
    node.className = 'wave-node';
    node.setAttribute('aria-hidden', 'true');
    const year = document.createElement('span');
    year.className = 'wave-year';
    year.setAttribute('aria-hidden', 'true');

    LIST.append(wrap, node, year);
    return { art, wrap, card, node, year, side: 'left', x: 0, y: 0 };
  });

  let shown = items.slice();

  // ---- 曲线：Catmull-Rom → 三次贝塞尔 ----
  function spline(points) {
    if (points.length < 2) return '';
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }

  // ---- 空态提示（某个分类还没内容时）----
  let emptyEl = null;
  function empty(show) {
    if (!show) {
      if (emptyEl) { emptyEl.remove(); emptyEl = null; }
      return;
    }
    if (emptyEl) return;
    emptyEl = document.createElement('p');
    emptyEl.className = 'arc-empty';
    emptyEl.textContent = '这个分类还空着，慢慢写。';
    LIST.appendChild(emptyEl);
  }

  // ---- 布局（桌面绝对定位；窄屏清干净让 CSS 接管）----
  function layout() {
    const list = shown;
    const isWide = wide.matches;
    progressLen = 0;      // 路径换了，长度必须重算

    if (!isWide || !list.length) {
      empty(!list.length);
      WAVE.style.height = '';
      LIST.style.height = '';
      items.forEach(({ wrap, node, year }) => {
        wrap.style.cssText = '';
        wrap.dataset.side = '';
        node.style.cssText = '';
        year.style.cssText = '';
        year.textContent = '';
      });
      if (isWide && !list.length) LIST.style.height = '120px';
      paintProgress();
      return;
    }
    empty(false);

    const W = LIST.clientWidth || WAVE.clientWidth;
    const cardW = W >= 1280 ? 430 : W >= 1080 ? 400 : 356;
    const amp = Math.max(48, Math.min(118, W * 0.085));
    const lambda = 560;                       // 正弦波长（px）
    const gap = 26;                           // 节点到卡片边缘留白
    const padTop = 40;

    // 先按最小间距排一版，量出最高卡片，再确定真实行距
    const maxTop = () => {
      let max = padTop;
      list.forEach((it) => { max = Math.max(max, it.y); });
      return max;
    };
    let pitch = 168;
    let points = [];
    const place = (P) => {
      points = [];
      list.forEach((it, i) => {
        const y = padTop + i * P + P / 2;
        const x = W / 2 + amp * Math.sin((y / lambda) * Math.PI * 2);
        it.x = x;
        it.y = y;
        it.side = i % 2 ? 'right' : 'left';
        points.push({ x, y });
      });
    };

    place(pitch);
    // 两遍收敛：把最高的那张卡塞得下（卡片高度随标题/摘要行数变化）
    for (let pass = 0; pass < 2; pass++) {
      let tallest = 0;
      list.forEach((it) => { tallest = Math.max(tallest, it.card.offsetHeight || 0); });
      const next = Math.max(160, tallest + 34);
      if (next <= pitch) break;
      pitch = next;
      place(pitch);
    }

    LIST.style.height = (maxTop() + pitch / 2 + 48) + 'px';

    list.forEach((it, i) => {
      const { wrap, card, node, year, x, y, side } = it;
      wrap.dataset.side = side;
      wrap.style.top = y.toFixed(1) + 'px';
      const left = side === 'right'
        ? x + gap
        : x - gap - cardW;
      wrap.style.left = Math.max(6, Math.min(W - cardW - 6, left)).toFixed(1) + 'px';
      wrap.style.width = cardW + 'px';
      wrap.style.transitionDelay = reduce.matches ? '0ms' : Math.min(i * 40, 320) + 'ms';

      node.style.left = x.toFixed(1) + 'px';
      node.style.top = y.toFixed(1) + 'px';

      const yyyy = (it.art.date || '').slice(0, 4);
      const prev = list[i - 1];
      const prevYear = prev ? (prev.art.date || '').slice(0, 4) : '';
      if (yyyy && yyyy !== prevYear) {
        year.textContent = yyyy;
        year.style.top = y.toFixed(1) + 'px';
        year.style.left = x.toFixed(1) + 'px';
        year.style.transform = side === 'right'
          ? 'translate(calc(-100% - 12px), -50%)'
          : 'translate(12px, -50%)';
      } else {
        year.textContent = '';
      }
    });

    const d = spline(points);
    LINE.setAttribute('d', d);
    PROG.setAttribute('d', d);
    SVG.setAttribute('viewBox', `0 0 ${W} ${LIST.offsetHeight}`);
    SVG.setAttribute('width', W);
    SVG.setAttribute('height', LIST.offsetHeight);
    SVG.style.height = LIST.offsetHeight + 'px';
    paintProgress();
  }

  // ---- 滚动进度：曲线走到哪亮到哪 ----
  let progressLen = 0;
  function paintProgress() {
    if (!PROG || !LINE) return;
    if (!progressLen) {
      try { progressLen = LINE.getTotalLength() || 0; } catch (e) { progressLen = 0; }
    }
    if (!progressLen) return;
    const rect = WAVE.getBoundingClientRect();
    const marker = window.innerHeight * 0.62;
    const p = Math.max(0, Math.min(1, (marker - rect.top) / Math.max(1, rect.height)));
    PROG.style.strokeDasharray = String(progressLen);
    PROG.style.strokeDashoffset = String(progressLen * (1 - p));
  }

  // ---- 筛选 ----
  function chips() {
    if (!FILTERS) return;
    SECTIONS.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'arc-chip';
      b.dataset.key = s.key;
      b.textContent = s.label;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        if (location.hash === '#' + s.key) applyFilter(s.key);
        else location.hash = '#' + s.key;      // hashchange 里统一收口
      });
      FILTERS.appendChild(b);
    });
  }

  function applyFilter(key) {
    const cfg = SECTIONS.find((s) => s.key === key) || SECTIONS[0];
    shown = [];
    items.forEach((it) => {
      const ok = cfg.match(it.art);
      it.wrap.hidden = !ok;
      if (ok) shown.push(it);
    });
    if (FILTERS) {
      [...FILTERS.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.key === cfg.key)));
    }
    if (COUNT) COUNT.textContent = String(shown.length);
    WAVE.dataset.filter = cfg.key;
    layout();
  }

  // ---- 浮现 ----
  function reveal() {
    if (!('IntersectionObserver' in window)) {
      items.forEach((it) => it.wrap.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-visible');
        io.unobserve(en.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    items.forEach((it) => io.observe(it.wrap));
  }

  // ---- 启动 ----
  chips();
  applyFilter((location.hash || '').replace('#', '') || 'all');
  reveal();

  let raf = 0;
  window.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; paintProgress(); });
  }, { passive: true });

  let rz = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { progressLen = 0; layout(); }, 160);
  });
  if (wide.addEventListener) wide.addEventListener('change', () => { progressLen = 0; layout(); });
  window.addEventListener('hashchange', () => applyFilter((location.hash || '').replace('#', '') || 'all'));
})();
