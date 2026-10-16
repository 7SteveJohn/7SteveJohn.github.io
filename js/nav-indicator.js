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
