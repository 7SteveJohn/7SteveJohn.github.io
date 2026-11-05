// AuroraField.js · 极光微流体 / 液态深空 (Cosmic Aurora Fluid)
// 彻底摒弃任何几何线条与网状晶格杂乱感，纯粹靠电光青蓝与冷紫极光流体在深空中柔和翻涌、折叠与呼吸。
// 支持音乐频段驱动（低音潮汐澎湃、瞬态节拍激起平滑散逸涟漪），零硬边切割，完美融入白昼与暗夜。
import * as THREE from 'three';

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uCursor;
  uniform float uBass;
  uniform float uMid;
  uniform float uBeat;
  uniform float uDark;
  uniform float uShockwave;

  // 经典 2D 旋转与 Simplex 噪声
  mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  // 极轻量快速伪哈希
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  // 梯度噪声
  float gnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                   dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
               mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                   dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
  }

  // 多尺度 Domain Warping 流体
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = rot(0.37);
    for (int i = 0; i < 4; i++) {
      v += a * gnoise(p);
      p = m * p * 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);
    
    // 指针引力微涡（极轻柔的物理吸附扰动）
    vec2 m = (uCursor * 2.0 - uRes) / min(uRes.x, uRes.y);
    float dMouse = length(uv - m);
    uv += (uv - m) * (0.035 / (dMouse * dMouse + 0.45));

    // 时间流动与音乐低频潮汐
    float t = uTime * 0.06;
    float bassTide = uBass * 0.35;
    
    // 双层域扭曲 (Domain Warping 流体能量场，生成丝绸水彩般折叠感)
    vec2 q = vec2(fbm(uv + vec2(t * 0.35, t * 0.18)),
                  fbm(uv + vec2(t * 0.25, -t * 0.42)));
                  
    vec2 r = vec2(fbm(uv + 2.4 * q + vec2(1.7, 9.2) + t * 0.12),
                  fbm(uv + 2.4 * q + vec2(8.3, 2.8) - t * 0.16));

    float f = fbm(uv + 2.8 * r + vec2(0.0, bassTide));
    f = clamp(f * 0.5 + 0.5, 0.0, 1.0);

    // 节拍瞬态扩散波（只在主动触发冲击波时产生单环平滑高斯散逸，静默时严格为 0）
    float rDist = length(uv);
    float shock = 0.0;
    if (uShockwave > 0.001) {
      float waveFront = uShockwave * 2.4;
      float waveThickness = 0.18;
      float distToFront = abs(rDist - waveFront);
      shock = smoothstep(waveThickness, 0.0, distToFront) * exp(-uShockwave * 2.5);
    }
    f += shock * 0.22;

    // ----------------------------------------------------
    // 暗色模式：极夜深空 · 幽蓝星云与电光青蓝丝带
    // ----------------------------------------------------
    vec3 colDeepObsidian = vec3(0.024, 0.035, 0.067); // #060911
    vec3 colIndigoMist   = vec3(0.05, 0.09, 0.22);    // 幽邃冷蓝
    vec3 colElectricCyan = vec3(0.0, 0.65, 0.90);     // 电光青蓝
    vec3 colVioletAurora = vec3(0.38, 0.18, 0.62);    // 极光淡紫

    vec3 darkCol = mix(colDeepObsidian, colIndigoMist, clamp(length(q), 0.0, 1.0));
    darkCol = mix(darkCol, colVioletAurora, clamp(length(r.x), 0.0, 1.0) * 0.45);
    darkCol = mix(darkCol, colElectricCyan, pow(f, 2.6) * 0.70);
    darkCol += colElectricCyan * pow(f, 4.0) * (0.25 + uBass * 0.55);
    if (shock > 0.0) {
      darkCol += colElectricCyan * shock * 0.45;
    }

    // ----------------------------------------------------
    // 亮色模式：晨曦水彩流体 · 空灵高雅透光（杜绝生硬线框与大黑块）
    // ----------------------------------------------------
    vec3 colLightSky     = vec3(0.973, 0.980, 0.992); // 纯净晨曦白底 #f8fafc
    vec3 colCeruleanCyan = vec3(0.18, 0.62, 0.92);    // 亮天青蓝
    vec3 colRoyalViolet  = vec3(0.52, 0.38, 0.86);    // 雅致紫罗兰
    vec3 colAzureBlue    = vec3(0.20, 0.48, 0.88);    // 蔚蓝墨彩
    vec3 colSpringMint   = vec3(0.12, 0.72, 0.65);    // 清新青葱

    // 层次流动混合：以清亮天青与轻盈紫罗兰水彩柔和显影，既灵动又有呼吸
    vec3 lightCol = colLightSky;
    float fluidMask1 = smoothstep(0.12, 0.82, length(q));
    float fluidMask2 = smoothstep(0.18, 0.88, length(r.x));
    float flowEnergy = pow(f, 2.0);

    vec3 tintCyan   = mix(colLightSky, colCeruleanCyan, 0.45);
    vec3 tintViolet = mix(colLightSky, colRoyalViolet, 0.35);
    vec3 tintAzure  = mix(colLightSky, colAzureBlue, 0.38);
    vec3 tintMint   = mix(colLightSky, colSpringMint, 0.28);

    lightCol = mix(lightCol, tintCyan, fluidMask1 * 0.65);
    lightCol = mix(lightCol, tintViolet, fluidMask2 * 0.48 * (0.8 + uBass * 0.4));
    lightCol = mix(lightCol, tintAzure, flowEnergy * 0.52);
    lightCol += (colSpringMint - colLightSky) * pow(f, 3.0) * 0.15 * (0.7 + uBass * 0.6);

    // 节拍涟漪轻柔微漾
    if (shock > 0.0) {
      lightCol = mix(lightCol, tintCyan, shock * 0.5);
    }

    vec3 finalCol = mix(lightCol, darkCol, uDark);

    // 边缘柔和过渡（暗色暗角，亮色天光淡晕，平滑无限延展）
    float vignette = 1.0 - smoothstep(0.5, 1.8, length(uv));
    finalCol = mix(finalCol * mix(0.95, 1.0, vignette), finalCol * mix(0.78, 1.0, vignette), uDark);

    gl_FragColor = vec4(finalCol, 1.0);
  }
