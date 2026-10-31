// build-bundles: {"name":"garden","version":"0806595823a7","sources":[{"path":"js/garden/life.js","sha256":"52284d428327bd3d7199fb10b63fba64f50b8a8daf482a14d294fca8d45a50d9"},{"path":"js/garden/sorting.js","sha256":"12527e06167eb44b0de27174246c5fd3351c0fea7f7ccba3147be52e066eb195"},{"path":"js/garden/stars.js","sha256":"c404e439cda44595690fe82be8428d84c120a8c9982ba030b531ac86cf0a2916"},{"path":"js/garden.js","sha256":"81ddfd4d8ff1a8927f481abca8d48203618f0fdbf0e16ac49c5b1173a379db40"}]}
/* 仅花园：三个玩具 → 框架（顺序敏感）
   ❗生成物：由 node scripts/build-bundles.mjs 从下列源文件拼接，请改源文件后重建。
   源文件顺序：js/garden/life.js → js/garden/sorting.js → js/garden/stars.js → js/garden.js */

// ---- js/garden/life.js (52284d428327) ----
/**
 * 花园玩具 ①：康威生命游戏
 * ----------------------------------------------------
 * - Uint8Array 双缓冲 + 环形边界邻居计数（O(n)，10px 格在 1440 宽下约 1.4 万格）
 * - 指针画线：按下拖动能连续置活；空格播放/暂停，R 随机，C 清空
 * - 代数画在画布角落，不走 DOM，避免每帧改文本触发重排
 */
(function () {
  'use strict';
  window.GardenToys = window.GardenToys || [];

  const CELL = 10;              // 目标格宽（实际按容器宽度取整后再算列数）
  const ALIVE = 'rgba(143, 184, 255, 0.92)';
  const GRID = 'rgba(255, 255, 255, 0.05)';

  let env = null;
  let cols = 0, rows = 0, cw = CELL, ch = CELL;
  let cur = null, next = null;
  let playing = true;
  let speed = 8;                // 代/秒
  let acc = 0;
  let gen = 0;
  let painting = 0;             // 1 = 置活，2 = 抹掉

  function blank() { return new Uint8Array(cols * rows); }

  function alloc() {
    cols = Math.max(8, Math.floor(env.w / CELL));
    rows = Math.max(8, Math.floor(env.h / CELL));
    cw = env.w / cols;
    ch = env.h / rows;
    cur = blank();
    next = blank();
    gen = 0;
    randomize(0.22);
  }

  function randomize(density) {
    for (let i = 0; i < cur.length; i++) cur[i] = Math.random() < density ? 1 : 0;
    gen = 0;
  }

  function step() {
    const at = (x, y) => cur[((y + rows) % rows) * cols + ((x + cols) % cols)];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const n = at(x - 1, y - 1) + at(x, y - 1) + at(x + 1, y - 1)
          + at(x - 1, y) + at(x + 1, y)
          + at(x - 1, y + 1) + at(x, y + 1) + at(x + 1, y + 1);
        const alive = cur[y * cols + x];
        next[y * cols + x] = (alive && (n === 2 || n === 3)) || (!alive && n === 3) ? 1 : 0;
      }
    }
    const t = cur; cur = next; next = t;
    gen++;
  }

  function paint(now) {
    const { ctx } = env;
    ctx.clearRect(0, 0, env.w, env.h);

    // 网格：只在格子够大时画，避免密格子变成一片灰
    if (cw >= 7) {
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 1; x < cols; x++) { ctx.moveTo(x * cw, 0); ctx.lineTo(x * cw, env.h); }
      for (let y = 1; y < rows; y++) { ctx.moveTo(0, y * ch); ctx.lineTo(env.w, y * ch); }
      ctx.stroke();
    }

    ctx.fillStyle = ALIVE;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!cur[y * cols + x]) continue;
        ctx.fillRect(x * cw + 0.6, y * ch + 0.6, Math.max(1, cw - 1.2), Math.max(1, ch - 1.2));
      }
    }

    ctx.fillStyle = 'rgba(185, 200, 255, 0.75)';
    ctx.font = '12px ui-monospace, Consolas, monospace';
    ctx.fillText(`第 ${gen} 代 · ${cols}×${rows}`, 10, 18);
    ctx.fillText(playing ? '运行中' : '已暂停', 10, 34);
    void now;
  }

  window.GardenToys.push({
    id: 'life',
    name: '生命游戏',
    hint: '康威生命游戏：拖动可画活细胞，空格播放/暂停，R 随机，C 清空。规则只有三条，却能长出滑翔机与振荡子。',

    controls() {
      return [
        { type: 'button', label: '暂停 / 播放', toggle: true, initial: playing, onToggle(on) { playing = on; } },
        { type: 'range', label: '速度', min: 1, max: 30, value: speed, format: (v) => v + ' 代/秒', onInput(v) { speed = v; } },
        { type: 'button', label: '随机', onClick() { randomize(0.22); } },
        { type: 'button', label: '清空', onClick() { cur.fill(0); gen = 0; } }
      ];
    },

    setup(e) {
      env = e;
      alloc();
    },

    resize(e) {
      env = e;
      const old = { cols, rows, cur: cur ? cur.slice() : null };
      alloc();
      // 尺寸变了就按新格子重铺（简单起见不搬迁旧状态，避免半张图错位）
      void old;
    },

    pointer(type, x, y) {
      if (!cur) return;
      const cx = Math.floor(x / cw), cy = Math.floor(y / ch);
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
      if (type === 'down') {
        painting = cur[cy * cols + cx] ? 2 : 1;
      }
      if (type === 'up') { painting = 0; return; }
      if (type === 'hover') return;
      cur[cy * cols + cx] = painting === 2 ? 0 : 1;
    },

    key(e) {
      if (e.code === 'Space') { playing = !playing; return true; }
      if (e.key === 'r' || e.key === 'R') { randomize(0.22); return true; }
      if (e.key === 'c' || e.key === 'C') { cur.fill(0); gen = 0; return true; }
      return false;
    },

    draw(t, dt) {
      if (env.reduced) { paint(t); return; }
      if (playing) {
        acc += dt;
        const period = 1000 / speed;
        let guard = 0;
        while (acc >= period && guard++ < 4) { step(); acc -= period; }
      }
      paint(t);
    },

    teardown() { painting = 0; }
  });
})();

