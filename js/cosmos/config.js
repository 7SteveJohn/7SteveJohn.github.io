// Interactive Cosmic Blog · 全局配置（规格书 §8 落地，数值按本站实测校准）
export const CONFIG = {
  camera: {
    fov: 60, near: 0.1, far: 1000, zPos: 5,
    parallaxStrengthX: 0.35,   // 鼠标视差幅度（damped，禁止直接跟随）
    parallaxStrengthY: 0.18,
    damping: 0.05,
    scrollStrength: 0.55,      // 滚动一屏带来的纵深偏移
    beatFovPulse: 0.3          // Beat → FOV 60.0→60.3，"空间在呼吸"不是"网页在震动"
  },
  layers: { skyZ: -10, mountainFarZ: -3, mountainNearZ: -2.4, waterZ: 0.5, starZ: 1.5 },
  stars: {
    count: 800, countMobile: 300,
    size: 2.2,
    repulsionRadius: 2.2, repulsionForce: 0.14,   // 排斥要"一进场就有感觉"
    spring: 0.03,                                  // 回弹稍慢一点，看得见过程
    trebleRatio: 0.25,                             // 只有 1/4 星尘响应高频，禁止全屏同步闪
    cursorGlow: 0.5,                               // 光标附近星尘提亮（近者亮，远者不搭理）
    clickKick: 0.55                                // 点击天空：星尘从点击点四散
  },
  audio: {
    attack: 0.4, release: 0.055,   // 包络：攻击快、释放慢（墙钟 dt）
    bassToBrightness: 0.25,        // Bass → 银河呼吸 10~25%
    midToNebula: 0.6,              // Mid → 星云区域轻微提亮/流动加速
    trebleToStars: 0.6             // Treble → 少量星尘亮度
  },
  beat: {
    rise: 0.07, minGap: 220,       // 能量涨幅判据 + 不应期（无 __BEAT 时自检）
    attack: 0.5, release: 0.07,    // pulse 包络
    lakeRipple: 0.55               // Beat → 湖心荡开一圈涟漪
  },
  water: {
    waveSpeed: 1.8, rippleDecay: 0.94,
    rippleBoost: 0.85,             // 鼠标划过时注入的涟漪强度
    clickSplash: 1.6,              // 点击湖面：一记大水波
    bassToReflect: 0.25,           // Bass → 反射强度变化
    bassToWave: 0.6,               // Bass → 波纹起伏幅度（湖面跟着鼓点荡）
    heightFrac: 0.25               // 湖面占视口底部 25%
  },
  motion: {
    timeScale: 1,
    timeScaleReduce: 0.12,         // 减少动效 = 极慢连续动，不再停笔
    breatheAmp: 0.03, breatheHz: 0.08  // 静默态银河缓慢亮度呼吸（反"静态壁纸"）
  },
  perf: { dprMax: 2, dprMaxMobile: 1.5 },
  assets: {
    sky: 'assets/cosmos/sky.webp',
    mountainsFar: 'assets/cosmos/mountains_far.png',
    mountainsNear: 'assets/cosmos/mountains_near.png'
  }
};
