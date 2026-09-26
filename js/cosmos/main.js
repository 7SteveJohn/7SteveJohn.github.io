// Interactive Cosmic Blog · main.js（规格书 §9/§10/§12）
// 只负责初始化、模块连接、生命周期、主循环；业务在各模块
// 主循环：interaction.update → audio.update → camera → sky → water → stars → render
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { SkyLayer } from './scene/SkyLayer.js';
import { MountainLayer } from './scene/MountainLayer.js';
import { WaterLayer } from './scene/WaterLayer.js';
import { StarField } from './scene/StarField.js';
import { AudioManager } from './audio/AudioManager.js';
import { BeatDetector } from './audio/BeatDetector.js';
import { InteractionManager } from './interaction/InteractionManager.js';

const CFG = CONFIG;
const isMobile = matchMedia('(pointer:coarse)').matches || innerWidth < 768;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

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

if (!webglOK()) {
  fallback2d();
} else {
  boot();
}

function boot() {
  const canvas = document.getElementById('cosmos-canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: false, powerPreference: 'low-power'
  });
  const dprCap = isMobile ? CFG.perf.dprMaxMobile : CFG.perf.dprMax;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x030712, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CFG.camera.fov, innerWidth / innerHeight, CFG.camera.near, CFG.camera.far);
  camera.position.set(0, 0, CFG.camera.zPos);

  const loader = new THREE.TextureLoader();
  const loadTex = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));

  Promise.all([loadTex(CFG.assets.sky), loadTex(CFG.assets.mountainsFar), loadTex(CFG.assets.mountainsNear)])
    .then(([skyTex, farTex, nearTex]) => start(skyTex, farTex, nearTex))
    .catch(() => fallback2d());   // 素材加载失败也回退 2D，不白屏

  function start(skyTex, farTex, nearTex) {
    const sky = new SkyLayer(scene, CFG, skyTex);
    new MountainLayer(scene, CFG, farTex, nearTex);
    const water = new WaterLayer(scene, CFG, skyTex);
    const stars = new StarField(scene, CFG, isMobile);
    const audio = new AudioManager(CFG);
    const beat = new BeatDetector(CFG);
    const interaction = new InteractionManager(CFG, camera, canvas);

    // ---- 主循环（规格书 §10）----
    let rafId = 0, frameNo = 0, last = performance.now();
    let sceneT = 0;                    // 场景时间（timeScale 缩放，驱动一切环境微动态）
    let running = true, hidden = false, contextLost = false;
    const timeScale = reduceMotion ? CFG.motion.timeScaleReduce : CFG.motion.timeScale;
    let lastFov = CFG.camera.fov;

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

      interaction.update(dtMs, water.mesh, CFG.layers.starZ);
      const a = audio.update(dtMs);
      const pulse = beat.update(a, dtMs, now);

      // Camera：damped 视差 + 滚动纵深 + Beat 极轻微 FOV 脉冲（观察角度变化，不是图片滑动）
      camera.position.x = interaction.mouse.x * CFG.camera.parallaxStrengthX;
      camera.position.y = interaction.mouse.y * CFG.camera.parallaxStrengthY
                        - interaction.scroll * CFG.camera.scrollStrength;
      camera.lookAt(0, camera.position.y * 0.4, CFG.layers.mountainFarZ);
      const fov = CFG.camera.fov + pulse * CFG.camera.beatFovPulse;
      if (Math.abs(fov - lastFov) > 0.0005) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
        lastFov = fov;
      }

      // 静默态银河呼吸（振幅 3%、周期 ~12.5s）——安静但永远活着
      const breathe = CFG.motion.breatheAmp * Math.sin(sceneT * Math.PI * 2 * CFG.motion.breatheHz);

      sky.update(sceneT, a.bass, a.mid, breathe);
      water.setMouseUV(interaction.waterUV, interaction.waterActive);
      water.update(sceneT, a.bass);
      stars.update(sceneT, a.treble, interaction.mouseWorld, interaction.hasMouse);

      renderer.render(scene, camera);
    }
    rafId = requestAnimationFrame(tick);

    // ---- 容灾（规格书 §12）----
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
      sky.fitAspect(camera.aspect);
      stars.setPixelScale(renderer.getPixelRatio() * (innerHeight / 900) * 1.3);
    });
    stars.setPixelScale(renderer.getPixelRatio() * (innerHeight / 900) * 1.3);

    // ---- 右下角星河音频控制台：本地音乐上传 / 音量 / 折叠 / 重置 ----
    const dockState = document.getElementById('cosmos-state');
    let dockFileName = '', dockUrl = null;
    const say = (m) => { if (dockState) dockState.textContent = m; };
    (function bindDock() {
      const panel = document.getElementById('cosmos-panel');
      const chip = document.getElementById('cosmos-chip');
      const fold = document.getElementById('cosmos-fold');
      const fileInput = document.getElementById('cosmos-file');
      const vol = document.getElementById('cosmos-vol');
      const resetBtn = document.getElementById('cosmos-reset');
      if (!panel || !chip) return;
      const setOpen = (open) => {
        panel.hidden = !open;
        chip.hidden = open;
        if (fold) fold.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      if (fold) fold.addEventListener('click', () => setOpen(false));
      chip.addEventListener('click', () => setOpen(true));
      setOpen(true);
      if (fileInput) fileInput.addEventListener('change', (ev) => {
        const f = ev.target.files && ev.target.files[0];
        if (!f || !audio.ownEl) return;
        if (dockUrl) { try { URL.revokeObjectURL(dockUrl); } catch (e) {} }
        dockUrl = URL.createObjectURL(f);
        audio.ownEl.src = dockUrl;
        dockFileName = f.name;
        audio.ensureGraph();           // 文件选择即用户手势
        audio.resume();
        const pr = audio.ownEl.play();
        if (pr && pr.catch) pr.catch(() => say('浏览器拦下了自动播放，点一下页面再试'));
        if (vol) audio.ownEl.volume = vol.value / 100;
        say('本地曲目：' + dockFileName);
      });
      if (vol) vol.addEventListener('input', () => {
        const el = audio.activeEl();
        if (el) el.volume = vol.value / 100;
      });
      if (resetBtn) resetBtn.addEventListener('click', () => {
        window.__COSMOS.reset();
        say('星河已重置');
      });
    })();
    setInterval(() => {
      if (!dockState) return;
      if (audio.ownEl && !audio.ownEl.paused) return say('本地曲目 · ' + (dockFileName || '播放中'));
      if (audio.siteEl && !audio.siteEl.paused) return say('站点歌单 · 银河随音乐呼吸');
      if (reduceMotion) return say('慢速运行 · 系统开了「减少动效」');
      return say('静音中 · 银河缓慢流动');
    }, 1200);

    // ---- 测试探针 ----
    window.__COSMOS = {
      cfg: CFG,
      engine: 'spec-2.5d',
      feed: (b, m, t, beat) => audio.feed(b, m, t, beat),
      reset: () => {
        interaction.target.x = interaction.target.y = 0;
        interaction.scrollTarget = 0;
        stars.reset();
        water.reset();
        audio.feed(0, 0, 0, 0);
      },
      info: () => ({
        engine: 'spec-2.5d',
        counts: { stars: stars.count },
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
        starMaxOff: +stars.maxOff.toFixed(4),
        ripple: +water.ripple.toFixed(4),
        waterUV: { x: +water.uniforms.uMouseUV.value.x.toFixed(3), y: +water.uniforms.uMouseUV.value.y.toFixed(3) },
        uBass: +water.uniforms.uBass.value.toFixed(3),
        frame: frameNo,
        sceneT: +sceneT.toFixed(2),
        timeScale, reduceMotion, isMobile, hidden, contextLost,
        dpr: renderer.getPixelRatio()
      })
    };
  }
}
