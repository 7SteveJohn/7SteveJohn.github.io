/**
 * 个人网站核心交互脚本 (app.js)
 * 极简、干脆、快速，无多余性能开销
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化主题（暗色/亮色）
  initTheme();

  // 2. 将 projects.js 中的下载/仓库链接水合到产品卡片（单一数据源）
  hydrateProductLinks();

  // 3. 渲染三个文字模块：技术手记 / 创作（小说·游戏创作）/ 随笔（无内容自动隐藏）
  initArticles();
  initCreation();
  initEssays();

  // 4. 初始化移动端抽屉菜单与滚动状态导航
  initNavigation();
  initNavScrollState();
  initSmoothAnchors();

 // 5. 滚动浮现编排（ section reveal，含错峰）
  observeReveals();

  // 6. 页脚版权年份自动更新
  initFooterYear();

  // 7. 阅读进度条监听（弹窗内滚动）
  initArticleProgress();

  // 8. 本地趣味件：时段问候 / 状态仪表盘 / 键盘彩蛋
  initHeroGreeting();
  initHeroStatus();
  initKonami();

  // 7. 支持 ?post=文章id 深链（分享单篇内容链接）
  const postId = new URLSearchParams(location.search).get('post');
  if (postId) {
    window.openArticleModal(postId, true);
  }

  // 8. 渲染图标
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 9. Service Worker 离线缓存（仅 HTTPS / localhost 环境生效，file:// 下静默跳过）
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // 10. 访客计数（busuanzi）：load 之后等浏览器空闲再注入，外部服务再慢也不拖慢"页面打开"的手感
  window.addEventListener('load', () => {
    const inject = () => {
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi_pure_mini.js';
      document.body.appendChild(s);
    };
    if ('requestIdleCallback' in window) requestIdleCallback(inject, { timeout: 3000 });
    else setTimeout(inject, 1200);
  });
});

/* ============================================================
   1. 主题管理 (Dark / Light Mode)
   ============================================================ */
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const mobileThemeToggleBtn = document.getElementById('mobile-theme-toggle');
  
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  function toggle(e) {
    const applyNow = () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    };

    // 明暗切换：从点击位置圆形扩散开新主题（View Transitions，减少动效时直接切换）
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduce) {
      const rect = (e && e.currentTarget ? e.currentTarget : themeToggleBtn).getBoundingClientRect();
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
    if (window.lucide) window.lucide.createIcons();
  }

  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggle);
  if (mobileThemeToggleBtn) mobileThemeToggleBtn.addEventListener('click', toggle);
}

/* ============================================================
   2. 项目作品集模块 (Projects)
   ============================================================ */
/* 将 projects.js 数据水合到首页产品卡片（下载/仓库/Releases 链接与提取码单一数据源） */
function hydrateProductLinks() {
  document.querySelectorAll('article[data-project-id]').forEach(card => {
    const project = (window.PROJECTS_DATA || []).find(p => p.id === card.dataset.projectId);
    if (!project) return;

    const linkMap = {
      download: project.downloadUrl,
      releases: project.demoUrl,
      github: project.githubUrl
    };
    Object.entries(linkMap).forEach(([role, url]) => {
      const anchor = card.querySelector(`[data-link="${role}"]`);
      if (anchor && url) anchor.href = url;
    });

    const pwd = card.querySelector('[data-pwd]');
    if (pwd) pwd.textContent = project.downloadPwd ? ` (提取码: ${project.downloadPwd})` : '';
  });
}

