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
