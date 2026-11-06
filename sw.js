/**
 * Service Worker：离线缓存（"本地优先"的完全体——断网也能读手记和小说）
 * ----------------------------------------------------
 * 策略（2026-10-05 起全面 stale-while-revalidate，修"每次打开都等跨海往返"的常态卡顿）：
 * - 页面导航：首页（含 ?post= 深链）SWR——缓存秒开、后台拉新版更新固定键 './index.html'；
 *   其他 HTML（cosmos-home 演示页等）保持网络优先、离线回退首页——低频且不许污染离线兜底。
 * - CSS/JS 与其余静态资源：SWR（缓存优先 + 后台更新）。
 * - 音频 Range 请求：切片/预热/全量三级，见下方媒体分支。
 * 一致性说明：SWR 下"缓存里的 HTML/CSS/JS"整体同版本出入，不存在"新 DOM 配旧样式"
 * ——旧版三件套一起出、后台更新完下次打开一起换新。内容更新（文章、图、RSS）靠 SWR
 * 在下一次打开自动对齐，**常规发布不需要再手动 +1 版本号**；只有改 CORE 列表或缓存
 * 结构时才 bump（install 会全量重拉 CORE，约 1MB 后台流量，按需使用）。
 */
const CACHE = 'sevenjohn-v240';   // 2026-11-07 物理翘板卡片真3D深陷倾斜（戳哪沉哪 + 按压弹性深陷）
const CORE = [
  './',
  'index.html',
  'cosmos-demo.html',
  'cymatics-mesh-sphere.html',
  'demo-flagship.html',
  'demo-anthony-fu.html',
  'demo-shuding.html',
  'demo-rauno.html',
  'demo-linear-apple.html',
  'demo-shuding-rauno.html',
  '404.html',
  // 归档与照片墙（2026-10-16 新增）：文本资源很小，直接预缓存，断网可翻
  'archive.html',
  'gallery.html',
  // 二次元照片墙精选
  'assets/images/anime/regulus-insight2.webp',
  'assets/images/anime/regulus-default.webp',
  'assets/images/anime/rem-enhanced.webp',
  'assets/images/anime/rikka-enhanced.webp',
  'assets/images/anime/beatrice.webp',
  'assets/images/anime/rikka.webp',
  'assets/images/anime/rem.webp',
  // 已下线的三页（garden/links/novel）仍留在仓库、仍可直达，但不再进预缓存
  //（2026-10-23 对齐：此前注释说不预缓存、清单却照收，离线包在为无入口页面付费）。
  // 访问时由导航 SWR 分支照常入库，断网后最近访问的仍可看
  'css/style.css',
  'css/cosmos.css',
  'css/archive.css',
  'css/gallery.css',
  'css/settings-panel.css',
  'js/cosmos.js',        // 手机 / 无 WebGL 时的 2D 星河回退（js/cosmos/main.js 引导层按需加载）
  'js/cosmos/config.js',
  'js/cosmos/main.js',   // 背景引导层：设备分档（full/lite/static），桌面动态 import main3d
  'js/cosmos/main3d.js', // 桌面 3D 背景引擎（动态加载，three 只在桌面路径下载）
  'js/cosmos/scene/NeuralField.js',
  'js/cosmos/scene/CymaticsField.js',
  'js/cosmos/scene/AuroraField.js',
  'js/cosmos/scene/ChladniField.js',
  'js/cosmos/scene/MonolithField.js',
  'js/cosmos/scene/IsolinesField.js',
  'js/cosmos/audio/AudioManager.js',
  'js/cosmos/audio/BeatDetector.js',
  'js/cosmos/interaction/InteractionManager.js',
  // three.module.min.js（692KB）不进预缓存（2026-10-01 体检 PERF-3）：只有桌面 full 档动态
  // import 它，手机/lite/static 档永不使用；桌面首次加载时由 CSS/JS 网络优先分支自动入库。
  // 本地化依赖（原 CDN 已全部下放到 assets/vendor，断网也能完整渲染）
  'assets/vendor/tailwind.css',
  // ❗marked / purify 自 2026-10-17 起改为按需加载（js/markdown-loader.js）：
  //   进预缓存等于让按需策略形同虚设，所以移出 CORE，首次打开文章/章节时入运行时缓存。
  //   同理 highlight.min.js（122KB）一直不进预缓存。
  'assets/vendor/github-dark.min.css',
  // ❗首屏脚本已合并成 bundle（2026-10-17 加载优化）：首页请求 30 → 20 以内。
  //   改 js/ 下任一源文件后必须 node scripts/build-bundles.mjs 重建，并升 CACHE 版本，
  //   否则老客户端继续用旧包（scripts/build-bundles.mjs --check 会报过期）。
  'js/bundles/core.js',    // site-config / markdown-loader / wallpaper / particles / settings-panel / tab-nav
  'js/bundles/home.js',    // status / search / video-gate / app / nav-indicator / player
  'js/bundles/sub.js',     // subpage（次级页外壳）
  // garden/links/novel 三个 bundle 与 novel-data.js 随三页一起移出预缓存（2026-10-23）
  // 数据文件与页面专属逻辑仍独立（工具链依赖数据文件，页面逻辑单请求即可）
  'js/articles.js',
  'js/projects.js',
  'js/archive.js',
  'js/gallery.js',
  'js/live2d.js',          // 看板娘引导层（1.9MB 运行时/模型不进预缓存）
  // 壁纸图与 Live2D 看板娘（运行时 + 模型约 1.9MB）不进预缓存：
  // 壁纸由 img 预载后自然入库，看板娘只在桌面首次在线加载后入缓存（与 three/mp3 同策略）
  'assets/fonts/inter.css',
  'assets/fonts/inter-var-latin.woff2',
  'assets/vendor/lucide.min.js',
  'assets/images/avatar.webp',
  // 项目封面：首屏卡片直接用，必须进预缓存，否则断网后卡片图全裂
  // ❗.jpg 那几张是「浏览器不支持 WebP」时代的 onerror 回退，现代浏览器永远走不到，
  //   预缓存它们等于白下 425KB（2026-09-30 性能体检发现，已移出；文件本身留在磁盘上）
  'assets/images/cover-filebutler.webp',
  'assets/images/cover-netops.webp',
  'assets/images/cover-gameboost.webp',
  'assets/images/cover-paian.webp',
  'favicon.ico',
  'apple-touch-icon.png',
  'icon-512.png',
  'manifest.json',
  'rss.xml'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(async () => {
        // 清理历史残留的有害 256KB 预热碎片，避免 Chromium demuxer 报错
        try {
          const cache = await caches.open(CACHE);
          const keys = await cache.keys();
          for (const k of keys) {
            if (k.url.includes('?sjwarm=')) await cache.delete(k);
          }
        } catch (e) {}
        // 后台静默预热首曲（全量入库，零卡顿秒播 + 离线可用）
        prefetch('./music/attention.mp3');
      })
  );
});

