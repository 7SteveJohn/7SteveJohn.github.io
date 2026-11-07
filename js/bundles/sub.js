// build-bundles: {"name":"sub","version":"ad3001e2ace9","sources":[{"path":"js/subpage.js","sha256":"eafc9be28f4bb02073e82de13ef1b36d09b33d943ff52d3fda3de8174724de2b"}]}
/* 次级页共用：外壳（SW 注册 / 滚动态 / 浮现）
   ❗生成物：由 node scripts/build-bundles.mjs 从下列源文件拼接，请改源文件后重建。
   源文件顺序：js/subpage.js */

// ---- js/subpage.js (eafc9be28f4b) ----
/**
 * 次级页面（archive.html / gallery.html）共用的小脚本
 * ----------------------------------------------------
 * 只做五件首页 app.js 顺手做了、次级页也得有的事：
 *   1. Service Worker 注册（同样只认 HTTPS / localhost，file:// 静默跳过）
 *   2. 吸顶导航滚动状态（header.site-header 的 is-scrolled / is-scrolling）
 *   3. 页脚年份
 *   4. 通用滚动浮现（.reveal → .is-visible，与首页同一套 CSS）
 *   5. 主题切换与持久化（#theme-toggle，支持 View Transitions 圆形扩散）
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
    }, { threshold: 0.05, rootMargin: '0px 0px 40px 0px' });
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

  // 5. 主题切换（与首页保持完全一致：持久化、View Transitions 平滑圆形扩散）
  function initTheme() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      const applyNow = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        try {
          localStorage.setItem('sj.theme', isDark ? 'dark' : 'light');
        } catch (_) {}
      };

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (document.startViewTransition && !reduce) {
        const rect = (e && e.currentTarget ? e.currentTarget : btn).getBoundingClientRect();
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
    });
  }

  // 6. 全局搜索快捷键（次级页按下 Ctrl+K / ⌘K 自动无缝直达首页搜索面板）
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')) {
      e.preventDefault();
      location.href = 'index.html?search=1';
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();