// 打开项目详情弹窗
window.openProjectModal = function(id) {
  const project = (window.PROJECTS_DATA || []).find(p => p.id === id);
  if (!project) return;

  const modal = document.getElementById('project-modal');
  const modalContent = document.getElementById('project-modal-content');
  if (!modal || !modalContent) return;
  if (modal._closeTimer) { clearTimeout(modal._closeTimer); modal._closeTimer = null; }
  modal.classList.remove('is-closing');
  modal._lastFocus = document.activeElement;

  const detailsHtml = project.details 
    ? (window.marked ? window.marked.parse(project.details) : `<p>${project.details}</p>`)
    : `<p class="text-[#86868b]">暂无更多详细说明。</p>`;

  modalContent.innerHTML = `
    <div class="p-6 sm:p-8 space-y-6">
      <!-- 头部 -->
      <div class="space-y-2 border-b border-black/10 dark:border-white/10 pb-5">
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-1 text-xs font-mono font-medium rounded-md border border-black/8 dark:border-white/12 text-[#86868b]">
            ${escapeHtml(project.categoryName || project.category)}
          </span>
        </div>
        <h2 class="text-2xl font-semibold text-[#1d1d1f] dark:text-white tracking-tight">${escapeHtml(project.title)}</h2>
        <p class="text-[#86868b] text-sm sm:text-base leading-relaxed">${escapeHtml(project.description)}</p>
      </div>

      <!-- 标签 -->
      <div class="flex flex-wrap gap-1.5">
        ${(project.tags || []).map(tag => `
          <span class="text-xs px-2.5 py-1 rounded-md bg-black/5 dark:bg-white/10 text-[#86868b] dark:text-slate-300 font-mono">
            ${escapeHtml(tag)}
          </span>
        `).join('')}
      </div>

      ${(project.version || project.updated || project.requires || project.sha256) ? `
      <!-- 版本 / 运行环境 / 校验（数据缺失时整块不渲染） -->
      <div class="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] p-4 space-y-2 text-xs">
        ${project.version ? `<div class="flex gap-2"><span class="text-[#86868b] shrink-0">当前版本</span><span class="font-mono text-[#1d1d1f] dark:text-[#f5f5f7]">${escapeHtml(project.version)}${project.updated ? ' · ' + escapeHtml(project.updated) : ''}</span></div>` : ''}
        ${project.requires ? `<div class="flex gap-2"><span class="text-[#86868b] shrink-0">运行环境</span><span class="text-[#1d1d1f] dark:text-[#f5f5f7]">${escapeHtml(project.requires)}</span></div>` : ''}
        ${project.sha256 ? `<div class="flex gap-2"><span class="text-[#86868b] shrink-0">SHA256</span><span class="font-mono text-[#1d1d1f] dark:text-[#f5f5f7] break-all">${escapeHtml(project.sha256)}</span></div>` : ''}
      </div>
      ` : ''}
      <!-- Markdown 正文内容 -->
      <div class="markdown-body text-[#1d1d1f] dark:text-[#f5f5f7]">
        ${detailsHtml}
      </div>

      <!-- 操作链接栏 -->
      <div class="pt-6 border-t border-black/10 dark:border-white/10 flex flex-wrap gap-3 items-center justify-end">
        ${project.downloadUrl ? `
          <a href="${project.downloadUrl}" target="_blank" rel="noopener noreferrer"
             class="btn-primary px-5 py-2 text-xs flex items-center gap-1.5">
            <i data-lucide="download" class="w-3.5 h-3.5"></i>
            <span>网盘下载${project.downloadPwd ? ' (提取码: ' + project.downloadPwd + ')' : ''}</span>
          </a>
        ` : ''}
        ${project.githubUrl && project.githubUrl !== '#' ? `
          <a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer"
             class="btn-secondary px-4 py-2 text-xs bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[#1d1d1f] dark:text-white flex items-center gap-1.5 border border-black/10 dark:border-white/10">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            <span>GitHub 源码</span>
          </a>
        ` : ''}
        ${project.demoUrl && project.demoUrl !== '#' ? `
          <a href="${project.demoUrl}" target="_blank" rel="noopener noreferrer"
             class="btn-secondary px-4 py-2 text-xs bg-slate-100 dark:bg-white/10 text-[#1d1d1f] dark:text-white flex items-center gap-1.5 border border-black/10 dark:border-white/10">
            <span>在线发布 / Releases</span>
            <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
          </a>
        ` : ''}
      </div>
    </div>
  `;

  modalContent.classList.remove('modal-content-in');
  void modalContent.offsetWidth;
  modalContent.classList.add('modal-content-in');

  addCopyButtons(modalContent);

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (window.lucide) window.lucide.createIcons();
  modal.querySelector('button[aria-label="关闭"]')?.focus({ preventScroll: true });
};

window.closeProjectModal = function() {
  animateModalClose(document.getElementById('project-modal'));
};

/* ============================================================
   3. 文字内容模块：技术手记 / 创作 / 随笔
      （共用 ARTICLES_DATA，按 section 字段路由，空模块自动隐藏）
   ============================================================ */

