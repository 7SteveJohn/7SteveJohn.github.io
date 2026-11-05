// CymaticsField.js · 3D 拓扑谐振核心背景场 (Cosmic Cymatics Resonance Field)
// 将斐波那契球面点阵、内层微光晶格多面体、宽屏天体谐振共鸣双环与两翼流动星尘完整融入 WebGL 背景中；
// 告别中央单一孤立球体，两翼自然流淌微光星尘与轨道天体线，随指针自由视差倾角，随音乐低音与节拍实时形变。
import * as THREE from 'three';

const SPHERE_POINT_COUNT = 2800;
const RING1_COUNT = 320;
const RING2_COUNT = 440;
const FLANK_COUNT = 600;

// 柔和微光粒子精灵材质纹理
function createParticleSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.25, 'rgba(255, 255, 255, 0.85)');
  g.addColorStop(0.6, 'rgba(255, 255, 255, 0.25)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export class CymaticsField {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // 将球体居中微调，恰好作为首屏巨幕视觉引力中心
    this.group.position.set(0, 0.25, 0);

    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    this.sprite = createParticleSprite();

    // 双模式色彩基底：白天蔚蓝天青，夜晚电光极光
    this.cBlue = new THREE.Color(0x2563eb);  // 皇家钴蓝
    this.cCyan = new THREE.Color(0x06b6d4);  // 高光青蓝
    this.cSky  = new THREE.Color(0x38bdf8);  // 明朗天蓝
    this.cDark = new THREE.Color(0x0f172a);  // 矿石深灰

    // ==========================================
    // 1. 构建中央斐波那契球面点阵 (2,800 Pts)
    // ==========================================
    this.ptCount = SPHERE_POINT_COUNT;
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.ptCount * 3);
    this.basePos = new Float32Array(this.ptCount * 3);
    this.colors = new Float32Array(this.ptCount * 3);

    const radius = 2.05;
    for (let i = 0; i < this.ptCount; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / this.ptCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      this.pos[i * 3] = x;
      this.pos[i * 3 + 1] = y;
      this.pos[i * 3 + 2] = z;

      this.basePos[i * 3] = x;
      this.basePos[i * 3 + 1] = y;
      this.basePos[i * 3 + 2] = z;

      // 纬度渐变混色
      const mixRatio = (y / radius + 1) * 0.5;
      const c = this.cBlue.clone().lerp(this.cCyan, mixRatio);
      if (Math.random() > 0.8) c.lerp(this.cDark, 0.35);

      this.colors[i * 3] = c.r;
      this.colors[i * 3 + 1] = c.g;
      this.colors[i * 3 + 2] = c.b;
    }

    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.ptMat = new THREE.PointsMaterial({
      size: 0.08,
      map: this.sprite,
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.85 : 0.65,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });
    this.pointSphere = new THREE.Points(this.geo, this.ptMat);
    this.group.add(this.pointSphere);

    // ==========================================
    // 2. 内层微光二十面体线框晶格 (Geodesic Cage)
    // ==========================================
    this.cageGeo = new THREE.IcosahedronGeometry(1.35, 2);
    this.cageMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0x38bdf8 : 0x0284c7,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.30 : 0.18,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });
    this.cageMesh = new THREE.Mesh(this.cageGeo, this.cageMat);
    this.group.add(this.cageMesh);

    // ==========================================
    // 3. 节拍声学生成激波环 (Acoustic Shockwave Ring)
    // ==========================================
    this.ringGeo = new THREE.RingGeometry(0.1, 0.22, 64);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.shockRing = new THREE.Mesh(this.ringGeo, this.ringMat);
    this.shockRing.rotation.x = Math.PI * 0.5;
    this.group.add(this.shockRing);

    // ==========================================
    // 4. 双层天体谐振共鸣环 (Planetary Orbit Rings)
    //    舒展延伸向左右两侧，打破单一居中孤立感
    // ==========================================
    this.orbitGroup = new THREE.Group();
    this.group.add(this.orbitGroup);

    // 环 1: 内倾斜大环 (半径 3.85, 倾角 65°)
    const ring1Geo = new THREE.BufferGeometry();
    const ring1Pos = new Float32Array(RING1_COUNT * 3);
    const ring1Cols = new Float32Array(RING1_COUNT * 3);
    for (let i = 0; i < RING1_COUNT; i++) {
      const th = (i / RING1_COUNT) * Math.PI * 2;
      const r = 3.85 + (Math.random() - 0.5) * 0.14;
      ring1Pos[i * 3] = Math.cos(th) * r;
      ring1Pos[i * 3 + 1] = (Math.random() - 0.5) * 0.08;
      ring1Pos[i * 3 + 2] = Math.sin(th) * r;
      const c = (i % 2 === 0 ? this.cCyan : this.cSky);
      ring1Cols[i * 3] = c.r;
      ring1Cols[i * 3 + 1] = c.g;
      ring1Cols[i * 3 + 2] = c.b;
    }
    ring1Geo.setAttribute('position', new THREE.BufferAttribute(ring1Pos, 3));
    ring1Geo.setAttribute('color', new THREE.BufferAttribute(ring1Cols, 3));
    this.ring1Mat = new THREE.PointsMaterial({
      size: 0.065,
      map: this.sprite,
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.75 : 0.52,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });
    this.ring1Mesh = new THREE.Points(ring1Geo, this.ring1Mat);
    this.ring1Mesh.rotation.x = Math.PI * 0.40;
    this.ring1Mesh.rotation.z = 0.22;
    this.orbitGroup.add(this.ring1Mesh);

    // 环 2: 外宽域谐振环 (半径 5.6, 倾角 -55°)，宽幅横贯左右视口
    const ring2Geo = new THREE.BufferGeometry();
    const ring2Pos = new Float32Array(RING2_COUNT * 3);
    const ring2Cols = new Float32Array(RING2_COUNT * 3);
    for (let i = 0; i < RING2_COUNT; i++) {
      const th = (i / RING2_COUNT) * Math.PI * 2;
      const r = 5.6 + (Math.random() - 0.5) * 0.18;
      ring2Pos[i * 3] = Math.cos(th) * r;
      ring2Pos[i * 3 + 1] = (Math.random() - 0.5) * 0.12;
      ring2Pos[i * 3 + 2] = Math.sin(th) * r;
      const c = (i % 3 === 0 ? this.cBlue : this.cCyan);
      ring2Cols[i * 3] = c.r;
      ring2Cols[i * 3 + 1] = c.g;
      ring2Cols[i * 3 + 2] = c.b;
    }
    ring2Geo.setAttribute('position', new THREE.BufferAttribute(ring2Pos, 3));
    ring2Geo.setAttribute('color', new THREE.BufferAttribute(ring2Cols, 3));
    this.ring2Mat = new THREE.PointsMaterial({
      size: 0.055,
      map: this.sprite,
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.65 : 0.42,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });
    this.ring2Mesh = new THREE.Points(ring2Geo, this.ring2Mat);
    this.ring2Mesh.rotation.x = -Math.PI * 0.36;
    this.ring2Mesh.rotation.z = -0.32;
    this.orbitGroup.add(this.ring2Mesh);

    // ==========================================
    // 5. 左右两翼伴生流动星尘 (Flank Stardust Streams)
    //    自然充实屏幕左右侧边，轻柔起伏呼吸
    // ==========================================
    this.flankGeo = new THREE.BufferGeometry();
    this.flankPos = new Float32Array(FLANK_COUNT * 3);
    this.flankBasePos = new Float32Array(FLANK_COUNT * 3);
    this.flankCols = new Float32Array(FLANK_COUNT * 3);
    for (let i = 0; i < FLANK_COUNT; i++) {
      // 左右平衡分布：左翼 (x: -8.0 ~ -2.5)，右翼 (x: 2.5 ~ 8.0)
      const isLeft = i % 2 === 0;
      const x = (isLeft ? -1 : 1) * (2.4 + Math.random() * 5.6);
      const y = (Math.random() - 0.5) * 4.6;
      const z = (Math.random() - 0.5) * 3.5;
      this.flankPos[i * 3] = x;
      this.flankPos[i * 3 + 1] = y;
      this.flankPos[i * 3 + 2] = z;
      this.flankBasePos[i * 3] = x;
      this.flankBasePos[i * 3 + 1] = y;
      this.flankBasePos[i * 3 + 2] = z;

      const c = isLeft
        ? this.cSky.clone().lerp(this.cBlue, Math.random() * 0.6)
        : this.cCyan.clone().lerp(this.cBlue, Math.random() * 0.6);
      this.flankCols[i * 3] = c.r;
      this.flankCols[i * 3 + 1] = c.g;
      this.flankCols[i * 3 + 2] = c.b;
    }
    this.flankGeo.setAttribute('position', new THREE.BufferAttribute(this.flankPos, 3));
    this.flankGeo.setAttribute('color', new THREE.BufferAttribute(this.flankCols, 3));
    this.flankMat = new THREE.PointsMaterial({
      size: 0.06,
      map: this.sprite,
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.70 : 0.45,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });
    this.flankPoints = new THREE.Points(this.flankGeo, this.flankMat);
    this.group.add(this.flankPoints);

    // ==========================================
    // 6. 旋转与物理阻尼状态
    // ==========================================
    this.rotX = 0.15;
    this.rotY = -0.2;
    this.targetRotX = 0.15;
    this.targetRotY = -0.2;
    this.shockProgress = 0;
    this.kickEnergy = 0;
  }

  setRes(w, h) {
    // 宽屏 / 竖屏自适应比例
    const aspect = w / h;
    const baseScale = aspect < 1 ? 0.75 : 1.0;
    this.group.scale.set(baseScale, baseScale, baseScale);
  }

  onBeat(strength = 0.8) {
    this.shockProgress = 0.01;
    this.kickEnergy = Math.max(this.kickEnergy, strength);
  }

  kick(x, y) {
    this.shockProgress = 0.01;
    this.kickEnergy = 1.0;
  }

  update(sceneT, audio, interaction, dtMs, pulse) {
    const isDark = document.documentElement.classList.contains('dark');
    const dt = (dtMs || 16) * 0.001;

    // 0. 音频信号提取（离散鼓点 pulse + 连续低音能量 bass）
    const B = (typeof window !== 'undefined' && window.__BEAT) ? window.__BEAT : null;
    const beatPulse = Math.max(
      typeof pulse === 'number' ? pulse : 0,
      audio && audio.beatEnv ? audio.beatEnv : 0,
      B && B.level != null ? B.level : 0,
      this.kickEnergy * 0.6
    );
    const bass = (audio && audio.bass != null ? audio.bass : (B && B.lv ? B.lv : 0)) + this.kickEnergy * 0.4;
    this.kickEnergy *= 0.90;

    // 自适应明暗材质与节拍瞬态辉光
    this.ptMat.opacity = (isDark ? 0.85 : 0.65) + beatPulse * 0.15;
    this.ptMat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.cageMat.color.setHex(isDark ? 0x38bdf8 : 0x0284c7);
    this.cageMat.opacity = (isDark ? 0.30 : 0.18) + beatPulse * 0.16;
    this.cageMat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.ring1Mat.opacity = (isDark ? 0.75 : 0.52) + beatPulse * 0.14;
    this.ring1Mat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.ring2Mat.opacity = (isDark ? 0.65 : 0.42) + beatPulse * 0.12;
    this.ring2Mat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.flankMat.opacity = (isDark ? 0.70 : 0.45) + beatPulse * 0.15;
    this.flankMat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;

    // 冲击波环材质自适应（浅色模式采用深天蓝 + 正常混合，杜绝白底隐形）
    this.ringMat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.ringMat.color.setHex(isDark ? 0x38bdf8 : 0x0284c7);

    // 1. 鼠标视差微倾斜 + 平滑自转
    if (interaction && interaction.mouse) {
      this.targetRotY = interaction.mouse.x * 0.65;
      this.targetRotX = -interaction.mouse.y * 0.45;
    }

    this.rotX += (this.targetRotX - this.rotX) * 0.04;
    this.rotY += (this.targetRotY - this.rotY) * 0.04;

    const autoSpin = sceneT * 0.12;
    this.pointSphere.rotation.x = this.rotX;
    this.pointSphere.rotation.y = this.rotY + autoSpin;

    this.cageMesh.rotation.x = -this.rotX * 0.8;
    this.cageMesh.rotation.y = -(this.rotY + autoSpin * 1.3);

    // 轨道环慢速独立自转与视差微倾
    this.ring1Mesh.rotation.y = autoSpin * 0.5;
    this.ring2Mesh.rotation.y = -autoSpin * 0.4;
    this.orbitGroup.rotation.x = this.rotX * 0.6;
    this.orbitGroup.rotation.y = this.rotY * 0.6;

    // 2. 晶格随低音与重拍显著弹性脉动（动态外扩高达 +25%）
    const cageScale = 1.0 + beatPulse * 0.25 + bass * 0.10 + Math.sin(sceneT * 1.5) * 0.02;
    this.cageMesh.scale.set(cageScale, cageScale, cageScale);

    // 斐波那契点阵偏微分驻波调制 (Spherical Harmonics 声学谐振)
    const pArr = this.geo.attributes.position.array;
    const waveGain = 0.12 + beatPulse * 0.36 + bass * 0.16;
    const sphereExpand = beatPulse * 0.12 + bass * 0.06;
    for (let i = 0; i < this.ptCount; i++) {
      const bx = this.basePos[i * 3];
      const by = this.basePos[i * 3 + 1];
      const bz = this.basePos[i * 3 + 2];

      const wave = Math.sin(bx * 3.8 + sceneT * 1.6) *
                   Math.cos(by * 3.8 + sceneT * 1.2) *
                   Math.sin(bz * 3.8);

      const rGain = 1.0 + wave * waveGain + sphereExpand;
      pArr[i * 3] = bx * rGain;
      pArr[i * 3 + 1] = by * rGain;
      pArr[i * 3 + 2] = bz * rGain;
    }
    this.geo.attributes.position.needsUpdate = true;

    // 3. 伴生两翼流动星尘沿偏微分微波轻柔呼吸起伏 + 强拍向两侧爆发
    const fArr = this.flankGeo.attributes.position.array;
    for (let i = 0; i < FLANK_COUNT; i++) {
      const bx = this.flankBasePos[i * 3];
      const by = this.flankBasePos[i * 3 + 1];
      const bz = this.flankBasePos[i * 3 + 2];
      fArr[i * 3 + 1] = by + Math.sin(bx * 0.5 + sceneT * 0.8) * 0.22 + beatPulse * 0.35 + bass * 0.12;
      fArr[i * 3] = bx + Math.cos(by * 0.4 + sceneT * 0.5) * 0.08 + Math.sign(bx) * beatPulse * 0.15;
    }
    this.flankGeo.attributes.position.needsUpdate = true;

    // 4. 强拍自动激发声学激波环
    if (beatPulse > 0.38 && this.shockProgress === 0) {
      this.shockProgress = 0.01;
    }

    // 冲击波扩散环动画
    if (this.shockProgress > 0) {
      this.shockProgress += dt * 1.3;
      const s = this.shockProgress * 3.6;
      this.shockRing.scale.set(s, s, s);
      const fade = Math.max(0, 1.0 - this.shockProgress / 1.5);
      this.ringMat.opacity = fade * (isDark ? 0.75 : 0.55);
      if (this.shockProgress >= 1.5) {
        this.shockProgress = 0;
        this.ringMat.opacity = 0;
      }
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.geo.dispose();
    this.ptMat.dispose();
    this.cageGeo.dispose();
    this.cageMat.dispose();
    this.ringGeo.dispose();
    this.ringMat.dispose();
    if (this.ring1Mesh) {
      this.ring1Mesh.geometry.dispose();
      this.ring1Mat.dispose();
    }
    if (this.ring2Mesh) {
      this.ring2Mesh.geometry.dispose();
      this.ring2Mat.dispose();
    }
    if (this.flankPoints) {
      this.flankGeo.dispose();
      this.flankMat.dispose();
    }
    if (this.sprite) this.sprite.dispose();
  }
}
