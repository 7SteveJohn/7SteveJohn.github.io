/**
 * 7Steve 2.5D 原设立绘高阶交互看板娘 (Spring Physics & Organic Motion Engine)
 * -----------------------------------------------------------------------
 * 100% 忠实还原原设参考立绘 (7steve.jpg):
 * - 灰蓝渐变双马尾、黑框眼镜、发光猫耳耳机
 * - 深海军蓝连帽卫衣 (7Steve Logo + 白色抽绳)
 * - 手持全息代码平板 ("Hello World! JS") + 浮空赛博猫
 *
 * 动画设计原理升级 (Animation Principles Upgrade):
 * 1. 真实弹簧动力学 (Hooke's Law Spring-Damper): 告别机械匀速与生硬 Lerp，具有真实的加速度、超调回弹 (Overshoot) 与惯性阻尼。
 * 2. 惯性剪切摆动 (Inertial Shear): 转头时根据角速度产生微观发丝/双马尾惯性滞后 (Follow-through)。
 * 3. 有机非对称生命呼吸 (Organic Breathing): 慢吸气挺胸 (45%) -> 屏气微停 (10%) -> 缓呼气放松 (45%)。
 * 4. 挤压与拉伸 (Squash & Stretch): 摸头轻柔下压、逗猫腾跃拉伸、戳刺弹性果冻反馈。
 * 5. 交互动作体系: 摸头害羞眨眼、逗猫空翻跳跃、全息屏触碰震波、连戳躲闪受惊、挂机发呆打瞌睡。
 */
