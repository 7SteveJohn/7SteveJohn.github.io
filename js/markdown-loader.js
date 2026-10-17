/**
 * Markdown 渲染器按需加载（marked 39KB + purify 22KB）
 * ----------------------------------------------------
 * 为什么按需：只有打开文章弹窗、项目详情或连载章节时才需要渲染 Markdown；
 * 首屏带着它们等于白等两次往返（2026-10-17 加载优化：首页少 2 个请求 / 61KB）。
 *
 * 用法：
 *   window.ensureMarkdown().then((ok) => { ... });
 *     ok === true  → window.marked / window.DOMPurify 都就绪
 *     ok === false → 加载失败：调用方回落到纯文本，绝不白屏；下次调用会重试
 *
 * 约定：
 *   · 多次调用共享同一个 Promise，不会重复插 <script>
 *   · 本文件进 core bundle（6 个页面都可用），首页与连载页是主要使用者
 *   · 静态站内路径固定：assets/vendor/marked.min.js、assets/vendor/purify.min.js
 */
(function () {
  'use strict';

  let pending = null;
  const ready = () => !!(window.marked && window.DOMPurify);

  function load(src) {
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  window.ensureMarkdown = function ensureMarkdown() {
    if (ready()) return Promise.resolve(true);
    if (pending) return pending;
    pending = Promise.all([
      window.marked ? Promise.resolve(true) : load('assets/vendor/marked.min.js'),
      window.DOMPurify ? Promise.resolve(true) : load('assets/vendor/purify.min.js')
    ]).then((r) => {
      const ok = !!(r[0] && r[1] && ready());
      if (!ok) pending = null;    // 允许重试（断网恢复后再次打开文章）
      return ok;
    });
    return pending;
  };
})();
