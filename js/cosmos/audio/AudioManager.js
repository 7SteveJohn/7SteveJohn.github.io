// AudioManager（规格书 §5）：HTMLAudioElement → AudioContext → AnalyserNode → FFT → Bass/Mid/Treble
// 两路数据源（互斥，别一起响）：
//   ① 面板上传的本地音乐 #cosmos-audio —— 自建 AnalyserNode（本文件信号链）
//   ② 站点歌单 window.__BEAT（player.js 算好的 lv/mid/treble + level 离散拍）
// 用户手势后才建 AudioContext（文件选择/播放即手势，遵守 Autoplay Policy）
//
// 信号链（2026-09-30 按 WebAudio 深度调研重构）：
//   fftSize 2048（bin 宽 23.4Hz@48k，kick 区 40-150Hz 可分辨；512 时整个 kick 糊在 bin 0-1）
//   smoothingTimeConstant = 0 —— 内置 EMA 会抹平瞬态并与下方包络双重平滑，平滑全部自控
//   min/maxDecibels -85/-20 —— 默认 -30dBFS 上限对现代母带大量钳制 255（"响歌过冲"真源）
//   频段按 Hz 边界换算 bin（采样率自适应，44.1k 蓝牙耳机不漂移）：bass 60-250 / mid 250-4k / treble 4k-12k
//   频段电平 = RMS（dB→线性功率求和开方），算术平均不满足能量一致性
//   非对称指数包络（attack 10ms / release 120ms，帧率无关 1-exp(-dt/τ)）
//   AGC：衰减式峰值跟随（τ=3s）归一化 —— 安静歌有反应、响歌不过冲（早期归一，全部下游受益）
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
    this._bands = null;                       // {bass:[i0,i1], mid:…, treble:…} 按采样率换算
    // AGC 峰值初值取典型 RMS 量级：初始过高会让开头十几秒律动沉底（3s τ 衰减太慢）
    this._peak = { bass: 0.05, mid: 0.05, treble: 0.05 };   // 衰减式峰值（env 超峰即时上顶）

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
  // 本地音乐：手势后调用
  ensureGraph() {
    if (this.analyser || !this.ownEl) return this.analyser;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.actx = new AC();
      const src = this.actx.createMediaElementSource(this.ownEl);
      this.analyser = this.actx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0;
      this.analyser.minDecibels = -85;
      this.analyser.maxDecibels = -20;
      src.connect(this.analyser);
      this.analyser.connect(this.actx.destination);
      this.arr = new Float32Array(this.analyser.frequencyBinCount);   // dB 域
      this._bands = null;   // sampleRate 就绪后惰性计算
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
  _calcBands() {
    const fs = this.actx.sampleRate, n = this.analyser.fftSize;
    const hz2bin = (f) => Math.min(this.arr.length - 1, Math.max(0, Math.round(f * n / fs)));
    this._bands = {
      bass: [hz2bin(60), hz2bin(250)],
      mid: [hz2bin(250), hz2bin(4000)],
      treble: [hz2bin(4000), hz2bin(12000)],
    };
  }
  // 频段电平：dB → 线性幅度 → 功率求和 → RMS（幅度量，能量一致性）
  _bandRMS(band) {
    let s = 0, n = 0;
    for (let i = band[0]; i <= band[1] && i < this.arr.length; i++) {
      const lin = Math.pow(10, this.arr[i] / 20);
      s += lin * lin; n++;
    }
    return Math.sqrt(s / Math.max(1, n));
  }
  // 非对称指数包络：帧率无关；attack 10ms / release 120ms（音频级跟随，平滑职责全在这）
  _env(cur, target, dtMs) {
    const tau = target > cur ? 0.010 : 0.120;
    return cur + (target - cur) * (1 - Math.exp(-Math.min(dtMs, 100) / tau));
  }
  // AGC：env 对 3s 衰减式峰值归一——写死的幅度必然"安静歌没反应/响歌过冲"
  _agc(env, key) {
    const p = this._peak[key] = Math.max(env, this._peak[key] * Math.exp(-Math.min(this._dt, 100) / 3000));
    return Math.min(1, env / (p + 1e-4));
  }
  update(dtMs) {
    this._dt = dtMs;
    let b = 0, m = 0, t = 0, beat = 0;
    if (this._feed && performance.now() < this._feedUntil) {
      ({ b, m, t, beat } = this._feed);
      this.playing = true;
    } else if (this.ownActive && this.analyser) {
      if (!this._bands) this._calcBands();
      this.analyser.getFloatFrequencyData(this.arr);
      b = this._bandRMS(this._bands.bass);
      m = this._bandRMS(this._bands.mid);
      t = this._bandRMS(this._bands.treble);
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
    // 快包络（跟瞬态）→ AGC 归一 → 输出 0..1
    const envB = this._env(this.bass, Math.min(1, b), dtMs);
    const envM = this._env(this.mid, Math.min(1, m), dtMs);
    const envT = this._env(this.treble, Math.min(1, t), dtMs);
    this.bass = this._agc(envB, 'bass');
    this.mid = this._agc(envM, 'mid');
    this.treble = this._agc(envT, 'treble');
    this.beatEnv = this._env(this.beatEnv, Math.min(1, beat), dtMs);
    return this;
  }
  activeEl() {
    if (this.ownEl && !this.ownEl.paused) return this.ownEl;
    if (this.siteEl && !this.siteEl.paused) return this.siteEl;
    return this.ownEl || this.siteEl;
  }
}
