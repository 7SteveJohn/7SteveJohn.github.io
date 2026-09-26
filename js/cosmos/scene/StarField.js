// StarField · Z=1.5：前景星尘 BufferGeometry/Points（规格书 §3/§4.2）
// 800 粒子（移动端 300）；CPU 鼠标排斥 + 弹簧回弹；闪烁相位速度全随机不同步；
// Treble 只提亮 trebleRatio 比例的星尘，禁止全屏同步闪
import * as THREE from 'three';

const VERT = /* glsl */`
  attribute float aPhase, aSpeed, aSize, aTreble;
  uniform float uTime, uTreble, uPixel;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.68 + 0.32 * sin(uTime * aSpeed + aPhase);   // 各自为政的闪烁
    tw += uTreble * 0.6 * aTreble;                            // 高频只碰少数星
    vTw = tw;
    gl_PointSize = aSize * uPixel * (3.5 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG = /* glsl */`
  uniform sampler2D uSprite;
  varying float vTw;
  void main() {
    vec4 s = texture2D(uSprite, gl_PointCoord);
    gl_FragColor = vec4(vec3(0.82, 0.86, 1.0) * s.rgb, s.a) * vTw;
  }
`;

function softSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export class StarField {
  constructor(scene, cfg, isMobile) {
    this.cfg = cfg;
    const count = isMobile ? cfg.stars.countMobile : cfg.stars.count;
    this.count = count;
    const z = cfg.layers.starZ;
    const dist = cfg.camera.zPos - z;
    const halfH = dist * Math.tan(THREE.MathUtils.degToRad(cfg.camera.fov / 2));
    const halfW = halfH * (innerWidth / innerHeight);

    this.home = new Float32Array(count * 3);
    this.off = new Float32Array(count * 3);     // 当前排斥位移
    const pos = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const speed = new Float32Array(count);
    const size = new Float32Array(count);
    const treb = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // 星尘撒在整个前景空间；湖面区（底部 1/4）密度减半，别成"萤火虫开会"
      let y = (Math.random() * 2 - 1) * halfH * 1.1;
      if (y < -halfH * 0.5 && Math.random() < 0.5) y = -y * 0.5;
      const x = (Math.random() * 2 - 1) * halfW * 1.15;
      const zz = z + (Math.random() * 2 - 1) * 0.8;
      this.home[i * 3] = x; this.home[i * 3 + 1] = y; this.home[i * 3 + 2] = zz;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = zz;
      phase[i] = Math.random() * Math.PI * 2;
      speed[i] = 0.6 + Math.random() * 2.4;
      size[i] = cfg.stars.size * (0.6 + Math.random() * 0.9);
      treb[i] = Math.random() < cfg.stars.trebleRatio ? 1 : 0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aTreble', new THREE.BufferAttribute(treb, 1));
    this.uniforms = {
      uTime: { value: 0 },
      uTreble: { value: 0 },
      uPixel: { value: 1.3 },
      uSprite: { value: softSprite() }
    };
    this.points = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    this.points.renderOrder = 4;
    scene.add(this.points);
    this.maxOff = 0;   // 探针用：当前最大排斥位移
  }
  update(t, treble, mouseWorld, hasMouse) {
    this.uniforms.uTime.value = t;
    this.uniforms.uTreble.value = treble * this.cfg.audio.trebleToStars;
    const { repulsionRadius, repulsionForce, spring } = this.cfg.stars;
    const pos = this.points.geometry.attributes.position.array;
    const r2 = repulsionRadius * repulsionRadius;
    let maxOff = 0;
    const mx = hasMouse ? mouseWorld.x : 1e9, my = hasMouse ? mouseWorld.y : 1e9;
    for (let i = 0; i < this.count; i++) {
      const ix = i * 3;
      let ox = this.off[ix], oy = this.off[ix + 1];
      const hx = this.home[ix], hy = this.home[ix + 1];
      const px = hx + ox, py = hy + oy;
      const dx = px - mx, dy = py - my;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const f = repulsionForce * (1 - d / repulsionRadius);
        ox += (dx / d) * f;
        oy += (dy / d) * f;
      }
      // 弹簧回弹（缓慢，不瞬回）
      ox -= ox * spring;
      oy -= oy * spring;
      this.off[ix] = ox; this.off[ix + 1] = oy;
      const m = Math.abs(ox) + Math.abs(oy);
      if (m > maxOff) maxOff = m;
      pos[ix] = hx + ox; pos[ix + 1] = hy + oy;
    }
    this.maxOff = maxOff;
    this.points.geometry.attributes.position.needsUpdate = true;
  }
  setPixelScale(v) { this.uniforms.uPixel.value = v; }
  reset() { this.off.fill(0); this.maxOff = 0; }
}
