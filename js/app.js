/**
 * 个人网站核心交互脚本 (app.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化主题（暗色/亮色）
  initTheme();

  // 2. 渲染项目列表与过滤逻辑
  initProjects();

  // 3. 渲染博客文章列表与阅读弹窗
  initArticles();

  // 4. 初始化滚动进场动画
  initReveal();

  // 5. 初始化移动端抽屉菜单与滚动交互
  initNavigation();

  // 6. Hero 标题逐字模糊进场
  initHeroTitle();

  // 7. 渲染图标
  if (window.lucide) {
    window.lucide.createIcons();
  }
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

  function toggle() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (window.lucide) window.lucide.createIcons();
  }

  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggle);
  if (mobileThemeToggleBtn) mobileThemeToggleBtn.addEventListener('click', toggle);
}

/* ============================================================
   2. 项目作品集模块 (Projects)
   ============================================================ */
let currentCategory = 'all';
let searchKeyword = '';

function initProjects() {
  const container = document.getElementById('projects-grid');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const searchInput = document.getElementById('project-search-input');
  const emptyState = document.getElementById('projects-empty');

  function render() {
    if (!container) return;
    const projects = window.PROJECTS_DATA || [];
    
    // 过滤逻辑
    const filtered = projects.filter(item => {
      const matchCat = (currentCategory === 'all') || (item.category === currentCategory);
      const matchSearch = !searchKeyword || 
        item.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        item.description.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(searchKeyword.toLowerCase())));
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }
    if (emptyState) emptyState.classList.add('hidden');

    container.innerHTML = filtered.map(item => `
      <div class="project-card group flex flex-col justify-between rounded-2xl overflow-hidden bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl backdrop-blur-sm">
        <div>
          <!-- 封面图容器（无图时渲染渐变+首字母品牌封面） -->
          <div class="relative w-full h-48 overflow-hidden bg-slate-100 dark:bg-slate-700">
            ${item.image ? `
            <img
              src="${escapeHtml(item.image)}"
              alt="${escapeHtml(item.title)}"
              loading="lazy"
              class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            />
            ` : `
            <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-500">
              <span class="text-5xl font-extrabold text-white/90 tracking-tight">${escapeHtml((item.title || '?').charAt(0).toUpperCase())}</span>
            </div>
            `}
            <span class="absolute top-3 left-3 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-900/70 text-white backdrop-blur-md">
              ${escapeHtml(item.categoryName || item.category)}
            </span>
            ${item.featured ? `
              <span class="absolute top-3 right-3 px-2.5 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow flex items-center gap-1">
                <i data-lucide="star" class="w-3 h-3"></i>
                <span>推荐</span>
              </span>
            ` : ''}
          </div>

          <!-- 内容区 -->
          <div class="p-6">
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2 line-clamp-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              ${escapeHtml(item.title)}
            </h3>
            <p class="text-slate-600 dark:text-slate-300 text-sm mb-4 line-clamp-2 leading-relaxed">
              ${escapeHtml(item.description)}
            </p>

            <!-- 标签 -->
            <div class="flex flex-wrap gap-1.5 mb-2">
              ${(item.tags || []).map(tag => `
                <span class="text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                  #${escapeHtml(tag)}
                </span>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- 卡片底部链接按钮 -->
        <div class="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between gap-3 text-sm">
          <button 
            onclick="openProjectModal('${item.id}')"
            class="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
          >
            <span>查看详情</span>
            <i data-lucide="arrow-right" class="arrow-slide w-4 h-4"></i>
          </button>

          <div class="flex items-center gap-2">
            ${item.githubUrl && item.githubUrl !== '#' ? `
              <a href="${item.githubUrl}" target="_blank" rel="noopener noreferrer" 
                 class="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition" 
                 title="查看源码">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              </a>
            ` : ''}
            ${item.downloadUrl ? `
              <a href="${escapeHtml(item.downloadUrl)}" target="_blank" rel="noopener noreferrer"
                 class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium transition text-xs shadow-sm shadow-emerald-500/30"
                 title="点击下载${item.downloadPwd ? '，提取码 ' + escapeHtml(item.downloadPwd) : ''}">
                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                <span>下载${item.downloadPwd ? ' ' + escapeHtml(item.downloadPwd) : ''}</span>
              </a>
            ` : ''}
            ${item.demoUrl && item.demoUrl !== '#' ? `
              <a href="${item.demoUrl}" target="_blank" rel="noopener noreferrer" 
                 class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition text-xs shadow-sm shadow-blue-500/30">
                <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                <span>演示</span>
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');

    // 卡片逐张错峰进场
    container.querySelectorAll('.project-card').forEach((card, idx) => {
      card.style.transitionDelay = `${Math.min(idx, 5) * 60}ms`;
      observeReveal(card);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // 绑定分类切换
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('bg-blue-600', 'text-white', 'shadow');
        b.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
      });
      btn.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
      btn.classList.add('bg-blue-600', 'text-white', 'shadow');

      currentCategory = btn.dataset.category || 'all';
      render();
    });
  });

  // 绑定搜索输入（150ms 防抖，避免每键全量重渲染）
  let searchTimer = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const value = e.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchKeyword = value.trim();
        render();
      }, 150);
    });
  }

  // 卡片追光：光斑位置跟随鼠标（事件委托，重渲染后依然有效）
  if (container) {
    container.addEventListener('pointermove', (e) => {
      const card = e.target.closest('.project-card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
  }

  render();
}

// 打开项目详情弹窗
window.openProjectModal = function(id) {
  const project = (window.PROJECTS_DATA || []).find(p => p.id === id);
  if (!project) return;

  const modal = document.getElementById('project-modal');
  const modalContent = document.getElementById('project-modal-content');
  if (!modal || !modalContent) return;

  const detailsHtml = project.details 
    ? (window.marked ? window.marked.parse(project.details) : `<p>${project.details}</p>`)
    : `<p class="text-slate-500">暂无更多详细说明。</p>`;

  modalContent.innerHTML = `
    <div class="relative w-full h-64 md:h-80 overflow-hidden rounded-t-2xl bg-slate-100 dark:bg-slate-800">
      ${project.image ? `
      <img
        src="${escapeHtml(project.image)}"
        alt="${escapeHtml(project.title)}"
        class="modal-cover w-full h-full object-cover"
      />
      ` : `
      <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-500">
        <span class="text-7xl md:text-8xl font-extrabold text-white/90 tracking-tight">${escapeHtml((project.title || '?').charAt(0).toUpperCase())}</span>
      </div>
      `}
      <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex items-end p-6">
        <div>
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500 text-white mb-2 inline-block">
            ${escapeHtml(project.categoryName || project.category)}
          </span>
          <h2 class="text-2xl md:text-3xl font-bold text-white">${escapeHtml(project.title)}</h2>
        </div>
      </div>
    </div>

    <div class="p-6 md:p-8 space-y-6">
      <p class="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
        ${escapeHtml(project.description)}
      </p>

      <div class="flex flex-wrap gap-2">
        ${(project.tags || []).map(tag => `
          <span class="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
            # ${escapeHtml(tag)}
          </span>
        `).join('')}
      </div>

      <hr class="border-slate-200 dark:border-slate-700 my-4" />

      <!-- Markdown 正文内容 -->
      <div class="markdown-body text-slate-800 dark:text-slate-200">
        ${detailsHtml}
      </div>

      <!-- 操作链接栏 -->
      <div class="pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center justify-end">
        ${project.githubUrl && project.githubUrl !== '#' ? `
          <a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer"
             class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            <span>查看代码仓库</span>
          </a>
        ` : ''}
        ${project.demoUrl && project.demoUrl !== '#' ? `
          <a href="${project.demoUrl}" target="_blank" rel="noopener noreferrer"
             class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-500/20 transition">
            <i data-lucide="external-link" class="w-5 h-5"></i>
            <span>访问在线演示</span>
          </a>
        ` : ''}
        ${project.downloadUrl ? `
          <a href="${escapeHtml(project.downloadUrl)}" target="_blank" rel="noopener noreferrer"
             class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md shadow-emerald-500/20 transition">
            <i data-lucide="download" class="w-5 h-5"></i>
            <span>下载安装包${project.downloadPwd ? '（提取码：' + escapeHtml(project.downloadPwd) + '）' : ''}</span>
          </a>
        ` : ''}
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  // 焦点管理：记录触发元素并移入弹窗，关闭时还原
  lastFocused = document.activeElement;
  const modalCloseBtn = modal.querySelector('button[aria-label="关闭"]');
  if (modalCloseBtn) modalCloseBtn.focus();
  if (window.lucide) window.lucide.createIcons();
};

window.closeProjectModal = function() {
  animateCloseModal(document.getElementById('project-modal'));
};

// 统一弹窗关闭：播退场动画 → 隐藏 → 还原焦点
let lastFocused = null;
function animateCloseModal(modal) {
  if (!modal || modal.classList.contains('hidden')) return;
  modal.classList.add('closing');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('closing');
    document.body.style.overflow = '';
    if (lastFocused) {
      lastFocused.focus();
      lastFocused = null;
    }
  }, 150);
}

