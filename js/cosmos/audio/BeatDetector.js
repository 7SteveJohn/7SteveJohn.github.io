// BeatDetector（规格书 §5.1 Beat）：输出短时 pulse 0..1 → 仅驱动极轻微 Camera FOV 脉冲
// 有 __BEAT.level（站点歌单离散拍）时透传整形；否则从 bass 能量涨幅自检（rise 判据 + 不应期）
export class BeatDetector {
  constructor(cfg) {
    this.cfg = cfg;
    this.pulse = 0;
    this.justBeat = false;   // 脉冲上穿 0.5 的那一帧为 true（供主循环触发涟漪等单次事件）
    this._slow = 0;
    this._lastBeatAt = 0;
  }
  update(audio, dtMs, now) {
    const { rise, minGap, attack, release } = this.cfg.beat;
    let hit = 0;
    if (audio.beatEnv > 0.12) {
      hit = audio.beatEnv;                      // 歌单已算好离散拍
    } else if (audio.playing) {                 // 无 level 时自检
      this._slow += (audio.bass - this._slow) * Math.min(1, dtMs / 500);
      const r = audio.bass - this._slow;
      if (r > Math.max(rise, this._slow * 0.3) && now - this._lastBeatAt > minGap) {
        this._lastBeatAt = now;
        hit = Math.min(1, r * 3);
      }
    }
    const dt = Math.min(dtMs, 100);
    const k = hit > this.pulse ? attack : release;
    const prev = this.pulse;
    this.pulse += (hit - this.pulse) * Math.min(1, k * dt / 16.7);
    if (this.pulse < 0.001) this.pulse = 0;
    this.justBeat = prev < 0.5 && this.pulse >= 0.5;
    return this.pulse;
  }
}
