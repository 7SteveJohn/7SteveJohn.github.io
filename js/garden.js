/**
 * 花园框架（garden.html）
 * ----------------------------------------------------
 * 一个页面里装几个 canvas 玩具，任何时刻只跑一个 rAF 循环 —— 这是硬约束：
 * 站点背景本来就有推理场/粒子在跑，花园再加循环必须互相让路。
 *
 * 玩具（js/garden/*.js）只需注册：
 *   window.GardenToys.push({
 *     id, name, hint,
 *     controls()            → 控制条描述数组（挂载时调用一次，可闭包访问内部状态）
 *     setup(env)            → 初始化（env 提供 canvas/ctx/w/h/dpr/reduced/drawOnce）
 *     draw(t, dt)           → 每帧绘制；reduced 时只在 setup 后与交互后各画一次
 *     pointer(type, x, y)   → 可选：针指交互（type: down/move/up，坐标已扣掉画布偏移）
 *     key(e)                → 可选：键盘；返回 true 表示已消费
 *     teardown()            → 可选：切走时清理定时器/状态
 *   });
 *
 * 框架负责：DPR 自适应、尺寸跟随容器（ResizeObserver）、标签页隐藏时停帧、
 * hash 切换（#life / #sorting / #stars）、控制条 DOM、减少动效兜底。
 */
(function () {
  'use strict';

  const host = document.getElementById('garden-stage');
  const switcher = document.getElementById('garden-tabs');
  const controls = document.getElementById('garden-controls');
  const titleEl = document.getElementById('garden-title');
  const hintEl = document.getElementById('garden-hint');
  const fpsEl = document.getElementById('garden-fps');
  if (!host || !switcher) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'garden-canvas';
  canvas.setAttribute('aria-label', '交互演示画布');
  canvas.setAttribute('role', 'img');
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const toys = window.GardenToys || [];
  if (!toys.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let active = null;          // 当前玩具
  let raf = 0;
  let last = 0;
  let frames = 0;
  let fpsAt = 0;

  const env = {
    canvas,
    ctx,
    w: 0,
    h: 0,
    dpr: 1,
    reduced,
    drawOnce: () => { if (active) active.draw(performance.now(), 0); }
  };

  // ---- 尺寸：CSS 像素 × DPR，玩具只按 env.w/h 画 ----
  function sizeCanvas() {
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    env.w = Math.max(1, Math.round(rect.width));
    env.h = Math.max(1, Math.round(rect.height));
    env.dpr = dpr;
    canvas.width = Math.round(env.w * dpr);
    canvas.height = Math.round(env.h * dpr);
    canvas.style.width = env.w + 'px';
    canvas.style.height = env.h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- 控制条：由玩具的 controls() 描述生成 ----
  function buildControls(toy) {
    controls.textContent = '';
    const list = (typeof toy.controls === 'function' ? toy.controls() : []) || [];
    list.forEach((c) => {
      if (c.type === 'range') {
        const wrap = document.createElement('label');
        wrap.className = 'garden-ctl';
        const span = document.createElement('span');
        span.textContent = c.label;
        const input = document.createElement('input');
        input.type = 'range';
        input.min = c.min;
        input.max = c.max;
        input.step = c.step || 1;
        input.value = c.value;
        const out = document.createElement('output');
        out.textContent = c.format ? c.format(c.value) : c.value;
        input.addEventListener('input', () => {
          out.textContent = c.format ? c.format(input.value) : input.value;
          if (c.onInput) c.onInput(Number(input.value));
          env.drawOnce();
        });
        wrap.append(span, input, out);
        controls.appendChild(wrap);
        return;
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'garden-btn';
      btn.textContent = c.label;
      if (c.toggle) {
        btn.setAttribute('aria-pressed', String(!!c.initial));
        btn.classList.toggle('is-on', !!c.initial);
        btn.addEventListener('click', () => {
          const on = btn.getAttribute('aria-pressed') !== 'true';
          btn.setAttribute('aria-pressed', String(on));
          btn.classList.toggle('is-on', on);
          if (c.onToggle) c.onToggle(on, btn);
          env.drawOnce();
        });
      } else {
        btn.addEventListener('click', () => {
          if (c.onClick) c.onClick(btn);
          env.drawOnce();
        });
      }
      controls.appendChild(btn);
    });
  }

  // ---- 切换玩具 ----
  function mount(toy) {
    if (active) {
      stopLoop();
      if (active.teardown) active.teardown();
    }
    active = toy;
    host.dataset.toy = toy.id;
    if (titleEl) titleEl.textContent = toy.name;
    if (hintEl) hintEl.textContent = toy.hint || '';
    sizeCanvas();
    buildControls(toy);
    [...switcher.children].forEach((b) => {
      const on = b.dataset.toy === toy.id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    toy.setup(env);
    if (reduced) {
      env.drawOnce();                       // 减少动效：只画一帧，交互时再补
    } else {
      startLoop();
    }
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = t; return; }
    const dt = Math.min(60, t - last);
    last = t;
    active.draw(t, dt);
    frames++;
    if (t - fpsAt > 800) {
      if (fpsEl) fpsEl.textContent = Math.round((frames * 1000) / (t - fpsAt)) + ' fps';
      frames = 0;
      fpsAt = t;
    }
  }
  function startLoop() {
    stopLoop();
    last = performance.now();
    fpsAt = last;
    frames = 0;
    raf = requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (fpsEl) fpsEl.textContent = '';
  }

  // 标签页切回时恢复（隐藏期间不占帧）
  document.addEventListener('visibilitychange', () => {
    if (!active || reduced) return;
    if (document.hidden) stopLoop();
    else startLoop();
  });

  // ---- 交互转发 ----
  const localPos = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    if (active && active.pointer) active.pointer('down', ...localPos(e));
  });
  canvas.addEventListener('pointermove', (e) => {
    if (active && active.pointer) active.pointer(e.buttons ? 'move' : 'hover', ...localPos(e));
  });
  canvas.addEventListener('pointerup', (e) => {
    if (active && active.pointer) active.pointer('up', ...localPos(e));
  });
  document.addEventListener('keydown', (e) => {
    if (!active || !active.key) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName)) return;
    if (active.key(e) && e.preventDefault) e.preventDefault();
  });

  // ---- 尺寸变化 ----
  if ('ResizeObserver' in window) {
    let rt = 0;
    new ResizeObserver(() => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        sizeCanvas();
        if (active) {
          if (active.resize) active.resize(env);
          env.drawOnce();
        }
      }, 120);
    }).observe(host);
  }

  // ---- 切换器与 hash ----
  toys.forEach((toy) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'garden-tab';
    b.dataset.toy = toy.id;
    b.textContent = toy.name;
    b.addEventListener('click', () => {
      const same = active === toy;
      if (same) return;
      if (location.hash !== '#' + toy.id) history.replaceState(null, '', '#' + toy.id);
      mount(toy);
    });
    switcher.appendChild(b);
  });

  const wanted = (location.hash || '').replace('#', '');
  mount(toys.find((t) => t.id === wanted) || toys[0]);
  window.addEventListener('hashchange', () => {
    const id = (location.hash || '').replace('#', '');
    const toy = toys.find((t) => t.id === id);
    if (toy && toy !== active) mount(toy);
  });
})();
