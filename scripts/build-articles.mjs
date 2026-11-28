/**
 * 内容生成：posts/*.md → js/articles.js（正文数据）+ js/articles-meta.js（列表元数据）
 *                     + p/<id>.html（单篇静态 SEO/分享页）+ rss.xml（全文）/ sitemap.xml
 * ----------------------------------------------------
 * 用法：
 *   node scripts/build-articles.mjs                  # 生成 articles.js + articles-meta.js + p/<id>.html + rss/sitemap
 *   node scripts/build-articles.mjs --check          # 只校验，不写文件（写作台保存前用）
 *   node scripts/build-articles.mjs --compare a.js   # 生成后把结果与 a.js 逐字段比对（迁移验收用）
 *
 * 设计要点：
 *   · Markdown 是唯一写作入口；js/articles.js、js/articles-meta.js、p/*.html 均为生成物。
 *   · 零外部 npm 依赖：调用仓库自托管 assets/vendor/marked.min.js 在 Node 侧预渲染正文。
 *   · content 仍输出成模板字符串，反引号、${、反斜杠会被正确转义 —— 正文里贴代码不怕。
 *   · 校验：id 唯一、日期格式、section 合法（缺省/creation/essay/ai）、summary 必填、
 *     section=creation 时 category 应为 小说/游戏创作、tags 不能为空。
 *   · 校验失败：--check 直接退出码 1；正常生成时保留旧文件不动（宁可不出新，也不写坏数据）。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { parseFrontMatter } from './lib/front-matter.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const POSTS = path.join(ROOT, 'posts');
const POST_PAGES_DIR = path.join(ROOT, 'p');
const STYLE_VERSION = '20261128a';
const require = createRequire(import.meta.url);

require('../js/site-config.js');
const CFG = globalThis.SITE_CONFIG || {
  name: '楠屿札记',
  url: 'https://7stevejohn.github.io',
  author: 'SevenJohn',
  ogImage: 'og-image.png',
  email: 'sevenksq@163.com',
  github: 'https://github.com/7SteveJohn'
};
const SITE_URL = String(CFG.url || 'https://7stevejohn.github.io').replace(/\/+$/, '');

// 加载本地自托管 assets/vendor/marked.min.js（优先 CommonJS，必要时回退 vm 沙箱）
function loadLocalMarked() {
  const markedPath = path.join(ROOT, 'assets/vendor/marked.min.js');
  try {
    const mod = require(markedPath);
    if (mod && typeof mod.parse === 'function') return (src) => mod.parse(String(src || ''));
    if (mod && mod.marked && typeof mod.marked.parse === 'function') return (src) => mod.marked.parse(String(src || ''));
  } catch (_) {}
  const code = fs.readFileSync(markedPath, 'utf8');
  const sandbox = {};
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.runInNewContext(code, sandbox);
  const fn = sandbox.marked && typeof sandbox.marked.parse === 'function'
    ? sandbox.marked.parse.bind(sandbox.marked)
    : sandbox.marked;
  if (typeof fn !== 'function') throw new Error('无法加载本地 assets/vendor/marked.min.js');
  return (src) => fn(String(src || ''));
}
const parseMarkdown = loadLocalMarked();

const argv = process.argv.slice(2);
const CHECK_ONLY = argv.includes('--check');
const cmpIdx = argv.indexOf('--compare');
const COMPARE_WITH = cmpIdx >= 0 ? argv[cmpIdx + 1] : null;

const SECTION_OK = ['creation', 'essay', 'ai'];
const CATEGORY_FOR_CREATION = ['小说', '游戏创作'];
const problems = [];
const warn = (msg) => problems.push('  ✗ ' + msg);

const escTemplate = (s) => String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const escHtml = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
const safeJsonLd = (obj) => JSON.stringify(obj, null, 2).replace(/<\//g, '<\\/');

const CN_NUM_MAP = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
};

function parseTitleOrder(title) {
  if (!title) return Infinity;
  const mCn = String(title).match(/^([一二三四五六七八九十]+)[、.·\s]/);
  if (mCn) {
    const s = mCn[1];
    if (s.length === 1 && CN_NUM_MAP[s]) return CN_NUM_MAP[s];
    if (s.length === 2 && s[0] === '十' && CN_NUM_MAP[s[1]]) return 10 + CN_NUM_MAP[s[1]];
    if (s.length === 2 && CN_NUM_MAP[s[0]] && s[1] === '十') return CN_NUM_MAP[s[0]] * 10;
    if (s.length === 3 && CN_NUM_MAP[s[0]] && s[1] === '十' && CN_NUM_MAP[s[2]]) return CN_NUM_MAP[s[0]] * 10 + CN_NUM_MAP[s[2]];
  }
  const mNum = String(title).match(/^(\d+)[、.·\s]/);
  if (mNum) return parseInt(mNum[1], 10);
  return Infinity;
}

function estimateReadTime(text) {
  const plain = String(text || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#>*`\-\[\]()!]/g, '');
  const cjk = (plain.match(/[\u4e00-\u9fff]/g) || []).length;
  const latin = (plain.match(/[A-Za-z0-9]+/g) || []).length;
  return `${Math.max(1, Math.round(cjk / 400 + latin / 200))} 分钟`;
}

function listMd(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => path.join(dir, f));
}

// ---------------- 文章 ----------------
function loadArticles() {
  const files = listMd(POSTS).sort();
  const arts = [];
  const seen = new Set();

  files.forEach((file) => {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const { data, body, hasFrontMatter } = parseFrontMatter(fs.readFileSync(file, 'utf8'));
    if (!hasFrontMatter) return warn(`${rel}：缺少 front matter，已跳过`);
    if (!data.id) return warn(`${rel}：缺 id`);
    if (seen.has(data.id)) return warn(`${rel}：id 与前面的文章重复（${data.id}）`);
    seen.add(data.id);
    if (!data.title) warn(`${rel}：缺 title`);
    if (!data.summary) warn(`${rel}：缺 summary（列表与 RSS 都要用）`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.date || ''))) warn(`${rel}：date 需为 YYYY-MM-DD`);
    if (data.section !== undefined && !SECTION_OK.includes(data.section)) warn(`${rel}：section 只能是 ${SECTION_OK.join('/')} 或留空`);
    if (data.section === 'creation' && data.category && !CATEGORY_FOR_CREATION.includes(data.category)) {
      warn(`${rel}：section=creation 的 category 建议为 ${CATEGORY_FOR_CREATION.join(' / ')}`);
    }
    if (!Array.isArray(data.tags) || !data.tags.length) warn(`${rel}：tags 不能为空`);

    const art = {
      id: String(data.id),
      title: String(data.title || ''),
      date: String(data.date || ''),
      readTime: String(data.readTime || estimateReadTime(body)),
      category: String(data.category || (data.section === 'creation' ? '小说' : '技术手记'))
    };
    if (data.section) art.section = String(data.section);
    art.summary = String(data.summary || '');
    if (data.cover) art.cover = String(data.cover);
    art.tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
    // 正文只做「掐掉首尾空白」的归一：运行时 content 的首尾换行与缩进由下面的模板
    // 排版产生（与手写时代逐字节一致，迁移时的等价性比对就是这么过的）
    art.content = body.replace(/^\n+/, '').replace(/\s+$/, '');
    arts.push(art);
  });
  // 排序保持结构确定性：
  // 1. 普通文章（手记、随笔、创作）按日期升序（与手写时代保持完全一致）
  // 2. AI 学习系列（section=ai）作为系列文章，必须按标题序号（一→七）严格升序排在手记之后
  const normal = arts.filter((a) => a.section !== 'ai');
  const ai = arts.filter((a) => a.section === 'ai');

  normal.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  ai.sort((a, b) => {
    const oa = parseTitleOrder(a.title);
    const ob = parseTitleOrder(b.title);
    if (oa !== ob) return oa - ob;
    return (a.date || '').localeCompare(b.date || '');
  });

  return [...normal, ...ai];
}

function renderArticles(arts) {
  const items = arts.map((a) => {
    const lines = [
      `    id: ${JSON.stringify(a.id)},`,
      `    title: ${JSON.stringify(a.title)},`,
      `    date: ${JSON.stringify(a.date)},`,
      `    readTime: ${JSON.stringify(a.readTime)},`,
      `    category: ${JSON.stringify(a.category)},`
    ];
    if (a.section) lines.push(`    section: ${JSON.stringify(a.section)},`);
    lines.push(`    summary: ${JSON.stringify(a.summary)},`);
    if (a.cover) lines.push(`    cover: ${JSON.stringify(a.cover)},`);
    lines.push(`    tags: [${a.tags.map((t) => JSON.stringify(t)).join(', ')}],`);
    // 与手写时代的排版保持一致：开引号后换行、正文、缩进四格后再收引号
    // （这样运行时 content 的首尾是 "\n" 与 "\n    "，与历史值逐字节相同）
    lines.push('    content: `');
    lines.push(escTemplate(a.content));
    lines.push('    `');
    return '  {\n' + lines.join('\n') + '\n  }';
  });
  return `/**
 * 文章数据（❗生成物，不要手改）
 * ----------------------------------------------------
 * 写作入口是 posts/*.md（front matter + Markdown 正文），
 * 由 \`node scripts/build-articles.mjs\`（或本地写作台）生成这个文件。
 * 手改这里会在下次生成时被覆盖。
 * 生成时间之外的所有内容都由 posts/ 决定，站点运行时代码只读 window.ARTICLES_DATA。
 */
