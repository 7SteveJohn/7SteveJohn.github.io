/**
 * 背景层 · 等高线岛图（js/cosmos/scene/IsolinesField.js）
 * ============================================================
 * 定位：桌面端 3D 背景（手机端走 js/cosmos.js 的 2D 星河，不经此类）。
 *      2026-09-30 按四路联网调研的结论从「神经网络推理场」换形而来：
 *      等高线方向是唯一 3/4 调研方向交叉支撑的候选——「楠屿」之"屿"的直译，
 *      纯线稿零光晕，线条走向来自高度场而非透视，从形态上根除跨层斜线病灶。
 *
 * 实现：单 pass 全屏 fragment shader（fbm 高度场 → fwidth 抗锯齿等值线）。
 *      主循环无任何每帧 CPU 几何上传，CPU 每帧只写 5 个 uniform；
 *      音频只参与"呼吸"（bass 抬呼吸幅度、pulse 轻提线亮度），不做整屏打拍子。
 * ============================================================
 */
import * as THREE from 'three';

/* —— shader 常量：第一版全部内联，调稳后再考虑提配置 —— */
const QUAD_VERT = /* glsl */ `
  void main() {
    // 全屏 quad：PlaneGeometry(2,2) 的 position 即 clip space，不经过相机
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const ISO_FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;   // 场景时间（timeScale 缩放后）
  uniform vec2  uMouse;  // damped 鼠标 [-1,1]，做极轻视差与邻近提亮
  uniform vec2  uRes;    // 画布 CSS 像素
  uniform float uPulse;  // beat 包络 0..1
  uniform float uBass;   // 低频包络 0..1

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

  void main() {
    // 归一化坐标：居中、短边对齐（y∈[-1,1]，x 按 aspect 拉开）
    vec2 asp = vec2(uRes.x / uRes.y, 1.0);
    vec2 uv = (gl_FragCoord.xy / uRes - 0.5) * asp * 2.0;

    // 极慢漂移（一张在暗处慢慢显影的图）+ 鼠标视差
    vec2 p = uv * 1.35
           + vec2(uTime * 0.008, -uTime * 0.005)
           + uMouse * 0.05;

    // 轻度 domain warp：让等高线有地形的聚散，而不是同心圆
    float w = fbm(p * 1.6 + 3.7);
    p += (w - 0.5) * 0.55;

    // 高度场：fbm + 极低频呼吸（bass 只抬呼吸幅度，pulse 不参与形状）
    float breathe = 0.035 * sin(uTime * 0.12) + 0.02 * uBass;
    float h = fbm(p + breathe);

    // 细线每级一条，主线每 5 级一条略亮（地形图 index contour 惯例）
    float line  = isoline(h, 14.0, 0.8);
    float major = isoline(h, 14.0 / 5.0, 1.1);

    // 光标邻近提亮：半径 0.45 内最多 +35%，极轻，不给光晕
    float mD = length(uv - uMouse * asp);
    float near = 1.0 + 0.35 * max(0.0, 1.0 - mD / 0.45);

    float a = max(line * 0.30, major * 0.20);
    a *= near * (1.0 + 0.12 * uPulse);

    vec3 base = vec3(0.020, 0.027, 0.047);   // #05070c 近黑，与 clear 色同族
    vec3 ink  = vec3(0.470, 0.565, 0.710);   // 冷青灰，--accent #8fb8ff 的压暗邻族
    vec3 col = base + ink * a;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export class IsolinesField {
  constructor(scene) {
    this.uniforms = {
      uTime:  { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uRes:   { value: new THREE.Vector2(1, 1) },
      uPulse: { value: 0 },
      uBass:  { value: 0 },
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
    this._pulse = 0;
    this._bass = 0;
  }

  setRes(w, h) {
    this.uniforms.uRes.value.set(w, h);
  }

  /* 主循环唯一入口；interaction 取 damped 鼠标（视差/提亮），audio 只取包络 */
  update(t, audio, interaction, dtMs = 16.7, beatPulse = 0) {
    this.uniforms.uTime.value = t;
    this.uniforms.uMouse.value.set(interaction.mouse.x, interaction.mouse.y);
    this.uniforms.uPulse.value = beatPulse;
    this.uniforms.uBass.value = audio.bass || 0;
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
    };
  }
}
