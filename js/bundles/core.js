// build-bundles: {"name":"core","version":"d40d38a9dd7c","sources":[{"path":"js/site-config.js","sha256":"4be90f23a462d9f3b26340d66acd39b234b9e1e703b93dfa35670381e52f8ebf"},{"path":"js/markdown-loader.js","sha256":"9149bca09b58fc21ff58cd7071d9f9470acdb9f4067856265a14260f99cca272"},{"path":"js/wallpaper.js","sha256":"994e9d8228801ad2c5c5ce7c63bfaead43b3286bc35bb14b6d251200e1fe8f80"},{"path":"js/particles.js","sha256":"5e95471046e40560408eeca8895a2541057a6028973ef7ff9dc240c3dd2f5f98"},{"path":"js/settings-panel.js","sha256":"a5c8e3935e3aa25dde44a65526ee4580cd952cee0b54d10f76f85c05643f9c9a"},{"path":"js/tab-nav.js","sha256":"61be36cf6c8375241ee34eda74c16856d4d8bfc84f4ef967e9bb7511bd082956"}]}
/* 6 页共用：配置 → Markdown 按需加载器 → 壁纸 → 粒子 → 设置面板 → 按住 Tab
   ❗生成物：由 node scripts/build-bundles.mjs 从下列源文件拼接，请改源文件后重建。
   源文件顺序：js/site-config.js → js/markdown-loader.js → js/wallpaper.js → js/particles.js → js/settings-panel.js → js/tab-nav.js */

// ---- js/site-config.js (4be90f23a462) ----
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
})(typeof window !== 'undefined' ? window : globalThis);

;

// ---- js/markdown-loader.js (9149bca09b58) ----
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

;

// ---- js/wallpaper.js (994e9d822880) ----
/**
 * 背景壁纸层 + 「效果档位」判定（full / lite）+ 轮换与滑杆变量
 * ----------------------------------------------------
 * 档位写在 <html> 上：
 *   has-wallpaper     壁纸层开启（图真能加载出来才挂；缺失/失败一律保持原观感）
 *   wallpaper-lite    轻档：不做混合、内容卡片不加磨砂，壁纸留但更暗
 *   wallpaper-gradient 所有壁纸都加载失败 → 用配置里的 themeColors 渐变顶上（不留空底）
 *
 * 判定顺序（前者优先）：
 *   1. URL  ?fx=off | ?fx=lite | ?fx=full —— 一次性覆盖，并写进 localStorage 沿用
 *   2. localStorage  sj.wallpaper = 'off' | 'lite' | 'on'
 *   3. 静态检测      软件渲染（SwiftShader / Basic Render / llvmpipe）→ 直接轻档
 *   4. 帧率哨兵      首帧后 2.5s 起连测两段，都低于 42 帧 → 轻档并记住（sj.fx-lite）
 *
 * 为什么分档（2026-10-17 真机实测，软件合成路径下滚动帧率）：
 *   现行 = 混合 + 23 张卡片磨砂 + 壁纸模糊 → 33.8 帧（更差的一次只有 16.3 帧）
 *   去掉卡片磨砂 → 60.3 帧；再去掉混合/壁纸模糊 → 仍是 60.3 帧
 *   即元凶只有内容卡片的 backdrop-filter（大面积模糊每帧重算），混合几乎免费。
 *
 * 轮换与滑杆（2026-10-17 加）：
 *   - 壁纸清单来自 js/site-config.js 的 wallpapers[]，本次会话随机选一张并用
 *     sessionStorage 固定（滚动中换图会让人以为页面在闪）；加载失败自动顺延下一张。
 *   - 模糊与亮度走 CSS 变量 --wp-blur / --wp-dim（在 <html> 上），设置面板可实时改，
 *     取值持久化在 sj.wp-blur / sj.wp-dim；不设时用 css/style.css 里的默认值。
 *
 * 看板娘（js/live2d.js）会 await window.__fxTier.done：轻档就不拉那 1.9MB。
 */
