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

  const ARTICLES_SRC = 'js/articles.js?v=20261127a';
  let pending = null;
  let articlesPending = null;
  const ready = () => !!(window.marked && window.DOMPurify);
  const articlesReady = () => window.__ARTICLES_FULL_LOADED === true
    || (Array.isArray(window.ARTICLES_DATA)
      && window.ARTICLES_DATA.some((a) => typeof a.content === 'string' && a.content.length > 0));

  function load(src, timeoutMs) {
    return new Promise((resolve) => {
      let settled = false;
      const s = document.createElement('script');
      const done = (ok) => {
        if (settled) return;
        settled = true;
        if (!ok && s.parentNode) s.parentNode.removeChild(s);
        resolve(ok);
      };
      const timer = setTimeout(() => done(false), timeoutMs || 4000);
      s.src = src;
      s.onload = () => { clearTimeout(timer); done(true); };
      s.onerror = () => { clearTimeout(timer); done(false); };
      document.head.appendChild(s);
    });
  }

  window.ensureMarkdown = function ensureMarkdown() {
    if (ready()) return Promise.resolve(true);
    if (pending) return pending;
    pending = Promise.all([
      window.marked ? Promise.resolve(true) : load('assets/vendor/marked.min.js', 6000),
      window.DOMPurify ? Promise.resolve(true) : load('assets/vendor/purify.min.js', 6000)
    ]).then((r) => {
      const ok = !!(r[0] && r[1] && ready());
      if (!ok) pending = null;    // 允许重试（断网恢复后再次打开文章）
      return ok;
    });
    return pending;
  };

  window.ensureArticles = function ensureArticles() {
    if (articlesReady()) {
      window.__ARTICLES_FULL_LOADED = true;
      return Promise.resolve(true);
    }
    if (articlesPending) return articlesPending;
    articlesPending = load(ARTICLES_SRC, 10000).then((ok) => {
      const readyNow = !!(ok && articlesReady());
      if (readyNow) {
        window.__ARTICLES_FULL_LOADED = true;
      } else {
        articlesPending = null;   // 失败时清空单例，下次调用可重试
      }
      return readyNow;
    });
    return articlesPending;
  };
})();
