/**
 * 深空壁纸程序化生成（node scripts/make-wallpapers.mjs [--force]）
 * ----------------------------------------------------
 * 产出 assets/images/wallpaper-2.webp / wallpaper-3.webp（1920×1080，各约 40–60KB），
 * 供 js/wallpaper.js 的「进站随机轮换」使用；已存在则跳过，--force 重做。
 *
 * 为什么自己画而不用图库/AI 图：
 *   - 零版权顾虑、零外链、可复现（同一份表达式永远出同一张图，换电脑也能重建）
 *   - 站点背景是「深空 + 暗角 + 3D 推理场」的叠加，需要的只是一层低饱和冷色雾气，
 *     真正的星点与线条由现有引擎负责，这里过度细节反而是浪费
 * 手法：ffmpeg 的 geq 逐像素表达式 —— 两个高斯光团 + 低频斑驳 + 细颗粒，
 *       r/g/b 分别按冷蓝-紫的比例放大，最后 gblur 吃掉噪点的硬边。
 *
 * 换壁纸：直接替换 assets/images/wallpaper*.webp 即可（不必用本脚本）；
 *        脚本只在你想要"再生成几张同风格的"时用。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = path.join(ROOT, 'assets/images');
const FORCE = process.argv.includes('--force');

// 每张图 = 两个光团的位置/大小/强度 + 云絮幅度 + 色调系数（冷蓝 → 靛紫）
const VARIANTS = [
  {
    file: 'wallpaper-2.webp',
    blobs: [
      { cx: 1360, cy: 780, sx: 470, sy: 340, a: 112 },  // 右下主光团
      { cx: 480, cy: 220, sx: 620, sy: 440, a: 44 }     // 左上余晖
    ],
    cloud: 0.62,                                        // 云絮调制深度（越大边缘越碎）
    rgb: [0.56, 0.72, 1.04],                            // 蓝为主，压红
    grain: 6
  },
  {
    file: 'wallpaper-3.webp',
    blobs: [
      { cx: 660, cy: 520, sx: 760, sy: 250, a: 86 },    // 横向尘埃带
      { cx: 1560, cy: 900, sx: 400, sy: 400, a: 54 }    // 右下小光团
    ],
    cloud: 0.55,
    rgb: [0.70, 0.68, 1.00],                            // 偏紫但不过艳
    grain: 7
  }
];

function has(bin) {
  const r = spawnSync(bin, ['-version'], { stdio: 'ignore' });
  return r.status === 0;
}

if (!has('ffmpeg')) {
  console.error('❌ 没找到 ffmpeg（本脚本用它做逐像素合成与 webp 编码）');
  process.exit(1);
}

const expr = (v, ch) => {
  const k = v.rgb[ch];
  const blobs = v.blobs
    .map((b) => `${b.a}*exp(-((X-${b.cx})*(X-${b.cx})/(2*${b.sx}*${b.sx})+(Y-${b.cy})*(Y-${b.cy})/(2*${b.sy}*${b.sy})))`)
    .join('+');
  // 云絮：两个不同频率的正弦乘积（0..1），用 cloud 调制光团 —— 让它不是一个光滑的球，
  // 而是有内部结构、边缘破碎的星云；再叠一层更细的丝缕，避免"磨皮感"
  const c = v.cloud;
  const cloud = `(${1 - c}+${c}*(0.5+0.5*sin(X*0.0031+Y*0.0017)*sin(X*0.0013-Y*0.0029)))`;
  const wisps = `(0.5+0.5*sin(X*0.0121-Y*0.0077)*sin(X*0.0069+Y*0.0151))`;
  const grain = `${v.grain}*random(${ch})`;
  return `${k}*((${blobs})*${cloud}+20*${wisps}*${cloud})+${grain}`;
};

for (const v of VARIANTS) {
  const dest = path.join(OUT, v.file);
  if (fs.existsSync(dest) && !FORCE) {
    console.log(`跳过（已存在）：${v.file}`);
    continue;
  }
  const filter = [
    `geq=r='${expr(v, 0)}':g='${expr(v, 1)}':b='${expr(v, 2)}'`,
    'gblur=sigma=26',              // 吃掉噪点硬边（背景还会再被 CSS 模糊一次）
    'vignette=PI/5'                // 四角压暗，和站点暗角同调
  ].join(',');

  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=black:s=1920x1080:d=1',
    '-vf', filter,
    '-frames:v', '1',
    '-c:v', 'libwebp', '-quality', '74', '-compression_level', '6',
    dest
  ];
  const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`❌ 生成失败：${v.file}`);
    process.exit(1);
  }
  console.log(`✅ ${v.file}  ${(fs.statSync(dest).size / 1024).toFixed(1)}KB`);
}

console.log('\n提示：js/site-config.js 的 wallpapers[] 决定轮换范围；替换文件名即可换图。');