// 全部内容统一按日期倒序——新增条目无论插在数组哪个位置，最新的永远排最前
function getSortedArticles() {
  return [...(window.ARTICLES_DATA || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

// 阅读时长兜底估算：中文按 400 字/分钟，英文按 200 词/分钟
function estimateReadTime(text) {
  const plain = String(text || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#>*`\-\[\]()!]/g, '');
  const cjk = (plain.match(/[\u4e00-\u9fff]/g) || []).length;
  const latin = (plain.match(/[A-Za-z0-9]+/g) || []).length;
  return `${Math.max(1, Math.round(cjk / 400 + latin / 200))} 分钟`;
}

function getReadTime(article) {
  return article.readTime || estimateReadTime(article.content);
}

// 相关阅读：标签重合度加权，同模块优先，最多 3 篇
function getRelatedArticles(article) {
  const tagSet = new Set(article.tags || []);
  return getSortedArticles()
    .filter((a) => a.id !== article.id)
    .map((a) => ({
      a,
      score:
        (a.section === article.section ? 2 : 0) +
        (a.tags || []).reduce((n, t) => n + (tagSet.has(t) ? 1 : 0), 0) * 3
    }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
    .map((x) => x.a);
}

// 长文自动目录：≥3 个 h2/h3 时生成可折叠 TOC（点击在弹窗内平滑跳转）
function buildArticleToc(modalContent) {
  const body = modalContent.querySelector('.markdown-body');
  if (!body) return;
  const headings = body.querySelectorAll('h2, h3');
  if (headings.length < 3) return;

  headings.forEach((h, i) => { h.id = `article-heading-${i}`; });
  const box = document.createElement('details');
  box.className = 'toc-box';
  box.innerHTML = `
    <summary>目录</summary>
    <nav class="mt-2 space-y-0.5">
      ${[...headings].map((h, i) => `
        <a href="#article-heading-${i}" data-toc-id="article-heading-${i}"
           class="toc-link ${h.tagName === 'H3' ? 'pl-5' : ''}">${escapeHtml(h.textContent)}</a>
      `).join('')}
    </nav>
  `;
  box.addEventListener('click', (e) => {
    const link = e.target.closest('[data-toc-id]');
    if (!link) return;
    e.preventDefault();
    const heading = modalContent.querySelector(`#${CSS.escape(link.dataset.tocId)}`);
    if (!heading) return;
    const top = heading.getBoundingClientRect().top - modalContent.getBoundingClientRect().top + modalContent.scrollTop - 16;
    modalContent.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  // 条目不多时默认展开，超长目录（如长篇小说章节）保持折叠
  if (headings.length <= 8) box.open = true;
  body.parentNode.insertBefore(box, body);
}

// 文章结构化数据（Google 会执行 JS，可吃到每篇的富摘要）
function injectArticleJsonLd(article) {
  let el = document.getElementById('json-ld-article');
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'json-ld-article';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    datePublished: article.date,
    dateModified: article.date,
    articleSection: article.category || '技术手记',
    keywords: (article.tags || []).join(', '),
    inLanguage: 'zh-CN',
    author: { '@type': 'Person', name: 'SevenJohn', url: 'https://7stevejohn.github.io/' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://7stevejohn.github.io/?post=${encodeURIComponent(article.id)}` }
  });
}

/* ============================================================
   时光回溯：文章版本切换（数据结构见 README）
   activeVersion = 0 表示最新稿，>0 指向 revisions[n-1]
   ============================================================ */
let activeArticle = null;
let activeVersion = 0;

function versionedContent(article) {
  if (activeVersion > 0 && article.revisions && article.revisions[activeVersion - 1]) {
    return article.revisions[activeVersion - 1].content;
  }
  return article.content;
}

/* ============================================================
   本地文本批注：选中正文 → 写批注 → 高亮持久化（仅存本机 LocalStorage）
   ============================================================ */
const annStoreKey = (id) => `sj.ann.${id}`;

function getAnnotations(id) {
  try { return JSON.parse(localStorage.getItem(annStoreKey(id))) || []; } catch (_) { return []; }
}

function saveAnnotations(id, list) {
  localStorage.setItem(annStoreKey(id), JSON.stringify(list));
}

function markAnnotationQuote(modalContent, quote, noteId) {
  const body = modalContent.querySelector('.markdown-body');
  if (!body) return false;
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const idx = node.textContent.indexOf(quote);
    if (idx === -1) continue;
    try {
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + quote.length);
      const mark = document.createElement('mark');
      mark.className = 'sj-note';
      mark.dataset.noteId = noteId;
      mark.title = '点击查看批注';
      range.surroundContents(mark);
      return true;
    } catch (_) { return false; // 跨节点选区无法高亮，批注仍保留在存储中
    }
  }
  return false;
}

function initAnnotations(modalContent, articleId) {
  let popover = null;
  const closePopover = () => { if (popover) { popover.remove(); popover = null; } };

  const placePopover = (rect) => {
    const base = modalContent.getBoundingClientRect();
    popover.style.left = `${Math.max(8, rect.left - base.left)}px`;
    popover.style.top = `${rect.bottom - base.top + modalContent.scrollTop + 8}px`;
  };

  function openAnnotatePopover(range) {
    closePopover();
    const articleId = activeArticle ? activeArticle.id : null;
    if (!articleId) return;
    const quote = range.toString().replace(/\s+/g, ' ').trim();
    if (quote.length < 2 || quote.length > 300) return;
    popover = document.createElement('div');
    popover.className = 'sj-popover';
    popover.innerHTML = `
      <textarea rows="3" placeholder="写下你的批注（仅保存在本机）"></textarea>
      <div class="sj-popover-actions">
        <button type="button" data-act="cancel">取消</button>
        <button type="button" data-act="save">保存批注</button>
      </div>`;
    modalContent.appendChild(popover);
    placePopover(range.getBoundingClientRect());
    const textarea = popover.querySelector('textarea');
    textarea.focus();
    popover.querySelector('[data-act="cancel"]').onclick = closePopover;
    popover.querySelector('[data-act="save"]').onclick = () => {
      const note = textarea.value.trim();
      if (!note) { closePopover(); return; }
      const ann = { id: 'a' + Date.now(), quote, note, ts: Date.now() };
      const list = getAnnotations(articleId);
      list.push(ann);
      saveAnnotations(articleId, list);
      markAnnotationQuote(modalContent, quote, ann.id);
      closePopover();
      showToast('已添加批注（仅本机可见）');
    };
  }

  function openViewPopover(ann, markEl) {
    closePopover();
    popover = document.createElement('div');
    popover.className = 'sj-popover';
    popover.innerHTML = `
      <div class="sj-note-view">“${escapeHtml(ann.note)}”</div>
      <div class="sj-popover-actions">
        <button type="button" data-act="del">删除批注</button>
        <button type="button" data-act="cancel">关闭</button>
      </div>`;
    modalContent.appendChild(popover);
    placePopover(markEl.getBoundingClientRect());
    popover.querySelector('[data-act="cancel"]').onclick = closePopover;
    popover.querySelector('[data-act="del"]').onclick = () => {
      const articleId = activeArticle ? activeArticle.id : null;
      saveAnnotations(articleId, getAnnotations(articleId).filter((a) => a.id !== ann.id));
      const mark = modalContent.querySelector(`.sj-note[data-note-id="${ann.id}"]`);
      if (mark) mark.replaceWith(...mark.childNodes);
      closePopover();
      showToast('批注已删除');
    };
  }

  // 监听器只挂一次（modalContent 是常驻节点，重复挂会导致浮层叠加）
  if (!modalContent.dataset.annInit) {
    modalContent.dataset.annInit = '1';

    // 选中正文弹出批注框
    modalContent.addEventListener('mouseup', () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !modalContent.contains(sel.anchorNode)) return;
      if (sel.toString().trim().length >= 2) openAnnotatePopover(sel.getRangeAt(0).cloneRange());
    });

    // 点击高亮查看/删除批注
    modalContent.addEventListener('click', (e) => {
      const mark = e.target.closest('.sj-note');
      if (!mark) return;
      const articleId = activeArticle ? activeArticle.id : null;
      const ann = getAnnotations(articleId).find((a) => a.id === mark.dataset.noteId);
      if (ann) openViewPopover(ann, mark);
    });

    modalContent.addEventListener('scroll', closePopover, { passive: true });
  }

  // 渲染本次打开内容的已存批注高亮
  getAnnotations(articleId).forEach((a) => markAnnotationQuote(modalContent, a.quote, a.id));
}

/* ============================================================
   全局趣味件：toast / 时段问候 / 状态仪表盘 / Konami 彩蛋 / 赞赏
   ============================================================ */
let toastTimer = null;
function showToast(msg) {
  let el = document.getElementById('sj-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sj-toast';
    el.className = 'sj-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-show'), 2600);
}

// 时段感知问候（读取访客本地时间）
function initHeroGreeting() {
  const el = document.getElementById('hero-greeting');
  if (!el) return;
  const h = new Date().getHours();
  const g = h < 5 ? '夜还长，随你折腾' : h < 9 ? '早安' : h < 12 ? '上午好' : h < 14 ? '中午好' : h < 18 ? '下午好' : h < 23 ? '晚上好' : '夜深了，注意休息';
  el.textContent = g;
}

// 静态 JSON 驱动的状态仪表盘（数据见 js/status.js，留空不展示）
function initHeroStatus() {
  const el = document.getElementById('hero-status');
  const s = window.SITE_STATUS || {};
  const parts = [s.reading && `在读 ${s.reading}`, s.building && `在做 ${s.building}`, s.mood].filter(Boolean);
  if (!el || !parts.length) return;
  el.textContent = parts.join(' · ') + (s.updated ? `（更新于 ${s.updated}）` : '');
  el.classList.remove('hidden');
}

// 键盘序列彩蛋：↑↑↓↓←→←→BA 触发粒子彩色庆典
function initKonami() {
  const seq = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let buf = [];
  document.addEventListener('keydown', (e) => {
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    buf.push(e.key.toLowerCase());
    buf = buf.slice(-seq.length);
    if (buf.join(',') === seq.join(',')) {
      buf = [];
      if (window.particlesParty) window.particlesParty(20);
      showToast('🎉 彩蛋触发：粒子庆典 20 秒');
    }
  });
}

// 页脚版权年份
function initFooterYear() {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = String(new Date().getFullYear());
}

// 单条内容卡片（技术手记 / 创作 / 随笔共用同一卡片样式）；可键盘聚焦，Enter/Space 触发打开
// opts.hideCategory：分组头已表达分类时（创作模块），卡片内不再重复渲染分类 pill
function articleCardHtml(art, opts = {}) {
  const metaLead = opts.hideCategory
    ? `<span>${escapeHtml(art.date)}</span><span>· ${escapeHtml(getReadTime(art))}</span>`
    : `<span class="px-2 py-0.5 rounded-md border border-black/8 dark:border-white/12 font-medium">
         ${escapeHtml(art.category || '技术手记')}
       </span>
       <span>${escapeHtml(art.date)}</span>
       <span>· ${escapeHtml(getReadTime(art))}</span>`;
  return `
    <article tabindex="0" role="button" aria-label="阅读：${escapeHtml(art.title)}" class="bento-card reveal p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group" onclick="openArticleModal('${escapeHtml(art.id)}')">
      <div class="space-y-2 flex-1">
        <div class="flex items-center gap-2 text-xs font-mono text-[#86868b] flex-wrap">
          ${metaLead}
        </div>
        <h3 class="text-base font-semibold text-[#1d1d1f] dark:text-white leading-snug">
          ${escapeHtml(art.title)}
        </h3>
        <p class="text-[#86868b] text-sm line-clamp-2 leading-relaxed">
          ${escapeHtml(art.summary)}
        </p>
      </div>
      <div class="text-xs text-[#86868b] inline-flex items-center gap-1 self-start md:self-auto group-hover:translate-x-0.5 transition-transform whitespace-nowrap">
        <span>阅读</span>
        <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
      </div>
    </article>
  `;
}

// 通用单列表块渲染（技术手记 / 随笔）：过滤 → 渲染 → 空则连导航一起隐藏
function renderArticleSection({ match, sectionId, navHref, listId }) {
  const sectionEl = document.getElementById(sectionId);
  if (!sectionEl) return;

  const navLinks = document.querySelectorAll(`a[href="${navHref}"]`);
  const listContainer = document.getElementById(listId);
  const items = getSortedArticles().filter(match);

  if (items.length === 0) {
    sectionEl.style.display = 'none';
    navLinks.forEach(link => link.style.display = 'none');
    return;
  }

  sectionEl.style.display = '';
  navLinks.forEach(link => link.style.display = '');
  if (listContainer) {
    listContainer.innerHTML = items.map(articleCardHtml).join('');
    if (window.lucide) window.lucide.createIcons();
    observeReveals();
  }
}

// 创作模块：按 category 分「小说 / 游戏创作」两个子列表，空子列表单独隐藏
function initCreation() {
  const sectionEl = document.getElementById('creation');
  if (!sectionEl) return;

  const navLinks = document.querySelectorAll('a[href="#creation"]');
  const items = getSortedArticles().filter(a => a.section === 'creation');

  if (items.length === 0) {
    sectionEl.style.display = 'none';
    navLinks.forEach(link => link.style.display = 'none');
    return;
  }

  sectionEl.style.display = '';
  navLinks.forEach(link => link.style.display = '');

  const groups = [
    { wrapId: 'creation-novel', match: (a) => a.category !== '游戏创作' },
    { wrapId: 'creation-game', match: (a) => a.category === '游戏创作' }
  ];
  groups.forEach(g => {
    const wrap = document.getElementById(g.wrapId);
    if (!wrap) return;
    const list = wrap.querySelector('[data-creation-list]');
    const groupItems = items.filter(g.match);
    if (groupItems.length === 0) {
      wrap.style.display = 'none';
      return;
    }
    wrap.style.display = '';
    const countEl = wrap.querySelector('[data-group-count]');
    if (countEl) countEl.textContent = groupItems.length === 1 ? '1 篇' : `${groupItems.length} 篇`;
    if (list) {
      list.innerHTML = groupItems.map((a) => articleCardHtml(a, { hideCategory: true })).join('');
      if (window.lucide) window.lucide.createIcons();
      observeReveals();
    }
  });

  // 栏目头右侧总数
  const countEl = document.getElementById('creation-count');
  if (countEl) countEl.textContent = items.length === 1 ? '共 1 篇' : `共 ${items.length} 篇`;
}

function initArticles() {
  renderArticleSection({
    match: (a) => !a.section,
    sectionId: 'blog',
    navHref: '#blog',
    listId: 'articles-list'
  });
}

function initEssays() {
  renderArticleSection({
    match: (a) => a.section === 'essay',
    sectionId: 'essays',
    navHref: '#essays',
    listId: 'essays-list'
  });
}

// 同模块内的兄弟篇目（创作模块再按「小说 / 游戏创作」分组），供弹窗上一篇/下一篇翻页
function getSiblingList(article) {
  const all = getSortedArticles();
  if (article.section === 'creation') {
    return all.filter(a => a.section === 'creation' && (a.category === '游戏创作') === (article.category === '游戏创作'));
  }
  if (article.section === 'essay') {
    return all.filter(a => a.section === 'essay');
  }
  return all.filter(a => !a.section);
}

// 弹窗内容方向性切换
// 首选 View Transitions API：新旧快照真·交叉溶解（旧滑出的同时新滑入，无两段式空档）
// 回退：立即换内容 + 单段淡入
// dir: 'next' 向左翻页 | 'prev' 向右翻页 | 'fade' 上下交替
function swapModalContent(el, mutate, dir = 'fade') {
  if (!el || typeof mutate !== 'function') return;
  // 减少动效 / 弹窗不可见时直接换内容，不做过渡
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !el.offsetParent) {
    mutate();
    return;
  }
  if (el._swapTimer) { clearTimeout(el._swapTimer); el._swapTimer = null; }
  const CLS = ['content-out-next', 'content-out-prev', 'content-out-fade', 'content-in-next', 'content-in-prev', 'content-in-fade', 'modal-content-in'];

  if (document.startViewTransition) {
    const apply = () => {
      CLS.forEach((c) => el.classList.remove(c));
      mutate();
    };
    document.documentElement.classList.add('vt-' + dir);
    const vt = document.startViewTransition(apply);
    vt.finished.finally(() => document.documentElement.classList.remove('vt-' + dir));
    return;
  }

  mutate();
  void el.offsetWidth; // 强制回流，确保入场动画从头播放
  el.classList.add('content-in-' + dir);
  el._swapTimer = setTimeout(() => el.classList.remove('content-in-' + dir), 450);
}

window.openArticleModal = function(id, skipUrlSync) {
  const article = (window.ARTICLES_DATA || []).find(a => a.id === id);
  if (!article) return;

  const modal = document.getElementById('article-modal');
  const modalContent = document.getElementById('article-modal-content');
  if (!modal || !modalContent) return;
  if (modal._closeTimer) { clearTimeout(modal._closeTimer); modal._closeTimer = null; }
  modal.classList.remove('is-closing');
  modal._lastFocus = document.activeElement;
  // 记录切换前的状态：弹窗已打开时切篇走方向性交叉过渡
  const wasOpen = !modal.classList.contains('hidden') && !modal.classList.contains('is-closing');
  const prevActiveArticle = activeArticle;
  activeArticle = article;
  activeVersion = 0;

  const parsedMarkdown = window.marked ? window.marked.parse(versionedContent(article)) : `<p>${versionedContent(article)}</p>`;

  // 同模块翻页：首篇无上一篇、末篇无下一篇，仅一篇时不显示翻页栏
  const siblings = getSiblingList(article);
  const idx = siblings.findIndex(a => a.id === article.id);
  const prevArticle = idx > 0 ? siblings[idx - 1] : null;
  const nextArticle = idx > -1 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const pagerBtn = (target, label, icon) => `
    <button data-pager="${icon === 'left' ? 'prev' : 'next'}" onclick="openArticleModal('${escapeHtml(target.id)}')" class="btn-secondary px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-[#1d1d1f] dark:text-white flex items-center gap-1.5 cursor-pointer">
      ${icon === 'left' ? '<i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>' : ''}
      <span>${label}</span>
      ${icon === 'right' ? '<i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>' : ''}
    </button>
  `;
  const pagerHtml = (prevArticle || nextArticle) ? `
      <div class="pt-5 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-3">
        ${prevArticle ? pagerBtn(prevArticle, '上一篇', 'left') : '<span></span>'}
        ${nextArticle ? pagerBtn(nextArticle, '下一篇', 'right') : '<span></span>'}
      </div>
  ` : '';

  // 相关阅读：按标签重合度推荐，没有相关内容时整块省略
  const related = getRelatedArticles(article);
  const relatedHtml = related.length ? `
      <div class="pt-4 flex flex-wrap items-center gap-2">
        <span class="text-xs font-semibold text-[#86868b] mr-1">相关阅读</span>
        ${related.map((r) => `
          <button onclick="openArticleModal('${r.id}')" class="px-3 py-1.5 rounded-full text-xs bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/20 transition cursor-pointer max-w-full truncate">
            ${escapeHtml(r.title)}
          </button>
        `).join('')}
      </div>
  ` : '';

  // 时光回溯：文章版本切换（数据结构见 README revisions 字段）
  const revisions = article.revisions || [];
  const versionChips = revisions.length ? `
        <div class="flex flex-wrap items-center gap-1.5 pt-3" data-version-bar>
          <span class="text-xs text-[#86868b] mr-1">版本回溯</span>
          <button data-version="0" class="pref-btn is-active">最新</button>
          ${revisions.map((r, i) => `<button data-version="${i + 1}" class="pref-btn">${escapeHtml(r.label || r.date || 'v' + (i + 1))}</button>`).join('')}
        </div>` : '';

  // 情绪反馈（本地版：仅保存在访客本机，不做跨访客统计）
  const EMOTIONS = [['resonance', '💫', '共鸣'], ['insight', '💡', '启发'], ['doubt', '❓', '疑惑'], ['sigh', '🌧', '唏嘘']];
  const myEmotion = localStorage.getItem('sj.emo.' + article.id);
  const emotionsHtml = `
      <div class="pt-5 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center gap-2">
        <span class="text-xs font-semibold text-[#86868b] mr-1">这一篇给你的感觉<span class="opacity-70">（仅存本机）</span></span>
        ${EMOTIONS.map(([key, icon, label]) => `
          <button data-emotion="${key}" class="emotion-btn px-2.5 py-1 rounded-full text-xs border transition cursor-pointer ${myEmotion === key ? 'is-active' : ''}">${icon} ${label}</button>
        `).join('')}
      </div>`;

  // 把「换内容 + 重建事件」包成函数：首开直接执行；已开时等旧内容滑出后再执行
  const renderNow = () => {
  modalContent.innerHTML = `
    <div class="p-6 sm:p-8 space-y-5">
      <div class="space-y-2 border-b border-black/10 dark:border-white/10 pb-5">
        <div class="flex items-center gap-2 text-xs font-mono text-[#86868b]">
          <span class="px-2 py-0.5 rounded-md border border-black/8 dark:border-white/12 font-medium">
            ${escapeHtml(article.category || '技术手记')}
          </span>
          <span>${escapeHtml(article.date)}</span>
          <span>· ${escapeHtml(getReadTime(article))}</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">${escapeHtml(article.title)}</h1>
        ${versionChips}
      </div>
      <div class="markdown-body text-[#1d1d1f] dark:text-[#f5f5f7]">
        ${parsedMarkdown}
      </div>
      ${pagerHtml}${relatedHtml}${emotionsHtml}
    </div>
  `;

  if (window.hljs) {
    modalContent.querySelectorAll('pre code').forEach(el => {
      window.hljs.highlightElement(el);
    });
  }
  addCopyButtons(modalContent);
  buildArticleToc(modalContent);
  injectArticleJsonLd(article);
  initAnnotations(modalContent, article.id);

  // 情绪标记：单选可取消，仅写本机 LocalStorage
  modalContent.querySelectorAll('[data-emotion]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = 'sj.emo.' + article.id;
      const current = localStorage.getItem(key);
      const next = current === btn.dataset.emotion ? null : btn.dataset.emotion;
      if (next) localStorage.setItem(key, next); else localStorage.removeItem(key);
      modalContent.querySelectorAll('[data-emotion]').forEach((b) => b.classList.toggle('is-active', b.dataset.emotion === next));
      showToast(next ? `已标记「${{ resonance: '共鸣', insight: '启发', doubt: '疑惑', sigh: '唏嘘' }[next]}」（仅本机）` : '已取消标记');
    });
  });

  // 版本切换：仅重渲染正文区，批注/目录/复制按钮重建
  if (revisions.length) {
    modalContent.querySelectorAll('[data-version]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeVersion = Number(btn.dataset.version);
        modalContent.querySelectorAll('[data-version]').forEach((b) => b.classList.toggle('is-active', Number(b.dataset.version) === activeVersion));
        // 正文区上下交替过渡：旧内容先淡出，再换内容淡入
        swapModalContent(modalContent, () => {
          const body = modalContent.querySelector('.markdown-body');
          if (body) body.innerHTML = window.marked.parse(versionedContent(activeArticle));
          if (window.hljs) modalContent.querySelectorAll('pre code').forEach((el) => window.hljs.highlightElement(el));
          addCopyButtons(modalContent);
          buildArticleToc(modalContent);
          initAnnotations(modalContent, article.id);
          modalContent.scrollTop = 0;
          const bar = document.getElementById('article-progress');
          if (bar) bar.style.width = '0%';
          delete modalContent.dataset.thanked;
        }, 'fade');
      });
    });
  }

  // 切换篇目后回到正文顶部、复位进度条与致谢状态
  modalContent.scrollTop = 0;
  delete modalContent.dataset.thanked;
  const progress = document.getElementById('article-progress');
  if (progress) progress.style.width = '0%';
  if (window.lucide) window.lucide.createIcons();
  };

  // 已打开时切篇/翻章：按同模块列表顺序决定左右方向；首开仅内容淡入（面板自带入场）
  if (wasOpen && prevActiveArticle && prevActiveArticle.id !== article.id) {
    const sib = getSiblingList(prevActiveArticle);
    const a = sib.findIndex((x) => x.id === prevActiveArticle.id);
    const b = sib.findIndex((x) => x.id === article.id);
    const dir = a > -1 && b > -1 && a !== b ? (b > a ? 'next' : 'prev') : 'fade';
    swapModalContent(modalContent, renderNow, dir);
  } else {
    renderNow();
    modalContent.classList.remove('modal-content-in');
    void modalContent.offsetWidth;
    modalContent.classList.add('modal-content-in');
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (!skipUrlSync) {
    const url = new URL(location.href);
    url.searchParams.set('post', id);
    history.pushState(null, '', url);
    modal._urlPushed = true; // 该历史条目由打开动作压入，关闭时应回退而不是再压一条
  }
  modal.querySelector('button[aria-label="关闭"]')?.focus({ preventScroll: true });
};

