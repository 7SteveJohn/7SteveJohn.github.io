// WaterLayer · Z=0.5：湖面 = 竖直 2.5D 平面 + GLSL
// 结构（规格书 §6.2 基础版）：Base + Reflection(翻转天空) + Sin Wave + Mouse Ripple + Bass
// 鼠标：InteractionManager Raycaster 命中本平面 → uMouseUV；uRippleStrength 划过注入、静止衰减
import * as THREE from 'three';

const FRAG = /* glsl */`
  uniform sampler2D uSky;
  uniform float uTime, uBass, uRippleStrength, uWaveSpeed, uWaveAmp;
  uniform vec2 uMouseUV;
  varying vec2 vUv;
  void main() {
    vec2 uv = vUv;
    // 基础微波（湖面永远活着）；Bass 让湖面跟着鼓点荡
    float w = sin(uv.y * 46.0 + uTime * uWaveSpeed) * 0.5
            + sin(uv.x * 28.0 - uTime * uWaveSpeed * 0.66) * 0.5;
    // 鼠标水波（规格书 §4.4 公式）
    float d = distance(uv * vec2(2.2, 1.0), uMouseUV * vec2(2.2, 1.0));
    float mouseWave = sin(d * 45.0 - uTime * 6.0) * exp(-d * 5.0) * uRippleStrength;
    vec2 distort = vec2(w * 0.004 * (1.0 + uWaveAmp) + mouseWave * 0.03, mouseWave * 0.05 + w * 0.002 * (1.0 + uWaveAmp));
    // 倒影：翻转采样天空（uv.y=1 靠岸 → 取天空低处；uv.y=0 近岸 → 取天空高处）
    vec3 refl = texture2D(uSky, vec2(uv.x, 1.0 - uv.y) + distort).rgb;
    // 基色：顶部微亮（映天光），底部渐到 #030712
    vec3 deep = mix(vec3(0.012, 0.028, 0.071), vec3(0.004, 0.008, 0.016), 1.0 - uv.y);
    // 反射：夜里真湖面的倒影是暗而糊的，不是漂油 —— 强度克制，岸边最强向近岸衰减；Bass 驱动 ≤25%
    float refStrength = (0.28 + uBass * 0.25) * smoothstep(0.0, 0.9, uv.y);
    vec3 c = deep + refl * refStrength;
    // 微波高光：极克制的碎银
    float glint = max(0.0, w) * 0.012 * (0.4 + uBass);
    c += vec3(glint);
    gl_FragColor = vec4(c, 1.0);
  }
`;
const VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

export class WaterLayer {
  constructor(scene, cfg, skyTex) {
    this.cfg = cfg;
    const z = cfg.layers.waterZ;
    const dist = cfg.camera.zPos - z;
    const viewH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(cfg.camera.fov / 2));
    this.viewH = viewH;
    const h = viewH * cfg.water.heightFrac * 1.35;  // 视差余量
    const w = viewH * (innerWidth / innerHeight) * 1.4;
    this.uniforms = {
      uSky: { value: skyTex },
      uTime: { value: 0 },
      uBass: { value: 0 },
      uRippleStrength: { value: 0 },
      uWaveSpeed: { value: cfg.water.waveSpeed },
      uWaveAmp: { value: 0 },
      uMouseUV: { value: new THREE.Vector2(0.5, 0.5) }
    };
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG })
    );
    this.mesh.position.z = z;
    this.mesh.position.y = -viewH / 2 + (viewH * cfg.water.heightFrac) / 2;
    this.mesh.renderOrder = 3;
    this.mesh.name = 'water';
    scene.add(this.mesh);
    this.ripple = 0;
  }
  setMouseUV(uv, active) {
    this.uniforms.uMouseUV.value.copy(uv);
    if (active) this.ripple = Math.min(1.2, this.ripple + this.cfg.water.rippleBoost);
  }
  // 点击湖面：一记大水波（比划过猛得多）
  splash(uv) {
    this.uniforms.uMouseUV.value.copy(uv);
    this.ripple = Math.min(1.8, this.ripple + this.cfg.water.clickSplash);
  }
  // Beat → 湖心荡开一圈涟漪
  beatRipple() {
    this.uniforms.uMouseUV.value.set(0.5, 0.55);
    this.ripple = Math.min(1.8, this.ripple + this.cfg.beat.lakeRipple);
  }
  update(t, bass) {
    this.ripple *= this.cfg.water.rippleDecay;
    this.uniforms.uTime.value = t;
    this.uniforms.uBass.value = bass * this.cfg.water.bassToReflect / 0.25;
    this.uniforms.uWaveAmp.value = bass * this.cfg.water.bassToWave;
    this.uniforms.uRippleStrength.value = this.ripple;
  }
  reset() { this.ripple = 0; }
}
