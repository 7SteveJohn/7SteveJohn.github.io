// SkyLayer · Z=-10：IGLOO 式冷雾天空（场景整体替换版）
// 程序化渐变（顶部近黑 → 地平线灰蓝）+ 值噪声微雾 + 一条淡银河带 + 冷灰 grade
// 接口与旧版一致：constructor(scene, cfg[, tex]) / fitAspect / update(t, bass, mid, breathe)
// 音频接口保留：uBass（地平线亮度）、uMid（银河带）、uBreathe（呼吸）
import * as THREE from 'three';

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */`
  uniform float uTime, uBass, uMid, uBreathe;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int k = 0; k < 4; k++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    // 冷雾天空：顶部近黑 → 地平线灰蓝（视频的"灰"压暗成站点可用的深灰蓝）
    vec3 top = vec3(0.006, 0.009, 0.016);
    vec3 horizon = vec3(0.085, 0.115, 0.155) * (1.0 + uBass * 0.22 + uBreathe);
    vec3 c = mix(horizon, top, smoothstep(0.02, 0.78, uv.y));

    // 微雾噪声：低频起伏让渐变"活"，而不是塑料渐变
    float mist = fbm(uv * vec2(3.0, 5.0) + vec2(uTime * 0.008, 0.0));
    c += vec3(0.030, 0.040, 0.056) * mist * (1.0 - smoothstep(0.15, 0.85, uv.y));

    // 淡银河带（IGLOO 天空也有一条极淡的银河）：斜向、随 Mid 呼吸，克制
    float band = uv.y - 0.52 - (uv.x - 0.5) * 0.22;
    float milky = exp(-abs(band) * 7.0) * fbm(uv * 6.0 + 13.7);
    c += vec3(0.16, 0.19, 0.24) * milky * (0.05 + uMid * 0.10);

    // 星点：稀疏、随机闪烁（远星放天空层，不参与前景交互）
    vec2 sp = uv * vec2(220.0, 120.0);
    float star = step(0.9975, hash(floor(sp))) * (0.35 + 0.65 * hash(floor(sp) + 7.3));
    float tw = 0.6 + 0.4 * sin(uTime * (1.0 + hash(floor(sp)) * 2.0) + hash(floor(sp) + 3.1) * 6.28);
    c += vec3(0.75, 0.80, 0.90) * star * tw * smoothstep(0.25, 0.75, uv.y) * 0.5;

    // 冷灰 grade（与 v54 一致）
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(c, vec3(lum) * vec3(0.90, 0.97, 1.10), 0.16);

    gl_FragColor = vec4(c, 1.0);
  }
`;

export class SkyLayer {
  constructor(scene, cfg) {
    this.cfg = cfg;
    this.h = 2 * (cfg.camera.zPos - cfg.layers.skyZ) * Math.tan(THREE.MathUtils.degToRad(cfg.camera.fov / 2));
    this.geo = new THREE.PlaneGeometry(1, 1);
    this.uniforms = {
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uBreathe: { value: 0 }
    };
    this.mesh = new THREE.Mesh(this.geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, depthWrite: true
    }));
    this.mesh.position.z = cfg.layers.skyZ;
    this.mesh.position.y = this.h * 0.03;
    this.mesh.renderOrder = 0;
    scene.add(this.mesh);
    this.fitAspect(innerWidth / innerHeight);
  }
  fitAspect(aspect) {
    // cover：宽、高都盖住视口×1.12
    let ph = this.h * 1.12;
    let pw = ph * 16 / 9;
    const needW = this.h * aspect * 1.12;
    if (pw < needW) { pw = needW; }
    if (ph < pw / (16 / 9)) { ph = pw / (16 / 9); }
    this.mesh.scale.set(pw, ph, 1);
    this.mesh.position.x = pw > this.h * aspect ? -pw * 0.05 : 0;
  }
  update(t, bass, mid, breathe) {
    this.uniforms.uTime.value = t;
    this.uniforms.uBass.value = bass;
    this.uniforms.uMid.value = mid;
    this.uniforms.uBreathe.value = breathe;
  }
}
