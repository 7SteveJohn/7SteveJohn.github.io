/* ============================================================
   全站 3D 舞台（js/gl-stage.js）
   ------------------------------------------------------------
   仿 igloo.inc 的做法：一块固定全屏的 WebGL 画布躺在所有内容之下，
   往下滚时镜头在场景里移动，每一段内容对应一件"由碎片凝聚成形、
   散场时再崩解回粒子"的真 3D 实体（晶体核心 / 显卡 / 卡车 / 机柜）。

   要点
   · 形态 = 一批曲线：曲线扫出 TubeGeometry 当光带（顶点沿管长排列 →
     setDrawRange 就是"从头生长到尾"），再撒一批粒子顺着曲线流动。
     凝聚 = 光带生长 + 粒子从云团归位；崩解 = 反向。粒子在 CPU 上按曲线
     采样表插值（几千个点，代价可忽略），换来的是完全自由的流动手感。
   · 音乐律动四路：泛光强度 / 背光与色温 / 冲击波涟漪 + 镜头微推微震 / 实体鼓动。
   · 深色雾 + 程序化环境贴图（画一张 equirect 画布 → PMREM），金属因此
     有真实的高光走向，而不是贴一张假渐变。
   · 镜头时间线由 DOM 分区驱动（取每段的 offsetTop/height），改内容不用
     重对时间轴。
   · 降级：无 WebGL / 减少动效（可用 ?gl=1 强制） / 上下文丢失 → 保留静态封面。
     fps 看门狗：先降 DPR，再降实例密度。
   ============================================================ */
import * as THREE from '../assets/vendor/three.module.min.js';
import { EffectComposer } from '../assets/vendor/three-addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../assets/vendor/three-addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../assets/vendor/three-addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../assets/vendor/three-addons/postprocessing/OutputPass.js';

