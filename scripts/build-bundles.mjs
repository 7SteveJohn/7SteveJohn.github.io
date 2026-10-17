/**
 * 首屏脚本拼接器（零依赖）
 * ----------------------------------------------------
 * 为什么要有它：站点的每页要加载 7–17 个本地 JS。在国内/代理这类「每个请求都要
 * 等几秒」的链路上，请求数比体积更要命（实测 2KB 的文件也要等 5.6 秒）。把同页
 * 必用的脚本合成一个文件，能把首页请求从 30 压到 20 以内。
 *
 * 用法：
 *   node scripts/build-bundles.mjs                # 生成全部 bundle
 *   node scripts/build-bundles.mjs --check        # 只校验：与源文件一致则退出码 0，过期则 1
 *   node scripts/build-bundles.mjs --one core     # 只重建某一组
 *   node scripts/build-bundles.mjs --list         # 打印分组与源文件
 *
 * 约定：
 *   · **源文件永不删除**，`js/bundles/*.js` 是生成物；工具链（gen-rss / sync-chrome /
 *     写作台）继续读 `js/site-config.js`、`js/articles.js` 这些源文件。
 *   · 清单顺序 = 执行顺序：site-config 必须最前；garden 三个玩具必须在框架前；
 *     app 在 nav-indicator 前。
 *   · 头部写内容哈希（不是时间戳）——两次构建产物逐字节一致，git 不会因重新构建而脏，
 *     `--check` 也只比哈希，不依赖时钟。
 *   · 源文件统一按 UTF-8 读取、去掉 BOM、把 CRLF 归一成 LF，保证不同 checkout 下产物一致。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = path.join(ROOT, 'js/bundles');

/** 清单即契约：改顺序 = 改执行顺序 */
const BUNDLES = [
  {
    name: 'core',
    desc: '6 页共用：配置 → Markdown 按需加载器 → 壁纸 → 粒子 → 设置面板 → 按住 Tab',
    sources: [
      'js/site-config.js',
      'js/markdown-loader.js',
      'js/wallpaper.js',
      'js/particles.js',
      'js/settings-panel.js',
      'js/tab-nav.js'
    ]
  },
  {
    name: 'home',
    desc: '仅首页：状态 → 搜索 → 视频门控 → 主应用 → 导航胶囊 → 播放器',
    sources: [
      'js/status.js',
      'js/search.js',
      'js/video-gate.js',
      'js/app.js',
      'js/nav-indicator.js',
      'js/player.js'
    ]
  },
  { name: 'sub', desc: '次级页共用：外壳（SW 注册 / 滚动态 / 浮现）', sources: ['js/subpage.js'] },
  {
    name: 'garden',
    desc: '仅花园：三个玩具 → 框架（顺序敏感）',
    sources: ['js/garden/life.js', 'js/garden/sorting.js', 'js/garden/stars.js', 'js/garden.js']
  },
  {
    name: 'links',
    desc: '仅链接页：友链数据 → 收藏数据 → 渲染',
    sources: ['js/friends.js', 'js/bookmarks.js', 'js/links.js']
  },
  { name: 'novel', desc: '仅连载页：阅读器（数据文件 novel-data.js 保持独立）', sources: ['js/novel.js'] }
];

const readSource = (rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.error(`✗ 源文件缺失：${rel}`);
    process.exit(1);
  }
  let text = fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
  text = text.replace(/\r\n/g, '\n');           // 归一：不同 checkout 下产物一致
  return text;
};

const sha = (text) => createHash('sha256').update(text).digest('hex');

