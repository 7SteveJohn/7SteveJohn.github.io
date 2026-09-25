/**
 * 星河背景层 (js/cosmos.js)
 * ============================================================
 * 定位：博客首页的最底层背景。画布 position:fixed 铺满视口，页面上下滚动时它不动。
 *      正文章之上；既是"看见就想读"的氛围，也是"读起来不碍事"的底噪——
 *      所以密度、亮度、运动幅度都按背景标准往下压（见 CFG.density / intensity / motion）。
 *
 * 素材来源：全部由 JS 实时程序生成（Simplex 噪声 + 离屏 Canvas 画出的光照精灵），
 *          不加载任何外部图片与贴图；不使用 WebGL 流体解算，避免低配机浏览器卡死。
 *
 * 模块索引（本文件主干，注释均为中文）：
 *   【模块一】噪声采样模块       Simplex 2D 噪声 / fbm 叠层，星云形态与颜色扰动的唯一来源
 *   【模块二】流场采样模块       curl noise 疏网格：给云絮、尘埃、星辰提供一致的漂移基准
 *   【模块三】音频频谱解析模块   三分频段能量 + 起音包络；数据源 = 本地上传 或 站点歌单
 *   【模块三·半】指针交互模块   指针=引力搅棒：移动搅动星尘、点击脉冲踹散再吸回（3D 移除后由星河接棒）
 *   【模块四】涡流力场模块       3~6 个动态漫游漩涡：切向扭转 + 径向排斥 → 卷曲/撕扯/愈合
 *   【模块五】渲染循环模块       衰减擦除 → 四层天体 → 后处理（辉光/颗粒/色差）→ 帧率分级
 *                                （暗角与冷蓝环境辉光在 CSS 静态层 .cosmos-veil，零每帧开销）
 * ============================================================
 */
