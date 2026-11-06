/**
 * 站点配置唯一来源（浏览器与 Node 共用，零依赖）
 * ----------------------------------------------------
 * 浏览器：直接读 window.SITE_CONFIG
 * Node  ：require('js/site-config.js') 后读 globalThis.SITE_CONFIG
 *         （scripts/gen-rss.js、scripts/sync-chrome.mjs、本地写作台都从这里取）
 *
 * 为什么要收口（2026-10-17 起的第 1 轮改造）：
 *   站名、社交链接、壁纸清单、页面清单原本散在三个页面的手写 HTML 与脚本里，
 *   加一个栏目要改三处、漏一处就出现「有的页面没有这个入口」。
 *   现在：这里定义一次 —— sync-chrome.mjs 负责校验/注入，gen-rss.js 负责 sitemap。
 *
 * ❗改动约定：
 *   - entries 里加一条 = 全站导航与页脚都会要求有它（含首页「更多」、次级页导航、页脚）
 *   - 新加页面：pages 里登记（sitemap:true 才会进 sitemap.xml），并在 entries 或 nav 里给入口
 *   - 新页面导航/页脚走标记块 <!-- chrome:nav:start --> ... <!-- chrome:nav:end -->，
 *     由 `node scripts/sync-chrome.mjs --write` 生成；既有三页是手写块，只做校验不覆盖
 */
