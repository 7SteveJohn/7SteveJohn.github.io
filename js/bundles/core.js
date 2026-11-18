// build-bundles: {"name":"core","version":"6422c21a1aed","sources":[{"path":"js/site-config.js","sha256":"59d9bb59a0d345ea5484bb5ec74944b1a903de398bcec5ae473a1b4f63b3961c"},{"path":"js/markdown-loader.js","sha256":"9149bca09b58fc21ff58cd7071d9f9470acdb9f4067856265a14260f99cca272"},{"path":"js/wallpaper.js","sha256":"7a99fdc106195d43bb2e518a6ffb32c5d2d61886db933ac145b4321940e4b067"},{"path":"js/particles.js","sha256":"b59b788650a6c595efc98033d3285ca9194e2937a3d24cacf7e9ce394178fa7c"}]}
/* 6 页共用：配置 → Markdown 按需加载器 → 壁纸 → 粒子
   ❗生成物：由 node scripts/build-bundles.mjs 从下列源文件拼接，请改源文件后重建。
   源文件顺序：js/site-config.js → js/markdown-loader.js → js/wallpaper.js → js/particles.js */

// ---- js/site-config.js (59d9bb59a0d3) ----
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
    // 看板娘「7steve」（2.5D 分层弹簧骨骼立绘 + 场景感知联动 + 快捷丸栏，2026-11-18 上线）：
    // 无损矢量分层 + 胡克定律弹簧物理（~25KB、零 WebGL、明暗自适应），取代早期 1.9MB Live2D .moc3 方案。
    // companion 控制新版 2.5D 看板娘挂载；live2d 保持 false 以继续屏蔽旧版 waifu 运行时与旧设置开关。
    companion: true,
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
  // 3D 物理翘板已根据体验决策彻底精简拔除，保留空函数避免外部依赖报错
  root.attach3DTilt = function attach3DTilt() {};
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

// ---- js/wallpaper.js (7a99fdc10619) ----
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
  const { promise: done, resolve: resolveTier } = Promise.withResolvers();
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

// ---- js/particles.js (b59b788650a6) ----
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
  const mouse = { x: -9999, y: -9999 };

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
      ctx.fillStyle = dark
        ? `rgba(235, 242, 255, ${alpha.toFixed(3)})`
        : `rgba(0, 113, 227, ${alpha.toFixed(3)})`;
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

