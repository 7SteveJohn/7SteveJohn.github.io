// Interactive Cosmic Blog · main3d.js
// 桌面 3D 背景（等高线岛图）：只被 main.js 引导层在「桌面 + WebGL 可用」时动态加载——
// three（676KB）只在这条路径上下载。手机走 2D 星河（fallback2d），超低端走静态暗角档。
// 职责：初始化、模块连接、生命周期、主循环；场景在 js/cosmos/scene/IsolinesField.js
// 主循环：interaction.update → audio.update → beat → field.update → render
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { IsolinesField } from './scene/IsolinesField.js';
import { NeuralField } from './scene/NeuralField.js';
import { AuroraField } from './scene/AuroraField.js';
import { ChladniField } from './scene/ChladniField.js';
import { MonolithField } from './scene/MonolithField.js';
import { CymaticsField } from './scene/CymaticsField.js';
import { AudioManager } from './audio/AudioManager.js';
import { BeatDetector } from './audio/BeatDetector.js';
import { InteractionManager } from './interaction/InteractionManager.js';

const CFG = CONFIG;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function fallback2d() {
  // 3D 初始化失败：回退 2D canvas 版（js/cosmos.js 自举，挂 #cosmos-canvas）
  const s = document.createElement('script');
  s.src = 'js/cosmos.js';
  document.body.appendChild(s);
}

boot();

function boot() {
  const canvas = document.getElementById('cosmos-canvas');
  // 首帧前压住画布：场景就绪后随首帧淡入，黑屏感 → 平滑显影
  canvas.style.opacity = '0';
  canvas.style.transition = 'opacity 1.1s ease';
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: false, powerPreference: 'low-power'
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, CFG.perf.dprMax));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0xf8fafc, 1);

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
    let currentField = null;
    let currentMode = 'cymatics';
    try {
      const saved = localStorage.getItem('sj.cosmos-mode');
      if (saved === 'cymatics' || saved === 'aurora' || saved === 'monolith' || saved === 'chladni') {
        currentMode = saved;
      } else {
        currentMode = 'cymatics';
        localStorage.setItem('sj.cosmos-mode', 'cymatics');
      }
    } catch (e) {
      currentMode = 'cymatics';
    }
    const audio = new AudioManager(CFG);
    const beat = new BeatDetector(CFG);
    const interaction = new InteractionManager(CFG, camera, canvas);

    function setMode(mode) {
      if (currentField) {
        if (typeof currentField.dispose === 'function') currentField.dispose();
        else scene.remove(currentField.mesh || currentField.points || currentField.group);
        currentField = null;
      }
      currentMode = mode;
      localStorage.setItem('sj.cosmos-mode', mode);

      switch (mode) {
        case 'neural':
          currentField = new NeuralField(scene, CFG, false, innerWidth / innerHeight);
          break;
        case 'aurora':
          currentField = new AuroraField(scene);
          break;
        case 'chladni':
          currentField = new ChladniField(scene);
          break;
        case 'monolith':
          currentField = new MonolithField(scene);
          break;
        case 'isolines':
          currentField = new IsolinesField(scene);
          break;
        case 'cymatics':
        default:
          currentField = new CymaticsField(scene);
          break;
      }
      if (currentField && typeof currentField.setRes === 'function') {
        currentField.setRes(innerWidth, innerHeight);
      }
      window.dispatchEvent(new CustomEvent('cosmos-mode-changed', { detail: { mode } }));
    }

    window.switchCosmosMode = setMode;
    setMode(currentMode);

    // 点击交互：交互元素上不误触
    addEventListener('pointerdown', (e) => {
      if (e.target.closest('a,button,input,textarea,select,label,#music-player,.cosmos-demo-dock')) return;
      if (currentField && typeof currentField.kick === 'function') {
        currentField.kick(e.clientX, e.clientY);
      }
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

      if (beat.justBeat) {
        if (currentField && typeof currentField.onBeat === 'function') {
          currentField.onBeat(beat.beats % 8 === 0 ? 1.0 : 0.6);
        }
        beat.justBeat = false;
      }

      if (currentField) {
        if (typeof currentField.updateEngine === 'function') {
          currentField.updateEngine(sceneT, a, interaction, dtMs);
        } else if (typeof currentField.update === 'function') {
          currentField.update(sceneT, a, interaction, dtMs);
        }
      }

      // 首帧落画布：淡入（黑屏感 → 平滑显影）
      if (frameNo === 1) { canvas.style.opacity = '1'; }

      const isDark = document.documentElement.classList.contains('dark');
      renderer.setClearColor(isDark ? 0x05070c : 0xf8fafc, 1);

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
      if (currentField && typeof currentField.setRes === 'function') {
        currentField.setRes(innerWidth, innerHeight);
      }
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
      get engine() { return currentMode; },
      setMode,
      tier: window.__COSMOS_TIER,
      feed: (b, m, t, beat) => audio.feed(b, m, t, beat),
      ensure: () => { audio.ensureGraph(); audio.resume(); return !!audio.analyser; },
      reset: () => {
        interaction.target.x = interaction.target.y = 0;
        interaction.scrollTarget = 0;
        audio.feed(0, 0, 0, 0);
      },
      info: () => ({
        engine: currentMode,
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
        timeScale, reduceMotion, hidden, contextLost,
        dpr: renderer.getPixelRatio()
      })
    };
  }
}
