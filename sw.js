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
const CACHE = 'sevenjohn-v142';   // 2026-10-17 撤掉滚轮阻尼（app.js / tab-nav.js 更新）
const CORE = [
  './',
  'index.html',
  '404.html',
  // 归档与照片墙（2026-10-16 新增）：文本资源很小，直接预缓存，断网可翻
  'archive.html',
  'gallery.html',
  'garden.html',
  'links.html',
  'novel.html',
  'css/style.css',
  'css/cosmos.css',
  'css/archive.css',
  'css/gallery.css',
  'css/garden.css',
  'css/links.css',
  'css/novel.css',
  'css/settings-panel.css',
  'js/cosmos.js',        // 手机 / 无 WebGL 时的 2D 星河回退（js/cosmos/main.js 引导层按需加载）
  'js/cosmos/config.js',
  'js/cosmos/main.js',   // 背景引导层：设备分档（full/lite/static），桌面动态 import main3d
  'js/cosmos/main3d.js', // 桌面 3D 等高线岛图（动态加载，three 只在桌面路径下载）
  'js/cosmos/scene/IsolinesField.js',
  'js/cosmos/audio/AudioManager.js',
  'js/cosmos/audio/BeatDetector.js',
  'js/cosmos/interaction/InteractionManager.js',
  // three.module.min.js（692KB）不进预缓存（2026-10-01 体检 PERF-3）：只有桌面 full 档动态
  // import 它，手机/lite/static 档永不使用；桌面首次加载时由 CSS/JS 网络优先分支自动入库。
  'js/video-gate.js',   // 介绍视频海报态：播放前叠居中播放键，点击唤出原生控件
  'js/player.js',   // 站点歌单播放器：推理场的音频来源之一（__BEAT），断网也要能起来
  // 本地化依赖（原 CDN 已全部下放到 assets/vendor，断网也能完整渲染）
  'assets/vendor/tailwind.css',
  'assets/vendor/marked.min.js',
  'assets/vendor/purify.min.js',
  // highlight.min.js（122KB）不进预缓存（2026-10-01 体检 PERF-3）：index.html 的按需策略
  // 是"只有文章里真有代码块才拉"，预缓存它等于让按需策略形同虚设；首次在线加载自动入缓存。
  'assets/vendor/github-dark.min.css',
  'js/app.js',
  'js/articles.js',
  'js/projects.js',
  'js/particles.js',
  'js/search.js',
  'js/status.js',
  // 站点配置唯一来源（站名/社交/壁纸清单/页面清单），wallpaper 等脚本依赖它
  'js/site-config.js',
  // 新页面与新增效果（2026-10-16）：深空壁纸门控、按住 Tab 的快速导航、
  // 次级页共用外壳、归档时间河、照片墙
  'js/wallpaper.js',
  'js/tab-nav.js',
  'js/settings-panel.js',
  'js/nav-indicator.js',
  'js/garden.js',
  'js/garden/life.js',
  'js/garden/sorting.js',
  'js/garden/stars.js',
  'js/links.js',
  'js/friends.js',
  'js/bookmarks.js',
  'js/novel.js',
  'js/novel-data.js',
  'js/subpage.js',
  'js/archive.js',
  'js/gallery.js',
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
  );
});

// 断网且无缓存时的兜底响应（返回 undefined 会让请求永久挂起，load 事件永不触发）
const offlineFallback = (msg) => new Response(msg, {
  status: 503,
  statusText: 'offline',
  headers: { 'Content-Type': 'text/plain; charset=utf-8' }
});

// 媒体 Range 请求（<audio> 播放/拖进度条）：
// 全量缓存命中 → 本地切片返 206，即时；
// 预热切片（'?sjwarm=1'，首曲前 256KB）命中且起点在切片内 → 本地返 206，点播放零网络等待；
// 未缓存 → 流式秒开（不等待全量）。全量入库只在真实播放 2.5s 后由页面 postMessage 触发。
// ⚠️ Range 请求绝不能回 200：Chromium 会把 seekable 清零，进度条直接报废——
//    上游原生 206 原样透传；上游只回 200（如 python http.server）时把 body 流包装成 206。
// ⚠️ 下载管理器（IDM 等）劫持会返回空 body：空响应不入缓存，坏缓存可自愈。
const prefetches = new Map(); // url -> Promise（单例去重，防 seek 反复触发全量下载）

function slice206(req, buf, total, type) {
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.get('range') || '') || [];
  const start = Number(m[1] || 0);
  // end 钳到缓冲实际长度：预热切片比真实文件小，浏览器带右端点的 Range（如 bytes=0-299999）
  // 不能声称给出缓冲之外的字节，否则 Content-Range 与 Content-Length 自相矛盾，播放器会卡死
  const end = Math.min(m[2] ? Number(m[2]) : Infinity, buf.byteLength - 1);
  const slice = buf.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': type || 'audio/mpeg',
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
      await cache.delete(url + '?sjwarm=1');   // 全量已入库，256KB 起播预热切片功成身退
    }).catch(() => {}).finally(() => prefetches.delete(url));
    prefetches.set(url, p);
  }
  return prefetches.get(url);
}

