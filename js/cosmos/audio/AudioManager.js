// AudioManager（规格书 §5）：HTMLAudioElement → AudioContext → AnalyserNode → FFT → Bass/Mid/Treble
// 两路数据源（互斥，别一起响）：
//   ① 面板上传的本地音乐 #cosmos-audio —— 自建 AnalyserNode（规格书频段配置）
//   ② 站点歌单 window.__BEAT（player.js 算好的 lv/mid/treble + level 离散拍）
// 用户手势后才建 AudioContext（文件选择/播放即手势，遵守 Autoplay Policy）
// 包络：攻击快释放慢（墙钟 dt），音乐停止 → 平滑回落，画面不塌
export class AudioManager {
  constructor(cfg) {
    this.cfg = cfg;
    this.bass = 0; this.mid = 0; this.treble = 0; this.beatEnv = 0;
    this.playing = false;
    this.siteEl = document.getElementById('music-audio');
    this.ownEl = document.getElementById('cosmos-audio');
    this.actx = null; this.analyser = null; this.arr = null;
    this.ownActive = false;
    this._feed = null; this._feedUntil = 0;
    this._slowBass = 0;

    if (this.ownEl) {
      this.ownEl.addEventListener('playing', () => {
        this.ownActive = true;
        if (this.siteEl && !this.siteEl.paused) this.siteEl.pause();
      });
      this.ownEl.addEventListener('pause', () => { this.ownActive = false; });
      this.ownEl.addEventListener('ended', () => { this.ownActive = false; });
    }
    if (this.siteEl) {
      this.siteEl.addEventListener('playing', () => {
        if (this.ownEl && !this.ownEl.paused) this.ownEl.pause();
      });
    }
  }
  // 本地音乐：手势后调用。规格书频段：fftSize 512 / bass[0,8] / mid[9,64] / treble[65,128]
  ensureGraph() {
    if (this.analyser || !this.ownEl) return this.analyser;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.actx = new AC();
      const src = this.actx.createMediaElementSource(this.ownEl);
      this.analyser = this.actx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.82;
      src.connect(this.analyser);
      this.analyser.connect(this.actx.destination);
      this.arr = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (e) { this.analyser = null; }
    return this.analyser;
  }
  resume() {
    if (this.actx && this.actx.state === 'suspended') this.actx.resume().catch(() => {});
  }
  feed(bass, mid, treble, beat) {   // 测试探针注入，1.2s 内优先
    this._feed = { b: bass || 0, m: mid || 0, t: treble || 0, beat: beat || 0 };
    this._feedUntil = performance.now() + 1200;
  }
  _band(lo, hi) {
    let s = 0;
    for (let i = lo; i <= hi && i < this.arr.length; i++) s += this.arr[i];
    return s / Math.max(1, hi - lo + 1) / 255;
  }
  _env(cur, target, dtMs, atk, rel) {
    const k = target > cur ? atk : rel;
    return cur + (target - cur) * Math.min(1, k * dtMs / 16.7);
  }
  update(dtMs) {
    const A = this.cfg.audio;
    let b = 0, m = 0, t = 0, beat = 0;
    if (this._feed && performance.now() < this._feedUntil) {
      ({ b, m, t, beat } = { b: this._feed.b, m: this._feed.m, t: this._feed.t, beat: this._feed.beat });
      this.playing = true;
    } else if (this.ownActive && this.analyser) {
      this.analyser.getByteFrequencyData(this.arr);
      b = this._band(0, 8);       // 规格书 bassRange
      m = this._band(9, 64);      // midRange
      t = this._band(65, 128);    // trebleRange
      // 本地路自检拍点：能量涨幅（BeatDetector 的输入之一；beatEnv 走 BeatDetector）
      this.playing = true;
    } else {
      const B = window.__BEAT;
      if (B && (B.lv || B.level || B.mid || B.treble)) {
        b = B.lv || 0;
        m = B.mid || 0;
        t = B.treble || 0;
        beat = B.level != null ? B.level : 0;   // 拍点必须用 level（离散拍包络）
        this.playing = true;
      } else {
        this.playing = false;
      }
    }
    const dt = Math.min(dtMs, 100);
    this.bass = this._env(this.bass, Math.min(1, b), dt, A.attack, A.release);
    this.mid = this._env(this.mid, Math.min(1, m), dt, A.attack * 0.7, A.release * 0.8);
    this.treble = this._env(this.treble, Math.min(1, t), dt, A.attack * 1.1, A.release * 1.2);
    this.beatEnv = this._env(this.beatEnv, Math.min(1, beat), dt, 0.5, 0.09);
    return this;
  }
  activeEl() {
    if (this.ownEl && !this.ownEl.paused) return this.ownEl;
    if (this.siteEl && !this.siteEl.paused) return this.siteEl;
    return this.ownEl || this.siteEl;
  }
}