window.closeArticleModal = function(skipUrlSync) {
  const modal = document.getElementById('article-modal');
  const wasOpen = modal && !modal.classList.contains('hidden') && !modal.classList.contains('is-closing');
  if (modal) animateModalClose(modal);
  if (wasOpen && !skipUrlSync) {
    if (modal && modal._urlPushed) {
      modal._urlPushed = false;
      history.back(); // 回退掉打开时压入的条目，返回键不会重新弹开文章
    } else {
      // 直接带 ?post= 打开的场景没有可回退的条目，就地替换即可
      const url = new URL(location.href);
      url.searchParams.delete('post');
      history.replaceState(null, '', url);
    }
  }
};

// 浏览器前进/后退时同步文章弹窗状态（深链可分享、返回键可关闭）
window.addEventListener('popstate', () => {
  const id = new URLSearchParams(location.search).get('post');
  const modal = document.getElementById('article-modal');
  const isOpen = modal && !modal.classList.contains('hidden');

  if (id && (window.ARTICLES_DATA || []).some(a => a.id === id)) {
    if (!isOpen) {
      window.openArticleModal(id, true);
      if (modal) modal._urlPushed = true; // 前进回到该条目，条目本身仍在历史里
    }
  } else if (isOpen) {
    window.closeArticleModal(true);
  }
});

