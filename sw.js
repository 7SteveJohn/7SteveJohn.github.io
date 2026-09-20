/**
 * Service Worker：离线缓存（"本地优先"的完全体——断网也能读手记和小说）
 * ----------------------------------------------------
 * 策略：
 * - 页面导航（HTML）：网络优先，失败回退缓存（保证更新及时、离线可读）
 * - 其余同源/静态资源：缓存优先 + 后台更新（stale-while-revalidate）
 * ⚠️ 每次发布改动静态资源后，把 CACHE 版本号 +1，旧缓存会在 activate 阶段自动清理。
 */
const CACHE = 'sevenjohn-v5';
const CORE = [
  './',
  'index.html',
  '404.html',
  'css/style.css',
  // 本地化依赖（原 CDN 已全部下放到 assets/vendor，断网也能完整渲染）
  'assets/vendor/tailwind.css',
  'assets/vendor/marked.min.js',
  'assets/vendor/highlight.min.js',
  'assets/vendor/github-dark.min.css',
  'js/app.js',
  'js/articles.js',
  'js/projects.js',
  'js/particles.js',
  'js/search.js',
  'js/status.js',
  'assets/fonts/inter.css',
  'assets/fonts/inter-var-latin.woff2',
  'assets/vendor/lucide.min.js',
  'assets/images/avatar.webp',
  // 项目封面：首屏 preload 会早于 SW 接管，必须进预缓存，否则断网后卡片图全裂
  'assets/images/cover-filebutler.webp',
  'assets/images/cover-netops.webp',
  'assets/images/cover-gameboost.webp',
  'assets/images/cover-filebutler.jpg',
  'assets/images/cover-netops.jpg',
  'assets/images/cover-gameboost.jpg',
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
  );
});

// 断网且无缓存时的兜底响应（返回 undefined 会让请求永久挂起，load 事件永不触发）
const offlineFallback = (msg) => new Response(msg, {
  status: 503,
  statusText: 'offline',
  headers: { 'Content-Type': 'text/plain; charset=utf-8' }
});

// 媒体 Range 请求（<audio> 播放/拖进度条）：
// 缓存里有全量 → 切片返回 206；没有 → 先拉全量入运行时缓存，再切片。
// （206 部分响应不能直接 cache.put，必须以 200 全量为源）
// ⚠️ 下载管理器（IDM 等）劫持时会返回空 body 的 200/204：
//    先读出真实字节，非空才入库——坏响应不缓存，坏缓存可自愈。
async function handleRange(req) {
  let buf = null;
  const cached = await caches.match(req, { ignoreVary: true });
  if (cached) buf = await cached.arrayBuffer();
  if (!buf || !buf.byteLength) {
    const net = await fetch(req.url).catch(() => null);
    if (!net || !net.ok) return net || offlineFallback('离线：音频未缓存，请联网播放一次');
    buf = await net.arrayBuffer();
    if (!buf.byteLength) return net; // 空响应（被劫持）原样透传，不污染缓存
    const cache = await caches.open(CACHE);
    await cache.put(req.url, new Response(buf, { headers: net.headers })).catch(() => {});
  }
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.get('range') || '') || [];
  const start = Number(m[1] || 0);
  const end = m[2] ? Number(m[2]) : buf.byteLength - 1;
  const slice = buf.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength,
      'Content-Length': String(slice.byteLength)
    }
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  // 媒体 Range 请求交给切片处理（必须先于缓存分支：206 无法 cache.put）
  if (req.headers.has('range')) {
    event.respondWith(handleRange(req));
    return;
  }

  // 页面导航：网络优先，离线回退到缓存的 index.html（深链 ?post= 也由它承载）
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')
          .then((hit) => hit || caches.match('index.html'))
          .then((hit) => hit || offlineFallback('离线：未缓存该页面')))
    );
    return;
  }

  // 静态资源：缓存优先 + 后台更新（含跨域 CDN 的不透明响应）
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
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
