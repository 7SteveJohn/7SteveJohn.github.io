/**
 * 照片墙（gallery.html）
 * ----------------------------------------------------
 * - 数据在本文件的 window.GALLERY_DATA 里：加一张图 = 加一条记录（与 articles.js 同约定）
 *   字段：src（必填，相对路径）、caption（标题）、meta（副标题，如「项目封面 · 桌面应用」）、
 *         span（可选 'wide' 占两列 / 'tall' 占两行，用来错落排版）
 * - 首版全部复用 assets/images/ 里既有的项目封面与介绍视频海报，不引入新素材
 * - 网格是纯 CSS（css/gallery.css）；本文件负责渲染瓷砖与灯箱（打开/切换/键盘/Esc/焦点归位）
 * - 大图一律 loading="lazy"，灯箱只预加载相邻两张
 */
(function () {
  'use strict';

  window.GALLERY_DATA = [
    { src: 'assets/images/cover-filebutler.webp', caption: 'FileButler · 本地文件管家', meta: '项目封面 · 桌面应用', span: 'wide' },
    { src: 'assets/images/filebutler-tour-poster.jpg', caption: 'FileButler · 功能导览', meta: '介绍视频封面' },
    { src: 'assets/images/cover-netops.webp', caption: 'NetOps Handbook · 离线网络手册', meta: '项目封面 · Android' },
    { src: 'assets/images/netops-tour-poster.jpg', caption: 'NetOps Handbook · 功能导览', meta: '介绍视频封面', span: 'tall' },
    { src: 'assets/images/cover-gameboost.webp', caption: 'GameBoost · 打游戏前点一下', meta: '项目封面 · 桌面应用' },
    { src: 'assets/images/cover-dlssg.webp', caption: 'GameBoost-DLSSG · DLSS 帧生成', meta: '项目封面 · 桌面应用' },
    { src: 'assets/images/paian-tour-poster.jpg', caption: '拍案 · 网文创作工作台', meta: '介绍视频封面', span: 'wide' },
    { src: 'assets/images/cover-paian.webp', caption: '拍案 · 封面', meta: '项目封面 · 桌面应用' },
    { src: 'assets/images/cover-fluxion.webp', caption: 'Fluxion · 完整版性能套件', meta: '项目封面 · 桌面应用' },
    { src: 'assets/images/fluxion-tour-poster.jpg', caption: 'Fluxion · 功能导览', meta: '介绍视频封面' },
    { src: 'assets/images/avatar.webp', caption: '作者头像', meta: '自留地' }
  ];

  const GRID = document.getElementById('gallery-grid');
  const COUNT = document.getElementById('gallery-count');
  const BOX = document.getElementById('gal-lightbox');
  if (!GRID || !BOX) return;

  const IMG = document.getElementById('gal-img');
  const CAP = document.getElementById('gal-caption');
  const META = document.getElementById('gal-meta');
  const IDX = document.getElementById('gal-index');
  const data = window.GALLERY_DATA || [];
  let cur = 0;
  let lastFocus = null;

  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 瓷砖 ----
  data.forEach((item, i) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'gal-tile reveal' + (item.span === 'wide' ? ' gal-wide' : item.span === 'tall' ? ' gal-tall' : '');
    tile.setAttribute('aria-label', `查看大图：${item.caption || item.src}`);
    tile.dataset.i = String(i);

    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.caption || '';
    img.loading = i < 3 ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => { tile.remove(); });   // 图没了就别留破框
    tile.appendChild(img);

    const cap = document.createElement('span');
    cap.className = 'gal-cap';
    const b = document.createElement('b');
    b.textContent = item.caption || '';
    const m = document.createElement('span');
    m.textContent = item.meta || '';
    cap.append(b, m);
    tile.appendChild(cap);

    tile.addEventListener('click', () => open(i));
    GRID.appendChild(tile);
  });

  if (COUNT) COUNT.textContent = String(data.length);
  // 瓷砖是这里才生成的，subpage.js 的自动浮现扫不到它们，主动交过去
  if (window.pageReveal) window.pageReveal([...GRID.children]);

  // ---- 灯箱 ----
  function preload(i) {
    const it = data[(i + data.length) % data.length];
    if (it) new Image().src = it.src;
  }

  function render(i) {
    cur = (i + data.length) % data.length;
    const it = data[cur];
    IMG.src = it.src;
    IMG.alt = it.caption || '';
    CAP.textContent = it.caption || '';
    META.textContent = it.meta || '';
    IDX.textContent = `${cur + 1} / ${data.length}`;
    preload(cur + 1);
    preload(cur - 1);
  }

  function open(i) {
    lastFocus = document.activeElement;
    render(i);
    BOX.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const close = BOX.querySelector('.gal-close');
    if (close) close.focus({ preventScroll: true });
  }

  function close() {
    BOX.classList.add('is-closing');
    const done = () => {
      BOX.classList.remove('is-closing');
      BOX.classList.add('hidden');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    if (reduce()) done();
    else setTimeout(done, 180);
  }

  BOX.addEventListener('click', (e) => {
    if (e.target === BOX) close();                                  // 点遮罩关
    const step = e.target.closest('[data-gal-step]');
    if (step) render(cur + Number(step.dataset.galStep));
  });
  const closeBtn = BOX.querySelector('.gal-close');
  if (closeBtn) closeBtn.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (BOX.classList.contains('hidden')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); render(cur + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); render(cur - 1); }
  });
})();