const HOST = document.getElementById('gl-stage');
if (HOST) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const force = new URLSearchParams(location.search).has('gl');
  /* 降级要留下"为什么"：原因写进 data-gl 与 __GL_FALLBACK，
     能重试的（减少动效 / 启动报错）给一枚按钮，点了带 ?gl=1 强制启动。 */
  const fail = (reason, withRetry) => {
    HOST.classList.add('no-gl');
    HOST.dataset.gl = reason;
    try { window.__GL_FALLBACK = reason; } catch (e) {}
    if (withRetry) {
      const btn = document.createElement('button');
      btn.className = 'gl-retry';
      btn.type = 'button';
      btn.setAttribute('aria-label', '播放 3D 场景');
      btn.textContent = '▶ 播放 3D 场景';
      btn.addEventListener('click', () => {
        const u = new URL(location.href);
        u.searchParams.set('gl', '1');
        location.replace(u.href);
      });
      document.body.appendChild(btn);   // .gl-stage 在 z-index:-1 层里，挂里面会被正文截住点不到
    }
  };
  if (reduce.matches && !force) fail('reduced-motion', true);
  else {
    try { boot(); } catch (err) { fail('boot-error', true); }
  }

  function boot() {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (err) {
      HOST.classList.add('no-gl');
      HOST.dataset.gl = 'no-webgl';
      try { window.__GL_FALLBACK = 'no-webgl'; } catch (e) {}
      return;
    }
    const canvas = renderer.domElement;
    HOST.appendChild(canvas);

    /* ---------- 档位 ---------- */
    const small = Math.min(window.innerWidth, window.innerHeight) < 760;
    let DPR = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.6);
    {   // 像素预算：全屏 PBR + 加法粒子在高分屏上按预算压 DPR（4K≈0.9 / 2K≈1.3），别等卡了才降
      const BUDGET = 6.3 * 1024 * 1024;
      const px = window.innerWidth * window.innerHeight;
      if (px * DPR * DPR > BUDGET) DPR = Math.max(0.85, Math.sqrt(BUDGET / px));
    }
    let COUNT = small ? 0.45 : 1;
    const clock = new THREE.Clock();

    const GPU_NAME = (() => {   // 诊断用：下次用户报"卡"，直接读 state().gpu 判断是不是软渲染
      try {
        const gl = renderer.getContext();
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      } catch (e) { return 'unknown'; }
    })();

    renderer.setPixelRatio(DPR);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;   // igloo 式金属感靠深暗部：曝光压一档，高光只留小面积
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    // 氛围渐变背景（motionsites 的 gradient 手法）：纯黑死板是"背景丑"的根源。
    // 底部近黑衔接地台 → 中部深蓝 → 顶部一抹冷光，与环境贴图、地台光晕同一个色系。
    scene.background = (function () {
      const c = document.createElement('canvas'); c.width = 32; c.height = 512;
      const g = c.getContext('2d');
      const lg = g.createLinearGradient(0, 0, 0, 512);
      lg.addColorStop(0.00, '#1c2f55');   // 顶部：冷蓝夜空
      lg.addColorStop(0.38, '#101b33');
      lg.addColorStop(0.72, '#070d1a');
      lg.addColorStop(1.00, '#030509');   // 底部：几乎黑
      g.fillStyle = lg; g.fillRect(0, 0, 32, 512);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    scene.fog = new THREE.FogExp2(0x0a1428, 0.055);

    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0.6, 8.2);

    /* ---------- 程序化环境贴图 ---------- */
    (function () {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 256;
      const g = c.getContext('2d');
      const sky = g.createLinearGradient(0, 0, 0, 256);
      sky.addColorStop(0.00, '#0e1730');
      sky.addColorStop(0.42, '#22375e');
      sky.addColorStop(0.53, '#2f4d80');
      sky.addColorStop(1.00, '#05070c');
      g.fillStyle = sky; g.fillRect(0, 0, 512, 256);
      // 顶部柔光箱：横贯亮带，金属面上拉出主高光（摄影棚感的来源）
      {
        const vg = g.createLinearGradient(0, 12, 0, 74);
        vg.addColorStop(0, 'rgba(232,242,255,0.95)');
        vg.addColorStop(0.55, 'rgba(205,226,255,0.40)');
        vg.addColorStop(1, 'rgba(205,226,255,0)');
        g.fillStyle = vg; g.fillRect(0, 12, 512, 62);
      }
      // 两道竖条光：错开位置制造第二高光
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
    const COOL = new THREE.Color(0x4d8dff), WARM = new THREE.Color(0xdcf2ff);   // 节拍色温：冷蓝 → 青白

    /* ---------- 地台 ---------- */
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(70, 64),
      new THREE.MeshStandardMaterial({ color: 0x0e1520, metalness: 0.92, roughness: 0.5, envMapIntensity: 0.75 })
    );
    ground.rotation.x = -Math.PI / 2; ground.position.y = -3.1; scene.add(ground);
    (function () {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d');
      const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      rg.addColorStop(0, 'rgba(150,195,255,0.5)');
      rg.addColorStop(0.42, 'rgba(90,135,215,0.14)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      m.rotation.x = -Math.PI / 2; m.position.y = -3.06; m.renderOrder = -1; scene.add(m);
    })();

    /* ---------- 柔边光点贴图 ----------
       粒子、光核、冲击波共用：一张中心亮、边缘空的柔边点。 */
    const DOT = (function () {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d');
      const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0.00, 'rgba(255,255,255,1)');
      rg.addColorStop(0.30, 'rgba(196,228,255,0.62)');
      rg.addColorStop(1.00, 'rgba(90,140,220,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    /* ---------- 材质 ----------
       形态改成「光带 + 流动粒子」之后不再需要金属材质：两者都是加法混合的
       发光体。线条要"看得清"而不是糊成光球，靠三件事：
       ① 色值压到泛光阈值（1.0）以下 —— 不晕开就是一条清楚的光；
       ② 光带用暗蓝青做底，只有节拍时才提亮到过阈值；
       ③ 粒子小而亮，负责"流动感"，不跟光带抢亮度。 */
    function ribbonMat(cool) {
      return new THREE.MeshBasicMaterial({
        color: cool.clone().multiplyScalar(0.62),   // 常态在阈值以下：清晰的线
        transparent: true, opacity: 0.42,
        blending: THREE.AdditiveBlending, depthWrite: false,
        side: THREE.DoubleSide, fog: false
      });
    }
    function flowMat(cool) {
      return new THREE.PointsMaterial({
        color: cool.clone().multiplyScalar(1.35),
        map: DOT, size: 0.105, sizeAttenuation: true,
        transparent: true, opacity: 0.72, depthWrite: false,
        blending: THREE.AdditiveBlending, fog: false
      });
    }

    /* ---------- 泛光后处理 ----------
       EffectComposer + RenderPass + UnrealBloomPass + OutputPass（awwwards 站的标配）。
       composer 会绕过 WebGL 内建抗锯齿，用 MSAA renderTarget（samples:4）补回。
       软渲染（SwiftShader/llvmpipe）直接跳过整条链：多 pass 全屏会把它打穿。 */
    let bloomPass = null;   // 存引用：看门狗低帧时可整体关掉（少跑 5 个全屏 pass）；律动也驱动它的 strength
    const composer = (function () {
      // ?gl-bloom=1 = 测试通道：软渲染环境也强制走 composer（回归测试覆盖泛光路径用）
      const forceBloom = /[?&]gl-bloom=1/.test(location.search);
      if (!forceBloom && /swiftshader|llvmpipe|software|pixelformer/i.test(GPU_NAME)) return null;
      try {
        const size = renderer.getDrawingBufferSize(new THREE.Vector2());
        // samples 2 而非 4：MSAA 是带宽大头，2x 与 4x 在动场景里肉眼难分
        const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: small ? 0 : 2 });
        const cp = new EffectComposer(renderer, rt);
        cp.setPixelRatio(DPR);
        cp.setSize(window.innerWidth, window.innerHeight);
        cp.addPass(new RenderPass(scene, camera));
        // 克制的辉光：threshold 1.0 = 只有 HDR 超亮像素（发光件）才晕，金属高光不参与；
        // 更低的 strength 让晕光收紧在光源附近，不形成雾团
        bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.36, 0.5, 1.0);
        cp.addPass(bloomPass);
        cp.addPass(new OutputPass());   // ACES tone mapping + sRGB 转换在这一步生效
        return cp;
      } catch (e) { return null; }
    })();
    if (composer) renderer.info.autoReset = false;   // composer 一帧多次 render，改手动 reset 否则 state().tris 只剩最后一个 pass

    const rnd = (a, b) => a + Math.random() * (b - a);

    /* ============================================================
       形态：用「光带曲线」描述，不再是一堆方块零件
       —— 方块实体（显卡/卡车/机柜）跟博客内容没关系，形状也不讨喜；
          光带 + 粒子流本身就是氛围，四个分区各一种流动姿态。
       ============================================================ */

    // 环：半径 R，绕 x 倾斜 tilt，绕 y 偏转 yaw
    function ringCurve(R, tilt, yaw, cx, cy, cz) {
      const pts = [], N = 72;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const x = Math.cos(a) * R, y0 = Math.sin(a) * R;
        const y = y0 * Math.cos(tilt), z0 = y0 * Math.sin(tilt);
        pts.push([cx + x * Math.cos(yaw) + z0 * Math.sin(yaw), cy + y, cz - x * Math.sin(yaw) + z0 * Math.cos(yaw)]);
      }
      return { pts: pts, closed: true };
    }

    // 呼吸环：同一个圆但每点半径按正弦起伏 —— 一圈静止的圆看着像"箍"，
    // 起伏之后才像光在流。amp 大一点更好看（0.15 上下）；起止点同相保证闭合。
    function wobbleRing(R, amp, k, ph, tilt, yaw) {
      const pts = [], N = 84;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const rr = R * (1 + amp * Math.sin(a * k + ph));
        const x = Math.cos(a) * rr, y0 = Math.sin(a) * rr;
        const y = y0 * Math.cos(tilt), z0 = y0 * Math.sin(tilt);
        pts.push([x * Math.cos(yaw) + z0 * Math.sin(yaw), y, -x * Math.sin(yaw) + z0 * Math.cos(yaw)]);
      }
      return { pts: pts, closed: true };
    }

    // 螺旋：底→顶绕 turns 圈，两端收窄成纺锤（球面收束）。
    // 相位抖动只能加在 y 上：往 x/z 上抖会让圆变椭圆（球面收束的和谐感就没了）。
    function helixCurve(R, H, turns, ph) {
      const pts = [], N = 110;
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        const rr = R * Math.sqrt(Math.max(0.05, 1 - Math.pow(u * 2 - 1, 2)));
        const a = u * turns * Math.PI * 2 + ph;
        pts.push([Math.cos(a) * rr, (u - 0.5) * H + Math.sin(u * 7.3 + ph) * H * 0.055, Math.sin(a) * rr]);
      }
      return { pts: pts, closed: false };
    }

    // 竖直光柱：从下到上带一点弧度
    function columnCurve(x, z, H, bend) {
      const pts = [], N = 44;
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        pts.push([x + Math.sin(u * Math.PI) * bend, (u - 0.5) * H, z + Math.sin(u * Math.PI) * bend * 0.55]);
      }
      return { pts: pts, closed: false };
    }

    // 首屏核心：三层呼吸环 + 两条球面螺旋 —— 一颗能量球的骨架。
    // 半径收在 1.3 上下：再大就顶到 hero 的标题与按钮（首屏只有 800px 高）。
    function buildCore() {
      const cs = [];
      cs.push(wobbleRing(1.06, 0.16, 2, 0.0, 0.55, 0.0));
      cs.push(wobbleRing(1.26, 0.13, 3, 1.7, 0.20, 0.55));
      cs.push(wobbleRing(0.92, 0.18, 2, 3.1, 1.05, -0.45));
      cs.push(ringCurve(1.32, 0.05, 0.35, 0, 0, 0));      // 赤道上一圈干净的圆，把散着的环"框"住
      cs.push(helixCurve(1.00, 2.30, 1.35, 0));
      cs.push(helixCurve(0.94, 2.30, 1.35, Math.PI));
      cs[3].w = 0.048; cs[4].w = 0.040; cs[5].w = 0.040;
      return { curves: cs, hue: 0x8ec5ff, hot: 0xe6f4ff };
    }

    /* 分区形态一：上升旋涡（三条不同相位螺旋束 + 一圈呼吸环） */
    function buildGpu() {
      const cs = [];
      cs.push(helixCurve(1.16, 2.65, 2.1, 0));
      cs.push(helixCurve(0.84, 2.35, 2.6, 2.1));
      cs.push(helixCurve(0.54, 1.95, 3.0, 4.2));
      cs.push(wobbleRing(1.44, 0.10, 3, 0.8, 1.32, 0.22));
      cs[3].w = 0.056;
      return { curves: cs, hue: 0x53d8ff, hot: 0xd6fbff };
    }

    /* 分区形态二：双环交织（∞ 形）+ 外束螺旋 */
    function buildTruck() {
      const cs = [];
      cs.push(wobbleRing(0.90, 0.10, 2, 0.0, 1.08, 0.34));
      cs.push(wobbleRing(0.90, 0.10, 2, 3.14, 1.08, 0.34));
      cs.push(helixCurve(1.48, 1.85, 1.15, 0.6));
      cs.push(wobbleRing(1.66, 0.14, 3, 1.2, 0.28, -0.42));
      cs[3].w = 0.052;
      return { curves: cs, hue: 0x9d8bff, hot: 0xece6ff };
    }

    /* 分区形态三：光柱阵列 + 上下端环 + 一层外束 */
    function buildRack() {
      const cs = [];
      const R = 0.98;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        cs.push(columnCurve(Math.cos(a) * R, Math.sin(a) * R, 2.95, 0.30));
      }
      cs.push(wobbleRing(R * 1.10, 0.08, 2, 0.4, 0.0, 0.0));   // 端环是水平圆：tilt=0
      cs.push(wobbleRing(R * 1.10, 0.08, 2, 3.5, 0.0, 0.0));
      cs.push(helixCurve(R * 1.10, 2.95, 0.85, 0));
      cs[5].w = 0.052; cs[6].w = 0.052;
      return { curves: cs, hue: 0x74f0d6, hot: 0xdcfff6 };
    }

    const easeInOut = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    const ZERO = new THREE.Vector3(0, 0, 0);

    /* ============================================================
       Flowform：一件「由光带与流动粒子聚成」的形态
       ------------------------------------------------------------
       不是方块零件堆：形态 = 一批曲线。曲线扫出 TubeGeometry 当光带
       （顶点沿管长顺序生成 → setDrawRange 就是"从头生长到尾"），
       再撒一批粒子顺着曲线流动。morph 0→1 = 光带生长 + 粒子从云团归位。
       ============================================================ */
    class Flowform {
      constructor(name, build, opt) {
        opt = opt || {};
        const spec = build();
        this.name = name;
        this.cool = new THREE.Color(spec.hue || 0x8ec5ff).multiplyScalar(0.62);   // 常态：沉下来的冷色（阈值下，线条清晰）
        this.warm = new THREE.Color(spec.hot || 0xe6f4ff).multiplyScalar(1.12);   // 节拍：刚过阈值晕一下，别全糊成白
        this.group = new THREE.Group();
        scene.add(this.group);

        const paths = spec.curves.map(function (c) {
          return new THREE.CatmullRomCurve3(
            c.pts.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }),
            !!c.closed, 'catmullrom', 0.5
          );
        });

        /* 光带 */
        this.ribbons = [];
        const TUB = small ? 84 : 132;
        for (let i = 0; i < paths.length; i++) {
          const geo = new THREE.TubeGeometry(paths[i], TUB, spec.curves[i].w || 0.05, 5, !!spec.curves[i].closed);
          const mat = ribbonMat(this.cool);
          const m = new THREE.Mesh(geo, mat);
          m.frustumCulled = false; m.renderOrder = 3; m.visible = false;
          this.group.add(m);
          this.ribbons.push({ mesh: m, geo: geo, mat: mat, total: geo.index.count, delay: 0 });
        }
        // 每条光带出发时间错开：凝聚时像被逐条点亮，而不是一起亮
        for (let i = 0; i < this.ribbons.length; i++) this.ribbons[i].delay = (i / this.ribbons.length) * 0.32;

        /* 曲线采样表：粒子位置查表插值，省掉每帧对曲线的求值 */
        this.S = 128;
        this.samp = [];
        for (let p = 0; p < paths.length; p++) {
          const arr = new Float32Array(this.S * 3);
          const v = new THREE.Vector3();
          for (let i = 0; i < this.S; i++) {
            paths[p].getPoint(i / (this.S - 1), v);
            arr[i * 3] = v.x; arr[i * 3 + 1] = v.y; arr[i * 3 + 2] = v.z;
          }
          this.samp.push(arr);
        }

        /* 粒子 */
        const per = Math.max(24, Math.round((small ? 96 : 178) * (COUNT || 1)));
        const np = this.N = per * spec.curves.length;
        this.pos = new Float32Array(np * 3);
        this.pi = new Uint8Array(np);        // 所属曲线
        this.pu = new Float32Array(np);      // 曲线参数 0..1
        this.spd = new Float32Array(np);     // 顺着曲线的流动速度
        this.amp = new Float32Array(np);     // 侧向抖动幅度
        this.ph = new Float32Array(np);      // 相位
        this.delay = new Float32Array(np);
        this.off = new Float32Array(np * 3); this.offV = new Float32Array(np * 3);
        this.cloud = new Float32Array(np * 3);
        for (let i = 0; i < np; i++) {
          const i3 = i * 3;
          this.pi[i] = i % spec.curves.length;
          this.pu[i] = Math.random();
          this.spd[i] = rnd(0.02, 0.085) * (Math.random() < 0.5 ? -1 : 1);
          this.amp[i] = rnd(0.035, 0.17);
          this.ph[i] = Math.random() * 6.283;
          this.delay[i] = Math.random();
          const th = Math.random() * Math.PI * 2, sph = Math.acos(Math.random() * 2 - 1);
          const rr = (opt.cloudR || 9) * (0.22 + Math.random() * 0.78);
          this.cloud[i3] = Math.sin(sph) * Math.cos(th) * rr;
          this.cloud[i3 + 1] = Math.cos(sph) * rr * 0.8;
          this.cloud[i3 + 2] = Math.sin(sph) * Math.sin(th) * rr;
        }
        const geoP = new THREE.BufferGeometry();
        this.attr = new THREE.BufferAttribute(this.pos, 3);
        this.attr.setUsage(THREE.DynamicDrawUsage);
        geoP.setAttribute('position', this.attr);
        this.pmat = flowMat(this.cool);
        this.points = new THREE.Points(geoP, this.pmat);
        this.points.frustumCulled = false; this.points.renderOrder = 3;
        this.group.add(this.points);

        this.park = new THREE.Vector3(opt.park[0], opt.park[1], opt.park[2]);
        this.center = this.park.clone();
        this.morph = 0; this.target = 0; this.lastMp = -1; this.busy = false;
        this.yaw = Math.random() * Math.PI * 2;
        this.spinIdle = rnd(0.11, 0.22) * (Math.random() < 0.5 ? -1 : 1);
        this.phs = Math.random() * 6.283;
      }

      /* 光带生长 + 粒子流动，两者都随 morph 从云团归位 */
      update(t) {
        const mp = this.morph;
        const parked = this.center.distanceToSquared(this.park) < 0.02;
        const visible = mp > 0.03 || !parked;
        this.group.visible = visible;
        if (!visible) return;
        const beat = beatSm;                 // 律动直接进位置，比只改亮度明显得多
        const push = 1 + beat * 0.17;        // ④ 实体大幅鼓动（粒子向外撑）

        for (let r = 0; r < this.ribbons.length; r++) {
          const rb = this.ribbons[r];
          let k = (mp - rb.delay) / 0.52; k = k < 0 ? 0 : k > 1 ? 1 : k;
          const e = easeInOut(k);
          const cnt = Math.floor(rb.total * e / 3) * 3;
          rb.geo.setDrawRange(0, cnt);
          rb.mesh.visible = cnt > 0;
          rb.mat.color.copy(this.cool).lerp(this.warm, beat * 0.9);   // ④ 色温随节拍偏移：冷蓝 → 青白
          rb.mat.opacity = (0.26 + 0.3 * e) * Math.min(1, mp * 1.5) * (1 + beat * 0.3);
          rb.mesh.scale.setScalar(push * (1 + Math.sin(t * 0.9 + r) * 0.012));
        }
        this.pmat.color.copy(this.cool).lerp(this.warm, beat * 0.9);
        this.pmat.opacity = 0.6 + beat * 0.35;

        const S = this.S, pos = this.pos, np = this.N;
        const cx = this.center.x, cy = this.center.y, cz = this.center.z;
        for (let i = 0; i < np; i++) {
          const i3 = i * 3;
          let k = (mp - this.delay[i] * 0.55) / 0.45; k = k < 0 ? 0 : k > 1 ? 1 : k;
          const e = easeInOut(k);
          let u = this.pu[i] + t * this.spd[i]; u -= Math.floor(u);
          const sm = this.samp[this.pi[i]];
          const f = u * (S - 1), i0 = f | 0, fr = f - i0;
          const a3 = i0 * 3, b3 = (i0 + 1 < S ? i0 + 1 : i0) * 3;
          const ph = this.ph[i];
          const a = this.amp[i] * (0.3 + 0.7 * e) * (1 + beat * 2.1);
          const px = (sm[a3] + (sm[b3] - sm[a3]) * fr + Math.sin(t * 1.15 + ph) * a) * push;
          const py = (sm[a3 + 1] + (sm[b3 + 1] - sm[a3 + 1]) * fr + Math.sin(t * 0.93 + ph * 1.7) * a * 1.2) * push;
          const pz = (sm[a3 + 2] + (sm[b3 + 2] - sm[a3 + 2]) * fr + Math.cos(t * 1.31 + ph * 0.6) * a) * push;
          const cl = Math.min(1, mp / 0.05);      // 退场末段云团收拢，消失得不拖泥带水
          pos[i3] = (this.cloud[i3] * cl + cx) * (1 - e) + px * e + this.off[i3];
          pos[i3 + 1] = (this.cloud[i3 + 1] * cl + cy) * (1 - e) + py * e + this.off[i3 + 1];
          pos[i3 + 2] = (this.cloud[i3 + 2] * cl + cz) * (1 - e) + pz * e + this.off[i3 + 2];
        }
        this.attr.needsUpdate = true;
      }

      /* 静置时也要活着：整件缓慢自旋 + 呼吸；节拍上再整件鼓一下 */
      idle(t, dt, sv) {
        const g = this.group, m = this.morph;
        this.yaw += (this.spinIdle + sv * 0.34) * dt * (0.3 + 0.7 * m);
        g.rotation.y = this.yaw;
        g.rotation.x = Math.sin(t * 0.42 + this.phs) * 0.05 * m;
        g.rotation.z = Math.sin(t * 0.31 + this.phs * 1.7) * 0.035 * m;
        g.position.y = Math.sin(t * 0.62 + this.phs) * 0.07 * m;
        g.scale.setScalar((0.9 + 0.1 * m) * (1 + beatSm * 0.09 * m) + Math.sin(t * 0.75 + this.phs) * 0.012 * m);
      }

      /* 交互：把附近的粒子撞开，再弹回原位 */
      impulse(px, py, strength) {
        const np = this.N, pos = this.pos;
        for (let i = 0; i < np; i++) {
          const i3 = i * 3;
          const dx = pos[i3] - px, dy = pos[i3 + 1] - py;
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
        const n3 = this.N * 3, damp = Math.pow(0.015, dt);
        let energy = 0;
        for (let i = 0; i < n3; i++) {
          this.offV[i] += -this.off[i] * 24 * dt;
          this.offV[i] *= damp;
          this.off[i] += this.offV[i] * dt;
          energy += Math.abs(this.off[i]) + Math.abs(this.offV[i]);
        }
        if (energy < 0.02) { this.off.fill(0); this.offV.fill(0); this.busy = false; }
      }
      dispose() {
        scene.remove(this.group);
        for (let i = 0; i < this.ribbons.length; i++) { this.ribbons[i].geo.dispose(); this.ribbons[i].mat.dispose(); }
        this.points.geometry.dispose(); this.pmat.dispose();
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

    /* ---------- 悬浮尘埃：叙事区里永远在飘的一层 ----------
       它是"画面没死"的底线：哪怕实体凝聚完毕、镜头也站定了，
       这层尘埃仍在缓慢上升 + 侧向游走，并被滚动与光标掀起。 */
    const motes = (function () {
      const tex = DOT;
      const layers = [];
      const mk = (cnt, size, opa) => {
        if (!cnt) return;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(cnt * 3);
        const seed = new Float32Array(cnt * 3);
        for (let i = 0; i < cnt; i++) {
          const i3 = i * 3;
          pos[i3] = rnd(-34, 34); pos[i3 + 1] = rnd(-15, 15); pos[i3 + 2] = rnd(-34, 14);
          seed[i3] = Math.random() * 6.283; seed[i3 + 1] = rnd(0.22, 0.8); seed[i3 + 2] = rnd(0.3, 1.5);
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
          map: tex, size: size, sizeAttenuation: true, transparent: true, opacity: opa,
          depthWrite: false, blending: THREE.AdditiveBlending, color: 0xbcd8ff, fog: false
        });
        const p = new THREE.Points(geo, mat);
        p.frustumCulled = false;
        scene.add(p);
        layers.push({ pos: pos, seed: seed, cnt: cnt, attr: geo.attributes.position, mat: mat, base: opa });
      };
      const N = small ? 430 : 940;
      mk(Math.round(N * 0.7), 0.13, 0.72);
      mk(Math.round(N * 0.3), 0.30, 0.45);
      return {
        layers: layers,
        update(t, dt, sv, mxv, myv, vis) {
          for (let L = 0; L < layers.length; L++) {
            const o = layers[L], p = o.pos, s = o.seed, n = o.cnt;
            o.mat.opacity = o.base * vis;
            for (let i = 0; i < n; i++) {
              const i3 = i * 3;
              const ph = s[i3], vy = s[i3 + 1], sw = s[i3 + 2];
              p[i3] += (Math.sin(t * 0.35 * sw + ph) * 0.30 + mxv * sw * 1.1) * dt;
              p[i3 + 1] += (vy * 0.45 + sv * 6.5 + myv * 0.6) * dt;
              if (p[i3 + 1] > 15) p[i3 + 1] -= 30; else if (p[i3 + 1] < -15) p[i3 + 1] += 30;
              if (p[i3] > 35) p[i3] -= 70; else if (p[i3] < -35) p[i3] += 70;
            }
            o.attr.needsUpdate = true;
          }
        }
      };
    })();

    /* ---------- 环绕火花：绕着当前实体转的一圈光点 ----------
       igloo 里最有记忆点的就是"物体被一圈流动的光围着"。
       这圈点整体绕 Y 转（滚得越快转得越快），是画面里最显眼的一处持续运动。 */
    const halo = (function () {
      const n = small ? 110 : 230;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        const a = Math.random() * Math.PI * 2;
        const r = 1.75 + Math.random() * 2.0;
        pos[i3] = Math.cos(a) * r;
        pos[i3 + 1] = (Math.random() * 2 - 1) * 1.6;
        pos[i3 + 2] = Math.sin(a) * r * 0.8;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        map: DOT, size: 0.08, sizeAttenuation: true, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending, color: 0x9fd4ff, fog: false
      });
      const p = new THREE.Points(geo, mat);
      p.frustumCulled = false; p.visible = false;
      scene.add(p);
      return {
        p: p,
        update(t, dt, level, sv, vis) {
          p.visible = level > 0.02 && vis > 0.02;
          if (!p.visible) return;
          mat.opacity = Math.min(0.85, level * 0.75) * vis * (1 + beatSm * 0.8);
          p.rotation.y += dt * (0.36 + Math.abs(sv) * 0.55);
          p.rotation.z = Math.sin(t * 0.22) * 0.24;
          p.rotation.x = Math.sin(t * 0.16) * 0.14;
          p.position.y = Math.sin(t * 0.5) * 0.14;
          p.scale.setScalar(0.92 + level * 0.14 + Math.sin(t * 0.8) * 0.035);
        }
      };
    })();

    /* 首屏光核：一枚加法光斑，不是几何体（二十面体的尖角太"棱角分明"） */
    const coreSpark = (function () {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 3.2),
        new THREE.MeshBasicMaterial({
          map: DOT, color: new THREE.Color(0x9fd8ff).multiplyScalar(1.4),
          transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
          depthWrite: false, depthTest: false, fog: false
        })
      );
      m.renderOrder = 2; m.frustumCulled = false; m.visible = false;
      scene.add(m);
      return m;
    })();

    /* ---------- 冲击波涟漪 ----------
       每一拍从当前实体中心放出一圈正对镜头的细环，1.1 秒内扩散并淡出。
       环带必须很细（0.985~1.0 = 1.5% 宽度）：粗一点就成了一枚 UI 圆环，
       细 + 快速扩散 + 平方淡出才像"冲击波"。池子只有 4 个，拍密了也不堆积。 */
    const WAVES = (function () {
      const pool = [];
      for (let i = 0; i < 4; i++) {
        const m = new THREE.Mesh(
          new THREE.RingGeometry(0.985, 1.0, 128),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(0x9fd8ff).multiplyScalar(1.25), transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
            side: THREE.DoubleSide, fog: false
          })
        );
        m.visible = false; m.renderOrder = 5; m.frustumCulled = false;
        scene.add(m);
        pool.push({ m: m, t: 0, on: false, x: 0, y: 0, z: 0 });
      }
      return {
        pool: pool,
        live: function () { let c = 0; for (const w of pool) if (w.on) c++; return c; },
        fire: function (x, y, z) {
          for (const w of pool) if (!w.on) { w.on = true; w.t = 0; w.x = x; w.y = y; w.z = z; return; }
        },
        update: function (dt, cam) {
          for (const w of pool) {
            if (!w.on) continue;
            w.t += dt;
            const u = w.t / 1.1;
            if (u >= 1) { w.on = false; w.m.visible = false; continue; }
            w.m.visible = true;
            w.m.position.set(w.x, w.y, w.z);
            w.m.scale.setScalar(0.30 + u * 7.2);
            w.m.lookAt(cam.position);                    // 正对镜头 = 屏幕上一圈同心涟漪
            w.m.material.opacity = (1 - u) * (1 - u) * 0.42;
          }
        }
      };
    })();

    const PARK = { core: [0, 18, -14], gpu: [26, -7, -14], truck: [-26, -6, -16], rack: [2, -24, -18] };
    const OBJ = {
      core: new Flowform('core', buildCore, { cloudR: 7.5, park: PARK.core }),
      gpu: new Flowform('gpu', buildGpu, { cloudR: 8.5, park: PARK.gpu }),
      truck: new Flowform('truck', buildTruck, { cloudR: 9.0, park: PARK.truck }),
      rack: new Flowform('rack', buildRack, { cloudR: 8.5, park: PARK.rack })
    };

    /* ============================================================
       镜头时间线：由 DOM 分区驱动
       ============================================================ */
    const STOP_DEF = [
      // 首屏：核心往左下压一档、镜头略微上抬 —— 光带形态本来就铺得开，
      // 停在画面正中会顶到 hero 的标题与按钮；压下去后上三分之一留给文字。
      { sel: '#home', obj: 'core', pos: [0.15, 3.5, 9.2], look: [0, 0.55, 0], fov: 40 },
      { sel: '#metrics', obj: 'core', pos: [1.7, 4.0, 12.2], look: [0, 1.9, 0], fov: 38 },
      { sel: '#products', obj: 'gpu', items: '#products article', pos: [0, 1.6, 6.9], look: [0, 0.85, 0], fov: 42 },
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
            const shift = -1.55 * side;                        // 镜头横向让位（1.95 会把实体甩出画面）
            stops.push({
              obj: names[i % names.length],
              y0: bl.offsetTop - 40,
              y1: bl.offsetTop + bl.offsetHeight + 40,
              pos: [shift, d.pos[1], d.pos[2]],
              look: [shift - 0.25 * side, d.look[1], d.look[2]],
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
    const camGoal = new THREE.Vector3(), lookGoal = new THREE.Vector3(), lookNow = new THREE.Vector3(0, 0.35, 0), _cd = new THREE.Vector3();
    let mouseX = 0, mouseY = 0, mx = 0, my = 0;
    let lastSy = window.scrollY, sv = 0;
    let raf = 0, running = false, firstFrame = false, lastOpacity = -1;
    let fps = 60, fpsAcc = 0, fpsN = 0, lowStreak = 0;
    let beatSm = 0;      // 音乐律动平滑值：player.js 每帧喂 window.__BEAT.level，缓变跟随
    let punch = 0, beatPrev = 0, beatAt = 0;   // 节拍冲击：冲顶立即 / 0.6s 衰减，驱动涟漪与镜头微推

    function frame() {
      raf = 0;
      if (!running) return;
try {        const dt = Math.min(0.05, clock.getDelta());
        const t = clock.elapsedTime;
        if (composer) renderer.info.reset();   // autoReset 已关：手动清，统计整帧所有 pass

        /* 滚动速度（px/ms，夹紧）：滚得越快 → 实体转得越快、尘埃被掀起、辉光更亮 */
        const sy = window.scrollY;
        const rawV = (sy - lastSy) / Math.max(dt, 0.001) / 1000;
        lastSy = sy;
        sv += (Math.max(-4, Math.min(4, rawV)) - sv) * Math.min(1, dt * 7);

        /* 音乐律动：player 喂 __BEAT.level（节拍包络 0..1，冲击立即/回落带衰减），
           平滑后驱动辉光/背光/光点/呼吸——幅度要大到"一眼看出在跟节拍" */

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
          a.pos[0] + mx * 0.9 + Math.sin(t * 0.21) * 0.34,
          a.pos[1] + (b.pos[1] - a.pos[1]) * e + my * 0.5 + Math.sin(t * 0.28) * 0.11 + Math.sin(t * 0.17) * 0.09,
          a.pos[2] + (b.pos[2] - a.pos[2]) * e + Math.sin(t * 0.13) * 0.24
        );
        camera.position.lerp(camGoal, Math.min(1, dt * 4.2));
        lookGoal.set(
          a.look[0] + mx * 0.35 + Math.sin(t * 0.19 + 1.2) * 0.12,
          a.look[1] + (b.look[1] - a.look[1]) * e + my * 0.2,
          a.look[2] + (b.look[2] - a.look[2]) * e
        );
        lookNow.lerp(lookGoal, Math.min(1, dt * 4.2));
        camera.lookAt(lookNow);
        if (punch > 0.002) {                              // ③ 节拍：镜头沿视线微推 + 两下微震
          _cd.subVectors(lookNow, camera.position).normalize();
          camera.position.addScaledVector(_cd, punch * 0.5);
          camera.position.x += Math.sin(t * 41.3) * punch * 0.05;
          camera.position.y += Math.sin(t * 37.7 + 1.3) * punch * 0.05;
          camera.rotateZ(Math.sin(t * 33.1) * punch * 0.012);
        }
        const fov = (a.fov || 42) + ((b.fov || a.fov || 42) - (a.fov || 42)) * e - punch * 1.5;
        if (Math.abs(camera.fov - fov) > 0.02) { camera.fov = fov; camera.updateProjectionMatrix(); }

        /* 实体：该上场的凝聚，其余崩解 */
        const activeName = a.obj;
        const anyMorph = Math.max(OBJ.core.morph, OBJ.gpu.morph, OBJ.truck.morph, OBJ.rack.morph);

        /* 音乐律动：player.js 每帧喂 __BEAT.level（节拍包络：冲顶立即、回落带衰减）。
           四路表现同时上 —— ①泛光强度 ②背光与色温 ③冲击波涟漪 + 镜头微推微震
           ④实体大幅鼓动。幅度都往大里给，"一眼看出在跟节拍"才算数。

           ❗触发判据只看"上一个采样还很暗、这一帧突然亮了"：不要给 bl 设绝对门槛。
           本机声卡回采电平很低（整段能量常在 0.1 附近），一旦要求 bl>0.3 就一次都
           触发不了 —— beat 的值域由 audio 输入电平决定，跟"该不该敲一下"无关。
           帧率也要进判据：软渲染只有 ~20fps，220ms 的间隔放不进一个节拍，
           不改的话拍点全被吃掉。 */
        const bl = window.__BEAT ? window.__BEAT.level : 0;
        const nowMs = performance.now();
        if (bl - beatPrev > 0.05 && bl > 0.10 && nowMs - beatAt > 300) {
          beatAt = nowMs;
          punch = Math.min(1, 0.55 + bl * 0.8);
          const ac = OBJ[activeName] ? OBJ[activeName].center : ZERO;
          if (anyMorph > 0.2) WAVES.fire(ac.x, ac.y, ac.z);
        }
        beatPrev = bl;
        punch *= Math.pow(0.012, dt);                     // 微推一下就收回，不留漂移
        beatSm += (bl - beatSm) * Math.min(1, dt * 18);   // 平滑值喂持续型效果（亮度/色温/呼吸）
        if (bloomPass) bloomPass.strength = 0.34 + beatSm * 0.95;
        for (const name in OBJ) {
          const o = OBJ[name];
          const want = name === activeName ? 1 : 0;
          o.target = want;
          const rate = want > o.morph ? 2.4 : 4.4;      // 凝聚慢一点，崩解痛快
          o.morph += (want - o.morph) * Math.min(1, dt * rate);
          if (Math.abs(want - o.morph) < 0.004) o.morph = want;
          o.center.lerp(want ? ZERO : o.park, Math.min(1, dt * 1.6));
          o.springs(dt);
          o.update(t);
          o.idle(t, dt, sv);
        }

        const anyOn = anyMorph;
        glow.material.opacity = Math.min(1, Math.max(0, anyOn - 0.25) * 0.85 * (1 + Math.min(0.7, Math.abs(sv) * 0.3)) * (1 + beatSm * 0.5));
        glow.scale.setScalar(0.85 + anyOn * 0.35 + Math.sin(t * 0.9) * 0.03);

        /* 叙事区可见度：滚到产品区之后慢慢收，到 about 之前刚好归零。
           尘埃与光环铺满全站，是"任何位置都有微动"的底线。 */
        const vis = Math.min(1, Math.max(0, (narrativeEnd + window.innerHeight * 0.95 - window.scrollY) / (window.innerHeight * 0.7)));

        /* 尘埃 + 环境旋转 + 主光游走：任何滚动位置都不会变成静照 */
        motes.update(t, dt, sv, mx, my, vis);
        WAVES.update(dt, camera);
        halo.update(t, dt, anyOn, sv, vis);
        if (scene.environmentRotation) scene.environmentRotation.y += dt * 0.055;
        key.position.set(5 + Math.sin(t * 0.23) * 2.4, 8, 6 + Math.cos(t * 0.19) * 1.8);
        /* ② 背光：强度与色温一起跟节拍走（冷蓝 → 青白）。
              注意这一行在帧尾，会把帧首那次赋值覆盖掉，所以节拍项必须写在这里。 */
        back.intensity = 26 + beatSm * 34 + Math.sin(t * 1.25) * 4 + Math.min(14, Math.abs(sv) * 6);
        back.color.copy(COOL).lerp(WARM, beatSm * 0.8);

        const coreOn = OBJ.core.morph;
        coreSpark.visible = coreOn > 0.22 && vis > 0.02;
        if (coreSpark.visible) {
          coreSpark.position.copy(OBJ.core.center).setY(OBJ.core.center.y + 0.55);
          coreSpark.lookAt(camera.position);
          coreSpark.scale.setScalar((0.32 + coreOn * 0.40) * (1 + beatSm * 0.6));
          coreSpark.material.opacity = Math.min(0.85, coreOn * 0.48 * (1 + beatSm * 1.1)) * vis;
        }

        /* 滚出叙事区 → 画布淡出，交棒给正文 */
        const fadeA = narrativeEnd - window.innerHeight * 0.4;
        const fadeB = narrativeEnd + window.innerHeight * 0.55;
        const op = 1 - Math.min(1, Math.max(0, (window.scrollY - fadeA) / Math.max(1, fadeB - fadeA)));
        if (Math.abs(op - lastOpacity) > 0.004) { canvas.style.opacity = op.toFixed(3); lastOpacity = op; }

        if (composer) composer.render(); else renderer.render(scene, camera);
        if (!firstFrame) { firstFrame = true; HOST.classList.add('ready'); window.__GL.ready = true; }

        fpsAcc += dt; fpsN++;
        if (fpsAcc > 0.8) {
          fps = fpsN / fpsAcc;
          const warm = clock.elapsedTime > 3.5;   // 首屏预热期（PMREM/首帧）帧率天然低，别急着降档
          if (warm && fps < 42 && DPR > 0.85) {   // 连续两轮偏低才降：一次砍到底会"突然糊"
            lowStreak++;
            if (lowStreak >= 2) { lowStreak = 0; DPR = Math.max(0.85, DPR * 0.85); renderer.setPixelRatio(DPR); renderer.setSize(window.innerWidth, window.innerHeight); if (composer) { composer.setPixelRatio(DPR); composer.setSize(window.innerWidth, window.innerHeight); } }
          } else if (warm && fps < 34 && composer && bloomPass && bloomPass.enabled) {
            bloomPass.enabled = false;   // DPR 已到底仍卡：先甩掉泛光（5 个全屏 pass），别动 COUNT——rebuild 会把凝聚形态重置归零
          } else if (warm && fps < 34 && COUNT > 0.5) {
            COUNT = 0.5; rebuild();
          } else if (fps >= 42) lowStreak = 0;
          fpsAcc = 0; fpsN = 0;
        }
      } catch (err) { /* 单帧失败不终止动画 */ }
      raf = requestAnimationFrame(frame);
    }

    function rebuild() {
      for (const name in OBJ) {
        const o = OBJ[name];
        o.dispose();
      }
      const make = (key, build) => { const o = new Flowform(key, build, { cloudR: key === 'core' ? 7.5 : 8.7, park: PARK[key] }); o.morph = 0; o.lastMp = -1; return o; };
      OBJ.core = make('core', buildCore);
      OBJ.gpu = make('gpu', buildGpu);
      OBJ.truck = make('truck', buildTruck);
      OBJ.rack = make('rack', buildRack);
    }

    function start() { if (!raf) { clock.getDelta(); raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    function gate() {
      const inRange = window.scrollY < narrativeEnd + window.innerHeight * 0.7;
      const modal = document.getElementById('project-modal');
      const modalOpen = !!modal && !modal.classList.contains('hidden');   // 弹窗盖着全屏，3D 停渲染把主线程让出来
      const want = inRange && !document.hidden && !modalOpen;
      if (want === running) return;
      running = want;
      if (want) start(); else stop();
    }
    const modalEl = document.getElementById('project-modal');
    if (modalEl) new MutationObserver(gate).observe(modalEl, { attributes: true, attributeFilter: ['class'] });

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
      if (composer) { composer.setPixelRatio(DPR); composer.setSize(window.innerWidth, window.innerHeight); }
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      buildStops();
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', gate, { passive: true });
    document.addEventListener('visibilitychange', gate);
    canvas.addEventListener('webglcontextlost', (ev) => {
      ev.preventDefault(); stop();
      HOST.classList.add('no-gl');
      HOST.dataset.gl = 'context-lost';
      try { window.__GL_FALLBACK = 'context-lost'; } catch (e) {}
    });

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
        sv: +sv.toFixed(3), motes: motes.layers.length,
        tris: renderer.info.render.triangles, calls: renderer.info.render.calls,
        cw: canvas.width, ch: canvas.height, stops: stops.length, gpu: GPU_NAME, bloom: !!(composer && bloomPass && bloomPass.enabled),
        beat: +beatSm.toFixed(3), punch: +punch.toFixed(3), waves: WAVES.live(), parts: OBJ.core.N + OBJ.gpu.N + OBJ.truck.N + OBJ.rack.N
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