/* ============================================================
   4. 响应式导航与弹窗基础交互
   ============================================================ */
function initNavigation() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (menuBtn && mobileMenu) {
    // 子项错峰浮起用
    [...mobileMenu.children].forEach((c, i) => c.style.setProperty('--i', i));
    const closeMenu = () => {
      if (mobileMenu.classList.contains('hidden') || mobileMenu.classList.contains('is-closing')) return;
      mobileMenu.classList.add('is-closing');
      mobileMenu._closeTimer = setTimeout(() => {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('is-closing');
        mobileMenu._closeTimer = null;
      }, 200);
    };
    menuBtn.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('hidden');
      if (mobileMenu._closeTimer) { clearTimeout(mobileMenu._closeTimer); mobileMenu._closeTimer = null; }
      if (isOpen) {
        mobileMenu.classList.remove('hidden', 'is-closing');
      } else {
        closeMenu();
      }
      menuBtn.setAttribute('aria-expanded', String(isOpen));
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        closeMenu();
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // 点击遮罩关闭弹窗
  const projectModal = document.getElementById('project-modal');
  if (projectModal) {
    projectModal.addEventListener('click', (e) => {
      if (e.target === projectModal) window.closeProjectModal();
    });
  }
  const articleModal = document.getElementById('article-modal');
  if (articleModal) {
    articleModal.addEventListener('click', (e) => {
      if (e.target === articleModal) window.closeArticleModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeProjectModal();
      window.closeArticleModal();
      return;
    }

    // 卡片可键盘操作：Enter / Space 触发打开（无弹窗时也要生效）
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('article[role="button"]')) {
      e.preventDefault();
      e.target.click();
      return;
    }

    const articleModal = document.getElementById('article-modal');
    const projectModal = document.getElementById('project-modal');
    const openModal = [articleModal, projectModal].find(
      (m) => m && !m.classList.contains('hidden') && !m.classList.contains('is-closing')
    );
    if (!openModal) return;

    // 文章弹窗内 ← → 方向键翻章
    if (openModal === articleModal && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const btn = articleModal.querySelector(`[data-pager="${e.key === 'ArrowRight' ? 'next' : 'prev'}"]`);
      if (btn) {
        e.preventDefault();
        btn.click();
      }
      return;
    }

    // Tab 焦点锁定在当前打开的弹窗内
    if (e.key === 'Tab') trapModalFocus(openModal, e);
  });
}