(function () {
  'use strict';

  const CFG = window.SITE_CONFIG || {};
  const KEY = 'sj.wallpaper';
  const REMEMBER = 'sj.fx-lite';
  const PICK = 'sj.wp-pick';
  const BLUR = 'sj.wp-blur';
  const DIM = 'sj.wp-dim';
  const root = document.documentElement;

  const read = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* 隐私模式：不记 */ } };

  // ---- 对外只暴露「结论」：lite = 这台机器吃不动重效果 ----
  let current = null;
  let resolveTier;
  const done = new Promise((r) => { resolveTier = r; });
  window.__fxTier = { get tier() { return current; }, done };
  const publish = (t) => { if (!current) { current = t; resolveTier(t); } };

  const apply = (m) => root.classList.toggle('wallpaper-lite', m === 'lite');

  // ---- 滑杆值先落地（早于图加载，避免进来先闪一下默认模糊度）----
  const blurSaved = read(BLUR);
  const dimSaved = read(DIM);
  if (blurSaved !== null) root.style.setProperty('--wp-blur', blurSaved + 'px');
  if (dimSaved !== null) root.style.setProperty('--wp-dim', dimSaved);

  // ---- 1. URL 覆盖 ----
  let fx = null;
  try { fx = new URLSearchParams(location.search).get('fx'); } catch (e) { fx = null; }
  if (fx === 'off' || fx === 'lite' || fx === 'full') {
    write(KEY, fx === 'full' ? 'on' : fx);
    if (fx === 'full') write(REMEMBER, '0');
    if (fx === 'lite') write(REMEMBER, '1');
  }

  const saved = fx || read(KEY);
  if (saved === 'off') {
    publish('full');            // 壁纸被手动关掉而已，不代表机器弱 → 看板娘照常
    return;
  }

  // ---- 2. 档位初值 ----
  // 明确表达过「要完整效果」的（?fx=full 或本地存过 on）优先于一切自动判定——
  // 否则用户手动开了 full 还是会被软件渲染检测压回轻档（2026-10-17 自测抓到的 bug）
  const forced = fx === 'full' || read(KEY) === 'on';
  let mode = null;              // 'full' | 'lite'；null = 交给哨兵判定
  if (forced) mode = 'full';
  else if (saved === 'lite' || read(REMEMBER) === '1') mode = 'lite';
  else if (isSoftwareRenderer()) mode = 'lite';

  // ---- 3. 壁纸：本次会话固定一张，失败顺延，全失败走渐变 ----
  const list = (Array.isArray(CFG.wallpapers) && CFG.wallpapers.length)
    ? CFG.wallpapers
    : ['assets/images/wallpaper.webp'];

  let start = NaN;
  try {
    const raw = sessionStorage.getItem(PICK);
    // ❗不能写 Number(raw) || 0：缺失时 Number(null) === 0，会被当成「已选第 0 张」，
    // 于是永远轮不到后两张（2026-10-17 自测抓到的 bug）
    start = raw === null ? NaN : Number(raw);
  } catch (e) { start = NaN; }
  if (!(start >= 0 && start < list.length)) {
    start = Math.floor(Math.random() * list.length);
    try { sessionStorage.setItem(PICK, String(start)); } catch (e) { /* 不记也行 */ }
  }

  let tried = 0;
  function tryLoad(i) {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0) return show(list[i]);   // 0 宽高说明解出来是坏图
      next(i);
    };
    img.onerror = () => next(i);
    img.src = list[i];
  }
  function next(i) {
    if (++tried >= list.length) return gradient();
    tryLoad((i + 1) % list.length);
  }

  function show(url) {
    // ❗相对 url() 写进 CSS 变量后会按「声明它的样式表」解析（实测变成 /css/assets/…），
    // 所以这里先转成绝对地址：http(s) 与 file:// 双击打开都能对上
    root.style.setProperty('--wp-image', `url("${new URL(url, document.baseURI).href}")`);
    apply(mode || 'full');
    root.classList.add('has-wallpaper');
    if (mode) publish(mode);
    else sentinel();                                   // 未定档 → 起哨兵
  }

  // 全部壁纸都挂了：用配置里的 themeColors 拼一条深色渐变顶上
  function gradient() {
    const c = (Array.isArray(CFG.themeColors) && CFG.themeColors.length >= 2) ? CFG.themeColors : ['#030712', '#0b1226'];
    root.style.setProperty('--wp-gradient', `linear-gradient(140deg, ${c.join(', ')})`);
    root.classList.add('wallpaper-gradient');
    apply(mode || 'full');
    root.classList.add('has-wallpaper');
    if (mode) publish(mode);
    else publish('full');                              // 图都没有就别再测帧率了
  }

  tryLoad(start);

  // 软件渲染判定：拿 WebGL 的 unmasked renderer 字符串
  function isSoftwareRenderer() {
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      if (!gl) return true;                            // 连 WebGL 都没有，按弱机处理
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      return /swiftshader|llvmpipe|software|basic render|microsoft basic|mesa offscreen/i.test(name);
    } catch (e) {
      return false;
    }
  }

  // 帧率哨兵：只关心桌面（重效果只在桌面生效），两段都低才降档，避免误杀
  function sentinel() {
    const heavy = () => window.matchMedia('(min-width: 1024px)').matches
      && window.matchMedia('(pointer: fine)').matches;
    if (!heavy()) return publish('full');

    const sample = (ms) => new Promise((res) => {
      let n = 0;
      const t0 = performance.now();
      const step = () => {
        n++;
        const el = performance.now() - t0;
        if (el < ms) requestAnimationFrame(step);
        else res(n / (el / 1000));
      };
      requestAnimationFrame(step);
    });

    const run = async () => {
      await new Promise((r) => setTimeout(r, 2500));     // 让首屏初始化（着色器编译 / SW 安装）先过去
      if (document.visibilityState !== 'visible') { window.addEventListener('visibilitychange', run, { once: true }); return; }
      const a = await sample(1200);
      const b = await sample(1200);
      if (a < 42 && b < 42) {
        write(REMEMBER, '1');                            // 记住这台机器，下次直接轻档
        apply('lite');
        publish('lite');
        return;
      }
      publish('full');
    };
    run();
  }
})();

