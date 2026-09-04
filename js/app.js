/**
 * 个人网站核心交互脚本 (app.js)
 * 极简、干脆、快速，无多余性能开销
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化主题（暗色/亮色）
  initTheme();

  // 2. 渲染项目列表与过滤逻辑
  initProjects();

  // 3. 渲染博客文章列表（若有文章则展示，无则静默隐藏）
  initArticles();

  // 4. 初始化移动端抽屉菜单
  initNavigation();

  // 5. 渲染图标
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
      <div class="project-card group flex flex-col justify-between rounded-xl overflow-hidden bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 shadow-sm transition">
        <div>
          <!-- 封面图容器 -->
          ${item.image ? `
          <div class="relative w-full h-44 overflow-hidden bg-slate-100 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80">
            <img 
              src="${escapeHtml(item.image)}" 
              alt="${escapeHtml(item.title)}" 
              loading="lazy"
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              onerror="this.parentElement.style.display='none'"
            />
            <span class="absolute top-3 left-3 px-2 py-0.5 text-xs font-medium rounded-md bg-slate-900/80 text-slate-200 backdrop-blur-sm">
              ${escapeHtml(item.categoryName || item.category)}
            </span>
          </div>
          ` : ''}

          <!-- 内容区 -->
          <div class="p-5 sm:p-6">
            <div class="flex items-start justify-between gap-2 mb-2">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                ${escapeHtml(item.title)}
              </h3>
            </div>
            
            <p class="text-slate-600 dark:text-slate-400 text-sm mb-4 leading-relaxed line-clamp-3">
              ${escapeHtml(item.description)}
            </p>

            <!-- 标签 -->
            <div class="flex flex-wrap gap-1.5 mb-2">
              ${(item.tags || []).map(tag => `
                <span class="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                  ${escapeHtml(tag)}
                </span>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- 卡片底部链接按钮 -->
        <div class="px-4 sm:px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-2 text-sm">
          <button 
            onclick="openProjectModal('${item.id}')"
            class="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer transition text-xs whitespace-nowrap flex-shrink-0"
          >
            <span>详情说明</span>
            <i data-lucide="chevron-right" class="w-3.5 h-3.5 arrow-slide"></i>
          </button>

          <div class="flex items-center gap-1.5 flex-wrap justify-end">
            ${item.downloadUrl ? `
              <a href="${item.downloadUrl}" target="_blank" rel="noopener noreferrer" 
                 class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/60 dark:border-emerald-800/40 text-xs font-medium transition whitespace-nowrap"
                 title="网盘下载 ${item.downloadPwd ? '提取码: ' + item.downloadPwd : ''}">
                <i data-lucide="download" class="w-3 h-3"></i>
                <span>网盘${item.downloadPwd ? `<span class="font-mono text-[11px] opacity-80">(${item.downloadPwd})</span>` : ''}</span>
              </a>
            ` : ''}

            ${item.demoUrl && item.demoUrl !== '#' ? `
              <a href="${item.demoUrl}" target="_blank" rel="noopener noreferrer" 
                 class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-medium transition text-xs shadow-sm whitespace-nowrap">
                <span>Release</span>
                <i data-lucide="arrow-up-right" class="w-3 h-3"></i>
              </a>
            ` : ''}

            ${item.githubUrl && item.githubUrl !== '#' ? `
              <a href="${item.githubUrl}" target="_blank" rel="noopener noreferrer" 
                 class="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition" 
                 title="GitHub 源码">
                <i data-lucide="github" class="w-3.5 h-3.5"></i>
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
        b.classList.remove('bg-slate-900', 'text-white', 'dark:bg-white', 'dark:text-slate-900');
        b.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-400');
      });
      btn.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-400');
      btn.classList.add('bg-slate-900', 'text-white', 'dark:bg-white', 'dark:text-slate-900');

      currentCategory = btn.dataset.category || 'all';
      render();
    });
  });

  // 绑定搜索输入（防抖）
  let searchTimer = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchKeyword = e.target.value.trim();
        render();
      }, 150);
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
    <div class="p-6 sm:p-8 space-y-6">
      <!-- 头部 -->
      <div class="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 text-xs font-mono font-medium rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            ${escapeHtml(project.categoryName || project.category)}
          </span>
        </div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">${escapeHtml(project.title)}</h2>
        <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">${escapeHtml(project.description)}</p>
      </div>

      <!-- 标签 -->
      <div class="flex flex-wrap gap-1.5">
        ${(project.tags || []).map(tag => `
          <span class="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            ${escapeHtml(tag)}
          </span>
        `).join('')}
      </div>

      <!-- Markdown 正文内容 -->
      <div class="markdown-body text-slate-800 dark:text-slate-200">
        ${detailsHtml}
      </div>

      <!-- 操作链接栏 -->
      <div class="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-end">
        ${project.downloadUrl ? `
          <a href="${project.downloadUrl}" target="_blank" rel="noopener noreferrer"
             class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition">
            <i data-lucide="download" class="w-4 h-4"></i>
            <span>网盘下载${project.downloadPwd ? ' (提取码: ' + project.downloadPwd + ')' : ''}</span>
          </a>
        ` : ''}
        ${project.githubUrl && project.githubUrl !== '#' ? `
          <a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer"
             class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs transition">
            <i data-lucide="github" class="w-4 h-4"></i>
            <span>GitHub 源码</span>
          </a>
        ` : ''}
        ${project.demoUrl && project.demoUrl !== '#' ? `
          <a href="${project.demoUrl}" target="_blank" rel="noopener noreferrer"
             class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-medium text-xs transition">
            <span>在线发布 / Releases</span>
            <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
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
   3. 博客文章模块 (若无文章则自动隐藏)
   ============================================================ */
