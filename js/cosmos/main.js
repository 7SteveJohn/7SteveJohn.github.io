// Interactive Cosmic Blog · main.js
// 只负责初始化、模块连接、生命周期、主循环；桌面场景在 js/cosmos/scene/IsolinesField.js
// 主循环：interaction.update → audio.update → beat → field.update → render
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { IsolinesField } from './scene/IsolinesField.js';
import { AudioManager } from './audio/AudioManager.js';
import { BeatDetector } from './audio/BeatDetector.js';
import { InteractionManager } from './interaction/InteractionManager.js';

const CFG = CONFIG;
const isMobile = matchMedia('(pointer:coarse)').matches || innerWidth < 768;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 手机端不跑 3D 推理场（2026-09-30 用户反馈"3D 背景图在手机上的表现很不好"，两轮调参后仍不满意）：
// 竖屏 aspect 小，跨层连线被透视拉成横跨半屏的大斜线，这是形态问题，收密度/压亮度救不回来；
// 真机上全屏 WebGL shader 的功耗发热也压不住。改走 2D 星河版（js/cosmos.js）——
// 那套引擎本就是为低配/小屏写的：粒子按屏幕面积折算、帧率分级、240 万像素预算，
// 观感是星云+星尘而非线网，竖屏上更柔。桌面保留 3D。
if (!webglOK() || isMobile) {
  fallback2d();
} else {
  boot();
}

function fallback2d() {
  // 无 WebGL：回退 2D canvas 版（js/cosmos.js 自举，挂 #cosmos-canvas）
  const s = document.createElement('script');
  s.src = 'js/cosmos.js';
  document.body.appendChild(s);
}

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { return false; }
}

function boot() {
  const canvas = document.getElementById('cosmos-canvas');
  // 首帧前压住画布：场景就绪后随首帧淡入，黑屏感 → 平滑显影
  canvas.style.opacity = '0';
  canvas.style.transition = 'opacity 1.1s ease';
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: false, powerPreference: 'low-power'
  });
  const dprCap = isMobile ? CFG.perf.dprMaxMobile : CFG.perf.dprMax;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x03060e, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CFG.camera.fov, innerWidth / innerHeight, CFG.camera.near, CFG.camera.far);
  camera.position.set(0, 0, CFG.camera.zPos);

  try {
    start();
  } catch (e) {
    console.error('[cosmos] 场景初始化失败，回退 2D', e);
    fallback2d();
  }

  function start() {
    const field = new IsolinesField(scene);
    field.setRes(innerWidth, innerHeight);
    const audio = new AudioManager(CFG);
    const beat = new BeatDetector(CFG);
    const interaction = new InteractionManager(CFG, camera, canvas);

    // 点击水面：从点击处放一记涟漪（等高线荡开再愈合）；交互元素上不误触
    addEventListener('pointerdown', (e) => {
      if (e.target.closest('a,button,input,textarea,select,label,#music-player')) return;
      field.kick(e.clientX, e.clientY);
    }, { passive: true });

    // ---- 主循环 ----
    let rafId = 0, frameNo = 0, last = performance.now();
    let sceneT = 0;                    // 场景时间（timeScale 缩放，驱动一切环境微动态）
    let running = true, hidden = false, contextLost = false;
    const timeScale = reduceMotion ? CFG.motion.timeScaleReduce : CFG.motion.timeScale;

    function tick(now) {
      if (!running) return;
      rafId = requestAnimationFrame(tick);          // 续帧放帧首：帧体出错也不停摆
      if (hidden) return;
      if (contextLost) {
        // 有的环境（软渲染/部分驱动）丢了 context 却不派发 restored 事件：
        // 每帧自查 isContextLost()，恢复了就自己翻回来，别永久停摆
        if (!renderer.getContext().isContextLost()) { contextLost = false; last = now; }
        else return;
      }
      const dtMs = Math.min(now - last, 100);
      last = now;
      sceneT += (dtMs / 1000) * timeScale;
      frameNo++;

      interaction.update(dtMs, CFG.layers.fieldZ);
      const a = audio.update(dtMs);
      const pulse = beat.update(a, dtMs, now);
      // Beat → 场中放轻涟漪：等高线被荡开一层，随低频潮汐呼吸
      if (beat.justBeat) { field.kickPulse(); beat.justBeat = false; }

      field.update(sceneT, a, interaction, dtMs, beat.pulse);

      // 首帧落画布：淡入（黑屏感 → 平滑显影）
      if (frameNo === 1) { canvas.style.opacity = '1'; }

      renderer.render(scene, camera);
    }
    rafId = requestAnimationFrame(tick);

    // ---- 容灾 ----
    document.addEventListener('visibilitychange', () => {
      hidden = document.hidden;
      if (!hidden) { last = performance.now(); }   // 回来别吞一帧大 dt
    });
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      contextLost = true;
    });
    canvas.addEventListener('webglcontextrestored', () => {
      contextLost = false;
      last = performance.now();
    });
    addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
      field.setRes(innerWidth, innerHeight);
    });

    // ---- 本地音乐接入：悬浮控制台已删，保留隐藏 input 的真实音频链路 ----
    const fileInput = document.getElementById('cosmos-file');
    const vol = document.getElementById('cosmos-vol');
    let dockUrl = null;
    if (fileInput) fileInput.addEventListener('change', (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f || !audio.ownEl) return;
      if (dockUrl) { try { URL.revokeObjectURL(dockUrl); } catch (e) {} }
      dockUrl = URL.createObjectURL(f);
      audio.ownEl.src = dockUrl;
      audio.ensureGraph();           // 文件选择即用户手势
      audio.resume();
      const pr = audio.ownEl.play();
      if (pr && pr.catch) pr.catch(() => {});
      if (vol) audio.ownEl.volume = vol.value / 100;
    });

    // ---- 测试探针 ----
    window.__COSMOS = {
      cfg: CFG,
      engine: 'isolines',
      feed: (b, m, t, beat) => audio.feed(b, m, t, beat),
      reset: () => {
        interaction.target.x = interaction.target.y = 0;
        interaction.scrollTarget = 0;
        audio.feed(0, 0, 0, 0);
      },
      info: () => ({
        engine: 'isolines',
        field: field.info(),
        audio: {
          bass: +audio.bass.toFixed(3), mid: +audio.mid.toFixed(3),
          treble: +audio.treble.toFixed(3), beat: +audio.beatEnv.toFixed(3),
          playing: audio.playing
        },
        pulse: +beat.pulse.toFixed(4),
        cam: {
          x: +camera.position.x.toFixed(4), y: +camera.position.y.toFixed(4),
          fov: +camera.fov.toFixed(3)
        },
        mouse: { x: +interaction.mouse.x.toFixed(4), y: +interaction.mouse.y.toFixed(4), has: interaction.hasMouse },
        scroll: +interaction.scroll.toFixed(4),
        frame: frameNo,
        sceneT: +sceneT.toFixed(2),
        timeScale, reduceMotion, isMobile, hidden, contextLost,
        dpr: renderer.getPixelRatio()
      })
    };
  }
}