;

// ---- js/particles.js (5e95471046e4) ----
/**
 * 背景光粒子 (particles.js)
 * ----------------------------------------------------
 * 设计原则：背景服务主题，不抢主体（背景丰富但不杂乱）。
 * - 约 100 颗小光点，远近两层视差，缓慢漂移 + 微弱上浮 + 轻微闪烁
 * - 暗色主题为冷白光点，亮色主题为半透明品牌蓝点，随主题切换即时适配
 * - 鼠标 120px 范围内被轻推开，给页面"活着"的触感
 * - 仅 2D Canvas + requestAnimationFrame；标签页隐藏时浏览器自动暂停
 * - prefers-reduced-motion 用户完全不走动画，画布留空
 */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 显示设置面板的「粒子层」开关（sj.particles === 'off'）：连画布都不启动
  try { if (localStorage.getItem('sj.particles') === 'off') return; } catch (e) { /* 无痕模式：照常 */ }

  // 3D 背景（js/cosmos/main.js）在场时自动让位：两层环境光点叠着跑只是白烧 CPU
  if (document.getElementById('cosmos-canvas')) return;

  const canvas = document.getElementById('particle-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  let W = 0;
  let H = 0;
  let particles = [];
  let partyUntil = 0; // Konami 彩蛋：彩色庆典模式截止时间
  const mouse = { x: -9999, y: -9999 };

  // 键盘彩蛋钩子：app.js 的 Konami 序列会调用，粒子变彩色庆祝 20 秒
  window.particlesParty = function (seconds) {
    partyUntil = performance.now() + (seconds || 20) * 1000;
  };

  function spawn(x, y) {
    const depth = Math.random(); // 0 = 远景（小/暗/慢），1 = 近景（大/亮/快）
    return {
      x,
      y,
      r: 0.6 + depth * 1.5,
      vx: (Math.random() - 0.5) * 0.18 * (0.4 + depth),
      vy: (Math.random() - 0.5) * 0.18 * (0.4 + depth) - 0.03,
      tw: Math.random() * Math.PI * 2,
      tws: 0.008 + Math.random() * 0.02,
      depth
    };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.min(Math.round((W * H) / 16000), 130);
    particles = Array.from({ length: target }, () => spawn(Math.random() * W, Math.random() * H));
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    const dark = document.documentElement.classList.contains('dark');

    for (const p of particles) {
      // 鼠标 120px 范围内轻推开
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 14400 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = (1 - d / 120) * 0.35;
        p.x += (dx / d) * f;
        p.y += (dy / d) * f;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.tw += p.tws;

      // 边缘环绕
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;

      const alpha = (dark ? 0.35 : 0.16) * (0.55 + 0.45 * Math.sin(p.tw)) * (0.4 + p.depth * 0.6);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      if (performance.now() < partyUntil) {
        // 彩蛋模式：每颗粒子按相位在色轮上流转
        const hue = (p.tw * 40) % 360;
        ctx.fillStyle = `hsla(${hue.toFixed(0)}, 90%, 65%, ${Math.min(alpha * 2.2, 0.9).toFixed(3)})`;
      } else {
        ctx.fillStyle = dark
          ? `rgba(235, 242, 255, ${alpha.toFixed(3)})`
          : `rgba(0, 113, 227, ${alpha.toFixed(3)})`;
      }
      ctx.fill();
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });
  window.addEventListener('mouseout', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  resize();
  requestAnimationFrame(frame);
})();

