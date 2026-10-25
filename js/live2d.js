/**
 * Live2D 看板娘（自托管运行时 + Live2D 官方示例模型，右下角）
 * ----------------------------------------------------
 * - 只在对的环境出现：桌面细指针 + 视口 ≥1024px + 没开省流量 + 用户没关过 + WebGL 可用；
 *   「减少动态效果」默认尊重系统偏好不加载，但设置面板/调试台显式开启（sj.live2d=on）可覆盖——
 *   否则系统动画关闭的机器（如游戏性能优化党）永远看不到她，且无从得知被挡原因（每道闸都有 console.info）
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
  let optedIn = false;
  try {
    const v = localStorage.getItem(KEY);
    closed = v === 'off';
    optedIn = v === 'on';   // 设置面板/调试台写入：用户知情显式开启
  } catch (e) { /* 隐私模式：当作没关过 */ }

  if (closed) return;
  // 简历镜像档：pages.dev 是简历对外的干净版，不放看板娘；主站 github.io / 本地预览专属
  if (/(^|\.)pages\.dev$/.test(location.hostname)) {
    console.info('[live2d] 简历镜像（pages.dev）不放看板娘');
    return;
  }
  // 手机/窄窗：维持原设计不出现（静态立绘也只给桌面宽窗，避免压到内容）
  if (!hit('(pointer: fine)') || !hit('(min-width: 1024px)')) { console.info('[live2d] 未加载：视口 <1024px 或非鼠标设备'); return; }
  const reduced = hit('(prefers-reduced-motion: reduce)');
  // 各类环境限制一律降级为静态立绘兜底——她永远在场，只是不动画；
  // 只有用户点过 ×（sj.live2d=off）才彻底消失
  if (location.protocol === 'file:') return staticFallback('file:// 环境');
  if (!optedIn && reduced) return staticFallback('系统减少动效');
  if (conn.saveData === true) return staticFallback('省流量模式');
  if (!hasWebGL()) return staticFallback('无 WebGL');
  if (optedIn) console.info('[live2d] 显式开启（sj.live2d=on）：跳过减少动效闸');

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

  // 静默降级：动态版任何一步失败，都兜底到静态立绘——她可以不动画，但不能不在场
  const fail = () => {
    nodes().forEach((el) => el.remove());
    root.classList.remove('has-live2d');
    staticFallback('动态版加载失败');
  };

  // 静态立绘兜底：动态版被环境闸挡住时，用同一角色的静帧顶上（零 WebGL/零循环/26KB）。
  // 她永远在场，只是不动画；has-live2d 让「回到顶部」按钮照常让位。
  // 只有"系统减少动效"这一种降级（机器本身带得动）给升级入口：点立绘 = 写显式开启并刷新。
  // 其余降级（弱机/无 WebGL/加载失败）说明机器带不动，点了也不升级，防刷新循环。
  function staticFallback(reason) {
    console.info('[live2d] 动态版未加载（' + reason + '）：显示静态立绘');
    if (document.getElementById('waifu-static')) return;
    root.classList.add('has-live2d');
    const upgradable = reason.indexOf('系统减少动效') === 0;
    const img = document.createElement('img');
    img.id = 'waifu-static';
    img.src = BASE + '7steve-static.webp';
    img.alt = '';
    img.style.cssText = 'position:fixed;right:6px;bottom:0;width:340px;height:340px;object-fit:cover;z-index:29;'
      + (upgradable ? 'cursor:pointer;' : 'pointer-events:none;') + 'user-select:none;';
    document.body.appendChild(img);
    if (upgradable) {
      img.title = '点我开启动态版';
      img.addEventListener('click', () => {
        try { localStorage.setItem(KEY, 'on'); } catch (e) { /* 存不了就算了 */ }
        location.reload();
      });
      const hint = document.createElement('div');
      hint.id = 'waifu-static-hint';
      hint.textContent = '点我开启动态版';
      hint.style.cssText = 'position:fixed;right:10px;bottom:352px;z-index:29;font-size:11px;color:#9aa0aa;'
        + 'background:rgba(16,17,22,.85);border:1px solid #2a2c33;border-radius:6px;padding:2px 8px;pointer-events:none;';
      document.body.appendChild(hint);
    }
  }

  // 语义表情与连戳反应链（站点层：监听 vendor 派发的点击事件，调 app 的表情/动作接口）
  // 表情下标 = model3.json Expressions 顺序：0 smile 1 shy 2 focus 3 wink 4 surprised
  function bindReactions() {
    const app = window.__live2d_app;
    if (!app || typeof app.setExpression !== 'function' || bindReactions.done) return;
    bindReactions.done = true;
    let resetTimer = null;
    let pokeTimes = [];
    let lastAnnoy = 0;
    const setFace = (idx) => { try { app.setExpression(idx); } catch (e) { /* 表情失败静默 */ } };
    const faceThen = (idx, holdMs) => {
      setFace(idx);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => setFace(0), holdMs);   // 归位到微笑
    };
    window.addEventListener('live2d:taphead', () => faceThen(Math.random() < 0.5 ? 1 : 3, 4200));   // 摸头：害羞/眨眼
    window.addEventListener('live2d:taptablet', () => faceThen(2, 4200));                            // 敲屏：专注
    window.addEventListener('live2d:tapcat', () => faceThen(0, 2600));                               // 戳猫：微笑
    window.addEventListener('live2d:tapbody', () => {
      const now = Date.now();
      pokeTimes = pokeTimes.filter((t) => now - t < 6000);
      pokeTimes.push(now);
      if (pokeTimes.length >= 3 && now - lastAnnoy > 6000) {
        lastAnnoy = now;                       // 连戳三次：烦了——瞪眼 + 摇晃抗议，6 秒冷却
        pokeTimes = [];
        faceThen(4, 3200);
        try { app.startRandomMotion('Shake', 2); } catch (e) { /* 动作失败静默 */ }
      } else {
        faceThen(4, 2400);                     // 单戳：惊吓脸
      }
    });
  }

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

  // 等模型真正可画再显形：waifu-active 只是模型 setup 开始的信号（气泡会先出来、人还是空的——
  // 线上实测挂载后仍有 5-10s 贴图加载隐形窗口）；真正的绘制就绪是贴图全部上传显卡，
  // 即运行时状态机走到 CompleteSetup（__live2d_app._state = 22，bindTexture 计数齐才置位）。
  // 两个条件都满足才挂 has-live2d 显形，气泡与角色同帧出现。慢网下模型要下载好几秒，
  // 超时（约 90s）静默放弃——与上游失败行为一致，不显形不报错。
  function settle(tries) {
    const waifu = document.getElementById('waifu');
    const app = window.__live2d_app;
    const painted = !!(app && typeof app._state === 'number' && app._state >= 22);
    if (waifu && waifu.classList.contains('waifu-active') && painted) {
      root.classList.add('has-live2d');
      addCloseButton();
      bindReactions();
      return;
    }
    if (tries <= 0) return staticFallback('动态版就绪超时');
    setTimeout(() => settle(tries - 1), 250);
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
      settle(360);   // 250ms 一轮，360 轮 = 90s（模型 0.8MB，慢网络也够）
    };
    document.head.appendChild(run);
  }

  // 起动 7Steve 原生 Live2D Cubism 看板娘，未就绪时平滑回退
  function probe() {
    boot(1);
  }

  // 即时弱机检测（2026-10-26 性能优化）：壁纸引擎的档位判定要实测帧率（约 5 秒），
  // 看板娘等不起。这里用毫秒级签名自查——有硬件加速 WebGL + 足够核心数即放行；
  // 软渲染（swiftshader/llvmpipe，远程桌面/驱动回退的典型签名）当场拦截。
  function quickCapable() {
    if (!hasWebGL()) return false;
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      if (/swiftshader|software|llvmpipe/i.test(renderer)) return false;
    } catch (e) {
      return false;
    }
    return (navigator.hardwareConcurrency || 4) >= 4;
  }

  // 起动闸门：即时自查通过就立刻启动（预热命中时她 2 秒内现身）；
  // 壁纸引擎的慢速档位测量若事后给出 lite 结论（罕见：有加速但帧率低），
  // 再把动态版撤下换静态兜底。
  function start() {
    if (!quickCapable()) return staticFallback('弱机档位');
    probe();
    const fx = window.__fxTier;
    if (fx && fx.done) {
      fx.done.then((tier) => {
        if (tier === 'lite') {
          console.info('[live2d] 档位实测 lite：动态版撤下换静态立绘');
          fail();
        }
      });
    }
  }

  // ---- 起跑时机（2026-10-17 加载优化 E）----
  // 运行时 + 模型共 1.9MB。原先「load 之后立刻 idle 加载」，会和首屏剩下的资源抢连接
  // （实测首页每请求要等 3–7 秒，多一个 1.9MB 的请求影响很明显）。
  // 现在改为四个条件谁先到就用谁：首次交互 / 预热完成（见下）/ load 后 3.5 秒 / 页面重新可见时的 idle。
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
    warmAssets();
  }

  // ---- 模型资产预热（2026-10-26 性能优化）----
  // load 之后空闲时，以低优先级把模型全套资产预取进 SW 缓存。热访问（缓存命中）预热
  // 秒完 → 立即启动看板娘，不再干等 3.5 秒定时器（实测热访问 5.8s → ~2s）；冷访问在
  // 3.5 秒启动时资产多半已在途，与运行时自己的请求自然合流。预热全部 low priority +
  // idle 回调，绝不与首屏争带宽；静态兜底/弱机/pages.dev 路径根本不会走到这里。
  let warmStarted = false;
  let warmDoneFlag = false;
  function warmAssets() {
    if (warmStarted) return;
    warmStarted = true;
    const modelBase = BASE + 'model/7steve/';
    const done = () => {
      if (warmDoneFlag) return;
      warmDoneFlag = true;
      if (!fired && document.readyState === 'complete') fire();
    };
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 50));
    idle(() => {
      for (const u of [BASE + 'waifu.css', BASE + 'waifu-tips.js', BASE + 'live2dcubismcore.min.js',
                       BASE + 'chunk/index.js', BASE + 'chunk/index2.js']) {
        fetch(u, { priority: 'low' }).catch(() => {});
      }
      fetch(modelBase + '7steve.model3.json', { priority: 'low' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (!j || !j.FileReferences) return done();
          const fr = j.FileReferences;
          const urls = [fr.Moc, fr.Physics, fr.DisplayInfo, ...(fr.Textures || []),
                        ...(fr.Expressions || []).map((e) => e.File)];
          for (const g of Object.values(fr.Motions || {})) {
            for (const m of g) urls.push(m.File);
          }
          const list = urls.filter(Boolean);
          let pending = list.length;
          if (!pending) return done();
          for (const u of list) {
            fetch(modelBase + u, { priority: 'low' }).catch(() => {}).finally(() => {
              if (--pending === 0) done();
            });
          }
        })
        .catch(() => done());
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (!fired && document.visibilityState === 'visible' && document.readyState === 'complete') fire();
  });

  if (document.readyState === 'complete') arm();
  else window.addEventListener('load', arm, { once: true });
})();
