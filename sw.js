/**
 * Service Worker：离线缓存（"本地优先"的完全体——断网也能读手记和小说）
 * ----------------------------------------------------
 * 策略：
 * - 页面导航（HTML）：网络优先，失败回退缓存（保证更新及时、离线可读）
 * - 其余同源/静态资源：缓存优先 + 后台更新（stale-while-revalidate）
 * ⚠️ 每次发布改动静态资源后，把 CACHE 版本号 +1，旧缓存会在 activate 阶段自动清理。
 */
const CACHE = 'sevenjohn-v4';
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

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

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
