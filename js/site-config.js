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
  // 全局 3D 拟物物理左右悬浮与戳压倾斜引擎（真实物理翘板：戳哪边哪边深陷下沉）
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
    const baseRotX = opts.maxRotX !== undefined ? opts.maxRotX : 9.0;
    const baseRotY = opts.maxRotY !== undefined ? opts.maxRotY : 14.0;
    const perspective = opts.perspective !== undefined ? opts.perspective : 800;

    cards.forEach((card) => {
      if (card.__hasTiltEngine) return;
      card.__hasTiltEngine = true;

      let isPressed = false;
      let lastClientX = 0;
      let lastClientY = 0;

      function updateTilt(clientX, clientY, pressed) {
        const rect = card.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        lastClientX = clientX;
        lastClientY = clientY;

        // 归一化相对中心点坐标 [-1, 1]
        // px < 0 代表左侧，px > 0 代表右侧
        // py < 0 代表上侧，py > 0 代表下侧
        const px = Math.max(-1, Math.min(1, (clientX - rect.left - rect.width / 2) / (rect.width / 2)));
        const py = Math.max(-1, Math.min(1, (clientY - rect.top - rect.height / 2) / (rect.height / 2)));

        // 核心物理规律（戳哪边哪边沉）：
        // 戳左侧(px < 0) -> rotY 为负，左侧深入屏幕下沉
        // 戳右侧(px > 0) -> rotY 为正，右侧深入屏幕下沉
        // 戳上方(py < 0) -> rotX 为正，上端深入屏幕下沉
        // 戳下方(py > 0) -> rotX 为负，下端深入屏幕下沉
        const multiplier = pressed ? 1.6 : 1.0;
        const rotY = px * baseRotY * multiplier;
        const rotX = -py * baseRotX * multiplier;
        const elev = pressed ? -2 : -8;
        const scale = pressed ? 0.985 : 1.015;

        // 响应过渡：按压/移动时 0.12s 极速线性跟手；松开时弹性回正
        card.style.transition = 'transform 0.12s ease-out, box-shadow 0.15s ease-out, border-color 0.2s ease';
        card.style.transform =
          'perspective(' + perspective + 'px) ' +
          'rotateX(' + rotX.toFixed(2) + 'deg) ' +
          'rotateY(' + rotY.toFixed(2) + 'deg) ' +
          'translateY(' + elev + 'px) ' +
          'scale3d(' + scale + ', ' + scale + ', ' + scale + ')';

        const shadowX = (-rotY * 1.8).toFixed(1);
        const shadowY = (22 + rotX * 1.2).toFixed(1);
        const isDark = document.documentElement.classList.contains('dark');

        if (isDark) {
          card.style.borderColor = 'rgba(56, 189, 248, ' + (pressed ? '0.6' : '0.35') + ')';
          card.style.boxShadow =
            shadowX + 'px ' + shadowY + 'px 40px -6px rgba(0, 0, 0, 0.85), ' +
            '0 0 24px rgba(56, 189, 248, ' + (pressed ? '0.35' : '0.15') + '), ' +
            'inset 0 1px 0 rgba(255, 255, 255, 0.18)';
        } else {
          card.style.borderColor = 'rgba(37, 99, 235, ' + (pressed ? '0.55' : '0.3') + ')';
          card.style.boxShadow =
            shadowX + 'px ' + shadowY + 'px 38px -6px rgba(37, 99, 235, ' + (pressed ? '0.28' : '0.16') + '), ' +
            '0 4px 14px rgba(15, 23, 42, 0.05), ' +
            'inset 0 1px 0 #ffffff';
        }

        const mx = ((clientX - rect.left) / rect.width) * 100;
        const my = ((clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--mouse-x', mx.toFixed(1) + '%');
        card.style.setProperty('--mouse-y', my.toFixed(1) + '%');
      }

      function onRelease(forceReset) {
        isPressed = false;
        if (!forceReset && card.matches(':hover') && lastClientX && lastClientY) {
          // 鼠标仍悬停在卡片内：弹回自然悬浮倾斜姿态
          card.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease';
          updateTilt(lastClientX, lastClientY, false);
          return;
        }
        // 完全移出或触控结束，弹性平稳归零
        card.style.transition = 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease, border-color 0.3s ease';
        card.style.transform = 'perspective(' + perspective + 'px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)';
        card.style.boxShadow = '';
        card.style.borderColor = '';
        card.style.removeProperty('--mouse-x');
        card.style.removeProperty('--mouse-y');
      }

      // 1. PC 鼠标移动与物理戳压（按住鼠标左键深度深陷）
      card.addEventListener('mousemove', function(e) {
        updateTilt(e.clientX, e.clientY, isPressed || e.buttons > 0);
      });
      card.addEventListener('mousedown', function(e) {
        if (e.target.closest('a, button, video, input, select, textarea')) return;
        isPressed = true;
        updateTilt(e.clientX, e.clientY, true);
      });
      window.addEventListener('mouseup', function() {
        if (isPressed) onRelease(false);
      });
      card.addEventListener('mouseleave', function() {
        onRelease(true);
      });

      // 2. 移动端/触屏物理戳压（手指按哪边哪边深陷下沉，松手弹回）
      card.addEventListener('touchstart', function(e) {
        if (e.target.closest('a, button, video, input, select, textarea')) return;
        if (e.touches && e.touches[0]) {
          isPressed = true;
          updateTilt(e.touches[0].clientX, e.touches[0].clientY, true);
        }
      }, { passive: true });
      card.addEventListener('touchmove', function(e) {
        if (e.touches && e.touches[0]) {
          updateTilt(e.touches[0].clientX, e.touches[0].clientY, isPressed);
        }
      }, { passive: true });
      card.addEventListener('touchend', function() {
        onRelease(true);
      }, { passive: true });
      card.addEventListener('touchcancel', function() {
        onRelease(true);
      }, { passive: true });
    });

    // 移动端机身陀螺仪微倾斜支持（晃动机身时产生全景 3D 左右浮空）
    if (typeof window !== 'undefined' && !root.__hasGyroTilt && window.DeviceOrientationEvent) {
      root.__hasGyroTilt = true;
      window.addEventListener('deviceorientation', function(ev) {
        if (ev.gamma === null) return;
        const rotY = Math.max(-10, Math.min(10, ev.gamma * 0.3));
        const rotX = Math.max(-7, Math.min(7, ((ev.beta || 45) - 45) * 0.22));
        const activeCard = document.querySelector('#products article.card-selected, #products article:hover');
        if (activeCard && !activeCard.style.getPropertyValue('--mouse-x')) {
          activeCard.style.transition = 'transform 0.25s ease-out';
          activeCard.style.transform = 'perspective(800px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg) translateY(-8px)';
        }
      }, { passive: true });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