// 断网且无缓存时的兜底响应（返回 undefined 会让请求永久挂起，load 事件永不触发）
const offlineFallback = (msg) => new Response(msg, {
  status: 503,
  statusText: 'offline',
  headers: { 'Content-Type': 'text/plain; charset=utf-8' }
});

// 媒体 Range 请求（<audio> 播放/拖进度条）：
// 全量缓存命中 → 本地切片返 206，0ms 即时出声且支持自由 seek；
// 未命中缓存 → 真实网络 206 流式播放（零等待立刻起播），并在后台静默发起全量缓存，
// 确保第二次打开或二次播放时 100% 命中本地高速缓存，杜绝反复加载。
const prefetches = new Map(); // url -> Promise（单例去重，防反复触发全量下载）

function slice206(req, buf, total, type) {
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.get('range') || '') || [];
  const start = Number(m[1] || 0);
  const end = Math.min(m[2] ? Number(m[2]) : Infinity, buf.byteLength - 1);
  const slice = buf.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': type || 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
      'Content-Length': String(slice.byteLength),
      'Accept-Ranges': 'bytes'
    }
  });
}

function prefetch(url) {
  if (!prefetches.has(url)) {
    const p = fetch(url).then(async (net) => {
      if (!net || !net.ok) return;
      const buf = await net.arrayBuffer();
      if (!buf.byteLength) return; // 空响应不入库
      const cache = await caches.open(CACHE);
      await cache.put(url, new Response(buf, { headers: net.headers })).catch(() => {});
    }).catch(() => {}).finally(() => prefetches.delete(url));
    prefetches.set(url, p);
  }
  return prefetches.get(url);
}

