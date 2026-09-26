// SkyLayer · Z=-10：深空银河母图 + Galaxy Shader（规格书 §6.1）
// uTime 极慢流动 + Bass 亮度呼吸（≤25%）+ Mid 只作用于星云区域（亮度 mask，负空间不泛紫）
// 静默态：breatheAmp 的缓慢亮度呼吸，杜绝"静态壁纸"
import * as THREE from 'three';

const FRAG = /* glsl */`
  uniform sampler2D uTexture;
  uniform float uTime, uBass, uMid, uBreathe;
  varying vec2 vUv;
  void main() {
    vec2 uv = vUv;
    uv.x += sin(uv.y * 4.0 + uTime * 0.02) * 0.003;
    uv.y += sin(uv.x * 3.0 + uTime * 0.015) * 0.0015;   // 双向极慢流动
    vec4 tex = texture2D(uTexture, uv);
    float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    float nebulaMask = smoothstep(0.04, 0.35, lum);      // 只有星云/银河区域响应 Mid
    float coreBrightness = 1.0 + uBass * 0.25 + uBreathe;
    vec3 c = tex.rgb * coreBrightness;
    c += vec3(0.05, 0.02, 0.08) * uMid * nebulaMask;
    gl_FragColor = vec4(c, 1.0);
  }
`;
const VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

export class SkyLayer {
  constructor(scene, cfg, tex) {
    this.cfg = cfg;
    // 视野 at z=-10：高 2*15*tan(30°)≈17.3；平面只比视口大 12%（余量给视差/滚动），
    // 大了会把母图放大到只见中央一截（银河带被顶出画）。cover：超宽屏按宽反推高。
    const h = 2 * (cfg.camera.zPos - cfg.layers.skyZ) * Math.tan(THREE.MathUtils.degToRad(cfg.camera.fov / 2));
    this.h = h;
    this.imgAspect = tex.image ? tex.image.width / tex.image.height : 16 / 9;
    this.geo = new THREE.PlaneGeometry(1, 1);
    // ❗ 不标 SRGBColorSpace：ShaderMaterial 输出不做 linear→sRGB 编码，
    // 标了会被解码成线性值直接上屏（画面暗 2 倍多）。原始值直通，与母图一致。
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    this.uniforms = {
      uTexture: { value: tex },
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uBreathe: { value: 0 }
    };
    this.mesh = new THREE.Mesh(this.geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, depthWrite: true
    }));
    this.mesh.position.z = cfg.layers.skyZ;
    this.mesh.position.y = h * 0.03;   // 母图银河带轻微上抬，别贴着山根
    this.mesh.renderOrder = 0;
    scene.add(this.mesh);
    this.fitAspect(innerWidth / innerHeight);
  }
  fitAspect(aspect) {
    // cover：宽、高都必须盖住视口×1.12（取最大），超宽母图才不会上下露底
    let ph = this.h * 1.12;
    let pw = ph * this.imgAspect;
    const needW = this.h * aspect * 1.12;
    if (pw < needW) { pw = needW; }
    if (ph < pw / this.imgAspect) { ph = pw / this.imgAspect; }
    this.mesh.scale.set(pw, ph, 1);
    // 超宽母图横向被裁时，右移取景窗让银河核心完整进画（母图核心偏右）
    this.mesh.position.x = pw > this.h * aspect ? -pw * 0.05 : 0;
  }
  update(t, bass, mid, breathe) {
    this.uniforms.uTime.value = t;
    this.uniforms.uBass.value = bass * this.cfg.audio.bassToBrightness / 0.25; // 归一后由公式乘 0.25
    this.uniforms.uMid.value = mid * this.cfg.audio.midToNebula;
    this.uniforms.uBreathe.value = breathe;
  }
}
