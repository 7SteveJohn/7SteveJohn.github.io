/**
 * 背景层 · 等高线岛图（js/cosmos/scene/IsolinesField.js）
 * ============================================================
 * 定位：桌面端 3D 背景（手机端走 js/cosmos.js 的 2D 星河，不经此类）。
 *      2026-09-30 按四路联网调研的结论从「神经网络推理场」换形而来：
 *      等高线方向是唯一 3/4 调研方向交叉支撑的候选——「楠屿」之"屿"的直译，
 *      纯线稿零光晕，线条走向来自高度场而非透视，从形态上根除跨层斜线病灶。
 *
 * 实现：单 pass 全屏 fragment shader（fbm 高度场 → fwidth 抗锯齿等值线）。
 *      主循环无任何每帧 CPU 几何上传；CPU 每帧只写 uniform。
 *
 * 立体与律动（2026-09-30 第二版，回应"3D 不明显/律动没了/液态玻璃不明显"）：
 *   · hillshade —— 高度场法线 + 方向光漫反射 + 镜面高光：山头有受光面，
 *     高光带随光源缓慢扫过坡面（液态玻璃的反光感）；
 *   · 视差纵深 —— 采样偏移按高度加权：山头随鼠标移动多、谷底几乎不动，
 *     鼠标一动整座岛产生真实的层深错动；
 *   · 律动 —— 口径修正（第三版，回应"像在抽搐"）：瞬态包络绝不直接驱动形状——
 *     bass 先过 1.5s EMA 慢包络再抬潮汐（等高线随歌的能量涨落，秒级，不逐拍跳）；
 *     beat 只闪线亮度（不改形状，同旧推理场的 beat 提亮性质）；
 *     mid 连续加速漂移（歌快场就流得快）；涟漪只保留点击手势，
 *     beat 的随机位置涟漪正是"抽搐感"来源，已删。
 *
 *   · 律动自然化（第四版，2026-09-30 联网学习方法论后重构）：
 *     ① 感知映射 —— 人耳对响度是对数感知，包络过 sqrt 再进视觉；
 *     ② 自适应归一化 —— 衰减式峰值跟随器按歌曲自身动态范围归一 bass 能量，
 *        安静的歌也有可见潮汐、重低音歌不过冲（固定幅度必然顾此失彼）；
 *     ③ 去机械正弦 —— 与音乐无关的固定频率呼吸降到极小，主项是归一化能量；
 *     ④ beat 是事件不是状态 —— 不再全线同时闪（"开灯关灯"感），
 *        改为从岛心荡开一圈亮度环（固有衰减包络的空间动画，扫过之处线被点亮）；
 *     ⑤ 特征只留 3 个：bass 能量（潮汐+亮度底）、beat 事件（中心亮度环）、mid（漂移速度）。
 *     方法论来源：musegen 音乐可视化深度文（分频段映射/自适应缩放/beat 用于关键时刻）、
 *     visualalchemist 间接映射原则、Codrops 2025 orb 教程（GSAP 惯性脉冲）。
 * ============================================================
 */
import * as THREE from 'three';

