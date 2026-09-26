/**
 * 右下角悬浮背景音乐播放器
 * ----------------------------------------------------
 * - 音频不进 SW 预缓存：首次在线播放后由 SW 运行时缓存接管，断网也能复播
 * - localStorage 只记住上次听的是哪一首（不记播放进度，下次进来从头开始）
 * - 歌单改动直接改 SONGS 数组（src 用 ASCII 文件名，title 保留原名）
 * - 循环模式：顺序循环（默认）/ 单曲循环，模式按钮切换，localStorage 持久化
 * - 自定义歌曲顺序：歌单每项 ↑↓ 移动，顺序持久化（按 src 记录，新增曲目排尾）
 * - 音乐律动：AnalyserNode 产出 window.__BEAT（level/lv/mid/treble），js/cosmos.js 星河每帧读取
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

  // 全站访客本地数据统一 sj. 前缀；这里保留一次旧键回读，老访客的续听/顺序/模式不丢
  const LS_KEY = 'sj.music-resume';
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

  const save = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        i: current,
        src: SONGS[current] ? SONGS[current].src : ''   // 顺序可自定义，恢复按 src 定位更稳
        // ❗不再记播放进度：下次进来从上次的那一首开头听起，而不是接着上次的秒数
      }));
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
  let beatPulse = 0, beatLock = 0, beatPrevT = 0, beatSlow = 0, beatPrevE = 0;
  const BEAT_ARR = new Uint8Array(512);   // fftSize 1024 → 512 bins
  function beatLoop() {
    // ❗句柄必须"只在本帧排下一帧"时赋值：早先写成帧首 beatRaf = rAF(...)，
    // 而切歌/暂停会触发 stopBeat() 把这个句柄 cancel 掉——但此时下一帧其实已经
    // 排进队列，cancel 的却是"再下一帧"的句柄，于是出现"取消后又复活"的错位；
    // 反复几次句柄就永久失真，视觉上表现为放歌一段时间后律动整体消失（实测 9s 后归零）。
    if (!analyser) { beatRaf = 0; return; }
    const nw = performance.now();
    const dt = beatPrevT ? Math.min(0.1, (nw - beatPrevT) / 1000) : 0.016;
    beatPrevT = nw;
    analyser.getByteFrequencyData(BEAT_ARR);
    // ❗fftSize 要够大：256 时每 bin ≈ 187Hz，最低 6 个 bin 就跨到 1.1kHz，
    // 里面全是持续伴奏 → 测出的是"段落能量"（实测 22 秒才 24 拍、还夹 2.25 秒空白）。
    // 1024 时每 bin ≈ 47Hz，最低 8 个 bin 覆盖 0~370Hz —— 正好是底鼓/贝斯的冲击区。
    let sum = 0;
    const n = 8;
    for (let i = 0; i < n; i++) sum += BEAT_ARR[i];
    const energy = sum / n / 255;                  // 0..1
    // 中频与高频顺手一起算：星河背景 js/cosmos.js 会读 window.__BEAT.mid / .treble
    // 去驱动旋臂回旋与流星迸发（复用同一批 bin，不再建第二个 analyser）
    let sm = 0;
    for (let i = 10; i < 60; i++) sm += BEAT_ARR[i];
    const midEnergy = sm / 50 / 255;
    let st = 0;
    for (let i = 70; i < 210; i++) st += BEAT_ARR[i];
    const treEnergy = st / 140 / 255;
    const now = nw;
    // ❗判据用「相对上一帧的涨幅」，不要用"与峰值比较"：本机采集下最低几个 bin
    // 几乎全程高电平（实测 pk 每帧都被当前值顶回去，arm 永远为 0），
    // 峰值对比法在这个信号上无解。起音的定义就是"突然变响"——比上一帧涨一截即算。
    // 门槛随慢均值自适应（安静段门槛低、高潮段门槛高），避免弱拍漏掉或强段狂触发。
    beatSlow += (energy - beatSlow) * 0.05;
    const rise = energy - beatPrevE;
    beatPrevE = energy;
    // 门槛 = 慢均值的 7%（且至少 0.012）：调高一档就漏拍（实测 0.12 倍只有 42BPM
    // 且大段空白），调太低会把同一拍拆成两下。7% 在本机的采集上落在合适的密度。
    if (rise > Math.max(0.012, beatSlow * 0.07) && now > beatLock) {
      beatPulse = 1;
      beatLock = now + 220;                        // ≈270BPM 上限，只防"同一拍连打两次"
    } else {
      beatPulse = Math.max(0, beatPulse - dt * 3.4);   // 落回约 0.3 秒，峰谷对比拉得开
      if (beatPulse < 0.02) beatPulse = 0;
    }
    window.__BEAT = {
      level: Math.min(1, beatPulse), lv: energy, slow: beatSlow, rise: rise,
      mid: midEnergy, treble: treEnergy, ctx: actx ? actx.state : '-'
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
        analyser.fftSize = 1024;                 // 每 bin≈47Hz，低频才有分辨率
        analyser.smoothingTimeConstant = 0.2;    // 越低越保瞬态（0.55 会把鼓点抹平）
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
          saveOrder(); save(); renderList();
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
      artist: 'SevenJohn · 博客 BGM'
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
    save();
  }

  function togglePlay() {
    if (!audio.src) { load(current, true); return; }
    if (audio.paused) audio.play().catch(() => {});
    else { audio.pause(); save(); }
  }

  function restore() {
    applyOrder();
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || legacy(LS_KEY) || 'null');
      if (saved) {
        const bySrc = saved.src ? SONGS.findIndex(s => s.src === saved.src) : -1;
        if (bySrc >= 0) current = bySrc;
        else if (saved.i >= 0 && saved.i < SONGS.length) current = saved.i;
      }
    } catch (e) { /* 数据损坏则从头开始 */ }
    // 预热：页面加载即缓冲首曲，点播放几乎秒出声（SW 运行时缓存随后接管，二次访问零延迟）。
    // 触屏设备按流量考虑只取元数据。首次访客也能吃到预热——不只限有历史的用户。
    audio.preload = matchMedia('(pointer: coarse)').matches ? 'metadata' : 'auto';
    audio.src = SONGS[current].src;
    // 不做 seek：恢复的只是"上次听的是哪一首"，播放位置一律从头开始
    try { mode = (localStorage.getItem(LS_MODE) || legacy(LS_MODE)) === 'one' ? 'one' : 'list'; } catch (e) {}
    titleEl.textContent = SONGS[current].title;
    applyMode();
    renderList();
    renderMediaSession();
  }

  // —— 事件绑定 ——
  // 给外部入口用（hero「放首歌，看看星河」按钮）：手势内建图 + 播放/暂停
  window.__MUSIC = { togglePlay: function () { startBeat(); togglePlay(); } };
  const enterBtn = document.getElementById('cosmos-enter');
  if (enterBtn) enterBtn.addEventListener('click', function () { window.__MUSIC.togglePlay(); });
  fab.addEventListener('click', () => {
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
    if (Math.floor(audio.currentTime) % 5 === 0) save(); // 低频持久化进度
  });

  seekEl.addEventListener('input', () => {
    seeking = true;
    curEl.textContent = fmt((seekEl.value / 100) * audio.duration);
  });
  seekEl.addEventListener('change', () => {
    if (isFinite(audio.duration)) audio.currentTime = (seekEl.value / 100) * audio.duration;
    seeking = false;
    save();
  });

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('previoustrack', () => { startBeat(); load(current - 1, !audio.paused); });
    navigator.mediaSession.setActionHandler('nexttrack', () => { startBeat(); load(current + 1, !audio.paused); });
  }

  restore();
})();
