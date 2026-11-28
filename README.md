# 楠屿札记 · 个人工具作品与独立博客

轻量化、本地优先、零外部 CDN 依赖的个人独立博客与桌面 / 移动工具作品集网站。纯原生 HTML5 + 静态构建 Tailwind CSS + 原生 ES6，既支持 GitHub Pages / Cloudflare Pages 静态部署，也支持直接双击 `index.html`（`file://`）离线浏览。

> 本地维护记录、方案与实测报告存放在 `docs/`（已通过 `.gitignore` 移出公开仓库，仅本地留档）。

---

## 核心特性

1. **零框架、零外链、双击即用**：
   - 全站字体（自托管 Inter 可变字体）、样式（`assets/vendor/tailwind.css`）、图标（Lucide）、Markdown 引擎（Marked + DOMPurify）、代码高亮（Highlight.js）与 3D 引擎（Three.js）全部仓库自托管；
   - 默认**晨曦明亮**主题，支持一键切换**极夜深色**（跨页共享 `sj.theme` 并同步 `<meta name="color-scheme">` 与 `<meta name="theme-color">`）。
2. **作品与文章数据解耦**：
   - **个人工具（5 款主力 + 2 款历史归档）**：统一维护于 [`js/projects.js`](js/projects.js)（主力：`FileButler`、`拍案`、`脉络`、`Fluxion`、`Stacky`；历史项目：`GameBoost`、`GameBoost-DLSSG`）。页面加载时自动水合下载链接、提取码、公告与更新日志；运行 `node scripts/gen-card-copy.js` 可将卡片文案与首屏版本号同步回 `index.html`。
   - **文章内容（当前 21 篇）**：全部写作入口在 `posts/*.md`（YAML front matter + Markdown 正文）。运行 `node scripts/build-articles.mjs` 自动产出：
     - `js/articles.js`（完整正文数据，按需懒加载）与 `js/articles-meta.js`（首屏轻量化列表元数据）；
     - 21 篇独立静态 SEO / 社交分享页 `p/<id>.html`（含独立 `<title>`、`canonical`、Open Graph / Twitter Card、`BlogPosting` JSON-LD 与预渲染正文）；
     - `rss.xml`（含 `xmlns:content` 与 `<content:encoded>` 全文 HTML）及 `sitemap.xml`。
3. **站内不断歌弹窗阅读 + 独立分享页双轨体验**：
   - 站内（首页列表、札签卷宗、归档页、⌘K 搜索）点击文章统一在首页弹窗打开，背景音乐不中断，支持阅读进度条、`← →` 同板块翻章、自动目录与当前节高亮、代码块一键复制、⌘K 搜索词正文高亮跳转（CSS Custom Highlight API）；
   - 文章弹窗顶栏内置「复制分享链接」按钮，一键复制规范地址 `https://7stevejohn.github.io/p/<id>.html`；访客打开 `/p/<id>.html` 可直接阅读完整静态排版，也可一键跳回 `index.html?post=<id>` 享受首页弹窗与 BGM 伴读（旧 `?post=<id>` 深链 100% 兼容）。
4. **音视频秒播与严格双向互斥**：
   - 内置 `music/` 11 首背景曲目，与 5 款主力工具的 1080p 演示视频实现严格双向互斥（播视频自动停音乐、停视频或滚出视口自动恢复音乐、播音乐立即停视频并复原门控遮罩）。
5. **札签卷宗、时间河归档与照片墙**：
   - 首页 `#blog` 与独立页 `cards.html` 提供双面 3D 翻牌「札签卷宗」体验；
   - `archive.html` 提供正弦波浪曲线时间轴与板块筛选；
   - `gallery.html` 提供错落画廊网格与无障碍灯箱（支持 `← →` 切换、`Esc` 关闭、`Tab` / `Shift+Tab` 焦点锁定与关闭焦点归位）。
6. **首屏 3 Bundle 拆分与分层抗 503 Service Worker**：
   - 站点公共脚本合并为 3 个静态包：`js/bundles/core.js`、`js/bundles/home.js`、`js/bundles/sub.js`（源文件始终保留，由 `scripts/build-bundles.mjs` 幂等生成）；
   - `sw.js`（当前 `sevenjohn-v302`）采用分层预缓存：`CORE_ESSENTIAL`（首页壳与关键脚本）支持失败退避重试，`CORE_EXTRAS`（次级页、全文库、按需库）采用小批次 `Promise.allSettled` 缓存，单文件瞬态 `503` 不阻断 SW 激活；
   - 导航采用白名单 SWR，`/p/*.html` 采用网络优先并按自身路径独立入库（绝不污染 `./index.html` 离线兜底）；音频 Range 请求支持首播直连流播与播放后全量缓存本地切片 206。

---

## 快速开始与本地预览

### 方式一：直接双击打开
在文件管理器中直接双击 `d:\HTML\index.html`（或任意 `p/<id>.html`、`archive.html`、`gallery.html`），现代浏览器即可正常浏览。

### 方式二：本地开发服务器（推荐，支持 Range 音频与 Service Worker）
```bash
node scripts/dev-server.js
# 浏览器访问 http://127.0.0.1:8328/
```

---

## 内容维护工作流

### 1. 新增或更新工具项目
1. 编辑 [`js/projects.js`](js/projects.js) 中对应项目的文案、版本号、下载链接、提取码或 `changelog`；
2. 同步 `index.html` 的静态卡片文案与首屏版本号：
   ```bash
   node scripts/gen-card-copy.js
   node scripts/gen-card-copy.js --check
   ```

