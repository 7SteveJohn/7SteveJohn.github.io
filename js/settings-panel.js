/**
 * 显示设置面板（左下角齿轮）
 * ----------------------------------------------------
 * 把散在各个脚本里的 sj.* 开关与壁纸观感做成可点的 UI（参考站 SettingsPanel 的降维版：
 * 他做了 4 个鼠标特效开关，本站只留下真正影响观感与性能的几项）：
 *   · 效果档位     完整 / 轻档 / 关闭壁纸      → sj.wallpaper（与 ?fx= 覆盖共用同一套档位）
 *   · 壁纸模糊     0–26px 实时生效             → --wp-blur / sj.wp-blur
 *   · 壁纸亮度     30–100% 实时生效            → --wp-dim  / sj.wp-dim
 *   · 粒子层       开 / 关                     → sj.particles
 *   · 推理场       开 / 关                     → sj.cosmos
 *   · 看板娘       开 / 关                     → sj.live2d
 *   · 一键还原     清掉以上全部键并刷新
 *
 * 为什么有的项要刷新：粒子与推理场是各自脚本启动时的早退开关，看板娘由启动档位决定，
 * 都在页面加载阶段定死；面板对它们做「立即隐藏 + 提示刷新才彻底停」，不做假实时。
 *
 * 位置：左下角。右下已被看板娘/回到顶部/底部居中的音乐 FAB 占满，左上被星场 HUD 角标占。
 * 无障碍：role=dialog + aria-modal、Esc 关闭、焦点进/出、prefers-reduced-motion 不做位移。
 */