(function () {
  'use strict';

  // ——— 环境检测：画布或 2D 上下文不可用时静默退出，不影响博客正文 ———
  var probe = document.createElement('canvas');
  if (!probe.getContext) return;
  var canvas = document.getElementById('cosmos-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d', { alpha: false });   // 不透明画布：合成开销更低
  if (!ctx) return;

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ============================================================
     0. 配置与通用数学工具
     ============================================================ */
  var CFG = {
      density: 1.0,        // 粒子总量倍率（还会在 buildScene 里按屏幕面积 / 移动端 / 性能档再折算）
      intensity: 1.0,      // 亮度倍率
      motion: 1.5,         // 运动倍率（不开歌时的"活着"程度；1.0 实测几乎看不出在动）
    reactivity: 0.75,   // 【律动总闸】全部音频包络 ×它：外扩/涡流/爆亮/拖尾/星芒/冲击波同比例收敛。
                        // 1.0 = 规格原始幅度（实测整屏打拍子，被用户打回）；0.5 = 只剩呼吸感（也嫌浅）；
                        // 0.75 = 拍点看得清、又不至于晃得读不了字
    pointerStir: 0.95,  // 指针搅动幅度：移动时附近星尘被拖带 + 绕指微涡
    pointerKick: 1.0,   // 按下脉冲幅度：半径内星体被踹散，归位弹簧拉回
    pointerRadius: 340, // 指针影响半径（px）
    pointerWake: 1.0,   // 快速划过时沿轨迹撒星屑的密度（0 = 关掉；不放歌时最主要的交互反馈）
    pointerFloor: 0.30, // 停手渐熄后保留的常驻微搅：光标停在星河里也一直在轻轻搅动（鼠标移出窗口才归零）
    fpsActive: 48,       // 正常每帧预算上限
    fpsBlur: 16,         // 窗口失焦：降到肉眼难察的缓慢演进
    fpsHidden: 5,        // 标签页切后台：几乎停摆
    fpsReduce: 16,       // 系统「减少动效」下：默认停笔，用户主动放歌才按这个帧率随拍微动
    trailQuiet: 0.26,    // 安静时的擦除 alpha：残影短、画面干净好读字
    trailLoud: 0.095,    // 低频强时的擦除 alpha：残影拉长，拖出流动感（0.075 叠加太久会发亮）
    trailBass: 0.75,     // 拖尾对低频的响应：最吃亮度的一项（残影叠残影），调大全幅底图跟着发亮
    trailPulse: 0.45,    // 拖尾对拍点的响应
    bloomEvery: 3,       // 每几帧做一次体积辉光（禁止每帧高斯模糊）
    bloomAlpha: 0.050,   // 辉光回叠强度（0.075 时真机上大光晕叠成一圈圈"炫光"，被用户打回）
    bloomBlur: 1,        // 辉光模糊半径（px，作用在 1/4 分辨率小缓冲上，≈全屏 4px，贴近原版 3px 的紧致度）
    caAlpha: 0.016,      // 色差：把低分辨率副本左右各偏一点叠回去（0.030 时两次全屏回叠加重炫光）
    grainAlpha: 0.050,   // 胶片颗粒强度
    vignette: 0.92,      // 暗角最深处的衰减（暗角本体在 CSS 静态层，这里只供强度）
    introMs: 3800        // 入场：星辰自四周汇聚成星河的时长
  };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut3(t) { var u = 1 - t; return 1 - u * u * u; }
  function rr(a, b) { return a + Math.random() * (b - a); }
  function cnt(raw, lo, hi) { return Math.round(clamp(raw, lo, hi)); }

  /* ============================================================
     【模块一】噪声采样模块
     经典 2D Simplex 噪声（带可重置种子的排列表），外加 fbm 多倍频叠层。
     —— 星云的轮廓、厚薄、明暗沟壑、内部稀薄空洞、逐帧色彩扰动全部由它产出；
        整个工程唯一的"纹理来源"，没有任何外部贴图。
     ============================================================ */
  var Noise = (function () {
    var perm = new Uint8Array(512);
    var permMod12 = new Uint8Array(512);
    // 2D 单形的 12 个梯度方向
    var GRAD = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1];

    // mulberry32：同一颗种子重排出同一张排列表，重置星河时可以换种子换星图
    function seed(seedValue) {
      var p = new Uint8Array(256), i, j, tmp;
      for (i = 0; i < 256; i++) p[i] = i;
      var t = seedValue >>> 0;
      function rnd() {
        t = (t + 0x6D2B79F5) >>> 0;
        var r = Math.imul(t ^ (t >>> 15), t | 1);
        r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
      }
      for (i = 255; i > 0; i--) { j = (rnd() * (i + 1)) | 0; tmp = p[i]; p[i] = p[j]; p[j] = tmp; }
      for (i = 0; i < 512; i++) { perm[i] = p[i & 255]; permMod12[i] = perm[i] % 12; }
    }

    var F2 = 0.5 * (Math.sqrt(3) - 1);
    var G2 = (3 - Math.sqrt(3)) / 6;

    // 返回 [-1, 1]
    function noise2(xin, yin) {
      var n0 = 0, n1 = 0, n2 = 0;
      var s = (xin + yin) * F2;
      var i = Math.floor(xin + s), j = Math.floor(yin + s);
      var t = (i + j) * G2;
      var x0 = xin - (i - t), y0 = yin - (j - t);
      var i1, j1;
      if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
      var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
      var x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      var ii = i & 255, jj = j & 255;
      var g0 = permMod12[ii + perm[jj]] * 3;
      var g1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
      var g2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
      var t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * (GRAD[g0] * x0 + GRAD[g0 + 1] * y0); }
      var t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * (GRAD[g1] * x1 + GRAD[g1 + 1] * y1); }
      var t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * (GRAD[g2] * x2 + GRAD[g2 + 1] * y2); }
      return 70 * (n0 + n1 + n2);
    }

    // fractal brownian motion：多个倍频叠加，返回 [-1, 1]
    function fbm2(x, y, oct) {
      var amp = 0.5, freq = 1, sum = 0, norm = 0;
      for (var i = 0; i < oct; i++) {
        sum += amp * noise2(x * freq, y * freq);
        norm += amp;
        amp *= 0.5;
        freq *= 2.03;
      }
      return sum / norm;
    }

    seed(20260925);
    return { seed: seed, noise2: noise2, fbm2: fbm2 };
  })();

  /* ============================================================
     【模块二】流场采样模块（curl noise）
     在"疏网格"上求噪声旋度，得到一幅无散度的向量场：
       curl = (∂n/∂y, -∂n/∂x)
     无散度的好处是场里没有源头和汇点，粒子不会在某个位置被吸成一坨、也不会从某点凭空涌出。
     网格刻意取粗（默认 56px 一格）+ 双线性插值取样，开销远低于逐粒子求噪声；
     每 2 帧更新一次即可，因为流场本身演化很慢。
     ============================================================ */
  var Flow = {
    cell: 56,
    cols: 0,
    rows: 0,
    vec: null,

    resize: function (w, h) {
      this.cols = Math.ceil(w / this.cell) + 2;
      this.rows = Math.ceil(h / this.cell) + 2;
      this.vec = new Float32Array(this.cols * this.rows * 2);
    },

    update: function (time) {
      var vec = this.vec;
      if (!vec) return;
      var FS = 0.00125;        // 噪声在屏幕坐标下的空间尺度：越小，涡团越大
      var e = 14;              // 有限差分步长（像素）
      var cols = this.cols, rows = this.rows, c = this.cell;
      var tt = time * 0.055;   // 场自身的演化速度
      for (var iy = 0; iy < rows; iy++) {
        for (var ix = 0; ix < cols; ix++) {
          var X = ix * c, Y = iy * c;
          var up = Noise.fbm2(X * FS + tt, (Y + e) * FS, 2);
          var dn = Noise.fbm2(X * FS + tt, (Y - e) * FS, 2);
          var rt = Noise.fbm2((X + e) * FS + tt, Y * FS, 2);
          var lf = Noise.fbm2((X - e) * FS + tt, Y * FS, 2);
          var cx = up - dn;
          var cy = -(rt - lf);
          var m = Math.sqrt(cx * cx + cy * cy);
          var k = (iy * cols + ix) * 2;
          if (m < 1e-5) { vec[k] = 0; vec[k + 1] = 0; }
          else { vec[k] = cx / m; vec[k + 1] = cy / m; }   // 只留方向，强度在调用处乘
        }
      }
    },

    sample: function (x, y, out) {
      var vec = this.vec;
      if (!vec) { out.x = 0; out.y = 0; return out; }
      var cols = this.cols, rows = this.rows, c = this.cell;
      var gx = x / c, gy = y / c;
      if (gx < 0) gx = 0; else if (gx > cols - 2) gx = cols - 2;
      if (gy < 0) gy = 0; else if (gy > rows - 2) gy = rows - 2;
      var ix = gx | 0, iy = gy | 0;
      var fx = gx - ix, fy = gy - iy;
      var a = (iy * cols + ix) * 2;
      var b = a + 2;
      var c2 = ((iy + 1) * cols + ix) * 2;
      var d2 = c2 + 2;
      var w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
      out.x = vec[a] * w00 + vec[b] * w10 + vec[c2] * w01 + vec[d2] * w11;
      out.y = vec[a + 1] * w00 + vec[b + 1] * w10 + vec[c2 + 1] * w01 + vec[d2 + 1] * w11;
      return out;
    }
  };

  /* ============================================================
     【模块三】音频频谱解析模块
     ── 数据源有两种，本模块统一向外只交一份三频段数据（低频 / 中频 / 高频）：
        ① 用户在右下角面板上传的本地音乐（自己建 AudioContext 与 AnalyserNode）；
        ② 站点左下角歌单播放器已经在跑的那条链路（复用它算好的 window.__BEAT，
           避免对同一个 <audio> 元素重复 createMediaElementSource）。
     ── 输出四个值（全部做过 lerp 平滑，禁止硬跳变）：
        bass   低频重鼓包络   → 外扩 / 涡流强度 / 残影长度 / 云核爆亮 / 冲击波
        mid    中频旋律包络   → 旋臂回旋角速度 / 尘埃纤维扭曲 / 雾霭流速
        treble 高频亮音包络   → 流星与星屑迸发（只扰动近景层）
        pulse  低频起音脉冲   → 每一次鼓点的瞬时冲击
     ============================================================ */
  var Sound = {
    siteEl: null,      // 站点歌单的 <audio>
    ownEl: null,       // 本地上传曲目的 <audio>
    actx: null,
    analyser: null,
    arr: null,
    ownActive: false,

    bass: 0, mid: 0, treble: 0, pulse: 0, loud: 0,
    _b: 0, _m: 0, _t: 0, _pulse: 0,   // 内部包络（不缩放）；对外的 bass/mid/treble/pulse = 内部 × CFG.reactivity
    _prevRaw: 0, _slowRaw: 0, _lock: 0,
    _prevTre: 0, _slowTre: 0, _tLock: 0,

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
        // 站点歌单一开播，就交出主导权：本地曲目让位，避免两首歌一起放
        this.siteEl.addEventListener('playing', function () {
          if (self.ownEl && !self.ownEl.paused) self.ownEl.pause();
        });
      }
    },

    // 本地曲目：这条 <audio> 只走一次 createMediaElementSource（同一元素重复调用会报错）
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

    // 每帧调用一次：取原始能量 → 平滑包络 → 起音检测
    read: function (nowMs, d) {
      var rawB = 0, rawM = 0, rawT = 0;

      if (this.ownActive && this.analyser) {
        // ① 本地音乐：自己算三分频段
        this.analyser.getByteFrequencyData(this.arr);
        rawB = this.band(this.arr, 1, 8);      // ≈43–345Hz  底鼓 / 贝斯冲击区
        rawM = this.band(this.arr, 10, 60);    // ≈430Hz–2.6k 主旋律与人声
        rawT = this.band(this.arr, 70, 210);   // ≈3k–9kHz    细碎高音
      } else {
        // ② 站点歌单：直接读 player.js 已经算好的包络（缺哪个频段就按 0 处理）。
        // ⚠️ 拍点必须用 b.level —— player 在自己 60fps 帧率下算好的离散拍包络（冲顶立即/0.4s 回落）。
        //    曾用 b.lv（连续低频能量）自己二次检测：流行歌能量常年高企 → 包络饱和成"只呼吸不跳"，
        //    拍还常常踩不中，用户实测"律动老是失效 / 时有时无"。lv 只作老格式回退。
        var b = window.__BEAT;
        if (b) {
          rawB = (b.level != null) ? b.level : (b.lv || 0);
          rawM = b.mid || 0;
          rawT = b.treble || 0;
        }
      }

      // 包络：攻击快、释放慢，避免抖动，也避免"音乐一停画面就塌"。
      // 内部包络存 _b/_m/_t —— 对外的 bass/mid/treble 在帧尾统一乘 CFG.reactivity
      this._b += (rawB - this._b) * (rawB > this._b ? 0.30 : 0.055);
      this._m += (rawM - this._m) * (rawM > this._m ? 0.22 : 0.045);
      this._t += (rawT - this._t) * (rawT > this._t ? 0.34 : 0.07);

      // 起音检测（Δ上升速率 + 自适应门槛）：景象里"哐"一下重鼓
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

      // 【律动总闸】CFG.reactivity：对外包络统一乘它 —— 下游的外扩 / 涡流 / 云核爆亮 /
      // 拖尾伸缩 / 星芒放大 / 冲击波全部同比例收敛。检测与衰减始终用未缩放的内部值，
      // 所以收闸不影响"能不能检测到拍"，只影响"画面晃多狠"
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
     【模块四】涡流力场模块
     画布上同时存在 3~6 个正在缓慢漫游的漩涡源（位置不是固定的，用不同频率的利萨如 uite）。
     每个漩涡对周围粒子施加两个作用：
       切向扭转  (-dy, dx) * omega     → 把云絮拧成旋涡、把纤维拉弯
       径向排斥  ( dx, dy) * radial    → 低频重鼓时增强，把云团甩开、撕出裂隙
     两者都随距离二次衰减。强度 / 旋转半径 / 角速度实时读取音频 Shopify：
       低频 → 强度与径向排斥拉高；中频 → 角速度提高（旋臂缠绕）；静默 → 全部衰减，
       被撕开的云絮在"归位弹簧"的作用下缓慢重新聚拢愈合。
     ============================================================ */
  var Vortex = {
    list: [],
    _tmp: { x: 0, y: 0 },

    build: function (w, h) {
      var n = 3 + Math.floor(Math.random() * 3);   // 3~6 个
      this.list.length = 0;
      for (var i = 0; i < n; i++) {
        this.list.push({
          bx: rr(0.12, 0.88) * w,          // 漫游中心
          by: rr(0.14, 0.86) * h,
          wx: rr(0.10, 0.26) * w,          // 漫游幅度（缓慢移动，不是钉死在原地）
          wy: rr(0.10, 0.24) * h,
          sp: rr(0.035, 0.085),            // 漫游角速度
          ph: Math.random() * 6.283,
          base: rr(0.55, 1.0),             // 基础强度
          r0: rr(0.22, 0.46) * Math.min(w, h),
          dir: Math.random() < 0.5 ? -1 : 1,
          x: 0, y: 0, r: 1, omega: 0, radial: 0, strength: 0
        });
      }
      return this;
    },

    update: function (time, A) {
      for (var i = 0; i < this.list.length; i++) {
        var v = this.list[i];
        var t = time;
        // 位置漫游：两个不同频率的正弦，走出一条不闭合的缓慢轨迹
        v.x = v.bx + Math.cos(t * v.sp + v.ph) * v.wx;
        v.y = v.by + Math.sin(t * v.sp * 1.31 + v.ph * 1.7) * v.wy;
        // 半径与强度由频谱插值：低频让漩涡变大变猛，半径跟着低频一起呼吸
        v.r = v.r0 * (1 + A.bass * 0.22);
        v.strength = v.base * (0.5 + A.bass * 1.70 + A.pulse * 0.60);
        v.omega = v.dir * (0.85 + Sound.mid * 1.35) * (1 + A.bass * 0.5);   // 静默时也要看得见在转
        v.radial = 0.28 + A.bass * 1.90 + A.pulse * 0.90;
      }
      return this;
    },

    // 返回"期望速度"（px/帧）。调用方把它当成转向目标，天然不会越积越快
    force: function (x, y, out, mul) {
      var ox = 0, oy = 0;
      for (var i = 0; i < this.list.length; i++) {
        var v = this.list[i];
        var dx = x - v.x, dy = y - v.y;
        var d2 = dx * dx + dy * dy;
        if (d2 > v.r * v.r) continue;
        var d = Math.sqrt(d2) + 0.001;
        var f = 1 - d / v.r;
        var ff = f * f * v.strength * mul;
        ox += (-dy / d) * v.omega * ff;    // 切向：绕着漩涡转
        oy += (dx / d) * v.omega * ff;
        ox += (dx / d) * v.radial * ff;    // 径向：向外推开（低频时化作一次"甩"）
        oy += (dy / d) * v.radial * ff;
      }
      out.x = ox;
      out.y = oy;
      return out;
    }
  };

    /* ============================================================
       【模块三·半】指针交互模块
       —— 指针是一枚随手的"引力搅棒"（3D 舞台移除后，交互性由星河自己接棒）：
          · 移动：附近星尘 / 云絮被指针的移动方向拖带 + 绕指微涡，归位弹簧负责复原
          · 按下：一次脉冲 —— 半径内的星被踹散再吸回 + 一圈涟漪 + 一簇星屑
            （只在点空白处触发；点链接 / 按钮 / 面板不打扰）
       幅度全挂 CFG（pointerStir / pointerKick / pointerRadius）；
       一切都是"期望速度"参与 lerp，无硬跳变；停手 1.6 秒后扰动自然熄灭。
       ============================================================ */
    var Pointer = {
      tx: -1, ty: -1,         // 目标位置（事件直写）
      x: -9999, y: -9999,     // 平滑后的位置
      vx: 0, vy: 0,           // 平滑后的指针速度（≈60fps 帧位移），用于"拖带"
      live: 0,                // 活跃度 0..1：动了就升、停手降到 CFG.pointerFloor（移出窗口才归零）
      lastMove: 0,
      wakeAcc: 0,             // 划过的路程累计：够一格就撒一粒星屑
      out: false,             // 指针是否已移出窗口

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

      // 每帧：位置 / 速度平滑 + 活跃度衰减（用真实 dt，不乘 motion——输入响应不该被降速）
      update: function (dt) {
        if (this.x < -999) return;
        var k = Math.min(1, dt * 6);
        var nx = this.x + (this.tx - this.x) * k;
        var ny = this.y + (this.ty - this.y) * k;
        this.vx = (nx - this.x) / Math.max(dt, 0.001) * 0.016;
        this.vy = (ny - this.y) / Math.max(dt, 0.001) * 0.016;
        this.x = nx; this.y = ny;
        var idle = performance.now() - this.lastMove;
        // 停手 4s 后渐熄，但留一格 CFG.pointerFloor 的常驻微搅（不放歌时全靠它撑交互感）；
        // 只有指针移出窗口才彻底归零，免得在窗口边缘留一个永远在搅的位点
        var want = this.out ? 0 : (idle < 4000 ? 1 : Math.max(CFG.pointerFloor, 1 - (idle - 4000) / 2000));
        this.live += (want - this.live) * Math.min(1, dt * 3);
        // 快速划过：沿轨迹撒一串转瞬星屑。不放歌时这是最直观的"我在动它"的反馈
        if (CFG.pointerWake > 0 && this.live > 0.4) {
          var sp = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
          if (sp > 5) {
            this.wakeAcc += sp;
            if (this.wakeAcc > 24) { this.wakeAcc = 0; popSpark(this.x, this.y, 2); }
          } else this.wakeAcc = 0;
        }
      },

      // 搅动：拖带（沿指针速度）+ 绕指微涡 + 轻微外推。
      // 静止悬停也有存在感：微涡不依赖指针速度——光标就是一枚停在星空里的小涡；
      // 衰减用 ^1.5（比 ^2 铺得开些），交互范围别"一小会就没"
      force: function (x, y, out) {
        var dx = x - this.x, dy = y - this.y;
        var d2 = dx * dx + dy * dy, R = CFG.pointerRadius;
        if (this.live <= 0.02 || d2 > R * R) { out.x = 0; out.y = 0; return out; }
        var d = Math.sqrt(d2) + 0.001;
        var f = Math.pow(1 - d / R, 1.5) * this.live * CFG.pointerStir;
        out.x = this.vx * f * 2.2 + (-dy / d) * f * 0.85 + (dx / d) * f * 0.22;
        out.y = this.vy * f * 2.2 + ( dx / d) * f * 0.85 + (dy / d) * f * 0.22;
        return out;
      },

      // 点击脉冲：半径内直接踹一脚速度（近强远弱 + 少许随机方向），弹簧慢慢拉回
      kick: function (kx, ky) {
        var R = CFG.pointerRadius * 1.5;
        var lists = [layer.arm, layer.dust, layer.mote, layer.fiber, layer.faint, layer.bright, layer.far, layer.mist];
        var mul = [1.15, 1.10, 1.00, 0.90, 0.50, 0.55, 0.35, 0.30];
        for (var L = 0; L < lists.length; L++) {
          var list = lists[L], m = mul[L];
          for (var i = 0; i < list.length; i++) {
            var p = list[i];
            var dx = p.x - kx, dy = p.y - ky;
            var d = Math.sqrt(dx * dx + dy * dy) || 1;
            if (d > R) continue;
            var f = (1 - d / R); f = f * f * 3.4 * m * CFG.pointerKick;
            p.vx += (dx / d) * f + (Math.random() - 0.5) * f * 0.5;
            p.vy += (dy / d) * f + (Math.random() - 0.5) * f * 0.5;
          }
        }
        spawnRingAt(kx, ky);   // 一圈涟漪
        popSpark(kx, ky); popSpark(kx, ky);   // 两簇转瞬星屑
        fired.kick++;
      }
    };

    /* ============================================================
       1. 画布尺寸 / 精灵表 / 后处理缓冲
     ============================================================ */
  var W = 0, H = 0, DPR = 1, S = 1;         // S：把光斑半径换算到不同屏幕的统一尺度
  var CX = 0, CY = 0, DIAG = 1000;          // 画面中心与对角线
    var bloom = null, bloomCtx = null;        // 低分辨率副本，用于体积辉光与色差
    var grainPat = null;
  var supportsFilter = false, supportsBlend = false;

  function makeSprite(r, g, b, size, prof) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g2 = c.getContext('2d');
    var half = size / 2;
    var grd = g2.createRadialGradient(half, half, 0, half, half, half);
    var col = function (a) { return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; };
    if (prof === 1) {
      // 星点：亮核 + 收敛较快的柔晕（没有硬边）
      grd.addColorStop(0, col(1));
      grd.addColorStop(0.10, col(0.62));
      grd.addColorStop(0.28, col(0.16));
      grd.addColorStop(0.60, col(0.025));
      grd.addColorStop(1, col(0));
    } else if (prof === 2) {
      // 星芒 / 云核光晕：极柔，用来铺大范围的弥散光
      grd.addColorStop(0, col(0.62));
      grd.addColorStop(0.22, col(0.20));
      grd.addColorStop(0.52, col(0.055));
      grd.addColorStop(1, col(0));
    } else {
      // 云絮（默认）：体积感的软核，边缘拖得很长，叠加后才有气体的绵密感
      grd.addColorStop(0, col(1));
      grd.addColorStop(0.16, col(0.60));
      grd.addColorStop(0.38, col(0.19));
      grd.addColorStop(0.66, col(0.048));
      grd.addColorStop(1, col(0));
    }
    g2.fillStyle = grd;
    g2.fillRect(0, 0, size, size);
    return c;
  }

  // 调色板：在若干锚点色之间环向取值 → 调色 idx 时颜色在紫 / 靛 / 洋红之间平滑 lerp，不会生硬跳色
  function buildPalette(anchors, steps, spriteSize, prof) {
    var out = [];
    for (var i = 0; i < steps; i++) {
      var t = (i / steps) * anchors.length;
      var i0 = Math.floor(t), i1 = (i0 + 1) % anchors.length;
      var f = t - i0;
      var a = anchors[i0], b = anchors[i1];
      var r = Math.round(lerp(a[0], b[0], f));
      var g = Math.round(lerp(a[1], b[1], f));
      var bl = Math.round(lerp(a[2], b[2], f));
      out.push(makeSprite(r, g, bl, spriteSize, prof));
    }
    return out;
  }

  var PAL_FAR = null;   // 远景分子云：低饱和暗紫罗兰 / 灰靛蓝 / 灰紫青，零星一抹极淡酒红
  var PAL_ARM = null;   // 中景旋臂：蓝 → 紫 → 洋红
  var SPR_DUST = null;  // 暗色尘埃带：深灰紫
  var SPR_STAR = null;  // 星点（三种色温）
  var SPR_HALO = null;  // 柔和弥散光晕
  var SPR_MIST = null;  // 冷雾霭
  var STEPS = 16;

  function buildSprites() {
    PAL_FAR = buildPalette([
      [108, 92, 156],    // 暗紫罗兰
      [82, 104, 158],    // 灰靛蓝
      [104, 116, 156],   // 灰紫青
      [126, 88, 118]     // 极淡的酒红倾向
    ], STEPS, 96, 0);
    PAL_ARM = buildPalette([
      [74, 96, 168],     // 靛蓝
      [110, 88, 168],    // 蓝紫
      [148, 92, 152],    // 紫洋红
      [96, 110, 176]     // 收回蓝，闭合出循环渐变
    ], STEPS, 96, 0);
    SPR_DUST = buildPalette([[24, 22, 40], [34, 28, 52], [22, 20, 36]], 4, 96, 0);
    SPR_STAR = [
      makeSprite(226, 236, 255, 64, 1),
      makeSprite(255, 255, 255, 64, 1),
      makeSprite(255, 232, 216, 64, 1),
      makeSprite(196, 210, 255, 64, 1),   // 蓝紫
      makeSprite(255, 214, 170, 64, 1)    // 琥珀
    ];
    SPR_HALO = makeSprite(178, 206, 255, 128, 2);
    SPR_MIST = makeSprite(84, 116, 172, 128, 2);
  }

  // 胶片颗粒：一张 256 的噪声贴图，平铺到全屏。
  // 注意这里只在"离屏贴图上"做随机，主画布依然禁止 clearRect 强清空。
  function buildGrain() {
    var size = 256;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    var img = g.createImageData(size, size);
    for (var i = 0; i < size * size; i++) {
      var v = 128 + ((Math.random() - 0.5) * 46) | 0;
      var k = i * 4;
      img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = v; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    grainPat = ctx.createPattern(c, 'repeat');
  }

  // 暗角 + 冷蓝环境辉光：CSS 静态层（.cosmos-veil），零每帧开销。
  // 以前这两样逐帧画在画布上（一次全屏暗角 drawImage + 一团全屏级雾霭精灵），
  // 改成 CSS 之后每帧省掉两次全屏级填充，低配机直接受益。
  // ⚠️ 几何必须逐像素复刻旧画布的"圆形"渐变（canvas 的 createRadialGradient 是圆不是椭圆），
  //    且随 resize 重建——曾经换成百分比椭圆：暗角把上下边缘压得过重、辉光摊得太开，
  //    真机 GPU 上整片天空发雾、星星全部晕开，被用户一眼识破"效果浮夸"。
  // 层序：.cosmos-veil 挂在 body 末尾、z-index:-1 —— 盖住画布(-2)与 3D 舞台(-1 且 DOM 更早)，
  // 仍压在全部正文之下；pointer-events:none 不挡任何交互。
  function buildVeil() {
    var v = document.getElementById('cosmos-veil');
    if (!v) {
      v = document.createElement('div');
      v.id = 'cosmos-veil';
      v.className = 'cosmos-veil';
      v.setAttribute('aria-hidden', 'true');
      document.body.appendChild(v);
    }
    // 环境辉光：复刻旧雾霭精灵的径向轮廓（中心 0.62 峰值快速衰减，到精灵半径处归零）
    var glowR = Math.round(Math.max(W, H) * 1.44);
    // 暗角：复刻原画布渐变——内半径 min*0.22，外半径 max*0.78，三段 0 / 0.16 / CFG.vignette
    var inner = Math.round(Math.min(W, H) * 0.22);
    var outer = Math.round(Math.max(W, H) * 0.78);
    var mid = Math.round(inner + (outer - inner) * 0.62);
    v.style.background =
      'radial-gradient(circle ' + glowR + 'px at 50% 50%, rgba(96,128,186,0.10), rgba(96,128,186,0.035) 11%, rgba(96,128,186,0.01) 26%, rgba(96,128,186,0) 50%), ' +
      'radial-gradient(circle ' + outer + 'px at 50% 50%, rgba(0,2,7,0) ' + inner + 'px, rgba(0,2,7,0.16) ' + mid + 'px, rgba(0,2,7,' + CFG.vignette + ') ' + outer + 'px)';
  }

  function resizeCanvas() {
    W = window.innerWidth || document.documentElement.clientWidth || 1024;
    H = window.innerHeight || document.documentElement.clientHeight || 720;
    // 像素预算：背景层不需要太高清晰度，超过预算就降采样（这块也是低配机的主要保护）
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    var budget = 2400000;
    var px = W * H * DPR * DPR;
    if (px > budget) DPR = Math.sqrt(budget / (W * H));
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    S = Math.min(W, H) / 860;                 // 半径换算系数：小屏幕自动收紧
    CX = W * 0.5; CY = H * 0.5;
    DIAG = Math.sqrt(W * W + H * H);

    bloom = document.createElement('canvas');
    bloom.width = Math.max(2, Math.round(W / 4));
    bloom.height = Math.max(2, Math.round(H / 4));
    bloomCtx = bloom.getContext('2d');

    Flow.resize(W, H);
    buildVeil();
    supportsFilter = ('filter' in ctx);
    supportsBlend = (function () {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      var ok = ctx.globalCompositeOperation === 'overlay';
      ctx.restore();
      return ok;
    })();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000007';
    ctx.fillRect(0, 0, W, H);
  }

  /* ============================================================
     2. 场景：四层天体
     ============================================================ */
  var layer = {
    far: [],      // 层1 远景巨型分子云
    fiber: [],    // 层1 内部暗色气体纤维（沟壑）
    arm: [],      // 层2 旋臂絮团（含云核）
    dust: [],     // 层2 暗色星际尘埃带（切割星云的阻隔条）
    faint: [],    // 层3 暗弱背景繁星
    bright: [],   // 层3 明亮恒星
    meteor: [],   // 层3 瞬时流星
    spark: [],    // 层3 流星尾端散落的星屑
    mote: [],     // 层4 亚像素尘埃微粒
    mist: [],     // 层4 冷雾霭团
    cluster: []   // 星团：一群抱团的星 + 一层集体微光（细节层，跟着领队星漂移）
  };
    var rings = [];               // 低频冲击波：环形扩散光晕
    // 累计触发计数（探针用）：流星/星屑这类短命天体在低帧率软渲染下诞生即燃尽，
    // 活体计数永远抓不到，只有累计数能证明"高频确实触发了它们"
    var fired = { meteor: 0, spark: 0, ring: 0, kick: 0 };
  var quality = 1;              // 性能档（0.5~1）
  var introStart = 0, introT = 1;
  var time = 0;
  var mistFlow = 1;             // 层4 流场牵引倍率：中频越快雾霭飘得越快（探针 info().flow 直读）
    var tmpA = { x: 0, y: 0 }, tmpB = { x: 0, y: 0 }, tmpC = { x: 0, y: 0 };

  function baseRand(count) {
    var arr = [];
    for (var i = 0; i < count; i++) arr.push({});
    return arr;
  }

  // 活体计数：对象池里 life>0 的个数（探针按类别统计用）
  function liveCount(list) {
    var n = 0;
    for (var i = 0; i < list.length; i++) if (list[i].life > 0) n++;
    return n;
  }

  // 给粒子写入入场起点：从画面四周之外被"拉"向中央的路途中出现
  function seedIntro(p) {
    var ang = Math.random() * 6.283;
    var dist = DIAG * rr(0.62, 1.05);
    p.sx = CX + Math.cos(ang) * dist;
    p.sy = CY + Math.sin(ang) * dist;
    p.dy = Math.random() * 0.55;                 // 各自错开出发，避免"齐步走"
  }

  function newHome(x, y) {
    return { x: x, y: y, vx: 0, vy: 0, hx: x, hy: y, sx: x, sy: y, dy: 0 };
  }

  /* —— 层1：远景巨型分子星云 —— */
  function buildFar(counts) {
    layer.far.length = 0;
    layer.fiber.length = 0;
    var i, p;
    for (i = 0; i < counts.far; i++) {
      p = newHome(Math.random() * W, Math.random() * H);
      p.r = rr(58, 165) * S;                     // 大块头：远景是舒展的巨大面，不是一堆碎点
      p.a = rr(0.020, 0.050) * CFG.intensity;    // 单层亮度压得很低，靠叠加出体积
      p.k = rr(0.0055, 0.0110);                  // 归位弹簧：远景偏软，回缩很慢
      p.flow = rr(0.18, 0.46);                   // 流场牵引（基础漂移：慢到看不见就等于静态壁纸）
      p.vtx = rr(0.10, 0.26);                    // 涡流对远景只有微弱扰动
      p.push = rr(0.02, 0.06);                   // 低频外扩的响应幅度
      p.elong = rr(1.2, 2.4);                    // 顺着气流拉伸 → 不是圆滚滚的一坨
      p.ang = Math.random() * 6.283;
      p.cs = Math.random() * STEPS;              // 调色板起点，逐帧偏移做色彩扰动
      p.ph = Math.random() * 100;
      seedIntro(p);
      layer.far.push(p);
    }
    // 内部暗色气体纤维：稀疏、细长，被 coverage 拉开后 形成 "沟壑" 结构
    for (i = 0; i < counts.fiber; i++) {
      p = newHome(Math.random() * W, Math.random() * H);
      p.r = rr(16, 46) * S;
      p.a = rr(0.030, 0.075) * CFG.intensity;
      p.k = rr(0.004, 0.009);
      p.flow = rr(0.28, 0.66);
      p.vtx = rr(0.16, 0.40);
      p.push = rr(0.03, 0.09);
      p.elong = rr(3.0, 7.5);                    // 拉得很长 → 纤维
      p.ang = Math.random() * 6.283;
      p.cs = Math.random() * 4;
      p.ph = Math.random() * 100;
      seedIntro(p);
      layer.fiber.push(p);
    }
  }

  /* —— 层2：旋臂絮团 + 暗色尘埃带（画面主体星河）—— */
  var ARMS = 3;                 // 三条松散旋臂
  var SPAN = 3.5;               // 每段旋臂覆盖的角度
  var K_SPIRAL = 0.30;
  var R0_BASE = 26;
  var FLATTEN = 0.62;           // 星盘压扁：像斜看的盘面
  var ROLL = -0.42;             // 整体滚转角
  var GCX = 0, GCY = 0, GR = 1; // 星系中心与半径
  var spin = 0;                 // 星盘自转角

  function armPoint(armIdx, th, rad) {
    // 对数螺旋：r = R0 * e^(kθ)。三条旋臂各差一个相位
    var base = th + armIdx * (6.283 / ARMS);
    var ux = Math.cos(base), uy = Math.sin(base) * FLATTEN;
    var cr = Math.cos(ROLL), sr = Math.sin(ROLL);
    var rx = ux * cr - uy * sr;
    var ry = ux * sr + uy * cr;
    return { x: GCX + rx * rad, y: GCY + ry * rad, ux: rx, uy: ry };
  }

  function buildArms(counts) {
    layer.arm.length = 0;
    layer.dust.length = 0;
    GCX = CX + rr(-0.06, 0.06) * W;
    GCY = CY + rr(-0.06, 0.06) * H;
    GR = Math.min(W, H) * rr(0.72, 0.95);

    var i = 0, tries = 0, cores = 0, maxCores = cnt(GR / (70 * S), 8, 20);
    while (i < counts.arm && tries < counts.arm * 8) {
      tries++;
      var armIdx = (Math.random() * ARMS) | 0;
      var th = Math.random() * SPAN;
      var rad = R0_BASE * Math.exp(K_SPIRAL * th) * rr(0.65, 1.45) * (GR / 520);
      if (rad > GR * 1.25) continue;
      // 大尺度噪声决定"这里有没有云絮"：低于门槛就留空 → 旋臂是断续的絮段，不是一条平滑带子
      var dimp = armIdx * 37.1;
      var big = Noise.fbm2(Math.cos(th) * rad * 0.0055 + dimp, Math.sin(th) * rad * 0.0055, 3);
      if (big < -0.04) continue;
      // 高频噪声决定絮团内部的明暗 → 细碎丝状电离气流
      var fine = Noise.noise2(th * 9.1 + dimp, rad * 0.021);
      var pt = armPoint(armIdx, th, rad);
      var p = newHome(pt.x, pt.y);
      p.th = th;
      p.rad = rad;
      p.armIdx = armIdx;
      p.r = rr(7, 26) * S * (0.7 + big * 0.6);
      p.a = rr(0.024, 0.062) * CFG.intensity * (0.55 + (fine * 0.5 + 0.5) * 0.75);
      p.k = rr(0.010, 0.024);
      p.flow = rr(0.18, 0.42);
      p.vtx = rr(0.55, 1.15);                   // 近的主体层：涡流撕扯最明显
      p.push = rr(0.05, 0.14);
      p.elong = rr(1.3, 3.2);
      p.ang = Math.random() * 6.283;
      p.cs = Math.random() * STEPS;
      p.ph = Math.random() * 100;
      p.core = false;
      if (big > 0.20 && cores < maxCores) {      // 致密发光结节：局部高亮云核
        p.core = true;
        p.r *= rr(1.5, 2.3);
        p.a *= rr(1.4, 2.1);
        cores++;
      }
      seedIntro(p);
      layer.arm.push(p);
      i++;
    }

    // 暗色尘埃带：贴着旋臂前后缘，第三方噪声控制疏密，负责"切割"星云、制造明暗对比
    for (i = 0; i < counts.dust; i++) {
      var armIdx2 = (Math.random() * ARMS) | 0;
      var th2 = Math.random() * SPAN;
      var rad2 = R0_BASE * Math.exp(K_SPIRAL * th2) * rr(0.7, 1.4) * (GR / 520);
      if (rad2 > GR * 1.2) continue;
      var d2v = Noise.fbm2(Math.cos(th2) * rad2 * 0.0042 + 91.3, Math.sin(th2) * rad2 * 0.0042, 2);
      if (d2v < -0.10) continue;
      var off = rr(-1, 1) * (14 + d2v * 40) * S;
      var pt2 = armPoint(armIdx2, th2, rad2 + off);
      var q = newHome(pt2.x, pt2.y);
      q.th = th2;
      q.rad = rad2 + off;
      q.armIdx = armIdx2;
      q.r = rr(10, 34) * S;
      q.a = rr(0.030, 0.085) * CFG.intensity;
      q.k = rr(0.008, 0.016);
      q.flow = rr(0.11, 0.32);
      q.vtx = rr(0.35, 0.85);
      q.push = rr(0.06, 0.16);
      q.elong = rr(2.6, 5.5);
      q.ang = Math.random() * 6.283;
      q.cs = Math.random() * 4;
      q.ph = Math.random() * 100;
      seedIntro(q);
      layer.dust.push(q);
    }
  }

  /* —— 层3：星辰三类 + 星团（细节层） —— */
  function buildStars(counts) {
    layer.faint.length = 0;
    layer.bright.length = 0;
    layer.cluster.length = 0;
    var i, p;
    // ① 暗弱背景繁星：数量最多，闪烁相位与速度完全随机，绝不同步
    for (i = 0; i < counts.faint; i++) {
      p = newHome(Math.random() * W, Math.random() * H);
      p.r = rr(0.35, 1.25) * Math.max(0.75, S);
      p.a = rr(0.10, 0.34) * CFG.intensity;
      p.k = rr(0.004, 0.010);
      p.flow = rr(0.04, 0.13);                  // 星辰也被气流轻微拖拽：不是孤立的悬浮点
      p.vtx = rr(0.04, 0.14);
      p.push = rr(0.01, 0.05);
      p.tw = Math.random() * 6.283;             // 相位
      p.tws = rr(0.014, 0.050);                 // 各自的速度 → 微弱呼吸，不同步（慢到 30 秒一轮会读成"死的"）
      p.spr = (Math.random() * SPR_STAR.length) | 0;
      seedIntro(p);
      layer.faint.push(p);
    }
    // ①′ 星团：几颗到十几颗星抱团 + 一位较亮的领队 + 一层集体微光。
    //    深空实拍里星很少均匀撒——"这里一撮、那里一撮"的成团感是细节的关键来源
    for (i = 0; i < counts.cluster; i++) {
      var cx2 = Math.random() * W, cy2 = Math.random() * H;
      var mem = 6 + ((Math.random() * 7) | 0);
      var CR = rr(14, 38);
      for (var mI = 0; mI < mem; mI++) {
        var lead = mI === 0;
        var ox = (Math.random() + Math.random() - 1) * CR;   // 双随机叠加：向心聚拢的高斯感
        var oy = (Math.random() + Math.random() - 1) * CR * 0.8;
        p = newHome(clamp(cx2 + ox, 0, W), clamp(cy2 + oy, 0, H));
        p.r = (lead ? rr(1.4, 2.2) : rr(0.4, 1.0)) * Math.max(0.75, S);
        p.a = (lead ? rr(0.40, 0.60) : rr(0.12, 0.30)) * CFG.intensity;
        p.k = rr(0.004, 0.010);
        p.flow = rr(0.04, 0.13);
        p.vtx = rr(0.04, 0.14);
        p.push = rr(0.01, 0.05);
        p.tw = Math.random() * 6.283;
        p.tws = rr(0.014, 0.046);
        p.spr = (Math.random() * SPR_STAR.length) | 0;
        seedIntro(p);
        layer.faint.push(p);
        if (lead) layer.cluster.push({ star: p, r: rr(26, 52), a: rr(0.05, 0.09) });   // 微光挂在领队星上
      }
    }
    // ② 明亮恒星：多层嵌套径向柔化光晕 + 四向弥散微光（不是硬十字）
    for (i = 0; i < counts.bright; i++) {
      p = newHome(Math.random() * W, Math.random() * H);
      p.r = rr(1.3, 2.6) * Math.max(0.8, S);
      p.halo = rr(11, 26) * S;
      p.a = rr(0.34, 0.62) * CFG.intensity;
      p.k = rr(0.004, 0.010);
      p.flow = rr(0.04, 0.11);
      p.vtx = rr(0.04, 0.12);
      p.push = rr(0.01, 0.05);
      p.tw = Math.random() * 6.283;
      p.tws = rr(0.016, 0.044);
      p.spr = (Math.random() * SPR_STAR.length) | 0;
      p.rot = Math.random() * 3.14;             // 星芒朝向
      seedIntro(p);
      layer.bright.push(p);
    }
    // ③ 流星与星屑：对象池，平时空着，高频触发才点亮
    layer.meteor = baseRand(8);
    for (i = 0; i < 8; i++) layer.meteor[i].life = 0;
    layer.spark = baseRand(70);
    for (i = 0; i < 70; i++) layer.spark[i].life = 0;
  }

  /* —— 层4：全局漂浮超细星际尘埃 —— */
  function buildMotes(counts) {
    layer.mote.length = 0;
    layer.mist.length = 0;
    var i, p;
    for (i = 0; i < counts.mote; i++) {
      p = newHome(Math.random() * W, Math.random() * H);
      p.r = rr(0.5, 1.7) * Math.max(0.8, S);
      p.a = rr(0.05, 0.16) * CFG.intensity;
      p.k = rr(0.002, 0.006);
      p.flow = rr(0.25, 0.70);
      p.vtx = rr(0.20, 0.55);
      p.push = rr(0.02, 0.08);
      p.cs = Math.random() * STEPS;
      seedIntro(p);
      layer.mote.push(p);
    }
    // 少数几团极淡冷雾：填充深空空隙、柔化星云边缘，负责兜住整幅画面的空气感
    for (i = 0; i < 5; i++) {
      p = newHome(Math.random() * W, Math.random() * H);
      p.r = rr(180, 340) * S;
      p.a = rr(0.008, 0.017) * CFG.intensity;   // 冷雾霭再淡一档：大圆盘太实会读成"炫光圆斑"
      p.k = rr(0.0015, 0.004);
      p.flow = rr(0.18, 0.46);
      p.vtx = rr(0.10, 0.30);
      p.push = rr(0.01, 0.04);
      seedIntro(p);
      layer.mist.push(p);
    }
  }

  function countPlan() {
    var area = W * H;
    var mob = W < 720 ? 0.55 : 1;              // 手机端进一步压密度
    var q = quality * mob * CFG.density;
    return {
      far: cnt(area / 11000 * q, 60, 220),
      fiber: cnt(area / 21000 * q, 24, 130),
      arm: cnt(area / 4200 * q, 150, 620),
      dust: cnt(area / 12000 * q, 36, 190),
      faint: cnt(area / 3400 * q, 170, 620),
      bright: cnt(area / 62000 * q, 10, 34),
      mote: cnt(area / 7000 * q, 80, 320),
      cluster: cnt(area / 260000 * q, 6, 14)
    };
  }

  function buildScene(freshSeed, keepIntro) {
    if (freshSeed) Noise.seed((Math.random() * 0xffffffff) >>> 0);
    var counts = countPlan();
    buildFar(counts);
    buildArms(counts);
    buildStars(counts);
    buildMotes(counts);
    Vortex.build(W, H);
    rings.length = 0;
    // 只有首启动与「重置星河」才重播"四周汇聚 → 宇宙成型"；
    // 改窗口尺寸、性能降档属于悄悄重建，直接跳过入场，免得画面忽然塌一下又聚起来。
    if (keepIntro) { introT = 1; }
    else { introStart = performance.now(); introT = 0; }
  }

  /* ============================================================
     3. 物理步进：所有天体共用一套"引导 + 弹簧 + 涡流 + 阻尼"
     ============================================================ */
  // fm：流场牵引倍率（层4 专用 —— 中频旋律一来，冷雾霭与尘埃微粒的流动速度加快）
  function stepParticles(list, d, A, useArm, fm) {
    for (var i = 0; i < list.length; i++) {
      var p = list[i];

      // 旋臂层：home 位置每帧由 (θ, r) 重新算 → 星盘自转 + 低频整体外扩
      if (useArm) {
        var th = p.th + spin;
        var rad = p.rad * (1 + A.bass * 0.05);
        var pt = armPoint(p.armIdx, th, rad);
        p.hx = pt.x;
        p.hy = pt.y;
      }

      // ① 流场：把每个粒子的速度往"当地气流方向"拉（星辰也一样会顺着气流偏移）
      Flow.sample(p.x, p.y, tmpA);
      var fl = fm ? p.flow * fm : p.flow;
      p.vx += (tmpA.x * fl - p.vx) * 0.05 * d;
      p.vy += (tmpA.y * fl - p.vy) * 0.05 * d;

      // ② 涡流：切向扭转 + 径向排斥，作为"期望速度"注入
      Vortex.force(p.x, p.y, tmpB, p.vtx);
      p.vx += (tmpB.x - p.vx) * 0.09 * d;
      p.vy += (tmpB.y - p.vy) * 0.09 * d;

      // ②′ 指针搅动：同为期望速度注入——鼠标/手指划过时星尘被拖带绕指，停手 1.6s 熄灭
      if (Pointer.live > 0.02) {
        Pointer.force(p.x, p.y, tmpC);
        p.vx += (tmpC.x - p.vx) * 0.10 * d;
        p.vy += (tmpC.y - p.vy) * 0.10 * d;
      }

      // ③ 归位弹簧：被撕开之后缓慢重新聚拢愈合的唯一动力
      p.vx += (p.hx - p.x) * p.k * d;
      p.vy += (p.hy - p.y) * p.k * d;

      // ④ 低频整体向外扩张（远景层响应最弱，近景最强）
      var rx = p.x - CX, ry = p.y - CY;
      var rd = Math.sqrt(rx * rx + ry * ry) || 1;
      var push = p.push * (A.bass * 0.90 + A.pulse * 1.25);
      p.vx += (rx / rd) * push * d;
      p.vy += (ry / rd) * push * d;

      // ⑤ 阻尼 + 位移
      var damp = Math.pow(0.93, d);
      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * d;
      p.y += p.vy * d;
    }
  }

  // 入场进度：每个粒子各走一段 easeOutCubic，整体从四周汇聚到中心
  function introEase(p) {
    if (introT >= 1) return 1;
    var span = 1 - p.dy;
    var local = clamp((introT - p.dy) / (span < 0.05 ? 0.05 : span), 0, 1);
    return easeOut3(local);
  }

  function introXY(p, out) {
    var e = introEase(p);
    if (e >= 1) { out.x = p.x; out.y = p.y; return out; }
    out.x = p.sx + (p.x - p.sx) * e;
    out.y = p.sy + (p.y - p.sy) * e;
    return out;
  }

  /* ============================================================
     【模块五】渲染循环模块
     帧序严格依赖这条流水线：
       ① 衰减擦除（永远不用 clearRect）
       ② 冷蓝环境辉光 —— 在 CSS 静态层 .cosmos-veil，画布内不再画
       ③ 层1 暗纤维 → 层1 分子云
       ④ 层2 尘埃带 → 层2 旋臂云絮 + 云核
       ⑤ 层3 星辰 / 流星 / 星屑
       ⑥ 层4 尘埃及雾霭
       ⑦ 低频环形冲击波
       ⑧ 后处理：体积辉光（每 N 帧）→ 微弱色差 → 胶片颗粒（暗角在 CSS 层）
     ============================================================ */
  var _pt = { x: 0, y: 0 };

  function drawSprite(spr, x, y, r, alpha, ang, elong) {
    if (alpha <= 0.002 || r <= 0.2) return;
    ctx.globalAlpha = alpha > 1 ? 1 : alpha;
    if (elong && elong > 1.05) {
      // 拉长：把软核 sprite 沿气流方向压成一缕（这才是"纤维/尘埃带"的形状来源）
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.drawImage(spr, -r * elong, -r, r * 2 * elong, r * 2);
      ctx.restore();
    } else {
      ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
    }
  }

  function updateParticles(d, A) {
    // 星盘自转：中频旋律一来，整个旋臂缠绕回旋，静默时回落到基础角速度
    spin += (0.00055 + Sound.mid * 0.0048 + A.pulse * 0.0018) * d;
    Vortex.update(time, A);
    stepParticles(layer.far, d, A, false);
    stepParticles(layer.fiber, d, A, false);
    stepParticles(layer.arm, d, A, true);
    stepParticles(layer.dust, d, A, true);
    stepParticles(layer.faint, d, A, false);
    stepParticles(layer.bright, d, A, false);
    // 层4 的中频响应：雾霭与尘埃微粒顺着气流加快流动（静默时倍率回到 1，飘荡重新慢下来）
    mistFlow = 1 + Sound.mid * 0.9;
    stepParticles(layer.mote, d, A, false, mistFlow);
    stepParticles(layer.mist, d, A, false, mistFlow);
    updateMeteors(d, A);
  }

  // 流星：仅由高频音符触发生成；拖尾加法叠加衰减；尾端散落一小簇转瞬即逝的星屑
  function spawnMeteor() {
    for (var i = 0; i < layer.meteor.length; i++) {
      var m = layer.meteor[i];
      if (m.life > 0) continue;
      var fromLeft = Math.random() < 0.6;
      m.x = fromLeft ? rr(-0.1, 0.7) * W : rr(0.3, 1.1) * W;
      m.y = rr(-0.1, 0.55) * H;
      var ang = rr(0.45, 1.0) * (fromLeft ? 1 : -1) + (fromLeft ? 0 : Math.PI);
      m.vx = Math.cos(ang) * rr(5.5, 11);
      m.vy = Math.abs(Math.sin(ang)) * rr(5.5, 11);
      m.len = rr(26, 70);
      m.life = 1;
      m.decay = rr(0.010, 0.022);
      m.w = rr(0.7, 1.7) * Math.max(0.8, S);
      fired.meteor++;
      return;
    }
  }

  function popSpark(x, y, want) {
    var n = want || (5 + ((Math.random() * 5) | 0));
    for (var i = 0; i < layer.spark.length && n > 0; i++) {
      var s = layer.spark[i];
      if (s.life > 0) continue;
      s.x = x + rr(-8, 8);
      s.y = y + rr(-8, 8);
      s.vx = rr(-0.5, 0.5);
      s.vy = rr(-0.5, 0.5);
      s.r = rr(0.5, 1.6);
      s.life = 1;
      s.decay = rr(0.02, 0.06);
      fired.spark++;
      n--;
    }
  }

  function updateMeteors(d, A) {
    if (Sound.trebleEdge && Math.random() < 0.55) spawnMeteor();
    var i, m;
    for (i = 0; i < layer.meteor.length; i++) {
      m = layer.meteor[i];
      if (m.life <= 0) continue;
      m.x += m.vx * d;
      m.y += m.vy * d;
        m.life -= m.decay * d * 60;
        var oob = m.y > H + 60 || m.x < -160 || m.x > W + 160;
        if (m.life <= 0 || oob) {
          // 轨迹末端散落一小簇闪光星屑（燃尽才撒；飞出画面的不算）
          if (m.life <= 0 && !oob) popSpark(m.x, m.y);
          m.life = 0;
        }
    }
    for (i = 0; i < layer.spark.length; i++) {
      var s = layer.spark[i];
      if (s.life <= 0) continue;
      s.x += s.vx * d;
      s.y += s.vy * d;
      s.life -= s.decay * d * 60;
    }
  }

  function spawnRing(A) { spawnRingAt(CX, CY); }
  // 涟漪：节拍从星河中心荡开，点击从指尖荡开（同一对象池）
  function spawnRingAt(x, y) {
    if (rings.length > 5) rings.shift();
    rings.push({ x: x, y: y, r: Math.min(W, H) * 0.05, life: 1 });
    fired.ring++;
  }

  function drawLayer1(A, ia) {
    var i, p, alpha, ease;
    // 3.1 暗色气体纤维：先用 source-over 压暗，在残影上犁出明暗沟壑，云体内才会出现裂隙感
    ctx.globalCompositeOperation = 'source-over';
    for (i = 0; i < layer.fiber.length; i++) {
      p = layer.fiber[i];
      introXY(p, _pt);
      // 一路独立的低频噪声：决定哪些位置稀薄消散成空洞
      var nv = Noise.noise2(_pt.x * 0.0016 + time * 0.09, _pt.y * 0.0016 - time * 0.07);
      alpha = p.a * (0.35 + 0.65 * nv) * ia;
      if (alpha <= 0) continue;
      drawSprite(SPR_DUST[(p.cs | 0) % 4], _pt.x, _pt.y, p.r * (1 + A.bass * 0.16), alpha,
        p.ang + time * 0.02, p.elong * (1 + Sound.mid * 0.35));
    }
    // 3.2 远景分子云本体
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < layer.far.length; i++) {
      p = layer.far[i];
      introXY(p, _pt);
      var n1 = Noise.noise2(_pt.x * 0.0013 + time * 0.08, _pt.y * 0.0013 - time * 0.06);
      var thin = clamp(n1 * 0.5 + 0.62, 0, 1.25);        // 厚薄不均：稀薄处直接淡到看不见 → 空洞缺口
      // 低频抬亮收紧到 0.24：律动靠"外扩/回旋/拖尾/冲击波"表达，亮度只轻轻跟着呼吸，
      // 抬太多整片底图会随鼓点忽明忽暗，又变成刚被打回的那种炫光
      alpha = p.a * thin * (0.55 + Sound.bass * 0.24) * ia;
      if (alpha <= 0) continue;
      var ci = ((p.cs + time * 0.9 + n1 * 2.2) | 0) % STEPS; if (ci < 0) ci += STEPS;
      drawSprite(PAL_FAR[ci], _pt.x, _pt.y, p.r * (1 + A.bass * 0.10 + A.pulse * 0.05), alpha,
        p.ang, p.elong * (1 + Sound.mid * 0.25));          // 低频把纤维轻柔拉伸
    }
  }

  function drawLayer2(A, ia) {
    var i, p, alpha;
    // 4.1 暗色星际尘埃带：必须在云絮之前用 source-over 画，才能真的"切"开星云
    ctx.globalCompositeOperation = 'source-over';
    for (i = 0; i < layer.dust.length; i++) {
      p = layer.dust[i];
      introXY(p, _pt);
      var nv = Noise.noise2(_pt.x * 0.0022 + time * 0.11, _pt.y * 0.0022);
      alpha = p.a * (0.45 + 0.55 * (nv * 0.5 + 0.5)) * ia * (1 + Sound.bass * 0.25);
      drawSprite(SPR_DUST[(p.cs | 0) % 4], _pt.x, _pt.y, p.r, alpha,
        p.ang + time * 0.015, p.elong * (1 + Sound.mid * 0.5 + Sound.bass * 0.3));
    }
    // 4.2 旋臂云絮（两套频率：大噪声定轮廓已在 build 期；这里用高频噪声刻画内部细碎丝状气流）
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < layer.arm.length; i++) {
      p = layer.arm[i];
      introXY(p, _pt);
      var fine = Noise.noise2(_pt.x * 0.0062 + time * 0.18, _pt.y * 0.0062 - time * 0.14);
      var glow = 0.5 + fine * 0.5;
      alpha = p.a * (0.45 + 0.75 * glow) * ia;
      if (p.core) alpha *= 1 + Math.min(0.7, Sound.mid * 0.5 + A.pulse * 1.1);   // 云核爆亮：低频瞬间增亮（封顶，避免叠成炫光）
      if (alpha <= 0) continue;
      var ci = ((p.cs + time * 1.6 + fine * 3.2) | 0) % STEPS; if (ci < 0) ci += STEPS;
      drawSprite(PAL_ARM[ci], _pt.x, _pt.y, p.r * (1 + Sound.bass * 0.12), alpha,
        p.ang, p.elong * (1 + Sound.mid * 0.4));
      if (p.core) {
        // 云核向外的柔和弥散光晕（半径与透明度都收过一档：大光晕在真机上会糊成一圈圈炫光）
        drawSprite(SPR_HALO, _pt.x, _pt.y, p.r * rr3(1.8, 3.0, p), alpha * 0.36, 0, 1);
      }
    }
  }

  // 云核光晕半径：用每颗核定下来的随机值，避免每帧抖动
  function rr3(a, b, p) {
    if (p._halo === undefined) p._halo = rr(a, b);
    return p._halo;
  }

  function drawLayer3(A, ia) {
    var i, p, alpha;
    ctx.globalCompositeOperation = 'lighter';
    // 5.0 星团集体微光：挂在各自领队星上漂移，让"一撮星"在视觉上抱成团
    for (i = 0; i < layer.cluster.length; i++) {
      var cl = layer.cluster[i];
      drawSprite(SPR_MIST, cl.star.x, cl.star.y, cl.r * (1 + A.bass * 0.15),
        cl.a * (0.55 + 0.45 * Math.sin(cl.star.tw)) * ia, 0, 1);
    }
    // 5.1 暗弱背景繁星：各自独立的相位与速度 → 绝不同步闪烁
    for (i = 0; i < layer.faint.length; i++) {
      p = layer.faint[i];
      introXY(p, _pt);
      p.tw += p.tws * (1 + Sound.mid * 1.2);            // 中频让所有星辰做缓慢呼吸
      alpha = p.a * (0.38 + 0.62 * Math.sin(p.tw)) * ia;   // 明暗摆幅拉大一点：静默时"眨眼"是最容易看见的活气
      drawSprite(SPR_STAR[p.spr], _pt.x, _pt.y, p.r, alpha, 0, 1);
    }
    // 5.2 明亮恒星：多层嵌套径向柔化光晕 + 四向弥散微光（不是尖锐硬十字）
    for (i = 0; i < layer.bright.length; i++) {
      p = layer.bright[i];
      introXY(p, _pt);
      p.tw += p.tws * (1 + Sound.mid * 1.4);
      var br = 0.6 + 0.4 * Math.sin(p.tw);
      alpha = p.a * br * ia;
      var hr = p.halo * (1 + A.pulse * 0.55 + Sound.bass * 0.22);  // 重鼓瞬间光晕放大、之后平滑回落
      drawSprite(SPR_HALO, _pt.x, _pt.y, hr, alpha * 0.22, 0, 1);
      // 四向微光：把柔光 sprite 横向 / 纵向各拉一份，形成柔和弥散式四芒
      ctx.globalAlpha = alpha * 0.16;
      ctx.save();
      ctx.translate(_pt.x, _pt.y);
      ctx.rotate(p.rot);
      ctx.drawImage(SPR_HALO, -hr * 2.1, -hr * 0.34, hr * 4.2, hr * 0.68);
      ctx.drawImage(SPR_HALO, -hr * 0.34, -hr * 2.1, hr * 0.68, hr * 4.2);
      ctx.restore();
      // 亮核 + 极轻微的色差分离（模拟长焦镜头在高光处的微弱横向色散）
      drawSprite(SPR_HALO, _pt.x + 0.7, _pt.y, hr * 0.42, alpha * 0.20, 0, 1);
      drawSprite(SPR_STAR[p.spr], _pt.x, _pt.y, p.r * (1 + A.pulse * 0.35), alpha, 0, 1);
    }
    // 5.3 流星：拖尾用线性渐变一笔带过，加法叠加；尾端掉的星屑在下面
    for (i = 0; i < layer.meteor.length; i++) {
      var m = layer.meteor[i];
      if (m.life <= 0) continue;
      var tx = m.x - m.vx * (m.len / Math.max(1, Math.abs(m.vx) + Math.abs(m.vy)));
      var ty = m.y - m.vy * (m.len / Math.max(1, Math.abs(m.vx) + Math.abs(m.vy)));
      var grd = ctx.createLinearGradient(m.x, m.y, tx, ty);
      var lf = clamp(m.life, 0, 1);
      grd.addColorStop(0, 'rgba(226,238,255,' + (0.55 * lf).toFixed(3) + ')');
      grd.addColorStop(0.45, 'rgba(170,200,255,' + (0.18 * lf).toFixed(3) + ')');
      grd.addColorStop(1, 'rgba(150,180,255,0)');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = grd;
      ctx.lineWidth = m.w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      drawSprite(SPR_STAR[1], m.x, m.y, 3.2 * Math.max(0.8, S) * lf, 0.5 * lf, 0, 1);
    }
    for (i = 0; i < layer.spark.length; i++) {
      var s = layer.spark[i];
      if (s.life <= 0) continue;
      drawSprite(SPR_STAR[1], s.x, s.y, s.r * s.life, 0.42 * s.life * ia, 0, 1);
    }
  }

  function drawLayer4(A, ia) {
    var i, p, alpha;
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < layer.mist.length; i++) {
      p = layer.mist[i];
      introXY(p, _pt);
      alpha = p.a * ia * (1 + Sound.mid * 0.35);
      drawSprite(SPR_MIST, _pt.x, _pt.y, p.r, alpha, 0, 1);
    }
    for (i = 0; i < layer.mote.length; i++) {
      p = layer.mote[i];
      introXY(p, _pt);
      var nv = Noise.noise2(p.x * 0.004 + time * 0.22, p.y * 0.004);
      alpha = p.a * (0.4 + 0.6 * (nv * 0.5 + 0.5)) * ia * (1 + Sound.mid * 0.4);
      var ci = ((p.cs + nv * 3.4 + time * 2.0) | 0) % STEPS; if (ci < 0) ci += STEPS;
      drawSprite(PAL_ARM[ci], _pt.x, _pt.y, p.r, alpha, 0, 1);
    }
  }

  // 低频/点击"气浪"：一泓星云色气团从波源荡开，飘一小段就散进星流，配合粒子外推就是波前。
  // 两个前任都被打回：几何圆描边（"圆圈和星河没关系"）→ 白色 HALO 大晕（几拍叠成白团）。
  // 现在用旋臂调色板画小气团：星云同色、飘不远、不发白，只是呼吸时"呼出的那口气"
  function drawRings(A) {
    if (!rings.length) return;
    ctx.globalCompositeOperation = 'lighter';
    var maxR = Math.min(W, H) * 0.30;          // 气浪飘不远：散进星流里就没了
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i];
      r.r += (Math.min(W, H) * 0.0045) + A.bass * 0.7;
      r.life -= 0.013;
      if (r.life <= 0 || r.r > maxR) { rings.splice(i, 1); i--; continue; }
      var fade = clamp(1 - r.r / maxR, 0, 1);
      var a = r.life * r.life * 0.12 * CFG.intensity * fade;
      var ci = ((r.r * 0.5) | 0) % STEPS; if (ci < 0) ci += STEPS;
      drawSprite(PAL_ARM[ci], r.x, r.y, r.r * 1.35 + 12, a, 0, 1);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // 后处理：不是每帧高斯模糊，而是每 N 帧把低分辨率副本柔化后低透明度叠回原画布。
  // 性能关键：blur 只做在 1/4 分辨率的小缓冲上（开销约为全屏模糊的 1/16），
  // 放大叠回时自带的双线性插值正好充当第二级柔化——辉光反而更弥散。
  // 画布侧顺序：体积辉光 → 微弱镜头色差 → 胶片颗粒（色差是镜头光学、颗粒是传感器噪声，
  // 按物理先后叠放）；暗角与冷蓝环境辉光已上移 CSS 静态层 .cosmos-veil，不在这里画。
  function postProcess(A, frameId) {
    if (frameId % CFG.bloomEvery === 0 && bloomCtx) {
      bloomCtx.setTransform(1, 0, 0, 1, 0, 0);
      bloomCtx.clearRect(0, 0, bloom.width, bloom.height);      // 只有离屏缓冲允许 clearRect，主画布永远衰减擦除
      if (supportsFilter) bloomCtx.filter = 'blur(' + CFG.bloomBlur + 'px)';
      bloomCtx.drawImage(canvas, 0, 0, bloom.width, bloom.height);
      if (supportsFilter) bloomCtx.filter = 'none';
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = CFG.bloomAlpha * (1 + A.bass * 0.55);
      ctx.drawImage(bloom, 0, 0, W, H);
      // 微弱镜头色差：同一份柔光左右各偏一点点，只在高光边缘留下一丝冷/暖分离
      ctx.globalAlpha = CFG.caAlpha * (1 + A.bass * 0.4);
      ctx.drawImage(bloom, -1.2, 0, W, H);
      ctx.drawImage(bloom, 1.2, 0, W, H);
    }

    // 静态星际胶片颗粒：一层极低强度的噪声，去掉 CG 的塑料顺滑感
    if (grainPat) {
      ctx.globalCompositeOperation = supportsBlend ? 'overlay' : 'lighter';
      ctx.globalAlpha = supportsBlend ? CFG.grainAlpha : CFG.grainAlpha * 0.35;
      ctx.fillStyle = grainPat;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  var framerId = 0, hiddenTimer = 0, lastDraw = 0, lastPulse = 0, focused = true, frameNo = 0;
  var stopped = false, HIDDEN = false;   // stopped：整条循环是否被主动停笔（reduce-motion 静态图）
  var fpsTarget = CFG.fpsActive;         // 当前生效帧率档（探针直读：前台 48 / 失焦 16 / 后台 5）
  var hiTimer = 0, uiTimer = 0;          // 两个后台定时器：低频补帧 / 面板状态刷新
  var budget = { last: 0, sum: 0, n: 0, ready: false };

  function tick(now) {
    if (!stopped) framerId = requestAnimationFrame(tick);   // 续帧放最前：帧体出错也不会停摆

    var target = document.hidden ? CFG.fpsHidden
      : (reduceMotion ? CFG.fpsReduce : (focused ? CFG.fpsActive : CFG.fpsBlur));
    fpsTarget = target;
    var minMs = 1000 / target - 1;
    if (now - lastDraw < minMs) return;
    var dt = Math.min(0.12, (now - lastDraw) / 1000) || 0.016;
    lastDraw = now;

    try {
      // 帧归一化步长：不管实际帧率是 5 还是 60，单位时间内的运动速度保持一致
      var d = clamp(dt * 60, 0.3, 3.2) * CFG.motion;
      time += dt * CFG.motion;

      Sound.read(now, d);
      Pointer.update(dt);   // 指针平滑/活跃度：用真实 dt，输入响应不随降帧变钝
      var A = Sound;

      if (introT < 1) introT = clamp((now - introStart) / CFG.introMs, 0, 1);
      var ia = easeOut3(introT);                     // 入场期整体亮度渐显

      frameNo++;
      if (frameNo % 2 === 0) Flow.update(time);   // 流场演化很慢，隔帧更新足够
        // 冲击波触发阈值随律动总闸缩放（pulse 对外峰值 = reactivity）
        if (A.pulse > 0.9 * CFG.reactivity && A.pulse !== lastPulse) { spawnRing(A); lastPulse = A.pulse; }
        if (A.pulse < 0.5 * CFG.reactivity) lastPulse = 0;

      updateParticles(d, A);

      // ① 衰减擦除：禁止 clearRect。低频越强 alpha 越低 → 残影拖尾越长。
      // 系数压到 0.75/0.45：拖尾是最吃亮度的那一项（残影叠残影），留一半给拍点就够看，
      // 全量会把整幅底图推到验收带上限（实测峰值 11.3/255），又滑向刚被打回的炫光
      var trail = lerp(CFG.trailQuiet, CFG.trailLoud, clamp(A.bass * CFG.trailBass + A.pulse * CFG.trailPulse, 0, 1));
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,2,7,' + trail.toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);

      // ② 冷蓝环境辉光 + 暗角：已上移到 CSS 静态层 .cosmos-veil（零每帧开销），画布内不再画
      ctx.globalCompositeOperation = 'lighter';

      drawLayer1(A, ia);      // ③ 层1
      drawLayer2(A, ia);      // ④ 层2
      drawLayer3(A, ia);      // ⑤ 层3
      drawLayer4(A, ia);      // ⑥ 层4
      drawRings(A);           // ⑦ 冲击波
      postProcess(A, frameNo);  // ⑧ 后处理

      // 性能看门狗：连续偏慢就整体降密度（有 3.5 秒预热宽限，避开首帧与入场期的天然低帧）
      if (lastDraw > budget.last) {
        budget.sum += (lastDraw - budget.last);
        budget.n++;
        if (!budget.ready && budget.sum > 3500) budget.ready = true;
        if (budget.ready && budget.n > 60) {
          var avg = budget.sum / budget.n;
          if (avg > 26 && quality > 0.55) {
            quality = Math.max(0.55, quality - 0.15);
            rebuild(false, true);
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
        var wasStopped = stopped;                       // reduce-motion 下重建完继续停笔
        if (wasStopped) { stopped = false; lastDraw = 0; }
        resizeCanvas();
        buildScene(false, true);
        if (wasStopped) { tick(performance.now()); stopLoop(); }
      }, 180);
  }

  function rebuild(freshSeed, keepIntro) {
    buildScene(!!freshSeed, !!keepIntro);
  }

  function stopLoop() {
    stopped = true;                       // ❗只是清句柄不够：在途的那一帧末尾还会自己续一帧
    if (framerId) { cancelAnimationFrame(framerId); framerId = 0; }
    if (hiddenTimer) { clearInterval(hiddenTimer); hiddenTimer = 0; }
    if (hiTimer) { clearInterval(hiTimer); hiTimer = 0; }
  }

  function startLoop() {
    stopLoop();
    stopped = false;
    HIDDEN = document.hidden;
    if (HIDDEN) {
      // 标签页切到后台：rAF 会被浏览器节流甚至停掉，这里改成低频定时器，把帧率压到 CFG.fpsHidden
      hiddenTimer = setInterval(function () { tick(performance.now()); }, Math.round(1000 / CFG.fpsHidden));
    } else {
      lastDraw = 0;
      framerId = requestAnimationFrame(tick);
    }
  }

  // 标签页切后台 / 回前台：必须重新排帧，否则 rAF 会被浏览器掐掉后再也不回来
  function onVisibility() {
    if (stopped) return;                  // reduce-motion 已停笔的静态星图不再醒来
    if (document.hidden !== HIDDEN) startLoop();
  }

  // 尊重"减少动效"：不做长跑动画，但要先把入场那几秒静默走完——让四周汇聚的
  // 星尘真正凝聚成星河，之后再彻底停笔。停笔留下的是一张"成型后"的静态星图，
  // 而不是云团还在半路上的半成品（只走到六成就停是错的）。
  // 停笔之后任何会改变画面的操作（resize / 面板重置）都必须重走一遍本函数。
  var settleToken = 0;
  function runStillSettle() {
    var tok = ++settleToken;
    stopped = false;
    lastDraw = 0;
    var settleAt = performance.now() + CFG.introMs + 400;
    var still = function () {
      if (tok !== settleToken) return;    // 有更新的一轮结算接手，旧链路退场
      tick(performance.now());
      if (performance.now() < settleAt) requestAnimationFrame(still);
      else stopLoop();
    };
    requestAnimationFrame(still);
  }

  // 减少动效 × 主动放歌：系统层面要求静止，但"用户点了播放"是一次明确的"我要看律动"
  // 的交互意图 —— 这时按 CFG.fpsReduce 低帧率恢复，只做随拍响应（不恢复常驻的环境漂移量级）；
  // 停播 1.5 秒后回到彻底停笔。默认态依旧是一张完全静止的星图，规格不变。
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

  // 心跳：万一 rAF 被浏览器丢掉（窗口被遮挡 / 系统休眠唤醒 / 某一帧异常中断），
  // 超过 2 秒没推进就重新排帧。stopped 为真时不复活 —— 那是"减少动效"下有意的静态星图。
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

      // 本地音乐：创建对象 URL，交给本模块的 <audio>；不与站点歌单同时发声（Sound.init 里已互斥）
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
        rebuild(true, false);
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

    // 音量只作用于"此刻正在响的那一路"；面板把目标值记在这里，
    // 定时器里每 0.9 秒重试一次，所以换曲目、换音源之后也能自动跟上。
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
      // 自诊断：系统「减少动效」开着时星河是有意停笔的，别让人以为坏了
      if (reduceMotion && stopped) return this.say('静止中 · 系统开了「减少动效」，放歌才随拍微动');
      if (A.loud > 0.02) return this.say('音频接入中');
      return this.say('静音中 · 星河低强度运行');
    }
  };

  /* ============================================================
     6. 启动
     ============================================================ */
  function boot() {
    buildSprites();
    buildGrain();
      resizeCanvas();
      Sound.init();
      Pointer.init();
      UI.init();
    buildScene(true);
    Flow.update(0);

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
      reduceMotionGate();      // 减少动效下：放歌才恢复低帧率律动，停播回到停笔
      UI.applyVol();
      UI.tickState();
    }, 900);

    // 调试探针：本地验证脚本用（故意做得很轻，不影响运行开销）
    window.__COSMOS = {
      cfg: CFG,
      reset: function () { rebuild(true, false); },
      info: function () {
        return {
          w: W, h: H, dpr: DPR, quality: quality, intro: introT, time: time, frame: frameNo,
          stopped: stopped, reduceMotion: reduceMotion,
          counts: {
            far: layer.far.length, fiber: layer.fiber.length, arm: layer.arm.length,
            dust: layer.dust.length, faint: layer.faint.length, bright: layer.bright.length,
            mote: layer.mote.length, mist: layer.mist.length, ring: rings.length,
            cluster: layer.cluster.length,
            meteor: liveCount(layer.meteor), spark: liveCount(layer.spark)
          },
            fired: { meteor: fired.meteor, spark: fired.spark, ring: fired.ring, kick: fired.kick },
            pointer: { x: Math.round(Pointer.x), y: Math.round(Pointer.y), live: +Pointer.live.toFixed(2) },
          vortex: Vortex.list.length,
          audio: { bass: +Sound.bass.toFixed(3), mid: +Sound.mid.toFixed(3), treble: +Sound.treble.toFixed(3), pulse: +Sound.pulse.toFixed(3) },
          flow: { mist: +mistFlow.toFixed(3) },
            playing: Sound.playing(), throttle: fpsTarget, spin: spin, dirs: Vortex.list.map(function (v) { return Math.round(v.r); })
        };
      },
      // 给测试用：手动喂一份频谱，省得扯 Widow 音频
      feed: function (b, m, t) {
        window.__BEAT = { level: b, lv: b, mid: m || 0, treble: t || 0, slow: b, rise: 0, ctx: 'fake' };
      },
      // 给测试用：在指定屏幕坐标触发一次点击脉冲（绕过 closest 交互守卫）
      poke: function (x, y) { Pointer.kick(x, y); }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