;

// ---- js/settings-panel.js (a5c8e3935e3a) ----
/**
 * 显示设置面板（左下角齿轮）
 * ----------------------------------------------------
 * 把散在各个脚本里的 sj.* 开关与壁纸观感做成可点的 UI（参考站 SettingsPanel 的降维版：
 * 他做了 4 个鼠标特效开关，本站只留下真正影响观感与性能的几项）：
 *   · 效果档位     完整 / 轻档 / 关闭壁纸      → sj.wallpaper（与 ?fx= 覆盖共用同一套档位）
 *   · 壁纸模糊     0–26px 实时生效             → --wp-blur / sj.wp-blur
 *   · 壁纸亮度     30–100% 实时生效            → --wp-dim  / sj.wp-dim
 *   · 粒子层       开 / 关                     → sj.particles
 *   · 推理场       开 / 关                     → sj.cosmos
 *   · 看板娘       开 / 关                     → sj.live2d
 *   · 一键还原     清掉以上全部键并刷新
 *
 * 为什么有的项要刷新：粒子与推理场是各自脚本启动时的早退开关，看板娘由启动档位决定，
 * 都在页面加载阶段定死；面板对它们做「立即隐藏 + 提示刷新才彻底停」，不做假实时。
 *
 * 位置：左下角。右下已被看板娘/回到顶部/底部居中的音乐 FAB 占满，左上被星场 HUD 角标占。
 * 无障碍：role=dialog + aria-modal、Esc 关闭、焦点进/出、prefers-reduced-motion 不做位移。
 */
