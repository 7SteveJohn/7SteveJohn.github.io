/**
 * 本地写作台服务（node scripts/studio/server.mjs [--port 8329]）
 * ----------------------------------------------------
 * 只在本机跑的"后台"：不暴露公网、不需要登录、没有数据库 ——
 * 数据就是仓库里的 Markdown（posts/），"发布"就是 git commit + push。
 *
 * 安全边界（这是它敢免鉴权的前提）：
 *   · 只监听 127.0.0.1
 *   · 所有读写路径先做白名单校验（posts/** 与 assets/images/**），拒绝 .. 与绝对路径
 *   · 命令一律用固定参数数组 spawn（不经 shell 拼接）
 *   · 上传图片以 base64 JSON 传输（不解析 multipart），超过 8MB 拒绝
 *
 * 接口：
 *   GET  /                 写作台界面
 *   GET  /ui.css /ui.js    界面资源
 *   GET  /vendor/*         站点的自托管库（marked / purify）——预览用真渲染器
 *   GET  /api/list         文章与连载章节清单
 *   GET  /api/get?...      取单篇（article / chapter）
 *   POST /api/save         写 md → 校验 → 生成（失败会把错误原样回给界面）
 *   POST /api/delete       移入 .local/trash-<时间戳>/（不做真删除）
 *   POST /api/upload       图片落 assets/images/（有 ffmpeg 时转 webp）
 *   POST /api/publish      生成 + git add/commit（可选 push）
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseFrontMatter, stringifyFrontMatter } from '../lib/front-matter.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const HERE = fileURLToPath(new URL('.', import.meta.url));
const POSTS = path.join(ROOT, 'posts');
const NOVEL = path.join(POSTS, 'novel');
const IMAGES = path.join(ROOT, 'assets/images');
const TRASH = path.join(ROOT, '.local');
const PORT = Number((process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : 0) || 8329);

const ARTICLE_ORDER = ['id', 'title', 'date', 'readTime', 'category', 'section', 'summary', 'cover', 'tags'];
const NOVEL_ORDER = ['book', 'bookTitle', 'author', 'intro', 'bookCover', 'bookSample', 'volume', 'chapter', 'chapterTitle', 'order'];

// ---------------- 工具 ----------------
const hasFfmpeg = () => spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

function safeJoin(base, rel) {
  const p = path.resolve(base, rel);
  if (!p.startsWith(base + path.sep) && p !== base) throw new Error('路径越界：' + rel);
  return p;
}

function listMd(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listMd(p));
    else if (e.name.endsWith('.md')) out.push(p);
  });
  return out;
}

const read = (p) => fs.readFileSync(p, 'utf8');
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const json = (res, code, data) => {
  const body = JSON.stringify(data);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
};
const text = (res, code, s, type = 'text/plain; charset=utf-8') => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(s);
};

function runNode(script, args = []) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), ...args], { cwd: ROOT, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || ''), status: r.status };
}

function git(args) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || ''), status: r.status };
}

// ---------------- 数据：清单 / 单篇 ----------------
function articleList() {
  return listMd(POSTS)
    .filter((p) => !p.startsWith(NOVEL))
    .map((p) => {
      const { data, body } = parseFrontMatter(read(p));
      return {
        file: rel(p),
        id: String(data.id || path.basename(p, '.md')),
        title: String(data.title || ''),
        date: String(data.date || ''),
        category: String(data.category || '技术手记'),
        section: data.section ? String(data.section) : '',
        summary: String(data.summary || ''),
        tags: Array.isArray(data.tags) ? data.tags : [],
        cover: data.cover ? String(data.cover) : '',
        coverUrl: data.cover ? '/' + String(data.cover) : '',
        readTime: String(data.readTime || ''),
        words: body.replace(/\s/g, '').length
      };
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function novelList() {
  const books = new Map();
  listMd(NOVEL).forEach((p) => {
    const { data, body } = parseFrontMatter(read(p));
    if (!data.book) return;
    if (!books.has(data.book)) books.set(data.book, { id: String(data.book), title: String(data.bookTitle || data.book), chapters: [] });
    books.get(data.book).chapters.push({
      file: rel(p),
      chapter: String(data.chapter || ''),
      title: String(data.chapterTitle || data.chapter || ''),
      volume: String(data.volume || '正文'),
      order: Number(data.order || 0),
      words: body.replace(/\s/g, '').length
    });
  });
  return [...books.values()].map((b) => ({ ...b, chapters: b.chapters.sort((a, b2) => a.order - b2.order) }));
}

// ---------------- 接口 ----------------
async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 12 * 1024 * 1024) throw new Error('请求体过大（>12MB）');
    chunks.push(c);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = url.pathname;

  try {
    // ---- 静态资源 ----
    if (req.method === 'GET' && (p === '/' || p === '/ui.html')) return text(res, 200, read(path.join(HERE, 'ui.html')), 'text/html; charset=utf-8');
    if (req.method === 'GET' && p === '/ui.css') return text(res, 200, read(path.join(HERE, 'ui.css')), 'text/css; charset=utf-8');
    if (req.method === 'GET' && p === '/ui.js') return text(res, 200, read(path.join(HERE, 'ui.js')), 'application/javascript; charset=utf-8');
    if (req.method === 'GET' && p.startsWith('/vendor/')) {
      // 预览用的真渲染器（站点自托管的那两份）
      const file = safeJoin(path.join(ROOT, 'assets/vendor'), p.slice('/vendor/'.length));
      return text(res, 200, read(file), file.endsWith('.css') ? 'text/css; charset=utf-8' : 'application/javascript; charset=utf-8');
    }
    // 图片：写作台里要能看到封面缩略图
    if (req.method === 'GET' && p.startsWith('/images/')) {
      const file = safeJoin(IMAGES, p.slice('/images/'.length));
      if (!fs.existsSync(file)) return text(res, 404, 'not found');
      const buf = fs.readFileSync(file);
      res.writeHead(200, { 'Content-Type': 'image/' + (path.extname(file).slice(1) || 'webp'), 'Cache-Control': 'no-store' });
      return res.end(buf);
    }

    // ---- 数据接口 ----
    if (req.method === 'GET' && p === '/api/list') {
      return json(res, 200, { ok: true, articles: articleList(), books: novelList(), root: ROOT, ffmpeg: hasFfmpeg() });
    }

    if (req.method === 'GET' && p === '/api/get') {
      const file = safeJoin(ROOT, url.searchParams.get('file') || '');
      if (!fs.existsSync(file)) return json(res, 404, { ok: false, error: '文件不存在：' + rel(file) });
      const { data, body: md } = parseFrontMatter(read(file));
      const isChapter = file.startsWith(NOVEL + path.sep);
      return json(res, 200, { ok: true, file: rel(file), type: isChapter ? 'chapter' : 'article', data, body: md.replace(/^\n+/, '') });
    }

    if (req.method === 'POST' && p === '/api/save') {
      const { file, data, body: md } = await body(req);
      const target = safeJoin(ROOT, file || '');
      if (!target.includes(path.sep + 'posts' + path.sep)) return json(res, 400, { ok: false, error: '只能写入 posts/ 目录' });
      const isChapter = target.startsWith(NOVEL + path.sep);
      const order = isChapter ? NOVEL_ORDER : ARTICLE_ORDER;
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, stringifyFrontMatter(data || {}, order, md || ''));
      const check = runNode('build-articles.mjs', ['--check']);
      if (!check.ok) return json(res, 200, { ok: false, error: '校验未通过，md 已写入但未生成', log: check.out });
      const build = runNode('build-articles.mjs');
      return json(res, 200, { ok: build.ok, file: rel(target), log: (check.out + build.out).trim(), error: build.ok ? '' : '生成失败' });
    }

    if (req.method === 'POST' && p === '/api/delete') {
      const { file } = await body(req);
      const target = safeJoin(ROOT, file || '');
      if (!fs.existsSync(target)) return json(res, 404, { ok: false, error: '文件不存在' });
      const stamp = new Date().toISOString().replace(/\..*$/, '').replace(/[-:T]/g, '').slice(0, 14);
      const dest = path.join(TRASH, `trash-${stamp}`, path.relative(ROOT, target));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(target, dest);
      const build = runNode('build-articles.mjs');
      return json(res, 200, { ok: build.ok, log: `已移入 .local/trash-${stamp}/ 并重新生成\n${build.out}` });
    }

    if (req.method === 'POST' && p === '/api/upload') {
      const { name, data } = await body(req);
      const base = String(name || 'image').replace(/[^\w.-]/g, '_');
      if (!data) return json(res, 400, { ok: false, error: '缺少图片数据' });
      const buf = Buffer.from(String(data).split(',').pop(), 'base64');
      if (!buf.length || buf.length > 8 * 1024 * 1024) return json(res, 400, { ok: false, error: '图片为空或超过 8MB' });
      fs.mkdirSync(IMAGES, { recursive: true });
      const rawPath = safeJoin(IMAGES, base);
      fs.writeFileSync(rawPath, buf);
      let finalPath = rawPath;
      let log = `已保存 ${rel(rawPath)}（${(buf.length / 1024).toFixed(1)}KB）`;
      if (hasFfmpeg() && !/\.webp$/i.test(base)) {
        const webp = rawPath.replace(/\.[^.]+$/, '') + '.webp';
        const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', rawPath, '-c:v', 'libwebp', '-quality', '80', webp], { encoding: 'utf8' });
        if (r.status === 0 && fs.existsSync(webp)) {
          fs.rmSync(rawPath, { force: true });
          finalPath = webp;
          log = `已转 webp：${rel(webp)}（${(fs.statSync(webp).size / 1024).toFixed(1)}KB，原图已删）`;
        } else {
          log += '（ffmpeg 转换失败，保留原图）';
        }
      }
      return json(res, 200, { ok: true, path: rel(finalPath), url: '/' + rel(finalPath), log });
    }

    if (req.method === 'POST' && p === '/api/build') {
      const build = runNode('build-articles.mjs');
      return json(res, 200, { ok: build.ok, log: build.out.trim() || '（没有输出）', error: build.ok ? '' : '生成失败' });
    }

    if (req.method === 'POST' && p === '/api/publish') {
      const { message, dryRun } = await body(req);
      const steps = [];
      const build = runNode('build-articles.mjs');
      steps.push('$ node scripts/build-articles.mjs\n' + build.out.trim());
      if (!build.ok) return json(res, 200, { ok: false, error: '生成失败，未提交', log: steps.join('\n\n') });

      git(['add', 'posts', 'js/articles.js', 'js/novel-data.js', 'rss.xml', 'sitemap.xml']);
      steps.push('$ git add posts js/articles.js js/novel-data.js rss.xml sitemap.xml\n' + git(['status', '--short']).out.trim());

      if (dryRun) return json(res, 200, { ok: true, dryRun: true, log: steps.join('\n\n') + '\n\n（dry-run：未提交、未推送）' });

      const commit = git(['commit', '-m', String(message || 'content: 写作台更新')]);
      steps.push('$ git commit\n' + commit.out.trim());
      if (!commit.ok) return json(res, 200, { ok: false, error: '提交失败（可能没有改动）', log: steps.join('\n\n') });
      const push = git(['push', 'origin', 'main']);
      steps.push('$ git push origin main\n' + push.out.trim());
      return json(res, 200, { ok: push.ok, error: push.ok ? '' : '推送失败', log: steps.join('\n\n') });
    }

    return json(res, 404, { ok: false, error: 'no route: ' + p });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e && e.message || e) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`写作台已启动：http://127.0.0.1:${PORT}`);
  console.log(`仓库根目录：${ROOT}`);
  console.log(`ffmpeg：${hasFfmpeg() ? '可用（上传图片会自动转 webp）' : '未找到（图片按原格式保存）'}`);
  console.log('提示：写作台只监听本机；预览请另开终端跑 node scripts/dev-server.js（8328）。');
});
