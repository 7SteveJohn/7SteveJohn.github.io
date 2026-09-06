/**
 * 背景光粒子 (particles.js)
 * ----------------------------------------------------
 * 设计原则：背景服务主题，不抢主体（背景丰富但不杂乱）。
 * - 约 100 颗小光点，远近两层视差，缓慢漂移 + 微弱上浮 + 轻微闪烁
 * - 暗色主题为冷白光点，亮色主题为半透明品牌蓝点，随主题切换即时适配
 * - 鼠标 120px 范围内被轻推开，给页面"活着"的触感
 * - 仅 2D Canvas + requestAnimationFrame；标签页隐藏时浏览器自动暂停
 * - prefers-reduced-motion 用户完全不走动画，画布留空
 */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('particle-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  let W = 0;
  let H = 0;
  let particles = [];
  let partyUntil = 0; // Konami 彩蛋：彩色庆典模式截止时间
  const mouse = { x: -9999, y: -9999 };

  // 键盘彩蛋钩子：app.js 的 Konami 序列会调用，粒子变彩色庆祝 20 秒
  window.particlesParty = function (seconds) {
    partyUntil = performance.now() + (seconds || 20) * 1000;
  };

  function spawn(x, y) {
    const depth = Math.random(); // 0 = 远景（小/暗/慢），1 = 近景（大/亮/快）
    return {
      x,
      y,
      r: 0.6 + depth * 1.5,
      vx: (Math.random() - 0.5) * 0.18 * (0.4 + depth),
      vy: (Math.random() - 0.5) * 0.18 * (0.4 + depth) - 0.03,
      tw: Math.random() * Math.PI * 2,
      tws: 0.008 + Math.random() * 0.02,
      depth
    };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.min(Math.round((W * H) / 16000), 130);
    particles = Array.from({ length: target }, () => spawn(Math.random() * W, Math.random() * H));
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    const dark = document.documentElement.classList.contains('dark');

    for (const p of particles) {
      // 鼠标 120px 范围内轻推开
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 14400 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = (1 - d / 120) * 0.35;
        p.x += (dx / d) * f;
        p.y += (dy / d) * f;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.tw += p.tws;

      // 边缘环绕
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;

      const alpha = (dark ? 0.35 : 0.16) * (0.55 + 0.45 * Math.sin(p.tw)) * (0.4 + p.depth * 0.6);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      if (performance.now() < partyUntil) {
        // 彩蛋模式：每颗粒子按相位在色轮上流转
        const hue = (p.tw * 40) % 360;
        ctx.fillStyle = `hsla(${hue.toFixed(0)}, 90%, 65%, ${Math.min(alpha * 2.2, 0.9).toFixed(3)})`;
      } else {
        ctx.fillStyle = dark
          ? `rgba(235, 242, 255, ${alpha.toFixed(3)})`
          : `rgba(0, 113, 227, ${alpha.toFixed(3)})`;
      }
      ctx.fill();
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });
  window.addEventListener('mouseout', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  resize();
  requestAnimationFrame(frame);
})();
