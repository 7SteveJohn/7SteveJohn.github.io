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
 *   · 律动 —— bass 抬潮汐幅度（高度场整体涨落）、beat/点击从场中放水波涟漪
 *     （衰减正弦环注入高度场，等高线被荡开再愈合）；
 *     幅度对齐历史口径：看得清，但不"整屏打拍子"、不晃得读不了字。
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
  uniform float uPulse;  // beat 包络 0..1
  uniform float uBass;   // 低频包络 0..1
  uniform float uScroll; // 页面滚动量（px，damped）→ 背景极轻反向漂移
  uniform vec4  uRipples[6]; // xy=涟漪中心(uv 空间) z=起始场景时间 w=强度；w<=0 为空槽

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

  void main() {
    // 归一化坐标：居中、短边对齐（y∈[-1,1]，x 按 aspect 拉开）
    vec2 asp = vec2(uRes.x / uRes.y, 1.0);
    vec2 uv = (gl_FragCoord.xy / uRes - 0.5) * asp * 2.0;

    // 潮汐呼吸：bass 直接抬幅度——起歌时整座岛在缓慢涨落
    float breathe = 0.05 * sin(uTime * 0.12) + 0.10 * uBass;

    // 基准点：极慢漂移 + 滚动反向漂移
    vec2 p0 = uv * 1.35
            + vec2(uTime * 0.008, -uTime * 0.005)
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
    a *= near * (1.0 + 0.25 * uPulse);

    vec3 base = vec3(0.020, 0.027, 0.047);   // #05070c 近黑，与 clear 色同族
    vec3 ink  = vec3(0.470, 0.565, 0.710);   // 冷青灰，--accent #8fb8ff 的压暗邻族
    vec3 col = base
             + ink * a
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
      uBass:    { value: 0 },
      uScroll:  { value: 0 },
      uRipples: { value: Array.from({ length: RIPPLE_MAX }, () => new THREE.Vector4(0, 0, -10, 0)) },
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
    this._bass = 0;
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

  /* 点击水面：从点击处放一记强涟漪 */
  kick(cx, cy) {
    this._ripple(cx, cy, 1.0);
  }

  /* beat：从场中随机位置放轻涟漪（等高线荡开一层，不"整屏打拍子"） */
  kickPulse() {
    this._ripple((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.8, 0.45);
  }

  /* 主循环唯一入口；interaction 取 damped 鼠标与滚动，audio 只取包络 */
  update(t, audio, interaction, dtMs = 16.7, beatPulse = 0) {
    this.uniforms.uTime.value = t;
    this.uniforms.uMouse.value.set(interaction.mouse.x, interaction.mouse.y);
    this.uniforms.uPulse.value = beatPulse;
    this.uniforms.uBass.value = audio.bass || 0;
    this.uniforms.uScroll.value = interaction.scroll || 0;
    // 涟漪槽：过期的写 0 强度
    const slots = this.uniforms.uRipples.value;
    for (let i = 0; i < RIPPLE_MAX; i++) {
      const r = this.ripples[i];
      if (r) slots[i].set(r.x, r.y, r.t0, r.amp);
      else slots[i].set(0, 0, -10, 0);
    }
    this.ripples = this.ripples.filter((r) => t - r.t0 < 4.0);
    this._pulse = beatPulse;
    this._bass = audio.bass || 0;
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
      bass: +this._bass.toFixed(3),
      ripples: this.ripples.length,
    };
  }
}
