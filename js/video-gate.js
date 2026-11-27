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

  // 近屏元信息 + 悬停/触控/聚焦关键帧预热：
  // 1. 首屏所有视频保持 preload=none（零首屏带宽消耗）
  // 2. 用户滚动进入卡片附近（rootMargin 600px）升级为 preload=metadata
  // 3. 指针悬停 / 触控 / 聚焦卡片或 .cover-box 时立即升级 preload=auto 缓冲起播关键帧，
  //    canplay 后（或 8s 兜底）在仍暂停态回落到 metadata（保留已缓冲帧与解码器就绪，不再退回 none）
  // 2G / 省流量模式不执行 auto 预热。
  const canWarm = () => {
    const c = navigator.connection;
    return !(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
  };
  let metaScheduled = false;

  function promoteMetadata(v) {
    if (!v) return;
    if (v.preload === 'none') {
      v.preload = 'metadata';
    }
  }

  function warm(v) {
    if (!canWarm() || !v || v.dataset.warmed === '1' || !v.paused || v.dataset.opening === '1') return;
    v.dataset.warmed = '1';
    // 若已达到 HAVE_FUTURE_DATA（readyState >= 3），说明起播关键帧已就绪，直接保持 metadata 即可
    if (v.readyState >= 3) {
      if (v.preload !== 'metadata') v.preload = 'metadata';
      return;
    }
    v.preload = 'auto';
    let settled = false;
    const dialBack = () => {
      if (settled) return;
      settled = true;
      v.removeEventListener('canplay', dialBack);
      if (v.paused && v.dataset.opening !== '1') {
        v.preload = 'metadata';   // 保留已缓冲起播帧与元数据，绝不回落到 none
      }
    };
    v.addEventListener('canplay', dialBack, { once: true });
    if (v.readyState >= 3) dialBack();
    else setTimeout(dialBack, 8000);
  }

  function scheduleMetadata() {
    if (metaScheduled || !('IntersectionObserver' in window)) return;
    metaScheduled = true;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const v = en.target.querySelector('video.cover-video');
        io.unobserve(en.target);
        promoteMetadata(v);
      });
    }, { rootMargin: '600px 0px' });
    document.querySelectorAll('#products .cover-box').forEach((box) => io.observe(box));
  }

  function init() {
    document.querySelectorAll('#products video.cover-video').forEach((v) => {
      if (v.dataset.playGate) return;
      v.dataset.playGate = '1';
      v.removeAttribute('controls');            // 播放前不显示原生控制条

      const box = v.closest('.cover-box') || v.parentElement;
      const card = v.closest('article[data-project-id]') || box;
      const layer = document.createElement('div');
      layer.className = 'video-play-gate';
      layer.setAttribute('aria-hidden', 'false');
      layer.innerHTML =
        '<button type="button" class="video-play-btn" aria-label="播放介绍视频">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
        '</button>';

      let openToken = 0;
      let fromGateClick = false;

      function close(force) {
        if (force) {
          openToken++;
          fromGateClick = false;
          delete v.dataset.opening;
        }
        if (!force && !layer.isConnected && !v.paused) return;
        if (!layer.isConnected) box.appendChild(layer);
        layer.classList.remove('is-loading');
        v.removeAttribute('controls');
      }

      function open() {
        if (v.dataset.opening === '1' || !v.paused) return;
        const myToken = ++openToken;
        fromGateClick = true;
        // 先标 opening + 通知互斥层暂停音乐，再停其他视频并起播，彻底消除音视频重叠空窗
        v.dataset.opening = '1';
        try {
          window.dispatchEvent(new CustomEvent('sj-video-intent', { detail: { video: v } }));
        } catch (_) {}

        document.querySelectorAll('#products video').forEach((other) => {
          if (other === v) return;
          if (!other.paused || other.dataset.opening === '1') {
            delete other.dataset.opening;
            if (!other.paused) {
              try { other.pause(); } catch (_) {}
            }
            try {
              window.dispatchEvent(new CustomEvent('sj-video-force-stop', { detail: { video: other } }));
            } catch (_) {}
          }
        });

        // 海报先留着：等真正出画（playing）再撤覆盖层，避免点完先闪一块黑。
        layer.classList.add('is-loading');
        v.preload = 'auto';
        v.setAttribute('controls', '');

        const p = v.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            if (openToken !== myToken) {
              delete v.dataset.opening;
              try { v.pause(); } catch (_) {}
              close(true);
            }
          }).catch(() => {
            const stillMine = (openToken === myToken);
            delete v.dataset.opening;
            close(true);
            if (stillMine) {
              try {
                window.dispatchEvent(new CustomEvent('sj-video-abort', { detail: { video: v } }));
              } catch (_) {}
            }
          });
        }
      }

      layer.addEventListener('click', open);
      v.addEventListener('playing', () => {
        if (v.paused) return;
        delete v.dataset.opening;
        layer.classList.remove('is-loading');
        if (layer.isConnected) layer.remove();
        if (!v.hasAttribute('controls')) v.setAttribute('controls', '');
        if (fromGateClick) {
          fromGateClick = false;
          try { v.focus({ preventScroll: true }); } catch (_) {}
        }
      });
      v.addEventListener('ended', () => {
        delete v.dataset.opening;
        close(true);
      });
      v.addEventListener('pause', () => {
        delete v.dataset.opening;
        close(true);
      });

      window.addEventListener('sj-video-force-stop', (ev) => {
        if (ev.detail && ev.detail.video === v) {
          openToken++;
          fromGateClick = false;
          delete v.dataset.opening;
          if (!v.paused) {
            try { v.pause(); } catch (_) {}
          }
          close(true);
        }
      });
      window.addEventListener('sj-video-abort', (ev) => {
        if (ev.detail && ev.detail.video === v) {
          openToken++;
          fromGateClick = false;
          delete v.dataset.opening;
          if (!v.paused) {
            try { v.pause(); } catch (_) {}
          }
          close(true);
        }
      });

      box.appendChild(layer);

      // 首屏保持 preload=none，避免初始载入抢跑下载视频
      if (v.preload !== 'none') {
        v.preload = 'none';
      }

      // 悬停 / 触控 / 聚焦产品卡片或视频视窗即刻预热关键帧
      const triggerWarm = () => warm(v);
      card.addEventListener('pointerenter', triggerWarm, { once: true, passive: true });
      card.addEventListener('touchstart', triggerWarm, { once: true, passive: true });
      card.addEventListener('focusin', triggerWarm, { once: true, passive: true });
    });

    // 只在用户开始浏览（滚动）后再挂近屏 metadata 预加载：首屏零带宽消耗
    const arm = () => scheduleMetadata();
    window.addEventListener('scroll', arm, { once: true, passive: true });
    if (window.scrollY > 0) arm();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
