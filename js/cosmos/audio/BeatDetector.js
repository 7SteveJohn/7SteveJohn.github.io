// BeatDetector（规格书 §5.1 Beat）：输出短时 pulse 0..1；justBeat 上穿 0.5 的那一帧触发单次事件
// 检测算法（2026-09-30 按调研重构）：bass 瞬时功率 vs 最近 ~0.8s 历史的中值 ×1.35
//   （自适应中值阈值，对歌曲动态范围稳健）+ 噪声门（运行峰值 10%，间奏不误触）
//   + 不应期 280ms（上限 ~214 BPM）。有 __BEAT.level（站点歌单离散拍）时透传整形。
// beats 计数供乐句重音（每第 8 拍视觉幅度加大）。
export class BeatDetector {
  constructor(cfg) {
    this.cfg = cfg;
    this.pulse = 0;
    this.justBeat = false;
    this.beats = 0;          // 已确认的拍数（乐句重音用 beats % 8）
    this._hist = [];         // bass 功率历史（~0.8s：48 帧 @60fps）
    this._lastBeatAt = 0;
  }
  update(audio, dtMs, now) {
    const { attack, release } = this.cfg.beat;
    let hit = 0;
    const e = audio.bass * audio.bass;        // 功率域
    this._hist.push(e);
    if (this._hist.length > 48) this._hist.shift();

    if (audio.beatEnv > 0.12) {
      hit = audio.beatEnv;                    // 歌单已算好离散拍
    } else if (audio.playing && this._hist.length > 20) {
      const med = this._median(this._hist);
      let peak = 0;
      for (const v of this._hist) if (v > peak) peak = v;
      const gate = peak * 0.1;                // 噪声门：间奏/静音段不误触
      if (e > gate && e > med * 1.35 && now - this._lastBeatAt > 280) {
        this._lastBeatAt = now;
        hit = Math.min(1, Math.sqrt(e / (med + 1e-6)) * 0.8);   // 强度按超出倍数标定
      }
    }
    const dt = Math.min(dtMs, 100);
    const k = hit > this.pulse ? attack : release;
    const prev = this.pulse;
    this.pulse += (hit - this.pulse) * Math.min(1, k * dt / 16.7);
    if (this.pulse < 0.001) this.pulse = 0;
    this.justBeat = prev < 0.5 && this.pulse >= 0.5;
    if (this.justBeat) this.beats++;
    return this.pulse;
  }
  _median(arr) {
    const s = arr.slice().sort((a, b) => a - b);
    const mid = s.length >> 1;
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
}
