// NeuralField · 本地推理场（nodes / edges / pulses）
// 构成：若干层「神经元」（越深越小越暗）→ 邻层连边 → 沿边从深层往浅层传播的推理脉冲。
// 静默时也在跑（脉冲常驻 + 节点闪烁 + 整场缓慢摆动），安静但不静止。
// 音频：Bass→连边底亮、Mid→脉冲速度、Treble→少数节点提亮、Beat→一次完整前传波。
import * as THREE from 'three';

const NODE_VERT = /* glsl */`
  attribute float aSize, aPhase, aSpeed, aTreble, aDepth;
  uniform float uTime, uTreble, uPixel, uGlow, uWave, uWavePos;
  uniform vec3 uCursor;
  varying float vTw;
  varying float vD;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.62 + 0.38 * sin(uTime * aSpeed + aPhase);   // 各节点独立闪烁，禁止同步
    tw += uTreble * 0.7 * aTreble;                            // 高频只碰少数节点
    float d = distance(position.xy, uCursor.xy);
    tw += uGlow * smoothstep(1.6, 0.25, d);
    // 前传波：激活沿着层依次点亮（aDepth 0=输入层 → 1=输出层）
    float w = smoothstep(0.22, 0.0, abs(aDepth - uWavePos));
    tw += uWave * w * 0.9;
    vTw = tw;
    vD = aDepth;
    // 透视衰减做压缩（不是标准 1/z）：远层节点也得有 2~3px，否则整层缩成看不见的针尖
    float persp = 9.0 / (2.2 + 0.42 * max(0.5, -mv.z));
    gl_PointSize = aSize * uPixel * persp;
    gl_Position = projectionMatrix * mv;
  }
`;
const NODE_FRAG = /* glsl */`
  uniform sampler2D uSprite;
  varying float vTw;
  varying float vD;
  void main() {
    vec4 s = texture2D(uSprite, gl_PointCoord);
    // 远层暗、近层亮：同一片投影区里也要读得出前后
    float depthGain = mix(0.45, 1.0, vD);
    gl_FragColor = vec4(vec3(0.62, 0.84, 1.0) * s.rgb, s.a) * vTw * depthGain;
  }
`;
const PULSE_VERT = /* glsl */`
  attribute float aSize;
  uniform float uPixel;
  varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vA = 1.0;
    float persp = 9.0 / (2.2 + 0.42 * max(0.5, -mv.z));
    gl_PointSize = aSize * uPixel * persp;
    gl_Position = projectionMatrix * mv;
  }
`;
const PULSE_FRAG = /* glsl */`
  uniform sampler2D uSprite;
  uniform float uBass;
  varying float vA;
  void main() {
    vec4 s = texture2D(uSprite, gl_PointCoord);
    vec3 c = mix(vec3(0.45, 0.95, 1.0), vec3(0.85, 1.0, 0.95), uBass);
    gl_FragColor = vec4(c * s.rgb, s.a) * vA * (1.2 + uBass * 0.8);
  }
`;

