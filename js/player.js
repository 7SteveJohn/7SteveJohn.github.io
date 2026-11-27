/**
 * 右下角悬浮背景音乐播放器
 * ----------------------------------------------------
 * - 音频不进 SW 预缓存：首次在线播放后由 SW 运行时缓存接管，断网也能复播
 * - ❗零播放记录（2026-09-29 应要求移除续听记忆）：不记听到哪首/听到几秒，
 *   每个访客都从第一首开始；旧续听键主动清除——共用设备不留下上一个人的收听痕迹
 * - 歌单改动直接改 SONGS 数组（src 用 ASCII 文件名，title 保留原名）
 * - 循环模式：顺序循环（默认）/ 单曲循环，模式按钮切换，localStorage 持久化
 * - 自定义歌曲顺序：歌单每项 ↑↓ 移动，顺序持久化（按 src 记录，新增曲目排尾）
 * - 音乐律动：AnalyserNode 产出 window.__BEAT（level/lv/mid/treble），js/cosmos/ 推理场每帧读取
 *   驱动外扩 / 涡流 / 云核爆亮 / 流星（同源 mp3 无 CORS 问题；MediaElementSource 对同一元素只能建一次）
 */
(function () {
  'use strict';

  const SONGS = [
    { src: 'music/attention.mp3',          title: 'Attention' },
    { src: 'music/call-of-silence.mp3',    title: 'Call of Silence' },
    { src: 'music/dark-aria.mp3',          title: 'DARK ARIA' },
    { src: 'music/episode-33.mp3',         title: 'Episode 33' },
    { src: 'music/letting-go.mp3',         title: 'LETTING GO' },
    { src: 'music/sakura.mp3',             title: 'SAKURA' },
    { src: 'music/take-me-hand.mp3',       title: 'Take Me Hand' },
    { src: 'music/tek-it.mp3',             title: 'Tek It' },
    { src: 'music/time-machine.mp3',       title: 'time machine (feat. aren park)' },
    { src: 'music/hoshi-to-bokura-to.mp3', title: '星と僕らと' },
    { src: 'music/kami-no-manimani.mp3',   title: '神のまにまに' }
  ];

  // 全站访客本地数据统一 sj. 前缀；旧版「续听」键在这里主动清除（零播放记录）
  const LS_RESUME = 'sj.music-resume';
  const LS_MODE = 'sj.music-mode';
  const LS_ORDER = 'sj.music-order';
  const legacy = (k) => { try { return localStorage.getItem(k.replace('sj.', '')); } catch (e) { return null; } };

  const audio = document.getElementById('music-audio');
  const fab = document.getElementById('music-fab');
  const panel = document.getElementById('music-panel');
  const titleEl = document.getElementById('music-title');
  const listEl = document.getElementById('music-list');
  const seekEl = document.getElementById('music-seek');
  const curEl = document.getElementById('music-cur');
  const durEl = document.getElementById('music-dur');
  const playBtn = document.getElementById('music-play');
  const prevBtn = document.getElementById('music-prev');
  const nextBtn = document.getElementById('music-next');
  const closeBtn = document.getElementById('music-close');
  const modeBtn = document.getElementById('music-mode');

  let current = 0;      // 当前曲目索引
  let seeking = false;  // 进度条拖动中，暂停 timeupdate 覆盖
  let mode = 'list';    // 'list' 顺序循环 | 'one' 单曲循环

  // —— 工具 ——
  const fmt = (s) => {
    if (!isFinite(s)) return '0:00';
    s = Math.floor(s);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  // 零播放记录：清掉老版本留下的续听键（含旧前缀）
  const clearResume = () => {
    try {
      localStorage.removeItem(LS_RESUME);
      localStorage.removeItem('music-resume');
    } catch (e) { /* 隐私模式等场景静默跳过 */ }
  };

  // —— 自定义顺序 ——
  function applyOrder() {
    try {
      const order = JSON.parse(localStorage.getItem(LS_ORDER) || legacy(LS_ORDER) || 'null');
      if (Array.isArray(order) && order.length) {
        const bySrc = new Map(SONGS.map(function (s) { return [s.src, s]; }));
        const next = [];
        for (const src of order) {
          const s = bySrc.get(src);
          if (s) { next.push(s); bySrc.delete(src); }
        }
        for (const s of bySrc.values()) next.push(s);   // 新增曲目排尾
        SONGS.length = 0;
        for (const s of next) SONGS.push(s);
      }
    } catch (e) { /* 数据损坏则用内置顺序 */ }
  }
  const saveOrder = () => {
    try { localStorage.setItem(LS_ORDER, JSON.stringify(SONGS.map(function (s) { return s.src; }))); } catch (e) {}
  };

  // —— 音乐律动：节拍包络 → window.__BEAT ——
  // 不用低频均值（那是恒定值，眼睛看不出"律动"）：瞬时能量对比慢速均值，
  // 超过阈值算一拍，冲高立即、回落带衰减 —— 视觉上是"哐→散"的冲击感。
  let actx = null, analyser = null, beatRaf = 0;
  let beatPulse = 0, beatLock = 0, beatPrevT = 0;
  const BEAT_ARR = new Float32Array(1024);   // fftSize 2048 → 1024 bins（dB 域）
  const BEAT_HIST = [];                      // bass 功率历史（~0.8s，自适应中值阈值用）
  let beatPeak = 0.05;                       // AGC：3s 衰减式峰值跟随（初值取典型 RMS 量级，过高会让开头律动沉底）
  let bassEnv = 0, midEnv = 0, treEnv = 0;   // 非对称指数包络（attack 10ms / release 120ms）
  // 缓存视频节点与频谱控件：彻底消除 beatLoop 每秒 60~120 次的 querySelectorAll 开销
  let cachedProductVideos = null;
  let cachedHeroMusicBtn = null;
  let cachedHudRight = null;
  function getProductVideos() {
    if (!cachedProductVideos) {
      cachedProductVideos = Array.from(document.querySelectorAll('#products video')).map((v) => ({
        v,
        box: v.closest('.cover-box')
      }));
    }
    return cachedProductVideos;
  }
  function emitMusicState() {
    try {
      window.dispatchEvent(new CustomEvent('sj-music-state', {
        detail: {
          playing: !!(audio && !audio.paused),
          title: SONGS[current] ? SONGS[current].title : '背景音乐',
          index: current,
          total: SONGS.length
        }
      }));
    } catch (e) {}
  }

  function beatLoop() {
    // ❗句柄必须"只在本帧排下一帧"时赋值：早先写成帧首 beatRaf = rAF(...)，
    // 而切歌/暂停会触发 stopBeat() 把这个句柄 cancel 掉——但此时下一帧其实已经
    // 排进队列，cancel 的却是"再下一帧"的句柄，于是出现"取消后又复活"的错位；
    // 反复几次句柄就永久失真，视觉上表现为放歌一段时间后律动整体消失（实测 9s 后归零）。
    if (!analyser) { beatRaf = 0; return; }
    const nw = performance.now();
    const dt = beatPrevT ? Math.min(0.1, (nw - beatPrevT) / 1000) : 0.016;
    beatPrevT = nw;
    // 信号链对齐 cosmos/audio 的深度调研结论（2026-09-30）：
    // float 数据（byte 是 dB 重映射且 -30dBFS 上限对响歌大量钳 255）+ smoothing 0
    // （内置 EMA 抹瞬态，平滑交给下面的非对称指数包络）+ Hz 边界频段（采样率自适应）。
    analyser.getFloatFrequencyData(BEAT_ARR);
    const fs = actx.sampleRate, nBins = analyser.fftSize / 2;
    const hz0 = (f) => Math.min(nBins - 1, Math.max(0, Math.round(f * nBins / fs)));
    const bandRMS = (lo, hi) => {
      let s = 0, n = 0;
      for (let i = lo; i <= hi && i < nBins; i++) { const lin = Math.pow(10, BEAT_ARR[i] / 20); s += lin * lin; n++; }
      return Math.sqrt(s / Math.max(1, n));
    };
    const energy = bandRMS(hz0(60), hz0(250));       // bass 60-250Hz：kick/贝斯冲击区
    const midRaw = bandRMS(hz0(250), hz0(4000));
    const treRaw = bandRMS(hz0(4000), hz0(12000));
    // 非对称指数包络：起音快（10ms 跟瞬态）、回落慢（120ms 有余韵），帧率无关
    const envStep = (cur, tgt) => cur + (tgt - cur) * (1 - Math.exp(-dt / (tgt > cur ? 0.010 : 0.120)));
    bassEnv = envStep(bassEnv, energy);
    midEnv = envStep(midEnv, midRaw);
    treEnv = envStep(treEnv, treRaw);
    // AGC：对 3s 衰减式峰值归一——安静歌有反应、响歌不过冲（写死的幅度必然顾此失彼）
    beatPeak = Math.max(bassEnv, beatPeak * Math.exp(-dt / 3.0));
    const lv = Math.min(1, bassEnv / (beatPeak + 1e-4));
    const mid = Math.min(1, midEnv / (beatPeak + 1e-4));
    const tre = Math.min(1, treEnv / (beatPeak + 1e-4));
    // 节拍：bass 瞬时功率 vs 最近 ~0.8s 历史中值 ×1.35（自适应中值阈值）+ 噪声门 + 280ms 不应期
    // （与 js/cosmos/audio/BeatDetector.js 同一套算法；检测在功率域 e=bassEnv² 上做）
    const e = bassEnv * bassEnv;
    BEAT_HIST.push(e);
    if (BEAT_HIST.length > 48) BEAT_HIST.shift();
    if (BEAT_HIST.length > 20) {
      const sorted = BEAT_HIST.slice().sort((a, b) => a - b);
      const med = sorted[sorted.length >> 1];
      let peak = 0;
      for (const v of BEAT_HIST) if (v > peak) peak = v;
      if (e > peak * 0.1 && e > med * 1.35 && nw - beatLock > 280) {
        beatLock = nw;
        beatPulse = Math.min(1, Math.sqrt(e / (med + 1e-6)) * 0.8);
      }
    }
    beatPulse *= Math.exp(-dt / 0.30);               // 指数回落（线性回落观感生硬）
    if (beatPulse < 0.02) beatPulse = 0;
    const bp = Math.min(1, beatPulse);
    window.__BEAT = {
      level: bp, lv: lv, slow: beatPeak, rise: e,
      mid: mid, treble: tre, ctx: actx ? actx.state : '-'
    };

    // 实时驱动首屏音频胶囊四段频谱柱与悬浮 FAB 微律动（纯 transform scaleY 变量，零回流）
    if (!cachedHeroMusicBtn) cachedHeroMusicBtn = document.getElementById('cosmos-enter');
    if (!cachedHudRight) cachedHudRight = document.querySelector('.cosmos-hud.tr');
    const e1 = (0.24 + Math.min(1, lv * 0.65 + bp * 0.35) * 0.76).toFixed(3);
    const e2 = (0.28 + Math.min(1, mid * 0.60 + bp * 0.40) * 0.72).toFixed(3);
    const e3 = (0.22 + Math.min(1, (mid + tre) * 0.42 + bp * 0.30) * 0.78).toFixed(3);
    const e4 = (0.20 + Math.min(1, tre * 0.70 + bp * 0.25) * 0.80).toFixed(3);
    if (cachedHeroMusicBtn && cachedHeroMusicBtn.classList.contains('is-playing')) {
      cachedHeroMusicBtn.style.setProperty('--eq-1', e1);
      cachedHeroMusicBtn.style.setProperty('--eq-2', e2);
      cachedHeroMusicBtn.style.setProperty('--eq-3', e3);
      cachedHeroMusicBtn.style.setProperty('--eq-4', e4);
    }
    if (fab && fab.classList.contains('is-playing')) {
      fab.style.setProperty('--beat-scale', (1 + bp * 0.06).toFixed(3));
    }
    if (cachedHudRight) {
      cachedHudRight.style.setProperty('--hud-beat', bp.toFixed(3));
    }

    // 若当前有介绍视频正在播放，驱动对应视频视窗的外框光晕律动（走缓存列表，零 DOM 查询）
    const vids = getProductVideos();
    for (let k = 0; k < vids.length; k++) {
      const item = vids[k];
      if (!item.v.paused && !item.v.ended) {
        if (item.box) {
          item.box.classList.add('is-playing-beat');
          item.box.style.setProperty('--beat-pulse', (bp * 0.75 + lv * 0.25).toFixed(3));
        }
        break;
      }
    }

    beatRaf = requestAnimationFrame(beatLoop);   // 续帧放帧尾：帧内任何早退都不会留下悬空句柄
  }
  function ensureAudioGraph() {
    if (actx && analyser) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    analyser = actx.createAnalyser();
    analyser.fftSize = 2048;                 // bin ≈ 23Hz@48k：kick 40-150Hz 可分辨
    analyser.smoothingTimeConstant = 0;      // 平滑交给 beatLoop 的非对称指数包络
    analyser.minDecibels = -85;              // 默认 -30 上限对响歌大量钳 255
    analyser.maxDecibels = -20;
    analyser.connect(actx.destination);
  }

  function connectMediaSource(el) {
    if (!el || el._audioSourceNode) return;
    try {
      ensureAudioGraph();
      if (!actx || !analyser) return;
      const srcNode = actx.createMediaElementSource(el);
      srcNode.connect(analyser);
      el._audioSourceNode = srcNode;
    } catch (e) {
      /* 跨源或重复建图守卫，失败不影响播放 */
    }
  }

  function startBeat(sourceEl) {
    try {
      ensureAudioGraph();
      if (!actx || !analyser) return;
      if (sourceEl) connectMediaSource(sourceEl);
      else if (audio) connectMediaSource(audio);
      if (actx.state === 'suspended') actx.resume().catch(function () {});
      if (!beatRaf) beatRaf = requestAnimationFrame(beatLoop);
    } catch (e) { /* 建图失败不影响播放本身 */ }
  }

  function stopBeat() {
    const anyVideoPlaying = Array.from(document.querySelectorAll('#products video')).some(function (v) {
      return !v.paused && !v.ended;
    });
    // 若当前仍有介绍视频在播，不要中止视频驱动的律动图
    if (anyVideoPlaying) return;

    if (beatRaf) { cancelAnimationFrame(beatRaf); beatRaf = 0; }
    window.__BEAT = { level: 0, lv: 0, mid: 0, treble: 0 };
    document.querySelectorAll('#products .cover-box').forEach(function (box) {
      box.classList.remove('is-playing-beat');
      box.style.removeProperty('--beat-pulse');
    });
  }

  // —— 循环模式 ——
  function applyMode() {
    audio.loop = (mode === 'one');   // 单曲循环交给浏览器：loop 时 ended 不触发，行为最稳
    modeBtn.classList.toggle('mode-one', mode === 'one');
    modeBtn.setAttribute('aria-label', '循环模式：' + (mode === 'one' ? '单曲循环' : '顺序循环'));
  }

  // —— 渲染 ——
  function renderList() {
    listEl.replaceChildren();
    SONGS.forEach((song, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = (i + 1) + '. ' + song.title;
      btn.setAttribute('aria-label', '播放 ' + song.title);
      if (i === current) btn.classList.add('is-current');
      btn.addEventListener('click', () => { startBeat(); load(i, true); });
      li.appendChild(btn);
      // 上移/下移：自定义歌单顺序
      const mk = (dir) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'song-move';
        b.textContent = dir < 0 ? '↑' : '↓';
        b.setAttribute('aria-label', (dir < 0 ? '上移' : '下移') + '：' + song.title);
        b.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const j = i + dir;
          if (j < 0 || j >= SONGS.length) return;
          const tmp = SONGS[i]; SONGS[i] = SONGS[j]; SONGS[j] = tmp;
          if (current === i) current = j; else if (current === j) current = i;
          saveOrder(); renderList();
        });
        return b;
      };
      li.appendChild(mk(-1));
      li.appendChild(mk(1));
      listEl.appendChild(li);
    });
  }

  function renderMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: SONGS[current].title,
      artist: '楠屿札记 · 博客 BGM'
    });
  }

  // —— 播放控制 ——
  let hasUserPlayed = false;
  let stopAllVideosForMusic = () => {};
  const isSaveNet = () => {
    const c = navigator.connection;
    return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
  };

  function prefetchCurrentAndNext() {
    if (!hasUserPlayed && audio.paused) return;
    const curUrl = audio.currentSrc || audio.src;
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      if (curUrl) navigator.serviceWorker.controller.postMessage({ type: 'prefetch-media', url: curUrl });
      const nextSong = SONGS[(current + 1) % SONGS.length];
      if (nextSong) navigator.serviceWorker.controller.postMessage({ type: 'prefetch-media', url: nextSong.src });
    }
  }

  function load(i, autoplay) {
    current = (i + SONGS.length) % SONGS.length;
    if (autoplay) {
      hasUserPlayed = true;
      stopAllVideosForMusic();
      try { audio.preload = 'auto'; } catch (e) {}
    }
    audio.src = SONGS[current].src;
    titleEl.textContent = SONGS[current].title;
    renderList();
    renderMediaSession();
    emitMusicState();
    if (autoplay) {
      audio.play().catch(() => { /* 用户未交互等场景静默 */ });
    } else {
      seekEl.value = 0;
      curEl.textContent = '0:00';
      durEl.textContent = '0:00';
    }
  }

  // 当前曲目真实起播且已缓冲就绪后再静默入库（未点播放绝不触发全曲缓存）：
  audio.addEventListener('canplaythrough', prefetchCurrentAndNext);
  audio.addEventListener('playing', function () {
    hasUserPlayed = true;
    if (audio.readyState >= 4) prefetchCurrentAndNext();
  });

  // 首曲瞬启预热：仅缓冲首段可播帧（canplay 或 8s 后若仍暂停则回落 metadata，绝不下全曲）：
  let primed = false;
  function prime() {
    if (primed) return;
    primed = true;
    const saveNet = isSaveNet();
    try { audio.preload = saveNet ? 'metadata' : 'auto'; } catch (e) {}
    if (!audio.src) audio.src = SONGS[current].src;
    if (!saveNet) {
      let settled = false;
      const dialBack = () => {
        if (settled) return;
        settled = true;
        audio.removeEventListener('canplay', dialBack);
        if (audio.paused) {
          try { audio.preload = 'metadata'; } catch (e) {}
        }
      };
      audio.addEventListener('canplay', dialBack, { once: true });
      if (audio.readyState >= 3) dialBack();
      else setTimeout(dialBack, 8000);
    }
  }

  function togglePlay() {
    if (!audio.src) { load(current, true); return; }
    if (audio.paused) {
      hasUserPlayed = true;
      stopAllVideosForMusic();
      try { audio.preload = 'auto'; } catch (e) {}
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  function restore() {
    clearResume();          // 零播放记录：老访客的续听键一并清掉
    applyOrder();
    try { mode = (localStorage.getItem(LS_MODE) || legacy(LS_MODE)) === 'one' ? 'one' : 'list'; } catch (e) {}
    titleEl.textContent = SONGS[current].title;
    applyMode();
    renderList();
    renderMediaSession();
  }

  // —— 事件绑定 ——
  // 给外部入口用（hero「放首歌」按钮）：手势内建图 + 播放/暂停
  window.__MUSIC = { togglePlay: function () { startBeat(); togglePlay(); } };
  const enterBtn = document.getElementById('cosmos-enter');
  if (enterBtn) enterBtn.addEventListener('click', function () { window.__MUSIC.togglePlay(); });
  // —— FAB 拖拽换位（无极定位，位置持久化；拖完松手的那次 click 不触发开合）——
  const FAB_KEY = 'sj.music-fab-pos';
  let drag = null, dragMoved = false;
  function applyFabPos(x, y) {
    const w = fab.offsetWidth, h = fab.offsetHeight;
    x = Math.min(Math.max(8, x), innerWidth - w - 8);
    y = Math.min(Math.max(8, y), innerHeight - h - 8);
    fab.style.left = x + 'px';
    fab.style.top = y + 'px';
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
    fab.style.marginLeft = '0';
    // 面板跟随 FAB 上方弹出（水平 clamp 防溢出）
    const cx = Math.min(Math.max(165, x + w / 2), innerWidth - 165);
    panel.style.left = (cx - panel.offsetWidth / 2) + 'px';
    panel.style.bottom = (innerHeight - y + 12) + 'px';
    panel.style.right = 'auto';
  }
  try {
    const savedPos = JSON.parse(localStorage.getItem(FAB_KEY) || 'null');
    if (savedPos) applyFabPos(savedPos.x, savedPos.y);
  } catch (e) {}
  fab.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const r = fab.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    dragMoved = false;
    try { fab.setPointerCapture(e.pointerId); } catch (err) {}
  });
  fab.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!dragMoved && Math.abs(e.movementX) + Math.abs(e.movementY) < 2) return;
    dragMoved = true;
    applyFabPos(e.clientX - drag.dx, e.clientY - drag.dy);
  });
  const endDrag = () => {
    if (drag && dragMoved) {
      try {
        localStorage.setItem(FAB_KEY, JSON.stringify({ x: parseFloat(fab.style.left), y: parseFloat(fab.style.top) }));
      } catch (err) {}
    }
    drag = null;
  };
  fab.addEventListener('pointerup', endDrag);
  fab.addEventListener('pointercancel', endDrag);
  fab.addEventListener('click', () => {
    if (dragMoved) { dragMoved = false; return; }
    const open = panel.classList.toggle('music-open');
    fab.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) prime();          // 打开面板 = 有听歌意图，这时才开始加载音轨
  });

  // 悬停/触控/聚焦播放入口即刻预热首帧；首次交互与首屏空闲后也轻度预热（省流/2G 跳过非主动预热）
  [enterBtn, fab].forEach((el) => {
    if (!el) return;
    ['pointerenter', 'touchstart', 'focus'].forEach((ev) => {
      el.addEventListener(ev, prime, { once: true, passive: true });
    });
  });
  const primeOnInteract = () => {
    if (!isSaveNet()) prime();
  };
  ['pointerdown', 'keydown', 'wheel'].forEach((ev) => {
    window.addEventListener(ev, primeOnInteract, { once: true, passive: true });
  });
  const scheduleIdlePrime = () => {
    if (isSaveNet()) return;
    setTimeout(() => {
      if (isSaveNet()) return;
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(prime, { timeout: 1000 });
      } else {
        setTimeout(prime, 600);
      }
    }, 1200);
  };
  if (document.readyState === 'complete') scheduleIdlePrime();
  else window.addEventListener('load', scheduleIdlePrime, { once: true });
  closeBtn.addEventListener('click', () => {
    panel.classList.remove('music-open');
    fab.setAttribute('aria-expanded', 'false');
  });

  playBtn.addEventListener('click', () => { startBeat(); togglePlay(); });   // 点击即建音频图（用户手势内 resume 最稳）
  prevBtn.addEventListener('click', () => { startBeat(); load(current - 1, !audio.paused); });
  nextBtn.addEventListener('click', () => { startBeat(); load(current + 1, !audio.paused); });
  modeBtn.addEventListener('click', () => {
    mode = mode === 'one' ? 'list' : 'one';
    try { localStorage.setItem(LS_MODE, mode); } catch (e) {}
    applyMode();
  });

  audio.addEventListener('play', () => {
    playBtn.classList.add('is-playing');
    fab.classList.add('is-playing');
    startBeat();   // 兜底（正常路径已在手势里建图）
    renderMediaSession();
    emitMusicState();
  });
  audio.addEventListener('pause', () => {
    playBtn.classList.remove('is-playing');
    fab.classList.remove('is-playing');
    fab.style.removeProperty('--beat-scale');
    const anyVideoPlaying = getProductVideos().some(function (it) {
      return !it.v.paused && !it.v.ended;
    });
    if (!anyVideoPlaying) stopBeat();
    emitMusicState();
  });
  audio.addEventListener('error', stopBeat);
  // 单曲循环（mode==='one'）由 audio.loop 处理，ended 只在顺序循环走到这里
  audio.addEventListener('ended', () => { load(current + 1, true); });
  audio.addEventListener('loadedmetadata', () => { durEl.textContent = fmt(audio.duration); });
  audio.addEventListener('timeupdate', () => {
    if (seeking || !isFinite(audio.duration)) return;
    seekEl.value = (audio.currentTime / audio.duration) * 100 || 0;
    curEl.textContent = fmt(audio.currentTime);
  });

  seekEl.addEventListener('input', () => {
    seeking = true;
    curEl.textContent = fmt((seekEl.value / 100) * audio.duration);
  });
  seekEl.addEventListener('change', () => {
    if (isFinite(audio.duration)) audio.currentTime = (seekEl.value / 100) * audio.duration;
    seeking = false;
  });

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        startBeat();
        if (!audio.src) load(current, true);
        else if (audio.paused) {
          hasUserPlayed = true;
          stopAllVideosForMusic();
          try { audio.preload = 'auto'; } catch (e) {}
          audio.play().catch(() => {});
        }
      });
    } catch (e) {}
    try {
      navigator.mediaSession.setActionHandler('pause', () => {
        if (!audio.paused) audio.pause();
      });
    } catch (e) {}
    try {
      navigator.mediaSession.setActionHandler('previoustrack', () => { startBeat(); load(current - 1, !audio.paused); });
    } catch (e) {}
    try {
      navigator.mediaSession.setActionHandler('nexttrack', () => { startBeat(); load(current + 1, !audio.paused); });
    } catch (e) {}
  }

  // —— 介绍视频 × 音乐严格双向互斥 + 视口自动暂停（永不同播）——
  // · 视频起播/起播意图（sj-video-intent）→ 立即暂停音乐并记录凭据 musicPausedByVideo
  // · 音乐起播（站点歌单或本地音频，且非视频触发的自动恢复）→ 立即暂停一切在播/起播中视频并清空凭据
  // · 视频暂停/播完/中止/滑出视口 → 若无其他活跃视频且持有凭据，自动恢复音乐（原未放歌绝不强开）
  // · 全屏播放保护：视频处于全屏态时禁止被视口检测误停
  (function initVideoMusicMutex() {
    const videos = Array.from(document.querySelectorAll('#products video'));
    if (!videos.length) return;
    const siteAudio = audio;                        // 站点歌单
    const localAudio = document.getElementById('cosmos-audio');
    let musicPausedByVideo = '';                    // '' | 'site' | 'local'：音乐因视频被暂停的凭据
    let resumingByVideo = false;                    // 互斥自动恢复进行中

    const isVideoActive = (v) => (!v.paused && !v.ended) || v.dataset.opening === '1';
    const activeVideo = () => videos.find(isVideoActive);
    const isFullscreen = (v) =>
      (document.fullscreenElement && (document.fullscreenElement === v || document.fullscreenElement.contains(v))) ||
      (document.webkitFullscreenElement && (document.webkitFullscreenElement === v || document.webkitFullscreenElement.contains(v))) ||
      !!v.webkitDisplayingFullscreen;

    function clearVideoBeatUI(v) {
      const box = v && v.closest('.cover-box');
      if (box) {
        box.classList.remove('is-playing-beat');
        box.style.removeProperty('--beat-pulse');
      }
    }

    function stopVideoElement(v, emitAbortIfOpening) {
      if (!v) return;
      const wasOpening = v.dataset.opening === '1';
      delete v.dataset.opening;
      if (!v.paused) {
        try { v.pause(); } catch (_) {}
      }
      clearVideoBeatUI(v);
      const evName = (emitAbortIfOpening && wasOpening) ? 'sj-video-abort' : 'sj-video-force-stop';
      try {
        window.dispatchEvent(new CustomEvent(evName, { detail: { video: v } }));
      } catch (_) {}
    }

    stopAllVideosForMusic = function () {
      if (resumingByVideo) return;
      musicPausedByVideo = '';                      // 用户主动切回音乐，清空自动恢复凭据
      videos.forEach((v) => {
        if (isVideoActive(v)) stopVideoElement(v, false);
      });
    };

    let resumingTimer = 0;

    function pauseMusicForVideo() {
      if (!siteAudio.paused) {
        siteAudio.pause();
        musicPausedByVideo = 'site';
      }
      if (localAudio && !localAudio.paused) {
        localAudio.pause();
        if (!musicPausedByVideo) musicPausedByVideo = 'local';
      }
    }

    function resumeMusicIfIdle() {
      if (!musicPausedByVideo || activeVideo()) return;   // 还有别的视频在播/起播中就不恢复
      const which = musicPausedByVideo;
      musicPausedByVideo = '';
      resumingByVideo = true;
      if (resumingTimer) clearTimeout(resumingTimer);
      resumingTimer = setTimeout(function () {
        resumingTimer = 0;
        resumingByVideo = false;
      }, 400);
      const el = which === 'site' ? siteAudio : localAudio;
      if (el) {
        try { el.preload = 'auto'; } catch (_) {}
        el.play().catch(function () {
          if (resumingTimer) { clearTimeout(resumingTimer); resumingTimer = 0; }
          resumingByVideo = false;
        });
      }
    }

    // 音乐起播 → 严格双向互斥：立即停掉一切在播/起播中的介绍视频，永不同播
    [siteAudio, localAudio].forEach((el) => {
      if (el) el.addEventListener('play', function () {
        if (!resumingByVideo) {
          stopAllVideosForMusic();
        }
        if (resumingTimer) { clearTimeout(resumingTimer); resumingTimer = 0; }
        resumingByVideo = false;
      });
    });

    // 视频起播意图（早于 v.play() 缓冲完成）→ 零延迟先停音乐与其他视频
    window.addEventListener('sj-video-intent', function (ev) {
      const target = ev.detail && ev.detail.video;
      videos.forEach(function (o) {
        if (o !== target && isVideoActive(o)) stopVideoElement(o, false);
      });
      pauseMusicForVideo();
    });

    // 视频被强制停止 → 同步清理 opening 与律动外框
    window.addEventListener('sj-video-force-stop', function (ev) {
      const v = ev.detail && ev.detail.video;
      if (v) {
        delete v.dataset.opening;
        clearVideoBeatUI(v);
      }
    });

    // 视频起播被中止（play reject 或起播途中滑走）→ 清理并按凭据恢复音乐
    window.addEventListener('sj-video-abort', function (ev) {
      const v = ev.detail && ev.detail.video;
      if (v) {
        delete v.dataset.opening;
        clearVideoBeatUI(v);
      }
      resumeMusicIfIdle();
      if (siteAudio.paused && !activeVideo()) stopBeat();
    });

    videos.forEach((v) => {
      v.addEventListener('play', function () {
        videos.forEach(function (o) {
          if (o !== v && isVideoActive(o)) stopVideoElement(o, false);
        });
        pauseMusicForVideo();
        const box = v.closest('.cover-box');
        if (box) box.classList.add('is-playing-beat');
        startBeat(v);
      });
      v.addEventListener('pause', function () {
        delete v.dataset.opening;
        clearVideoBeatUI(v);
        resumeMusicIfIdle();
        if (siteAudio.paused && !activeVideo()) stopBeat();
      });
      v.addEventListener('ended', function () {
        delete v.dataset.opening;
        clearVideoBeatUI(v);
        resumeMusicIfIdle();
        if (siteAudio.paused && !activeVideo()) stopBeat();
      });
    });

    // 1000ms 状态兜底：严格互斥（无 userOverride，绝不允许音视频同时发声）
    setInterval(function () {
      const vActive = activeVideo();
      if (!vActive) {
        if (musicPausedByVideo) resumeMusicIfIdle();
        return;
      }
      pauseMusicForVideo();
    }, 1000);

    // 视窗可见度检查（含 opening 缓冲态 + 全屏保护 + 顶栏 64px 避让）
    function checkVideoVisibility() {
      const vh = window.innerHeight || 900;
      const headerBottom = 64;
      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        if (!isVideoActive(v) || isFullscreen(v)) continue;
        const rect = v.getBoundingClientRect();
        if (rect.height <= 0) continue;
        const visibleTop = Math.max(rect.top, headerBottom);
        const visibleBottom = Math.min(rect.bottom, vh);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const visibleRatio = visibleHeight / rect.height;
        if (rect.bottom < 160 || rect.top > vh - 120 || visibleRatio < 0.45) {
          stopVideoElement(v, true);
        }
      }
    }

    // 滚出视口自动暂停：IO 阈值 0.45 + 顶栏避让（自动唤醒曾被暂停的背景音乐）
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const v = en.target;
          if (!isVideoActive(v) || isFullscreen(v)) return;
          if (!en.isIntersecting || en.intersectionRatio < 0.45) {
            stopVideoElement(v, true);
          }
        });
      }, {
        threshold: [0, 0.2, 0.45, 0.6, 0.8, 1.0],
        rootMargin: '-64px 0px -40px 0px'
      });
      videos.forEach((v) => io.observe(v));
    }

    window.addEventListener('scroll', checkVideoVisibility, { passive: true });
    window.addEventListener('resize', checkVideoVisibility, { passive: true });
  })();

  restore();
})();
