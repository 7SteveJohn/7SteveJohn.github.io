/**
 * Live2D 看板娘资源本地化（node scripts/vendor-live2d.js）
 * ----------------------------------------------------
 * 本站运行时零 CDN：运行时与模型都从隔离 node 工作区复制进 assets/vendor/live2d/。
 * 依赖按 os.homedir() 运行时推导，不写进仓库（与 scripts/build-vendor.js 同约定）：
 *
 *   cd ~/.workbuddy/binaries/node/workspace
 *   npm i live2d-widgets@1.0.1 live2d-widget-model-shizuku@1.0.5
 *   node <仓库>/scripts/vendor-live2d.js
 *
 * 产物：
 *   assets/vendor/live2d/waifu-tips.js      看板娘运行时（ESM，挂 window.initWidget）
 *   assets/vendor/live2d/waifu.css          运行时基础样式（被 css/style.css 高特指度覆盖）
 *   assets/vendor/live2d/live2d.min.js      Live2D Cubism 2 core（live2d-widgets 随包分发）
 *   assets/vendor/live2d/chunk/index.js     Cubism 2 模型层（waifu-tips.js 动态 import）
 *   assets/vendor/live2d/model/shizuku/**   Live2D 官方示例模型「Shizuku」
 *
 * ❗只搬 Cubism 2 这一路：chunk/index2.js（Cubism 5 模型层，204KB）不复制，本站不用
 * ❗不复制 snd/**（约 800KB 交互音效），并摘掉模型清单里的 "sound" 字段：
 *   站点自带音乐播放器，看板娘再出声会打架；摘掉后动作照播，只是静音
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const MODULES = os.homedir().replace(/\\/g, '/') + '/.workbuddy/binaries/node/workspace/node_modules';
const WIDGET = MODULES + '/live2d-widgets';
const MODEL = MODULES + '/live2d-widget-model-shizuku';
const OUT = path.join(ROOT, 'assets/vendor/live2d');

function must(p, hint) {
  if (!fs.existsSync(p)) {
    console.error(`❌ 找不到 ${p}\n   请先在 node 工作区执行：npm i live2d-widgets@1.0.1 live2d-widget-model-shizuku@1.0.5`);
    process.exit(1);
  }
  return p;
}

const kb = (p) => (fs.statSync(p).size / 1024).toFixed(1) + 'KB';

function sizeOf(dir) {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    total += e.isDirectory() ? sizeOf(full) : fs.statSync(full).size;
  }
  return total;
}

// ---- 1. 运行时四件套 ----
const files = [
  [must(WIDGET + '/dist/waifu-tips.js'), path.join(OUT, 'waifu-tips.js')],
  [must(WIDGET + '/dist/waifu.css'), path.join(OUT, 'waifu.css')],
  [must(WIDGET + '/dist/live2d.min.js'), path.join(OUT, 'live2d.min.js')],
  [must(WIDGET + '/dist/chunk/index.js'), path.join(OUT, 'chunk/index.js')]
];
for (const [src, dest] of files) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`✅ ${path.relative(ROOT, dest).replace(/\\/g, '/')}  ${kb(dest)}`);
}

// ---- 2. 官方示例模型（跳过 snd/）----
const modelSrc = must(MODEL + '/assets');
const modelOut = path.join(OUT, 'model/shizuku');
fs.rmSync(modelOut, { recursive: true, force: true });
fs.cpSync(modelSrc, modelOut, {
  recursive: true,
  filter: (src) => !/[\\/]snd([\\/]|$)/.test(src)
});

// 摘掉动作清单里的音效字段（见文件头说明）
const jsonPath = path.join(modelOut, 'shizuku.model.json');
const setting = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let stripped = 0;
for (const group of Object.values(setting.motions || {})) {
  for (const m of group) {
    if (m.sound) { delete m.sound; stripped++; }
  }
}
fs.writeFileSync(jsonPath, JSON.stringify(setting, null, 2));

for (const sub of fs.readdirSync(modelOut, { withFileTypes: true })) {
  const p = path.join(modelOut, sub.name);
  console.log(`✅ model/shizuku/${sub.name}${sub.isDirectory() ? '/' : ''}  ` +
    (sub.isDirectory() ? (sizeOf(p) / 1024).toFixed(0) + 'KB' : kb(p)));
}
console.log(`   —— 静音处理：摘掉 ${stripped} 处 "sound" 引用，未复制 snd/（约 800KB）`);

// ---- 3. 来源与授权备忘 ----
fs.writeFileSync(path.join(OUT, 'SOURCE.txt'),
  [
    '本目录为自托管的 Live2D 看板娘资源，运行时零 CDN。',
    '',
    '来源：',
    '  live2d-widgets@1.0.1                https://github.com/stevenjoezhang/live2d-widget  (GPL-3.0-or-later)',
    '  live2d-widget-model-shizuku@1.0.5   Live2D 官方示例模型「Shizuku」',
    '  live2d.min.js                       Live2D Cubism 2 core，随 live2d-widgets 分发',
    '',
    '重建：scripts/vendor-live2d.js（见文件头注释）',
    '换模型：把新模型的 assets/** 放进 model/<名字>/，改 assets/vendor/live2d/waifu-tips.json 里的 models[].paths',
    '',
    '注意：模型与运行时的授权按各自上游条款（GPL-3.0-or-later / Live2D 官方示例模型条款）；',
    '      换用第三方模型前请自行确认其授权，不要用来路不明的模型。'
  ].join('\n') + '\n');

console.log(`\n📦 总计约 ${(sizeOf(OUT) / 1024 / 1024).toFixed(1)}MB（不进 sw.js 预缓存，首次在线加载后走运行时缓存）`);
