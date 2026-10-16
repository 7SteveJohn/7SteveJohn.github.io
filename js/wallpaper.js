/**
 * 背景壁纸层（深空壁纸 + 推理场叠加）
 * ----------------------------------------------------
 * - 只在图片真能加载出来时才挂 html.has-wallpaper：图缺失 / 被删 / 网络失败
 *   一律保持今天的观感，不做任何降级提示（零回归、可回滚）
 * - 图片是 CSS 里 ../assets/images/wallpaper.webp；换壁纸直接替换那个文件即可
 * - localStorage 'sj.wallpaper' = 'off' 时不启用（控制台可随时关掉对比）
 * - 层本身 position:fixed + 模糊 + transform:scale，纯静态，不参与滚动与交互
 */
(function () {
  'use strict';

  const KEY = 'sj.wallpaper';
  const SRC = 'assets/images/wallpaper.webp';
  const root = document.documentElement;

  let off = false;
  try { off = localStorage.getItem(KEY) === 'off'; } catch (e) { /* 隐私模式：当作开 */ }
  if (off) return;

  const img = new Image();
  img.onload = () => {
    // 0 宽高说明解出来是坏图，宁可不着壁纸
    if (img.naturalWidth > 0) root.classList.add('has-wallpaper');
  };
  img.onerror = () => {};
  img.src = SRC;
})();