(function () {
  'use strict';

  const CFG = window.SITE_CONFIG || {};
  const root = document.documentElement;

  const K = {
    tier: 'sj.wallpaper',        // 'on' | 'lite' | 'off'
    blur: 'sj.wp-blur',
    dim: 'sj.wp-dim',
    particles: 'sj.particles',   // 'on' | 'off'
    cosmos: 'sj.cosmos',
    live2d: 'sj.live2d',
    lite: 'sj.fx-lite'           // 帧率哨兵记住的「这台机器弱」
  };

  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* 无痕模式：本次生效 */ } };

  // ---- 立即生效的部分（不刷新也能看到）----
  function applyFlags() {
    root.classList.toggle('fx-no-particles', get(K.particles) === 'off');
    root.classList.toggle('fx-no-cosmos', get(K.cosmos) === 'off');
    root.classList.toggle('fx-no-live2d', get(K.live2d) === 'off');
  }

  function applyTier(tier) {
    if (tier === 'off') {
      root.classList.remove('has-wallpaper');
      return;
    }
    root.classList.add('has-wallpaper');
    root.classList.toggle('wallpaper-lite', tier === 'lite');
  }

  function applyBlur(v) { if (v !== null) root.style.setProperty('--wp-blur', v + 'px'); }
  function applyDim(v) { if (v !== null) root.style.setProperty('--wp-dim', v); }

  applyFlags();

  // 当前档位：显式设置优先；没设过就看运行时的判定结果（可能是哨兵判的轻档）
  const currentTier = () => {
    const saved = get(K.tier);
    if (saved === 'off' || saved === 'lite') return saved;
    if (saved === 'on') return 'on';
    return (window.__fxTier && window.__fxTier.tier === 'lite') ? 'lite' : 'on';
  };
  const autoWeak = () => !get(K.tier) && get(K.lite) === '1';

  // ---------------- DOM ----------------
  const gear = document.createElement('button');
  gear.id = 'fx-open';
  gear.type = 'button';
  gear.className = 'fx-open glass-spec';
  gear.title = '显示设置';
  gear.setAttribute('aria-label', '显示设置');
  gear.setAttribute('aria-expanded', 'false');
  gear.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">'
    + '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-2.9 1.2v.17a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-2.94-1.2l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6h.08A1.7 1.7 0 0 0 10.6 3.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 16.1 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 20.4 9v.08a1.7 1.7 0 0 0 1.5 1.52H22a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/></svg>';

  const panel = document.createElement('div');
  panel.id = 'fx-panel';
  panel.className = 'fx-panel glass-spec';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', '显示设置');
  panel.innerHTML = [
    '<div class="fx-head">',
    '  <b>显示设置</b>',
    '  <button type="button" class="fx-close" aria-label="关闭设置">',
    '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    '  </button>',
    '</div>',
    '<div class="fx-body">',
    '  <div class="fx-row fx-row-col">',
    '    <span class="fx-label">效果档位</span>',
    '    <div class="fx-seg" role="radiogroup" aria-label="效果档位">',
    '      <button type="button" data-tier="on" role="radio">完整</button>',
    '      <button type="button" data-tier="lite" role="radio">轻档</button>',
    '      <button type="button" data-tier="off" role="radio">关闭</button>',
    '    </div>',
    '    <p class="fx-hint" id="fx-tier-hint"></p>',
    '  </div>',
    '  <label class="fx-row">',
    '    <span class="fx-label">壁纸模糊</span>',
    '    <input type="range" id="fx-blur" min="0" max="26" step="1" />',
    '    <output class="fx-val" id="fx-blur-val"></output>',
    '  </label>',
    '  <label class="fx-row">',
    '    <span class="fx-label">壁纸亮度</span>',
    '    <input type="range" id="fx-dim" min="30" max="100" step="1" />',
    '    <output class="fx-val" id="fx-dim-val"></output>',
    '  </label>',
    '  <label class="fx-row fx-row-sw">',
    '    <span class="fx-label">粒子层</span>',
    '    <input type="checkbox" id="fx-particles" /><span class="fx-sw" aria-hidden="true"></span>',
    '  </label>',
    '  <label class="fx-row fx-row-sw">',
    '    <span class="fx-label">推理场</span>',
    '    <input type="checkbox" id="fx-cosmos" /><span class="fx-sw" aria-hidden="true"></span>',
    '  </label>',
    // 看板娘暂时下线（site-config.js 的 live2d=false）：整行藏起来，免得点了没反应。
    // 元素留在 DOM 里而不是不渲染——下面还有 4 处引用 elLive2d，摘掉要连带改判空，不划算
    '  <label class="fx-row fx-row-sw"' + (CFG.live2d === false ? ' style="display:none"' : '') + '>',
    '    <span class="fx-label">看板娘</span>',
    '    <input type="checkbox" id="fx-live2d" /><span class="fx-sw" aria-hidden="true"></span>',
    '  </label>',
    '</div>',
    '<p class="fx-note" id="fx-note" hidden>改开关后刷新页面才彻底生效（会停止/启动对应引擎）。</p>',
    '<div class="fx-foot">',
    '  <button type="button" class="fx-reset" id="fx-reset">一键还原默认</button>',
    '  <a class="fx-about" href="' + (CFG.github || '#') + '" target="_blank" rel="noopener noreferrer">GitHub</a>',
    '</div>'
  ].join('\n');

  document.body.append(gear, panel);

  // ---------------- 控件取值 ----------------
  const elBlur = panel.querySelector('#fx-blur');
  const elDim = panel.querySelector('#fx-dim');
  const elParticles = panel.querySelector('#fx-particles');
  const elCosmos = panel.querySelector('#fx-cosmos');
  const elLive2d = panel.querySelector('#fx-live2d');
  const elHint = panel.querySelector('#fx-tier-hint');
  const elNote = panel.querySelector('#fx-note');

  const cssVar = (name, fallback) => {
    const v = getComputedStyle(root).getPropertyValue(name).trim();
    return v || fallback;
  };

  // 初始值：优先用户存过的，其次 CSS 默认
  const initBlur = get(K.blur) !== null ? Number(get(K.blur)) : parseFloat(cssVar('--wp-blur', '18px'));
  const initDim = get(K.dim) !== null ? Math.round(Number(get(K.dim)) * 100) : Math.round(parseFloat(cssVar('--wp-dim', '0.6')) * 100);

  elBlur.value = String(Math.max(0, Math.min(26, isFinite(initBlur) ? initBlur : 18)));
  elDim.value = String(Math.max(30, Math.min(100, isFinite(initDim) ? initDim : 60)));
  const paintVals = () => {
    panel.querySelector('#fx-blur-val').textContent = elBlur.value + 'px';
    panel.querySelector('#fx-dim-val').textContent = elDim.value + '%';
  };
  paintVals();

  elParticles.checked = get(K.particles) !== 'off';
  elCosmos.checked = get(K.cosmos) !== 'off';
  elLive2d.checked = get(K.live2d) !== 'off';

  function paintTier() {
    const t = currentTier();
    panel.querySelectorAll('[data-tier]').forEach((b) => {
      const on = b.dataset.tier === t;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(on));
    });
    elHint.textContent = autoWeak()
      ? '这台机器被判定为吃不动重效果（已自动用轻档）；想要完整效果可点「完整」。'
      : (t === 'lite' ? '轻档：保留壁纸氛围，不做混合与卡片磨砂，也不加载看板娘。' : '');
  }
  paintTier();

  const needReload = (flag) => { if (flag) elNote.hidden = false; };

  // ---------------- 事件 ----------------
  panel.querySelectorAll('[data-tier]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tier = btn.dataset.tier;
      set(K.tier, tier);
      if (tier === 'on') set(K.lite, '0');       // 显式要完整效果：清掉「弱机」记忆
      if (tier === 'lite') set(K.lite, '1');
      applyTier(tier);
      if (tier === 'off') set(K.lite, '0');
      paintTier();
      needReload(true);                          // 看板娘/混合模式的启停要刷新
    });
  });

  elBlur.addEventListener('input', () => {
    root.style.setProperty('--wp-blur', elBlur.value + 'px');
    set(K.blur, elBlur.value);
    paintVals();
  });
  elDim.addEventListener('input', () => {
    const v = (Number(elDim.value) / 100).toFixed(2);
    root.style.setProperty('--wp-dim', v);
    set(K.dim, v);
    paintVals();
  });

  const flagBind = (el, key, cls) => {
    el.addEventListener('change', () => {
      const off = !el.checked;
      set(key, off ? 'off' : 'on');
      root.classList.toggle(cls, off);
      if (key === K.live2d && !off && window.__fxTier && window.__fxTier.tier !== 'lite') {
        // 重新打开看板娘：已加载出来就直接显示，没加载的走刷新
        const w = document.getElementById('waifu');
        if (w && w.classList.contains('waifu-active')) root.classList.remove('fx-no-live2d');
        else needReload(true);
      } else {
        needReload(true);
      }
    });
  };
  flagBind(elParticles, K.particles, 'fx-no-particles');
  flagBind(elCosmos, K.cosmos, 'fx-no-cosmos');
  flagBind(elLive2d, K.live2d, 'fx-no-live2d');

  panel.querySelector('#fx-reset').addEventListener('click', () => {
    [K.tier, K.blur, K.dim, K.particles, K.cosmos, K.live2d, K.lite].forEach((k) => set(k, null));
    location.reload();
  });

  // ---------------- 开合与焦点 ----------------
  let lastFocus = null;
  function open() {
    lastFocus = document.activeElement;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    gear.setAttribute('aria-expanded', 'true');
    panel.querySelector('.fx-close').focus({ preventScroll: true });
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onOutside, true);
  }
  function close() {
    panel.classList.remove('is-open');
    gear.setAttribute('aria-expanded', 'false');
    const finish = () => { panel.hidden = true; };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else setTimeout(finish, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onOutside, true);
  }
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  const onOutside = (e) => {
    if (panel.hidden || panel.contains(e.target) || gear.contains(e.target)) return;
    close();
  };

  gear.addEventListener('click', () => (panel.hidden ? open() : close()));
  panel.querySelector('.fx-close').addEventListener('click', close);
})();