`;

export class AuroraField {
  constructor(scene) {
    this.scene = scene;
    this.shockwave = 0;
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    this.uDark = isDark ? 1.0 : 0.0;
    this.geo = new THREE.PlaneGeometry(2, 2);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(innerWidth, innerHeight) },
        uCursor: { value: new THREE.Vector2(innerWidth * 0.5, innerHeight * 0.5) },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uBeat: { value: 0 },
        uDark: { value: this.uDark },
        uShockwave: { value: 0 },
      },
      depthWrite: false,
      depthTest: false,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  setRes(w, h) {
    this.mat.uniforms.uRes.value.set(w, h);
  }

  onBeat(strength = 0.8) {
    this.shockwave = 0.01;
    this.mat.uniforms.uBeat.value = strength;
  }

  kick(x, y) {
    this.shockwave = 0.01;
    this.mat.uniforms.uCursor.value.set(x, innerHeight - y);
  }

  update(sceneT, audio, interaction, dtMs) {
    this.mat.uniforms.uTime.value = sceneT;
    const isDark = document.documentElement.classList.contains('dark');
    this.uDark += ((isDark ? 1.0 : 0.0) - this.uDark) * 0.08;
    this.mat.uniforms.uDark.value = this.uDark;

    if (audio) {
      this.mat.uniforms.uBass.value = audio.bass || 0;
      this.mat.uniforms.uMid.value = audio.mid || 0;
    }
    if (interaction && interaction.mouse) {
      const mx = (interaction.mouse.x * 0.5 + 0.5) * innerWidth;
      const my = (interaction.mouse.y * 0.5 + 0.5) * innerHeight;
      this.mat.uniforms.uCursor.value.set(mx, my);
    }
    if (this.shockwave > 0) {
      this.shockwave += (dtMs / 1000) * 0.9;
      if (this.shockwave > 1.5) this.shockwave = 0;
    }
    this.mat.uniforms.uShockwave.value = this.shockwave;
    this.mat.uniforms.uBeat.value *= 0.92;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.geo.dispose();
    this.mat.dispose();
  }
}