window.ARTICLES_DATA = [
${items.join(',\n')}
];
`;
}

// 归档页 / 任何只需要列表信息的页面用这份：省掉 90%+ 的正文体积
function renderArticlesMeta(arts) {
  const items = arts.map((a) => '  ' + JSON.stringify({
    id: a.id,
    title: a.title,
    date: a.date,
    readTime: a.readTime,
    category: a.category,
    ...(a.section ? { section: a.section } : {}),
    summary: a.summary,
    ...(a.cover ? { cover: a.cover } : {}),
    tags: a.tags
  }));
  return `/**
 * 文章元数据（❗生成物，不要手改）
 * ----------------------------------------------------
 * 与 js/articles.js 同源，只去掉 content 正文；
 * 归档页这类「只列标题/日期/摘要」的页面加载这一份即可。
 */
window.ARTICLES_DATA = [
${items.join(',\n')}
];
`;
}

// ---------------- 单篇静态 SEO / 分享页（p/<id>.html）----------------
// 与 js/app.js 的 getSiblingList 保持 100% 同序
function getSiblingList(article, allArts) {
  const sortedDesc = allArts.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (article.section === 'creation') {
    return sortedDesc.filter((a) => a.section === 'creation' && (a.category === '游戏创作') === (article.category === '游戏创作'));
  }
  if (article.section === 'essay') {
    return sortedDesc.filter((a) => a.section === 'essay');
  }
  if (article.section === 'ai') {
    return allArts
      .filter((a) => a.section === 'ai')
      .slice()
      .sort((a, b) => {
        const oa = parseTitleOrder(a.title);
        const ob = parseTitleOrder(b.title);
        if (oa !== ob) return oa - ob;
        return (a.date || '').localeCompare(b.date || '');
      });
  }
  return sortedDesc.filter((a) => !a.section);
}

function resolveOgImage(article) {
  const fallback = `${SITE_URL}/${CFG.ogImage || 'og-image.png'}`;
  const cover = String(article.cover || '').trim();
  if (!cover) return fallback;
  // Open Graph / 社交卡片不支持 SVG 预览图，仅对光栅图片使用文章封面
  if (/\.svg(?:[?#].*)?$/i.test(cover)) return fallback;
  if (/^https?:\/\//i.test(cover)) return cover;
  return `${SITE_URL}/${cover.replace(/^\/+/, '')}`;
}

function resolveRelativeAsset(src) {
  const clean = String(src || '').trim();
  if (!clean) return '';
  if (/^(https?:|data:|\/)/i.test(clean)) return clean;
  return '../' + clean.replace(/^\.\//, '');
}

function renderStaticPostHtml(art, allArts) {
  const canonical = `${SITE_URL}/p/${encodeURIComponent(art.id)}.html`;
  const ogImage = resolveOgImage(art);
  const coverSrc = resolveRelativeAsset(art.cover);
  const modalHref = `../index.html?post=${encodeURIComponent(art.id)}`;
  const rawBody = parseMarkdown(art.content || '')
    .replace(/\b(src|href)="(?:\.\/)?(assets\/[^"]+)"/g, '$1="../$2"')
    .replace(/\bhref="(?:\.\/)?((?:index|archive|gallery|cards)\.html(?:[?#][^"]*)?)"/g, 'href="../$1"')
    .replace(/<table>/g, '<div class="md-table-wrap"><table>')
    .replace(/<\/table>/g, '</table></div>')
    .trim();

  const siblings = getSiblingList(art, allArts);
  const idx = siblings.findIndex((x) => x.id === art.id);
  const prevArt = idx > 0 ? siblings[idx - 1] : null;
  const nextArt = idx > -1 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: art.title,
    description: art.summary,
    datePublished: art.date,
    dateModified: art.date,
    articleSection: art.category || '技术手记',
    keywords: (art.tags || []).join(', '),
    inLanguage: 'zh-CN',
    url: canonical,
    image: ogImage,
    author: {
      '@type': 'Person',
      name: CFG.author || 'SevenJohn',
      url: `${SITE_URL}/`
    },
    publisher: {
      '@type': 'Person',
      name: CFG.name || '楠屿札记',
      url: `${SITE_URL}/`
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical
    }
  };

  const tagsHtml = (art.tags || []).length
    ? `<div class="post-tags">${art.tags.map((t) => `<span class="post-tag">#${escHtml(t)}</span>`).join('')}</div>`
    : '';

  const coverHtml = coverSrc
    ? `<figure class="post-cover"><img src="${escHtml(coverSrc)}" alt="${escHtml(art.title)}" loading="eager" decoding="async" /></figure>`
    : '';

  const pagerHtml = (prevArt || nextArt)
    ? `<nav class="post-pager" aria-label="相邻文章">
        ${prevArt
          ? `<a class="post-pager-card" href="./${encodeURIComponent(prevArt.id)}.html"><span class="post-pager-k">← 上一篇</span><span class="post-pager-v">${escHtml(prevArt.title)}</span></a>`
          : '<span></span>'}
        ${nextArt
          ? `<a class="post-pager-card post-pager-next" href="./${encodeURIComponent(nextArt.id)}.html"><span class="post-pager-k">下一篇 →</span><span class="post-pager-v">${escHtml(nextArt.title)}</span></a>`
          : '<span></span>'}
      </nav>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(art.title)} | ${escHtml(CFG.name || '楠屿札记')}</title>

  <meta name="color-scheme" content="light dark" />
  <meta name="theme-color" content="#f8fafc" />
  <script>
    (function () {
      var root = document.documentElement;
      root.classList.add('js');
      var isDark = false;
      try {
        if (localStorage.getItem('sj.theme-v6') !== 'daylight-v1') {
          localStorage.removeItem('sj.theme');
          localStorage.setItem('sj.theme-v6', 'daylight-v1');
        }
        isDark = localStorage.getItem('sj.theme') === 'dark';
      } catch (e) {}
      root.classList.toggle('dark', isDark);
      var m = document.querySelector('meta[name="color-scheme"]');
      if (m) m.content = isDark ? 'dark' : 'light';
      var tc = document.querySelector('meta[name="theme-color"]');
      if (tc) tc.content = isDark ? '#060911' : '#f8fafc';
    })();
  </script>

  <meta name="description" content="${escHtml(art.summary)}" />
  <link rel="canonical" href="${escHtml(canonical)}" />

  <!-- Open Graph / Twitter Card -->
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="${escHtml(CFG.name || '楠屿札记')}" />
  <meta property="og:title" content="${escHtml(art.title)}" />
  <meta property="og:description" content="${escHtml(art.summary)}" />
  <meta property="og:url" content="${escHtml(canonical)}" />
  <meta property="og:image" content="${escHtml(ogImage)}" />
  <meta property="article:published_time" content="${escHtml(art.date)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escHtml(art.title)}" />
  <meta name="twitter:description" content="${escHtml(art.summary)}" />
  <meta name="twitter:image" content="${escHtml(ogImage)}" />

  <link rel="alternate" type="application/rss+xml" title="${escHtml(CFG.rssTitle || '楠屿札记 · 手记与创作')}" href="../rss.xml" />
  <link rel="shortcut icon" href="../favicon.ico" />
  <link rel="apple-touch-icon" href="../apple-touch-icon.png" />
  <link rel="manifest" href="../manifest.json" />

  <link rel="preload" href="../assets/fonts/inter-var-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="../assets/fonts/inter.css" />
  <link rel="stylesheet" href="../assets/vendor/tailwind.css" />
  <link rel="stylesheet" href="../css/style.css?v=${STYLE_VERSION}" />

  <script type="application/ld+json">
