/**
 * RSS / Sitemap 生成器（零构建：仅新增文章后手动运行一次）
 * ----------------------------------------------------
 * 用法：node scripts/gen-rss.js
 * 读取 js/articles.js 的 ARTICLES_DATA 与 js/site-config.js 的页面清单，
 * 在站点根目录生成 rss.xml 与 sitemap.xml。
 *
 * ❗2026-10-17 修：此前 sitemap 只输出首页 + ?post= 深链，手工补进去的
 *   archive.html / gallery.html 会在下次生成时被覆盖掉。现在页面部分统一从
 *   js/site-config.js 的 pages（sitemap:true）来 —— 加页面只改那一处。
 */

const fs = require('fs');
const path = require('path');

require('../js/site-config.js');
const CFG = global.SITE_CONFIG;
const SITE_URL = CFG.url;

// articles.js 是浏览器脚本（挂 window.ARTICLES_DATA），这里模拟 window 环境后加载
global.window = {};
require('../js/articles.js');
// 与页面展示一致：统一按日期倒序
const articles = [...(global.window.ARTICLES_DATA || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

const escapeXml = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const postUrl = (id) => `${SITE_URL}/?post=${encodeURIComponent(id)}`;

// ---------- rss.xml ----------
const rssItems = articles
  .map(
    (a) => `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${postUrl(a.id)}</link>
      <guid isPermaLink="false">${escapeXml(a.id)}</guid>
      <pubDate>${new Date(a.date).toUTCString()}</pubDate>
      <category>${escapeXml(a.category || '技术手记')}</category>
      <description>${escapeXml(a.summary)}</description>
    </item>`
  )
  .join('\n');

const latest = articles.reduce((max, a) => (a.date > max ? a.date : max), articles[0] ? articles[0].date : '');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(CFG.rssTitle)}</title>
    <link>${SITE_URL}/</link>
    <description>${escapeXml(CFG.rssDescription)}</description>
    <language>zh-cn</language>
    <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${rssItems}
  </channel>
</rss>
`;

// ---------- sitemap.xml ----------
// 页面部分来自 js/site-config.js 的 pages（sitemap:true）；lastmod 统一用「站点最后更新」
// （= 最新文章日期）：静态页改动不便逐页记账，用同一个可复现的信号对爬虫更友好。
const pageEntries = CFG.pages
  .filter((p) => p.sitemap)
  .map((p) => {
    const extra = (p.priority ? `\n    <priority>${p.priority}</priority>` : '')
      + (p.changefreq ? `\n    <changefreq>${p.changefreq}</changefreq>` : '');
    // 首页的规范地址是根路径（canonical 也是它），别写成 /index.html
    const loc = p.href === 'index.html' ? `${SITE_URL}/` : `${SITE_URL}/${p.href}`;
    return { loc, lastmod: latest, extra };
  });

// 产品详情页（product.html?id=…）已于 2026-10-17 下线：产品介绍与更新只走首页卡片 + 项目弹窗，
// 这里不再为单个产品生成 sitemap 条目（js/projects.js 仍是唯一数据源）。
const sitemapUrls = [
  ...pageEntries,
  ...articles.map((a) => ({ loc: postUrl(a.id), lastmod: a.date, extra: '' }))
]
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>${u.extra}
  </url>`
  )
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>
`;

const root = path.join(__dirname, '..');
fs.writeFileSync(path.join(root, 'rss.xml'), rss);
fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);
console.log(`✓ rss.xml / sitemap.xml 已生成（${CFG.pages.filter((p) => p.sitemap).length} 个页面 + ${articles.length} 篇文章）`);
