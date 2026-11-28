/**
 * Service Worker：离线缓存（"本地优先"的完全体——断网也能读手记和小说）
 * ----------------------------------------------------
 * 策略（全面 stale-while-revalidate + 分层抗 503 预缓存）：
 * - 安装阶段（install）：
 *   · CORE_ESSENTIAL（首页必需壳与脚本）：带单文件退避重试（失败/503 后 250ms 重试 1 次），必须全部入库；
 *   · CORE_EXTRAS（次级页、全文库、卡片与按需脚本）：小批次并发（每批 5 项）+ 单文件重试 + Promise.allSettled，
 *     单个次级资源的瞬态 503 绝不连坐阻断 SW 安装与激活。
 * - 页面导航：
 *   · 首页/归档/照片墙/札签白名单走 SWR（缓存秒开 + 后台校验写回固定相对键）；
 *   · 单篇静态分享页 /p/*.html 走网络优先，有效 200 按自身路径独立入库（绝不覆盖 ./index.html，保留 ATK-1），
 *     断网优先回落本篇缓存、其次回落首页；
 *   · 404 / cosmos-home 等非白名单页面网络优先、不入库、离线回退首页。
 * - CSS/JS 与其余静态资源：SWR（缓存优先 + 后台更新，跳过 204 空响应）。
 * - 音频 Range 请求：全量缓存命中本地切片 206；未命中直连网络流播。
 */
const CACHE = 'sevenjohn-v302';   // 2026-11-28 分层抗 503 预缓存 + /p/*.html 独立缓存 + 统一资源版本对齐

const CORE_ESSENTIAL = [
  './index.html',
  './css/style.css?v=20261128a',
  './css/cosmos.css?v=20261118c2',
  './assets/vendor/tailwind.css',
  './assets/vendor/lucide.min.js',
  './js/projects.js?v=20261118j',
  './js/articles-meta.js?v=20261128a',
  './js/bundles/core.js?v=20261128a',
  './js/bundles/home.js?v=20261128a',
  './assets/fonts/inter.css',
  './assets/fonts/inter-var-latin.woff2',
  './assets/images/avatar.webp',
  './favicon.ico',
  './manifest.json'
];

const CORE_EXTRAS = [
  './404.html',
  './archive.html',
  './gallery.html',
  './cards.html',
  './css/cards.css?v=20261128a',
  './css/archive.css?v=20261107_v245',
  './css/gallery.css?v=20261107_v245',
  './assets/vendor/marked.min.js',
  './assets/vendor/purify.min.js',
  './js/articles.js?v=20261128a',
  './js/markdown-loader.js?v=20261128a',
  './js/bundles/sub.js?v=20261128a',
  './js/cards.js?v=20261128a',
  './js/archive.js?v=20261127a',
  './js/gallery.js?v=20261128a'
];

// 单文件预缓存（瞬态 503、204 空响应或网络抖动时延迟 250ms 重试一次；204 绝不入库也不静默视为成功）
async function cacheWithRetry(cache, url, retries = 1) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const req = new Request(url, { cache: 'reload' });
      const res = await fetch(req);
      if (res && res.ok && res.status !== 204) {
        await cache.put(url, res);
        return true;
      }
      lastErr = new Error('HTTP ' + (res ? res.status : 'empty') + ' for ' + url);
    } catch (err) {
      lastErr = err;
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw lastErr || new Error('Failed to cache ' + url);
}

