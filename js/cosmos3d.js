/**
 * 星河 3D 背景层 (js/cosmos3d.js)
 * ============================================================
 * 定位：博客首页的最底层背景（接替 2D 版 js/cosmos.js）。
 *      参考史诗级品牌站首屏的表现方式：真实纵深、电影感慢运镜、雾化的空间层次——
 *      相机在星系盘内缓慢巡航（全景 3D 动态），不放歌时也是"活着的深空"，
 *      放歌时优雅（慢呼吸基线）与奔放（拍点冲刺）并存。
 *      但它仍是"读起来不碍事"的底噪：密度、亮度、运动幅度都按背景标准往下压。
 *
 * 素材来源：全部由 JS 程序生成（Simplex 噪声造贴图 + 参数化星系分布），
 *          不加载任何外部图片；three.js 为自托管副本（assets/vendor/three.module.min.js）。
 * 降级：WebGL 不可用 → 自动回退 2D 版 js/cosmos.js（同一画布、同一面板，零干预）。
 * 防炫光：不用任何泛光/辉光后处理——辉光全部来自软衰减的程序贴图，加法亮度有封顶。
 *
 * 模块索引（注释均为中文）：
 *   【模块〇】噪声采样模块       Simplex 2D 噪声 / fbm：星云贴图的唯一来源
 *   【模块一】程序贴图模块       星点 / 光晕 / 星云四格图集 / 暗尘烟雾 / 流星尾迹
 *   【模块二】星系构建模块       背景星壳 + 旋臂星盘 + 亮星 + 星云 + 暗尘 + 银心光晕
 *   【模块三】音频频谱解析模块   三分频段能量 + 起音包络；数据源 = 本地上传 或 站点歌单
 *   【模块三·半】指针/滚动模块   指针视差 + 点击脉冲（踹散相机+涟漪）+ 滚动巡航偏移
 *   【模块四】相机巡航模块       慢速环绕 + 利萨如漂移 + 拍点推进（优雅 baseline / 奔放 burst）
 *   【模块五】渲染循环模块       fps 分级 / 性能看门狗 / reduce-motion 停笔 / 心跳复活
 * ============================================================
 */
import * as THREE from 'three';

