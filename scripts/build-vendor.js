/**
 * 本地依赖构建脚本（node scripts/build-vendor.js）
 * ----------------------------------------------------
 * lucide：从 npm 包按需 tree-shake 出仅含站点实际图标的精简包，
 *         避免为 429KB 的全量图标库拖慢首屏（入口见 scripts/lucide-entry.js）。
 *
 * ⚠️ 直接跑 esbuild CLI 在某些沙箱里会 spawn 失败，所以这里用 esbuild 的 JS API。
 * 运行前需在工作区装过依赖：
 *   cd C:\Users\SevenJohn\.workbuddy\binaries\node\workspace && npm i lucide esbuild
 */
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const MODULES = 'C:/Users/SevenJohn/.workbuddy/binaries/node/workspace/node_modules';

let esbuild;
try {
  esbuild = require(path.join(MODULES, 'esbuild'));
} catch (e) {
  console.error('❌ 找不到 esbuild，请先在 node 工作区执行：npm i lucide esbuild');
  process.exit(1);
}

const jobs = [
  {
    name: 'lucide（精简图标包）',
    entry: path.join(ROOT, 'scripts/lucide-entry.js'),
    out: path.join(ROOT, 'assets/vendor/lucide.min.js')
  }
];

for (const job of jobs) {
  const before = fs.existsSync(job.out) ? fs.statSync(job.out).size : 0;
  esbuild.buildSync({
    entryPoints: [job.entry],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2018'],
    outfile: job.out,
    legalComments: 'none',
    logLevel: 'info',
    // 依赖装在隔离的 node 工作区里，不在本项目 node_modules，需显式告诉 esbuild 去哪找
    nodePaths: [MODULES]
  });
  const after = fs.statSync(job.out).size;
  console.log(`✅ ${job.name}: ${(before / 1024).toFixed(1)}KB → ${(after / 1024).toFixed(1)}KB`);
}
