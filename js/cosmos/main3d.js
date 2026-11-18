// Interactive Cosmic Blog · main3d.js
// 桌面 3D 声学谐振背景（CymaticsField）：只被 main.js 引导层在「桌面 + WebGL 可用」时动态加载——
// three 只在这条路径上下载。手机走 2D 星河（fallback2d），超低端走静态暗角档。
// 主循环：interaction.update → audio.update → beat → field.update → render
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { CymaticsField } from './scene/CymaticsField.js';
import { AudioManager } from './audio/AudioManager.js';
import { BeatDetector } from './audio/BeatDetector.js';
import { InteractionManager } from './interaction/InteractionManager.js';

const CFG = CONFIG;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

try { localStorage.removeItem('sj.cosmos-mode'); } catch (e) {}

function fallback2d() {
  const s = document.createElement('script');
  s.src = 'js/cosmos.js';
  document.body.appendChild(s);
}

boot();

function boot() {
  const canvas = document.getElementById('cosmos-canvas');
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
    const currentField = new CymaticsField(scene);
    if (typeof currentField.setRes === 'function') {
      currentField.setRes(innerWidth, innerHeight);
    }

    const audio = new AudioManager(CFG);
    const beat = new BeatDetector(CFG);
    const interaction = new InteractionManager(CFG, camera, canvas);

    addEventListener('pointerdown', (e) => {
      if (e.target.closest('a,button,input,textarea,select,label,#music-player')) return;
      if (typeof currentField.kick === 'function') {
        currentField.kick(e.clientX, e.clientY);
      }
    }, { passive: true });

    let frameNo = 0, last = performance.now();
    let sceneT = 0;
    let running = true, hidden = false, contextLost = false;
    const timeScale = reduceMotion ? CFG.motion.timeScaleReduce : CFG.motion.timeScale;

    let isDark = document.documentElement.classList.contains('dark');
    let lastClearDark = null;
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(() => {
        isDark = document.documentElement.classList.contains('dark');
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }

    function tick(now) {
      if (!running) return;
      requestAnimationFrame(tick);
      if (hidden) return;
      if (contextLost) {
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
        if (typeof currentField.onBeat === 'function') {
          currentField.onBeat(beat.beats % 8 === 0 ? 1.0 : 0.75);
        }
        beat.justBeat = false;
      }

      currentField.update(sceneT, a, interaction, dtMs, pulse);

      if (canvas.style.opacity === '0') { canvas.style.opacity = '1'; }

      if (isDark !== lastClearDark) {
        lastClearDark = isDark;
        renderer.setClearColor(isDark ? 0x05070c : 0xf8fafc, 1);
      }

      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);

    document.addEventListener('visibilitychange', () => {
      hidden = document.hidden;
      if (!hidden) { last = performance.now(); }
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
      if (typeof currentField.setRes === 'function') {
        currentField.setRes(innerWidth, innerHeight);
      }
    });

    const fileInput = document.getElementById('cosmos-file');
    const vol = document.getElementById('cosmos-vol');
    let dockUrl = null;
    if (fileInput) fileInput.addEventListener('change', (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f || !audio.ownEl) return;
      if (dockUrl) { try { URL.revokeObjectURL(dockUrl); } catch (e) {} }
      dockUrl = URL.createObjectURL(f);
      audio.ownEl.src = dockUrl;
      audio.ensureGraph();
      audio.resume();
      const pr = audio.ownEl.play();
      if (pr && pr.catch) pr.catch(() => {});
      if (vol) audio.ownEl.volume = vol.value / 100;
    });

    window.__COSMOS = {
      cfg: CFG,
      engine: 'cymatics',
      tier: window.__COSMOS_TIER,
      feed: (b, m, t, beatVal) => audio.feed(b, m, t, beatVal),
      ensure: () => { audio.ensureGraph(); audio.resume(); return !!audio.analyser; },
      reset: () => {
        interaction.target.x = interaction.target.y = 0;
        interaction.scrollTarget = 0;
        audio.feed(0, 0, 0, 0);
      },
      info: () => ({
        engine: 'cymatics',
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
