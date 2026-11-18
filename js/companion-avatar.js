/**
 * 7steve — Genuine Live2D Cubism 5 WebGL2 Adapter (companion-avatar.js)
 * ---------------------------------------------------------------------
 * Mounts studio-painted Live2D Cubism 5 model (`7steve_v2.model3.json`) directly
 * inside `#sjc-stage` with zero legacy `#waifu` / `#waifu-tips` DOM clutter:
 * - Zero-flash progressive reveal: shows crisp `7steve-v2-static.webp` on frame 0,
 *   then crossfades seamlessly to 2x+ supersampled WebGL2 `<canvas id="live2d">`
 *   once all textures finish uploading (`_state >= 22`) and first live frames draw.
 * - Bypasses OS `prefers-reduced-motion: reduce` so desktop/mobile WebGL2 users
 *   always see live animated studio `7steve` (falls back cleanly if no WebGL2).
 * - Unlocks smooth damped 2.5D gaze & head turns (`ParamAngleX ±12°`, `ParamAngleY ±10°`,
 *   `ParamAngleZ ±4°`, `ParamEyeBallX/Y ±1`, `ParamBodyAngleX ±5°`) BEFORE Cubism
 *   pendulum physics (`_physics.evaluate`) so twin-tails & drawstrings swing naturally.
 * - Maps semantic expressions (`smile`, `happy`, `shy`, `focus`, `wink`, `dizzy`->`surprised`)
 *   to string `.exp3.json` keys (fixing the legacy integer index silent no-op bug).
 * - True 0% CPU/GPU pause (`cancelAnimationFrame`) when collapsed to `<7>` mini badge.
 */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var LIVE2D_BASE = 'assets/vendor/live2d/';
  var CORE_SCRIPT_URL = LIVE2D_BASE + 'live2dcubismcore.min.js';
  var RUNTIME_ESM_REL = LIVE2D_BASE + 'chunk/index2.js';
  var DEFAULT_MODEL_URL = LIVE2D_BASE + 'model/7steve_v2/7steve_v2.model3.json?v=20261118r2';
  var STATIC_PRIMARY_URL = LIVE2D_BASE + '7steve-v2-static.webp?v=20261118r2';
  var STATIC_BACKUP_URL = LIVE2D_BASE + '7steve-static.webp';

  var EXPRESSION_CANDIDATES = {
    smile: ['smile'],
    happy: ['happy', 'smile'],
    shy: ['shy', 'smile'],
    focus: ['focus', 'smile'],
    wink: ['wink', 'smile'],
    dizzy: ['dizzy', 'surprised', 'shy'],
    surprised: ['surprised', 'dizzy', 'shy']
  };

  var EXPRESSION_MOTIONS = {
    happy: ['HeadPat', 'FlickHead', 'Nod', 'Cheer'],
    shy: ['Shy', 'HeadTilt'],
    focus: ['TapTablet', 'GeekTyping'],
    wink: ['HeadTilt', 'Nod'],
    dizzy: ['Shake', 'TapBody'],
    surprised: ['Shake', 'TapBody']
  };

  var coreLoadPromise = null;
  var runtimeLoadPromise = null;

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function softCurve(v) {
    if (v >= 2.6) return 1;
    if (v <= -2.6) return -1;
    var e2x = Math.exp(2.1 * v);
    return (e2x - 1) / (e2x + 1);
  }

  function createSpring(initial) {
    var v = initial || 0;
    return { pos: v, vel: 0, target: v };
  }

  function stepSpring(s, stiffness, damping, dt) {
    var h = dt * 0.5;
    for (var i = 0; i < 2; i++) {
      var acc = (s.target - s.pos) * stiffness - s.vel * damping;
      s.vel += acc * h;
      s.pos += s.vel * h;
    }
    if (Math.abs(s.pos - s.target) < 0.0004 && Math.abs(s.vel) < 0.0004) {
      s.pos = s.target;
      s.vel = 0;
    }
  }

  function resolveAssetUrl(relPath) {
    try {
      return new URL(relPath, document.baseURI || window.location.href).href;
    } catch (_) {
      return relPath;
    }
  }

  function ensureCubismCore() {
    if (window.Live2DCubismCore) {
      return Promise.resolve(window.Live2DCubismCore);
    }
    if (coreLoadPromise) return coreLoadPromise;

    coreLoadPromise = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-sjc-cubism-core]');
      if (existing) {
        if (window.Live2DCubismCore) {
          resolve(window.Live2DCubismCore);
          return;
        }
        existing.addEventListener('load', function () {
          if (window.Live2DCubismCore) resolve(window.Live2DCubismCore);
          else reject(new Error('Live2DCubismCore missing after script load'));
        }, { once: true });
        existing.addEventListener('error', function () {
          coreLoadPromise = null;
          reject(new Error('Failed to load live2dcubismcore.min.js'));
        }, { once: true });
        return;
      }

      var script = document.createElement('script');
      script.src = resolveAssetUrl(CORE_SCRIPT_URL);
      script.async = true;
      script.setAttribute('data-sjc-cubism-core', '1');
      script.onload = function () {
        if (window.Live2DCubismCore) resolve(window.Live2DCubismCore);
        else {
          coreLoadPromise = null;
          reject(new Error('Live2DCubismCore global unavailable'));
        }
      };
      script.onerror = function () {
        coreLoadPromise = null;
        reject(new Error('Failed to load ' + CORE_SCRIPT_URL));
      };
      document.head.appendChild(script);
    });

    return coreLoadPromise;
  }

  function ensureCubismRuntime() {
    if (runtimeLoadPromise) return runtimeLoadPromise;
    runtimeLoadPromise = ensureCubismCore()
      .then(function () {
        return import(resolveAssetUrl(RUNTIME_ESM_REL));
      })
      .catch(function (err) {
        runtimeLoadPromise = null;
        throw err;
      });
    return runtimeLoadPromise;
  }

  function buildHitZonesSvg() {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'sjc-hit-svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    // Order matters: `body` first, `head` (top 34% cat-ears/crown) & `pad` (lower-right holo-tablet) above it.
    // Outer corners remain completely empty so clicks pass straight through to the page!
    svg.innerHTML = [
      '<polygon data-zone="body" points="11,34 89,34 94,56 90,89 79,100 21,100 13,78 6,56"/>',
      '<polygon data-zone="head" points="26,1 74,1 86,14 89,34 11,34 14,14"/>',
      '<polygon data-zone="pad" points="49,57 98,55 91,86 42,87"/>'
    ].join('');

    return svg;
  }

  function mount(stageEl, options) {
    if (!stageEl) {
      throw new Error('[CompanionAvatar] stageEl is required');
    }
    var opts = options || {};
    var modelUrl = opts.modelUrl || DEFAULT_MODEL_URL;
    var framing = Object.assign({ scale: 1.0, offsetX: 0.0, offsetY: -0.018 }, opts.framing || {});

    stageEl.replaceChildren();

    var host = document.createElement('div');
    host.className = 'sjc-live2d-host';
    host.setAttribute('data-mode', 'loading');
    host.setAttribute('data-expression', 'smile');
    host.setAttribute('data-music', 'off');
    host.setAttribute('data-paused', 'false');

    // 1. Zero-flash static studio portrait (immediate frame-0 reveal while WebGL uploads textures)
    var fallbackImg = document.createElement('img');
    fallbackImg.className = 'sjc-static-fallback';
    fallbackImg.alt = '';
    fallbackImg.decoding = 'async';
    fallbackImg.draggable = false;
    var triedBackupImg = false;
    fallbackImg.addEventListener('load', function () {
      fallbackImg.classList.add('is-loaded');
    });
    fallbackImg.addEventListener('error', function () {
      if (!triedBackupImg) {
        triedBackupImg = true;
        fallbackImg.src = resolveAssetUrl(STATIC_BACKUP_URL);
      }
    });
    fallbackImg.src = resolveAssetUrl(opts.staticUrl || STATIC_PRIMARY_URL);
    if (fallbackImg.complete && fallbackImg.naturalWidth > 0) {
      fallbackImg.classList.add('is-loaded');
    }

    // 2. Live2D Cubism 5 WebGL2 supersampled canvas (`id="live2d"` required by AppDelegate.initializeSubdelegates)
    var existingLive2d = document.getElementById('live2d');
    if (existingLive2d && existingLive2d.parentNode) {
      existingLive2d.removeAttribute('id');
    }
    var canvas = document.createElement('canvas');
    canvas.id = 'live2d';
    canvas.className = 'sjc-webgl-canvas';
    canvas.setAttribute('aria-hidden', 'true');

    // 3. Silhouette hit-zones overlay (`head`, `pad`, `body`) with transparent corner pass-through
    var hitSvg = buildHitZonesSvg();

    host.appendChild(fallbackImg);
    host.appendChild(canvas);
    host.appendChild(hitSvg);
    stageEl.appendChild(host);

    var state = {
      destroyed: false,
      mode: 'loading',
      modelUrl: modelUrl,
      bootStarted: false,
      webglReady: false,
      userPaused: false,
      docHidden: Boolean(document.hidden),
      musicPlaying: false,
      expression: 'smile',
      activeExpKey: 'smile',
      exprTimer: 0,
      rafId: 0,
      lastTs: 0,
      elapsed: 0,
      renderedFrames: 0,

      // Normalized cursor target in [-1, 1] (X: -1 left .. +1 right, Y: -1 down .. +1 up)
      pointerX: 0,
      pointerY: 0,
      lastPointerAt: -10,
      gazeX: 0,
      gazeY: 0,

      // Critically-damped 2nd-order springs for silky 2.5D head/body parallax, multi-joint limbs & tap impulses
      headX: createSpring(0),
      headY: createSpring(0),
      headZ: createSpring(0),
      bodyX: createSpring(0),
      bodyY: createSpring(0),
      bodyZ: createSpring(0),
      bodyLean: createSpring(0),
      armRA: createSpring(0),
      handR: createSpring(0),
      tabletAct: createSpring(0),
      shrug: createSpring(0),
      earPerk: createSpring(0),
      dizzyShake: 0,

      // Full-body limb choreography & autonomous living idle director
      activeAction: null,
      nextIdleHabitAt: 1.0,
      idleHabitCursor: 0,
      actionCounter: 0,

      // Natural eye-blink state machine (with occasional realistic double-blink)
      nextBlinkAt: 2.2 + Math.random() * 2.2,
      blinkQueue: [],
      blinkFactor: 1,

      // Cubism 5 handles
      appDelegate: null,
      subdelegate: null,
      live2dMgr: null,
      lappModel: null,
      paramMap: null,
      modelEnhanced: false
    };

    function syncBackingResolution() {
      var rect = stageEl.getBoundingClientRect();
      var cssW = Math.round(rect.width) || stageEl.clientWidth || 224;
      var cssH = Math.round(rect.height) || stageEl.clientHeight || 298;
      var dpr = window.devicePixelRatio || 1;
      // Guarantee >= 2.25x supersampling on 1x screens and >= 2.4x on Retina screens
      var scale = Math.max(2.25, Math.min(3.0, dpr >= 2 ? dpr * 1.2 : 2.4));
      var targetW = Math.max(360, Math.round(cssW * scale));
      var targetH = Math.max(460, Math.round(cssH * scale));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    }

    function buildParamMap(csmModel) {
      var map = Object.create(null);
      if (!csmModel || !csmModel._model || !csmModel._model.parameters) return map;
      var ids = csmModel._model.parameters.ids;
      var count = csmModel._model.parameters.count || 0;
      for (var i = 0; i < count; i++) {
        map[ids[i]] = i;
      }
      return map;
    }

    function blendParamWithMotion(csmModel, name, targetOffset, motionKeep, minClamp, maxClamp) {
      if (!state.paramMap) return;
      var idx = state.paramMap[name];
      if (idx === undefined) return;
      var defVal = csmModel.getParameterDefaultValue ? csmModel.getParameterDefaultValue(idx) : 0;
      var curVal = csmModel.getParameterValueByIndex(idx);
      var next = defVal + (curVal - defVal) * motionKeep + targetOffset;
      if (typeof minClamp === 'number' && next < minClamp) next = minClamp;
      if (typeof maxClamp === 'number' && next > maxClamp) next = maxClamp;
      csmModel.setParameterValueByIndex(idx, next, 1);
    }

    function setParam(csmModel, name, val, weight) {
      if (!state.paramMap) return;
      var idx = state.paramMap[name];
      if (idx === undefined) return;
      csmModel.setParameterValueByIndex(idx, val, weight === undefined ? 1 : weight);
    }

    function multParam(csmModel, name, factor) {
      if (!state.paramMap) return;
      var idx = state.paramMap[name];
      if (idx === undefined) return;
      csmModel.multiplyParameterValueByIndex(idx, factor, 1);
    }

    function resolveExpressionKey(lappModel, semanticName) {
      if (!lappModel || !lappModel._expressions) return null;
      var candidates = EXPRESSION_CANDIDATES[semanticName] || ['smile'];
      for (var i = 0; i < candidates.length; i++) {
        if (lappModel._expressions.isExist(candidates[i])) {
          return candidates[i];
        }
      }
      // Fallback: first available string key in model._expressions if any
      if (lappModel._expressions.getSize && lappModel._expressions.getSize() > 0) {
        var kv = lappModel._expressions._keyValues && lappModel._expressions._keyValues[0];
        if (kv && typeof kv.first === 'string') return kv.first;
      }
      return null;
    }

    function triggerMatchingMotion(lappModel, semanticName) {
      if (!lappModel || !lappModel._modelSetting) return;
      var groups = EXPRESSION_MOTIONS[semanticName];
      if (!groups) return;
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        try {
          if (lappModel._modelSetting.getMotionCount(g) > 0) {
            lappModel.startRandomMotion(g, 2);
            return;
          }
        } catch (_) {}
      }
    }

    function applyCubismExpression(semanticName, withMotion) {
      var lappModel = state.lappModel;
      if (!lappModel || lappModel._state < 22) return;
      var expKey = resolveExpressionKey(lappModel, semanticName);
      if (expKey) {
        state.activeExpKey = expKey;
        try {
          lappModel.setExpression(expKey);
        } catch (_) {}
      }
      if (withMotion) {
        triggerMatchingMotion(lappModel, semanticName);
      }
    }

    function updateNaturalBlink(dt) {
      var holdClosedOrArc = (
        state.expression === 'happy' ||
        state.expression === 'dizzy' ||
        state.expression === 'wink'
      );
      if (holdClosedOrArc) {
        state.blinkFactor = 1;
        state.blinkQueue.length = 0;
        return;
      }

      var t = state.elapsed;
      if (t >= state.nextBlinkAt && state.blinkQueue.length === 0) {
        state.blinkQueue.push({ start: t, dur: 0.15 });
        if (Math.random() < 0.20) {
          state.blinkQueue.push({ start: t + 0.23, dur: 0.14 });
        }
        state.nextBlinkAt = t + 2.7 + Math.random() * 2.8;
      }

      var closedAmt = 0;
      for (var i = state.blinkQueue.length - 1; i >= 0; i--) {
        var b = state.blinkQueue[i];
        var age = t - b.start;
        if (age >= b.dur) {
          state.blinkQueue.splice(i, 1);
        } else if (age >= 0) {
          var p = age / b.dur;
          var amt = p < 0.38 ? (p / 0.38) : (1 - (p - 0.38) / 0.62);
          if (amt > closedAmt) closedAmt = amt;
        }
      }
      state.blinkFactor = clamp(1 - closedAmt, 0, 1);
    }

    function enhanceReadyModel(lappModel) {
      if (state.modelEnhanced || !lappModel || !lappModel._model) return;
      state.modelEnhanced = true;
      state.paramMap = buildParamMap(lappModel._model);

      // Upgrade offscreen iris/clipping mask buffer to 1024px + 4x anisotropic filtering for Retina sharpness
      try {
        var renderer = lappModel.getRenderer && lappModel.getRenderer();
        var gl = state.subdelegate && state.subdelegate.getGlManager && state.subdelegate.getGlManager().getGl();
        if (renderer && gl) {
          if (renderer._clippingManager && typeof renderer.setClippingMaskBufferSize === 'function') {
            renderer.setClippingMaskBufferSize(1024);
            if (renderer._clippingManager && typeof renderer._clippingManager.setGL === 'function') {
              renderer._clippingManager.setGL(gl);
            }
          }
          if (typeof renderer.setAnisotropy === 'function' && renderer._extension) {
            renderer.setAnisotropy(4);
          }
        }
      } catch (_) {}

      // Pre-stabilize pendulum physics at rest so twin-tails have zero first-frame snap
      try {
        if (lappModel._physics && typeof lappModel._physics.stabilization === 'function') {
          lappModel._physics.stabilization(lappModel._model);
        }
      } catch (_) {}

      // Apply current semantic expression immediately once setup completes
      applyCubismExpression(state.expression, false);
    }

    function stepModelFrame(lappModel, dt) {
      if (!lappModel || lappModel._state !== 22 || !lappModel._model) return;
      enhanceReadyModel(lappModel);

      var csmModel = lappModel._model;
      window.__live2d_app = lappModel;
      window.__live2d_model = csmModel;

      state.elapsed += dt;
      var t = state.elapsed;

      // 1. Load saved motion baseline & advance active Cubism motion (e.g. Idle)
      csmModel.loadParameters();
      if (lappModel._motionManager) {
        if (lappModel._motionManager.isFinished()) {
          if (lappModel._modelSetting && lappModel._modelSetting.getMotionCount('Idle') > 0) {
            lappModel.startRandomMotion('Idle', 1);
          }
        } else {
          lappModel._motionManager.updateMotion(csmModel, dt);
        }
      }
      csmModel.saveParameters();

      // 2. Natural eye-blink (applied before ExpressionManager so wink/happy expressions override cleanly)
      updateNaturalBlink(dt);
      if (state.blinkFactor < 0.999) {
        multParam(csmModel, 'ParamEyeLOpen', state.blinkFactor);
        multParam(csmModel, 'ParamEyeROpen', state.blinkFactor);
      }

      // 3. Evaluate string-keyed Cubism ExpressionManager (.exp3.json)
      if (lappModel._expressionManager) {
        lappModel._expressionManager.updateMotion(csmModel, dt);
      }

      // 4. Full-Body Limb Choreography + Autonomous Living Idle Director + 2.5D Gaze
      var exp = state.expression;
      var expHeadX = exp === 'focus' ? 2.0 : exp === 'shy' ? -1.5 : 0;
      var expHeadY = exp === 'shy' ? -2.8 : exp === 'focus' ? -2.2 : exp === 'happy' ? 1.8 : 0;
      var expHeadZ = exp === 'wink' ? 3.2 : exp === 'shy' ? -2.4 : exp === 'happy' ? -1.8 : 0;

      if (state.dizzyShake > 0.001) {
        state.dizzyShake = Math.max(0, state.dizzyShake - dt * 0.85);
      }
      var shakeOsc = state.dizzyShake > 0.001 ? Math.sin(t * 24.0) * 6.5 * state.dizzyShake : 0;

      var breathWave = Math.sin(t * 2.05);
      var musicBeat = state.musicPlaying ? Math.sin(t * 5.6) : 0;
      var musicSway = state.musicPlaying ? Math.sin(t * 2.8) : 0;
      var pointerIdleSec = t - state.lastPointerAt;

      // Autonomous idle limb habits (calm, unhurried every 8.5-13.5s — zero restless twitching!)
      if (!state.activeAction && t >= state.nextIdleHabitAt && state.webglReady) {
        var idleHabits = ['wave', 'typing', 'swipe', 'stretch', 'ear_peek'];
        var pickedHabit = idleHabits[state.idleHabitCursor % idleHabits.length];
        var habitAmp = state.idleHabitCursor === 0 ? 0.85 : (pickedHabit === 'wave' ? 0.68 : 0.78);
        state.idleHabitCursor += 1;
        triggerLimbAction(pickedHabit, { interactive: false, amp: habitAmp });
        state.nextIdleHabitAt = t + 8.5 + Math.random() * 5.0;
      }

      // Evaluate active full-body limb choreography routine (smooth low-frequency human arcs, ZERO rapid finger/wrist twitching!)
      var actArmRA = 0, actHandR = 0, actTab = 0, actShrug = 0, actEar = 0, actLean = 0;
      var actHeadX = 0, actHeadY = 0, actHeadZ = 0, actBodyZ = 0;
      if (state.activeAction) {
        var act = state.activeAction;
        var ageA = t - act.start;
        if (ageA >= act.dur) {
          state.activeAction = null;
        } else if (ageA >= 0) {
          var pA = ageA / act.dur;
          // Smooth raised-cosine bell envelope (0.5 - 0.5*cos(2*pi*p)) — C1 continuous zero-jerk start & landing!
          var env = 0.5 * (1.0 - Math.cos(pA * Math.PI * 2.0)) * act.amp;
          var nm = act.name;

          if (nm === 'wave') {
            var gentleArc = Math.sin(pA * Math.PI * 3.0);
            actArmRA = (0.64 + 0.18 * gentleArc) * env;
            actHandR = 0.42 * gentleArc * env;
            actTab   = 0.26 * env;
            actShrug = 0.26 * env;
            actEar   = 0.90 * env;
            actHeadZ = 3.2 * env;
            actBodyZ = 1.8 * env;
          } else if (nm === 'typing') {
            // Calm, deliberate touch-screen glides (~0.85 Hz smooth forearm touches, ZERO spasmodic vibration!)
            var glide = Math.sin(pA * Math.PI * 2.0);
            var touch = Math.sin(pA * Math.PI * 4.0);
            actLean  = -3.6 * env;
            actArmRA = (-0.42 - 0.34 * glide) * env;
            actHandR = (-0.18 + 0.42 * touch) * env;
            actTab   = (-0.18 - 0.22 * Math.max(0, -touch)) * env;
            actEar   = 0.32 * env;
            actHeadY = -2.6 * env;
            actHeadX = 1.5 * glide * env;
          } else if (nm === 'swipe') {
            var swp = Math.sin((pA - 0.5) * Math.PI);
            actTab   = 0.80 * env;
            actArmRA = (-0.36 - 0.48 * Math.max(0, swp)) * env;
            actHandR = (-0.36 * (1 - pA) + 0.44 * pA) * env;
            actEar   = 0.68 * env;
            actLean  = -2.2 * env;
            actHeadZ = -3.2 * env;
            actHeadX = 2.2 * swp * env;
          } else if (nm === 'cheer') {
            var bnc = 0.5 * (1.0 - Math.cos(pA * Math.PI * 4.0));
            actArmRA = (0.48 + 0.38 * bnc) * env;
            actHandR = (0.28 + 0.30 * bnc) * env;
            actTab   = (0.40 + 0.48 * bnc) * env;
            actShrug = (0.34 + 0.52 * bnc) * env;
            actEar   = 0.95 * env;
            actHeadY = 2.8 * bnc * env;
            actBodyZ = Math.sin(pA * Math.PI * 2.0) * 2.0 * env;
          } else if (nm === 'shy') {
            actLean  = 3.4 * env;
            actShrug = 0.78 * env;
            actArmRA = 0.42 * env;
            actHandR = 0.45 * env;
            actTab   = -0.78 * env;
            actEar   = -0.92 * env;
            actHeadY = -3.0 * env;
            actHeadZ = -2.6 * env;
          } else if (nm === 'startled') {
            var jmp = Math.sin(Math.min(1.0, pA * 1.6) * Math.PI);
            actLean  = 4.4 * env;
            actShrug = (0.55 + 0.35 * jmp) * env;
            actArmRA = (0.62 + 0.22 * jmp) * env;
            actHandR = 0.48 * jmp * env;
            actTab   = (0.56 * jmp - 0.36 * (1 - jmp)) * env;
            actEar   = (jmp > 0.35 ? 0.92 : -0.75) * env;
          } else if (nm === 'stretch') {
            var roll = Math.sin(pA * Math.PI * 1.3);
            actShrug = (0.76 * Math.max(0, roll) - 0.30 * Math.max(0, -roll)) * env;
            actLean  = -2.2 * Math.sin(pA * Math.PI) * env;
            actArmRA = (0.34 * Math.max(0, roll) - 0.22 * Math.max(0, -roll)) * env;
            actHandR = 0.24 * roll * env;
            actTab   = 0.44 * env;
            actEar   = 0.68 * env;
            actHeadZ = 3.0 * env;
          } else if (nm === 'ear_peek') {
            actEar   = Math.sin(pA * Math.PI * 3.0) * 0.90 * env;
            actTab   = 0.32 * env;
            actHandR = -0.22 * env;
            actHeadZ = 2.4 * env;
          }

          // Keep immediate cursor head-tracking 100% pure during active mouse movement for non-interactive ambient habits
          if (!act.interactive && pointerIdleSec < 1.5) {
            actHeadX *= 0.15;
            actHeadY *= 0.15;
          }
        }
      }

      // Steady resting baseline (ZERO constant finger/wrist wiggle! Gentle slow groove when music plays)
      var baseArmRA = 0.045 * Math.sin(t * 2.05 - 0.4) + (state.musicPlaying ? 0.16 * musicSway : 0);
      var baseHandR = state.musicPlaying ? 0.24 * Math.sin(t * 2.8 + 0.5) : 0;
      var baseTab   = 0.10 * Math.sin(t * 2.05 - 0.7) + (state.musicPlaying ? 0.22 * musicSway : 0);
      var baseShrug = 0.08 * breathWave + (state.musicPlaying ? 0.26 * Math.abs(musicSway) : 0);
      var baseEar   = 0.06 * Math.sin(t * 1.25) + (state.musicPlaying ? 0.42 * Math.abs(musicBeat) : 0);

      state.armRA.target     = clamp(baseArmRA + actArmRA, -1.0, 1.0);
      state.handR.target     = clamp(baseHandR + actHandR, -1.0, 1.0);
      state.tabletAct.target = clamp(baseTab   + actTab,   -1.0, 1.0);
      state.shrug.target     = clamp(baseShrug + actShrug, -1.0, 1.0);
      state.earPerk.target   = clamp(baseEar   + actEar,   -1.0, 1.0);
      state.bodyLean.target  = clamp(actLean + (state.musicPlaying ? -1.4 * Math.abs(musicSway) : 0), -8.0, 8.0);

      // When cursor has been idle > 3.2s, gently relax from staring at screen edge into natural reading micro-glances
      var idleRelax = pointerIdleSec > 3.2 ? clamp((pointerIdleSec - 3.2) / 2.4, 0, 1) : 0;
      var idleGlanceX = 0.13 * Math.sin(t * 0.68) + 0.05 * Math.sin(t * 1.85);
      var idleGlanceY = -0.08 + 0.09 * Math.cos(t * 0.54);
      var effPtrX = state.pointerX * (1 - idleRelax * 0.86) + idleGlanceX * idleRelax;
      var effPtrY = state.pointerY * (1 - idleRelax * 0.86) + idleGlanceY * idleRelax;

      // Target angles matching exact spec:
      // ParamAngleX: ±12°, ParamAngleY: ±10°, ParamAngleZ: ±4°, ParamBodyAngleX: ±5°
      state.headX.target = effPtrX * 12.0 + expHeadX + actHeadX + shakeOsc;
      state.headY.target = effPtrY * 10.0 + expHeadY + actHeadY + breathWave * 0.85 + (state.musicPlaying ? Math.abs(musicBeat) * 1.8 : 0);
      state.headZ.target = effPtrX * 4.0 + expHeadZ + actHeadZ + musicSway * 2.4 + Math.sin(t * 1.25) * 0.5 + shakeOsc * 0.45;

      state.bodyX.target = effPtrX * 5.0 + shakeOsc * 0.35;
      state.bodyY.target = effPtrY * 2.6 + breathWave * 0.9;
      state.bodyZ.target = effPtrX * 2.2 + actBodyZ + musicSway * 1.8;

      stepSpring(state.headX, 92, 14.5, dt);
      stepSpring(state.headY, 92, 14.5, dt);
      stepSpring(state.headZ, 98, 13.5, dt);
      stepSpring(state.bodyX, 76, 13.5, dt);
      stepSpring(state.bodyY, 80, 13.5, dt);
      stepSpring(state.bodyZ, 78, 13.0, dt);
      stepSpring(state.bodyLean, 68, 13.0, dt);
      // Heavy-inertia critically-damped limb springs (k=56..62, c=13.5..14.0 -> physically silky, zero twitch!)
      stepSpring(state.armRA, 56, 13.5, dt);
      stepSpring(state.handR, 62, 14.0, dt);
      stepSpring(state.tabletAct, 64, 13.5, dt);
      stepSpring(state.shrug, 68, 13.5, dt);
      stepSpring(state.earPerk, 85, 14.0, dt);

      // Fast vestibulo-ocular eye gaze (±1.0) with subtle organic micro-life
      var eyeRate = Math.min(1, dt * 15.5);
      var shyGazeY = exp === 'shy' ? -0.22 : exp === 'focus' ? -0.18 : 0;
      state.gazeX += (effPtrX - state.gazeX) * eyeRate;
      state.gazeY += (clamp(effPtrY + shyGazeY, -1, 1) - state.gazeY) * eyeRate;

      var microX = 0.014 * Math.sin(t * 1.3) + 0.006 * Math.cos(t * 2.9);
      var microY = 0.012 * Math.cos(t * 1.1) + 0.005 * Math.sin(t * 3.1);
      var finalEyeX = clamp(state.gazeX + microX, -1.0, 1.0);
      var finalEyeY = clamp(state.gazeY + microY, -1.0, 1.0);

      // Write head, gaze, body, multi-joint limbs, tablet, shoulders & cat-ears BEFORE _physics.evaluate!
      var mKeep = pointerIdleSec < 1.2 ? 0.18 : 0.42;
      blendParamWithMotion(csmModel, 'ParamAngleX', state.headX.pos, mKeep, -13.5, 13.5);
      blendParamWithMotion(csmModel, 'ParamAngleY', state.headY.pos, mKeep, -11.5, 11.5);
      blendParamWithMotion(csmModel, 'ParamAngleZ', state.headZ.pos, 0.35, -8.5, 8.5);
      blendParamWithMotion(csmModel, 'ParamEyeBallX', finalEyeX, 0.08, -1.0, 1.0);
      blendParamWithMotion(csmModel, 'ParamEyeBallY', finalEyeY, 0.08, -1.0, 1.0);
      blendParamWithMotion(csmModel, 'ParamBodyAngleX', state.bodyX.pos, mKeep, -7.5, 7.5);
      blendParamWithMotion(csmModel, 'ParamBodyAngleY', state.bodyY.pos, 0.28, -6.0, 6.0);
      blendParamWithMotion(csmModel, 'ParamBodyAngleZ', state.bodyZ.pos, 0.32, -6.5, 6.5);
      blendParamWithMotion(csmModel, 'ParamBodyLean', state.bodyLean.pos, 0.30, -8.5, 8.5);
      setParam(csmModel, 'ParamBreath', 0.5 + 0.5 * breathWave, 1.0);

      // Multi-joint decoupled limb, holographic screen, dual-shoulder & glowing <7> cat-ear parameters
      setParam(csmModel, 'ParamArmRA', state.armRA.pos, 1.0);
      setParam(csmModel, 'ParamHandR', state.handR.pos, 1.0);
      setParam(csmModel, 'ParamTabletAct', state.tabletAct.pos, 1.0);
      setParam(csmModel, 'ParamShoulderShrug', state.shrug.pos, 1.0);
      setParam(csmModel, 'ParamEarPerk', state.earPerk.pos, 1.0);

      // 5. Evaluate Cubism pendulum physics (twin-tails, cheek-locks & drawstrings)
      if (lappModel._physics) {
        lappModel._physics.evaluate(csmModel, dt);
      }

      // Preserve ±5° torso follow if physics3.json also targeted ParamBodyAngleX as an output
      if (state.paramMap && state.paramMap.ParamBodyAngleX !== undefined) {
        var bxIdx = state.paramMap.ParamBodyAngleX;
        if (Math.abs(csmModel.getParameterValueByIndex(bxIdx)) < Math.abs(state.bodyX.pos) * 0.35) {
          csmModel.setParameterValueByIndex(bxIdx, clamp(state.bodyX.pos, -7.5, 7.5), 1);
        }
      }

      // 6. Pose & final vertex deformation update
      if (lappModel._pose) {
        lappModel._pose.updateParameters(csmModel, dt);
      }
      csmModel.update();

      state.renderedFrames += 1;
      if (!state.webglReady && state.renderedFrames >= 2) {
        state.webglReady = true;
        state.mode = 'webgl2';
        host.setAttribute('data-mode', 'webgl2');
        host.classList.add('is-webgl-ready');
        stageEl.classList.add('is-webgl-ready');
      }
    }

    function renderCustomLive2DPass() {
      var sub = state.subdelegate;
      var mgr = state.live2dMgr;
      if (!sub || !mgr || !mgr._models) return;
      var lappModel = mgr._models.at(0);
      if (!lappModel) return;
      state.lappModel = lappModel;

      var cvs = sub.getCanvas();
      var cvsW = cvs.width || 1;
      var cvsH = cvs.height || 1;

      var csmModel = lappModel.getModel && lappModel.getModel();
      if (!csmModel || lappModel._state < 22) return;

      // Exact isotropic `object-fit: contain; object-position: center bottom` projection
      // so live WebGL2 framing aligns 1:1 with `7steve-v2-static.webp` with zero aspect squash!
      var modelW = csmModel.getCanvasWidth() || 1;
      var modelH = csmModel.getCanvasHeight() || 1.3333;
      var modelAspect = modelW / modelH;
      var cvsAspect = cvsW / cvsH;

      var modelMatrix = lappModel.getModelMatrix();
      modelMatrix.loadIdentity();

      var proj = mgr._viewMatrix.clone();
      proj.loadIdentity();

      var fitScale = framing.scale || 1.0;
      if (modelAspect <= cvsAspect) {
        // Fit full model height [-1, 1], isotropic X scale = cvsH / cvsW
        var sH = (2.0 / modelH) * fitScale;
        modelMatrix.scale(sH, sH);
        modelMatrix.translate(framing.offsetX || 0, (framing.offsetY || 0) - (1.0 - fitScale));
        proj.scale(cvsH / cvsW, 1.0);
      } else {
        // Fit full model width [-1, 1], bottom-align inside taller canvas
        var sW = (2.0 / modelW) * fitScale;
        var sy = cvsW / cvsH;
        var halfNormH = (modelH / modelW) * fitScale * sy;
        modelMatrix.scale(sW, sW);
        proj.scale(1.0, sy);
        proj.translate(framing.offsetX || 0, -1.0 + halfNormH + (framing.offsetY || 0));
      }

      lappModel.update();
      lappModel.draw(proj);
    }

    var currentFrameDt = 0.016;

    function tick(ts) {
      if (state.destroyed || state.userPaused || state.docHidden) {
        state.rafId = 0;
        return;
      }
      var dt = state.lastTs ? (ts - state.lastTs) / 1000 : 0.016;
      state.lastTs = ts;
      if (dt <= 0 || !isFinite(dt)) dt = 0.016;
      if (dt > 0.04) dt = 0.04;
      currentFrameDt = dt;

      if (state.subdelegate) {
        try {
          state.subdelegate.update();
        } catch (_) {}
      }
      state.rafId = window.requestAnimationFrame(tick);
    }

    function startLoop() {
      if (state.destroyed || state.userPaused || state.docHidden || state.rafId) return;
      if (!state.subdelegate) return;
      state.lastTs = 0;
      state.rafId = window.requestAnimationFrame(tick);
    }

    function stopLoop() {
      if (state.rafId) {
        window.cancelAnimationFrame(state.rafId);
        state.rafId = 0;
      }
      state.lastTs = 0;
    }

    function markStaticFallback(reason) {
      if (state.destroyed) return;
      state.mode = 'static-fallback';
      host.setAttribute('data-mode', 'static-fallback');
      if (reason) host.setAttribute('data-fallback-reason', reason);
      fallbackImg.classList.add('is-loaded');
    }

    function bootWebGL() {
      if (state.destroyed || state.bootStarted) return;
      state.bootStarted = true;

      if (window.location.protocol === 'file:') {
        markStaticFallback('file-protocol');
        return;
      }

      syncBackingResolution();

      var gl = null;
      try {
        gl = canvas.getContext('webgl2', {
          alpha: true,
          premultipliedAlpha: true,
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true
        });
      } catch (_) {
        gl = null;
      }

      if (!gl) {
        markStaticFallback('no-webgl2');
        return;
      }

      var resolvedModelUrl = resolveAssetUrl(modelUrl);

      Promise.all([
        ensureCubismRuntime(),
        fetch(resolvedModelUrl).then(function (res) {
          if (!res.ok) throw new Error('Model HTTP ' + res.status);
          return true;
        })
      ])
        .then(function (results) {
          if (state.destroyed) return;
          var runtime = results[0];
          if (!runtime || typeof runtime.AppDelegate !== 'function') {
            throw new Error('AppDelegate export missing');
          }

          syncBackingResolution();

          var appDelegate = new runtime.AppDelegate();
          // Suppress duplicate legacy document listeners from chunk/index2.js
          appDelegate.initializeEventListener = function () {};
          appDelegate.releaseEventListener = function () {};

          appDelegate.initialize();
          // Detach legacy `#live2d` ID after synchronous lookup so `css/style.css`'s `html body #live2d { 680px !important }` never hijacks layout!
          canvas.id = 'sjc-live2d-canvas';
          canvas.style.width = '100%';
          canvas.style.height = '100%';

          var subdelegate = appDelegate.subdelegates && appDelegate.subdelegates.at(0);
          if (!subdelegate || !subdelegate.getGlManager() || !subdelegate.getGlManager().getGl()) {
            throw new Error('Cubism WebGL2 subdelegate failed');
          }

          subdelegate.resizeCanvas = function () {
            syncBackingResolution();
            var g = this.getGlManager().getGl();
            if (g) g.viewport(0, 0, g.drawingBufferWidth, g.drawingBufferHeight);
          };
          subdelegate.onResize();

          var live2dMgr = subdelegate.getLive2DManager();
          live2dMgr.onUpdate = renderCustomLive2DPass;

          appDelegate.changeModel(resolvedModelUrl);
          var lappModel = live2dMgr._models && live2dMgr._models.at(0);
          if (!lappModel) {
            throw new Error('LAppModel creation failed');
          }

          lappModel.update = function () {
            stepModelFrame(this, currentFrameDt);
          };

          state.appDelegate = appDelegate;
          state.subdelegate = subdelegate;
          state.live2dMgr = live2dMgr;
          state.lappModel = lappModel;
          window.__cubism5 = appDelegate;

          startLoop();
        })
        .catch(function (err) {
          console.info('[CompanionAvatar] WebGL2 Live2D fallback to static portrait:', err && err.message ? err.message : err);
          markStaticFallback('load-error');
        });
    }

    var ACTION_DURATIONS = {
      wave: 2.1,
      typing: 2.4,
      swipe: 2.1,
      cheer: 2.1,
      shy: 2.0,
      startled: 2.3,
      stretch: 2.5,
      ear_peek: 1.7
    };

    function triggerLimbAction(actionName, opts) {
      if (state.destroyed) return;
      var o = opts || {};
      var dur = ACTION_DURATIONS[actionName] || 2.0;
      state.activeAction = {
        name: ACTION_DURATIONS[actionName] ? actionName : 'wave',
        start: state.elapsed,
        dur: o.duration ? o.duration / 1000 : dur,
        amp: typeof o.amp === 'number' ? o.amp : 1.0,
        interactive: o.interactive !== false
      };
      if (o.interactive !== false) {
        state.nextIdleHabitAt = state.elapsed + dur + 4.8 + Math.random() * 2.5;
      }
    }

    function setExpression(name, durationMs) {
      if (state.destroyed) return;
      var next = EXPRESSION_CANDIDATES[name] ? name : 'smile';
      if (durationMs === undefined) durationMs = 3200;

      if (state.exprTimer) {
        clearTimeout(state.exprTimer);
        state.exprTimer = 0;
      }

      state.expression = next;
      host.setAttribute('data-expression', next);
      state.actionCounter += 1;

      // Pair every semantic expression with rich multi-joint limb choreography!
      if (next === 'happy') {
        state.headY.vel += 18;
        state.headZ.vel -= 12;
        triggerLimbAction(state.actionCounter % 2 === 0 ? 'wave' : 'cheer', { interactive: true, amp: 1.0 });
      } else if (next === 'wink') {
        state.headZ.vel += 18;
        state.headY.vel += 8;
        triggerLimbAction('wave', { interactive: true, amp: 0.92 });
      } else if (next === 'shy') {
        state.headY.vel -= 14;
        state.headZ.vel -= 12;
        triggerLimbAction('shy', { interactive: true, amp: 1.0 });
      } else if (next === 'focus') {
        state.headY.vel -= 10;
        state.headX.vel += 10;
        triggerLimbAction(state.actionCounter % 2 === 0 ? 'swipe' : 'typing', { interactive: true, amp: 1.0 });
      } else if (next === 'dizzy' || next === 'surprised') {
        state.dizzyShake = 1.0;
        state.headZ.vel += 24;
        triggerLimbAction('startled', { interactive: true, amp: 1.0 });
      }

      applyCubismExpression(next, next !== 'smile');

      if (next !== 'smile' && durationMs > 0 && isFinite(durationMs)) {
        state.exprTimer = setTimeout(function () {
          state.exprTimer = 0;
          if (!state.destroyed) {
            state.expression = 'smile';
            host.setAttribute('data-expression', 'smile');
            applyCubismExpression('smile', false);
          }
        }, durationMs);
      }
    }

    function impulse(vec) {
      if (state.destroyed || !vec) return;
      var ix = Number(vec.x) || 0;
      var iy = Number(vec.y) || 0;
      var itilt = Number(vec.tilt) || 0;

      // Positive companion.js y (e.g. head pat y: +5) dips head downward (-ParamAngleY) then springs up
      state.headX.vel += ix * 4.2;
      state.headY.vel -= iy * 4.6;
      state.headZ.vel += itilt * 3.8;
      state.bodyX.vel += ix * 2.2;
      state.bodyY.vel -= iy * 2.0;
      state.bodyZ.vel += itilt * 2.0;
    }

    function setMusicPlaying(playing) {
      if (state.destroyed) return;
      state.musicPlaying = Boolean(playing);
      host.setAttribute('data-music', state.musicPlaying ? 'on' : 'off');
    }

    function setPaused(paused) {
      if (state.destroyed) return;
      state.userPaused = Boolean(paused);
      host.setAttribute('data-paused', state.userPaused ? 'true' : 'false');
      if (state.userPaused) {
        stopLoop();
      } else {
        if (!state.bootStarted) {
          bootWebGL();
        } else {
          if (state.subdelegate) state.subdelegate._needResize = true;
          startLoop();
        }
      }
    }

    function updatePointerFromEvent(e) {
      if (state.destroyed || state.userPaused) return;
      var rect = stageEl.getBoundingClientRect();
      var cx = rect.width > 0 ? rect.left + rect.width * 0.50 : window.innerWidth - 116;
      var cy = rect.height > 0 ? rect.top + rect.height * 0.30 : window.innerHeight - 208;

      var dx = e.clientX - cx;
      var dy = cy - e.clientY; // +up, -down in Cubism coordinate space

      var spanX = dx < 0
        ? Math.max(220, cx * 0.72)
        : Math.max(84, (window.innerWidth - cx) * 0.82);
      var spanY = dy >= 0
        ? Math.max(200, cy * 0.72)
        : Math.max(96, (window.innerHeight - cy) * 0.82);

      state.pointerX = clamp(softCurve(dx / spanX), -1, 1);
      state.pointerY = clamp(softCurve(dy / spanY), -1, 1);
      state.lastPointerAt = state.elapsed;
    }

    function onWindowLeave() {
      state.pointerX = 0;
      state.pointerY = 0;
    }

    function onVisibilityChange() {
      state.docHidden = Boolean(document.hidden);
      if (state.docHidden) {
        stopLoop();
      } else if (!state.userPaused) {
        if (!state.bootStarted) bootWebGL();
        else startLoop();
      }
    }

    function onHitClick(e) {
      if (state.destroyed || state.userPaused) return;
      var target = e.target;
      var zone = target && target.getAttribute ? target.getAttribute('data-zone') : null;
      if (!zone) return;
      e.stopPropagation();
      if (typeof opts.onZoneTap === 'function') {
        opts.onZoneTap(zone, e);
      }
    }

    hitSvg.addEventListener('click', onHitClick);
    window.addEventListener('pointermove', updatePointerFromEvent, { passive: true });
    window.addEventListener('mousemove', updatePointerFromEvent, { passive: true });
    window.addEventListener('blur', onWindowLeave, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Defer initial boot by 1 rAF so companion.js's synchronous `setPaused(currentState === 'mini')`
    // takes effect first (preventing unnecessary mobile mini-mode downloads while booting desktop immediately!)
    window.requestAnimationFrame(function () {
      if (!state.destroyed && !state.userPaused) {
        bootWebGL();
      }
    });

    function getDiagnostics() {
      var params = null;
      if (state.lappModel && state.lappModel._model && state.lappModel._model._model) {
        var p = state.lappModel._model._model.parameters;
        params = {};
        for (var i = 0; i < p.count; i++) {
          params[p.ids[i]] = Number(p.values[i].toFixed(4));
        }
      }
      return {
        mode: state.mode,
        modelUrl: state.modelUrl || DEFAULT_MODEL_URL,
        webglReady: state.webglReady,
        cubismState: state.lappModel ? state.lappModel._state : -1,
        renderedFrames: state.renderedFrames,
        rafActive: Boolean(state.rafId),
        paused: state.userPaused,
        expression: state.expression,
        activeExpKey: state.activeExpKey,
        activeAction: state.activeAction ? state.activeAction.name : null,
        musicPlaying: state.musicPlaying,
        canvasCssSize: { width: canvas.clientWidth, height: canvas.clientHeight },
        canvasBufferSize: { width: canvas.width, height: canvas.height },
        pointer: { x: Number(state.pointerX.toFixed(3)), y: Number(state.pointerY.toFixed(3)) },
        params: params
      };
    }

    function destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      stopLoop();
      if (state.exprTimer) {
        clearTimeout(state.exprTimer);
        state.exprTimer = 0;
      }
      hitSvg.removeEventListener('click', onHitClick);
      window.removeEventListener('pointermove', updatePointerFromEvent);
      window.removeEventListener('mousemove', updatePointerFromEvent);
      window.removeEventListener('blur', onWindowLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (state.appDelegate) {
        try { state.appDelegate.release(); } catch (_) {}
        state.appDelegate = null;
      }
      if (host.parentNode === stageEl) {
        stageEl.removeChild(host);
      }
    }

    return {
      setExpression: setExpression,
      playAction: triggerLimbAction,
      impulse: impulse,
      setMusicPlaying: setMusicPlaying,
      setPaused: setPaused,
      getDiagnostics: getDiagnostics,
      destroy: destroy
    };
  }

  window.CompanionAvatar = {
    mount: function (stageEl, opts) {
      var instance = mount(stageEl, opts);
      // Expose last-mounted instance for diagnostics / QA
      window.CompanionAvatar._instance = instance;
      return instance;
    },
    _instance: null
  };
})();