(function () {
  'use strict';

  const KEY = 'sj.live2d';
  const BASE = 'assets/vendor/live2d/';
  const root = document.documentElement;

  // 1. 初始化容器
  let waifu = document.getElementById('waifu');
  if (!waifu) {
    waifu = document.createElement('div');
    waifu.id = 'waifu';
    document.body.appendChild(waifu);
  }

  // 2. 注入动画与交互样式
  if (!document.getElementById('steve-25d-style')) {
    const style = document.createElement('style');
    style.id = 'steve-25d-style';
    style.textContent = `
      #waifu {
        position: fixed;
        right: 0;
        bottom: 0;
        width: 300px;
        height: 335px;
        z-index: 30;
        user-select: none;
        pointer-events: auto;
        transition: transform 0.3s ease, opacity 0.4s ease;
      }
      .steve-stage {
        position: relative;
        width: 100%;
        height: 100%;
        perspective: 900px;
      }
      .steve-body {
        position: absolute;
        width: 100%;
        height: 100%;
        transform-style: preserve-3d;
        transform-origin: 50% 90%;
        will-change: transform;
      }
      .steve-img {
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 300px;
        height: auto;
        pointer-events: none;
        filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.45));
        transform-origin: 50% 90%;
        will-change: transform;
      }

      /* 双颊腮红层 (摸头平滑触发) */
      .steve-blush {
        position: absolute;
        top: 105px;
        left: 100px;
        width: 100px;
        height: 28px;
        background: radial-gradient(ellipse at 25% 50%, rgba(244, 114, 182, 0.65) 0%, transparent 60%),
                    radial-gradient(ellipse at 75% 50%, rgba(244, 114, 182, 0.65) 0%, transparent 60%);
        border-radius: 16px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        mix-blend-mode: color-burn;
        z-index: 6;
      }
      .steve-blush.active { opacity: 1; }

      /* 全息屏常态呼吸光晕 */
      .steve-holo-glow {
        position: absolute;
        top: 145px;
        left: 135px;
        width: 125px;
        height: 80px;
        border-radius: 8px;
        background: radial-gradient(ellipse at center, rgba(56, 189, 248, 0.32) 0%, transparent 72%);
        pointer-events: none;
        mix-blend-mode: screen;
        z-index: 7;
        will-change: transform, opacity;
      }

      /* 全息屏点击扩散冲击波 */
      .steve-holo-ripple {
        position: absolute;
        top: 155px;
        left: 150px;
        width: 75px;
        height: 48px;
        border: 2px solid #38bdf8;
        border-radius: 12px;
        opacity: 0;
        pointer-events: none;
        z-index: 8;
      }
      .steve-holo-ripple.active {
        animation: steve-ripple-out 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes steve-ripple-out {
        0% { transform: scale(0.5); opacity: 1; box-shadow: 0 0 12px #38bdf8; }
        100% { transform: scale(2.3); opacity: 0; box-shadow: 0 0 35px rgba(56, 189, 248, 0); }
      }

      /* 浮空代码粒子 */
      .steve-glyph {
        position: absolute;
        color: rgba(56, 189, 248, 0.55);
        font-family: monospace;
        font-size: 11px;
        pointer-events: none;
        will-change: transform;
      }
      .g1 { top: 195px; left: 10px; }
      .g2 { top: 115px; right: 20px; }
      .g3 { bottom: 50px; right: 10px; }

      /* 交互反馈冒泡微粒 */
      .steve-pop {
        position: absolute;
        font-size: 18px;
        pointer-events: none;
        z-index: 50;
        animation: steve-pop-up 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes steve-pop-up {
        0% { transform: translate(-50%, 0) scale(0.4); opacity: 0; }
        22% { opacity: 1; transform: translate(-50%, -15px) scale(1.25); }
        100% { transform: translate(-50%, -60px) scale(0.85); opacity: 0; }
      }

      /* 交互热区 (Hot-Zones) */
      .hotzone { position: absolute; cursor: pointer; z-index: 20; }
      #zone-head { top: 10px; left: 90px; width: 120px; height: 90px; border-radius: 50% 50% 0 0; }
      #zone-cat  { top: 25px; left: 10px; width: 75px; height: 75px; border-radius: 12px; }
      #zone-holo { top: 140px; left: 130px; width: 135px; height: 90px; border-radius: 10px; }
      #zone-body { top: 105px; left: 75px; width: 145px; height: 175px; }
    `;
    document.head.appendChild(style);
  }

  // 3. 组装 HTML 结构与热区
  waifu.innerHTML = `
    <div id="waifu-tips"><span>7Steve</span>：你好呀！欢迎来到楠屿札记~</div>
    <div class="steve-stage" id="steve-stage">
      <div class="steve-body" id="steve-body">
        <div class="steve-glyph g1" id="g1">&lt;div&gt;</div>
        <div class="steve-glyph g2" id="g2">010101</div>
        <div class="steve-glyph g3" id="g3">{}</div>
        <img class="steve-img" src="${BASE}7steve-bust.png" alt="7Steve" id="steve-img">
        <div class="steve-blush" id="steve-blush"></div>
        <div class="steve-holo-glow" id="steve-holo-glow"></div>
        <div class="steve-holo-ripple" id="steve-holo-ripple"></div>
        <div class="hotzone" id="zone-cat" title="摸摸赛博小猫"></div>
        <div class="hotzone" id="zone-head" title="摸摸头 / 挠猫耳"></div>
        <div class="hotzone" id="zone-holo" title="点击全息代码屏"></div>
        <div class="hotzone" id="zone-body" title="戳一戳 7Steve"></div>
      </div>
    </div>
  `;

  const bodyEl = document.getElementById('steve-body');
  const stageEl = document.getElementById('steve-stage');
  const tipsEl = document.getElementById('waifu-tips');
  const blushEl = document.getElementById('steve-blush');
  const rippleEl = document.getElementById('steve-holo-ripple');
  const glowEl = document.getElementById('steve-holo-glow');
  const g1El = document.getElementById('g1');
  const g2El = document.getElementById('g2');
  const g3El = document.getElementById('g3');

  waifu.classList.add('waifu-active');
  root.classList.add('has-live2d');

  // 4. 关闭键关联
  function addCloseBtn() {
    if (document.getElementById('live2d-close')) return;
    const btn = document.createElement('button');
    btn.id = 'live2d-close';
    btn.type = 'button';
    btn.title = '关闭看板娘（以后不再出现）';
    btn.setAttribute('aria-label', '关闭看板娘');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    btn.addEventListener('click', () => {
      try { localStorage.setItem(KEY, 'off'); } catch (e) {}
      waifu.classList.add('waifu-hidden');
      btn.remove();
      root.classList.remove('has-live2d');
    });
    document.body.appendChild(btn);
  }
  addCloseBtn();

  // 5. 对话气泡与专属台词
  let tipTimer = null;
  function showTip(text, time = 4200) {
    if (!tipsEl) return;
    tipsEl.innerHTML = `<span>7Steve</span>：` + text;
    tipsEl.classList.add('waifu-tips-active');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => {
      tipsEl.classList.remove('waifu-tips-active');
    }, time);
  }

  function spawnParticle(x, y, char = '✨') {
    if (!bodyEl) return;
    const p = document.createElement('div');
    p.className = 'steve-pop';
    p.textContent = char;
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    bodyEl.appendChild(p);
    setTimeout(() => p.remove(), 850);
  }

  // 进场欢迎词
  setTimeout(() => {
    const h = new Date().getHours();
    let greet = "你好呀！摸头、逗猫、敲全息屏都有丝滑弹簧动力学动作哦~";
    if (h >= 5 && h < 11) greet = "早上好！新的一天也要活力满满写代码~";
    else if (h >= 11 && h < 14) greet = "中午好！吃过午饭了吗？";
    else if (h >= 14 && h < 18) greet = "下午好！全息屏运行一切正常~";
    else if (h >= 22 || h < 4) greet = "夜猫子警报！要注意休息，不要熬夜写 Bug 哦~";
    showTip(greet, 5000);
  }, 1200);

  // ========================================================
  // 6. 物理弹簧阻尼类 (Hooke's Law Spring Physics)
  // ========================================================
  class Spring {
    constructor(val = 0, stiffness = 0.08, damping = 0.72) {
      this.val = val;
      this.target = val;
      this.vel = 0;
      this.k = stiffness;
      this.d = damping;
    }
    update(target) {
      this.target = target;
      const force = (this.target - this.val) * this.k;
      this.vel = (this.vel + force) * this.d;
      this.val += this.vel;
      return this.val;
    }
    impulse(force) {
      this.vel += force;
    }
  }

  // 核心运动弹簧链
  const rotY = new Spring(0, 0.075, 0.70); // 视差左右转角 (超调回弹)
  const rotX = new Spring(0, 0.085, 0.75); // 视差上下仰角
  const transX = new Spring(0, 0.065, 0.72);
  const transY = new Spring(0, 0.08, 0.75);
  const scale = new Spring(1, 0.12, 0.68);  // 弹性挤压拉伸
  const skewX = new Spring(0, 0.06, 0.70);  // 惯性发丝剪切微动

  let mouseTargetX = 0, mouseTargetY = 0;
  let scrollVel = 0;
  let lastScrollY = window.scrollY;
  let idleTime = 0;
  let isDozing = false;
  const startTime = performance.now();

  function resetIdle() {
    idleTime = 0;
    if (isDozing) {
      isDozing = false;
      scale.impulse(0.08); // 苏醒伸懒腰拉伸
      showTip("（伸懒腰）唔！主人回来啦，7Steve 随时待命！", 3500);
    }
  }

  window.addEventListener('mousemove', (e) => {
    resetIdle();
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    mouseTargetX = (e.clientX - cx) / cx;
    mouseTargetY = (e.clientY - cy) / cy;
  }, { passive: true });

  window.addEventListener('scroll', () => {
    resetIdle();
    const delta = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
    scrollVel = Math.max(-20, Math.min(20, delta * 0.35));
  }, { passive: true });

  // ========================================================
  // 7. 60FPS 物理渲染循环 (Organic Loop)
  // ========================================================
  let animFrameId = null;

  function render(now) {
    const t = (now - startTime) / 1000;
    idleTime += 0.016;

    // 挂机发呆打瞌睡 (>22s)
    if (idleTime > 22 && !isDozing) {
      isDozing = true;
      showTip("（小声）主人看文章好专注呀……我也偷偷摸个鱼 Zzz...", 5000);
      spawnParticle(150, 85, '💤');
    }

    // 1. 生命呼吸曲线 (慢吸 -> 短停 -> 缓呼)
    const breathPhase = (t % 4.6) / 4.6;
    let breathY, breathScaleY;
    if (breathPhase < 0.45) {
      const prog = 0.5 - 0.5 * Math.cos((breathPhase / 0.45) * Math.PI);
      breathY = -prog * 4.2;
      breathScaleY = 1.0 + prog * 0.012;
    } else if (breathPhase < 0.55) {
      breathY = -4.2;
      breathScaleY = 1.012;
    } else {
      const prog = 0.5 - 0.5 * Math.cos(((breathPhase - 0.55) / 0.45) * Math.PI);
      breathY = -4.2 + prog * 4.2;
      breathScaleY = 1.012 - prog * 0.012;
    }

    if (isDozing) breathY += 5;

    // 2. 迎风阻力衰减
    scrollVel *= 0.88;

    // 3. 弹簧动力学计算
    const ry = rotY.update(mouseTargetX * 12);
    const rx = rotX.update(-mouseTargetY * 7.5 - (scrollVel * 0.25));
    const tx = transX.update(mouseTargetX * 8);
    const ty = transY.update(breathY);
    const sc = scale.update(breathScaleY);
    const sk = skewX.update(-rotY.vel * 0.32); // 转头时的发丝滞后剪切

    // 4. 应用硬件加速变换
    if (bodyEl) {
      bodyEl.style.transform = `
        perspective(900px)
        rotateY(${ry}deg)
        rotateX(${rx}deg)
        translateX(${tx}px)
        translateY(${ty}px)
        skewX(${sk}deg)
        scale(${sc})
      `;
    }

    // 5. 全息屏呼吸与代码微粒错峰漂浮
    if (glowEl) {
      const hScale = 1.0 + Math.sin(t * 2.2) * 0.05;
      const hOpacity = 0.55 + Math.sin(t * 2.2) * 0.35;
      glowEl.style.transform = `scale(${hScale})`;
      glowEl.style.opacity = hOpacity;
    }

    if (g1El) g1El.style.transform = `translate(${tx * 0.4 + Math.sin(t * 1.5) * 5}px, ${Math.cos(t * 1.5) * 4}px)`;
    if (g2El) g2El.style.transform = `translate(${tx * -0.3 + Math.cos(t * 1.8) * 6}px, ${Math.sin(t * 1.8) * 5}px)`;
    if (g3El) g3El.style.transform = `translate(${tx * 0.2 + Math.sin(t * 1.2) * 4}px, ${Math.cos(t * 1.2) * 3}px)`;

    animFrameId = requestAnimationFrame(render);
  }
  animFrameId = requestAnimationFrame(render);

  // ========================================================
  // 8. 物理冲量交互响应 (Organic Impulses)
  // ========================================================
  // 动作 A: 摸头 / 挠猫耳
  document.getElementById('zone-head').addEventListener('click', (e) => {
    resetIdle();
    const rect = stageEl.getBoundingClientRect();
    spawnParticle(e.clientX - rect.left, e.clientY - rect.top, '💖');
    spawnParticle(e.clientX - rect.left + 14, e.clientY - rect.top - 15, '✨');

    // 物理冲量：顺毛下压 + 害羞点头 + 猫耳轻微颤动
    scale.impulse(-0.06);
    rotX.impulse(3.2);
    rotY.impulse((Math.random() - 0.5) * 5);

    blushEl.classList.add('active');
    setTimeout(() => blushEl.classList.remove('active'), 2000);

    const headQuotes = [
      "（猫耳抖动）诶？别挠啦，耳机传感器很灵敏的 (⁄ ⁄•⁄ω⁄•⁄ ⁄)",
      "摸头会长不高的啦！不过……看在代码写得好的份上允许你摸一下~",
      "蹭蹭~ 7Steve 的心情值 +100，电量充满！",
      "（舒服眯眼）呼噜噜……好啦好啦，要专心看文章哦~"
    ];
    showTip(headQuotes[Math.floor(Math.random() * headQuotes.length)]);
  });

  // 动作 B: 逗赛博小猫
  document.getElementById('zone-cat').addEventListener('click', (e) => {
    resetIdle();
    const rect = stageEl.getBoundingClientRect();
    spawnParticle(e.clientX - rect.left, e.clientY - rect.top, '⚡');
    spawnParticle(e.clientX - rect.left - 10, e.clientY - rect.top - 15, '01');

    // 物理冲量：小猫弹跃后坐力
    transY.impulse(-15);
    rotY.impulse(-7);
    scale.impulse(0.07);

    const catQuotes = [
      "喵呜~ 赛博小猫检测到主人投喂，内存占用 -50MB！",
      "哔哔！TCP 握手成功，与小猫建立 WebSocket 长连接~",
      "喵~ 正在监听 8080 端口，今天没有遇到任何 DDoS 攻击！",
      "小猫把你的 Bug 偷偷叼走了，现在构建状态是 PASS 啦~"
    ];
    showTip(catQuotes[Math.floor(Math.random() * catQuotes.length)]);
  });

  // 动作 C: 敲击全息代码屏
  document.getElementById('zone-holo').addEventListener('click', (e) => {
    resetIdle();
    const rect = stageEl.getBoundingClientRect();
    spawnParticle(e.clientX - rect.left, e.clientY - rect.top, '🚀');

    // 物理冲量：指尖受击反冲，全息屏后仰再弹回
    rotX.impulse(-4.2);
    scale.impulse(-0.04);

    rippleEl.classList.remove('active');
    void rippleEl.offsetWidth;
    rippleEl.classList.add('active');

    const holoQuotes = [
      "Hello World! 正在向控制台打印宇宙第一美少女的问候~",
      "`git commit -m 'feat: 楠屿札记持续演进'` 提交成功！0 错误 0 警告~",
      "JavaScript 引擎全速运转，AST 抽象语法树解析耗时 0.8ms！",
      "全息屏提示：今天写了 200 行优雅的代码，超棒的！"
    ];
    showTip(holoQuotes[Math.floor(Math.random() * holoQuotes.length)]);
  });

  // 动作 D: 戳卫衣 (戳一戳 / 连续戳刺躲闪)
  let pokeCount = 0;
  let pokeTimer = null;
  document.getElementById('zone-body').addEventListener('click', (e) => {
    resetIdle();
    pokeCount++;
    clearTimeout(pokeTimer);
    pokeTimer = setTimeout(() => { pokeCount = 0; }, 800);

    const rect = stageEl.getBoundingClientRect();

    if (pokeCount >= 2) {
      // 惊慌躲闪大冲量：身体后仰 + 受惊微缩
      spawnParticle(e.clientX - rect.left, e.clientY - rect.top, '❗');
      rotX.impulse(-9.5);
      rotY.impulse((Math.random() > 0.5 ? 1 : -1) * 8);
      scale.impulse(-0.09);
      transY.impulse(7);

      const dodgeQuotes = [
        "哇！别戳啦，连帽卫衣的抽绳都要被你扯直了！",
        "再戳就要抛出 `UnhandledRejection: UserPokingException` 异常啦~",
        "7Steve 正在防御式编程，请勿频繁发起并发请求！",
        "唔……要被你戳倒啦！快去写代码啦~"
      ];
      showTip(dodgeQuotes[Math.floor(Math.random() * dodgeQuotes.length)]);
      pokeCount = 0;
    } else {
      // 单戳果冻回弹
      spawnParticle(e.clientX - rect.left, e.clientY - rect.top, '✨');
      scale.impulse(-0.06);
      rotY.impulse((Math.random() - 0.5) * 4);
      showTip("楠屿札记持续集成中，构建状态：PASS！");
    }
  });

  window.__steveMascot = {
    showTip,
    destroy() {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (waifu) waifu.remove();
    }
  };
})();