function initArticles() {
  const blogSection = document.getElementById('blog');
  const blogNavLinks = document.querySelectorAll('a[href="#blog"]');
  const listContainer = document.getElementById('articles-list');

  const articles = window.ARTICLES_DATA || [];
  if (articles.length === 0) {
    if (blogSection) blogSection.style.display = 'none';
    blogNavLinks.forEach(link => link.style.display = 'none');
    return;
  }

  if (blogSection) blogSection.style.display = '';
  blogNavLinks.forEach(link => link.style.display = '');

  if (listContainer) {
    listContainer.innerHTML = articles.map(art => `
      <article class="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="space-y-2 flex-1">
          <div class="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              ${escapeHtml(art.category || '文章')}
            </span>
            <span>${escapeHtml(art.date)}</span>
          </div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition"
              onclick="openArticleModal('${art.id}')">
            ${escapeHtml(art.title)}
          </h3>
          <p class="text-slate-600 dark:text-slate-400 text-sm line-clamp-2">
            ${escapeHtml(art.summary)}
          </p>
        </div>
        <button 
          onclick="openArticleModal('${art.id}')"
          class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer self-start md:self-auto">
          <span>阅读</span>
          <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </button>
      </article>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }
}

window.openArticleModal = function(id) {
  const article = (window.ARTICLES_DATA || []).find(a => a.id === id);
  if (!article) return;

  const modal = document.getElementById('article-modal');
  const modalContent = document.getElementById('article-modal-content');
  if (!modal || !modalContent) return;

  const parsedMarkdown = window.marked ? window.marked.parse(article.content) : `<p>${article.content}</p>`;

  modalContent.innerHTML = `
    <div class="p-6 sm:p-8 space-y-5">
      <div class="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-5">
        <span class="text-xs font-mono text-slate-500">${escapeHtml(article.date)} · ${escapeHtml(article.category || '随笔')}</span>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">${escapeHtml(article.title)}</h1>
      </div>
      <div class="markdown-body text-slate-800 dark:text-slate-200">
        ${parsedMarkdown}
      </div>
    </div>
  `;

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
   4. 响应式导航与弹窗基础交互
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
