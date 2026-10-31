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
