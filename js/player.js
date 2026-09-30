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
    window.__BEAT = {
      level: Math.min(1, beatPulse), lv: lv, slow: beatPeak, rise: e,
      mid: mid, treble: tre, ctx: actx ? actx.state : '-'
    };
    beatRaf = requestAnimationFrame(beatLoop);   // 续帧放帧尾：帧内任何早退都不会留下悬空句柄
  }
  function startBeat() {
    try {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        actx = new AC();
        const srcNode = actx.createMediaElementSource(audio);   // 只能建一次；建后声音经 analyser 回到扬声器
        analyser = actx.createAnalyser();
        analyser.fftSize = 2048;                 // bin ≈ 23Hz@48k：kick 40-150Hz 可分辨
        analyser.smoothingTimeConstant = 0;      // 平滑交给 beatLoop 的非对称指数包络
        analyser.minDecibels = -85;              // 默认 -30 上限对响歌大量钳 255
        analyser.maxDecibels = -20;
        srcNode.connect(analyser);
        analyser.connect(actx.destination);
      }
      if (actx.state === 'suspended') actx.resume().catch(function () {});
      if (!beatRaf) beatRaf = requestAnimationFrame(beatLoop);
    } catch (e) { /* 建图失败不影响播放本身 */ }
  }
  function stopBeat() {
    if (beatRaf) { cancelAnimationFrame(beatRaf); beatRaf = 0; }
    window.__BEAT = { level: 0 };
  }

  // —— 循环模式 ——
  function applyMode() {
    audio.loop = (mode === 'one');   // 单曲循环交给浏览器：loop 时 ended 不触发，行为最稳
    modeBtn.classList.toggle('mode-one', mode === 'one');
    modeBtn.setAttribute('aria-label', '循环模式：' + (mode === 'one' ? '单曲循环' : '顺序循环'));
  }

  // —— 渲染 ——
  function renderList() {
    listEl.innerHTML = '';
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
  function load(i, autoplay) {
    current = (i + SONGS.length) % SONGS.length;
    audio.src = SONGS[current].src;
    titleEl.textContent = SONGS[current].title;
    renderList();
    renderMediaSession();
    if (autoplay) {
      audio.play().catch(() => { /* 用户未交互等场景静默 */ });
    } else {
      seekEl.value = 0;
      curEl.textContent = '0:00';
      durEl.textContent = '0:00';
    }
  }

  // 起播稳定后让 SW 预热这首歌的全量入库（下次秒开 + 离线可播）：
  // 消息走 message 事件 + waitUntil，SW 里裸 setTimeout 会被提前终止（2026-09-30 踩过）；
  // 延迟 2.5s 发，让起播缓冲先把带宽用完。
  audio.addEventListener('playing', function () {
    setTimeout(function () {
      var url = audio.currentSrc || audio.src;
      if (url && navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'prefetch-media', url: url });
      }
    }, 2500);
  });

  function togglePlay() {
    if (!audio.src) { load(current, true); return; }
    if (audio.paused) audio.play().catch(() => {});
    else { audio.pause(); }
  }

  function restore() {
    clearResume();          // 零播放记录：老访客的续听键一并清掉
    applyOrder();
    // 预热：页面加载即缓冲首曲，点播放几乎秒出声（SW 运行时缓存随后接管，二次访问零延迟）。
    // 触屏设备原按流量考虑只取 metadata——2026-09-30 用户实测手机上"歌曲来的很慢"：
    // metadata 只拉几百 KB 头部，点播放才开始拉音频，跨境链路上被 SW 全量预热抢带宽。
    // 改 auto 让首曲在页面加载期就缓冲到位（单曲 ~4MB，WiFi/5G 下无感），点播放基本秒响。
    audio.preload = 'auto';
    audio.src = SONGS[current].src;
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
    panel.style.left = cx + 'px';
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
  });
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
  });
  audio.addEventListener('pause', () => {
    playBtn.classList.remove('is-playing');
    fab.classList.remove('is-playing');
    stopBeat();
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
    navigator.mediaSession.setActionHandler('previoustrack', () => { startBeat(); load(current - 1, !audio.paused); });
    navigator.mediaSession.setActionHandler('nexttrack', () => { startBeat(); load(current + 1, !audio.paused); });
  }

  restore();
})();