(function () {
  'use strict';

  const CFG = window.SITE_CONFIG || {};
  const root = document.documentElement;

  const K = {
    tier: 'sj.wallpaper',        // 'on' | 'lite' | 'off'
    blur: 'sj.wp-blur',
    dim: 'sj.wp-dim',
    particles: 'sj.particles',   // 'on' | 'off'
    cosmos: 'sj.cosmos',
    live2d: 'sj.live2d',
    lite: 'sj.fx-lite'           // 帧率哨兵记住的「这台机器弱」
  };

  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* 无痕模式：本次生效 */ } };

  // ---- 立即生效的部分（不刷新也能看到）----
  function applyFlags() {
    root.classList.toggle('fx-no-particles', get(K.particles) === 'off');
    root.classList.toggle('fx-no-cosmos', get(K.cosmos) === 'off');
    root.classList.toggle('fx-no-live2d', get(K.live2d) === 'off');
  }

  function applyTier(tier) {
    if (tier === 'off') {
      root.classList.remove('has-wallpaper');
      return;
    }
    root.classList.add('has-wallpaper');
    root.classList.toggle('wallpaper-lite', tier === 'lite');
  }

  function applyBlur(v) { if (v !== null) root.style.setProperty('--wp-blur', v + 'px'); }
  function applyDim(v) { if (v !== null) root.style.setProperty('--wp-dim', v); }

  applyFlags();

  // 当前档位：显式设置优先；没设过就看运行时的判定结果（可能是哨兵判的轻档）
  const currentTier = () => {
    const saved = get(K.tier);
    if (saved === 'off' || saved === 'lite') return saved;
    if (saved === 'on') return 'on';
    return (window.__fxTier && window.__fxTier.tier === 'lite') ? 'lite' : 'on';
  };
  const autoWeak = () => !get(K.tier) && get(K.lite) === '1';

  // ---------------- DOM ----------------
  const gear = document.createElement('button');
  gear.id = 'fx-open';
  gear.type = 'button';
  gear.className = 'fx-open glass-spec';
  gear.title = '显示设置';
  gear.setAttribute('aria-label', '显示设置');
  gear.setAttribute('aria-expanded', 'false');
  gear.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">'
    + '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-2.9 1.2v.17a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-2.94-1.2l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6h.08A1.7 1.7 0 0 0 10.6 3.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 16.1 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 20.4 9v.08a1.7 1.7 0 0 0 1.5 1.52H22a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/></svg>';

  const panel = document.createElement('div');
  panel.id = 'fx-panel';
  panel.className = 'fx-panel glass-spec';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', '显示设置');
  panel.innerHTML = [
    '<div class="fx-head">',
    '  <b>显示设置</b>',
    '  <button type="button" class="fx-close" aria-label="关闭设置">',
    '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    '  </button>',
    '</div>',
    '<div class="fx-body">',
    '  <div class="fx-row fx-row-col">',
    '    <span class="fx-label">效果档位</span>',
    '    <div class="fx-seg" role="radiogroup" aria-label="效果档位">',
    '      <button type="button" data-tier="on" role="radio">完整</button>',
    '      <button type="button" data-tier="lite" role="radio">轻档</button>',
    '      <button type="button" data-tier="off" role="radio">关闭</button>',
    '    </div>',
    '    <p class="fx-hint" id="fx-tier-hint"></p>',
    '  </div>',
    '  <label class="fx-row">',
    '    <span class="fx-label">壁纸模糊</span>',
    '    <input type="range" id="fx-blur" min="0" max="26" step="1" />',
    '    <output class="fx-val" id="fx-blur-val"></output>',
    '  </label>',
    '  <label class="fx-row">',
    '    <span class="fx-label">壁纸亮度</span>',
    '    <input type="range" id="fx-dim" min="30" max="100" step="1" />',
    '    <output class="fx-val" id="fx-dim-val"></output>',
    '  </label>',
    '  <label class="fx-row fx-row-sw">',
    '    <span class="fx-label">粒子层</span>',
    '    <input type="checkbox" id="fx-particles" /><span class="fx-sw" aria-hidden="true"></span>',
    '  </label>',
    '  <label class="fx-row fx-row-sw">',
    '    <span class="fx-label">推理场</span>',
    '    <input type="checkbox" id="fx-cosmos" /><span class="fx-sw" aria-hidden="true"></span>',
    '  </label>',
    // 看板娘暂时下线（site-config.js 的 live2d=false）：整行藏起来，免得点了没反应。
    // 元素留在 DOM 里而不是不渲染——下面还有 4 处引用 elLive2d，摘掉要连带改判空，不划算
    '  <label class="fx-row fx-row-sw"' + (CFG.live2d === false ? ' style="display:none"' : '') + '>',
    '    <span class="fx-label">看板娘</span>',
    '    <input type="checkbox" id="fx-live2d" /><span class="fx-sw" aria-hidden="true"></span>',
    '  </label>',
    '</div>',
    '<p class="fx-note" id="fx-note" hidden>改开关后刷新页面才彻底生效（会停止/启动对应引擎）。</p>',
    '<div class="fx-foot">',
    '  <button type="button" class="fx-reset" id="fx-reset">一键还原默认</button>',
    '  <a class="fx-about" href="' + (CFG.github || '#') + '" target="_blank" rel="noopener noreferrer">GitHub</a>',
    '</div>'
  ].join('\n');

  document.body.append(gear, panel);

  // ---------------- 控件取值 ----------------
  const elBlur = panel.querySelector('#fx-blur');
  const elDim = panel.querySelector('#fx-dim');
  const elParticles = panel.querySelector('#fx-particles');
  const elCosmos = panel.querySelector('#fx-cosmos');
  const elLive2d = panel.querySelector('#fx-live2d');
  const elHint = panel.querySelector('#fx-tier-hint');
  const elNote = panel.querySelector('#fx-note');

  const cssVar = (name, fallback) => {
    const v = getComputedStyle(root).getPropertyValue(name).trim();
    return v || fallback;
  };

  // 初始值：优先用户存过的，其次 CSS 默认
  const initBlur = get(K.blur) !== null ? Number(get(K.blur)) : parseFloat(cssVar('--wp-blur', '18px'));
  const initDim = get(K.dim) !== null ? Math.round(Number(get(K.dim)) * 100) : Math.round(parseFloat(cssVar('--wp-dim', '0.6')) * 100);

  elBlur.value = String(Math.max(0, Math.min(26, isFinite(initBlur) ? initBlur : 18)));
  elDim.value = String(Math.max(30, Math.min(100, isFinite(initDim) ? initDim : 60)));
  const paintVals = () => {
    panel.querySelector('#fx-blur-val').textContent = elBlur.value + 'px';
    panel.querySelector('#fx-dim-val').textContent = elDim.value + '%';
  };
  paintVals();

  elParticles.checked = get(K.particles) !== 'off';
  elCosmos.checked = get(K.cosmos) !== 'off';
  elLive2d.checked = get(K.live2d) !== 'off';

  function paintTier() {
    const t = currentTier();
    panel.querySelectorAll('[data-tier]').forEach((b) => {
      const on = b.dataset.tier === t;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(on));
    });
    elHint.textContent = autoWeak()
      ? '这台机器被判定为吃不动重效果（已自动用轻档）；想要完整效果可点「完整」。'
      : (t === 'lite' ? '轻档：保留壁纸氛围，不做混合与卡片磨砂，也不加载看板娘。' : '');
  }
  paintTier();

  const needReload = (flag) => { if (flag) elNote.hidden = false; };

  // ---------------- 事件 ----------------
  panel.querySelectorAll('[data-tier]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tier = btn.dataset.tier;
      set(K.tier, tier);
      if (tier === 'on') set(K.lite, '0');       // 显式要完整效果：清掉「弱机」记忆
      if (tier === 'lite') set(K.lite, '1');
      applyTier(tier);
      if (tier === 'off') set(K.lite, '0');
      paintTier();
      needReload(true);                          // 看板娘/混合模式的启停要刷新
    });
  });

  elBlur.addEventListener('input', () => {
    root.style.setProperty('--wp-blur', elBlur.value + 'px');
    set(K.blur, elBlur.value);
    paintVals();
  });
  elDim.addEventListener('input', () => {
    const v = (Number(elDim.value) / 100).toFixed(2);
    root.style.setProperty('--wp-dim', v);
    set(K.dim, v);
    paintVals();
  });

  const flagBind = (el, key, cls) => {
    el.addEventListener('change', () => {
      const off = !el.checked;
      set(key, off ? 'off' : 'on');
      root.classList.toggle(cls, off);
      if (key === K.live2d && !off && window.__fxTier && window.__fxTier.tier !== 'lite') {
        // 重新打开看板娘：已加载出来就直接显示，没加载的走刷新
        const w = document.getElementById('waifu');
        if (w && w.classList.contains('waifu-active')) root.classList.remove('fx-no-live2d');
        else needReload(true);
      } else {
        needReload(true);
      }
    });
  };
  flagBind(elParticles, K.particles, 'fx-no-particles');
  flagBind(elCosmos, K.cosmos, 'fx-no-cosmos');
  flagBind(elLive2d, K.live2d, 'fx-no-live2d');

  panel.querySelector('#fx-reset').addEventListener('click', () => {
    [K.tier, K.blur, K.dim, K.particles, K.cosmos, K.live2d, K.lite].forEach((k) => set(k, null));
    location.reload();
  });

  // ---------------- 开合与焦点 ----------------
  let lastFocus = null;
  function open() {
    lastFocus = document.activeElement;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    gear.setAttribute('aria-expanded', 'true');
    panel.querySelector('.fx-close').focus({ preventScroll: true });
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onOutside, true);
  }
  function close() {
    panel.classList.remove('is-open');
    gear.setAttribute('aria-expanded', 'false');
    const finish = () => { panel.hidden = true; };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else setTimeout(finish, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onOutside, true);
  }
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  const onOutside = (e) => {
    if (panel.hidden || panel.contains(e.target) || gear.contains(e.target)) return;
    close();
  };

  gear.addEventListener('click', () => (panel.hidden ? open() : close()));
  panel.querySelector('.fx-close').addEventListener('click', close);
})();

