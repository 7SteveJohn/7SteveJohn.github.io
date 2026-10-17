// build-bundles: {"name":"sub","version":"3b977406f0c5","sources":[{"path":"js/subpage.js","sha256":"d6fbfc63cc630d93d667d0a601ab54f64e42487817816f686e34022e17b4f260"}]}
/* 次级页共用：外壳（SW 注册 / 滚动态 / 浮现）
   ❗生成物：由 node scripts/build-bundles.mjs 从下列源文件拼接，请改源文件后重建。
   源文件顺序：js/subpage.js */

// ---- js/subpage.js (d6fbfc63cc63) ----
/**
 * 次级页面（archive.html / gallery.html）共用的小脚本
 * ----------------------------------------------------
 * 只做四件首页 app.js 顺手做了、次级页也得有的事：
 *   1. Service Worker 注册（同样只认 HTTPS / localhost，file:// 静默跳过）
 *   2. 吸顶导航滚动状态（header.site-header 的 is-scrolled / is-scrolling）
 *   3. 页脚年份
 *   4. 通用滚动浮现（.reveal → .is-visible，与首页同一套 CSS）
 * 不引 lucide（次级页图标一律内联 SVG），不引 three，保持次级页轻量。
 */
(function () {
  'use strict';

  // 1. SW
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // 2. 吸顶导航状态
  const header = document.querySelector('header.site-header');
  if (header) {
    let raf = 0, stopTimer = 0;
    const apply = () => {
      raf = 0;
      const y = window.scrollY || 0;
      header.classList.toggle('is-scrolled', y > 12);
      document.body.classList.add('is-scrolling');
      clearTimeout(stopTimer);
      stopTimer = setTimeout(() => document.body.classList.remove('is-scrolling'), 700);
    };
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
    apply();
  }

  // 3. 页脚年份
  const year = document.getElementById('footer-year');
  if (year) year.textContent = String(new Date().getFullYear());

  // 4. 通用浮现（.reveal → .is-visible，与首页同一套 CSS）
  //    JS 动态生成的元素（照片墙瓷砖）由页面脚本创建后自己调 window.pageReveal()
  let io = null;
  function ensureIO() {
    if (io || !('IntersectionObserver' in window)) return io;
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-visible');
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    return io;
  }

  window.pageReveal = function (list) {
    const items = [...(list || document.querySelectorAll('.reveal:not(.is-visible)'))];
    if (!items.length) return;
    const obs = ensureIO();
    if (!obs) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    items.forEach((el, i) => {
      if (el.parentElement && el.parentElement.hasAttribute('data-reveal-stagger')) {
        el.style.setProperty('--reveal-delay', Math.min(i * 90, 360) + 'ms');
      }
      obs.observe(el);
    });
  };

  window.pageReveal();
})();

