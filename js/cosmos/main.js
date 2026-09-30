// Interactive Cosmic Blog · main.js（引导层，零重依赖）
// ============================================================
// 职责：判定设备档位，决定加载哪套背景引擎（分叉点必须在模块加载之前——
//       three 676KB 是首屏传输最大单项，此前手机把它下载完才发现要走 2D，白下载 51% 传输量）：
//   · 桌面（WebGL 可用）→ 动态 import('./main3d.js')（three 只在桌面下载）
//   · 手机 / 无 WebGL → fallback2d()：2D 星河版 js/cosmos.js（~94KB，为低配/小屏而写：
//     粒子按屏幕面积折算、帧率分级、240 万像素预算，竖屏观感是星云+星尘而非线网）
//   · 超低端（微信/QQ 内置浏览器、软渲染 WebGL）→ 静态暗角档：连 2D 引擎都不加载——
//     X5/XWeb 内核版本滞后、软渲染 WebGL 高发，任何全屏动画都是负担；
//     .cosmos-veil 的暗角渐变兜底，页面完全可用（稳定优先于花哨，2026-09-30）。
// 档位挂 window.__COSMOS_TIER（'full' | 'lite' | 'static'）供测试探针验证。
// ============================================================
const isMobile = matchMedia('(pointer:coarse)').matches || innerWidth < 768;

function fallback2d() {
  // 回退 2D canvas 版（js/cosmos.js 自举，挂 #cosmos-canvas）
  const s = document.createElement('script');
  s.src = 'js/cosmos.js';
  document.body.appendChild(s);
}

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { return false; }
}

// 软渲染 WebGL 检测：X5 等内置浏览器经常只给 SwiftShader——能建 context 不代表跑得动全屏 shader
function softwareGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return true;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    return /swiftshader|software|llvmpipe|angle \(software/i.test(renderer);
  } catch (e) { return true; }
}

// 微信（MicroMessenger）/ QQ（MQQBrowser）内置浏览器：内核版本滞后 + 低端机占比高
function inBundledBrowser() {
  return /MicroMessenger|MQQBrowser/i.test(navigator.userAgent);
}

if (inBundledBrowser() || softwareGL()) {
  window.__COSMOS_TIER = 'static';   // 静态暗角档：不加载任何背景引擎
} else if (!webglOK() || isMobile) {
  window.__COSMOS_TIER = 'lite';
  fallback2d();
} else {
  window.__COSMOS_TIER = 'full';
  import('./main3d.js').catch(() => fallback2d());   // 3D 模块加载失败也回 2D
}