async function handleRange(req) {
  const cached = await caches.match(req, { ignoreVary: true });
  if (cached) {
    const buf = await cached.arrayBuffer();
    if (buf.byteLength) return slice206(req, buf, buf.byteLength, cached.headers.get('Content-Type'));
  }
  const net = await fetch(req).catch(() => null);
  if (!net) {
    await prefetch(req.url);
    const again = await caches.match(req, { ignoreVary: true });
    if (again) return slice206(req, await again.arrayBuffer(), (await again.arrayBuffer()).byteLength, again.headers.get('Content-Type'));
    return offlineFallback('离线：音频未缓存，请联网播放一次');
  }

  // 后台全量入库（静默执行，绝不阻塞当前播放流）
  if (req.url.includes('/music/')) {
    prefetch(req.url);
  }

  if (net.status === 206) {
    return net;
  }
  const start = Number((/bytes=(\d+)/.exec(req.headers.get('range') || '') || [])[1] || 0);
  const total = Number(net.headers.get('content-length') || 0);
  if (start === 0 && total && net.body) {
    return new Response(net.body, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Type': net.headers.get('Content-Type') || 'audio/mpeg',
        'Content-Range': 'bytes 0-' + (total - 1) + '/' + total,
        'Content-Length': String(total),
        'Accept-Ranges': 'bytes'
      }
    });
  }
  return net;
}

// 页面端触发的确定性预热（全量缓存入库，二播与重入秒开）
self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && (data.type === 'prefetch-media' || data.type === 'warm-media') && data.url) {
    event.waitUntil(prefetch(data.url));
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;  // 媒体 Range 请求交给切片处理（必须先于缓存分支：206 无法 cache.put）
  if (req.headers.has('range')) {
    event.respondWith(handleRange(req));
    return;
  }

  // 页面导航：白名单页面（含首页任意 ?query 深链）SWR——缓存秒开、后台拉新版写回固定键
  // （首页的 ?post= 由页面 JS 解析，HTML 本体同一份）。
  // 白名单以外的 HTML（404 页、cosmos-home 演示页）一律不入缓存
  // （2026-10-01 体检 ATK-1：否则坏链接会把离线兜底首页污染成那个页面）。
  if (req.mode === 'navigate') {
    const path = new URL(req.url).pathname;
    // 归档与照片墙是站内正经入口（2026-10-16 新增），值得各存一份：断网也能翻
    const SWR_KEYS = {
      '/': './index.html',
      '/index.html': './index.html',
      '/archive.html': './archive.html',
      '/gallery.html': './gallery.html',
      '/garden.html': './garden.html',
      '/links.html': './links.html',
      '/novel.html': './novel.html'
    };
    const key = SWR_KEYS[path];
    if (key) {
      // 页面导航采用网络优先策略：保证在线时永远即时拉取最新代码与版本，离线时秒级回退离线缓存
      event.respondWith(
        fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(key, copy));
            }
            return res;
          })
          .catch(() => caches.match(key).then((cached) => cached || offlineFallback('离线：页面未缓存')))
      );
    } else {
      // 非首页 HTML：网络优先、离线回退缓存首页（低频页面，不值得各存一份）
      event.respondWith(
        fetch(req).catch(() => caches.match('./index.html')
          .then((hit) => hit || caches.match('index.html'))
          .then((hit) => hit || offlineFallback('离线：未缓存该页面')))
      );
    }
    return;
  }

  // CSS/JS 与其余静态资源统一走 SWR（缓存优先 + 后台更新）。CSS/JS 不再网络优先
  // （2026-10-05）：那是"每次打开都等跨海往返"的常态卡顿根因——同版本缓存三件套
  // 一起出，一致性由上方导航 SWR 的说明保证。
  // ⚠️ res.ok 的 204（本机 IDM 等下载器劫持大文件时的空响应）绝不能入缓存——
  //    一旦入库，cached || network 会让这个资源永远命中空缓存
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && res.status !== 204) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || offlineFallback('离线：资源未缓存'));
      return cached || network;
    })
  );
});