;

// ---- js/garden/sorting.js (12527e06167e) ----
/**
 * 花园玩具 ②：排序可视化
 * ----------------------------------------------------
 * - 算法写成生成器，每 yield 一步（比较 / 交换 / 落位），框架按速度逐步消费 ——
 *   既能"一步一步看"，也能"一帧跑几十步"（不会因为整趟跑完而看不到过程）
 * - 三种算法：冒泡 / 插入 / 快速（非递归，显式栈）
 * - 颜色沿用站点令牌：常规灰、比较=星光蓝、交换=暖色、已落位=绿
 */
(function () {
  'use strict';
  window.GardenToys = window.GardenToys || [];

  const C = {
    idle: 'rgba(134, 134, 139, 0.55)',
    cmp: '#C2D96B',
    swap: '#FF453A',
    done: '#30D158',
    text: 'rgba(185, 200, 255, 0.75)'
  };

  let env = null;
  let n = 48;
  let values = [];
  let it = null;                // 当前算法的生成器
  let cur = { i: -1, j: -1, k: -1 };
  let done = false;
  let playing = true;
  let speed = 12;               // 每秒步数（<=0 视作"尽快"）
  let acc = 0;
  let steps = 0;
  let algo = 'bubble';

  // ---- 算法：生成器逐个产出「做了什么」 ----
  function* bubble(a) {
    for (let i = 0; i < a.length - 1; i++) {
      for (let j = 0; j < a.length - 1 - i; j++) {
        yield { cmp: [j, j + 1] };
        if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; yield { swap: [j, j + 1] }; }
      }
      yield { sorted: a.length - 1 - i };
    }
    yield { sorted: 0 };
  }

  function* insertion(a) {
    for (let i = 1; i < a.length; i++) {
      let j = i;
      while (j > 0) {
        yield { cmp: [j - 1, j] };
        if (a[j - 1] > a[j]) { [a[j - 1], a[j]] = [a[j], a[j - 1]]; yield { swap: [j - 1, j] }; j--; }
        else break;
      }
      yield { sorted: 0 };
    }
  }

  function* quick(a) {
    const stack = [[0, a.length - 1]];
    const sortedSet = [];
    while (stack.length) {
      const [lo, hi] = stack.pop();
      if (lo >= hi) { if (lo === hi) yield { sorted: lo }; continue; }
      const pivot = a[hi];
      let i = lo;
      for (let j = lo; j < hi; j++) {
        yield { cmp: [j, hi] };
        if (a[j] < pivot) { [a[i], a[j]] = [a[j], a[i]]; if (i !== j) yield { swap: [i, j] }; i++; }
      }
      [a[i], a[hi]] = [a[hi], a[i]];
      yield { swap: [i, hi] };
      yield { sorted: i };
      sortedSet.push(i);
      stack.push([lo, i - 1], [i + 1, hi]);
    }
    for (let i = 0; i < a.length; i++) yield { sorted: i };
  }

  const ALGOS = { bubble: bubble, insertion: insertion, quick: quick };

  let sortedMarks = new Set();   // 已确认落位的下标（生成器 yield 出来的）

  function reset() {
    values = Array.from({ length: n }, () => 8 + Math.floor(Math.random() * 92));
    it = ALGOS[algo](values);
    cur = { i: -1, j: -1 };
    sortedMarks = new Set();
    done = false;
    steps = 0;
    acc = 0;
  }

  function pump(maxSteps) {
    if (done || !it) return;
    for (let s = 0; s < maxSteps; s++) {
      const r = it.next();
      steps++;
      if (r.done) { done = true; playing = false; return; }
      const v = r.value || {};
      if (v.cmp) { cur.i = v.cmp[0]; cur.j = v.cmp[1]; }
      else if (v.swap) { cur.i = v.swap[0]; cur.j = v.swap[1]; }
      else if (v.sorted !== undefined) { sortedMarks.add(v.sorted); cur.i = -1; cur.j = -1; }
    }
  }

  function paint() {
    const { ctx } = env;
    ctx.clearRect(0, 0, env.w, env.h);
    const pad = 12;
    const usable = env.w - pad * 2;
    const bh = (env.h - pad * 2) / values.length;
    const bw = Math.max(2, usable / values.length - 1);

    for (let i = 0; i < values.length; i++) {
      const h = (values[i] / 100) * (env.h - pad * 2);
      let color = C.idle;
      if (sortedMarks.has(i)) color = C.done;
      if (i === cur.i || i === cur.j) color = cur.i === cur.j ? C.swap : C.cmp;
      ctx.fillStyle = color;
      ctx.fillRect(pad + i * (bw + 1), env.h - pad - h, bw, h);
    }

    ctx.fillStyle = C.text;
    ctx.font = '12px ui-monospace, Consolas, monospace';
    const name = { bubble: '冒泡', insertion: '插入', quick: '快速' }[algo];
    ctx.fillText(`${name}排序 · ${values.length} 项 · 第 ${steps} 步` + (done ? ' · 完成' : ''), 12, 18);
  }

  window.GardenToys.push({
    id: 'sorting',
    name: '排序可视化',
    hint: '同一组随机数用三种算法排出来：蓝=正在比较，红=发生交换，绿=已落位。空格播放/暂停，R 重开。',

    controls() {
      return [
        { type: 'button', label: '冒泡', onClick() { algo = 'bubble'; reset(); } },
        { type: 'button', label: '插入', onClick() { algo = 'insertion'; reset(); } },
        { type: 'button', label: '快速', onClick() { algo = 'quick'; reset(); } },
        { type: 'button', label: '暂停 / 播放', toggle: true, initial: playing, onToggle(on) { playing = on; } },
        { type: 'range', label: '速度', min: 1, max: 120, value: speed, format: (v) => v + ' 步/秒', onInput(v) { speed = v; } },
        { type: 'range', label: '规模', min: 12, max: 140, value: n, format: (v) => v + ' 项', onInput(v) { n = v; reset(); } },
        { type: 'button', label: '打乱重来', onClick() { reset(); } }
      ];
    },

    setup(e) { env = e; reset(); },
    resize(e) { env = e; },

    key(e) {
      if (e.code === 'Space') { playing = !playing; return true; }
      if (e.key === 'r' || e.key === 'R') { reset(); return true; }
      return false;
    },

    draw() {
      if (env.reduced) { pump(1); paint(); return; }
      if (playing && !done) {
        acc += speed / 60;                 // speed 当作「每秒步数」摊到每帧
        const todo = Math.floor(acc);
        if (todo > 0) { acc -= todo; pump(Math.min(todo, 400)); }
      }
      paint();
    },

    teardown() { it = null; }
  });
})();

