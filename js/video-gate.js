/**
 * 介绍视频「海报 + 播放键」体验（2026-09-30，C1）
 * ----------------------------------------------------
 * 播放前：视频不带原生 controls（黑底控制条与卡片气质不搭），海报上叠一枚居中
 * 圆形播放键；点击后移除覆盖层并唤出原生控件 + 播放。视频结束/暂停时恢复覆盖层。
 * 纯渐进增强：JS 失效时视频仍有原生 controls 属性吗——不，本脚本会把 controls 摘下，
 * 所以必须在 DOMContentLoaded 即执行；视频点不了的概率（JS 全挂）可接受（站内脚本全 defer）。
 * 与视频×音乐互斥（player.js）天然协同：本模块只动覆盖层，不碰 play/pause 链。
 */
(function () {
  'use strict';
  function init() {
    document.querySelectorAll('#products video.cover-video').forEach((v) => {
      if (v.dataset.playGate) return;
      v.dataset.playGate = '1';
      v.removeAttribute('controls');            // 播放前不显示原生控制条

      const layer = document.createElement('div');
      layer.className = 'video-play-gate';
      layer.setAttribute('aria-hidden', 'false');
      layer.innerHTML =
        '<button type="button" class="video-play-btn" aria-label="播放介绍视频">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
        '</button>';

      function open() {
        layer.remove();
        v.setAttribute('controls', '');
        v.play().catch(() => {});               // 用户手势内，直接起播
        v.focus({ preventScroll: true });       // 键盘用户焦点落回视频
      }
      function close() {
        if (!layer.isConnected) {
          v.removeAttribute('controls');
          v.appendChild(layer);
        }
      }
      layer.addEventListener('click', open);
      v.addEventListener('ended', close);
      v.addEventListener('pause', close);       // 暂停也收回控制条，回到海报态
      v.addEventListener('play', () => { if (layer.isConnected) layer.remove(); });
      v.appendChild(layer);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