// 起播缓冲预热（2026-10-01 体检 PERF-1/2 重做）：旧行为是「页面加载即 preload=auto 全曲缓冲
// + 任何 Range 请求 2.5s 后全量入库」，没点播放的访客也被动下 4~8MB。新设计拆成三段：
// ① 页面端 restore() 发 warm-media 消息 → 只拉首曲前 WARM_BYTES 字节入缓存；
// ② 点播放时 handleRange 命中预热切片 → 立刻出声（零网络 RTT），后续段落照常流式；
// ③ 真实播放 2.5s 后 postMessage（prefetch-media）→ 全量入库，二播秒开 + 离线可播。
// 全量下载只属于「真的听过」的人；预热上限 WARM_BYTES，上游不支持 Range（回 200 全量）时
// 也只读前 WARM_BYTES 就掐断流，绝不退化成全量下载。
const WARM_BYTES = 262144; // 256KB：128kbps 下约 16 秒音频，起播缓冲绰绰有余

async function warmPartial(url) {
  const net = await fetch(url, { headers: { Range: 'bytes=0-' + (WARM_BYTES - 1) } });
  if (!net || !net.ok || !net.body) return;
  const reader = net.body.getReader();
  const chunks = [];
  let got = 0;
  while (got < WARM_BYTES) {
    const chunk = await reader.read();
    if (chunk.done) break;
    chunks.push(chunk.value);
    got += chunk.value.byteLength;
  }
  if (got < WARM_BYTES) { try { await reader.cancel(); } catch (e) {} }
  if (!got) return;
  const buf = new Uint8Array(got);
  let off = 0;
  for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
  const total = net.status === 206
    ? Number((/\/(\d+)\s*$/.exec(net.headers.get('Content-Range') || '') || [])[1] || 0)
    : Number(net.headers.get('Content-Length') || 0);
  const cache = await caches.open(CACHE);
  await cache.put(url + '?sjwarm=1', new Response(buf, {
    headers: {
      'Content-Type': net.headers.get('Content-Type') || 'audio/mpeg',
      'X-SJ-Warm-Total': String(total || 0),
      'X-SJ-Warm-Len': String(got)
    }
  }));
  return { got: got, total: total };
}

async function handleRange(req) {
  const cached = await caches.match(req, { ignoreVary: true });
  if (cached) {
    const buf = await cached.arrayBuffer();
    // 空 buf 视为坏缓存，走下方自愈；MIME 用缓存里的真实类型（视频不是 audio/mpeg）
    if (buf.byteLength) return slice206(req, buf, buf.byteLength, cached.headers.get('Content-Type'));
  }
  const start = Number((/bytes=(\d+)/.exec(req.headers.get('range') || '') || [])[1] || 0);
  // 起播快路径：预热切片命中且请求起点落在切片内 → 本地立刻回 206（真实总长在 X-SJ-Warm-Total）
  if (start < WARM_BYTES) {
    const warm = await caches.match(req.url + '?sjwarm=1', { ignoreVary: true }).catch(() => null);
    if (warm) {
      const wbuf = await warm.arrayBuffer();
      const wTotal = Number(warm.headers.get('X-SJ-Warm-Total') || 0);
      if (wbuf.byteLength && start < wbuf.byteLength && (!wTotal || start < wTotal)) {
        return slice206(req, wbuf, wTotal || wbuf.byteLength, warm.headers.get('Content-Type'));
      }
    }
  }
  const net = await fetch(req).catch(() => null);
  if (!net) {
    await prefetch(req.url);
    const again = await caches.match(req, { ignoreVary: true });
    if (again) return slice206(req, await again.arrayBuffer(), (await again.arrayBuffer()).byteLength, again.headers.get('Content-Type'));
    return offlineFallback('离线：音频未缓存，请联网播放一次');
  }
  if (net.status === 206) {
    // 上游原生支持 Range：原样透传（流式秒开）。不触发后台全量下载——
    // 全量入库只由「真实播放 2.5s」的 postMessage 通道负责（2026-10-01 体检 PERF-2）
    return net;
  }
  const total = Number(net.headers.get('content-length') || 0);
  if (start === 0 && total && net.body) {
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
    if (buf.byteLength) return slice206(req, buf, buf.byteLength, again.headers.get('Content-Type'));
  }
  return net;
}

// 页面端触发的确定性预热：audio "playing" 2.5s 后 postMessage 过来（player.js）。
// message 是 extendable 事件，waitUntil 保证 SW 活到全量入库——SW 内裸 setTimeout 不可靠。
self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === 'prefetch-media' && data.url) {
    event.waitUntil(prefetch(data.url));
  }
  if (data && data.type === 'warm-media' && data.url) {
    const port = event.source;
    event.waitUntil(
      warmPartial(data.url, port)
        .then((r) => { try { if (port) port.postMessage({ type: 'warm-ok', result: r }); } catch (e) {} })
        .catch((e) => {
          // 预热失败不影响播放（handleRange 会照常走网络），但把原因报回页面便于排查
          try { if (port) port.postMessage({ type: 'warm-error', message: String(e && e.stack || e).slice(0, 400) }); } catch (e2) {}
        })
    );
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
      event.respondWith(
        caches.match(key).then((cached) => {
          const network = fetch(req)
            .then((res) => {
              if (res && res.ok) {
                const copy = res.clone();
                caches.open(CACHE).then((cache) => cache.put(key, copy));
              }
              return res;
            })
            .catch(() => cached || offlineFallback('离线：页面未缓存'));
          return cached || network;
        })
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
