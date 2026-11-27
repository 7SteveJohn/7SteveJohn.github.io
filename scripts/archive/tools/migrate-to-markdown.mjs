/**
 * 一次性迁移：js/articles.js → posts/*.md（之后 articles.js 变成生成物）
 * ----------------------------------------------------
 * 用法：node scripts/migrate-to-markdown.mjs [--force]
 *
 * 做四件事：
 *   1. 原文件备份到 .local/articles.js.bak-<时间戳>（该目录已在 .gitignore，不会入库）
 *   2. 每篇文章写一个 posts/<id>.md（front matter + 正文 Markdown，正文原样搬运）
 *   3. 调 scripts/build-articles.mjs 重新生成 js/articles.js
 *   4. 用 --compare 让生成脚本把「旧文件解析结果」与「新生成结果」逐字段比对，不一致就失败退出
 *
 * 已存在 posts/ 且非空时默认拒绝执行（避免覆盖手工改过的 md），要覆盖加 --force。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { stringifyFrontMatter } from './lib/front-matter.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ARTICLES = path.join(ROOT, 'js/articles.js');
const POSTS = path.join(ROOT, 'posts');
const BACKUP_DIR = path.join(ROOT, '.local');
const FORCE = process.argv.includes('--force');

if (!fs.existsSync(ARTICLES)) {
  console.error('❌ 找不到 js/articles.js');
  process.exit(1);
}

const existing = fs.existsSync(POSTS) ? fs.readdirSync(POSTS).filter((f) => f.endsWith('.md')) : [];
if (existing.length && !FORCE) {
  console.error(`❌ posts/ 里已有 ${existing.length} 个 .md（可能是手改过的），拒绝覆盖。确认要重做请加 --force`);
  process.exit(1);
}

// 1) 备份
fs.mkdirSync(BACKUP_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/\..*$/, '').replace(/[-:T]/g, '').slice(0, 14);
const backup = path.join(BACKUP_DIR, `articles.js.bak-${stamp}`);
fs.copyFileSync(ARTICLES, backup);
console.log(`✓ 已备份：${path.relative(ROOT, backup)}`);

// 2) 解析旧数据（articles.js 是浏览器脚本：模拟 window 后加载）
const win = {};
new Function('window', fs.readFileSync(ARTICLES, 'utf8'))(win);
const arts = win.ARTICLES_DATA || [];
if (!arts.length) {
  console.error('❌ 旧文件里没有文章');
  process.exit(1);
}

// 3) 写 md（字段顺序固定，正文原样）
const ORDER = ['id', 'title', 'date', 'readTime', 'category', 'section', 'summary', 'cover', 'tags'];
fs.mkdirSync(POSTS, { recursive: true });

// 3b) 连载章节也一并搬到 posts/novel/<book>/<order>-<chapter>.md，
//     否则生成脚本会用空数组覆盖掉 js/novel-data.js 里的示例书
const NOVEL = path.join(ROOT, 'js/novel-data.js');
if (fs.existsSync(NOVEL)) {
  const nwin = {};
  new Function('window', fs.readFileSync(NOVEL, 'utf8'))(nwin);
  const books = nwin.NOVEL_BOOKS || [];
  const NOVEL_ORDER = ['book', 'bookTitle', 'author', 'intro', 'bookCover', 'bookSample', 'volume', 'chapter', 'chapterTitle', 'order'];
  books.forEach((b) => {
    const dir = path.join(POSTS, 'novel', b.id);
    fs.mkdirSync(dir, { recursive: true });
    let n = 0;
    (b.volumes || []).forEach((v) => {
      (v.chapters || []).forEach((c) => {
        n += 1;
        const data = {
          book: b.id,
          bookTitle: b.title,
          author: b.author || '',
          intro: b.intro || '',
          ...(b.cover ? { bookCover: b.cover } : {}),
          ...(b.sample ? { bookSample: true } : {}),
          volume: v.title || '正文',
          chapter: c.id,
          chapterTitle: c.title || c.id,
          order: n
        };
        const file = path.join(dir, String(n).padStart(3, '0') + '-' + c.id + '.md');
        fs.writeFileSync(file, stringifyFrontMatter(data, NOVEL_ORDER, c.content || ''));
        console.log(`  → posts/novel/${b.id}/${path.basename(file)}`);
      });
    });
  });
  if (books.length) console.log(`✓ 已写出 ${books.length} 本书的章节文件`);
}
arts.forEach((a) => {
  const data = {
    id: a.id,
    title: a.title,
    date: a.date,
    readTime: a.readTime,
    category: a.category,
    ...(a.section ? { section: a.section } : {}),
    summary: a.summary,
    ...(a.cover ? { cover: a.cover } : {}),
    tags: a.tags || []
  };
  const md = stringifyFrontMatter(data, ORDER, a.content || '');
  const file = path.join(POSTS, `${a.id}.md`);
  fs.writeFileSync(file, md);
  console.log(`  → posts/${a.id}.md  (${md.length} 字节)`);
});
console.log(`✓ 已写出 ${arts.length} 个 Markdown 源文件`);

// 4) 重新生成 + 逐字段比对
const r = spawnSync(process.execPath, [
  path.join(ROOT, 'scripts/build-articles.mjs'),
  '--compare', path.relative(ROOT, backup)
], { cwd: ROOT, stdio: 'inherit' });

if (r.status !== 0) {
  console.error('\n❌ 迁移未通过比对。回滚方式：');
  console.error(`   copy "${path.relative(ROOT, backup)}" js/articles.js`);
  process.exit(r.status || 1);
}

console.log('\n✅ 迁移完成：现在写作入口是 posts/*.md，js/articles.js 是生成物。');
console.log('   之后改文章请编辑 md，然后跑 node scripts/build-articles.mjs（或直接用本地写作台）。');