${safeJsonLd(jsonLd)}
  </script>

  <style>
    .post-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
      color: #1d1d1f;
    }
    .dark .post-shell {
      background: #060911;
      color: #f1f5f9;
    }
    .post-bar {
      position: sticky;
      top: 0;
      z-index: 40;
      background: rgba(255, 255, 255, 0.88);
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    .dark .post-bar {
      background: rgba(6, 9, 17, 0.86);
      border-bottom-color: rgba(255, 255, 255, 0.1);
    }
    .post-bar-in {
      max-width: 52rem;
      margin: 0 auto;
      padding: 0 1.25rem;
      height: 3.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .post-brand {
      font-size: 0.9375rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #0f172a;
      text-decoration: none;
      white-space: nowrap;
    }
    .dark .post-brand { color: #f8fafc; }
    .post-nav {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      font-size: 0.75rem;
    }
    .post-nav-link {
      color: #475569;
      text-decoration: none;
      padding: 0.3rem 0.55rem;
      border-radius: 9999px;
      transition: color 0.18s ease, background-color 0.18s ease;
      white-space: nowrap;
    }
    .post-nav-link:hover {
      color: #0f172a;
      background: rgba(15, 23, 42, 0.06);
    }
    .dark .post-nav-link { color: #94a3b8; }
    .dark .post-nav-link:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.08);
    }
    .post-bgm-cta {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.32rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-decoration: none;
      color: #ffffff;
      background: #0369a1;
      transition: opacity 0.18s ease, transform 0.18s ease;
      white-space: nowrap;
    }
    .post-bgm-cta:hover { opacity: 0.92; transform: translateY(-1px); }
    .dark .post-bgm-cta {
      color: #06121f;
      background: #38bdf8;
    }
    .post-theme-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: 9999px;
      border: 1px solid rgba(15, 23, 42, 0.12);
      background: transparent;
      color: #334155;
      cursor: pointer;
      transition: background-color 0.18s ease, color 0.18s ease;
    }
    .post-theme-btn:hover { background: rgba(15, 23, 42, 0.06); color: #0f172a; }
    .dark .post-theme-btn {
      border-color: rgba(255, 255, 255, 0.16);
      color: #cbd5e1;
    }
    .dark .post-theme-btn:hover { background: rgba(255, 255, 255, 0.1); color: #ffffff; }
    .post-main {
      flex: 1;
      width: 100%;
      max-width: 50rem;
      margin: 0 auto;
      padding: 2.5rem 1.25rem 4rem;
    }
    .post-article {
      background: #ffffff;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 1.25rem;
      padding: 2rem 1.5rem 2.25rem;
      box-shadow: 0 10px 32px -16px rgba(15, 23, 42, 0.08);
    }
    @media (min-width: 640px) {
      .post-article { padding: 2.75rem 3rem 3rem; }
    }
    .dark .post-article {
      background: #0f1522;
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 16px 40px -20px rgba(0, 0, 0, 0.65);
    }
    .post-head {
      padding-bottom: 1.5rem;
      margin-bottom: 1.75rem;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    }
    .dark .post-head { border-bottom-color: rgba(255, 255, 255, 0.1); }
    .post-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: #475569;
      margin-bottom: 0.85rem;
    }
    .dark .post-meta { color: #94a3b8; }
    .post-cat {
      padding: 0.15rem 0.6rem;
      border-radius: 9999px;
      font-weight: 600;
      color: #0369a1;
      background: rgba(3, 105, 161, 0.1);
    }
    .dark .post-cat {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.14);
    }
    .post-title {
      font-size: clamp(1.55rem, 3.2vw, 2.15rem);
      font-weight: 800;
      line-height: 1.25;
      letter-spacing: -0.025em;
      color: #0f172a;
      margin: 0;
    }
    .dark .post-title { color: #f8fafc; }
    .post-summary {
      margin-top: 0.9rem;
      font-size: 0.95rem;
      line-height: 1.75;
      color: #475569;
    }
    .dark .post-summary { color: #cbd5e1; }
    .post-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-top: 1rem;
    }
    .post-tag {
      font-size: 0.75rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      padding: 0.15rem 0.55rem;
      border-radius: 0.375rem;
      color: #334155;
      background: rgba(15, 23, 42, 0.05);
    }
    .dark .post-tag {
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.08);
    }
    .post-cover {
      margin: 0 0 1.75rem;
      border-radius: 0.875rem;
      overflow: hidden;
      border: 1px solid rgba(15, 23, 42, 0.08);
      background: rgba(15, 23, 42, 0.03);
      aspect-ratio: 16 / 9;
      max-height: 20rem;
    }
    .dark .post-cover {
      border-color: rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.04);
    }
    .post-cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .post-article .markdown-body {
      color: #1d1d1f;
    }
    .dark .post-article .markdown-body {
      color: #e2e8f0;
    }
    .post-article .markdown-body pre {
      padding: 1rem 1.1rem;
    }
    .post-article .markdown-body pre code {
      color: #e6edf3;
    }
    .post-article .markdown-body blockquote {
      color: #475569;
    }
    .dark .post-article .markdown-body blockquote {
      color: #cbd5e1;
    }
    .post-article .markdown-body a {
      color: var(--accent);
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .post-pager {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.85rem;
      margin-top: 2rem;
    }
    @media (max-width: 600px) {
      .post-pager { grid-template-columns: 1fr; }
      .post-bgm-cta span.cta-extra { display: none; }
    }
    .post-pager-card {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      padding: 0.95rem 1.1rem;
      border-radius: 0.875rem;
      text-decoration: none;
      background: #ffffff;
      border: 1px solid rgba(15, 23, 42, 0.09);
      transition: border-color 0.18s ease, transform 0.18s ease;
    }
    .post-pager-card:hover {
      border-color: var(--accent);
      transform: translateY(-1px);
    }
    .dark .post-pager-card {
      background: #0f1522;
      border-color: rgba(255, 255, 255, 0.1);
    }
    .post-pager-next { text-align: right; }
    .post-pager-k {
      font-size: 0.72rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: var(--accent);
    }
    .post-pager-v {
      font-size: 0.875rem;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.45;
    }
    .dark .post-pager-v { color: #f1f5f9; }
    .post-foot {
      border-top: 1px solid rgba(15, 23, 42, 0.08);
      padding: 2rem 1.25rem;
      font-size: 0.75rem;
      color: #475569;
    }
    .dark .post-foot {
      border-top-color: rgba(255, 255, 255, 0.1);
      color: #94a3b8;
    }
    .post-foot-in {
      max-width: 50rem;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .post-foot-links {
      display: flex;
      flex-wrap: wrap;
      gap: 1.1rem;
    }
    .post-foot-links a {
      color: inherit;
      text-decoration: none;
    }
    .post-foot-links a:hover { color: var(--accent); }
  </style>
</head>
<body class="post-shell antialiased">
  <header class="post-bar">
    <div class="post-bar-in">
      <a href="../index.html" class="post-brand">${escHtml(CFG.name || '楠屿札记')}</a>
      <nav aria-label="文章页导航" class="post-nav">
        <a href="${escHtml(modalHref)}" class="post-bgm-cta" title="回到首页弹窗阅读，支持背景音乐与站内翻章">
          <span>首页沉浸阅读<span class="cta-extra">（含 BGM）</span></span>
        </a>
        <a href="../archive.html" class="post-nav-link">归档</a>
        <button id="theme-toggle" type="button" class="post-theme-btn" aria-label="切换明暗模式" title="切换晨曦/极夜模式">
          <svg class="w-4 h-4 hidden dark:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          <svg class="w-4 h-4 block dark:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        </button>
      </nav>
    </div>
  </header>

  <main class="post-main">
    <article class="post-article">
      <header class="post-head">
        <div class="post-meta">
          <span class="post-cat">${escHtml(art.category || '技术手记')}</span>
          <time datetime="${escHtml(art.date)}">${escHtml(art.date)}</time>
          <span aria-hidden="true">·</span>
          <span>${escHtml(art.readTime)}</span>
        </div>
        <h1 class="post-title">${escHtml(art.title)}</h1>
        <p class="post-summary">${escHtml(art.summary)}</p>
        ${tagsHtml}
      </header>
      ${coverHtml}
      <div class="markdown-body">
${rawBody}
      </div>
    </article>
    ${pagerHtml}
  </main>

  <footer class="post-foot">
    <div class="post-foot-in">
      <span>© <span id="footer-year">2026</span> ${escHtml(CFG.name || '楠屿札记')} · 慢慢写，慢慢看。</span>
      <div class="post-foot-links">
        <a href="../index.html">首页</a>
        <a href="../archive.html">归档</a>
        <a href="../gallery.html">照片墙</a>
        <a href="../rss.xml">RSS</a>
      </div>
    </div>
  </footer>

  <script>
    (function () {
      var root = document.documentElement;
      var syncMeta = function (dark) {
        var m = document.querySelector('meta[name="color-scheme"]');
        if (m) m.content = dark ? 'dark' : 'light';
        var tc = document.querySelector('meta[name="theme-color"]');
        if (tc) tc.content = dark ? '#060911' : '#f8fafc';
      };
      var btn = document.getElementById('theme-toggle');
      if (btn) {
        btn.addEventListener('click', function () {
          var dark = root.classList.toggle('dark');
          syncMeta(dark);
          try { localStorage.setItem('sj.theme', dark ? 'dark' : 'light'); } catch (e) {}
        });
      }
      window.addEventListener('storage', function (ev) {
        if (ev.key === 'sj.theme') {
          var dark = ev.newValue === 'dark';
          root.classList.toggle('dark', dark);
          syncMeta(dark);
        }
      });
      var y = document.getElementById('footer-year');
      if (y) y.textContent = String(new Date().getFullYear());

      // 按需补齐代码高亮（仅当正文存在代码块时加载，离线或失败静默降级）
      if (document.querySelector('.markdown-body pre code')) {
        var css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = '../assets/vendor/github-dark.min.css';
        document.head.appendChild(css);
        var js = document.createElement('script');
        js.src = '../assets/vendor/highlight.min.js';
        js.onload = function () {
          if (window.hljs) {
            document.querySelectorAll('.markdown-body pre code').forEach(function (el) {
              window.hljs.highlightElement(el);
            });
          }
        };
        document.head.appendChild(js);
      }

      if ('serviceWorker' in navigator && window.isSecureContext && location.protocol !== 'file:') {
        navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(function () {});
      }
    })();
  </script>
</body>
</html>
`;
}

function buildStaticPostPages(arts) {
  fs.mkdirSync(POST_PAGES_DIR, { recursive: true });
  const expected = new Set();
  for (const art of arts) {
    const filename = `${art.id}.html`;
    expected.add(filename);
    fs.writeFileSync(path.join(POST_PAGES_DIR, filename), renderStaticPostHtml(art, arts), 'utf8');
  }
  let removed = 0;
  for (const name of fs.readdirSync(POST_PAGES_DIR)) {
    if (name.endsWith('.html') && !expected.has(name)) {
      fs.unlinkSync(path.join(POST_PAGES_DIR, name));
      removed++;
    }
  }
  return { written: expected.size, removed };
}

// ---------------- 主流程 ----------------
const arts = loadArticles();

if (problems.length) {
  console.error('内容校验未通过：');
  problems.forEach((p) => console.error(p));
  process.exit(1);
}
if (!arts.length) {
  console.error('posts/ 下没有可用的文章（至少需要一篇带 front matter 的 .md）');
  process.exit(1);
}

if (CHECK_ONLY) {
  console.log(`✓ 校验通过：${arts.length} 篇文章`);
  process.exit(0);
}

fs.writeFileSync(path.join(ROOT, 'js/articles.js'), renderArticles(arts));
fs.writeFileSync(path.join(ROOT, 'js/articles-meta.js'), renderArticlesMeta(arts));
const pageStats = buildStaticPostPages(arts);

// RSS / sitemap 跟着一起刷新（gen-rss 读 js/articles.js 与 site-config.js）
const rss = spawnSync(process.execPath, [path.join(ROOT, 'scripts/gen-rss.js')], { cwd: ROOT, stdio: 'inherit' });

console.log(
  `✓ js/articles.js + js/articles-meta.js + p/*.html 已生成（${arts.length} 篇${pageStats.removed ? `，清理过期 ${pageStats.removed} 篇` : ''}）`
);

// ---------------- 等价性比对（迁移验收）----------------
if (COMPARE_WITH) {
  const before = { window: {} };
  const after = { window: {} };
  const load = (p, sandbox) => {
    const code = fs.readFileSync(p, 'utf8');
    new Function('window', code)(sandbox.window);
    return sandbox.window.ARTICLES_DATA || [];
  };
  const a = load(path.resolve(ROOT, COMPARE_WITH), before);
  const b = load(path.join(ROOT, 'js/articles.js'), after);
  const diffs = [];
  if (a.length !== b.length) diffs.push(`文章数不同：${a.length} → ${b.length}`);
  const byId = new Map(b.map((x) => [x.id, x]));
  a.forEach((old) => {
    const now = byId.get(old.id);
    if (!now) return diffs.push(`丢失文章：${old.id}`);
    Object.keys({ ...old, ...now }).forEach((k) => {
      const x = JSON.stringify(old[k]);
      const y = JSON.stringify(now[k]);
      if (x !== y) diffs.push(`${old.id}.${k} 不一致\n    旧: ${String(x).slice(0, 120)}\n    新: ${String(y).slice(0, 120)}`);
    });
  });
  if (diffs.length) {
    console.error(`\n❌ 等价性比对未通过（${diffs.length} 处）：`);
    diffs.slice(0, 12).forEach((d) => console.error('  ✗ ' + d));
    process.exit(1);
  }
  console.log(`✓ 等价性比对通过：${a.length} 篇文章逐字段一致（含正文）`);
}
if (rss.status !== 0) process.exit(rss.status || 1);