### 2. 撰写或修改文章
在 `posts/` 下新增或编辑 `.md` 文件：

```markdown
---
id: my-new-post
title: 文章标题
date: 2026-11-28
readTime: 6 分钟
category: 架构设计
section:            # 留空=技术手记；可选 creation / essay / ai
summary: 一句话摘要（用于列表、SEO 描述、分享卡片与 RSS）
tags: [架构, 端侧AI]
cover: assets/images/covers/cover-example.svg
---

## 正文标题

支持标准 Markdown、表格、代码块与原生 `<details>` 折叠块。
```

保存后执行内容构建，一次性更新全套衍生文件：
```bash
node scripts/build-articles.mjs
```

数据流如下：
```text
posts/*.md ──▶ node scripts/build-articles.mjs ──▶ js/articles.js
                                                ├── js/articles-meta.js
                                                ├── p/<id>.html（静态 SEO/分享页，自动清理过期页）
                                                └── scripts/gen-rss.js ──▶ rss.xml（全文）+ sitemap.xml
```

也可启动本地可视化写作台（仅监听 `127.0.0.1:8329`，请勿暴露公网）：
```bash
node scripts/studio/server.mjs
```

### 3. 修改 `js/` 源文件后重建 Bundle
`js/bundles/{core,home,sub}.js` 是由源文件拼接的生成物，改完 `js/` 下对应源文件后务必重建：
```bash
node scripts/build-bundles.mjs
node scripts/build-bundles.mjs --check
```

3 个 Bundle 分组：
| 产物 | 适用页面 | 包含源文件（按执行顺序） |
| --- | --- | --- |
| `js/bundles/core.js` | 全站 | `site-config.js` → `markdown-loader.js` → `wallpaper.js` → `particles.js` |
| `js/bundles/home.js` | 首页 | `search.js` → `video-gate.js` → `app.js` → `nav-indicator.js` → `player.js` |
| `js/bundles/sub.js` | 次级页 | `subpage.js` |

### 4. 修改站点外壳、照片墙或缓存版本
- **站点配置与导航一致性**：站名、社交链接、壁纸清单与页面清单收口在 [`js/site-config.js`](js/site-config.js)，改动后跑 `node scripts/sync-chrome.mjs` 校验各页入口无漂移。
- **照片墙加图**：向 [`js/gallery.js`](js/gallery.js) 顶部 `window.GALLERY_DATA` 追加条目（可选 `span: 'wide' | 'tall'`）。
- **静态资源与 SW 版本**：常规文章内容更新由 SWR 自动对齐；当修改预缓存清单、缓存结构或静态资源 `?v=` 标记时，同步更新 `sw.js` 顶部的 `CACHE`（当前 `sevenjohn-v302`）及对应资源引用。
- **保留资产说明**：仓库保留 `music/` 11 首内置曲目以及 `live2d/` 原始素材（看板娘当前在 `js/site-config.js` 中设为 `companion: false` / `live2d: false`，按需留作后续启用）。

---

## 目录与关键文件一览

| 路径 | 职责 |
| --- | --- |
| `index.html` | 首页（导航与主体区块顺序统一为：概览 → 工具 → 文章 → 理念 → 关于） |
| `p/<id>.html` | 构建期生成的 21 篇单篇静态 SEO / 分享页 |
| `archive.html` / `gallery.html` / `cards.html` / `404.html` | 时间河归档 / 照片墙 / 札签独立页 / 自定义 404 |
| `posts/*.md` | 全部文章唯一 Markdown 源文件 |
| `js/projects.js` | 5 款主力工具 + 2 款历史归档项目的唯一数据源 |
| `js/site-config.js` | 站名、导航、页面清单、壁纸与功能开关配置 |
| `js/bundles/{core,home,sub}.js` | 首屏合并脚本生成物 |
| `js/cosmos/` | 首页 3D 声学谐振场（Three.js，桌面 WebGL / 移动与降级回退 2D） |
| `css/style.css` / `css/cards.css` / `css/archive.css` / `css/gallery.css` / `css/cosmos.css` | 站点与各模块样式（明暗双主题与 WCAG AA 对比度适配） |
| `assets/fonts/` & `assets/vendor/` | 自托管 Inter 可变字体、静态 Tailwind CSS 及第三方运行时库 |
| `sw.js` | Service Worker（`sevenjohn-v302`：分层抗 503 预缓存、SWR、`/p/*.html` 独立缓存、音频 Range 切片） |
| `rss.xml` / `sitemap.xml` / `robots.txt` / `manifest.json` / `.nojekyll` | 全文 RSS、站点地图、抓取规则、PWA 清单与禁用 Jekyll 标记 |

---

## 静态校验与端到端回归测试

### 静态一致性检查
```bash
node scripts/sync-chrome.mjs
node scripts/build-bundles.mjs --check
node scripts/build-articles.mjs --check
node scripts/gen-card-copy.js --check
```

### Playwright 端到端回归（先启动本地静态服务）
```bash
# 终端 1
node scripts/dev-server.js

# 终端 2
node scripts/smoke-home.mjs
node scripts/smoke-media.mjs
node scripts/swr-check.mjs
SITE_BASE=http://localhost:8328/ node scripts/stability-check.mjs
```

---

## 部署上线

本仓库直接对应 GitHub Pages 根站点 `https://7stevejohn.github.io/`：推送至 `main` 分支即自动发布，根目录 `.nojekyll` 确保静态文件与 `posts/*.md` 原样托管不被 Jekyll 二次处理。如需同时部署至 Cloudflare Pages，根目录 `_headers` 已附带媒体类资源的缓存策略。
