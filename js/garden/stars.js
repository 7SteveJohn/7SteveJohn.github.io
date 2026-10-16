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