(function (root) {
  'use strict';

  root.SITE_CONFIG = {
    // ---- 基本信息 ----
    name: '楠屿札记',
    tagline: '一隅存工码，亦叙尘世星文',
    description: '楠屿札记：本地 AI 应用与桌面工具，Python / C# / Android。包括本地文件管家、离线网络手册、游戏性能工具，AI 全部在本机运行。',
    url: 'https://7stevejohn.github.io',
    ogImage: 'og-image.png',

    // ---- 作者与联系 ----
    author: 'SevenJohn',
    jobTitle: '业余开发者',
    email: 'sevenksq@163.com',
    github: 'https://github.com/7SteveJohn',

    // ---- RSS ----
    rssTitle: '楠屿札记 · 手记与创作',
    rssDescription: '技术手记、小说、游戏创作与随笔，想到什么写什么。',

    // ---- 背景壁纸（进站随机选一张；全部失败时退回 themeColors 渐变）----
    // 后两张由 scripts/make-wallpapers.mjs 程序化生成（可 --force 重做，也可直接换图）
    wallpapers: [
      'assets/images/wallpaper.webp',
      'assets/images/wallpaper-2.webp',
      'assets/images/wallpaper-3.webp'
    ],
    themeColors: ['#030712', '#0b1226', '#1b2140', '#2a2350'],

    // ---- 功能开关 ----
    // 看板娘（Live2D）：模型还没做完，整体先下线（2026-10-31）。
    // false 时三处同时收口：index.html 不加载 js/live2d.js、设置面板不显示「看板娘」开关、
    // css/settings-panel.css 的 fx-no-live2d 无对象可作用。
    // 恢复：这里改回 true，再把 index.html 末尾那行 script 的注释解开。
    live2d: false,

    // ---- 文章封面：没写 cover 的文章用「品牌渐变 + 栏目首字」自动封面 ----
    defaultCover: '',

    // ---- 导航：首页主导航（仅首页有）----
    nav: [
      { href: '#home', label: '概览' },
      { href: '#products', label: '工具' },
      { href: '#ai', label: 'AI 学习' },
      { href: '#blog', label: '技术手记' },
      { href: '#philosophy', label: '理念' },
      { href: '#about', label: '关于' }
    ],

    // ---- 首页「更多」下拉：内容栏目 + 站内入口 ----
    more: [
      { href: '#creation', label: '创作' },
      { href: '#essays', label: '随笔' }
    ],

    // ---- 站内正经入口：必须出现在「首页更多 + 次级页导航 + 所有页页脚」----
    entries: [
      // 2026-10-17 下线「产品」：产品索引/详情与首页 #products + 项目弹窗重复，
      // 六款工具的介绍只在 js/projects.js 维护一份，入口收回首页「工具」区。
      { href: 'archive.html', label: '归档' },
      { href: 'gallery.html', label: '照片墙' },
      // 2026-10-17 收回：花园 / 友链 / 连载 属于"社交与娱乐"，不服务本站「技术 + 产品分享」的定位，
      // 已从所有入口下线（文件与样式仍留在仓库，需要时可一键恢复；也仍可直达 URL 访问）。
      // 恢复方法：把这三条加回 entries + pages，再跑 node scripts/sync-chrome.mjs --write。
    ],

    // ---- 外链：必须出现在所有页页脚 ----
    externals: [
      { href: 'https://github.com/7SteveJohn', label: '@7SteveJohn' },
      { href: 'mailto:sevenksq@163.com', label: 'sevenksq@163.com' }
    ],

    // ---- 页面清单（sitemap 与一致性校验依据）----
    // chrome:true = 必须带完整导航与页脚（sync-chrome 校验）
    // sitemap:true = 写进 sitemap.xml
    pages: [
      { href: 'index.html', label: '首页', title: '楠屿札记 · 本地 AI 应用与桌面工具', sitemap: true, priority: '1.0', changefreq: 'weekly' },
      { href: 'archive.html', label: '归档', title: '归档 · 时间河', sitemap: true, priority: '0.8', changefreq: 'weekly' },
      { href: 'gallery.html', label: '照片墙', title: '照片墙', sitemap: true, priority: '0.7', changefreq: 'monthly' },
      // 已下线的三页不写进 sitemap（避免搜索引擎继续收录），页面本身仍在仓库里
      { href: 'garden.html', label: '花园', title: '花园', sitemap: false, chrome: false },
      { href: 'links.html', label: '友链', title: '友链与收藏', sitemap: false, chrome: false },
      { href: 'novel.html', label: '连载', title: '连载', sitemap: false, chrome: false },
      { href: '404.html', label: '404', sitemap: false, chrome: false },
      { href: 'cosmos-home.html', label: '星河随乐而舞（演示页）', sitemap: false, chrome: false }
    ]
  };
  // 全局 3D 拟物物理左右悬浮引擎（源自 demo-linear-apple.html 旗舰视效哲学，全站卡片共用）
  root.attach3DTilt = function attach3DTilt(elements, options) {
    if (!elements) return;
    const cards = (typeof elements === 'string'
      ? document.querySelectorAll(elements)
      : (elements.length !== undefined ? Array.from(elements) : [elements])
    ).filter(Boolean);
    if (!cards.length) return;

    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const opts = options || {};
    const maxRotX = opts.maxRotX !== undefined ? opts.maxRotX : 7.0;
    const maxRotY = opts.maxRotY !== undefined ? opts.maxRotY : 12.0;
    const elev = opts.elev !== undefined ? opts.elev : -8;
    const perspective = opts.perspective !== undefined ? opts.perspective : 1000;

    cards.forEach((card) => {
      if (card.__hasTiltEngine) return;
      card.__hasTiltEngine = true;

      function updateTilt(clientX, clientY) {
        const rect = card.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const x = clientX - rect.left - rect.width / 2;
        const y = clientY - rect.top - rect.height / 2;

        const rotX = (y / (rect.height / 2)) * -maxRotX;
        const rotY = (x / (rect.width / 2)) * maxRotY;

        const shadowX = (rotY / maxRotY) * -20;
        const shadowY = 22 + (rotX / maxRotX) * 6;

        // 使用 Linear / Apple 经典 0.22s cubic-bezier 曲线，带出物理惯性与顺滑左右浮动感
        card.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease, border-color 0.22s ease';
        card.style.transform =
          'perspective(' + perspective + 'px) ' +
          'rotateX(' + rotX.toFixed(2) + 'deg) ' +
          'rotateY(' + rotY.toFixed(2) + 'deg) ' +
          'translateY(' + elev + 'px)';

        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
          card.style.borderColor = 'rgba(56, 189, 248, 0.45)';
          card.style.boxShadow =
            shadowX.toFixed(1) + 'px ' + shadowY.toFixed(1) + 'px 45px -8px rgba(0, 0, 0, 0.85), ' +
            '0 0 28px rgba(56, 189, 248, 0.22), ' +
            'inset 0 1px 0 rgba(255, 255, 255, 0.18)';
        } else {
          card.style.borderColor = 'rgba(37, 99, 235, 0.38)';
          card.style.boxShadow =
            shadowX.toFixed(1) + 'px ' + shadowY.toFixed(1) + 'px 38px -8px rgba(37, 99, 235, 0.22), ' +
            '0 4px 18px rgba(15, 23, 42, 0.06), ' +
            'inset 0 1px 0 #ffffff';
        }

        const mx = ((clientX - rect.left) / rect.width) * 100;
        const my = ((clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--mouse-x', mx.toFixed(1) + '%');
        card.style.setProperty('--mouse-y', my.toFixed(1) + '%');
      }

      function onMove(e) {
        if (e.pointerType === 'touch') return;
        updateTilt(e.clientX, e.clientY);
      }

      function onTouchMove(e) {
        if (e.touches && e.touches[0]) {
          updateTilt(e.touches[0].clientX, e.touches[0].clientY);
        }
      }

      function onLeave() {
        card.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease, border-color 0.35s ease';
        card.style.transform = '';
        card.style.boxShadow = '';
        card.style.borderColor = '';
        card.style.removeProperty('--mouse-x');
        card.style.removeProperty('--mouse-y');
      }

      card.addEventListener('pointermove', onMove, { passive: true });
      card.addEventListener('mousemove', onMove, { passive: true });
      card.addEventListener('pointerleave', onLeave);
      card.addEventListener('mouseleave', onLeave);

      // 移动端触控跟随与点按悬浮反馈
      card.addEventListener('touchstart', function(e) {
        if (e.touches && e.touches[0]) {
          updateTilt(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });
      card.addEventListener('touchmove', onTouchMove, { passive: true });
      card.addEventListener('touchend', function() {
        setTimeout(onLeave, 350);
      }, { passive: true });
      card.addEventListener('touchcancel', onLeave, { passive: true });
    });

    // 移动端机身陀螺仪微倾斜支持（晃动机身时产生全景 3D 左右浮空）
    if (typeof window !== 'undefined' && !root.__hasGyroTilt && window.DeviceOrientationEvent) {
      root.__hasGyroTilt = true;
      window.addEventListener('deviceorientation', function(ev) {
        if (ev.gamma === null) return;
        // gamma: 手机左右倾斜角度 [-90, 90]
        const rotY = Math.max(-8, Math.min(8, ev.gamma * 0.25));
        const rotX = Math.max(-5, Math.min(5, ((ev.beta || 45) - 45) * 0.18));
        const activeCard = document.querySelector('#products article.card-selected, #products article:hover');
        if (activeCard && !activeCard.style.getPropertyValue('--mouse-x')) {
          activeCard.style.transition = 'transform 0.25s ease-out';
          activeCard.style.transform = 'perspective(1000px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg) translateY(-8px)';
        }
      }, { passive: true });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