/* ============================================================
   3. 博客文章模块 (Blog Articles)
   ============================================================ */
function initArticles() {
  const listContainer = document.getElementById('articles-list');
  if (!listContainer) return;

  const articles = window.ARTICLES_DATA || [];
  if (articles.length === 0) {
    // 没有文章时：隐藏整个博客区块与所有指向它的导航入口
    const blogSection = document.getElementById('blog');
    if (blogSection) blogSection.classList.add('hidden');
    document.querySelectorAll('a[href="#blog"]').forEach(a => a.classList.add('hidden'));
    return;
  }

  listContainer.innerHTML = articles.map(art => `
    <article class="p-6 md:p-8 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-3 flex-1">
        <div class="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span class="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
            ${escapeHtml(art.category || '随笔')}
          </span>
          <span class="inline-flex items-center gap-1"><i data-lucide="calendar" class="w-3.5 h-3.5"></i>${escapeHtml(art.date)}</span>
          <span class="inline-flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5"></i>${escapeHtml(art.readTime || '3 分钟')}</span>
        </div>
        
        <h3 class="text-xl md:text-2xl font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition"
            onclick="openArticleModal('${art.id}')">
          ${escapeHtml(art.title)}
        </h3>

        <p class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed line-clamp-2">
          ${escapeHtml(art.summary)}
        </p>

        <div class="flex flex-wrap gap-2 pt-1">
          ${(art.tags || []).map(t => `
            <span class="text-xs text-slate-500 dark:text-slate-400">#${escapeHtml(t)}</span>
          `).join(' ')}
        </div>
      </div>

      <div class="flex-shrink-0">
        <button 
          onclick="openArticleModal('${art.id}')"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-blue-600 dark:hover:text-white text-sm font-medium transition cursor-pointer">
          <span>阅读全文</span>
          <i data-lucide="book-open" class="w-4 h-4"></i>
        </button>
      </div>
    </article>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

// 打开文章阅读弹窗
window.openArticleModal = function(id) {
  const article = (window.ARTICLES_DATA || []).find(a => a.id === id);
  if (!article) return;

  const modal = document.getElementById('article-modal');
  const modalContent = document.getElementById('article-modal-content');
  if (!modal || !modalContent) return;

  const parsedMarkdown = window.marked ? window.marked.parse(article.content) : `<p>${article.content}</p>`;

  modalContent.innerHTML = `
    <div class="p-6 md:p-10 space-y-6">
      <div class="space-y-3 border-b border-slate-200 dark:border-slate-700 pb-6">
        <div class="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span class="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
            ${escapeHtml(article.category || '文章')}
          </span>
          <span class="inline-flex items-center gap-1"><i data-lucide="calendar" class="w-3.5 h-3.5"></i>${escapeHtml(article.date)}</span>
          <span class="inline-flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5"></i>${escapeHtml(article.readTime || '')}</span>
        </div>
        <h1 class="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          ${escapeHtml(article.title)}
        </h1>
        <p class="text-slate-500 dark:text-slate-400 text-sm">
          ${escapeHtml(article.summary)}
        </p>
      </div>

      <!-- Markdown 文章渲染 -->
      <div class="markdown-body text-slate-800 dark:text-slate-200">
        ${parsedMarkdown}
      </div>
    </div>
  `;

  // 代码高亮
  if (window.hljs) {
    modalContent.querySelectorAll('pre code').forEach(el => {
      window.hljs.highlightElement(el);
    });
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  lastFocused = document.activeElement;
  const articleCloseBtn = modal.querySelector('button[aria-label="关闭"]');
  if (articleCloseBtn) articleCloseBtn.focus();
  if (window.lucide) window.lucide.createIcons();
};

window.closeArticleModal = function() {
  animateCloseModal(document.getElementById('article-modal'));
};

/* ============================================================
   4. 滚动进场动画 (Scroll Reveal)
   ============================================================ */
let revealObserver = null;

function getRevealObserver() {
  if (revealObserver) return revealObserver;
  revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  return revealObserver;
}

function observeReveal(el) {
  if (!el) return;
  // 不支持 IntersectionObserver 或用户偏好减少动效时：不做进场动画，内容直接可见
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.classList.add('reveal');
  getRevealObserver().observe(el);
}

function initReveal() {
  document.querySelectorAll('main > section').forEach(sec => observeReveal(sec));
}

/* ============================================================
   6. Hero 标题逐字模糊进场（react-bits BlurText 的原生 JS 复刻）
   ============================================================ */
function initHeroTitle() {
  const h1 = document.querySelector('#home h1');
  if (!h1) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let delay = 0;
  const units = [];
  [...h1.childNodes].forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      // 中文按字拆分
      node.textContent.split('').forEach(ch => {
        if (ch === ' ') { units.push(document.createTextNode(' ')); return; }
        const span = document.createElement('span');
        span.className = 'blur-in';
        span.textContent = ch;
        span.style.animationDelay = `${delay}ms`;
        delay += 45;
        units.push(span);
      });
    } else {
      // 元素节点（渐变色名字等）作为整体进场
      node.classList.add('blur-in');
      node.style.animationDelay = `${delay}ms`;
      delay += 45;
      units.push(node);
    }
  });
  h1.textContent = '';
  units.forEach(u => h1.appendChild(u));
}

/* ============================================================
   7. 响应式导航与平滑交互
   ============================================================ */
function initNavigation() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      const willOpen = mobileMenu.classList.contains('hidden');
      mobileMenu.classList.toggle('hidden');
      menuBtn.setAttribute('aria-expanded', String(willOpen));
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // 点击弹窗背景遮罩关闭（走统一关闭：退场动画 + 焦点还原）
  const modalClosers = {
    'project-modal': () => window.closeProjectModal(),
    'article-modal': () => window.closeArticleModal()
  };
  Object.entries(modalClosers).forEach(([modalId, closeFn]) => {
    const el = document.getElementById(modalId);
    if (el) {
      el.addEventListener('click', (e) => {
        if (e.target === el) closeFn();
      });
    }
  });

  // ESC 键关闭所有弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeProjectModal();
      window.closeArticleModal();
    }
  });
}

/* ============================================================
   辅助工具函数
   ============================================================ */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
