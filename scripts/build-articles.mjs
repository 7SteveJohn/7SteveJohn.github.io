/**
 * 内容生成：posts/*.md → js/articles.js（以及 posts/novel/** → js/novel-data.js）
 * ----------------------------------------------------
 * 用法：
 *   node scripts/build-articles.mjs                  # 生成 articles.js + novel-data.js + rss/sitemap
 *   node scripts/build-articles.mjs --check          # 只校验，不写文件（写作台保存前用）
 *   node scripts/build-articles.mjs --compare a.js   # 生成后把结果与 a.js 逐字段比对（迁移验收用）
 *
 * 设计要点：
 *   · Markdown 是唯一写作入口；js/articles.js 是**生成物**，运行时数据结构与字段
 *     与手写时代完全一致（id/title/date/readTime/category/summary/tags/content[/section/cover]）。
 *   · content 仍输出成模板字符串，反引号、${、反斜杠会被正确转义 —— 正文里贴代码不怕。
 *   · 校验：id 唯一、日期格式、section 合法（缺省/creation/essay/ai）、summary 必填、
 *     section=creation 时 category 应为 小说/游戏创作、tags 不能为空。
 *   · 校验失败：--check 直接退出码 1；正常生成时保留旧文件不动（宁可不出新，也不写坏数据）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { parseFrontMatter } from './lib/front-matter.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const POSTS = path.join(ROOT, 'posts');
const NOVEL_DIR = path.join(POSTS, 'novel');
const require = createRequire(import.meta.url);

const argv = process.argv.slice(2);
const CHECK_ONLY = argv.includes('--check');
const cmpIdx = argv.indexOf('--compare');
const COMPARE_WITH = cmpIdx >= 0 ? argv[cmpIdx + 1] : null;

const SECTION_OK = ['creation', 'essay', 'ai'];
const CATEGORY_FOR_CREATION = ['小说', '游戏创作'];
const problems = [];
const warn = (msg) => problems.push('  ✗ ' + msg);

const escTemplate = (s) => String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

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
      readTime: String(data.readTime || ''),
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
  return arts;
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

// ---------------- 连载章节 ----------------
// 章节是 posts/novel/<书>/<章节>.md（比文章多一层目录），这里递归一层取全
function listNovelMd(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listNovelMd(p).forEach((f) => out.push(f));
    else if (e.name.endsWith('.md')) out.push(p);
  });
  return out;
}

function loadNovel() {
  const files = listNovelMd(NOVEL_DIR).sort();
  const books = new Map();
  files.forEach((file) => {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const { data, body, hasFrontMatter } = parseFrontMatter(fs.readFileSync(file, 'utf8'));
    if (!hasFrontMatter) return warn(`${rel}：缺少 front matter，已跳过`);
    if (!data.book || !data.chapter) return warn(`${rel}：缺 book / chapter`);
    if (!books.has(data.book)) {
      books.set(data.book, {
        id: String(data.book),
        title: String(data.bookTitle || data.book),
        author: String(data.author || ''),
        intro: String(data.intro || ''),
        cover: data.bookCover ? String(data.bookCover) : '',
        ...(data.bookSample === true ? { sample: true } : {}),
        volumes: []
      });
    }
    const book = books.get(data.book);
    const volTitle = String(data.volume || '正文');
    let vol = book.volumes.find((v) => v.title === volTitle);
    if (!vol) { vol = { title: volTitle, chapters: [] }; book.volumes.push(vol); }
    vol.chapters.push({
      id: String(data.chapter),
      title: String(data.chapterTitle || data.chapter),
      order: Number(data.order || 0),
      content: body.replace(/^\n+/, '').replace(/\s+$/, '')
    });
  });
  return [...books.values()].map((b) => ({
    ...b,
    volumes: b.volumes.map((v) => ({ ...v, chapters: v.chapters.sort((x, y) => x.order - y.order).map(({ order, ...c }) => c) }))
  }));
}

function renderNovel(books) {
  return `/**
 * 连载数据（❗生成物，不要手改）
 * ----------------------------------------------------
 * 写作入口是 posts/novel/<book>/<章节>.md（front matter 里写书与卷），
 * 由 \`node scripts/build-articles.mjs\`（或本地写作台）生成这个文件。
 * 没有章节文件时这里就是空数组，novel.html 会显示书架空态。
 */
window.NOVEL_BOOKS = ${JSON.stringify(books, null, 2)};
`;
}

// ---------------- 主流程 ----------------
const arts = loadArticles();
const books = loadNovel();

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
  console.log(`✓ 校验通过：${arts.length} 篇文章${books.length ? `、${books.length} 本书` : ''}`);
  process.exit(0);
}

fs.writeFileSync(path.join(ROOT, 'js/articles.js'), renderArticles(arts));
fs.writeFileSync(path.join(ROOT, 'js/novel-data.js'), renderNovel(books));

// RSS / sitemap 跟着一起刷新（gen-rss 读 js/articles.js 与 site-config.js）
const rss = spawnSync(process.execPath, [path.join(ROOT, 'scripts/gen-rss.js')], { cwd: ROOT, stdio: 'inherit' });

console.log(`✓ js/articles.js 已生成（${arts.length} 篇）· js/novel-data.js 已生成（${books.length} 本书）`);

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
