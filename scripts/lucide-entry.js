/**
 * Lucide 精简打包入口（源：npm lucide v1.43.0）
 * ----------------------------------------------------
 * 全量 lucide.min.js 有 429KB，而站点实际只用到十几个图标。
 * 这里按需引入并 tree-shake，产物只有几 KB，首屏不再为一个图标库下载半兆。
 *
 * ⚠️ 新增图标时：把图标名加进下面的 icons 集合，然后重新构建：
 *    npx esbuild scripts/lucide-entry.js --bundle --minify --format=iife --outfile=assets/vendor/lucide.min.js
 * （品牌类图标如 github 已被 lucide 移除，站点里改用内联 SVG）
 */
import {
  createIcons,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  ChevronUp,
  Download,
  Gamepad2,
  Home,
  Menu,
  Moon,
  Search,
  Sun,
  X
} from 'lucide';

const icons = {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  ChevronUp,
  Download,
  Gamepad2,
  Home,
  Menu,
  Moon,
  Search,
  Sun,
  X
};

// 保持 window.lucide.createIcons() 的调用方式不变（app.js / search.js 里都是无参调用）
window.lucide = {
  createIcons: (opts) => createIcons({ icons, nameAttr: 'data-lucide', ...(opts || {}) })
};
