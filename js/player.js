/**
 * 右下角悬浮背景音乐播放器
 * ----------------------------------------------------
 * - 音频不进 SW 预缓存：首次在线播放后由 SW 运行时缓存接管，断网也能复播
 * - localStorage 记住上次听到哪（曲目 + 进度），下次展开自动续上（仍需点击播放）
 * - 歌单改动直接改 SONGS 数组（src 用 ASCII 文件名，title 保留原名）
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

  const LS_KEY = 'music-resume';

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

  let current = 0;      // 当前曲目索引
  let seeking = false;  // 进度条拖动中，暂停 timeupdate 覆盖

  // —— 工具 ——
  const fmt = (s) => {
    if (!isFinite(s)) return '0:00';
    s = Math.floor(s);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  const save = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ i: current, t: audio.currentTime || 0 }));
    } catch (e) { /* 隐私模式等场景静默跳过 */ }
  };

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
      btn.addEventListener('click', () => { load(i, true); });
      li.appendChild(btn);
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
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (saved && saved.i >= 0 && saved.i < SONGS.length) {
        current = saved.i;
        // 静默载入元数据与上次进度（不播放），展开面板即可看到上次听到哪
        audio.src = SONGS[current].src;
        audio.currentTime = saved.t || 0;
      }
    } catch (e) { /* 数据损坏则从头开始 */ }
    titleEl.textContent = SONGS[current].title;
    renderList();
    renderMediaSession();
  }

  // —— 事件绑定 ——
  fab.addEventListener('click', () => {
    const open = panel.classList.toggle('music-open');
    fab.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  closeBtn.addEventListener('click', () => {
    panel.classList.remove('music-open');
    fab.setAttribute('aria-expanded', 'false');
  });

  playBtn.addEventListener('click', togglePlay);
  prevBtn.addEventListener('click', () => { load(current - 1, !audio.paused); });
  nextBtn.addEventListener('click', () => { load(current + 1, !audio.paused); });

  audio.addEventListener('play', () => {
    playBtn.classList.add('is-playing');
    fab.classList.add('is-playing');
    renderMediaSession();
  });
  audio.addEventListener('pause', () => {
    playBtn.classList.remove('is-playing');
    fab.classList.remove('is-playing');
  });
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
    navigator.mediaSession.setActionHandler('previoustrack', () => { load(current - 1, !audio.paused); });
    navigator.mediaSession.setActionHandler('nexttrack', () => { load(current + 1, !audio.paused); });
  }

  restore();
})();
