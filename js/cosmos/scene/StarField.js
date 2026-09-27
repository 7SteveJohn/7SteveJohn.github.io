// StarField · Z=1.5：前景星尘 BufferGeometry/Points（规格书 §3/§4.2）
// 800 粒子（移动端 300）；CPU 鼠标排斥 + 弹簧回弹；闪烁相位速度全随机不同步；
// Treble 只提亮 trebleRatio 比例的星尘，禁止全屏同步闪
import * as THREE from 'three';

const VERT = /* glsl */`
  attribute float aPhase, aSpeed, aSize, aTreble;
  uniform float uTime, uTreble, uPixel, uGlow;
  uniform vec3 uCursor;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.68 + 0.32 * sin(uTime * aSpeed + aPhase);   // 各自为政的闪烁
    tw += uTreble * 0.6 * aTreble;                            // 高频只碰少数星
    // 光标 nearby 提亮：靠近光标的星"被照亮"，远的不搭理
    float d = distance(position, uCursor);
    tw += uGlow * smoothstep(2.0, 0.3, d);
    vTw = tw;
    gl_PointSize = aSize * uPixel * (3.5 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG = /* glsl */`
  uniform sampler2D uSprite;
  uniform float uForm;
  varying float vTw;
  void main() {
    vec4 s = texture2D(uSprite, gl_PointCoord);
    // 聚拢成形时粒子群更亮（IGLOO 成形段的"点亮"感）
    gl_FragColor = vec4(vec3(0.82, 0.86, 1.0) * s.rgb, s.a) * vTw * (0.85 + 0.55 * uForm);
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
      uGlow: { value: 0 },
      uForm: { value: 0 },
      uCursor: { value: new THREE.Vector3(1e9, 1e9, 0) },
      uSprite: { value: softSprite() }
    };
    this.points = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    this.points.renderOrder = 4;
    scene.add(this.points);
    this.maxOff = 0;   // 探针用：当前最大排斥位移
    // 入场：粒子从雾中四散 → 弹簧聚拢成形（IGLOO 式"粒子成形"开场，物理复用排斥的回位机制）
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 2.5 + Math.random() * 3.5;
      this.off[i * 3] = Math.cos(ang) * r;
      this.off[i * 3 + 1] = Math.sin(ang) * r * 0.6;
    }
  }
  update(t, treble, mouseWorld, hasMouse, dtMs = 16.7) {
    this.uniforms.uTime.value = t;
    this.uniforms.uTreble.value = treble * this.cfg.audio.trebleToStars;
    this.uniforms.uGlow.value = hasMouse ? this.cfg.stars.cursorGlow : 0;
    this.uniforms.uCursor.value.copy(hasMouse ? mouseWorld : this.uniforms.uCursor.value.set(1e9, 1e9, 0));
    const { repulsionRadius, repulsionForce, spring, clickKick } = this.cfg.stars;
    // 回弹按墙钟指数衰减（帧率无关：3fps 的测试环境和 60fps 的真机收敛速度一致）
    const decay = Math.exp(-spring * Math.min(dtMs, 100) / 16.7);
    // —— 聚散叙事（IGLOO 式"粒子成形"）：scatter → converge → hold → release 循环 ——
    // m: 0=散布(home) 1=成形(target)；形状每轮轮换；t 是 sceneT，reduce-motion 下随 timeScale 慢放
    const N = this.cfg.narr;
    const ct = t % N.cycle;
    const ss = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
    let form;
    if (ct < N.tConv) form = ss(ct / N.tConv);
    else if (ct < N.tConv + N.tHold) form = 1;
    else form = 1 - ss((ct - N.tConv - N.tHold) / (N.cycle - N.tConv - N.tHold));
    this.form = form;
    this.uniforms.uForm.value = form;
    const kind = Math.floor(t / N.cycle) % 3;   // 0 球壳 1 波浪原 2 双环
    const pos = this.points.geometry.attributes.position.array;
    const r2 = repulsionRadius * repulsionRadius;
    let maxOff = 0;
    const mx = hasMouse ? mouseWorld.x : 1e9, my = hasMouse ? mouseWorld.y : 1e9;
    for (let i = 0; i < this.count; i++) {
      const ix = i * 3;
      let ox = this.off[ix], oy = this.off[ix + 1];
      const hx = this.home[ix], hy = this.home[ix + 1];
      const dx = hx + ox - mx, dy = hy + oy - my;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const f = repulsionForce * (1 - d / repulsionRadius);
        ox += (dx / d) * f;
        oy += (dy / d) * f;
      }
      // 弹簧回弹（缓慢，不瞬回；帧率无关）
      ox *= decay;
      oy *= decay;
      this.off[ix] = ox; this.off[ix + 1] = oy;
      let px = hx + ox, py = hy + oy;
      if (form > 0.001) {
        // 目标形状点（x/y 平面；z 保持 home 深度，视差保留）
        let tx, ty;
        const fr = i / this.count;
        if (kind === 0) {          // 球壳轮廓：golden angle 均匀绕圆，缓慢自转
          const a = i * 2.399963 + t * 0.06;
          const rr = 1.55 + 0.5 * Math.sin(i * 12.9898);
          tx = Math.cos(a) * rr; ty = Math.sin(a) * rr * 0.72;
        } else if (kind === 1) {   // 波浪原：一条起伏的粒子地平线
          tx = (fr - 0.5) * 6.4;
          ty = -0.55 + Math.sin(tx * 1.4 + t * 0.35) * 0.16 + Math.sin(fr * 40.0) * 0.03;
        } else {                   // 双环：外环 + 内环反向转
          const inner = i % 2 === 0;
          const a = i * (inner ? -0.41 : 0.29) + t * (inner ? -0.12 : 0.07);
          const rr = inner ? 0.85 : 2.05;
          tx = Math.cos(a) * rr; ty = Math.sin(a) * rr * 0.6;
        }
        const k = form * (0.92 + 0.08 * Math.sin(t * 0.7 + i));   // 成形后仍有微呼吸，不是冻结
        px = hx + (tx - hx) * k + ox * (1 - form * 0.75);
        py = hy + (ty - hy) * k + oy * (1 - form * 0.75);
      }
      const mo = Math.abs(ox) + Math.abs(oy);
      if (mo > maxOff) maxOff = mo;
      pos[ix] = px; pos[ix + 1] = py;
    }
    this.maxOff = maxOff;
    this.points.geometry.attributes.position.needsUpdate = true;
  }
  setPixelScale(v) { this.uniforms.uPixel.value = v; }
  reset() { this.off.fill(0); this.maxOff = 0; }
  // Beat → 全体粒子向 home/形状位一记收拢（呼吸式脉冲，比 kick 温柔得多）
  kickPulse() {
    for (let i = 0; i < this.off.length; i++) this.off[i] *= 0.45;
  }
  // 点击天空：星尘从点击点四散一记（力随距离衰减，快起慢回交给弹簧）
  kick(world) {
    const R = 2.6;
    for (let i = 0; i < this.count; i++) {
      const ix = i * 3;
      const dx = this.home[ix] - world.x, dy = this.home[ix + 1] - world.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > R || d < 1e-4) continue;
      const f = this.cfg.stars.clickKick * (1 - d / R);
      this.off[ix] += (dx / d) * f;
      this.off[ix + 1] += (dy / d) * f;
    }
  }
}
