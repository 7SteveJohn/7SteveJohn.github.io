/**
 * 背景壁纸层 + 「效果档位」判定（full / lite）
 * ----------------------------------------------------
 * 档位写在 <html> 上：
 *   has-wallpaper     壁纸层开启（图真能加载出来才挂；缺失/失败一律保持原观感）
 *   wallpaper-lite    轻档：不做混合、内容卡片不加磨砂，壁纸留但更暗
 *
 * 判定顺序（前者优先）：
 *   1. URL  ?fx=off | ?fx=lite | ?fx=full —— 一次性覆盖，并写进 localStorage 沿用
 *   2. localStorage  sj.wallpaper = 'off' | 'lite' | 'on'
 *   3. 静态检测      软件渲染（SwiftShader / Basic Render / llvmpipe）→ 直接轻档
 *   4. 帧率哨兵      首帧后 2.5s 起连测两段，都低于 42 帧 → 轻档并记住（sj.fx-lite）
 *
 * 为什么要分档（2026-10-17 真机实测，软件合成路径下滚动帧率）：
 *   现行 = 混合 + 23 张卡片磨砂 + 壁纸模糊 → 33.8 帧（更差的一次只有 16.3 帧）
 *   去掉卡片磨砂 → 60.3 帧；再去掉混合/壁纸模糊 → 仍是 60.3 帧
 *   即元凶只有内容卡片的 backdrop-filter（大面积模糊每帧重算），混合几乎免费。
 *   所以轻档只砍卡片磨砂 + 混合，壁纸氛围保留。
 *
 * 看板娘（js/live2d.js）会 await window.__fxTier.done：轻档就不拉那 1.9MB。
 */
(function () {
  'use strict';

  const KEY = 'sj.wallpaper';
  const REMEMBER = 'sj.fx-lite';
  const SRC = 'assets/images/wallpaper.webp';
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

  // ---- 3. 壁纸层（图能加载才挂）----
  const img = new Image();
  img.onload = () => {
    if (!img.naturalWidth) return publish(mode || 'full');      // 坏图：不挂壁纸
    apply(mode || 'full');
    root.classList.add('has-wallpaper');
    if (mode) publish(mode);
    else sentinel();                                           // 未定档 → 起哨兵
  };
  img.onerror = () => publish(mode || 'full');
  img.src = SRC;

  // 软件渲染判定：拿 WebGL 的 unmasked renderer 字符串
  function isSoftwareRenderer() {
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      if (!gl) return true;                                    // 连 WebGL 都没有，按弱机处理
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