/* ============================================================
 滚动浮现编排与导航滚动状态（ 行为）
   仅动 transform / opacity；无 IntersectionObserver 或减少动效时直出内容
   ============================================================ */
const revealObserver = ('IntersectionObserver' in window)
  ? new IntersectionObserver((entries, io) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // 同一 [data-reveal-stagger] 容器内的兄弟卡片按序错峰（motion-craft stagger 规则）
        const group = el.closest('[data-reveal-stagger]');
        if (group && !el.style.getPropertyValue('--reveal-delay')) {
          const siblings = [...group.querySelectorAll('.reveal')];
          const i = siblings.indexOf(el);
          if (i > 0) el.style.setProperty('--reveal-delay', `${Math.min(i * 90, 360)}ms`);
        }
        el.classList.add('is-visible');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
  : null;

// 幂等：动态列表重渲染后再次调用即可观察新节点
function observeReveals() {
  document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => {
    if (revealObserver) {
      revealObserver.observe(el);
    } else {
      el.classList.add('is-visible');
    }
  });
}

// 导航：顶部无边框，下滑后浮现边框与模糊；同时驱动回到顶部按钮的显隐
function initNavScrollState() {
  const header = document.querySelector('header.site-header');
  const backTop = document.getElementById('back-to-top');
  const update = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 12);
    if (backTop) {
      const show = y > 600;
      backTop.classList.toggle('opacity-0', !show);
      backTop.classList.toggle('pointer-events-none', !show);
    }
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
  if (backTop) {
    backTop.addEventListener('click', () => {
      smoothScrollTo(0);
      history.pushState(null, '', location.pathname);
    });
  }
}

