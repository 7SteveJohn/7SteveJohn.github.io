// Interactive Cosmic Blog · 全局配置
// 主题：本地推理场（分层节点网 + 邻层连边 + 沿边前传的推理脉冲 + 音频律动）
export const CONFIG = {
  camera: {
    fov: 60, near: 0.1, far: 1000, zPos: 5,
    parallaxStrengthX: 0.45,   // 鼠标视差幅度（damped，禁止直接跟随）
    parallaxStrengthY: 0.24,
    damping: 0.05,
    scrollStrength: 0.55,      // 滚动一屏带来的纵深偏移
    beatFovPulse: 0.8          // Beat → FOV 60.0→60.8，"空间在呼吸"不是"网页在震动"
  },
  // 交互拾取平面（射线与哪一层求交）：取场的中部
  layers: { fieldZ: -2.5 },
  field: {
    layers: 5,                 // 输入层 → 隐藏层×3 → 输出层
    zFar: -8, zNear: 0.2,      // 输入层最远最小，输出层最近最大
    nodesDesktop: 300, nodesMobile: 140,
    spreadNear: 1.0,           // 输出层铺满视口（近、大、亮）
    spreadFar: 0.45,           // 输入层只占中间一小块 → 层层向内收，读得出深度
    jitter: 1.0,               // 网格抖动（1.0 = 格内随机，别排成棋盘/横线）
    linksPerNode: 3,           // 每个节点连下一层最近的几个
    linkRadiusNorm: 0.45,      // 归一化空间的连边半径（消除透视偏置）
    drift: 0.05,               // 节点微漂（静默态也在动）
    nodeSize: 2.4,
    twinkleRatio: 0.25,        // 只有 1/4 节点响应高频，禁止全屏同步闪
    cursorGlow: 0.6,           // 光标附近节点提亮
    cursorRadius: 1.1,         // 光标邻近连边的提亮半径（世界单位）
    clickBurst: 3              // 点击一次放几记脉冲
  },
  edges: {
    base: 0.11,                // 连边底亮（暗到能当背景，又看得见结构）
    bassGain: 2.4,             // Bass → 连边底亮（要肉眼可见，不是若有若无）
    beatGain: 0.9,             // Beat 瞬间连边整体提亮（随 pulse 包络起落）
    heatGain: 1.25,            // 脉冲经过的余温亮度
    heatTau: 0.16,             // 余温衰减时间常数（秒）
    cursorGain: 0.22           // 光标邻近连边提亮
  },
  pulses: {
    count: 34, countMobile: 15,
    size: 3.4,
    speed: 0.55,               // 归一化边长的推进速度（静默态也在跑）
    midGain: 2.2,              // Mid → 脉冲速度（音乐中频一起，脉冲明显加速）
    waveSpeed: 1.6,            // Beat 前传波扫过全程的速度
    beatBurst: 14              // Beat 一次从输入层放几记（肉眼要看得见"一波"）
  },
  ambient: {
    count: 3,                  // 极暗的加色辉光面，免得纯黑发死
    opacity: 0.22
  },
  audio: {
    attack: 0.4, release: 0.055,   // 包络：攻击快、释放慢（墙钟 dt）
    trebleToStars: 1.3             // Treble → 少量节点亮度
  },
  beat: {
    rise: 0.07, minGap: 220,       // 能量涨幅判据 + 不应期（无 __BEAT 时自检）
    attack: 0.5, release: 0.07     // pulse 包络
  },
  motion: {
    timeScale: 1,
    timeScaleReduce: 0.12,         // 减少动效 = 极慢连续动，不再停笔
    breatheAmp: 0.03, breatheHz: 0.08
  },
  perf: { dprMax: 2, dprMaxMobile: 1.5 }
};