;

// ---- js/tab-nav.js (61be36cf6c83) ----
/**
 * 按住 Tab 唤出目录 / 快速导航（首页与 archive、gallery 共用）
 * ----------------------------------------------------
 * 交互设计（对齐参考视频里的「按住 Tab 键显示导航目录」）：
 *   - 按住 Tab 约 180ms 才接管：不到阈值就抬手 = 浏览器原生焦点导航，一点没动
 *   - 接管后弹出玻璃浮层：在文章阅读弹窗里列该文目录，在页面上列章节与最近文章
 *   - 按住期间 Tab / Shift+Tab 循环高亮（首尾环绕，130ms 防连发），松开跳到高亮项
 *   - Esc 取消，点遮罩取消；aria-live 播报当前状态
 * 实现取舍：首次 keydown 不 preventDefault —— 浏览器会把焦点往后挪一格并发一次
 *   「滚动到焦点」，代价是按住时可能闪一下焦点环；换来的是「轻点 Tab 完全走原生」，
 *   键盘可达性不会因为加了这个功能而倒退。
 * 不依赖 app.js：跳转数学与它保持一致（顶部留 64px、reduced-motion 下不走平滑）。
 */
(function () {
  'use strict';

  const HOLD = 180;        // 按住多久才算「要目录」
  const CYCLE_GAP = 200;   // 连续按住时的换项最小间隔（系统连发大约 30ms 一次，太密不好选）
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let box = null;          // 浮层元素（懒建）
  let live = null;         // aria-live 播报区
  let listEl = null;       // 列表容器
  let entries = [];        // [{ label, kind, el?, href? }]
  let active = 0;
  let engaged = false;
  let timer = 0;
  let lastCycle = 0;

  const isEditable = (el) => !!el && (el.isContentEditable === true || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

  // ---- 收集条目 ----
  function sectionLabel(sec) {
    if (sec.dataset.navLabel) return sec.dataset.navLabel;
    const nav = document.querySelector(`header.site-header nav a[href$="#${sec.id}"]`);
    if (nav && nav.textContent.trim()) return nav.textContent.trim();
    const h = sec.querySelector('h1, h2, h3');
    if (h && h.textContent.trim()) return h.textContent.trim();
    return sec.id;
  }

  function collect() {
    const modal = document.getElementById('article-modal');
    const modalOpen = modal && !modal.classList.contains('hidden');
    const content = document.getElementById('article-modal-content');

    if (modalOpen && content) {
      const toc = [...content.querySelectorAll('.toc-box .toc-link')];
      if (toc.length) {
        return toc.map((a) => {
          const id = a.dataset.tocId;
          const target = id ? content.querySelector('#' + CSS.escape(id)) : null;
          return { label: a.textContent.trim(), kind: 'toc', el: target };
        }).filter((x) => x.el);
      }
      // 标题少于 3 个时 app.js 不生成目录：直接把正文二三级标题列出来
      const heads = [...content.querySelectorAll('.markdown-body h2, .markdown-body h3')];
      if (heads.length) {
        return heads.map((h) => ({ label: h.textContent.trim(), kind: 'toc', el: h }));
      }
    }

    const out = [];
    // 本页章节（首页是 #home/#products/…；次级页是归档/照片墙的主体）
    [...document.querySelectorAll('section[id], main > [id]')].forEach((sec) => {
      if (!sec.id || sec.offsetParent === null) return;
      if (sec.closest('#article-modal, #project-modal, #search-palette')) return;
      out.push({ label: sectionLabel(sec), kind: 'section', el: sec });
    });
    // 站点入口
    out.push({ label: '首页', kind: 'link', href: 'index.html' });
    if (!document.getElementById('archive-list')) out.push({ label: '归档 · 时间河', kind: 'link', href: 'archive.html' });
    if (!document.getElementById('gallery-grid')) out.push({ label: '照片墙', kind: 'link', href: 'gallery.html' });
    // 最近文章（次级页也有 articles.js，一样能用；深链回首页阅读弹窗）
    const arts = (window.ARTICLES_DATA || []).slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 6);
    arts.forEach((a) => {
      out.push({ label: a.title || a.id, kind: 'link', href: 'index.html?post=' + encodeURIComponent(a.id) });
    });
    return out;
  }

  // ---- 浮层 ----
  function build() {
    if (box) return;
    box = document.createElement('div');
    box.id = 'tabnav';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', '快速导航');
    box.hidden = true;

    const panel = document.createElement('div');
    panel.className = 'tabnav-panel glass-spec';
    panel.innerHTML =
      '<p class="tabnav-title">快速导航</p>' +
      '<ul class="tabnav-list" role="listbox" aria-label="可跳转的条目"></ul>' +
      '<p class="tabnav-hint"><b>Tab</b> 循环 · 松开跳转 · <b>Esc</b> 取消</p>';
    box.appendChild(panel);

    live = document.createElement('p');
    live.className = 'tabnav-live';
    live.setAttribute('aria-live', 'polite');

    listEl = panel.querySelector('.tabnav-list');
    document.body.append(box, live);
    box.addEventListener('mousedown', (e) => {
      if (e.target === box) close(false);          // 点遮罩 = 取消
    });
  }

  function paint() {
    [...listEl.children].forEach((li, i) => {
      const on = i === active;
      li.classList.toggle('is-active', on);
      li.setAttribute('aria-selected', String(on));
    });
    const cur = listEl.children[active];
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  }

  function open() {
    build();
    entries = collect();
    if (!entries.length) return false;
    // 弹窗态默认高亮当前该读到的那个标题，页面上默认第一项
    active = 0;
    listEl.textContent = '';
    entries.forEach((it, i) => {
      const li = document.createElement('li');
      li.className = 'tabnav-item';
      li.setAttribute('role', 'option');
      li.dataset.i = String(i);
      li.textContent = it.label;
      li.addEventListener('mouseenter', () => { active = i; paint(); });
      li.addEventListener('click', () => { active = i; close(true); });
      listEl.appendChild(li);
    });
    paint();
    box.hidden = false;
    live.textContent = `已打开快速导航，共 ${entries.length} 项。按住 Tab 循环选择，松开跳转，Esc 取消。`;
    return true;
  }

  function cycle(dir) {
    active = (active + dir + entries.length) % entries.length;
    paint();
    live.textContent = listEl.children[active].textContent;
  }

  // ---- 跳转 ----
  function jump(it) {
    if (!it) return;
    if (it.el) {
      const scroller = document.getElementById('article-modal-content');
      if (scroller && scroller.contains(it.el)) {
        const top = it.el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 16;
        scroller.scrollTo({ top, behavior: reduce() ? 'auto' : 'smooth' });
        return;
      }
      const y = it.el.id === 'home' ? 0
        : it.el.getBoundingClientRect().top + window.scrollY - 64;
      // 统一走 app.js 暴露的 smoothScrollTo（原生平滑滚动）。
      // ❗原先这里调用 window.__dampedScroll(y)，但它是对象不是函数 —— 选中"章节"项时会抛
      //   TypeError 导致跳转静默失败（2026-10-17 随滚轮阻尼一起修正）。
      if (window.smoothScrollTo) window.smoothScrollTo(y);
      else window.scrollTo({ top: y, behavior: reduce() ? 'auto' : 'smooth' });
      if (it.el.id) history.pushState(null, '', '#' + it.el.id);
      return;
    }
    if (it.href) location.href = it.href;
  }

  function close(commit) {
    if (!engaged) return;
    engaged = false;
    clearTimeout(timer);
    const it = entries[active];
    if (box) box.hidden = true;
    if (commit) jump(it);
  }

  // ---- 键盘 ----
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || e.ctrlKey || e.altKey || e.metaKey) return;
    if (isEditable(document.activeElement)) return;

    if (engaged) {
      e.preventDefault();                       // 接管后不再让浏览器挪焦点
      const now = performance.now();
      if (e.repeat && now - lastCycle < CYCLE_GAP) return;   // 系统级连发太快，节流
      lastCycle = now;
      cycle(e.shiftKey ? -1 : 1);
      return;
    }
    if (timer) return;                          // 已经按住过一次，等抬手
    timer = setTimeout(() => {
      timer = 0;
      if (open()) {
        engaged = true;
        lastCycle = performance.now();   // 刚弹出来先停一拍，别立刻跳走
      }
    }, HOLD);
  });

  document.addEventListener('keyup', (e) => {
    if (e.key !== 'Tab') return;
    if (engaged) close(true);
    else if (timer) { clearTimeout(timer); timer = 0; }
  });

  // 捕获阶段拦 Esc：否则 app.js 的全局 Esc 会顺手把阅读弹窗也关掉
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && engaged) {
      e.preventDefault();
      e.stopPropagation();
      close(false);
    }
  }, true);

  window.addEventListener('blur', () => { if (engaged) close(false); });
})();