(function () {
  'use strict';

  // ——— 环境检测：画布不可用 / WebGL 缺失时回退 2D 版，不影响博客正文 ———
  var canvas = document.getElementById('cosmos-canvas');
  if (!canvas) return;
  function fallback2d() {
    var s = document.createElement('script');
    s.src = 'js/cosmos.js';
    s.defer = true;
    document.body.appendChild(s);
  }
  var glProbe = null;
  try { glProbe = canvas.getContext('webgl2') || canvas.getContext('webgl'); } catch (e) {}
  if (!glProbe) { fallback2d(); return; }

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ============================================================
     0. 配置与通用数学工具
     ============================================================ */
  var CFG = {
     density: 1.0,        // 粒子总量倍率（还会按移动端 / 性能档再折算）
     intensity: 1.0,      // 亮度倍率
     motion: 1.0,         // 运动倍率（3D 巡航自带存在感，不再需要 2D 时代的 1.25 补偿）
   reactivity: 0.75,   // 【律动总闸】全部音频包络 ×它：优雅 baseline + 奔放 burst 同比例收敛。
                       // 1.0 = 整屏打拍子（2D 时代被用户打回）；0.5 = 只剩呼吸感
       fpsActive: 48,     // 帧率分级：活跃 48 / 失焦 16 / 后台 5（配合 24~60Hz 档流畅省电）
       fpsBlur: 16,
       fpsHidden: 5,
       fpsReduce: 16,     // 减少动效 × 主动放歌：低帧率随拍微动
       introMs: 3800,     // 入场时长：相机从深空推近 + 全场景渐显
    scrollPar: 1.0,       // 滚动巡航总闸：页面滚动时相机高度/距离轻微跟随（0 = 关掉）
     pointerPar: 1.0,     // 指针视差总闸：相机注视点随指针偏移（0 = 关掉）
     pointerKick: 1.0,    // 点击脉冲：相机震颤 + 涟漪 + 星屑
     camOrbit: 0.045,     // 巡航环绕角速度 rad/s（一圈 ≈ 2.3 分钟，慢而重才是宏伟）
     spinBase: 0.016      // 星系盘自转基线 rad/s（优雅 baseline；拍点在此之上加 burst）
  };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rr(a, b) { return a + Math.random() * (b - a); }
  function easeOut3(t) { return 1 - Math.pow(1 - t, 3); }
  // 近似高斯（中心极限，6 次平均）：星盘弥散 / 厚度都用它，比均匀随机自然
  function gauss() {
    var s = 0;
    for (var i = 0; i < 6; i++) s += Math.random();
    return s - 3;   // ≈ N(0, 0.5)
  }

  /* ============================================================
     【模块〇】噪声采样模块（移植 2D 版手写 Simplex：星云贴图用）
     ============================================================ */
  var Noise = (function () {
    var F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    var perm = new Uint8Array(512), grad = new Float32Array(24);
    function seed(s) {
      function mulberry32(a) {
        return function () {
          a |= 0; a = (a + 0x6D2B79F5) | 0;
          var t = Math.imul(a ^ (a >>> 15), 1 | a);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
      var rand = mulberry32(s);
      var p = new Uint8Array(256), i, j, t;
      for (i = 0; i < 256; i++) p[i] = i;
      for (i = 255; i > 0; i--) { j = (rand() * (i + 1)) | 0; t = p[i]; p[i] = p[j]; p[j] = t; }
      for (i = 0; i < 512; i++) perm[i] = p[i & 255];
      for (i = 0; i < 12; i++) { var a = (i / 12) * 6.283; grad[i * 2] = Math.cos(a); grad[i * 2 + 1] = Math.sin(a); }
    }
    seed(20260926);
    function noise2(x, y) {
      var s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s);
      var t = (i + j) * G2, x0 = x - (i - t), y0 = y - (j - t);
      var i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
      var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      var ii = i & 255, jj = j & 255, n = 0, t0, t1, t2, g;
      t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 > 0) { t0 *= t0; g = (perm[ii + perm[jj]] % 12) * 2; n += t0 * t0 * (grad[g] * x0 + grad[g + 1] * y0); }
      t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 > 0) { t1 *= t1; g = (perm[ii + i1 + perm[jj + j1]] % 12) * 2; n += t1 * t1 * (grad[g] * x1 + grad[g + 1] * y1); }
      t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 > 0) { t2 *= t2; g = (perm[ii + 1 + perm[jj + 1]] % 12) * 2; n += t2 * t2 * (grad[g] * x2 + grad[g + 1] * y2); }
      return 70 * n;
    }
    function fbm2(x, y, oct) {
      var v = 0, amp = 0.5, f = 1, i;
      for (i = 0; i < oct; i++) { v += amp * noise2(x * f, y * f); f *= 2.03; amp *= 0.5; }
      return v;
    }
    return { seed: seed, noise2: noise2, fbm2: fbm2 };
  })();

  /* ============================================================
     1. 渲染器 / 画布尺寸 / 场景
     ============================================================ */
  var W = 0, H = 0, DPR = 1, S = 1;
  var renderer = null, scene = null, camera = null, gpuString = 'unknown';
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, context: glProbe, antialias: false, alpha: false,
      preserveDrawingBuffer: true,            // 验收探针要 toDataURL 导画布本体看图
      powerPreference: 'high-performance'
    });
  } catch (e) { fallback2d(); return; }
  renderer.setClearColor(0x000007, 1);        // 深空底色照旧：不许纯黑，不许环境蓝雾
  try {
    var dbg = glProbe.getExtension('WEBGL_debug_renderer_info');
    gpuString = String(glProbe.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : glProbe.RENDERER));
  } catch (e) {}
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, 1, 1, 9000);

  var galaxy = new THREE.Group();             // 星系盘整体（自转 + 微倾）
  galaxy.rotation.x = -0.10;
  galaxy.rotation.z = 0.14;                   // 主轴对角构图：禁止呆板正横
  scene.add(galaxy);

  function resizeCanvas() {
    W = window.innerWidth || document.documentElement.clientWidth || 1024;
    H = window.innerHeight || document.documentElement.clientHeight || 720;
    // 像素预算：背景层不需要太高清晰度，超过预算就降采样（低配机的主要保护）
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    var budget = 2400000;
    var px = W * H * DPR * DPR;
    if (px > budget) DPR = Math.sqrt(budget / (W * H));
    renderer.setPixelRatio(DPR);
    renderer.setSize(W, H, false);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    S = Math.min(W, H) / 860;
    buildVeil();
  }

  // 暗角 + 冷蓝环境辉光：CSS 静态层（.cosmos-veil），零每帧开销（沿用 2D 版做法与几何）
  function buildVeil() {
    var v = document.getElementById('cosmos-veil');
    if (!v) {
      v = document.createElement('div');
      v.id = 'cosmos-veil';
      v.className = 'cosmos-veil';
      v.setAttribute('aria-hidden', 'true');
      document.body.appendChild(v);
    }
    var glowR = Math.round(Math.max(W, H) * 1.44);
    var inner = Math.round(Math.min(W, H) * 0.22);
    var outer = Math.round(Math.max(W, H) * 0.78);
    var mid = Math.round(inner + (outer - inner) * 0.62);
    v.style.background =
      'radial-gradient(circle ' + glowR + 'px at 50% 50%, rgba(96,128,186,0.10), rgba(96,128,186,0.035) 11%, rgba(96,128,186,0.01) 26%, rgba(96,128,186,0) 50%), ' +
      'radial-gradient(circle ' + outer + 'px at 50% 50%, rgba(0,2,7,0) ' + inner + 'px, rgba(0,2,7,0.16) ' + mid + 'px, rgba(0,2,7,0.36) ' + outer + 'px)';
  }

  /* ============================================================
     【模块一】程序贴图模块（全部离屏 Canvas 生成，不加载外部图片）
     ============================================================ */
  function texOf(c) {
    var t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    return t;
  }
  // 径向柔光：prof 1 = 星点（小亮核+柔晕）；2 = 光晕（极柔大弥散）；0 = 云絮（软核长尾）
  function radialTex(r, g, b, size, prof) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g2 = c.getContext('2d');
    var half = size / 2;
    var grd = g2.createRadialGradient(half, half, 0, half, half, half);
    var col = function (a) { return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; };
    if (prof === 1) {
      grd.addColorStop(0, col(1)); grd.addColorStop(0.10, col(0.62));
      grd.addColorStop(0.28, col(0.16)); grd.addColorStop(0.60, col(0.025)); grd.addColorStop(1, col(0));
    } else if (prof === 2) {
      grd.addColorStop(0, col(0.62)); grd.addColorStop(0.22, col(0.20));
      grd.addColorStop(0.52, col(0.055)); grd.addColorStop(1, col(0));
    } else {
      grd.addColorStop(0, col(1)); grd.addColorStop(0.16, col(0.60));
      grd.addColorStop(0.38, col(0.19)); grd.addColorStop(0.66, col(0.048)); grd.addColorStop(1, col(0));
    }
    g2.fillStyle = grd;
    g2.fillRect(0, 0, size, size);
    return texOf(c);
  }
  // 星云图集 2×2：径向衰减 × fbm 扰动 —— 四朵形态各异的云，避免"全屏同一坨"
  function nebulaAtlas() {
    var cell = 128, size = cell * 2;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g2 = c.getContext('2d');
    var img = g2.createImageData(size, size);
    for (var cy = 0; cy < 2; cy++) {
      for (var cx = 0; cx < 2; cx++) {
        var off = (cy * 2 + cx) * 13.7;
        for (var y = 0; y < cell; y++) {
          for (var x = 0; x < cell; x++) {
            var nx = x / cell - 0.5, ny = y / cell - 0.5;
            var rad = Math.sqrt(nx * nx + ny * ny) * 2;          // 0 心 → 1 边
            var fall = Math.max(0, 1 - rad);
            fall = fall * fall * (3 - 2 * fall);
            var n = Noise.fbm2(nx * 3.1 + off, ny * 3.1 - off, 4) * 0.5 + 0.5;   // 0..1
            var a = fall * Math.pow(n, 1.6) * 1.15;
            var k = ((cy * cell + y) * size + (cx * cell + x)) * 4;
            var v = Math.round(clamp(a, 0, 1) * 255);
            img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = v; img.data[k + 3] = 255;
          }
        }
      }
    }
    g2.putImageData(img, 0, 0);
    return texOf(c);
  }
  // 暗尘烟雾：亮度低、边缘碎 —— NormalBlending 黑色压暗，负责"切开"亮带
  function smokeTex() {
    var size = 128;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g2 = c.getContext('2d');
    var img = g2.createImageData(size, size);
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var nx = x / size - 0.5, ny = y / size - 0.5;
        var rad = Math.sqrt(nx * nx + ny * ny) * 2;
        var fall = Math.max(0, 1 - rad);
        var n = Noise.fbm2(nx * 4.2 + 51.3, ny * 4.2 - 17.9, 3) * 0.5 + 0.5;
        var a = fall * fall * (0.35 + 0.65 * n);
        var k = (y * size + x) * 4;
        var v = Math.round(clamp(a, 0, 1) * 255);
        img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = v; img.data[k + 3] = 255;
      }
    }
    g2.putImageData(img, 0, 0);
    return texOf(c);
  }
  // 银河带辉光底盘：一张躺在盘面上的径向柔光 —— 低机位看过去，盘面积累的星光
  // 凝成一条横贯天际的亮带（银河的"河"感主要靠它，1 次 draw call 的经典做法）
  function bandTex() {
    var size = 512;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g2 = c.getContext('2d');
    var img = g2.createImageData(size, size);
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var nx = x / size - 0.5, ny = y / size - 0.5;
        var rad = Math.sqrt(nx * nx + ny * ny) * 2;
        var fall = Math.max(0, 1 - rad);
        fall = Math.pow(fall, 1.7);
        var n = Noise.fbm2(nx * 5.2 + 3.1, ny * 5.2 - 8.7, 4) * 0.5 + 0.5;
        var a = fall * (0.45 + 0.55 * n);
        var k = (y * size + x) * 4;
        var v = Math.round(clamp(a, 0, 1) * 255);
        img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = v; img.data[k + 3] = 255;
      }
    }
    g2.putImageData(img, 0, 0);
    return texOf(c);
  }

  // 冲击波环贴图：软边环形（径向渐变出一段柔带），硬边几何环在近处会读成"巨型弧线"
  function ringTex() {
    var size = 256;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g2 = c.getContext('2d');
    var grd = g2.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.55, 'rgba(255,255,255,0)');
    grd.addColorStop(0.72, 'rgba(255,255,255,0.45)');
    grd.addColorStop(0.80, 'rgba(255,255,255,1)');
    grd.addColorStop(0.88, 'rgba(255,255,255,0.4)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g2.fillStyle = grd;
    g2.fillRect(0, 0, size, size);
    return texOf(c);
  }

  // 流星尾迹：横向渐隐的长条
  function streakTex() {    var c = document.createElement('canvas');
    c.width = 128; c.height = 32;
    var g2 = c.getContext('2d');
    var grd = g2.createLinearGradient(0, 0, 128, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.75, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,1)');
    g2.fillStyle = grd;
    g2.fillRect(0, 0, 128, 32);
    // 垂直方向羽化
    var img = g2.getImageData(0, 0, 128, 32);
    for (var y = 0; y < 32; y++) {
      var fy = 1 - Math.abs(y - 16) / 16;
      for (var x = 0; x < 128; x++) {
        img.data[(y * 128 + x) * 4 + 3] = Math.round(img.data[(y * 128 + x) * 4 + 3] * fy * fy);
      }
    }
    g2.putImageData(img, 0, 0);
    return texOf(c);
  }

  var TEX = null;
  function buildTextures() {
    TEX = {
      star: radialTex(255, 255, 255, 64, 1),
      halo: radialTex(255, 255, 255, 128, 2),
      nebula: nebulaAtlas(),
      smoke: smokeTex(),
      streak: streakTex(),
      band: bandTex(),
      ring: ringTex()
    };
  }

  /* ============================================================
     【模块二】星系构建模块
     方向性色板沿用宏伟感工单：银心暖白金 → 灰紫白 → 带内灰靛 → 带外冷靛，
     另撒 3% 酒红变星。全部加法混合、亮度有封顶 —— 不用泛光后处理，从根上防炫光。
     ============================================================ */
  var DISC_R = 1600;              // 星系盘半径（世界单位；相机在盘内巡航 → 盘永远出画）
  var ARMS = 3;
  var PAL_DIR = [                 // [r,g,b] 由盘缘冷 → 银心暖
    [110, 122, 180], [150, 150, 205], [190, 178, 210], [232, 214, 178]
  ];
  function dirColor(t, out) {     // t: 0=盘缘 1=银心
    var x = clamp(t, 0, 1) * (PAL_DIR.length - 1);
    var i0 = Math.floor(x), i1 = Math.min(PAL_DIR.length - 1, i0 + 1), f = x - i0;
    out[0] = lerp(PAL_DIR[i0][0], PAL_DIR[i1][0], f) / 255;
    out[1] = lerp(PAL_DIR[i0][1], PAL_DIR[i1][1], f) / 255;
    out[2] = lerp(PAL_DIR[i0][2], PAL_DIR[i1][2], f) / 255;
    return out;
  }

  // —— 点云通用 shader ——
  var STAR_VERT = [
    'attribute float aSize;',
    'attribute vec3 aColor;',
    'attribute vec2 aTw;',        // x: 闪烁速度  y: 相位
    'attribute float aBase;',     // 基础透明度
    'uniform float uTime; uniform float uScale; uniform float uBass; uniform float uPulse; uniform float uGlobalA;',
    'varying vec3 vColor; varying float vAlpha;',
    'void main() {',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  float dist = max(1.0, -mv.z);',
    '  float tw = 0.62 + 0.38 * sin(uTime * aTw.x + aTw.y);',   // 静默态也在闪烁：不同步
    '  float fogF = exp(-dist * 0.00010);',                    // 纵深衰减：远处自然暗下去
    '  float closeF = smoothstep(30.0, 150.0, dist);',         // 贴脸星淡去：巡航穿过星群不糊镜头
    '  vAlpha = aBase * tw * fogF * uGlobalA * closeF;',
    '  float sz = aSize * (1.0 + uBass * 0.20 + uPulse * 0.10);',
    '  gl_PointSize = sz * uScale / dist;',
    '  vColor = aColor;',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');
  var STAR_FRAG = [
    'uniform sampler2D uMap;',
    'varying vec3 vColor; varying float vAlpha;',
    'void main() {',
    '  vec4 tex = texture2D(uMap, gl_PointCoord);',
    '  gl_FragColor = vec4(vColor * tex.rgb, tex.a * vAlpha);',
    '}'
  ].join('\n');
  // 星云 shader：每点独立旋转 UV + 图集选格 + 慢呼吸
  var NEB_VERT = [
    'attribute float aSize;',
    'attribute vec3 aColor;',
    'attribute vec2 aTw;',        // x: 呼吸速度  y: 相位
    'attribute float aBase;',
    'attribute vec2 uvInfo;',     // x: 图集格号  y: 角速度
    'uniform float uTime; uniform float uScale; uniform float uBass; uniform float uPulse; uniform float uGlobalA;',
    'varying vec3 vColor; varying float vAlpha; varying float vRot; varying float vCell;',
    'void main() {',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  float dist = max(1.0, -mv.z);',
    '  float breathe = 0.78 + 0.22 * sin(uTime * aTw.x + aTw.y);',
    '  float surge = 1.0 + min(0.35, uBass * 0.30 + uPulse * 0.20);',   // 拍点亮度涌现有封顶：防炫光
    '  float closeF = smoothstep(80.0, 420.0, dist);',   // 贴脸云淡去：相机在云海里巡航，近处的云必须让路，',
    '                                                     // 否则整屏被近处大团雾洗白（一团团"烟雾弹"）',
    '  vAlpha = aBase * breathe * fog(dist) * uGlobalA * surge * closeF;',
    '  gl_PointSize = aSize * uScale / dist;',
    '  vColor = aColor;',
    '  vRot = uTime * uvInfo.y;',
    '  vCell = uvInfo.x;',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n').replace('fog(dist)', 'exp(-dist * 0.00006)');
  var NEB_FRAG = [
    'uniform sampler2D uMap;',
    'varying vec3 vColor; varying float vAlpha; varying float vRot; varying float vCell;',
    'void main() {',
    '  vec2 uv = gl_PointCoord - 0.5;',
    '  float cs = cos(vRot), sn = sin(vRot);',
    '  uv = vec2(uv.x * cs - uv.y * sn, uv.x * sn + uv.y * cs);',
    '  uv = clamp(uv * 0.5 + 0.25, 0.0, 0.5);',                // 缩进半格，防转出格
    '  uv += vec2(mod(vCell, 2.0) * 0.5, floor(vCell / 2.0) * 0.5);',
    '  vec4 tex = texture2D(uMap, uv);',
    '  gl_FragColor = vec4(vColor * tex.rgb, tex.a * vAlpha);',
    '}'
  ].join('\n');
  // 暗尘 shader：NormalBlending 黑色烟雾，画在星云之后压出暗缝
  var DUST_FRAG = [
    'uniform sampler2D uMap;',
    'varying float vAlpha; varying float vRot; varying float vCell;',
    'void main() {',
    '  vec2 uv = gl_PointCoord - 0.5;',
    '  float cs = cos(vRot), sn = sin(vRot);',
    '  uv = vec2(uv.x * cs - uv.y * sn, uv.x * sn + uv.y * cs) + 0.5;',
    '  vec4 tex = texture2D(uMap, uv);',
    '  gl_FragColor = vec4(vec3(0.0), tex.r * vAlpha);',
    '}'
  ].join('\n');
  var DUST_VERT = [
    'attribute float aSize;',
    'attribute float aBase;',
    'attribute float aSpin;',
    'uniform float uTime; uniform float uScale; uniform float uGlobalA;',
    'varying float vAlpha; varying float vRot; varying float vCell;',
    'void main() {',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  float dist = max(1.0, -mv.z);',
    '  float closeF = smoothstep(60.0, 320.0, dist);',   // 贴脸暗尘也要淡去（近处一团黑烟圈很出戏）
    '  vAlpha = aBase * uGlobalA * closeF;',
    '  gl_PointSize = aSize * uScale / dist;',
    '  vRot = uTime * aSpin;',
    '  vCell = 0.0;',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  function pointScale() { return (H * DPR) / (2 * Math.tan(camera.fov * Math.PI / 360)); }

  function makePointsMaterial(vert, frag, map, blending) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uScale: { value: 1000 },
        uBass: { value: 0 }, uPulse: { value: 0 }, uGlobalA: { value: 0 },
        uMap: { value: map }
      },
      vertexShader: vert, fragmentShader: frag,
      blending: blending || THREE.AdditiveBlending,
      transparent: true, depthWrite: false, depthTest: false
    });
  }

  // —— 场景件（probe 计数用） ——
  var ptsFar = null, ptsDisc = null, ptsBright = null, ptsNeb = null, ptsDust = null, ptsCore = null;
  var bandGlow = null, coreGlow = null, dustLanes = [];
  var baseCount = { far: 0, disc: 0, bright: 0, nebula: 0, dust: 0 };
  var innerStars = 0, outerStars = 0;         // 探针：盘心半径内 / 外的星数（密度梯度断言）
  var rings = [], meteors = [], sparkPts = null;
  var sparkData = null, sparkAlive = 0;
  var fired = { meteor: 0, spark: 0, ring: 0, kick: 0 };

  // 旋臂分布取样器：星、星云、暗尘共用同一个"银河"（log 螺旋 + 高斯弥散）
  function armPoint(out, rMin, rMax, spreadY) {
    if (Math.random() < 0.14) {                  // 中央核球
      var rb = Math.abs(gauss()) * 200;
      out.x = gauss() * rb; out.z = gauss() * rb; out.y = gauss() * (spreadY + rb * 0.35);
      out.r = Math.sqrt(out.x * out.x + out.z * out.z);
      return out;
    }
    var u = Math.random();
    var r = rMin + (rMax - rMin) * u * u;        // 内密外疏
    var theta = r * 0.0038;                      // 缠绕角随半径：log 螺旋
    var ang = (Math.random() * ARMS | 0) * (Math.PI * 2 / ARMS) + theta + gauss() * 0.17 * (0.4 + u);
    out.x = Math.cos(ang) * r + gauss() * r * 0.055;
    out.z = Math.sin(ang) * r + gauss() * r * 0.055;
    out.y = gauss() * (spreadY + r * 0.028);     // 盘厚：越外越厚一点点
    out.r = r;
    return out;
  }

  function fillPoints(geo, n, fill) {
    var pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    var tw = new Float32Array(n * 2), base = new Float32Array(n), size = new Float32Array(n);
    var tmp = { x: 0, y: 0, z: 0, r: 0 }, c = [0, 0, 0];
    for (var i = 0; i < n; i++) {
      fill(i, tmp, c);
      pos[i * 3] = tmp.x; pos[i * 3 + 1] = tmp.y; pos[i * 3 + 2] = tmp.z;
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      tw[i * 2] = tmp.twS; tw[i * 2 + 1] = tmp.twP;
      base[i] = tmp.base; size[i] = tmp.size;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aTw', new THREE.BufferAttribute(tw, 2));
    geo.setAttribute('aBase', new THREE.BufferAttribute(base, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  }

  function buildScene3d(freshSeed) {
    if (freshSeed) Noise.seed((Math.random() * 0xffffffff) >>> 0);
    // 清旧
    [ptsFar, ptsDisc, ptsBright, ptsNeb, ptsDust, ptsCore].forEach(function (p) {
      if (p) { p.geometry.dispose(); p.material.dispose(); (p.parent || galaxy).remove(p); }
    });
    var mobile = (W < 768) || ((navigator.maxTouchPoints || 0) > 0 && Math.min(W, H) < 820);
    var den = CFG.density * (mobile ? 0.55 : 1) * quality;
    var nFar = Math.round(2600 * den), nDisc = Math.round(15000 * den);
    var nBright = Math.round(240 * den), nNeb = Math.round(140 * den), nDust = Math.round(70 * den);
    baseCount = { far: nFar, disc: nDisc, bright: nBright, nebula: nNeb, dust: nDust };

    // ① 背景星壳：远景全天球，几乎不动，负责"深空"
    var geo = new THREE.BufferGeometry();
    fillPoints(geo, nFar, function (i, p, c) {
      var th = Math.random() * 6.283, ph = Math.acos(rr(-1, 1));
      var r = rr(3400, 5200);
      p.x = r * Math.sin(ph) * Math.cos(th);
      p.y = r * Math.cos(ph) * 0.7;
      p.z = r * Math.sin(ph) * Math.sin(th);
      var warm = Math.random();
      c[0] = lerp(0.75, 1.0, warm) * 0.9; c[1] = lerp(0.78, 0.95, 1 - warm) * 0.9; c[2] = 1.0;
      if (Math.random() < 0.06) { c[0] = 1.0; c[1] = 0.85; c[2] = 0.66; }    // 零星琥珀
      p.twS = rr(0.4, 2.4); p.twP = Math.random() * 100;
      p.base = rr(0.35, 0.8) * CFG.intensity; p.size = rr(2.6, 7.0);
    });
    ptsFar = new THREE.Points(geo, makePointsMaterial(STAR_VERT, STAR_FRAG, TEX.star));
    ptsFar.frustumCulled = false; ptsFar.renderOrder = 0;
    scene.add(ptsFar);

    // ② 旋臂星盘：银河本体。密度梯度 = 内密外疏（分布函数里），方向性色 = dirColor
    innerStars = 0; outerStars = 0;
    geo = new THREE.BufferGeometry();
    fillPoints(geo, nDisc, function (i, p, c) {
      armPoint(p, 90, DISC_R, 14);
      if (p.r < DISC_R * 0.5) innerStars++; else outerStars++;
      dirColor(1 - clamp(p.r / (DISC_R * 0.92), 0, 1), c);
      var dim = rr(0.7, 1.0);
      c[0] *= dim; c[1] *= dim; c[2] *= dim;
      if (Math.random() < 0.03) { c[0] = 0.62; c[1] = 0.26; c[2] = 0.32; }   // 酒红变星
      p.twS = rr(0.5, 2.8); p.twP = Math.random() * 100;
      p.base = rr(0.5, 1.0) * CFG.intensity; p.size = rr(2.4, 7.0);
    });
    ptsDisc = new THREE.Points(geo, makePointsMaterial(STAR_VERT, STAR_FRAG, TEX.star));
    ptsDisc.frustumCulled = false; ptsDisc.renderOrder = 1;
    galaxy.add(ptsDisc);

    // ③ 亮星：带大柔晕的亮核（柔光 sprite，禁硬十字星芒）
    geo = new THREE.BufferGeometry();
    fillPoints(geo, nBright, function (i, p, c) {
      if (Math.random() < 0.55) armPoint(p, 60, DISC_R * 1.05, 20);
      else { // 前景亮星：全天球随机，近处也有几颗
        var th = Math.random() * 6.283, ph = Math.acos(rr(-1, 1)), r = rr(600, 3600);
        p.x = r * Math.sin(ph) * Math.cos(th); p.y = r * Math.cos(ph) * 0.6; p.z = r * Math.sin(ph) * Math.sin(th); p.r = r;
      }
      var warm = Math.random();
      c[0] = lerp(0.82, 1.0, warm); c[1] = lerp(0.86, 0.97, warm * 0.5); c[2] = lerp(1.0, 0.88, warm);
      p.twS = rr(0.3, 1.2); p.twP = Math.random() * 100;
      p.base = rr(0.6, 1.0) * CFG.intensity; p.size = rr(10, 26);
    });
    ptsBright = new THREE.Points(geo, makePointsMaterial(STAR_VERT, STAR_FRAG, TEX.halo));
    ptsBright.frustumCulled = false; ptsBright.renderOrder = 4;
    galaxy.add(ptsBright);

    // ④ 星云：沿旋臂的大团云气（四格图集 + 各自慢旋转），颜色同方向性规则但更暗
    geo = new THREE.BufferGeometry();
    var uvInfo = new Float32Array(nNeb * 2);
    fillPoints(geo, nNeb, function (i, p, c) {
      armPoint(p, 180, DISC_R * 0.95, 34);
      dirColor(1 - clamp(p.r / (DISC_R * 0.9), 0, 1), c);
      var dim = rr(0.6, 1.0);
      if (Math.random() < 0.35) { c[0] = 0.42; c[1] = 0.36; c[2] = 0.61; dim = rr(0.6, 1.0); }  // 暗紫罗兰分子云
      if (Math.random() < 0.06) { c[0] = 0.55; c[1] = 0.22; c[2] = 0.28; }                      // 极淡酒红
      c[0] *= dim; c[1] *= dim; c[2] *= dim;
      p.twS = rr(0.05, 0.22); p.twP = Math.random() * 100;
      p.base = rr(0.09, 0.19) * CFG.intensity; p.size = rr(220, 560);
      uvInfo[i * 2] = Math.random() * 4 | 0;
      uvInfo[i * 2 + 1] = rr(-0.05, 0.05);                                  // 角速度：慢到几乎不可察觉
    });
    geo.setAttribute('uvInfo', new THREE.BufferAttribute(uvInfo, 2));
    ptsNeb = new THREE.Points(geo, makePointsMaterial(NEB_VERT, NEB_FRAG, TEX.nebula));
    ptsNeb.frustumCulled = false; ptsNeb.renderOrder = 2;
    galaxy.add(ptsNeb);

    // ⑤ 暗尘：黑色烟雾，NormalBlending 画在星云之后 → 亮带被"撕开"的剪影缝
    geo = new THREE.BufferGeometry();
    var pos5 = new Float32Array(nDust * 3), base5 = new Float32Array(nDust), size5 = new Float32Array(nDust), spin5 = new Float32Array(nDust);
    var tmp5 = { x: 0, y: 0, z: 0, r: 0 };
    for (var i5 = 0; i5 < nDust; i5++) {
      armPoint(tmp5, 220, DISC_R * 0.8, 24);
      pos5[i5 * 3] = tmp5.x; pos5[i5 * 3 + 1] = tmp5.y + rr(-6, 6); pos5[i5 * 3 + 2] = tmp5.z;
      base5[i5] = rr(0.22, 0.42);
      size5[i5] = rr(180, 520);
      spin5[i5] = rr(-0.03, 0.03);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos5, 3));
    geo.setAttribute('aBase', new THREE.BufferAttribute(base5, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size5, 1));
    geo.setAttribute('aSpin', new THREE.BufferAttribute(spin5, 1));
    var dustMat = makePointsMaterial(DUST_VERT, DUST_FRAG, TEX.smoke, THREE.NormalBlending);
    ptsDust = new THREE.Points(geo, dustMat);
    ptsDust.frustumCulled = false; ptsDust.renderOrder = 3;
    galaxy.add(ptsDust);

    // ⑥ 银心光晕：几团暖白金的弥散光 + 一枚致密核（白里透金，禁止橘黄火球）
    geo = new THREE.BufferGeometry();
    fillPoints(geo, 5, function (i, p, c) {
      p.x = gauss() * 60; p.y = gauss() * 30; p.z = gauss() * 60; p.r = 0;
      c[0] = 0.96; c[1] = 0.83; c[2] = 0.60;               // 暖白金：白里透金，禁止橘黄
      p.twS = rr(0.1, 0.3); p.twP = Math.random() * 100;
      p.base = (i === 0 ? 0.65 : rr(0.22, 0.34)) * CFG.intensity;
      p.size = i === 0 ? 260 : rr(480, 1000);
    });
    ptsCore = new THREE.Points(geo, makePointsMaterial(STAR_VERT, STAR_FRAG, TEX.halo));
    ptsCore.frustumCulled = false; ptsCore.renderOrder = 2;
    galaxy.add(ptsCore);

    // ⑥·半 银河带辉光底盘：躺在盘面 y=0 的巨大柔光（星云之下、星点之上是错觉，
    // 实际 renderOrder 最底 —— 它负责"河"的整体亮度，星点负责"河"里的颗粒）
    if (bandGlow) { bandGlow.geometry.dispose(); bandGlow.material.dispose(); galaxy.remove(bandGlow); }
    bandGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(DISC_R * 2.7, DISC_R * 2.7),
      new THREE.MeshBasicMaterial({
        map: TEX.band, color: 0x8a9ccc, transparent: true, opacity: 0.16 * CFG.intensity,
        blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide
      })
    );
    bandGlow.rotation.x = -Math.PI / 2;
    bandGlow.renderOrder = 1;
    galaxy.add(bandGlow);

    // 银心暖区底盘：方向性的"重心"——暖白金的一汪光躺在核区盘面上
    if (coreGlow) { coreGlow.geometry.dispose(); coreGlow.material.dispose(); galaxy.remove(coreGlow); }
    coreGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(DISC_R * 1.1, DISC_R * 1.1),
      new THREE.MeshBasicMaterial({
        map: TEX.band, color: 0xd8c4a0, transparent: true, opacity: 0.16 * CFG.intensity,
        blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide
      })
    );
    coreGlow.rotation.x = -Math.PI / 2;
    coreGlow.renderOrder = 1;
    galaxy.add(coreGlow);

    // 尘埃暗缝：几条躺在盘面上的拉长烟雾（NormalBlending 压暗）——
    // 低机位看过去，亮带被暗缝纵向撕开，像明信片上的银心照
    dustLanes.forEach(function (m) { m.geometry.dispose(); m.material.dispose(); galaxy.remove(m); });
    dustLanes = [];
    var nLanes = 3 + (Math.random() < 0.5 ? 1 : 0);
    for (var li = 0; li < nLanes; li++) {
      var lane = new THREE.Mesh(
        new THREE.PlaneGeometry(rr(700, 1400), rr(120, 260)),
        new THREE.MeshBasicMaterial({
          // ❗必须用 alphaMap 取烟雾亮度当透明度：map 的 RGB 只调颜色，
          // 不喂 alpha 的话整个矩形面片以均匀透明度渲染 → 硬边黑板
          alphaMap: TEX.smoke, color: 0x000000, transparent: true, opacity: rr(0.34, 0.5),
          blending: THREE.NormalBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide
        })
      );
      var lr = rr(260, 700), la = Math.random() * 6.283;
      lane.position.set(Math.cos(la) * lr, rr(4, 26), Math.sin(la) * lr);
      // 别贴死盘面：完全共面的暗缝在低机位下会缩成一条 1px 硬线
      lane.rotation.x = -Math.PI / 2 + rr(0.05, 0.13) * (Math.random() < 0.5 ? -1 : 1);
      lane.rotation.z = la + rr(-0.5, 0.5) + Math.PI / 2;   // 长轴大致顺臂（切向）
      lane.renderOrder = 3;
      galaxy.add(lane);
      dustLanes.push(lane);
    }

    // ⑦ 对象池：冲击波环 / 流星 / 星屑（短命天体，累计计数进探针 fired）
    rings.forEach(function (r) { r.mesh.geometry.dispose(); r.mesh.material.dispose(); galaxy.remove(r.mesh); });
    rings = [];
    for (var ri = 0; ri < 6; ri++) {
      var rm = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshBasicMaterial({ map: TEX.ring, color: 0x9fb4e8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide })
      );
      rm.rotation.x = -Math.PI / 2; rm.renderOrder = 5; rm.visible = false;
      galaxy.add(rm);
      rings.push({ mesh: rm, life: 0, max: 1 });
    }
    meteors.forEach(function (m) { m.sprite.material.dispose(); scene.remove(m.sprite); });
    meteors = [];
    for (var mi = 0; mi < 10; mi++) {
      var sm = new THREE.SpriteMaterial({ map: TEX.streak, color: 0xcfe0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
      var sp = new THREE.Sprite(sm);
      sp.renderOrder = 6; sp.visible = false;
      scene.add(sp);
      meteors.push({ sprite: sp, life: 0, max: 1, vx: 0, vy: 0, vz: 0 });
    }
    if (sparkPts) { sparkPts.geometry.dispose(); sparkPts.material.dispose(); scene.remove(sparkPts); sparkPts = null; }
    var SPN = 240;
    sparkData = {
      pos: new Float32Array(SPN * 3), vel: new Float32Array(SPN * 3),
      life: new Float32Array(SPN), max: new Float32Array(SPN)
    };
    geo = new THREE.BufferGeometry();
    fillPoints(geo, SPN, function (i, p, c) {
      p.x = 0; p.y = -99999; p.z = 0;
      c[0] = 0.85; c[1] = 0.90; c[2] = 1.0;
      p.twS = 1; p.twP = 0; p.base = 0; p.size = rr(2.2, 4.2);
    });
    sparkPts = new THREE.Points(geo, makePointsMaterial(STAR_VERT, STAR_FRAG, TEX.star));
    sparkPts.frustumCulled = false; sparkPts.renderOrder = 6;
    scene.add(sparkPts);
    sparkAlive = 0;
  }

  // —— 短命天体生成 ——
  function spawnRingAt(wx, wy, wz, big) {
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i];
      if (r.life > 0) continue;
      r.life = r.max = big ? 1.9 : 1.5;
      r.mesh.position.set(wx, wy, wz);
      r.mesh.visible = true;
      r.base = big ? rr(200, 420) : rr(90, 200);
      fired.ring++;
      return;
    }
  }
  function spawnRingAuto() {
    var t = { x: 0, y: 0, z: 0, r: 0 };
    armPoint(t, 150, 900, 10);
    var v = new THREE.Vector3(t.x, t.y, t.z).applyMatrix4(galaxy.matrixWorld);
    spawnRingAt(v.x, v.y, v.z, true);
  }
  function spawnMeteor() {
    for (var i = 0; i < meteors.length; i++) {
      var m = meteors[i];
      if (m.life > 0) continue;
      m.life = m.max = rr(0.9, 1.5);
      // 从盘缘某处斜穿视场：速度与相机环绕方向错开，才有"划过"感
      var th = Math.random() * 6.283, r = rr(900, 2200);
      m.sprite.position.set(Math.cos(th) * r, rr(-200, 500), Math.sin(th) * r);
      var sp = rr(900, 1600), va = th + rr(1.2, 2.2);
      m.vx = Math.cos(va) * sp; m.vy = rr(-0.25, 0.05) * sp; m.vz = Math.sin(va) * sp;
      m.sprite.material.opacity = 0;
      m.sprite.visible = true;
      fired.meteor++;
      return;
    }
  }
  function popSpark(wx, wy, wz, n, spread) {
    var d = sparkData;
    for (var k = 0; k < (n || 3); k++) {
      for (var i = 0; i < d.life.length; i++) {
        if (d.life[i] > 0) continue;
        d.life[i] = d.max[i] = rr(0.5, 1.1);
        d.pos[i * 3] = wx; d.pos[i * 3 + 1] = wy; d.pos[i * 3 + 2] = wz;
        var sp2 = (spread || 160) * rr(0.4, 1.2);
        var th = Math.random() * 6.283, ph = Math.acos(rr(-1, 1));
        d.vel[i * 3] = sp2 * Math.sin(ph) * Math.cos(th);
        d.vel[i * 3 + 1] = sp2 * Math.cos(ph);
        d.vel[i * 3 + 2] = sp2 * Math.sin(ph) * Math.sin(th);
        fired.spark++;
        break;
      }
    }
  }
  // 屏幕坐标 → 世界射线与 y=0 平面的交点（点击脉冲落点）
  var _raycaster = null, _ndc = null;
  function screenToPlane(sx, sy) {
    if (!_raycaster) { _raycaster = new THREE.Raycaster(); _ndc = new THREE.Vector2(); }
    _ndc.set((sx / W) * 2 - 1, -(sy / H) * 2 + 1);
    _raycaster.setFromCamera(_ndc, camera);
    var o = _raycaster.ray.origin, dir = _raycaster.ray.direction;
    var t = Math.abs(dir.y) > 1e-4 ? -o.y / dir.y : 2;
    t = clamp(t, 0.4, 6);
    return { x: o.x + dir.x * t, y: o.y + dir.y * t, z: o.z + dir.z * t };
  }

  /* ============================================================
     【模块三】音频频谱解析模块（与 2D 版同一条链路，逐字移植）
     数据源：① 面板上传的本地音乐（自建 AnalyserNode）② 站点歌单的 window.__BEAT
     ============================================================ */
  var Sound = {
    siteEl: null, ownEl: null, actx: null, analyser: null, arr: null, ownActive: false,
    bass: 0, mid: 0, treble: 0, pulse: 0, loud: 0,
    _b: 0, _m: 0, _t: 0, _pulse: 0,
    _prevRaw: 0, _slowRaw: 0, _lock: 0,
    _prevTre: 0, _slowTre: 0, _tLock: 0,
    trebleEdge: false,

    init: function () {
      this.siteEl = document.getElementById('music-audio');
      this.ownEl = document.getElementById('cosmos-audio');
      var self = this;
      if (this.ownEl) {
        this.ownEl.addEventListener('playing', function () {
          self.ownActive = true;
          if (self.siteEl && !self.siteEl.paused) self.siteEl.pause();   // 两路音源互斥，别一起响
        });
        this.ownEl.addEventListener('pause', function () { self.ownActive = false; });
        this.ownEl.addEventListener('ended', function () { self.ownActive = false; });
      }
      if (this.siteEl) {
        this.siteEl.addEventListener('playing', function () {
          if (self.ownEl && !self.ownEl.paused) self.ownEl.pause();
        });
      }
    },

    ensureGraph: function () {
      if (this.analyser || !this.ownEl) return this.analyser;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.actx = new AC();
        var src = this.actx.createMediaElementSource(this.ownEl);
        this.analyser = this.actx.createAnalyser();
        this.analyser.fftSize = 1024;              // 每 bin ≈ 43Hz，低频才有分辨力
        this.analyser.smoothingTimeConstant = 0.2; // 保留瞬态，别把鼓点抹平
        src.connect(this.analyser);
        this.analyser.connect(this.actx.destination);
        this.arr = new Uint8Array(this.analyser.frequencyBinCount);
      } catch (e) { this.analyser = null; }
      return this.analyser;
    },

    resume: function () {
      if (this.actx && this.actx.state === 'suspended') this.actx.resume().catch(function () {});
    },

    band: function (a, lo, hi) {
      var s = 0, i;
      for (i = lo; i < hi; i++) s += a[i];
      return s / (hi - lo) / 255;
    },

    read: function (nowMs, d) {
      var rawB = 0, rawM = 0, rawT = 0;
      if (this.ownActive && this.analyser) {
        this.analyser.getByteFrequencyData(this.arr);
        rawB = this.band(this.arr, 1, 8);      // ≈43–345Hz  底鼓 / 贝斯冲击区
        rawM = this.band(this.arr, 10, 60);    // ≈430Hz–2.6k 主旋律与人声
        rawT = this.band(this.arr, 70, 210);   // ≈3k–9kHz    细碎高音
      } else {
        // 站点歌单：拍点必须用 b.level（player.js 60fps 下算好的离散拍包络），
        // 曾误用 b.lv 连续能量二次检测 → 包络饱和"只呼吸不跳"（用户实测律动失效）
        var b = window.__BEAT;
        if (b) {
          rawB = (b.level != null) ? b.level : (b.lv || 0);
          rawM = b.mid || 0;
          rawT = b.treble || 0;
        }
      }
      // 包络：攻击快、释放慢，避免"音乐一停画面就塌"
      this._b += (rawB - this._b) * (rawB > this._b ? 0.30 : 0.055);
      this._m += (rawM - this._m) * (rawM > this._m ? 0.22 : 0.045);
      this._t += (rawT - this._t) * (rawT > this._t ? 0.34 : 0.07);
      // 起音检测（Δ上升速率 + 自适应门槛）：每一次"哐"
      this._slowRaw += (rawB - this._slowRaw) * 0.05;
      var rise = rawB - this._prevRaw;
      this._prevRaw = rawB;
      if (rise > Math.max(0.012, this._slowRaw * 0.07) && nowMs > this._lock) {
        this._pulse = 1;
        this._lock = nowMs + 220;                    // 不应期：防同一拍连打两次
      } else {
        this._pulse = Math.max(0, this._pulse - d * 0.062);
      }
      // 高频突起的边沿：只有这一瞬才生成流星与星屑
      this._slowTre += (rawT - this._slowTre) * 0.06;
      var tre = rawT - this._prevTre;
      this._prevTre = rawT;
      if (tre > Math.max(0.018, this._slowTre * 0.22) && nowMs > this._tLock) {
        this.trebleEdge = true;
        this._tLock = nowMs + 130;
      } else {
        this.trebleEdge = false;
      }
      // 【律动总闸】CFG.reactivity：对外包络统一乘它 —— 优雅/奔放同比例收敛
      this.bass = this._b * CFG.reactivity;
      this.mid = this._m * CFG.reactivity;
      this.treble = this._t * CFG.reactivity;
      this.pulse = this._pulse * CFG.reactivity;
      this.loud = Math.max(this.bass, this.mid * 0.7, this.treble * 0.5);
      return this;
    },

    activeEl: function () {
      if (this.ownEl && !this.ownEl.paused) return this.ownEl;
      if (this.siteEl && !this.siteEl.paused) return this.siteEl;
      return this.ownEl || this.siteEl;
    },
    playing: function () {
      return (this.ownEl && !this.ownEl.paused) || (this.siteEl && !this.siteEl.paused);
    }
  };

  /* ============================================================
     【模块三·半】指针 / 滚动模块
     指针 = 相机视差 + 点击脉冲（相机震颤 + 涟漪 + 星屑）；滚动 = 巡航高度微调。
     ============================================================ */
  var Pointer = {
    tx: -1, ty: -1, x: -9999, y: -9999,
    vx: 0, vy: 0, sp: 0,           // 平滑速度与划过速率（≈60fps 帧位移）
    wakeAcc: 0, meteorLock: 0,
    live: 0, lastMove: 0, out: false,
    nx: 0, ny: 0,              // 平滑后的 NDC 视差目标（-1..1）
    shake: 0, shx: 0, shy: 0, shz: 0,

    init: function () {
      var self = this;
      window.addEventListener('pointermove', function (ev) {
        self.tx = ev.clientX; self.ty = ev.clientY;
        if (self.x < -999) { self.x = self.tx; self.y = self.ty; }
        self.lastMove = performance.now();
        self.out = false;
      }, { passive: true });
      document.addEventListener('mouseleave', function () { self.out = true; }, { passive: true });
      document.addEventListener('mouseenter', function () { self.out = false; }, { passive: true });
      window.addEventListener('pointerdown', function (ev) {
        if (ev.target && ev.target.closest &&
            ev.target.closest('a,button,input,textarea,select,label,#cosmos-dock,#music-player')) return;
        self.tx = self.x = ev.clientX; self.ty = self.y = ev.clientY;
        self.lastMove = performance.now();
        self.kick(ev.clientX, ev.clientY);
      }, { passive: true });
    },
    update: function (dt) {
      if (this.x < -999) return;
      var k = Math.min(1, dt * 6);
      var nx0 = this.x + (this.tx - this.x) * k;
      var ny0 = this.y + (this.ty - this.y) * k;
      this.vx = (nx0 - this.x) / Math.max(dt, 0.001) * 0.016;
      this.vy = (ny0 - this.y) / Math.max(dt, 0.001) * 0.016;
      this.x = nx0; this.y = ny0;
      this.sp = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      var tnx = CFG.pointerPar ? ((this.x / W) * 2 - 1) : 0;
      var tny = CFG.pointerPar ? ((this.y / H) * 2 - 1) : 0;
      this.nx += (tnx - this.nx) * Math.min(1, dt * 2.2);
      this.ny += (tny - this.ny) * Math.min(1, dt * 2.2);
      var now = performance.now();
      var idle = now - this.lastMove;
      var want = this.out ? 0 : (idle < 4000 ? 1 : Math.max(0.3, 1 - (idle - 4000) / 2000));
      this.live += (want - this.live) * Math.min(1, dt * 3);
      // 快速划过：沿轨迹撒转瞬星屑（投到盘面）；甩得够快顺手拽一颗流星（900ms 冷却）
      if (this.live > 0.4) {
        if (this.sp > 4) {
          this.wakeAcc += this.sp;
          if (this.wakeAcc > 24) {
            this.wakeAcc = 0;
            var pw = screenToPlane(this.x, this.y);
            popSpark(pw.x, clamp(pw.y, -160, 160), pw.z, 2);
          }
          if (this.sp > 15 && now > this.meteorLock) { this.meteorLock = now + 900; spawnMeteor(); }
        } else this.wakeAcc = 0;
      }
      // 震颤衰减
      this.shake *= Math.pow(0.02, dt);
      if (this.shake < 0.5) this.shake = 0;
      this.shx = (Math.random() - 0.5) * this.shake;
      this.shy = (Math.random() - 0.5) * this.shake;
      this.shz = (Math.random() - 0.5) * this.shake;
    },
    kick: function (kx, ky) {
      if (CFG.pointerKick <= 0) return;
      this.shake = 26 * CFG.pointerKick;                       // 相机震颤（一次踹）
      var p = screenToPlane(kx, ky);
      spawnRingAt(p.x, clamp(p.y, -160, 160), p.z, false);     // 一圈涟漪
      popSpark(p.x, p.y, p.z, 4); popSpark(p.x, p.y, p.z, 4);  // 两簇星屑
      fired.kick++;
    }
  };

  var Scroll = {
    v: 0, last: 0,
    init: function () {
      var self = this;
      this.last = window.scrollY || 0;
      window.addEventListener('scroll', function () {
        var y = window.scrollY || 0;
        var dy = y - self.last;
        self.last = y;
        if (!CFG.scrollPar) return;
        self.v = clamp(self.v - dy * 0.05 * CFG.scrollPar, -2.2, 2.2);
      }, { passive: true });
    },
    update: function (d) { this.v *= Math.pow(0.90, d); if (Math.abs(this.v) < 0.002) this.v = 0; }
  };

  /* ============================================================
     【模块四】相机巡航模块
     慢速环绕 + 利萨如漂移（优雅 baseline，永不停）；
     拍点：向银心推近 + FOV 微扩 + 自转 burst（奔放 burst，全有封顶）。
     ============================================================ */
  var Cam = {
    ang: rr(0, 6.283),
    baseR: 1080, baseH: 300,
    push: 0,                    // 拍点推进量（弹簧跟随 pulse）
    look: new THREE.Vector3(),
    update: function (dt, t, A, introEase) {
      this.ang += dt * CFG.camOrbit;
      // 巡航轨道：半径与高度各自慢起伏（利萨如），永运不等于原地打转
      var R = this.baseR + Math.sin(t * 0.043) * 170 + Scroll.v * 60;
      var h = this.baseH + Math.sin(t * 0.031 + 1.7) * 180 + Scroll.v * 90;
      this.push += (A.pulse - this.push) * Math.min(1, dt * 7);
      R -= this.push * 130;                                     // 重鼓：向银心推近
      var fov = 55 + this.push * 3.2;                           // FOV 微扩：空间猛地"张开"
      if (Math.abs(camera.fov - fov) > 0.02) { camera.fov = fov; camera.updateProjectionMatrix(); }
      // 入场：从深空两倍距离外推近（easeOut3），随后进入常驻巡航
      var introK = 1 + (1 - introEase) * 1.6;
      R *= introK; h = h * (1 + (1 - introEase) * 1.8);
      camera.position.set(
        Math.cos(this.ang) * R + Pointer.shx,
        h + Pointer.shy,
        Math.sin(this.ang) * R + Pointer.shz
      );
      // 注视目标：顺着盘面望出去（不是俯瞰盘心）——银河带横贯视野，而不是一个圆盘
      this.look.set(
        Math.cos(t * 0.027) * 260 + Pointer.nx * 130,
        Math.sin(t * 0.019) * 70 - 10 - Pointer.ny * 90,
        Math.sin(this.ang * 0.8) * 260
      );
      camera.lookAt(this.look);
    }
  };

  /* ============================================================
     【模块五】渲染循环模块
     ============================================================ */
  var quality = 1;
  var introStart = 0, introT = 1;
  var time = 0, spin = 0, spinBoost = 0;
  var framerId = 0, hiddenTimer = 0, lastDraw = 0, lastPulse = 0, focused = true, frameNo = 0;
  var stopped = false, HIDDEN = false;
  var fpsTarget = CFG.fpsActive;
  var hiTimer = 0, uiTimer = 0;
  var budget = { last: 0, sum: 0, n: 0, ready: false };

  function applyQuality() {
    // 看门狗降档 = 直接砍绘制数量（drawRange，零重建成本）
    var sets = [
      [ptsFar, baseCount.far], [ptsDisc, baseCount.disc], [ptsBright, baseCount.bright],
      [ptsNeb, baseCount.nebula], [ptsDust, baseCount.dust]
    ];
    for (var i = 0; i < sets.length; i++) {
      if (sets[i][0]) sets[i][0].geometry.setDrawRange(0, Math.max(8, Math.round(sets[i][1] * quality)));
    }
  }

  function updateFx(dt, A) {
    // 冲击波环：扩散 + 淡出
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i];
      if (r.life <= 0) continue;
      r.life -= dt;
      var t = 1 - r.life / r.max;
      var sc = r.base * (0.15 + easeOut3(t) * 1.6);
      r.mesh.scale.set(sc, sc, sc);
      r.mesh.material.opacity = (1 - t) * 0.42;
      if (r.life <= 0) r.mesh.visible = false;
    }
    // 流星：飞行 + 淡入淡出 + 尾迹对齐速度方向
    for (var mi = 0; mi < meteors.length; mi++) {
      var m = meteors[mi];
      if (m.life <= 0) continue;
      m.life -= dt;
      m.sprite.position.x += m.vx * dt;
      m.sprite.position.y += m.vy * dt;
      m.sprite.position.z += m.vz * dt;
      var lt = 1 - m.life / m.max;
      m.sprite.material.opacity = (lt < 0.2 ? lt / 0.2 : (1 - lt) / 0.8) * 0.85;
      // 屏幕空间尾迹方向：把"位置"和"位置+速度"各投到 NDC 算夹角
      var p1 = m.sprite.position.clone().project(camera);
      var p2 = m.sprite.position.clone().add(new THREE.Vector3(m.vx, m.vy, m.vz)).project(camera);
      m.sprite.material.rotation = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      var len = clamp(Math.sqrt(m.vx * m.vx + m.vy * m.vy + m.vz * m.vz) * 0.35, 120, 480);
      m.sprite.scale.set(len, 9, 1);
      if (m.life <= 0) {
        m.sprite.visible = false;
        popSpark(m.sprite.position.x, m.sprite.position.y, m.sprite.position.z, 3);  // 尾端散星屑
      }
    }
    // 星屑：短命微粒，速度衰减 + 淡出
    var d = sparkData, alive = 0;
    var posA = sparkPts.geometry.getAttribute('position');
    var baseA = sparkPts.geometry.getAttribute('aBase');
    for (var si = 0; si < d.life.length; si++) {
      if (d.life[si] <= 0) { if (baseA.array[si] !== 0) { baseA.array[si] = 0; baseA.needsUpdate = true; } continue; }
      d.life[si] -= dt;
      var drag = Math.pow(0.35, dt);
      d.vel[si * 3] *= drag; d.vel[si * 3 + 1] *= drag; d.vel[si * 3 + 2] *= drag;
      posA.array[si * 3] += d.vel[si * 3] * dt;
      posA.array[si * 3 + 1] += d.vel[si * 3 + 1] * dt;
      posA.array[si * 3 + 2] += d.vel[si * 3 + 2] * dt;
      baseA.array[si] = clamp(d.life[si] / d.max[si], 0, 1) * 0.9;
      alive++;
    }
    posA.needsUpdate = true; baseA.needsUpdate = true;
    sparkAlive = alive;
  }

  function tick(now) {
    if (!stopped) framerId = requestAnimationFrame(tick);   // 续帧放最前：帧体出错也不会停摆

    var target = document.hidden ? CFG.fpsHidden
      : (reduceMotion ? CFG.fpsReduce : (focused ? CFG.fpsActive : CFG.fpsBlur));
    fpsTarget = target;
    var minMs = 1000 / target - 1;
    if (now - lastDraw < minMs) return;
    var rawDt = Math.min(0.5, (now - lastDraw) / 1000) || 0.016;   // 墙钟 dt：包络衰减用
    var dt = Math.min(0.12, rawDt);                                // 运动 dt：防跳帧大跳
    lastDraw = now;

    try {
      var d = clamp(dt * 60, 0.3, 3.2) * CFG.motion;
      time += dt * CFG.motion;

      Sound.read(now, d);
      Pointer.update(dt);
      Scroll.update(d);
      var A = Sound;

      if (introT < 1) introT = clamp((now - introStart) / CFG.introMs, 0, 1);
      var ia = easeOut3(introT);

      frameNo++;
      // 星系盘自转：优雅 baseline（spinBase+mid 慢速）+ 奔放 burst（拍点 spinBoost）
      if (A.pulse > 0.9 * CFG.reactivity && A.pulse !== lastPulse) {
        spawnRingAuto();
        spinBoost = Math.min(0.20, spinBoost + 0.075);      // 每拍一脚油门，有封顶
        lastPulse = A.pulse;
      }
      if (A.pulse < 0.5 * CFG.reactivity) lastPulse = 0;
      spinBoost *= Math.pow(0.42, rawDt);                    // 油门热度按墙钟衰减（低帧率下也按时退热）
      spin += dt * (CFG.spinBase + A.mid * 0.055 + spinBoost);
      galaxy.rotation.y = spin;
      if (A.trebleEdge && Math.random() < 0.6) spawnMeteor();

      updateFx(dt, A);
      Cam.update(dt, time, A, ia);

      // 全局 uniforms：时间 / 入场渐显 / 律动
      var mats = [ptsFar, ptsDisc, ptsBright, ptsNeb, ptsDust, ptsCore, sparkPts];
      for (var i = 0; i < mats.length; i++) {
        if (!mats[i]) continue;
        var u = mats[i].material.uniforms;
        u.uTime.value = time;
        u.uGlobalA.value = ia;
        if (u.uBass) u.uBass.value = A.bass;
        if (u.uPulse) u.uPulse.value = A.pulse;
        if (u.uScale) u.uScale.value = pointScale();
      }

      renderer.render(scene, camera);

      // 性能看门狗：连续偏慢就降密度（3.5 秒预热宽限）
      if (lastDraw > budget.last) {
        budget.sum += (lastDraw - budget.last);
        budget.n++;
        if (!budget.ready && budget.sum > 3500) budget.ready = true;
        if (budget.ready && budget.n > 60) {
          var avg = budget.sum / budget.n;
          if (avg > 26 && quality > 0.55) {
            quality = Math.max(0.55, quality - 0.15);
            applyQuality();
          }
          budget.sum = 0; budget.n = 0;
        }
      }
      budget.last = lastDraw;
    } catch (err) {
      // 一帧坏了就当没画，下一帧继续；背景层绝不能把博客正文拖下水
    }
  }

  /* ============================================================
     4. 生命周期：尺寸变化 / 前后台切换 / 性能降级
     ============================================================ */
  var resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var wasStopped = stopped;
      if (wasStopped) { stopped = false; lastDraw = 0; }
      resizeCanvas();
      if (wasStopped) { tick(performance.now()); stopLoop(); }
    }, 180);
  }

  function rebuild(freshSeed) {
    buildScene3d(!!freshSeed);
    applyQuality();
    introStart = performance.now();
    introT = 0;
  }

  function stopLoop() {
    stopped = true;                       // ❗只是清句柄不够：在途的那一帧末尾还会自己续一帧
    if (framerId) { cancelAnimationFrame(framerId); framerId = 0; }
    if (hiddenTimer) { clearInterval(hiddenTimer); hiddenTimer = 0; }
  }

  function startLoop() {
    stopLoop();
    stopped = false;
    HIDDEN = document.hidden;
    if (HIDDEN) {
      hiddenTimer = setInterval(function () { tick(performance.now()); }, Math.round(1000 / CFG.fpsHidden));
    } else {
      lastDraw = 0;
      framerId = requestAnimationFrame(tick);
    }
  }

  function onVisibility() {
    if (stopped) return;
    if (document.hidden !== HIDDEN) startLoop();
  }

  // 尊重"减少动效"：先把入场静默走完（相机推近到位、星图成型），再彻底停笔。
  // 停笔后任何会改变画面的操作（resize / 面板重置）都必须重走一遍本函数。
  var settleToken = 0;
  function runStillSettle() {
    var tok = ++settleToken;
    stopped = false;
    lastDraw = 0;
    var settleAt = performance.now() + CFG.introMs + 400;
    var still = function () {
      if (tok !== settleToken) return;
      tick(performance.now());
      if (performance.now() < settleAt) requestAnimationFrame(still);
      else stopLoop();
    };
    requestAnimationFrame(still);
  }

  // 减少动效 × 主动放歌：默认彻底静止，但"点了播放"是明确的交互意图 →
  // 按 CFG.fpsReduce 恢复低帧率随拍微动，停播 1.5 秒回到停笔。
  var rmResumeUntil = 0;
  function reduceMotionGate() {
    if (!reduceMotion) return;
    if (Sound.playing()) {
      rmResumeUntil = performance.now() + 1500;
      if (stopped) { stopped = false; lastDraw = 0; framerId = requestAnimationFrame(tick); }
    } else if (!stopped && performance.now() > rmResumeUntil) {
      stopLoop();
    }
  }

  // 心跳：rAF 被浏览器丢掉时（窗口遮挡 / 休眠唤醒 / 帧异常），2 秒没推进就重新排帧。
  // stopped 为真时不复活 —— 那是"减少动效"下有意的静态星图。
  setInterval(function () {
    if (stopped || HIDDEN || document.hidden) return;
    if (lastDraw && performance.now() - lastDraw > 2000) { lastDraw = 0; startLoop(); }
  }, 2000);

  /* ============================================================
     5. 右下角小型悬浮控制面板（本地音乐 / 音量 / 重置星河）
     ============================================================ */
  var UI = {
    panel: null, chip: null, body: null, fold: null, state: null, fileInput: null, vol: null, bird: null,
    fileName: '',

    init: function () {
      this.panel = document.getElementById('cosmos-panel');
      this.chip = document.getElementById('cosmos-chip');
      this.fold = document.getElementById('cosmos-fold');
      this.fileInput = document.getElementById('cosmos-file');
      this.vol = document.getElementById('cosmos-vol');
      this.state = document.getElementById('cosmos-state');
      this.bird = document.getElementById('cosmos-reset');
      if (!this.panel || !this.chip) { this.panel = null; return; }
      var self = this;

      this.fold.addEventListener('click', function () { self.setOpen(false); });
      this.chip.addEventListener('click', function () { self.setOpen(true); });

      this.fileInput.addEventListener('change', function (ev) {
        var f = ev.target.files && ev.target.files[0];
        if (!f) return;
        if (!Sound.ownEl) return;
        if (self.url) { try { URL.revokeObjectURL(self.url); } catch (e) {} }
        self.url = URL.createObjectURL(f);
        Sound.ownEl.src = self.url;
        self.fileName = f.name;
        Sound.ensureGraph();
        Sound.resume();
        var pr = Sound.ownEl.play();
        if (pr && pr.catch) pr.catch(function () { self.say('浏览器拦下了自动播放，点一下音轨试试'); });
        self.setVol(self.vol.value / 100);
        self.say('本地曲目：' + self.fileName);
      });

      this.vol.addEventListener('input', function () {
        self.setVol(self.vol.value / 100);
      });

      this.bird.addEventListener('click', function () {
        rebuild(true);
        if (reduceMotion) runStillSettle();   // 停笔状态下重置：静默重走一遍入场再停笔
        self.say('星河已重置 · 正在重新聚拢');
      });

      this.volValue = this.vol ? this.vol.value / 100 : 0.7;
      this.setOpen(true);
    },

    setOpen: function (open) {
      if (!this.panel) return;
      this.panel.hidden = !open;
      this.chip.hidden = open;
      if (this.fold) this.fold.setAttribute('aria-expanded', open ? 'true' : 'false');
    },

    setVol: function (v) {
      this.volValue = clamp(v, 0, 1);
      this.applyVol();
    },

    applyVol: function () {
      var val = (this.volValue === undefined) ? 0.7 : this.volValue;
      var el = Sound.activeEl();
      if (el && Math.abs(el.volume - val) > 0.001) el.volume = val;
    },

    say: function (msg) {
      if (this.state) this.state.textContent = msg;
    },

    tickState: function () {
      if (!this.state) return;
      var A = Sound;
      if (Sound.ownEl && !Sound.ownEl.paused) return this.say('本地曲目 · ' + (this.fileName || '播放中'));
      if (Sound.siteEl && !Sound.siteEl.paused) return this.say('站点歌单 · 星河随音乐流动');
      if (reduceMotion && stopped) return this.say('静止中 · 系统开了「减少动效」，放歌才随拍微动');
      if (A.loud > 0.02) return this.say('音频接入中');
      return this.say('静音中 · 星河巡航中');
    }
  };

  /* ============================================================
     6. 启动
     ============================================================ */
  function boot() {
    buildTextures();
    resizeCanvas();
    Sound.init();
    Pointer.init();
    Scroll.init();
    UI.init();
    rebuild(true);

    if (reduceMotion) {
      runStillSettle();
    } else {
      startLoop();
    }

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('blur', function () { focused = false; });
    window.addEventListener('focus', function () { focused = true; });
    document.addEventListener('visibilitychange', onVisibility);

    uiTimer = setInterval(function () {
      reduceMotionGate();
      UI.applyVol();
      UI.tickState();
    }, 900);

    // 调试探针：本地验证脚本用（故意做得很轻，不影响运行开销）
    window.__COSMOS = {
      cfg: CFG,
      reset: function () { rebuild(true); },
      info: function () {
        var drawn = function (p, base) { return p ? Math.min(p.geometry.drawRange.count, base || 1e9) : 0; };
        return {
          w: W, h: H, dpr: +DPR.toFixed(3), quality: quality, intro: introT, time: +time.toFixed(2),
          frame: frameNo, stopped: stopped, reduceMotion: reduceMotion,
          counts: {
            far: drawn(ptsFar, baseCount.far), disc: drawn(ptsDisc, baseCount.disc),
            bright: drawn(ptsBright, baseCount.bright), nebula: drawn(ptsNeb, baseCount.nebula),
            dust: drawn(ptsDust, baseCount.dust),
            ring: rings.filter(function (r) { return r.life > 0; }).length,
            meteor: meteors.filter(function (m) { return m.life > 0; }).length,
            spark: sparkAlive
          },
          fired: { meteor: fired.meteor, spark: fired.spark, ring: fired.ring, kick: fired.kick },
          pointer: { x: Math.round(Pointer.x), y: Math.round(Pointer.y), live: +Pointer.live.toFixed(2) },
          scroll: +Scroll.v.toFixed(3),
          audio: { bass: +Sound.bass.toFixed(3), mid: +Sound.mid.toFixed(3), treble: +Sound.treble.toFixed(3), pulse: +Sound.pulse.toFixed(3) },
          swirl: +((CFG.spinBase + Sound.mid * 0.055 + spinBoost) / CFG.spinBase).toFixed(3),
          playing: Sound.playing(), throttle: fpsTarget, spin: +spin.toFixed(3),
          cam: { r: Math.round(camera.position.length()), y: Math.round(camera.position.y), fov: +camera.fov.toFixed(1) },
          galaxy: {
            discR: DISC_R, arms: ARMS,
            inner: innerStars, outer: outerStars,
            tiltDeg: Math.round((galaxy.rotation.x + galaxy.rotation.z) * 57.3)
          },
          gpu: gpuString
        };
      },
      // 给测试用：手动喂一份频谱，省得扯音频设备
      feed: function (b, m, t) {
        window.__BEAT = { level: b, lv: b, mid: m || 0, treble: t || 0, slow: b, rise: 0, ctx: 'fake' };
      },
      // 给测试用：在指定屏幕坐标触发一次点击脉冲（绕过交互守卫）
      poke: function (x, y) { Pointer.kick(x, y); }
    };
  }

  boot();
})();
