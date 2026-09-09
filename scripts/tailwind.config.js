/**
 * Tailwind 构建配置（仅用于生成静态 CSS，页面运行时不再加载 CDN）
 * ----------------------------------------------------
 * 版本必须与线上曾用过的 Play CDN 一致：tailwindcss 3.4.17
 * 重新构建（在仓库根目录执行）：
 *   npx tailwindcss -c scripts/tailwind.config.js -i scripts/tailwind-input.css -o assets/vendor/tailwind.css --minify
 * 什么时候需要重建：在 index.html 或 js/*.js 里用了新的 Tailwind 类名之后。
 */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {}
  },
  plugins: []
};
