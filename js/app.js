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

  // 4. 初始化移动端抽屉菜单与滚动交互
  initNavigation();

  // 6. 渲染图标
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
      <div class="project-card flex flex-col justify-between rounded-2xl overflow-hidden bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl backdrop-blur-sm">
        <div>
          <!-- 封面图容器 -->
          <div class="relative w-full h-48 overflow-hidden bg-slate-100 dark:bg-slate-700">
            <img 
              src="${item.image || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80'}" 
              alt="${escapeHtml(item.title)}" 
              loading="lazy"
              class="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              onerror="this.src='https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80'"
            />
            <span class="absolute top-3 left-3 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-900/70 text-white backdrop-blur-md">
              ${escapeHtml(item.categoryName || item.category)}
            </span>
            ${item.featured ? `
              <span class="absolute top-3 right-3 px-2.5 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow">
                ⭐ 推荐
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
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
          </button>

          <div class="flex items-center gap-2">
            ${item.githubUrl && item.githubUrl !== '#' ? `
              <a href="${item.githubUrl}" target="_blank" rel="noopener noreferrer" 
                 class="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition" 
                 title="查看源码">
                <i data-lucide="github" class="w-4 h-4"></i>
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

  // 绑定搜索输入
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchKeyword = e.target.value.trim();
      render();
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
      <img 
        src="${project.image || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80'}" 
        alt="${escapeHtml(project.title)}" 
        class="w-full h-full object-cover"
      />
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
            <i data-lucide="github" class="w-5 h-5"></i>
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
  if (window.lucide) window.lucide.createIcons();
};

window.closeProjectModal = function() {
  const modal = document.getElementById('project-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
};

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
          <span>📅 ${escapeHtml(art.date)}</span>
          <span>⏱️ ${escapeHtml(art.readTime || '3 分钟')}</span>
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
          <span>📅 ${escapeHtml(article.date)}</span>
          <span>⏱️ ${escapeHtml(article.readTime || '')}</span>
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
  if (window.lucide) window.lucide.createIcons();
};

window.closeArticleModal = function() {
  const modal = document.getElementById('article-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
};

/* ============================================================
   4. 响应式导航与平滑交互
   ============================================================ */
function initNavigation() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  // 点击弹窗背景遮罩关闭
  const modals = ['project-modal', 'article-modal'];
  modals.forEach(modalId => {
    const el = document.getElementById(modalId);
    if (el) {
      el.addEventListener('click', (e) => {
        if (e.target === el) {
          el.classList.add('hidden');
          document.body.style.overflow = '';
        }
      });
    }
  });

  // ESC 键关闭所有弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modals.forEach(id => {
        const m = document.getElementById(id);
        if (m) m.classList.add('hidden');
      });
      document.body.style.overflow = '';
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