/* —— shader 常量：调稳后再考虑提配置 —— */
const QUAD_VERT = /* glsl */ `
  void main() {
    // 全屏 quad：PlaneGeometry(2,2) 的 position 即 clip space，不经过相机
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const ISO_FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;   // 场景时间（timeScale 缩放后）
  uniform vec2  uMouse;  // damped 鼠标 [-1,1]：视差 + 邻近提亮
  uniform vec2  uRes;    // 画布 CSS 像素
  uniform float uPulse;  // beat 包络 0..1（残余的全线微闪，弱）
  uniform float uBass;   // 低频慢包络，已按歌曲动态范围归一化（只驱动潮汐/亮度底）
  uniform float uMid;    // 中频包络 0..1，sqrt 感知映射（连续加速漂移）
  uniform float uScroll; // 页面滚动量（px，damped）→ 背景极轻反向漂移
  uniform vec4  uRipples[6]; // xy=涟漪中心(uv 空间) z=起始场景时间 w=强度；w<=0 为空槽（仅点击手势）
  uniform float uWaves[4];   // beat 亮度环的起始场景时间；<0 为空槽（环从岛心荡开）

  // —— 2D 值噪声 + 4 octave fbm：全图唯一的"纹理来源" ——
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(17.3, 9.1);
      a *= 0.5;
    }
    return v;
  }

  // 等值线：h∈[0,1] 的场切 N 条，线画在 fract(h*N)=0.5 处；
  // d=0 即线心，亮度随 d 增大衰减；半宽以 fwidth 计——屏幕空间像素级一致
  float isoline(float h, float n, float halfW) {
    float g = h * n;
    float d = abs(fract(g) - 0.5);
    float w = fwidth(g) * halfW;
    return 1.0 - smoothstep(0.0, w, d);
  }

  // 高度场：漂移 + 轻度 domain warp + 潮汐呼吸 + 涟漪。基准点供视差/法线复用
  float heightAt(vec2 p, float breathe, float t) {
    float h = fbm(p + breathe + t * 0.006);
    // 涟漪：波前高斯带 × 带内振荡 × 时间衰减 —— 等高线被荡开再愈合
    for (int i = 0; i < 6; i++) {
      vec4 r = uRipples[i];
      if (r.w < 0.001) continue;
      float age = t - r.z;
      if (age <= 0.0 || age >= 4.0) continue;
      float dist = length(p - r.xy);
      float front = age * 0.55;
      float band = exp(-pow((dist - front) * 5.0, 2.0));
      h += band * sin((dist - front) * 34.0) * r.w * exp(-age * 1.0) * 0.05;
    }
    return h;
  }

  // beat 亮度环：一圈光从岛心荡开，扫过之处的等高线被点亮（事件驱动的空间动画，
  // 固有衰减包络——不做形变、不全线同时闪）。速度 0.5/s 约两秒扫出屏幕，幅度指数衰减。
  float waveRing(vec2 uv, float t0, float now) {
    float age = now - t0;
    if (age <= 0.0 || age >= 2.5) return 0.0;
    float r = length(uv * 0.72);
    float front = age * 0.5;
    return exp(-pow((r - front) * 2.4, 2.0)) * exp(-age * 0.9);
  }

  void main() {
    // 归一化坐标：居中、短边对齐（y∈[-1,1]，x 按 aspect 拉开）
    vec2 asp = vec2(uRes.x / uRes.y, 1.0);
    vec2 uv = (gl_FragCoord.xy / uRes - 0.5) * asp * 2.0;

    // 潮汐呼吸：机械正弦降到极小，主项是按歌曲动态范围归一化的能量（第四版）
    float breathe = 0.015 * sin(uTime * 0.10) + 0.07 * uBass;

    // 基准点：漂移（mid 起来时歌快场就流得快，连续加速不跳变）+ 滚动反向漂移
    float drift = uTime * (0.008 + 0.004 * uMid);
    vec2 p0 = uv * 1.35
            + vec2(drift, -drift * 0.6)
            + vec2(0.0, -uScroll * 0.0004);

    // 轻度 domain warp：让等高线有地形的聚散，而不是同心圆
    float w = fbm(p0 * 1.6 + 3.7);
    vec2 p = p0 + (w - 0.5) * 0.55;

    // 视差纵深：采样点随鼠标偏移，偏移量按地形高低加权——
    // 山头动得多、谷底几乎不动，鼠标一动整座岛层深错动
    p += uMouse * (0.025 + 0.10 * w);

    float h = heightAt(p, breathe, uTime);

    // —— hillshade：高度场法线 + 方向光，山体有了受光面 ——
    float e = 0.006;
    float hx = heightAt(p + vec2(e, 0.0), breathe, uTime) - heightAt(p - vec2(e, 0.0), breathe, uTime);
    float hy = heightAt(p + vec2(0.0, e), breathe, uTime) - heightAt(p - vec2(0.0, e), breathe, uTime);
    vec3 n = normalize(vec3(-hx * 3.0, -hy * 3.0, 1.0));
    vec3 L = normalize(vec3(-0.45 + 0.2 * sin(uTime * 0.05), 0.55, 0.7)); // 光源极缓移动
    float diff = clamp(dot(n, L), 0.0, 1.0);
    vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
    float spec = pow(clamp(dot(n, H), 0.0, 1.0), 28.0);   // 坡面玻璃反光，高光带缓慢扫过

    // 细线每级一条，主线每 5 级一条略亮（地形图 index contour 惯例）
    float line  = isoline(h, 14.0, 0.8);
    float major = isoline(h, 14.0 / 5.0, 1.1);

    // 光标邻近提亮：半径 0.45 内最多 +35%，极轻，不给光晕
    float mD = length(uv - uMouse * asp);
    float near = 1.0 + 0.35 * max(0.0, 1.0 - mD / 0.45);

    float a = max(line * 0.30, major * 0.20);
    // 律动两通道：残余的全线微闪（弱）+ beat 亮度环从岛心扫过（空间事件动画）
    float wave = 0.0;
    for (int i = 0; i < 4; i++) {
      wave = max(wave, waveRing(uv, uWaves[i], uTime));
    }
    a = (a + max(line, major) * wave * 0.26) * near * (1.0 + 0.12 * uPulse);

    vec3 base = vec3(0.020, 0.027, 0.047);   // #05070c 近黑，与 clear 色同族
    vec3 ink  = vec3(0.470, 0.565, 0.710);   // 冷青灰，--accent #8fb8ff 的压暗邻族
    vec3 col = base
             + ink * a
             + ink * wave * 0.035   // 亮度环的面光：波前轮廓任何地形都可见
             + ink * (diff - 0.45) * 0.10    // 山体明暗：受光面微亮、背光面微暗
             + vec3(0.75, 0.83, 0.95) * spec * 0.09;  // 液态玻璃反光：冷白高光

    gl_FragColor = vec4(col, 1.0);
  }
`;

const RIPPLE_MAX = 6;

