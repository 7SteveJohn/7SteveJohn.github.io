/**
 * Live2D 看板娘（自托管运行时 + Live2D 官方示例模型，右下角）
 * ----------------------------------------------------
 * - 只在对的环境出现：桌面细指针 + 视口 ≥1024px + 没开「减少动态效果」+ 没开省流量 + 用户没关过
 * - 首帧之后（requestIdleCallback）才注入 waifu.css 与 ESM 运行时：不抢首屏带宽；
 *   资源不进 sw.js 预缓存，首次在线加载后由 SW 静态资源分支自动入库（断网可复用）
 * - 任何一步失败都静默收场：把已插入的节点收干净，不弹提示、不刷 console.error
 * - file:// 双击打开：模型要 fetch，必被 CORS 挡 → 这里直接跳过（本地服务器预览才看得到）
 * - 关闭键在角色右上角：写 sj.live2d=off 持久化，下次不再加载
 * - 出现后给 <html> 挂 has-live2d，css/style.css 借它把右下角「回到顶部」按钮让开
 * - 模型资源由 scripts/vendor-live2d.js 生成（换模型见 assets/vendor/live2d/SOURCE.txt）
 */
(function () {
  'use strict';

  const BASE = 'assets/vendor/live2d/';
  const KEY = 'sj.live2d';
  const root = document.documentElement;

  // ---- 闸门：不在手机上、不在省电/省流量环境、不在 file:// ----
  const hit = (q) => !!(window.matchMedia && window.matchMedia(q).matches);
  const conn = navigator.connection || navigator.mozConnection || {};
  let closed = false;
  try { closed = localStorage.getItem(KEY) === 'off'; } catch (e) { /* 隐私模式：当作没关过 */ }

  if (closed) return;
  if (location.protocol === 'file:') return;
  if (hit('(prefers-reduced-motion: reduce)')) return;
  if (!hit('(pointer: fine)') || !hit('(min-width: 1024px)')) return;
  if (conn.saveData === true) return;
  // 没有 WebGL 就别开工：上游会静默失败，留下一个看不见的空白 canvas，
  // 还白下 1.9MB（2026-10-17 用 --disable-gpu --disable-software-rasterizer 实测复现）
  if (!hasWebGL()) return;

  const nodes = () => ['waifu', 'waifu-toggle', 'live2d-close']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  // 能不能跑 WebGL：跑不了就当没这个功能
  function hasWebGL() {
    try {
      return !!document.createElement('canvas').getContext('webgl');
    } catch (e) {
      return false;
    }
  }

  // 静默降级：清干净已插入的东西，页面上什么都不留
  const fail = () => {
    nodes().forEach((el) => el.remove());
    root.classList.remove('has-live2d');
  };

  function addCloseButton() {
    if (document.getElementById('live2d-close')) return;
    const btn = document.createElement('button');
    btn.id = 'live2d-close';
    btn.type = 'button';
    btn.title = '关闭看板娘（以后不再出现）';
    btn.setAttribute('aria-label', '关闭看板娘');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    btn.addEventListener('click', () => {
      try { localStorage.setItem(KEY, 'off'); } catch (e) { /* 存不下也只是这次躲起来 */ }
      const waifu = document.getElementById('waifu');
      if (waifu) waifu.classList.add('waifu-hidden');   // 用上游自己的隐藏类，不动它的渲染循环
      btn.remove();
      root.classList.remove('has-live2d');
    });
    document.body.appendChild(btn);
  }

  // 等模型真正落地（上游加载完会给 #waifu 挂 waifu-active）再显形：
  // 在那之前 #waifu 保持 visibility:hidden（见 css/style.css），既不挡右下角点击，
  // 也不会让人盯着一个透明空块。慢网下模型要下载好几秒，这里给足耐心（约 90 秒），
  // 超时也不删节点、不报错 —— 就当没有这个功能。
  function settle(tries) {
    const waifu = document.getElementById('waifu');
    if (waifu && waifu.classList.contains('waifu-active')) {
      root.classList.add('has-live2d');
      addCloseButton();
      return;
    }
    if (tries <= 0) return;
    setTimeout(() => settle(tries - 1), 400);
  }

  function boot(modelId) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = BASE + 'waifu.css';
    document.head.appendChild(css);

    const run = document.createElement('script');
    run.type = 'module';
    run.src = BASE + 'waifu-tips.js';
    run.onerror = fail;
    run.onload = () => {
      try {
        if (typeof window.initWidget !== 'function') return fail();
        window.initWidget({
          waifuPath: BASE + 'waifu-tips.json',
          cubism2Path: BASE + 'live2d.min.js',
          cubism5Path: BASE + 'live2dcubismcore.min.js',
          modelId: typeof modelId === 'number' ? modelId : 1,
          // 工具条留空：本站只要角色本体 + 提示气泡，右上角自带关闭键
          tools: [],
          logLevel: 'error',
          drag: false
        });
      } catch (e) {
        return fail();
      }
      settle(225);   // 最多等约 90 秒（模型 1.7MB，慢网络也够）
    };
    document.head.appendChild(run);
  }

  // 起动 7Steve 原生 Live2D Cubism 看板娘，未就绪时平滑回退
  function probe() {
    boot(1);
  }

  // 起动闸门：等壁纸脚本（js/wallpaper.js）给出档位结论 —— 弱机/被判定为轻档时
  // 直接不加载运行时与模型（1.9MB 省下来，也少一份每帧渲染的开销）。
  function start() {
    const fx = window.__fxTier;
    if (!fx || !fx.done) return probe();                       // 没有该模块（比如次级页）：照常
    const guard = new Promise((r) => setTimeout(() => r('full'), 8000));   // 档位迟迟没结论就按强机走
    Promise.race([fx.done, guard]).then((tier) => { if (tier !== 'lite') probe(); });
  }

  // ---- 起跑时机（2026-10-17 加载优化 E）----
  // 运行时 + 模型共 1.9MB。原先「load 之后立刻 idle 加载」，会和首屏剩下的资源抢连接
  // （实测首页每请求要等 3–7 秒，多一个 1.9MB 的请求影响很明显）。
  // 现在改为三个条件谁先到就用谁：首次交互 / load 后 3.5 秒 / 页面重新可见时的 idle。
  // ❗看板娘**仍然默认出现**，这里没有、也不要加任何「默认关闭」逻辑。
  let fired = false;
  function fire() {
    if (fired) return;
    fired = true;
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.removeEventListener(ev, fire));
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
    idle(start);
  }

  function arm() {
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => {
      window.addEventListener(ev, fire, { once: true, passive: true });
    });
    setTimeout(fire, 3500);
  }

  document.addEventListener('visibilitychange', () => {
    if (!fired && document.visibilityState === 'visible' && document.readyState === 'complete') fire();
  });

  if (document.readyState === 'complete') arm();
  else window.addEventListener('load', arm, { once: true });
})();