function softSprite(hard = 0.3) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(hard, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class NeuralField {
  constructor(scene, cfg, isMobile, aspect) {
    this.cfg = cfg;
    this.isMobile = isMobile;
    this.aspect = aspect;
    this.group = new THREE.Group();
    scene.add(this.group);

    this._buildNodes();
    this._buildEdges();
    this._buildPulses();
    this._buildAmbient();

    this.wave = 0;          // 前传波强度（Beat 触发，逐层推进）
    this.wavePos = -0.3;    // 波前所在层（归一化 0..1，起点在输入层之前）
    this.heatMax = 0;       // 探针：当前最热的边
    this.pulseCount = this.pulses.length;
  }

  /* ---------- 节点：分层抖动网格，越深越小越暗 ---------- */
  _buildNodes() {
    const F = this.cfg.field;
    const L = F.layers;
    const total = this.isMobile ? F.nodesMobile : F.nodesDesktop;
    const per = Math.max(6, Math.round(total / L));
    const n = per * L;
    this.count = n;
    this.layerOf = new Uint8Array(n);
    this.depthOf = new Float32Array(n);
    this.home = new Float32Array(n * 3);
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const phase = new Float32Array(n);
    const speed = new Float32Array(n);
    const treb = new Float32Array(n);
    const depth = new Float32Array(n);
    this.spreadX = new Float32Array(L);
    this.spreadY = new Float32Array(L);
    this.zOfLayer = new Float32Array(L);
    this.fracOf = new Float32Array(L);

    const tanH = Math.tan(THREE.MathUtils.degToRad(this.cfg.camera.fov / 2));
    let idx = 0;
    for (let li = 0; li < L; li++) {
      const f = L > 1 ? li / (L - 1) : 0;
      const z = THREE.MathUtils.lerp(F.zFar, F.zNear, f);
      const dist = this.cfg.camera.zPos - z;
      const halfH = dist * tanH;
      // 每层占屏幕的比例：输入层小、输出层大 → 层层向内收，读得出纵深
      const frac = THREE.MathUtils.lerp(F.spreadFar, F.spreadNear, f);
      this.fracOf[li] = frac;
      const sx = halfH * this.aspect * frac;
      const sy = halfH * frac;
      this.zOfLayer[li] = z;
      this.spreadX[li] = sx;
      this.spreadY[li] = sy;

      // 抖动网格：cols×rows 尽量铺满该层矩形，比随机散点更像"一层神经元"
      const cols = Math.max(3, Math.round(Math.sqrt(per * this.aspect)));
      const rows = Math.max(3, Math.ceil(per / cols));
      const cell = Math.min((sx * 2) / cols, (sy * 2) / rows);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (idx >= n) break;
          const jx = (Math.random() - 0.5) * cell * F.jitter;
          const jy = (Math.random() - 0.5) * cell * F.jitter;
          const x = (-sx + (c + 0.5) * (sx * 2 / cols)) + jx;
          const y = (-sy + (r + 0.5) * (sy * 2 / rows)) + jy;
          this.home[idx * 3] = x; this.home[idx * 3 + 1] = y; this.home[idx * 3 + 2] = z;
          pos[idx * 3] = x; pos[idx * 3 + 1] = y; pos[idx * 3 + 2] = z;
          // 近层节点大、远层小（透视之外的额外深度线索）
          const dScale = THREE.MathUtils.lerp(0.75, 1.15, f);
          size[idx] = F.nodeSize * dScale * (0.75 + Math.random() * 0.5);
          phase[idx] = Math.random() * Math.PI * 2;
          speed[idx] = 0.5 + Math.random() * 1.8;
          treb[idx] = Math.random() < F.twinkleRatio ? 1 : 0;
          depth[idx] = f;
          this.layerOf[idx] = li;
          this.depthOf[idx] = f;
          idx++;
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    geo.setAttribute('aTreble', new THREE.BufferAttribute(treb, 1));
    geo.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));
    this.nodeUniforms = {
      uTime: { value: 0 }, uTreble: { value: 0 }, uPixel: { value: 1.3 },
      uGlow: { value: 0 }, uWave: { value: 0 }, uWavePos: { value: -0.3 },
      uCursor: { value: new THREE.Vector3(1e9, 1e9, 0) },
      uSprite: { value: softSprite(0.32) }
    };
    this.nodes = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.nodeUniforms, vertexShader: NODE_VERT, fragmentShader: NODE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    this.nodes.renderOrder = 3;
    this.group.add(this.nodes);
  }

  /* ---------- 连边：每个节点连下一层最近的 k 个（归一化空间比较，消除透视偏置） ---------- */
  _buildEdges() {
    const F = this.cfg.field;
    const n = this.count;
    const pairs = [];
    const out = Array.from({ length: n }, () => []);
    for (let li = 0; li < F.layers - 1; li++) {
      const A = [], B = [];
      for (let i = 0; i < n; i++) {
        if (this.layerOf[i] === li) A.push(i);
        else if (this.layerOf[i] === li + 1) B.push(i);
      }
      const sax = this.spreadX[li], say = this.spreadY[li];
      const sbx = this.spreadX[li + 1], sby = this.spreadY[li + 1];
      for (const a of A) {
        const ua = this.home[a * 3] / sax, va = this.home[a * 3 + 1] / say;
        const cand = [];
        for (const b of B) {
          const ub = this.home[b * 3] / sbx, vb = this.home[b * 3 + 1] / sby;
          const d = Math.hypot(ua - ub, va - vb);
          if (d < F.linkRadiusNorm) cand.push([d, b]);
        }
        cand.sort((p, q) => p[0] - q[0]);
        for (let k = 0; k < Math.min(F.linksPerNode, cand.length); k++) {
          const e = pairs.length;
          pairs.push([a, cand[k][1]]);
          out[a].push(e);
        }
      }
    }
    this.edges = pairs;
    this.outEdges = out;
    this.edgeCount = pairs.length;
    this.heat = new Float32Array(this.edgeCount);
    const epos = new Float32Array(this.edgeCount * 6);
    const ecol = new Float32Array(this.edgeCount * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(epos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(ecol, 3).setUsage(THREE.DynamicDrawUsage));
    this.edgeMesh = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    this.edgeMesh.renderOrder = 2;
    this.group.add(this.edgeMesh);
    // 输入层边（脉冲出发点）单独索引
    this.inputEdges = [];
    for (let e = 0; e < this.edgeCount; e++) if (this.layerOf[pairs[e][0]] === 0) this.inputEdges.push(e);
    if (!this.inputEdges.length) this.inputEdges = this.edges.map((_, i) => i);
  }

  /* ---------- 脉冲：沿边前进，到端点后接力到下一层的边，走到底再从输入层重发 ---------- */
  _buildPulses() {
    const P = this.cfg.pulses;
    const n = this.isMobile ? P.countMobile : P.count;
    this.pulses = [];
    for (let i = 0; i < n; i++) {
      this.pulses.push({ edge: this._randInputEdge(), t: Math.random(), speed: 0.7 + Math.random() * 0.6 });
    }
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n).fill(P.size);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    this.pulseUniforms = {
      uPixel: { value: 1.3 }, uBass: { value: 0 }, uSprite: { value: softSprite(0.24) }
    };
    this.pulseMesh = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.pulseUniforms, vertexShader: PULSE_VERT, fragmentShader: PULSE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    this.pulseMesh.renderOrder = 4;
    this.group.add(this.pulseMesh);
  }

  _randInputEdge() {
    return this.inputEdges[(Math.random() * this.inputEdges.length) | 0];
  }

  /* ---------- 环境辉光：几块极暗的加色面，免得纯黑发死 ---------- */
  _buildAmbient() {
    const A = this.cfg.ambient;
    const tex = softSprite(0.05);
    this.glows = [];
    for (let i = 0; i < A.count; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: tex, transparent: true, opacity: A.opacity,
          blending: THREE.AdditiveBlending, depthWrite: false
        })
      );
      const sc = 16 + i * 6;
      m.scale.set(sc, sc * 0.55, 1);
      m.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 4, this.cfg.field.zFar - 1 - i);
      m.renderOrder = 1;
      m.material.color.setHex(i % 2 ? 0x0b3a4a : 0x11306b);
      this.group.add(m);
      this.glows.push({ mesh: m, px: m.position.x, py: m.position.y, sp: 0.05 + Math.random() * 0.08 });
    }
  }

  fitAspect(aspect) {
    // 视口比例变了就重排节点横向铺展（resize 时调，避免椭圆被拉扁）
    const F = this.cfg.field;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.cfg.camera.fov / 2));
    this.aspect = aspect;
    const home = this.home, pos = this.nodes.geometry.attributes.position.array;
    for (let li = 0; li < F.layers; li++) {
      const dist = this.cfg.camera.zPos - this.zOfLayer[li];
      const sx = dist * tanH * aspect * this.fracOf[li];
      const k = sx / Math.max(1e-6, this.spreadX[li]);
      this.spreadX[li] = sx;
      for (let i = 0; i < this.count; i++) {
        if (this.layerOf[i] !== li) continue;
        home[i * 3] *= k;
        pos[i * 3] = home[i * 3];
      }
    }
    this.nodes.geometry.attributes.position.needsUpdate = true;
  }

  setPixelScale(v) {
    this.nodeUniforms.uPixel.value = v;
    this.pulseUniforms.uPixel.value = v;
  }

  /* ---------- 每帧更新 ---------- */
  update(t, audio, mouseWorld, hasMouse, dtMs = 16.7) {
    const F = this.cfg.field, E = this.cfg.edges, P = this.cfg.pulses;
    const dt = Math.min(dtMs, 100) / 1000;
    const bass = audio.bass || 0, mid = audio.mid || 0, treble = audio.treble || 0;
    this._bass = bass; this._mid = mid; this._treble = treble;

    this.nodeUniforms.uTime.value = t;
    this.nodeUniforms.uTreble.value = treble * this.cfg.audio.trebleToStars;
    this.nodeUniforms.uGlow.value = hasMouse ? F.cursorGlow : 0;
    if (hasMouse) this.nodeUniforms.uCursor.value.copy(mouseWorld);
    else this.nodeUniforms.uCursor.value.set(1e9, 1e9, 0);

    // 前传波：Beat 触发后波前从输入层扫到输出层
    if (this.wave > 0.0005) {
      this.wavePos += dt * this.cfg.pulses.waveSpeed;
      if (this.wavePos > 1.35) { this.wave = 0; this.wavePos = -0.3; }
      else this.wave *= Math.exp(-dt * 1.1);
    }
    this.nodeUniforms.uWave.value = this.wave;
    this.nodeUniforms.uWavePos.value = this.wavePos;

    // 节点微漂（静默态也在动）
    const pos = this.nodes.geometry.attributes.position.array;
    const home = this.home;
    for (let i = 0; i < this.count; i++) {
      const ix = i * 3;
      const ph = i * 0.7;
      pos[ix] = home[ix] + Math.sin(t * 0.35 + ph) * F.drift;
      pos[ix + 1] = home[ix + 1] + Math.cos(t * 0.29 + ph * 1.3) * F.drift;
    }
    this.nodes.geometry.attributes.position.needsUpdate = true;

    // 脉冲推进
    const ppos = this.pulseMesh.geometry.attributes.position.array;
    const speedK = P.speed * (1 + mid * P.midGain);
    let heatMax = 0;
    for (let i = 0; i < this.pulses.length; i++) {
      const p = this.pulses[i];
      p.t += dt * speedK * p.speed;
      if (p.t >= 1) {
        const [a, b] = this.edges[p.edge];
        const nxt = this.outEdges[b];
        p.t = 0;
        p.edge = nxt && nxt.length ? nxt[(Math.random() * nxt.length) | 0] : this._randInputEdge();
      }
      const [a, b] = this.edges[p.edge];
      const ix = i * 3;
      ppos[ix] = pos[a * 3] + (pos[b * 3] - pos[a * 3]) * p.t;
      ppos[ix + 1] = pos[a * 3 + 1] + (pos[b * 3 + 1] - pos[a * 3 + 1]) * p.t;
      ppos[ix + 2] = pos[a * 3 + 2] + (pos[b * 3 + 2] - pos[a * 3 + 2]) * p.t;
      this.heat[p.edge] = 1;
    }
    this.pulseMesh.geometry.attributes.position.needsUpdate = true;
    this.pulseUniforms.uBass.value = bass;

    // 连边：底亮 + 脉冲余温 + 光标邻近；颜色承载亮度（加法混合）
    const epos = this.edgeMesh.geometry.attributes.position.array;
    const ecol = this.edgeMesh.geometry.attributes.color.array;
    const decay = Math.exp(-dt / Math.max(0.016, E.heatTau));
    const mx = hasMouse ? mouseWorld.x : 1e9, my = hasMouse ? mouseWorld.y : 1e9;
    const base = E.base * (1 + bass * E.bassGain);
    for (let e = 0; e < this.edgeCount; e++) {
      const [a, b] = this.edges[e];
      const o = e * 6;
      const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
      const bx = pos[b * 3], by = pos[b * 3 + 1], bz = pos[b * 3 + 2];
      epos[o] = ax; epos[o + 1] = ay; epos[o + 2] = az;
      epos[o + 3] = bx; epos[o + 4] = by; epos[o + 5] = bz;
      let h = this.heat[e] = this.heat[e] * decay;
      if (h > heatMax) heatMax = h;
      const cxp = (ax + bx) * 0.5, cyp = (ay + by) * 0.5;
      const dc = Math.hypot(cxp - mx, cyp - my);
      const cur = hasMouse ? E.cursorGain * Math.max(0, 1 - dc / F.cursorRadius) : 0;
      const lum = base + h * E.heatGain + cur;
      // 远层偏冷蓝、近层偏青白，深度上做区分
      const f = this.depthOf[a];
      const r = lum * (0.35 + 0.35 * f), g2 = lum * (0.7 + 0.25 * f), bl = lum;
      ecol[o] = r; ecol[o + 1] = g2; ecol[o + 2] = bl;
      ecol[o + 3] = r; ecol[o + 4] = g2; ecol[o + 5] = bl;
    }
    this.heatMax = heatMax;
    this.edgeMesh.geometry.attributes.position.needsUpdate = true;
    this.edgeMesh.geometry.attributes.color.needsUpdate = true;

    // 环境辉光缓慢漂移 + 随低频呼吸
    for (const g of this.glows) {
      g.mesh.position.x = g.px + Math.sin(t * g.sp) * 1.6;
      g.mesh.position.y = g.py + Math.cos(t * g.sp * 0.8) * 0.8;
      g.mesh.material.opacity = this.cfg.ambient.opacity * (0.7 + bass * 0.6);
    }

    // 整场极缓慢摆动：静默时也有"活着"的位移
    this.group.rotation.y = Math.sin(t * 0.06) * 0.06;
    this.group.rotation.x = Math.sin(t * 0.045 + 1.2) * 0.03;
  }

  /* Beat → 一次完整前传：从输入层放一批脉冲 + 逐层点亮 */
  kickPulse() {
    this.wave = 1;
    this.wavePos = -0.1;
    const burst = Math.min(this.cfg.pulses.beatBurst, this.pulses.length);
    for (let i = 0; i < burst; i++) {
      const p = this.pulses[(Math.random() * this.pulses.length) | 0];
      p.edge = this._randInputEdge();
      p.t = 0;
    }
  }

  /* 点击 → 从最近的节点放一记脉冲（局部"推理被触发"） */
  kick(world) {
    let best = -1, bd = Infinity;
    const pos = this.nodes.geometry.attributes.position.array;
    for (let i = 0; i < this.count; i++) {
      const d = Math.hypot(pos[i * 3] - world.x, pos[i * 3 + 1] - world.y);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) return;
    const outs = this.outEdges[best];
    const src = outs && outs.length ? outs : this.inputEdges;
    const burst = Math.min(this.cfg.field.clickBurst, this.pulses.length);
    for (let i = 0; i < burst; i++) {
      const p = this.pulses[(Math.random() * this.pulses.length) | 0];
      p.edge = src[(Math.random() * src.length) | 0];
      p.t = 0;
    }
  }

  reset() {
    this.wave = 0; this.wavePos = -0.3;
    this.heat.fill(0);
    for (const p of this.pulses) { p.edge = this._randInputEdge(); p.t = Math.random(); }
  }

  info() {
    const E = this.cfg.edges;
    let young = 0;
    for (const p of this.pulses) if (p.t < 0.15) young++;
    return {
      nodes: this.count,
      edges: this.edgeCount,
      pulses: this.pulses.length,
      wave: +this.wave.toFixed(4),
      wavePos: +this.wavePos.toFixed(4),
      heatMax: +this.heatMax.toFixed(4),
      pulseT: +this.pulses[0].t.toFixed(4),
      young,                                     // 刚从起点发出的脉冲数（点击/Beat 后跳升）
      edgeLum: +(E.base * (1 + (this._bass || 0) * E.bassGain)).toFixed(4),
      trebleU: +this.nodeUniforms.uTreble.value.toFixed(4),
      glowU: +this.nodeUniforms.uGlow.value.toFixed(3)
    };
  }
}