function buildOne(bundle) {
  const sources = bundle.sources.map((rel) => {
    const text = readSource(rel);
    return { path: rel, sha256: sha(text), text };
  });
  // 内容指纹：源哈希按顺序再哈希一次（两次构建必然相同）
  const version = sha(sources.map((s) => `${s.path}:${s.sha256}`).join('\n')).slice(0, 12);
  const header = `// build-bundles: ${JSON.stringify({
    name: bundle.name,
    version,
    sources: sources.map((s) => ({ path: s.path, sha256: s.sha256 }))
  })}\n`;
  const banner = `/* ${bundle.desc}\n   ❗生成物：由 node scripts/build-bundles.mjs 从下列源文件拼接，请改源文件后重建。\n   源文件顺序：${bundle.sources.join(' → ')} */\n`;
  const body = sources
    .map((s) => `\n// ---- ${s.path} (${s.sha256.slice(0, 12)}) ----\n${s.text.replace(/\n+$/, '')}\n`)
    .join('\n;\n');                              // 分号单独一行：防 ASI 拼接风险
  return { content: `${header}${banner}${body}\n`, version, sources };
}

function checkOne(bundle) {
  const out = path.join(OUT_DIR, `${bundle.name}.js`);
  if (!fs.existsSync(out)) {
    return { name: bundle.name, ok: false, reason: '产物不存在（先跑一次生成）' };
  }
  const want = buildOne(bundle);
  const have = fs.readFileSync(out, 'utf8').replace(/\r\n/g, '\n');
  if (have === want.content) return { name: bundle.name, ok: true, reason: '' };

  // 找出到底哪些源文件变了（比整文件更可读的错误提示）
  const m = /^\/\/ build-bundles: (\{.*\})\n/.exec(have);
  let changed = [];
  try {
    const prev = m ? JSON.parse(m[1]) : null;
    const prevMap = new Map((prev && prev.sources ? prev.sources : []).map((s) => [s.path, s.sha256]));
    changed = want.sources.filter((s) => prevMap.get(s.path) !== s.sha256).map((s) => s.path);
    if (!m) changed = ['（头部缺失，可能是手改过的产物）'];
  } catch (e) {
    changed = ['（头部解析失败）'];
  }
  return { name: bundle.name, ok: false, reason: changed.length ? `变化的源文件：${changed.join(', ')}` : '产物与源文件不一致' };
}

// ---------------- 主流程 ----------------
const argv = process.argv.slice(2);
const arg = (flag) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : null);

if (argv.includes('--list')) {
  BUNDLES.forEach((b) => {
    console.log(`\n[${b.name}] ${b.desc}`);
    b.sources.forEach((s) => console.log('   ' + s));
  });
  process.exit(0);
}

if (argv.includes('--check')) {
  const results = BUNDLES.map(checkOne);
  const bad = results.filter((r) => !r.ok);
  results.forEach((r) => console.log(`${r.ok ? 'PASS' : 'FAIL'}  bundle:${r.name}${r.reason ? '  ' + r.reason : ''}`));
  if (bad.length) {
    console.log(`\nbuild-bundles: ${results.length - bad.length} 通过 / ${bad.length} 过期 —— 跑 node scripts/build-bundles.mjs 重建`);
    process.exit(1);
  }
  console.log(`\nbuild-bundles: ${results.length} 项一致（与源文件逐字节相同）`);
  process.exit(0);
}

const only = arg('--one');
const targets = only ? BUNDLES.filter((b) => b.name === only) : BUNDLES;
if (only && !targets.length) {
  console.error(`✗ 没有这个分组：${only}（可选：${BUNDLES.map((b) => b.name).join(' / ')}）`);
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
let total = 0;
targets.forEach((b) => {
  const out = buildOne(b);
  const file = path.join(OUT_DIR, `${b.name}.js`);
  fs.writeFileSync(file, out.content);
  const kb = (out.content.length / 1024).toFixed(1);
  total += out.content.length;
  console.log(`✓ js/bundles/${b.name}.js  ${kb}KB  ← ${b.sources.length} 个源文件  v${out.version}`);
});
console.log(`\n共 ${targets.length} 个 bundle，合计 ${(total / 1024).toFixed(1)}KB（未压缩；GitHub Pages 会 gzip）`);
console.log('提示：改过 js/ 下的源文件后要重跑本脚本，否则页面用的是旧包（--check 会报出来）。');
