/**
 * Service Worker：离线缓存（"本地优先"的完全体——断网也能读手记和小说）
 * ----------------------------------------------------
 * 策略：
 * - 页面导航（HTML）：网络优先，失败回退缓存（保证更新及时、离线可读）
 * - 其余同源/静态资源：缓存优先 + 后台更新（stale-while-revalidate）
 * ⚠️ 每次发布改动静态资源后，把 CACHE 版本号 +1，旧缓存会在 activate 阶段自动清理。
 */
const CACHE = 'sevenjohn-v10';
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
// 缓存命中 → 本地切片返 206，即时；
// 未缓存 → 流式秒开（不等待全量），同时后台拉全量入库，下次秒开 + 离线可播。
// ⚠️ Range 请求绝不能回 200：Chromium 会把 seekable 清零，进度条直接报废——
//    上游原生 206 原样透传；上游只回 200（如 python http.server）时把 body 流包装成 206。
// ⚠️ 下载管理器（IDM 等）劫持会返回空 body：空响应不入缓存，坏缓存可自愈。
const prefetches = new Map(); // url -> Promise（单例去重，防 seek 反复触发全量下载）

function slice206(req, buf, total) {
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.get('range') || '') || [];
  const start = Number(m[1] || 0);
  const end = m[2] ? Number(m[2]) : buf.byteLength - 1;
  const slice = buf.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
      'Content-Length': String(slice.byteLength)
    }
  });
}

function prefetch(url) {
  if (!prefetches.has(url)) {
    const p = fetch(url).then(async (net) => {
      if (!net || !net.ok) return;
      const buf = await net.arrayBuffer();
      if (!buf.byteLength) return; // 空响应（被劫持）不入库
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
    if (buf.byteLength) return slice206(req, buf, buf.byteLength); // 空 buf 视为坏缓存，走下方自愈
  }
  const start = Number((/bytes=(\d+)/.exec(req.headers.get('range') || '') || [])[1] || 0);
  const net = await fetch(req).catch(() => null);
  if (!net) {
    await prefetch(req.url);
    const again = await caches.match(req, { ignoreVary: true });
    if (again) return slice206(req, await again.arrayBuffer(), (await again.arrayBuffer()).byteLength);
    return offlineFallback('离线：音频未缓存，请联网播放一次');
  }
  if (net.status === 206) {
    prefetch(req.url); // 上游原生支持 Range：原样透传（流式秒开）
    return net;
  }
  const total = Number(net.headers.get('content-length') || 0);
  if (start === 0 && total && net.body) {
    prefetch(req.url); // 后台入库
    // 上游不认 Range（回 200 全量）：把 body 流包装成 206 —— 秒开且 seekable 正常
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
  // 中段请求但缓存未就绪：等后台全量完成再切片
  await prefetch(req.url);
  const again = await caches.match(req, { ignoreVary: true });
  if (again) {
    const buf = await again.arrayBuffer();
    if (buf.byteLength) return slice206(req, buf, buf.byteLength);
  }
  return net;
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

  // CSS/JS：网络优先——必须与 HTML 同版本，否则会出现"新 DOM + 旧样式"的裸奔页面；
  // 离线时回退缓存。其余资源走下方的缓存优先。
  if (req.destination === 'style' || req.destination === 'script' || /\.(css|js)(\?|$)/.test(req.url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || offlineFallback('离线：资源未缓存')))
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
