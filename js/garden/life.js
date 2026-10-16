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