// 锚点滚动：替换浏览器原生 smooth，改用 easeOutQuint 缓动（快起长滑），滚轮/触摸可随时打断
let smoothScrollTo = function (targetY) {
  window.scrollTo(0, targetY);
};
// 暴露给 search.js 等模块复用
window.smoothScrollTo = function (y) { smoothScrollTo(y); };

function initSmoothAnchors() {
  let rafId = null;

  function stop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    document.documentElement.style.scrollBehavior = '';
  }

  smoothScrollTo = function (targetY) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo(0, targetY);
      return;
    }
    stop();
    const startY = window.scrollY;
    const delta = targetY - startY;
    if (Math.abs(delta) < 2) return;
    const duration = Math.min(900, Math.max(450, Math.abs(delta) * 0.35));
    const t0 = performance.now();
    document.documentElement.style.scrollBehavior = 'auto';
    const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
    const step = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      window.scrollTo(0, startY + delta * easeOutQuint(p));
      if (p < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        stop();
      }
    };
    rafId = requestAnimationFrame(step);
    window.addEventListener('wheel', stop, { once: true, passive: true });
    window.addEventListener('touchstart', stop, { once: true, passive: true });
  };

  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const y = href === '#home' ? 0 : target.getBoundingClientRect().top + window.scrollY - 64;

    // 页面切换：整页优雅换页（旧页下沉淡出、新页上浮浮现，区块内容随后级联浮现）
    // 减少动效或不支持 VT 的浏览器回退为缓动滚动
    const jump = () => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, Math.max(0, y));
      document.documentElement.style.scrollBehavior = '';
    };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduce) {
      document.documentElement.classList.add('vt-nav');
      const vt = document.startViewTransition(jump);
      vt.finished.finally(() => document.documentElement.classList.remove('vt-nav'));
    } else {
      smoothScrollTo(Math.max(0, y));
    }
    history.pushState(null, '', href);
  });
}