export class IsolinesField {
  constructor(scene) {
    this.uniforms = {
      uTime:    { value: 0 },
      uMouse:   { value: new THREE.Vector2(0, 0) },
      uRes:     { value: new THREE.Vector2(1, 1) },
      uPulse:   { value: 0 },
      uBass:    { value: 0 },   // 归一化后的能量水平（自适应缩放），驱动潮汐
      uMid:     { value: 0 },   // sqrt 感知映射，驱动漂移速度
      uScroll:  { value: 0 },
      uRipples: { value: Array.from({ length: RIPPLE_MAX }, () => new THREE.Vector4(0, 0, -10, 0)) },
      uWaves:   { value: [-10, -10, -10, -10] },   // beat 亮度环起始时间，<0 空槽
    };
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: QUAD_VERT,
      fragmentShader: ISO_FRAG,
      depthWrite: false,
      depthTest: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;   // clip-space 直出，不经相机，别被视锥剔除
    scene.add(this.mesh);
    this.ripples = [];                 // { x, y, t0, amp }（uv 空间坐标）
    this._pulse = 0;
    this._bassSlow = 0;                // 1.5s EMA：歌的能量水平
    this._bassPeak = 0.25;             // 衰减式峰值跟随：歌曲动态范围的上沿
    this._mid = 0;
    this._waves = [];                  // beat 亮度环的起始时间
  }

  setRes(w, h) {
    this.uniforms.uRes.value.set(w, h);
    this._w = w;
    this._h = h;
  }

  /* 涟漪入列：屏幕像素坐标 → uv 空间；老涟漪挤出（uniform 槽位固定 6 个） */
  _ripple(cx, cy, amp) {
    const aspX = this._w / this._h;
    this.ripples.push({
      x: (cx / this._w - 0.5) * aspX * 2.0,
      y: -(cy / this._h - 0.5) * 2.0,
      t0: this.uniforms.uTime.value,
      amp,
    });
    if (this.ripples.length > RIPPLE_MAX) this.ripples.shift();
  }

  /* 点击水面：从点击处放一记强涟漪（唯一的形变涟漪来源，是手势不是律动） */
  kick(cx, cy) {
    this._ripple(cx, cy, 1.0);
  }

  /* beat 事件：从岛心荡开一圈亮度环（固有衰减包络，空间动画不碰形状） */
  onBeat() {
    this._waves.push(this.uniforms.uTime.value);
    if (this._waves.length > 4) this._waves.shift();
  }

  /* 主循环唯一入口；interaction 取 damped 鼠标与滚动，audio 只取包络 */
  update(t, audio, interaction, dtMs = 16.7, beatPulse = 0) {
    this.uniforms.uTime.value = t;
    this.uniforms.uMouse.value.set(interaction.mouse.x, interaction.mouse.y);
    this.uniforms.uPulse.value = beatPulse;
    this.uniforms.uScroll.value = interaction.scroll || 0;
    const dt = Math.min(dtMs, 100) / 1000;
    // 能量慢包络（1.5s EMA）→ 衰减式峰值跟随 → 按歌曲自身动态范围归一：
    // 安静的歌也有可见潮汐，重低音歌不过冲（自适应缩放，勿写死幅度）
    const k = 1 - Math.exp(-dt / 1.5);
    this._bassSlow += ((audio.bass || 0) - this._bassSlow) * k;
    this._bassPeak = Math.max(this._bassSlow, this._bassPeak * Math.exp(-dt / 8.0));
    this.uniforms.uBass.value = Math.min(1, this._bassSlow / Math.max(this._bassPeak, 0.25));
    // mid 的 sqrt 感知映射：人耳对响度是对数的，线性映射要么没反应要么过冲
    this._mid += ((audio.mid || 0) - this._mid) * (1 - Math.exp(-dt / 0.8));
    this.uniforms.uMid.value = Math.sqrt(Math.max(0, this._mid));
    // 涟漪槽：过期的写 0 强度
    const slots = this.uniforms.uRipples.value;
    for (let i = 0; i < RIPPLE_MAX; i++) {
      const r = this.ripples[i];
      if (r) slots[i].set(r.x, r.y, r.t0, r.amp);
      else slots[i].set(0, 0, -10, 0);
    }
    this.ripples = this.ripples.filter((r) => t - r.t0 < 4.0);
    // 亮度环槽：过期的写空
    const wv = this.uniforms.uWaves.value;
    for (let i = 0; i < 4; i++) {
      wv[i] = this._waves[i] !== undefined ? this._waves[i] : -10;
    }
    this._waves = this._waves.filter((t0) => t - t0 < 2.5);
    this._pulse = beatPulse;
  }

  /* 调试探针（对齐 __COSMOS.info 的取用习惯） */
  info() {
    return {
      engine: 'isolines',
      time: +this.uniforms.uTime.value.toFixed(2),
      mouse: {
        x: +this.uniforms.uMouse.value.x.toFixed(3),
        y: +this.uniforms.uMouse.value.y.toFixed(3),
      },
      pulse: +this._pulse.toFixed(3),
      bass: +this.uniforms.uBass.value.toFixed(3),
      bassPeak: +this._bassPeak.toFixed(3),
      waves: this._waves.length,
    };
  }
}