// 分批并发缓存次级资源，避免单次突发并发触发 CDN/Pages 瞬态 503
async function cacheInBatches(cache, urls, batchSize = 5) {
  for (let i = 0; i < urls.length; i += batchSize) {
    const chunk = urls.slice(i, i + batchSize);
    await Promise.allSettled(chunk.map((u) => cacheWithRetry(cache, u, 1)));
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(CORE_ESSENTIAL.map((u) => cacheWithRetry(cache, u, 1)));
    await cacheInBatches(cache, CORE_EXTRAS, 5);
    await self.skipWaiting();
  })());
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
      if (!net || !net.ok || net.status === 204) return;
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
    if (again) {
      const buf = await again.arrayBuffer();
      if (buf.byteLength) return slice206(req, buf, buf.byteLength, again.headers.get('Content-Type'));
    }
    return offlineFallback('离线：音频未缓存，请联网播放一次');
  }

  // 不在首播 byte-0 阶段抢占带宽并发全量 prefetch；改为由 player.js 在 canplaythrough 后发 warm-media 静默入库

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
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  // 视频流直连 Chromium 原生 Range 管道与媒体缓存，避免 SW 拦截拖慢起播
  if (req.destination === 'video' || req.url.includes('/video/')) return;
  // 音频 Range 请求交给切片处理（必须先于缓存分支：206 无法 cache.put）
  if (req.headers.has('range')) {
    event.respondWith(handleRange(req));
    return;
  }

  // 页面导航：
  // 1) 白名单入口（首页含 ?post= 深链、归档、照片墙、札签）走 SWR；
  // 2) 单篇静态分享页 /p/*.html 走网络优先，200 响应按自身路径独立入库（绝不覆盖 ./index.html）；
  // 3) 其余非白名单 HTML（404 / cosmos-home）不入缓存，离线回退首页（保持 ATK-1 防污染）。
  if (req.mode === 'navigate') {
    const path = new URL(req.url).pathname;
    const SWR_KEYS = {
      '/': './index.html',
      '/index.html': './index.html',
      '/archive.html': './archive.html',
      '/gallery.html': './gallery.html',
      '/cards.html': './cards.html',
    };
    const key = SWR_KEYS[path];
    if (key) {
      // 用普通同源请求而不是导航请求去取：导航请求在 respondWith 返回缓存后
      // 可能被浏览器中止，导致"后台校验"永远写不回来（实测）。
      const refresh = new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' });
      const network = fetch(refresh).then((res) => {
        if (res && res.ok && res.status !== 204) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(key, copy)).catch(() => {});
        }
        return res;
      });
      event.waitUntil(network.catch(() => {}));   // 同步注册，别等 await 之后再调
      event.respondWith(
        caches.match(key)
          .then((cached) => cached || network)
          .catch(() => offlineFallback('离线：页面未缓存'))
      );
    } else if (/^\/p\/[^/]+\.html$/.test(path)) {
      const postKey = '.' + path;
      const fallbackPost = () => caches.match(postKey)
        .then((hit) => hit || caches.match('./index.html'))
        .then((hit) => hit || caches.match('index.html'))
        .then((hit) => hit || offlineFallback('离线：未缓存该文章'));
      let writePromise = Promise.resolve();
      const responsePromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            writePromise = caches.open(CACHE).then((cache) => cache.put(postKey, copy)).catch(() => {});
            return res;
          }
          if (res && res.status >= 500) {
            return caches.match(postKey).then((hit) => hit || res);
          }
          return res;
        })
        .catch(fallbackPost);
      event.respondWith(responsePromise);
      event.waitUntil(responsePromise.then(() => writePromise).catch(() => {}));
    } else {
      // 非白名单 HTML：网络优先、不入库、离线回退缓存首页
      event.respondWith(
        fetch(req).catch(() => caches.match('./index.html')
          .then((hit) => hit || caches.match('index.html'))
          .then((hit) => hit || offlineFallback('离线：未缓存该页面')))
      );
    }
    return;
  }

  // CSS/JS 与其余静态资源统一走 SWR（缓存优先 + 后台更新）。
  // ⚠️ res.ok 的 204（本机 IDM 等下载器劫持大文件时的空响应）绝不能入缓存
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
        .catch(() => cached || caches.match(req, { ignoreSearch: true }) || offlineFallback('离线：资源未缓存'));
      return cached || network;
    })
  );
});