// 文章弹窗阅读进度条：随弹窗内滚动更新宽度（内容不满一屏时保持 0）
function initArticleProgress() {
  const content = document.getElementById('article-modal-content');
  const bar = document.getElementById('article-progress');
  if (!content || !bar) return;
  content.addEventListener('scroll', () => {
    const max = content.scrollHeight - content.clientHeight;
    const ratio = max > 40 ? Math.min(content.scrollTop / max, 1) : 0;
    bar.style.width = `${ratio * 100}%`;
    // 读完致谢：滚动到底一次性提示
    if (max > 40 && ratio >= 0.985 && !content.dataset.thanked) {
      content.dataset.thanked = '1';
      showToast('读完了，谢谢你 ❤');
    }
  }, { passive: true });
}

// 为弹窗内的代码块追加一键复制按钮（剪贴板 API 不可用时静默跳过）
function addCopyButtons(modalContent) {
  if (!navigator.clipboard) return;
  modalContent.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.code-copy-btn')) return;
    pre.style.position = 'relative';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy-btn';
    btn.textContent = '复制';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector('code')?.innerText || pre.innerText);
        btn.textContent = '已复制 ✓';
        setTimeout(() => { btn.textContent = '复制'; }, 1200);
      } catch (_) { /* 用户拒绝剪贴板权限时保持原样 */ }
    });
    pre.appendChild(btn);
  });
}

// 弹窗焦点管理：Tab 在弹窗内循环，不落到背景页面
function trapModalFocus(modal, e) {
  const focusables = [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((el) => el.offsetParent !== null);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

// 弹窗关闭动画（加速退出），重开时取消未完成的关闭定时器
function animateModalClose(modal) {
  if (!modal || modal.classList.contains('hidden') || modal.classList.contains('is-closing')) return;
  document.body.style.overflow = '';
  if (modal._lastFocus && modal._lastFocus.focus) modal._lastFocus.focus({ preventScroll: true });
  modal.classList.add('is-closing');
  modal._closeTimer = setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('is-closing');
    modal._closeTimer = null;
  }, 240);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
