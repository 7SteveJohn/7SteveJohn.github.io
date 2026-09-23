/* ============================================================
   全站 3D 舞台（js/gl-stage.js）
   ------------------------------------------------------------
   仿 igloo.inc 的做法：一块固定全屏的 WebGL 画布躺在所有内容之下，
   往下滚时镜头在场景里移动，每一段内容对应一件"由碎片凝聚成形、
   散场时再崩解回粒子"的真 3D 实体（晶体核心 / 显卡 / 卡车 / 机柜）。

   要点
   · InstancedMesh + 逐实例目标位姿：每件实体由几百块小钢板组成。
     凝聚 = 从云团位置飞向目标位姿（错峰启程、飞行中翻滚、弧线鼓包），
     崩解 = 反向。位姿在 CPU 上算（几百个实例，代价可忽略），换来的是
     完全自由的飞行手感，以及"被撞散再吸回"的交互。
   · 深色雾 + 程序化环境贴图（画一张 equirect 画布 → PMREM），金属因此
     有真实的高光走向，而不是贴一张假渐变。
   · 镜头时间线由 DOM 分区驱动（取每段的 offsetTop/height），改内容不用
     重对时间轴。
   · 降级：无 WebGL / 减少动效（可用 ?gl=1 强制） / 上下文丢失 → 保留静态封面。
     fps 看门狗：先降 DPR，再降实例密度。
   ============================================================ */
import * as THREE from '../assets/vendor/three.module.min.js';

