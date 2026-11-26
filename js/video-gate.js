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

  // 近屏预热：只把起播需要的一小段缓冲好（canplay 即停），换取点击零等待。
  // 2G / 省流量模式不预热——这类链路上多拉 100KB 比多等半秒更明显。
  const canWarm = (() => {
    const c = navigator.connection;
    return !(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
  })();
  let warmScheduled = false;

  function warm(v) {
    if (!canWarm || !v || v.dataset.warmed) return;
    v.dataset.warmed = '1';
    v.preload = 'auto';
    const stop = () => {
      v.removeEventListener('canplay', stop);
      if (v.paused) v.preload = 'none';      // 够起播就收手，不把整支片拉完
    };
    v.addEventListener('canplay', stop);
    setTimeout(stop, 10000);
  }

  function scheduleWarm() {
    if (warmScheduled || !('IntersectionObserver' in window)) return;
    warmScheduled = true;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const v = en.target.querySelector('video.cover-video');
        io.unobserve(en.target);
        warm(v);
      });
    }, { rootMargin: '100% 0px' });
    document.querySelectorAll('#products .cover-box').forEach((box) => io.observe(box));
  }

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

      let opening = false;
      function open() {
        if (opening) return;
        opening = true;
        // 海报先留着：等真正出画（playing）再撤覆盖层，避免点完先闪一块黑。
        layer.classList.add('is-loading');
        v.preload = 'auto';
        v.setAttribute('controls', '');
        const reveal = () => {
          v.removeEventListener('playing', reveal);
          opening = false;
          layer.remove();
          v.focus({ preventScroll: true });     // 键盘用户焦点落回视频
        };
        v.addEventListener('playing', reveal);
        v.play().catch(() => {                  // 用户手势内，直接起播
          opening = false;
          layer.classList.remove('is-loading');
          v.removeAttribute('controls');
        });
      }
      function close() {
        if (!layer.isConnected && !v.paused) return;
        if (!layer.isConnected) box.appendChild(layer);
        layer.classList.remove('is-loading');
        v.removeAttribute('controls');
      }
      layer.addEventListener('click', open);
      v.addEventListener('ended', close);
      v.addEventListener('pause', close);       // 暂停也收回控制条，回到海报态
      box.appendChild(layer);

      // 点击播放前保持 preload=none，避免浏览页面时后台抢跑下载 20MB+ 视频
      if (v.preload !== 'none') {
        v.preload = 'none';
      }

      // 桌面端悬停即视为播放意图，比 IntersectionObserver 再早一步
      box.addEventListener('pointerenter', () => warm(v), { once: true });
    });

    // 等首屏稳定后再预热，别和 FCP 抢带宽
    const kick = () => setTimeout(scheduleWarm, 800);
    if (document.readyState === 'complete') kick();
    else window.addEventListener('load', kick, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
