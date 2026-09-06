/**
 * RSS / Sitemap 生成器（零构建：仅新增文章后手动运行一次）
 * ----------------------------------------------------
 * 用法：node scripts/gen-rss.js
 * 读取 js/articles.js 的 ARTICLES_DATA，在站点根目录生成 rss.xml 与 sitemap.xml。
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://7stevejohn.github.io';

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
    <title>SevenJohn · 手记与创作</title>
    <link>${SITE_URL}/</link>
    <description>独立开发者的技术手记、小说、游戏创作与随笔。</description>
    <language>zh-cn</language>
    <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${rssItems}
  </channel>
</rss>
`;

// ---------- sitemap.xml ----------
const sitemapUrls = [
  { loc: `${SITE_URL}/`, lastmod: latest },
  ...articles.map((a) => ({ loc: postUrl(a.id), lastmod: a.date }))
]
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
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
console.log(`✓ rss.xml / sitemap.xml 已生成（共 ${articles.length} 篇文章）`);
