/**
 * 介绍视频「海报 + 播放键」体验（2026-09-30，C1；同日修不显示 bug）
 * ----------------------------------------------------
 * 播放前：视频不带原生 controls（黑底控制条与卡片气质不搭），海报上叠一枚居中
 * 圆形播放键；点击后移除覆盖层并唤出原生控件 + 播放。视频结束/暂停时恢复覆盖层。
 * ⚠️ 覆盖层必须挂在 .cover-box 父容器上，不能做 <video> 的子元素——video 是
 *    替换元素，内部子元素渲染不一致（桌面 Chromium 显示、移动端内核直接 0×0
 *    不渲染，实测），这正是"视频播放键不见了"的根因。
 * 与视频×音乐互斥（player.js）天然协同：本模块只动覆盖层，不碰 play/pause 链。
 */
(function () {
  'use strict';
  function init() {
    document.querySelectorAll('#products video.cover-video').forEach((v) => {
      if (v.dataset.playGate) return;
      v.dataset.playGate = '1';
      v.removeAttribute('controls');            // 播放前不显示原生控制条

      const box = v.closest('.cover-box') || v.parentElement;
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
        if (!layer.isConnected && !v.paused) return;
        if (!layer.isConnected) box.appendChild(layer);
        v.removeAttribute('controls');
      }
      layer.addEventListener('click', open);
      v.addEventListener('ended', close);
      v.addEventListener('pause', close);       // 暂停也收回控制条，回到海报态
      v.addEventListener('play', () => { layer.remove(); });
      box.appendChild(layer);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