const HOST = document.getElementById('gl-stage');
if (HOST) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const force = new URLSearchParams(location.search).has('gl');
  if (!reduce.matches || force) boot();

  function boot() {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (err) {
      HOST.classList.add('no-gl');
      return;
    }
    const canvas = renderer.domElement;
    HOST.appendChild(canvas);

    /* ---------- 档位 ---------- */
    const small = Math.min(window.innerWidth, window.innerHeight) < 760;
    let DPR = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.6);
    let COUNT = small ? 0.45 : 1;
    const clock = new THREE.Clock();

    renderer.setPixelRatio(DPR);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070c);
    scene.fog = new THREE.FogExp2(0x05070c, 0.055);

    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0.6, 8.2);

    /* ---------- 程序化环境贴图 ---------- */
    (function () {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 256;
      const g = c.getContext('2d');
      const sky = g.createLinearGradient(0, 0, 0, 256);
      sky.addColorStop(0.00, '#0a1020');
      sky.addColorStop(0.42, '#1a2946');
      sky.addColorStop(0.53, '#24395c');
      sky.addColorStop(1.00, '#05070c');
      g.fillStyle = sky; g.fillRect(0, 0, 512, 256);
      // 两道条光：金属上会拉出两道高光，是"摄影棚感"的来源
      for (const s of [[120, 26, 0.95], [332, 14, 0.7]]) {
        const x = s[0], w = s[1], a = s[2];
        const lg = g.createLinearGradient(x - w, 0, x + w, 0);
        lg.addColorStop(0, 'rgba(190,215,255,0)');
        lg.addColorStop(0.5, 'rgba(215,232,255,' + a + ')');
        lg.addColorStop(1, 'rgba(190,215,255,0)');
        g.fillStyle = lg; g.fillRect(x - w, 40, w * 2, 150);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromEquirectangular(tex).texture;
      tex.dispose(); pmrem.dispose();
    })();

    /* ---------- 灯 ---------- */
    scene.add(new THREE.HemisphereLight(0x8ba3cc, 0x0a0f18, 0.7));
    const key = new THREE.DirectionalLight(0xf2f7ff, 3.0); key.position.set(5, 8, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0x9cc6ff, 2.0); rim.position.set(-7, 2.5, -5); scene.add(rim);
    const back = new THREE.PointLight(0x4d8dff, 26, 26, 2); back.position.set(0, 0.4, -3.4); scene.add(back);

    /* ---------- 地台 ---------- */
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(70, 64),
      new THREE.MeshStandardMaterial({ color: 0x0e1520, metalness: 0.92, roughness: 0.36, envMapIntensity: 1.1 })
    );
    ground.rotation.x = -Math.PI / 2; ground.position.y = -3.1; scene.add(ground);
    (function () {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d');
      const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      rg.addColorStop(0, 'rgba(150,195,255,0.78)');
      rg.addColorStop(0.42, 'rgba(90,135,215,0.22)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(36, 36),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      m.rotation.x = -Math.PI / 2; m.position.y = -3.06; m.renderOrder = -1; scene.add(m);
    })();

    /* ---------- 材质 ---------- */
    const steel = new THREE.MeshStandardMaterial({ color: 0xc3cede, metalness: 0.98, roughness: 0.16, envMapIntensity: 1.7 });
    const darkM = new THREE.MeshStandardMaterial({ color: 0x3d4553, metalness: 0.9, roughness: 0.38, envMapIntensity: 1.1 });
    const hotM = new THREE.MeshStandardMaterial({ color: 0x11293c, metalness: 0.6, roughness: 0.3, emissive: 0x46b6ff, emissiveIntensity: 3.4 });

    /* ============================================================
       形状：把外形描述成一批小钢板的目标位姿
       ============================================================ */
    const rnd = (a, b) => a + Math.random() * (b - a);

    // 在盒体 hx/hy/hz 内撒 n 片，w 越大越贴棱（轮廓才立得住）
    function fillBox(list, cx, cy, cz, hx, hy, hz, n, opt) {
      opt = opt || {};
      const w = opt.w === undefined ? 0.55 : opt.w;
      const k = opt.k || 1;
      for (let i = 0; i < n; i++) {
        let x = rnd(-1, 1), y = rnd(-1, 1), z = rnd(-1, 1);
        if (Math.random() < w) {
          const f = (Math.random() * 3) | 0;
          if (f === 0) x = Math.random() < 0.5 ? -1 : 1;
          else if (f === 1) y = Math.random() < 0.5 ? -1 : 1;
          else z = Math.random() < 0.5 ? -1 : 1;
        }
        const vf = 0.75 + Math.random() * 1.5;     // 参差：大板与小屑混着来
        list.push({
          p: [cx + x * hx, cy + y * hy, cz + z * hz],
          s: [rnd(0.11, 0.22) * k * vf, rnd(0.05, 0.11) * k, rnd(0.03, 0.07) * k],
          r: [rnd(-0.3, 0.3), rnd(-0.5, 0.5), rnd(-0.25, 0.25)],
          heavy: !!(opt.heavy && Math.random() < opt.heavy),
          hot: false
        });
      }
    }

    /* 首屏：晶体核心 —— 球壳碎片 + 内部发光八面体 */
    function buildCore() {
      const parts = [], n = 430;
      const ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const y = 1 - (i / n) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), th = ga * i;
        const R = 1.42 * (0.93 + Math.random() * 0.14);
        parts.push({
          p: [Math.cos(th) * r * R, y * R * 0.94, Math.sin(th) * r * R],
          s: [rnd(0.34, 0.62), rnd(0.09, 0.18), rnd(0.14, 0.30)],
          r: [rnd(-0.4, 0.4), th, rnd(-0.35, 0.35)],
          heavy: false,
          hot: Math.random() < 0.1
        });
      }
      return { parts: parts, inner: true };
    }

    /* Fluxion：显卡 —— 散热罩 + 双风扇环 + 热管 + 背板 + 金手指 */
    function buildGpu() {
      const parts = [], n = 560;
      const HX = 1.35, HY = 0.66, HZ = 0.14;
      fillBox(parts, 0, 0, 0, HX, HY, HZ, Math.round(n * 0.28), { w: 0.85, k: 1.9 });
      fillBox(parts, 0, 0, -0.10, HX * 0.98, HY * 0.95, 0.03, Math.round(n * 0.2), { w: 0.95, k: 1.5, heavy: 0.9 });
      for (const sx of [-0.62, 0.62]) {
        const R = 0.44, seg = 20;
        for (let i = 0; i < seg; i++) {
          const a = (i / seg) * Math.PI * 2;
          parts.push({ p: [sx + Math.cos(a) * R, Math.sin(a) * R, HZ + 0.05], s: [0.26, 0.08, 0.07], r: [0, a, rnd(-0.2, 0.2)], heavy: false, hot: i % 5 === 0 });
        }
        for (let i = 0; i < 5; i++) parts.push({ p: [sx + rnd(-0.05, 0.05), rnd(-0.05, 0.05), HZ + 0.05], s: [0.1, 0.1, 0.06], r: [0, 0, 0], heavy: false, hot: true });
      }
      for (let i = 0; i < 14; i++) parts.push({ p: [rnd(-HX, HX), HY + 0.08, rnd(-HZ, HZ)], s: [0.34, 0.07, 0.08], r: [0, 0, 0], heavy: false, hot: false });
      for (let i = 0; i < 10; i++) parts.push({ p: [rnd(-0.42, 0.42), -HY - 0.06, 0.04], s: [0.1, 0.06, 0.05], r: [0, 0, 0], heavy: true, hot: false });
      return { parts: parts };
    }

    /* FileButler：厢式货车 —— 车厢 + 驾驶室 + 四轮 + 大梁 */
    function buildTruck() {
      const parts = [], n = 520;
      fillBox(parts, -0.42, 0.44, 0, 0.95, 0.52, 0.52, Math.round(n * 0.38), { w: 0.9, k: 1.6 });
      fillBox(parts, 0.72, 0.24, 0, 0.34, 0.36, 0.46, Math.round(n * 0.18), { w: 0.9, k: 1.6 });
      fillBox(parts, 0, -0.34, 0, 1.32, 0.06, 0.34, Math.round(n * 0.14), { w: 0.6, heavy: 0.9 });
      for (const wx of [-0.72, 0.62]) for (const wz of [-0.58, 0.58]) {
        const R = 0.32, seg = 14;
        for (let i = 0; i < seg; i++) {
          const a = (i / seg) * Math.PI * 2;
          parts.push({ p: [wx + Math.cos(a) * R, -0.68 + Math.sin(a) * R, wz], s: [0.19, 0.13, 0.13], r: [0, a, 0], heavy: false, hot: i === 0 });
        }
      }
      return { parts: parts };
    }

    /* NetOps：服务器机柜 —— 四柱 + 六层机架单元 + 背板走线 */
    function buildRack() {
      const parts = [], n = 500;
      const HX = 0.62, HY = 1.5, HZ = 0.40, UNIT = 6;
      for (const sx of [-HX, HX]) for (const sz of [-HZ, HZ]) {
        for (let i = 0; i < 9; i++) {
          parts.push({ p: [sx, -HY + (i / 8) * HY * 2, sz], s: [0.19, 0.22, 0.19], r: [0, 0, 0], heavy: true, hot: false });
        }
      }
      for (let u = 0; u < UNIT; u++) {
        const yc = HY - (u + 0.5) * (HY * 2 / UNIT);
        fillBox(parts, 0, yc, HZ * 0.55, HX * 0.92, 0.055, 0.06, 22, { w: 0.9, k: 1.5 });
        for (let i = 0; i < 5; i++) {
          parts.push({ p: [rnd(-HX * 0.8, HX * 0.8), yc, HZ * 0.66], s: [0.05, 0.03, 0.03], r: [0, 0, 0], heavy: false, hot: true });
        }
      }
      fillBox(parts, 0, 0, -HZ * 0.85, HX * 0.85, HY * 0.92, 0.03, Math.round(n * 0.12), { w: 0.8, k: 0.7, heavy: 0.8 });
      return { parts: parts };
    }

    /* ============================================================
       通用临时量
       ============================================================ */
    const _m4 = new THREE.Matrix4();
    const _vp = new THREE.Vector3(), _vs = new THREE.Vector3();
    const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion();
    const AXIS = [
      new THREE.Vector3(1, 0.3, 0.2).normalize(),
      new THREE.Vector3(0.2, 1, 0.4).normalize(),
      new THREE.Vector3(0.4, 0.2, 1).normalize()
    ];
    const BOX = new THREE.BoxGeometry(1, 1, 1);
    const easeInOut = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    const ZERO = new THREE.Vector3(0, 0, 0);

    /* ============================================================
       Assemblage：一件"碎片实体"
       ============================================================ */
    class Assemblage {
      constructor(name, build, opt) {
        opt = opt || {};
        const parts = build().parts;
        const n = this.n = parts.length;
        this.name = name;
        this.parts = parts;

        // 三类材质各一个 InstancedMesh，slot 表一次算好（避免每帧 indexOf）
        this.mesh = {};
        this.slot = new Uint8Array(n);            // 0 钢 / 1 深色 / 2 发光
        const mk = (mat, cnt) => {
          if (!cnt) return null;
          const m = new THREE.InstancedMesh(BOX, mat, cnt);
          m.frustumCulled = false;
          m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          m.visible = false;
          scene.add(m);
          return m;
        };
        let c0 = 0, c1 = 0, c2 = 0;
        for (let i = 0; i < n; i++) {
          const p = parts[i];
          if (p.hot) { this.slot[i] = 2; c2++; }
          else if (p.heavy) { this.slot[i] = 1; c1++; }
          else { this.slot[i] = 0; c0++; }
        }
        this.mesh[0] = mk(steel, c0);
        this.mesh[1] = mk(darkM, c1);
        this.mesh[2] = mk(hotM, c2);
        this.n0 = this.n1 = this.n2 = 0;

        const f = () => new Float32Array(n * 3);
        this.tgt = f(); this.off = f(); this.offV = f(); this.cloud = f(); this.sc = f();
        this.spin = new Float32Array(n);
        this.delay = new Float32Array(n);
        this.q = new Float32Array(n * 4);
        this.park = new THREE.Vector3(opt.park[0], opt.park[1], opt.park[2]);
        this.center = this.park.clone();
        this.morph = 0; this.target = 0; this.lastMp = -1; this.busy = false;

        const cloudR = opt.cloudR || 9;
        const q = new THREE.Quaternion(), eu = new THREE.Euler();
        for (let i = 0; i < n; i++) {
          const p = parts[i], i3 = i * 3, i4 = i * 4;
          this.tgt[i3] = p.p[0]; this.tgt[i3 + 1] = p.p[1]; this.tgt[i3 + 2] = p.p[2];
          this.sc[i3] = p.s[0]; this.sc[i3 + 1] = p.s[1]; this.sc[i3 + 2] = p.s[2];
          const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1), rr = cloudR * (0.22 + Math.random() * 0.78);
          this.cloud[i3] = Math.sin(ph) * Math.cos(th) * rr;
          this.cloud[i3 + 1] = Math.cos(ph) * rr * 0.8;
          this.cloud[i3 + 2] = Math.sin(ph) * Math.sin(th) * rr;
          this.spin[i] = rnd(0.4, 1.5) * (Math.random() < 0.5 ? -1 : 1);
          this.delay[i] = Math.random();
          eu.set(p.r[0], p.r[1], p.r[2]); q.setFromEuler(eu);
          this.q[i4] = q.x; this.q[i4 + 1] = q.y; this.q[i4 + 2] = q.z; this.q[i4 + 3] = q.w;
        }
      }

      /* 把 morph / 云团位移 / 被撞散的偏移推成实例矩阵 */
      update(t) {
        const mp = this.morph, n = this.n;
        const parked = this.center.distanceToSquared(this.park) < 0.02;
        const visible = mp > 0.002 || !parked;
        for (let g = 0; g < 3; g++) if (this.mesh[g]) this.mesh[g].visible = visible;
        if (!visible) return;
        if (mp === this.lastMp && !this.busy && parked) return;   // 静置时省掉整轮重算
        this.lastMp = mp;

        const cx = this.center.x, cy = this.center.y, cz = this.center.z;
        this.n0 = this.n1 = this.n2 = 0;
        for (let i = 0; i < n; i++) {
          const i3 = i * 3, i4 = i * 4;
          const d = this.delay[i] * 0.6;
          let k = (mp - d) / 0.4;
          k = k < 0 ? 0 : k > 1 ? 1 : k;
          const e = easeInOut(k);
          const bel = 4 * k * (1 - k);                 // 0→1→0：飞行中段才鼓
          const arc = this.spin[i] * bel * 0.55;

          const x = (this.cloud[i3] + cx) * (1 - e) + this.tgt[i3] * e + this.off[i3] + arc;
          const y = (this.cloud[i3 + 1] + cy) * (1 - e) + this.tgt[i3 + 1] * e + this.off[i3 + 1] + Math.sin(t * 0.9 + i) * bel * 0.22;
          const z = (this.cloud[i3 + 2] + cz) * (1 - e) + this.tgt[i3 + 2] * e + this.off[i3 + 2] + arc * 0.6;

          _qa.set(this.q[i4], this.q[i4 + 1], this.q[i4 + 2], this.q[i4 + 3]);
          _qb.setFromAxisAngle(AXIS[i % 3], (1 - e) * this.spin[i] * Math.PI * 1.25 + t * 0.3 * (1 - e) * this.spin[i]);
          _qa.multiply(_qb);

          _vp.set(x, y, z);
          _vs.set(this.sc[i3], this.sc[i3 + 1], this.sc[i3 + 2]);
          _m4.compose(_vp, _qa, _vs);
          const kind = this.slot[i];
          if (kind === 0) this.mesh[0].setMatrixAt(this.n0++, _m4);
          else if (kind === 1) this.mesh[1].setMatrixAt(this.n1++, _m4);
          else this.mesh[2].setMatrixAt(this.n2++, _m4);
        }
        for (let g = 0; g < 3; g++) if (this.mesh[g]) this.mesh[g].instanceMatrix.needsUpdate = true;
      }

      /* 交互：把附近的碎片撞开，再弹回原位 */
      impulse(px, py, strength) {
        const n = this.n;
        for (let i = 0; i < n; i++) {
          const i3 = i * 3;
          const dx = this.tgt[i3] - px, dy = this.tgt[i3 + 1] - py;
          const d2 = dx * dx + dy * dy;
          if (d2 > 7) continue;
          const f = (1 - d2 / 7) * strength;
          this.offV[i3] += dx * f;
          this.offV[i3 + 1] += dy * f;
          this.offV[i3 + 2] += (Math.random() - 0.5) * f * 0.8;
        }
        this.busy = true;
      }
      springs(dt) {
        if (!this.busy) return;
        const n3 = this.n * 3, damp = Math.pow(0.015, dt);
        let energy = 0;
        for (let i = 0; i < n3; i++) {
          this.offV[i] += -this.off[i] * 24 * dt;
          this.offV[i] *= damp;
          this.off[i] += this.offV[i] * dt;
          energy += Math.abs(this.off[i]) + Math.abs(this.offV[i]);
        }
        if (energy < 0.02) { this.off.fill(0); this.offV.fill(0); this.busy = false; }
      }
    }

    /* 背光晕：跟着"当前实体"走的加法光团，替代后处理泛光 */
    const glow = (function () {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d');
      const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      rg.addColorStop(0, 'rgba(150,200,255,0.85)');
      rg.addColorStop(0.30, 'rgba(90,150,235,0.30)');
      rg.addColorStop(1, 'rgba(20,40,80,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(11, 11),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })
      );
      m.position.set(0, 0, -1.8);
      m.renderOrder = -2;
      scene.add(m);
      return m;
    })();

    /* 核心的内芯（不参与碎片系统） */
    const coreInner = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5, 0),
      new THREE.MeshStandardMaterial({ color: 0x9fd0ff, metalness: 0.3, roughness: 0.15, emissive: 0x3fa9ff, emissiveIntensity: 1.7 })
    );
    const coreWire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.24, 1),
      new THREE.MeshBasicMaterial({ color: 0x6fb8ff, wireframe: true, transparent: true, opacity: 0.12 })
    );
    scene.add(coreInner, coreWire);

    const PARK = { core: [0, 18, -14], gpu: [26, -7, -14], truck: [-26, -6, -16], rack: [2, -24, -18] };
    const OBJ = {
      core: new Assemblage('core', buildCore, { cloudR: 7.5, park: PARK.core }),
      gpu: new Assemblage('gpu', buildGpu, { cloudR: 8.5, park: PARK.gpu }),
      truck: new Assemblage('truck', buildTruck, { cloudR: 9.0, park: PARK.truck }),
      rack: new Assemblage('rack', buildRack, { cloudR: 8.5, park: PARK.rack })
    };

    /* ============================================================
       镜头时间线：由 DOM 分区驱动
       ============================================================ */
    const STOP_DEF = [
      { sel: '#home', obj: 'core', pos: [0, 2.5, 9.4], look: [0, 1.45, 0], fov: 42 },
      { sel: '#metrics', obj: 'core', pos: [2.0, 3.4, 13.6], look: [0, 2.2, 0], fov: 40 },
      { sel: '#products', obj: 'gpu', items: '#products article', pos: [0, 1.6, 8.6], look: [0, 0.85, 0], fov: 45 },
      { sel: '#philosophy', obj: null, pos: [0, 6.5, 17.5], look: [0, 2.0, -2], fov: 38 }
    ];
    let stops = [], narrativeEnd = 1200;

    function buildStops() {
      stops = [];
      for (const d of STOP_DEF) {
        const el = document.querySelector(d.sel);
        if (!el) continue;
        const y0 = el.offsetTop, h = Math.max(1, el.offsetHeight);
        if (d.items) {
          // 按真实产品块切分：奇数块文字靠左 → 实体占右侧，反之亦然
          const names = ['gpu', 'truck', 'rack', 'gpu'];
          const blocks = Array.prototype.slice.call(document.querySelectorAll(d.items));
          blocks.forEach(function (bl, i) {
            const side = i % 2 === 0 ? 1 : -1;                 // +1 = 实体在画面右侧
            const shift = -1.95 * side;                        // 镜头横向让位
            stops.push({
              obj: names[i % names.length],
              y0: bl.offsetTop - 40,
              y1: bl.offsetTop + bl.offsetHeight + 40,
              pos: [shift, d.pos[1], d.pos[2]],
              look: [shift - 0.35 * side, d.look[1], d.look[2]],
              fov: d.fov
            });
          });
          if (!blocks.length) stops.push({ obj: d.obj, y0: y0, y1: y0 + h, pos: d.pos, look: d.look, fov: d.fov });
        } else {
          stops.push({ obj: d.obj, y0: y0, y1: y0 + h, pos: d.pos, look: d.look, fov: d.fov });
        }
      }
      narrativeEnd = stops.length ? stops[stops.length - 1].y1 : window.innerHeight * 2;
      window.__COVER_END = narrativeEnd;   // 导航的深色覆盖范围（见 js/app.js）
    }

    /* ---------- 循环 ---------- */
    const camGoal = new THREE.Vector3(), lookGoal = new THREE.Vector3(), lookNow = new THREE.Vector3(0, 0.35, 0);
    let mouseX = 0, mouseY = 0, mx = 0, my = 0;
    let raf = 0, running = false, firstFrame = false, lastOpacity = -1;
    let fps = 60, fpsAcc = 0, fpsN = 0;

    function frame() {
      raf = 0;
      if (!running) return;
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.elapsedTime;

      /* 当前区间 + 前后插值 */
      const yMid = window.scrollY + window.innerHeight * 0.5;
      let a = stops[0] || { pos: [0, 2.5, 9.4], look: [0, 1.45, 0], fov: 42, obj: 'core' };
      let b = a, k = 1;
      for (let i = 0; i < stops.length; i++) {
        if (yMid <= stops[i].y1 || i === stops.length - 1) {
          a = stops[i]; b = stops[Math.min(stops.length - 1, i + 1)];
          k = Math.min(1, Math.max(0, (yMid - a.y0) / Math.max(1, a.y1 - a.y0)));
          break;
        }
      }
      const e = easeInOut(k);
      mx += (mouseX - mx) * Math.min(1, dt * 3.2);
      my += (mouseY - my) * Math.min(1, dt * 3.2);

      // 横向站位不插值：走进哪一块就把镜头摆到哪一侧（切换靠相机自身的缓动吃平）
      camGoal.set(
        a.pos[0] + mx * 0.9,
        a.pos[1] + (b.pos[1] - a.pos[1]) * e + my * 0.5 + Math.sin(t * 0.28) * 0.1,
        a.pos[2] + (b.pos[2] - a.pos[2]) * e
      );
      camera.position.lerp(camGoal, Math.min(1, dt * 4.2));
      lookGoal.set(
        a.look[0] + mx * 0.35,
        a.look[1] + (b.look[1] - a.look[1]) * e + my * 0.2,
        a.look[2] + (b.look[2] - a.look[2]) * e
      );
      lookNow.lerp(lookGoal, Math.min(1, dt * 4.2));
      camera.lookAt(lookNow);
      const fov = (a.fov || 42) + ((b.fov || a.fov || 42) - (a.fov || 42)) * e;
      if (Math.abs(camera.fov - fov) > 0.02) { camera.fov = fov; camera.updateProjectionMatrix(); }

      /* 实体：该上场的凝聚，其余崩解 */
      const activeName = a.obj;
      for (const name in OBJ) {
        const o = OBJ[name];
        const want = name === activeName ? 1 : 0;
        o.target = want;
        const rate = want > o.morph ? 2.4 : 3.6;      // 凝聚慢一点，崩解痛快
        o.morph += (want - o.morph) * Math.min(1, dt * rate);
        if (Math.abs(want - o.morph) < 0.004) o.morph = want;
        o.center.lerp(want ? ZERO : o.park, Math.min(1, dt * 1.6));
        o.springs(dt);
        o.update(t);
      }

      const anyOn = Math.max(OBJ.core.morph, OBJ.gpu.morph, OBJ.truck.morph, OBJ.rack.morph);
      glow.material.opacity = Math.max(0, (anyOn - 0.25)) * 0.85;
      glow.scale.setScalar(0.85 + anyOn * 0.35 + Math.sin(t * 0.9) * 0.03);

      const coreOn = OBJ.core.morph;
      coreInner.visible = coreOn > 0.35;
      coreInner.rotation.set(t * 0.32, t * 0.45, 0);
      coreInner.scale.setScalar(0.55 + coreOn * 0.6 + Math.sin(t * 1.6) * 0.04);
      coreWire.visible = coreOn > 0.55;
      coreWire.rotation.set(t * 0.08 + 0.3, t * 0.12, t * 0.05);

      /* 滚出叙事区 → 画布淡出，交棒给正文 */
      const fadeA = narrativeEnd - window.innerHeight * 0.4;
      const fadeB = narrativeEnd + window.innerHeight * 0.2;
      const op = 1 - Math.min(1, Math.max(0, (window.scrollY - fadeA) / Math.max(1, fadeB - fadeA)));
      if (Math.abs(op - lastOpacity) > 0.004) { canvas.style.opacity = op.toFixed(3); lastOpacity = op; }

      renderer.render(scene, camera);
      if (!firstFrame) { firstFrame = true; HOST.classList.add('ready'); window.__GL.ready = true; }

      fpsAcc += dt; fpsN++;
      if (fpsAcc > 0.8) {
        fps = fpsN / fpsAcc;
        if (fps < 42 && DPR > 1) {
          DPR = 1; renderer.setPixelRatio(1); renderer.setSize(window.innerWidth, window.innerHeight);
        } else if (fps < 34 && COUNT > 0.5) {
          COUNT = 0.5; rebuild();
        }
        fpsAcc = 0; fpsN = 0;
      }
      raf = requestAnimationFrame(frame);
    }

    function rebuild() {
      for (const name in OBJ) {
        const o = OBJ[name];
        for (let g = 0; g < 3; g++) if (o.mesh[g]) scene.remove(o.mesh[g]);
      }
      const make = (key, build) => { const o = new Assemblage(key, build, { cloudR: key === 'core' ? 7.5 : 8.7, park: PARK[key] }); o.morph = 0; o.lastMp = -1; return o; };
      OBJ.core = make('core', buildCore);
      OBJ.gpu = make('gpu', buildGpu);
      OBJ.truck = make('truck', buildTruck);
      OBJ.rack = make('rack', buildRack);
    }

    function start() { if (!raf) { clock.getDelta(); raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    function gate() {
      const inRange = window.scrollY < narrativeEnd + window.innerHeight * 0.8;
      const want = inRange && !document.hidden;
      if (want === running) return;
      running = want;
      if (want) start(); else stop();
    }

    /* ---------- 交互 ---------- */
    window.addEventListener('pointermove', (ev) => {
      mouseX = (ev.clientX / window.innerWidth - 0.5) * 2;
      mouseY = -(ev.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    window.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('a,button,input,textarea,select')) return;
      const wx = ((ev.clientX / window.innerWidth) * 2 - 1) * 3.4;
      const wy = (-(ev.clientY / window.innerHeight) * 2 + 1) * 1.9;
      for (const name in OBJ) if (OBJ[name].morph > 0.4) OBJ[name].impulse(wx, wy, 7.5);
    }, { passive: true });

    /* ---------- 生命周期 ---------- */
    function onResize() {
      renderer.setPixelRatio(DPR);
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      buildStops();
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', gate, { passive: true });
    document.addEventListener('visibilitychange', gate);
    canvas.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); stop(); HOST.classList.add('no-gl'); });

    /* ---------- 探针 ---------- */
    window.__GL = {
      ready: false,
      state: () => ({
        ready: window.__GL.ready, running: running, fps: +fps.toFixed(1), dpr: DPR, count: COUNT,
        active: (() => {
          const yMid = window.scrollY + window.innerHeight * 0.5;
          for (let i = 0; i < stops.length; i++) if (yMid <= stops[i].y1) return stops[i].obj;
          return stops.length ? stops[stops.length - 1].obj : null;
        })(),
        morph: {
          core: +OBJ.core.morph.toFixed(3), gpu: +OBJ.gpu.morph.toFixed(3),
          truck: +OBJ.truck.morph.toFixed(3), rack: +OBJ.rack.morph.toFixed(3)
        },
        tris: renderer.info.render.triangles, calls: renderer.info.render.calls,
        cw: canvas.width, ch: canvas.height, stops: stops.length
      }),
      impulse: (x, y) => { for (const n in OBJ) if (OBJ[n].morph > 0.3) OBJ[n].impulse(x, y, 8); },
      // 诊断：原点在屏幕上的归一化坐标（-1..1）与相机位置
      cam: () => {
        const v = new THREE.Vector3(0, 0, 0).project(camera);
        return { px: +v.x.toFixed(3), py: +v.y.toFixed(3),
                 pos: [+camera.position.x.toFixed(2), +camera.position.y.toFixed(2), +camera.position.z.toFixed(2)] };
      }
    };

    /* ---------- 启动 ---------- */
    buildStops();
    onResize();
    // 产品块的高度取决于图片/字体加载与入场动画，稍后与 load 后再对一次
    window.addEventListener('load', buildStops);
    setTimeout(buildStops, 1500);
    for (const n in OBJ) { OBJ[n].morph = 0.001; OBJ[n].target = (n === 'core') ? 1 : 0; }
    gate();
  }
}