;

// ---- js/garden/stars.js (c404e439cda4) ----
/**
 * 花园玩具 ③：星空粒子
 * ----------------------------------------------------
 * - 三层视差：层越近越大越亮、漂移越快；鼠标移动给整场一个轻微视差偏移
 * - 闪烁用 sin 相位，不额外分配对象；拖尾模式用半透明覆盖代替清屏（零成本）
 * - 密度可控；减少动态效果时只画静止一帧
 */
(function () {
  'use strict';
  window.GardenToys = window.GardenToys || [];

  const LAYERS = [
    { count: 0.45, r: [0.5, 1.0], v: 8, alpha: 0.35 },
    { count: 0.35, r: [0.9, 1.6], v: 16, alpha: 0.6 },
    { count: 0.2, r: [1.4, 2.4], v: 28, alpha: 0.95 }
  ];

  let env = null;
  let stars = [];
  let density = 180;
  let parallax = true;
  let trail = false;
  let px = 0, py = 0;           // 归一化指针（-1..1）
  const tint = ['rgba(143, 184, 255, ', 'rgba(185, 200, 255, ', 'rgba(255, 255, 255, '];

  function spawn() {
    const per = Math.max(20, Math.round(density / LAYERS.length));
    stars = [];
    LAYERS.forEach((L, li) => {
      for (let i = 0; i < per; i++) {
        const depth = li / (LAYERS.length - 1);       // 0 远 → 1 近
        stars.push({
          layer: li,
          x: Math.random() * env.w,
          y: Math.random() * env.h,
          r: L.r[0] + Math.random() * (L.r[1] - L.r[0]),
          v: L.v * (0.6 + Math.random() * 0.8),
          a: L.alpha * (0.6 + Math.random() * 0.4),
          ph: Math.random() * Math.PI * 2,
          depth
        });
      }
    });
  }

  function paint(t) {
    const { ctx } = env;
    if (trail && !env.reduced) {
      ctx.fillStyle = 'rgba(3, 7, 18, 0.18)';         // 半透明覆盖 = 拖尾
      ctx.fillRect(0, 0, env.w, env.h);
    } else {
      ctx.clearRect(0, 0, env.w, env.h);
    }

    const ox = parallax ? px * 26 : 0;
    const oy = parallax ? py * 18 : 0;

    for (const s of stars) {
      const tw = env.reduced ? 1 : 0.65 + 0.35 * Math.sin(t / 900 + s.ph);
      ctx.beginPath();
      ctx.fillStyle = tint[s.layer] + (s.a * tw).toFixed(3) + ')';
      ctx.arc(s.x + ox * s.depth, s.y + oy * s.depth, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(185, 200, 255, 0.6)';
    ctx.font = '12px ui-monospace, Consolas, monospace';
    ctx.fillText(`${stars.length} 颗 · 视差${parallax ? '开' : '关'} · 拖尾${trail ? '开' : '关'}`, 12, 18);
  }

  function advance(dt) {
    for (const s of stars) {
      s.y += (s.v * dt) / 1000;
      s.x -= (s.v * 0.35 * dt) / 1000;
      if (s.y > env.h + 4) { s.y = -4; s.x = Math.random() * env.w; }
      if (s.x < -4) s.x = env.w + 4;
    }
  }

  window.GardenToys.push({
    id: 'stars',
    name: '星空粒子',
    hint: '三层视差的星场：鼠标移动会给整场一个轻微偏移，开「拖尾」后星星会留下走过的痕迹。',
    controls() {
      return [
        { type: 'range', label: '密度', min: 60, max: 480, value: density, format: (v) => v + ' 颗', onInput(v) { density = v; spawn(); } },
        { type: 'button', label: '视差', toggle: true, initial: parallax, onToggle(on) { parallax = on; } },
        { type: 'button', label: '拖尾', toggle: true, initial: trail, onToggle(on) { trail = on; } }
      ];
    },
    setup(e) {
      env = e;
      spawn();
    },
    resize(e) {
      env = e;
      spawn();
    },
    pointer(type, x, y) {
      px = (x / env.w) * 2 - 1;
      py = (y / env.h) * 2 - 1;
      if (type === 'up') { px = 0; py = 0; }
    },
    draw(t, dt) {
      if (!env.reduced) advance(dt);
      paint(t);
    }
  });
})();

;

// ---- js/garden.js (81ddfd4d8ff1) ----
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

