// ChladniField.js · 声学克拉尼微粒谐振场 (Chladni Acoustic Resonance Field)
// 基于真实声学驻波物理：数万星尘微粒在空间引力中浮游，随音乐和弦与频率自发聚集成声学干涉共振图景。
import * as THREE from 'three';

const POINT_COUNT = 6000;

const VERT = /* glsl */`
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uPixel;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixel * (18.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */`
  precision mediump float;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uDark;
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    // 柔和微光高斯核
    float glow = exp(-dist * dist * 10.0);
    // 暗色模式：高光青白微粒 + 加法光晕
    vec3 darkCol = vColor * glow;
    // 亮色模式：深靛蓝 / 钴蓝水墨星尘微粒，在浅白底上具有极高清晰度与艺术质感
    vec3 lightCol = vec3(0.04, 0.28, 0.72) * (0.85 + glow * 0.35);
    vec3 col = mix(lightCol, darkCol, uDark);
    float a = mix(vAlpha * (0.6 + glow * 0.4), vAlpha * glow, uDark);
    gl_FragColor = vec4(col, a);
  }
`;

export class ChladniField {
  constructor(scene) {
    this.scene = scene;
    this.count = POINT_COUNT;
    this.pos = new Float32Array(this.count * 3);
    this.vel = new Float32Array(this.count * 3);
    this.orig = new Float32Array(this.count * 2); // 归一化平面底标 [-1, 1]
    this.colors = new Float32Array(this.count * 3);
    this.sizes = new Float32Array(this.count);
    this.alphas = new Float32Array(this.count);

    // 随机初值布点
    for (let i = 0; i < this.count; i++) {
      const r = Math.sqrt(Math.random()) * 8.5;
      const th = Math.random() * Math.PI * 2;
      this.orig[i * 2] = (Math.random() * 2 - 1);
      this.orig[i * 2 + 1] = (Math.random() * 2 - 1);

      this.pos[i * 3] = Math.cos(th) * r;
      this.pos[i * 3 + 1] = Math.sin(th) * r;
      this.pos[i * 3 + 2] = (Math.random() - 0.5) * 2.0;

      this.vel[i * 3] = (Math.random() - 0.5) * 0.02;
      this.vel[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      this.vel[i * 3 + 2] = 0;

      // 颜色基底：电光青蓝到冰白
      const isCyan = Math.random() > 0.35;
      this.colors[i * 3] = isCyan ? 0.22 : 0.85;
      this.colors[i * 3 + 1] = isCyan ? 0.74 : 0.95;
      this.colors[i * 3 + 2] = 1.0;

      this.sizes[i] = Math.random() * 1.8 + 1.2;
      this.alphas[i] = Math.random() * 0.5 + 0.35;
    }

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    this.uDark = isDark ? 1.0 : 0.0;
    this.isDarkCached = isDark;

    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uPixel: { value: Math.min(devicePixelRatio || 1, 2) },
        uDark: { value: this.uDark },
      },
      transparent: true,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geo, this.mat);
    this.scene.add(this.points);

    // 谐振模态参数 (n, m)
    this.modeN = 3;
    this.modeM = 5;
    this.modeTargetN = 3;
    this.modeTargetM = 5;
    this.beatKick = 0;
  }

  setRes(w, h) {
    this.mat.uniforms.uPixel.value = Math.min(devicePixelRatio || 1, 2);
  }

  onBeat(strength = 1.0) {
    this.beatKick = strength * 0.6;
    // 随机跃迁到新的谐振和弦模态
    const modes = [
      [2, 3], [3, 4], [3, 5], [4, 5], [2, 5], [4, 6], [5, 7]
    ];
    const next = modes[(Math.random() * modes.length) | 0];
    this.modeTargetN = next[0];
    this.modeTargetM = next[1];
  }

  kick(x, y) {
    this.beatKick = 0.5;
  }

  update(sceneT, audio, interaction, dtMs) {
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const targetDark = isDark ? 1.0 : 0.0;
    this.uDark += (targetDark - this.uDark) * 0.1;
    this.mat.uniforms.uDark.value = this.uDark;
    if (this.isDarkCached !== isDark) {
      this.isDarkCached = isDark;
      this.mat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
      this.mat.needsUpdate = true;
    }

    const dt = Math.min(dtMs / 1000, 0.05);
    const bass = audio ? audio.bass || 0 : 0;
    const mid = audio ? audio.mid || 0 : 0;

    // 模态连续平滑
    this.modeN += (this.modeTargetN - this.modeN) * 0.05;
    this.modeM += (this.modeTargetM - this.modeM) * 0.05;

    const n = this.modeN;
    const m = this.modeM;
    const PI = Math.PI;

    // 鼠标在世界坐标的映射
    let mx = 0, my = 0;
    if (interaction && interaction.mouse) {
      mx = interaction.mouse.x * 6.0;
      my = interaction.mouse.y * 3.5;
    }

    const pos = this.pos;
    const vel = this.vel;
    const orig = this.orig;

    // 克拉尼声学受力迭代
    const chladniWeight = 0.04 + bass * 0.12;

    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      let x = pos[idx];
      let y = pos[idx + 1];

      // 映射到 [-1, 1] 谐振盘
      const nx = x * 0.15;
      const ny = y * 0.15;

      const aX = n * PI * nx;
      const aY = m * PI * ny;
      const bX = m * PI * nx;
      const bY = n * PI * ny;

      const sinAX = Math.sin(aX), cosAX = Math.cos(aX);
      const sinAY = Math.sin(aY), cosAY = Math.cos(aY);
      const sinBX = Math.sin(bX), cosBX = Math.cos(bX);
      const sinBY = Math.sin(bY), cosBY = Math.cos(bY);

      // 克拉尼谐振盘方程：w = sin(n*pi*x)*sin(m*pi*y) - sin(m*pi*x)*sin(n*pi*y)
      // 粒子受引力趋向节线 w(x, y) = 0
      const w = sinAX * sinAY - sinBX * sinBY;

      // 解析梯度导数，零数值近似截断误差
      const wx = n * cosAX * sinAY - m * cosBX * sinBY;
      const wy = m * sinAX * cosAY - n * sinBX * cosBY;

      // 引力指向节线 (w = 0 区域)
      const gradLen = Math.sqrt(wx * wx + wy * wy) + 0.001;
      const forceMag = Math.sign(w) * Math.min(Math.abs(w), 0.8) * chladniWeight;

      vel[idx] -= (wx / gradLen) * forceMag;
      vel[idx + 1] -= (wy / gradLen) * forceMag;

      // 节拍爆发冲击散开
      if (this.beatKick > 0.01) {
        const dCenter = Math.sqrt(x * x + y * y) + 0.1;
        vel[idx] += (x / dCenter) * this.beatKick * 0.2;
        vel[idx + 1] += (y / dCenter) * this.beatKick * 0.2;
      }

      // 指针扰动微风
      const dxm = x - mx;
      const dym = y - my;
      const dm = Math.sqrt(dxm * dxm + dym * dym) + 0.1;
      if (dm < 2.5) {
        vel[idx] += (dxm / dm) * 0.05;
        vel[idx + 1] += (dym / dm) * 0.05;
      }

      // 阻尼摩擦力与自然回心力
      vel[idx] *= 0.92;
      vel[idx + 1] *= 0.92;
      vel[idx] -= x * 0.002;
      vel[idx + 1] -= y * 0.002;

      pos[idx] += vel[idx];
      pos[idx + 1] += vel[idx + 1];
    }

    if (this.beatKick > 0.01) {
      this.beatKick *= 0.88;
    }

    this.geo.attributes.position.needsUpdate = true;

    // 整体在 3D 空间缓慢呼吸倾角
    this.points.rotation.z = Math.sin(sceneT * 0.05) * 0.08;
    this.points.rotation.x = Math.sin(sceneT * 0.03) * 0.05;
  }

  dispose() {
    this.scene.remove(this.points);
    this.geo.dispose();
    this.mat.dispose();
  }
}
