# 🌟 我的个人博客与作品展示网站

这是一个现代化、轻量、高颜值的**个人独立博客与项目作品集（Portfolio & Blog）**网站。专为开发者打造，兼顾美观与极简维护，无需繁琐的 Node.js 编译构建，开箱即用。

---

## ✨ 核心特色

1. **零构建依赖，双击即用**：采用现代标准 HTML5 + Tailwind CSS + 原生 ES6，直接用浏览器双击 `index.html` 即可运行。
2. **数据与界面解耦**：
   - 全部产品（统称**个人工具**）的介绍、下载/仓库链接与提取码统一维护于 [`js/projects.js`](js/projects.js)——**改链接只改这一个文件**，产品卡片与详情弹窗会在页面加载时自动水合同步；
   - 全部文字内容（技术手记 / 创作 / 随笔）维护于 [`js/articles.js`](js/articles.js)，用可选字段 `section` 路由模块，追加数据后界面自动渲染，每篇拥有可分享的独立深链（`?post=文章id`）；某类内容为空时，对应模块与导航入口自动隐藏。
3. **全功能支持**：
   - 📝 沉浸式 Markdown 阅读弹窗与代码语法高亮（手记、小说、游戏创作、随笔通用），带阅读进度条、← → 方向键翻章、代码块一键复制；
   - 📡 RSS 订阅（`rss.xml`）与 SEO 配套（`sitemap.xml` / `robots.txt` / Open Graph 分享卡片）；
   - 📴 PWA 离线缓存（Service Worker）：断网也能读，可"添加到主屏幕"当 App 用；
 - 🌌 背景光粒子、滚动浮现编排、导航整页换页等编辑风动效（全量尊重 `prefers-reduced-motion`）；
   - 🎬 **参考视频移植的四项效果**（沿用站点原有深色语言，不改成浅色动漫风）：深空壁纸层 + 桌面磨砂玻璃、右下角 Live2D 看板娘（鼠标跟随即时摆动、可一键关闭）、波浪曲线「归档」页、照片墙灯箱，外加**按住 Tab** 唤出的快速导航。每一项都可单独关闭，加载失败一律静默退回原观感；维护方式见下文「[🎬 视频里的效果怎么维护](#-视频里的效果怎么维护)」一节。
   - ⚙️ **显示设置面板**（左下角齿轮）：效果档位、壁纸模糊/亮度滑块、粒子/推理场/看板娘开关、一键还原；站名/社交/壁纸清单/页面清单收口在 `js/site-config.js`，`scripts/sync-chrome.mjs` 负责校验各页导航与页脚不漂移；文章卡支持封面图（没封面自动用品牌渐变 + 栏目首字）。见下文「[🧩 配置、观感与发布流程](#-配置观感与发布流程)」。
   - 🌱 **花园页**（生命游戏 / 排序可视化 / 星空粒子，同一时刻只跑一个循环）与**链接页**（友情链接 + 收藏夹筛选搜索）：纯前端、零后端，见下文「[🌱 花园与链接页](#-花园与链接页第-2-轮)」。
   - 📖 **连载阅读器**（`novel.html`）：书架 + 章节抽屉 + 键盘翻页 + 进度记忆 + 字号行高调节 + 沉浸模式，章节直接读 `js/novel-data.js` 的 Markdown，见下文「[📖 连载阅读器](#-连载阅读器第-3-轮)」。
   - ✍️ **Markdown 写作管线 + 本地写作台**：文章与章节写在 `posts/*.md`，一条命令（或写作台的「保存/发布」）生成数据、RSS 与 sitemap；写作台只监听本机、界面里直接预览与上传图片，见下文「[✍️ 写作与发布](#️-写作与发布第-4-轮markdown-源文件--本地写作台)」。
  - 🖱️ **滚动保持原生**：不劫持滚轮、不做逐帧 `scrollTo` 的阻尼滚动（2026-10-17 撤掉 Lenis 式实现：实测滚轮停下后页面还会继续滑约 **989ms**、最长单帧 55ms，桌面指针手感发黏）。现在滚轮/触控板完全交给浏览器；只有锚点、回到顶部、Tab 快速导航这类**程序化跳转**才用原生 `scrollTo({ behavior: 'smooth' })`。想找回阻尼手感：控制台执行 `window.enableDampedScroll()`（仅当次会话）。
   - 📱 完美适配 PC 电脑端、平板与手机端（移动端含汉堡导航菜单）。

---

## 🚀 快速开始与本地预览

### 方法一：直接双击打开（最简单）
在资源管理器中进入 `d:\HTML\` 文件夹，直接双击 `index.html`，用 Chrome、Edge 等现代浏览器打开即可。

### 方法二：通过本地服务器运行（推荐）
在终端中执行：
```bash
# 使用 npx 启动轻量静态服务
npx serve .
```
或者在 VS Code 中安装 **Live Server** 插件，右键 `index.html` 选择 **"Open with Live Server"** 即可支持热刷新。

---

## 🛠️ 如何将你自己的项目上传展示？

旗舰作品专栏（`index.html` 中的全部 `<article data-project-id>` 卡片）负责展示文案排版；**下载链接、提取码、GitHub 仓库/Releases 地址请只在 [`js/projects.js`](js/projects.js) 中维护**——页面加载时 `app.js` 会按 `data-project-id` 自动把这些链接水合到卡片按钮上（HTML 中的初始 href 仅作 JS 失效时的兜底）。

`projects.js` 同时驱动点击「技术规格详情」后的弹窗内容：
```javascript
{
  id: "my-awesome-project",
  title: "我的项目名称",
  category: "desktop",                // 可选: desktop (桌面应用) | android (Android 应用)
  categoryName: "桌面应用",
  description: "一句话介绍这个项目的核心亮点与用途",
  tags: ["Vue3", "TailwindCSS", "Vite"],
  image: "assets/images/my-project.png", // 可选。不填时自动渲染「渐变+首字母」品牌封面
  demoUrl: "https://your-demo.com",     // 在线演示链接，若无填 "#"
  githubUrl: "https://github.com/...",  // 代码仓库链接，若无填 "#"
  downloadUrl: "https://...",            // 下载地址（如蓝奏云），无则整行删掉
  downloadPwd: "abcd",                   // 下载提取码，无密码则删掉该行
  featured: true,                       // 是否设为精选推荐
  details: `
### 💡 项目介绍
这里支持写详细的 Markdown 文档介绍你的项目细节...
  `
}
```

> 💡 **小贴士**：`image` 字段可省略——不填时卡片会自动渲染与站点配色统一的「渐变+项目名首字母」品牌封面。如果项目有真实截图，建议保存在 `assets/images/` 目录下并在 `image` 字段填写例如 `"assets/images/your-screenshot.png"`。

---

## ✍️ 如何写新的文字内容（技术手记 / 小说 / 游戏创作 / 随笔）？

> ❗**2026-10-17 起写作入口变了**：文章写在 `posts/*.md`（front matter + Markdown 正文），
> `js/articles.js` 是**生成物**，手改会在下次生成时被覆盖。用本地写作台最省事，见「[✍️ 写作与发布](#️-写作与发布第-4-轮markdown-源文件--本地写作台)」。

每一篇是一个 Markdown 文件，front matter 里的 `section` 决定它出现在哪个模块：

| 想发布到 | 怎么填 |
| --- | --- |
| 技术手记 | 不填 `section` |
| 创作 → 小说 | `section: "creation"`，`category: "小说"` |
| 创作 → 游戏创作 | `section: "creation"`，`category: "游戏创作"` |
| 随笔 | `section: "essay"`，`category: "随笔"` |
| AI 学习 | `section: "ai"` |

`posts/my-new-post.md`：

```markdown
---
id: my-new-post              # 深链：https://7stevejohn.github.io/?post=my-new-post
title: 作品名 · 第一章：启程
date: 2026-03-03
readTime: 5 分钟              # 可留空
category: 小说                # 创作模块填 小说 / 游戏创作；手记随笔随意
section: creation            # 可选，见上表；不填 = 技术手记
summary: 一句话概括本章或本篇内容……   # 必填（列表与 RSS 都用它）
tags: [连载中]
cover: assets/images/xxx.webp  # 可选，卡片封面；不填用品牌渐变封面
---

## 这里是 Markdown 正文

支持 **粗体**、*斜体*、列表、代码块高亮。
```

写完跑 `node scripts/build-articles.mjs` 生成数据（或直接用写作台点保存）。

> 💡 `articles.js` 里现存的就是正式文章；想新增时照上表追加数据即可。随笔模块在没有内容时会整体隐藏。

写完后**运行一次下面命令**，同步更新 RSS 订阅源与站点地图：
```bash
node scripts/gen-rss.js
```

---

## 📦 部署配套文件一览

| 文件 | 作用 | 维护方式 |
| --- | --- | --- |
| `rss.xml` / `sitemap.xml` | RSS 订阅源 / 搜索引擎站点地图 | 新增文章后运行 `node scripts/gen-rss.js` 重新生成 |
| `robots.txt` | 搜索引擎抓取规则（指向 sitemap） | 基本无需改动 |
| `404.html` | GitHub Pages 自定义 404 页 | 基本无需改动 |
| `og-image.png` | 分享到微信/QQ/X 的预览大图（1200×630） | 想换品牌图时替换 |
| `favicon.ico` / `apple-touch-icon.png` | 浏览器标签图标 / iOS 添加主屏图标 | 想换 logo 时替换 |
| `assets/fonts/` | 自托管 Inter 字体（不依赖 Google Fonts，大陆访问不阻塞） | 无需改动 |
| `assets/vendor/lucide.min.js` | 自托管 Lucide 图标库 v1.41.0（不依赖 unpkg，大陆访问不阻塞） | 想升级时从官方 UMD 构建替换 |
| `manifest.json` / `icon-512.png` | PWA 应用清单与安装图标 | 想换 App 名字/图标时替换 |
| `sw.js` | Service Worker 离线缓存（全面 stale-while-revalidate：缓存秒开 + 后台更新） | 常规发布**无需**动版本号——内容更新由 SWR 在访客下次打开时自动对齐；仅当改动 `CORE` 预缓存列表或缓存结构时才把顶部 `CACHE` +1 |
| `_headers` | Cloudflare Pages 响应头（媒体类资源 7 天缓存） | 仅影响 pages.dev；媒体文件名惯例"名不变内容不变"，新增目录要放宽缓存时在此追加 |
| `.nojekyll` | 让 GitHub Pages 跳过 Jekyll：不加的话，`posts/*.md`（带 front matter）会被渲染成 `/posts/*.html` 的重复页面 | 不要删；文件内容随意（Pages 只看存在与否） |
| `js/cosmos/`（main.js + config.js + scene/ + audio/ + interaction/） | 首页 3D 背景「等高线岛图」：fbm 高度场 + domain warp 的等值线渲染，随乐律动（three.js 自托管；手机/无 WebGL 降级 2D 星河，软渲染设备静态暗角） | 改参数看 `config.js`；设备分档逻辑见 `main.js` |
| `js/cosmos.js` / `css/cosmos.css` | 无 WebGL 时的 2D 回退背景（噪声宇宙），主场景初始化失败自动加载 | 一般无需改动 |
| `scripts/cosmos-scan.mjs` | 背景引擎验收（20 项断言：full/lite/static 三档、等高线探针、帧推进、容灾标志、reduce-motion、3D 拉取失败回退） | `python -m http.server 8327` + `node scripts/cosmos-scan.mjs` |
| `scripts/smoke-media.mjs` + `dev-server.js` | 媒体体验验收（音乐/视频秒开、互斥、滚出暂停、离线可播；dev-server 为带 Range 的本地静态服务器） | `node scripts/dev-server.js` + `node scripts/smoke-media.mjs` |
| `scripts/swr-check.mjs` | SW 策略验收（缓存秒开/后台更新/导航缓存优先/离线兜底，CDP 注入 3s 网络延迟做计时断言） | `node scripts/dev-server.js` + `node scripts/swr-check.mjs` |
| `scripts/stability-edge.mjs` | 边缘稳定性（恶意 ?post=、损坏 localStorage、reduce-motion、弹窗压力循环） | `python -m http.server 8327` + `node scripts/stability-edge.mjs` |
| `cosmos-home.html` | 2D 回退背景的单文件演示页（CSS/JS 全内嵌，可独立分享） | 改 `js/cosmos.js` 后如需同步，重跑一次内嵌导出 |
| `archive.html` + `css/archive.css` + `js/archive.js` | 波浪曲线「归档」页：全部文章按时间排在一条曲线上，点卡片回首页阅读弹窗 | 数据来自 `js/articles.js`，加文章无需改这里 |
| `gallery.html` + `css/gallery.css` + `js/gallery.js` | 照片墙：混排网格 + 灯箱（←/→/Esc） | 加图只在 `js/gallery.js` 顶部 `GALLERY_DATA` 里加一条 |
| `js/subpage.js` | 次级页共用外壳（SW 注册、导航滚动态、页脚年份、滚动浮现 `window.pageReveal`） | 一般无需改动 |
| `js/tab-nav.js` + `css/style.css` 的 `#tabnav` 段 | 按住 Tab 唤出目录 / 快速导航（弹窗内列该文目录，页面上列章节与最近文章） | 阈值与节流在文件头 `HOLD` / `CYCLE_GAP` |
| `js/site-config.js` + `scripts/sync-chrome.mjs` | 站点配置唯一来源（站名/社交/壁纸/页面/导航）+ 各页导航页脚一致性校验与注入 | 加页面改配置后跑 `node scripts/sync-chrome.mjs`；新页面用 chrome 标记块 + `--write` |
| `js/settings-panel.js` + `css/settings-panel.css` | 左下角齿轮：档位、壁纸模糊/亮度滑杆、粒子/推理场/看板娘开关、一键还原 | 键名与语义见「[🧩 配置、观感与发布流程](#-配置观感与发布流程)」 |
| `js/nav-indicator.js` | 导航当前项胶囊（跟 ScrollSpy 的 `.nav-active`，只动 transform/width） | 桌面细指针才启用；样式在 `css/style.css` 的 `.nav-pill` |
| `scripts/make-wallpapers.mjs` + `assets/images/wallpaper-2/3.webp` | 程序化生成深空壁纸（ffmpeg 逐像素合成，零版权风险） | `node scripts/make-wallpapers.mjs [--force]`；轮换清单在 `SITE_CONFIG.wallpapers` |
| `js/wallpaper.js` + `assets/images/wallpaper*.webp` | 深空壁纸层门控、轮换、渐变兜底与档位判定（换壁纸=替换图片并在配置里登记） | 关闭开关：控制台 `localStorage['sj.wallpaper']='off'`，或左下角齿轮 |
| `assets/vendor/live2d/`（运行时 + 官方示例模型，约 1.9MB） | 右下角 Live2D 看板娘资源（`waifu-tips.js` / `waifu.css` / `live2d.min.js` / `chunk/index.js` / `model/shizuku/**`） | 重建或换模型：`node scripts/vendor-live2d.js`；来源与授权见目录内 `SOURCE.txt` |
| `scripts/vendor-live2d.js` | 从隔离 node 工作区把看板娘运行时与模型搬进 `assets/vendor/live2d/`（跳过 800KB 交互音效并摘掉 `sound` 引用） | 依赖 `npm i live2d-widgets@1.0.1 live2d-widget-model-shizuku@1.0.5` |
| `scripts/video-fx-smoke.mjs` | 全站验收（101 项断言：壁纸轮换/看板娘/归档/照片墙/按住 Tab/手机档/离线/降级/配置与设置面板/胶囊/目录/封面/灯箱/原生滚动/花园/链接页/连载阅读器/内容管线与写作台） | `node scripts/dev-server.js` + `node scripts/video-fx-smoke.mjs` |
| `garden.html` + `js/garden.js` + `js/garden/{life,sorting,stars}.js` + `css/garden.css` | 花园页：三个 canvas 玩具，单循环、切页停帧、减少动效只画一帧 | 加玩具：新文件推进 `window.GardenToys` + 页面加一个 script 标签 |
| `links.html` + `js/friends.js` + `js/bookmarks.js` + `js/links.js` + `css/links.css` | 链接页：友情链接（空态 + 申请说明）与收藏夹（分组筛选 + 关键词搜索） | 友链加 `js/friends.js`，收藏加 `js/bookmarks.js` |
| `novel.html` + `js/novel.js` + `js/novel-data.js` + `css/novel.css` | 连载阅读器：书架、章节抽屉、键盘翻页、进度记忆、字号行高、沉浸模式、章节深链 | 章节写进 `posts/novel/<书>/*.md`（生成到 `js/novel-data.js`） |
| `posts/`（+ `posts/novel/`） | **写作入口**：文章与章节的 Markdown 源文件（front matter + 正文） | 手写或用本地写作台；改完跑 `node scripts/build-articles.mjs` |
| `scripts/build-articles.mjs` + `scripts/lib/front-matter.mjs` | 内容生成：md → `js/articles.js` / `js/novel-data.js` / RSS / sitemap，含校验与等价性比对 | `--check` 只校验；`--compare <旧文件>` 逐字段比对 |
| `scripts/migrate-to-markdown.mjs` | 一次性迁移（已执行）：`js/articles.js` → `posts/*.md`，备份到 `.local/` | 只在需要重做迁移时用（`--force` 覆盖） |
| `scripts/studio/` | 本地写作台（界面 + 服务，127.0.0.1:8329）：列表、编辑器、实时预览、图片上传、保存与发布 | `node scripts/studio/server.mjs` |

---

## 🗂️ 读者互动与本地功能一览

以下功能**全部只存访客本机 LocalStorage（`sj.` 前缀），不上传任何数据**；跨访客统计/留言类功能见下节第三方接入。

| 功能 | 用法 | 存储键 |
| --- | --- | --- |
| 本地文本批注 | 弹窗内选中正文 → 写批注 → 保存；黄色高亮持久保留，点击高亮可查看/删除 | `sj.ann.<文章id>` |
| 情绪反馈 | 文章底部点 💫共鸣 / 💡启发 / ❓疑惑 / 🌧唏嘘（单选可取消，仅标记自己的感受） | `sj.emo.<文章id>` |
| 随便看看 | Ctrl/⌘+K 搜索面板右下角「随便看看」按钮，随机打开一篇旧文 | 无 |
| 时光回溯 | 文章数据加 `revisions` 字段即可在弹窗切换新旧版本（见下） | 无 |
| 读完致谢 | 弹窗内读到 100% 出现一次性提示 | 无 |
| 键盘彩蛋 | 依次按 ↑↑↓↓←→←→BA，粒子变彩色庆典 20 秒 | 无 |

**文章版本切换（时光回溯）数据写法**——在文章对象上加 `revisions` 数组，越靠前越旧：
```javascript
{
  id: "my-post",
  title: "...",
  content: "最新版正文",
  revisions: [
    { label: "初稿 2026.01", content: "旧版正文" },
    { label: "二稿 2026.05", content: "中间版正文" }
  ]
}
```

**折叠注解块写法**——Markdown 里直接写原生 HTML（marked 原生支持）：
```html
<details><summary>注：这里展开补充说明</summary>
正文补充内容……
</details>
```

**状态仪表盘**——编辑 [`js/status.js`](js/status.js) 的 `SITE_STATUS`（在读/在做/心情/更新日期），首页头像区自动展示；留空则整行隐藏。

## 💬 读者共创类功能接入指引（可选，需注册第三方服务）

按方案约束，留言/投票/表单类跨访客交互全部走第三方、不自建后端，且发布前需人工审核：

1. **评论 / 反向问答**：注册 [giscus.app](https://giscus.app)（基于 GitHub Discussions）→ 仓库开启 Discussions → 按 giscus.app 向导生成配置 → 在 `index.html` 弹窗模板后插入其 `<script>` 挂载代码即可。
2. **回信表单 / 读者共创投递**：注册 [Formspree](https://formspree.io)（免费档够用）→ 拿到表单 endpoint → 新增一个"回信"区块放 `<form action="https://formspree.io/f/你的ID" method="POST">`；投稿进入你的邮箱，人工筛选后整理成博文发布。
3. **邮件订阅**：[Buttondown](https://buttondown.email) 或 [follow.it](https://follow.it)，同样一段嵌入代码；也可以只保留 RSS（已内置 `rss.xml`）。

---

## 🎬 视频里的效果怎么维护

四项效果都做成「可选层 + 静默降级」：资源在就生效，加载失败或被关掉就完全回到原来的观感，不弹提示、不刷报错。整站仍是深色极简体系，运行时零 CDN。

### 1. 深空壁纸 + 桌面磨砂玻璃
- 图片：`assets/images/wallpaper.webp`（1920×1080，约 42KB）。**换壁纸 = 替换这张图**，不用改代码。
- 层级：`#site-wallpaper`（z-index -1）压在推理场画布之上、暗角之下；桌面细指针设备用 `mix-blend-mode: screen`，壁纸亮部从推理场深底里透出来，触摸设备改用低透明度静态层（省一次每帧全屏混合）。
- 桌面端内容卡片会额外补一层 10px 轻磨砂（`@supports` + `pointer: fine`），手机保持纯色卡片。
- 关闭：控制台执行 `localStorage['sj.wallpaper']='off'` 后刷新；或直接删掉那张 webp（门控脚本探测不到图就不挂 `has-wallpaper`）。
- 实现：`js/wallpaper.js`（门控 + 档位判定）+ `css/style.css` 末尾「深空壁纸层」段。
- **效果分两档，自动判定**（2026-10-17 加，起因是用户报"明显变卡"）：
  | 档位 | 什么时候用 | 表现 |
  |---|---|---|
  | `full` 完整档 | 有硬件加速的正常桌面 | 壁纸 `screen` 混合 + 内容卡片 10px 磨砂 + 看板娘 |
  | `lite` 轻档 | 软件渲染（无硬件加速 / 驱动被回退 / 远程桌面 / 无 WebGL）、或首帧后帧率连测两段都低于 42 帧 | 保留壁纸氛围，但**不做混合、卡片不加磨砂**，也不加载看板娘（省 1.9MB + 一份每帧渲染） |
  实测依据（软件合成路径下滚动帧率）：两者都上 = 33.8 帧（更差的一次 16.3 帧）；只去掉卡片磨砂 = 60.3 帧。所以最贵的就是卡片那层大面积 `backdrop-filter`，混合与壁纸模糊几乎免费。
- **手动控制**（优先级最高，写了就沿用）：URL 加 `?fx=full` 强制完整效果、`?fx=lite` 强制轻档、`?fx=off` 彻底关掉壁纸层。控制台等价写法：`localStorage['sj.wallpaper']='on'|'lite'|'off'`。
- 判定过弱机后会记住（`sj.fx-lite=1`），不再每次测；想重测就删掉这个键或加 `?fx=full`。

### 2. Live2D 看板娘（右下角）
- 出现条件：桌面细指针 + 视口 ≥1024px + 没开「减少动态效果」+ 没开省流量 + **有 WebGL** + **不是轻档**（见上一条）+ 用户没关过；**首帧之后**才加载，且**不进 SW 预缓存**（和 three、mp3 同策略）。
- 模型下载完（上游给 `#waifu` 挂 `waifu-active`）之前容器保持 `visibility:hidden`：慢网下不会先冒出一个挡点击的空方块，也不会让人以为"没有看板娘"。
- 关闭：角色右上角的小叉（写 `sj.live2d=off` 持久化）。想找回来：`localStorage.removeItem('sj.live2d')` 后刷新。
- ❗`file://` 双击打开时模型要 fetch，会被 CORS 挡 → 看板娘静默不出现；**要看她请用本地服务器预览**（`node scripts/dev-server.js` → http://localhost:8328）。
- 换模型：把新模型的 `assets/**` 放进 `assets/vendor/live2d/model/<名字>/`，再改 `assets/vendor/live2d/waifu-tips.json` 里 `models[].paths` 指向新的 `*.model.json`；整体重建用 `node scripts/vendor-live2d.js`（依赖装在隔离 node 工作区，见脚本头注释）。
- 说什么话：文案全在 `assets/vendor/live2d/waifu-tips.json`（`mouseover` / `click` 的 `selector` 写站内元素，`{text}` 会替换成该元素文字；已去掉上游的「一言」与彩蛋外链，保证零外部请求）。
- 授权：运行时 `live2d-widgets` 是 **GPL-3.0-or-later**，模型是 **Live2D 官方示例模型「Shizuku」**；换第三方模型前请自行确认授权。详见 `assets/vendor/live2d/SOURCE.txt`。
- 位置协调：看板娘在场时（`html.has-live2d`）右下角「回到顶部」自动左移 304px 让位；音乐播放器在底部居中，互不遮挡。

### 3. 归档页（波浪曲线时间轴）
- `archive.html` 的数据直接读 `js/articles.js` 的 `ARTICLES_DATA`（与首页同一份），**加文章不用改这个页面**。
- 桌面 ≥900px：一条正弦曲线串起所有卡片，卡片左右交错挂在曲线两侧，滚动时曲线「走到哪亮到哪」；<900px 退化为单列 + 左侧竖线（不做绝对定位，稳）。
- 分类筛选写进地址栏 hash（如 `archive.html#creation`），可分享、可后退。
- 卡片是 `<a href="index.html?post=<id>">`：点了回首页打开阅读弹窗，读全文的逻辑只有一份。

### 4. 照片墙 + 灯箱
- `gallery.html`：加一张图 = 在 `js/gallery.js` 顶部 `GALLERY_DATA` 里加一条：
  ```js
  { src: 'assets/images/xxx.webp', caption: '标题', meta: '副标题', span: 'wide' }  // span 可选 'wide' / 'tall'，用来错落排版
  ```
- 灯箱：←/→ 切换、Esc 关闭、点遮罩关闭；打开时锁页面滚动，关闭后焦点回到那张图；大图 `loading="lazy"`，只预加载相邻两张。

### 5. 按住 Tab 唤出目录 / 快速导航
- 轻点 Tab：完全走浏览器原生焦点导航（这个功能不接管）。
- **按住 Tab 约 180ms**：弹出玻璃浮层 —— 在文章阅读弹窗里列出该文目录；在页面上列出站点章节 + 最近文章。按住期间 Tab / Shift+Tab 循环高亮（200ms 节流，不容易选飞），**松开跳转**，Esc 取消。
- 目标是弹窗内标题就在弹窗里滚；否则走站点既有的平滑滚动数学（顶部留 64px，`prefers-reduced-motion` 下瞬时跳）。
- 取舍：为了「轻点仍是原生 Tab」，首次 keydown 不 preventDefault —— 代价是按住时可能闪一下焦点环，换来的是键盘可达性不因这个功能倒退。

### 6. 怎么验收
```bash
node scripts/dev-server.js          # 终端 A：8328 静态服务（带 Range）
node scripts/video-fx-smoke.mjs     # 终端 B：效果移植验收 63 项断言
```
含三条易回归的路径（2026-10-17 补）：**H 弱机自动降档**（软件合成下滚动帧率必须回到 60 帧档、不加载看板娘、`?fx=full` 能覆盖）、**I 无 WebGL**（零请求、零报错、不留空白看板娘）、A2b **强机档位**（卡片磨砂在场）。
既有回归套件（本次改动全部通过）：
```bash
node scripts/swr-check.mjs                                      # SW 策略（dev-server 8328）
node scripts/smoke-media.mjs                                    # 媒体体验（dev-server 8328）
python -m http.server 8327  →  node scripts/stability-edge.mjs   # 边缘稳定性
python -m http.server 8327  →  node scripts/cosmos-scan.mjs      # 背景引擎
```
> `sw.js` 顶部 `CACHE` 本次由 `v137` 升到 `v138`（改了 `CORE` 预缓存列表）；脚本里硬编码过缓存名的 `swr-check.mjs` / `smoke-media.mjs` 已同步。

## 🧩 配置、观感与发布流程

这一节是「参考站可借鉴项」的落地记录（2026-10-17 第 1 轮）。

### 站点配置收口（`js/site-config.js`）

站名、简介、作者、社交链接、壁纸清单、页面清单、导航与「更多」条目、页脚外链全部只在这一个文件里定义：

- 浏览器直接读 `window.SITE_CONFIG`；Node 侧（`gen-rss.js`、`sync-chrome.mjs`、写作台）`require` 后读 `globalThis.SITE_CONFIG`，同一份定义。
- **加一个页面**：`pages[]` 里登记（`sitemap:true` 才会进 sitemap.xml），入口放 `entries[]`（归档/照片墙这一档）。
- **校验不漂移**：`node scripts/sync-chrome.mjs` —— 检查根目录每个 HTML 都已登记、每个页面都含 `entries[]` 与 `externals[]` 的链接、首页还含 `nav[]`/`more[]`；缺了就报出来（当前 6 项全过）。
- **新页面免手写导航**：页面里放两个标记块即可，`node scripts/sync-chrome.mjs --write` 会把导航与页脚渲染进去：
  ```html
  <!-- chrome:nav:start --><!-- chrome:nav:end -->
  <!-- chrome:footer:start --><!-- chrome:footer:end -->
  ```
  （既有三页是手写块且带 `data-page-node-id`，脚本只校验不覆盖。）
- **sitemap 不再被覆盖**：`scripts/gen-rss.js` 已改为从 `SITE_CONFIG.pages` 输出页面清单，顺手给首页写根路径、给各页带上 priority/changefreq。

### 显示设置面板（左下角齿轮）

| 项 | 作用 | 存储键 |
| --- | --- | --- |
| 效果档位 完整/轻档/关闭 | 等于 `?fx=full` / `?fx=lite` / `?fx=off` | `sj.wallpaper` |
| 壁纸模糊 0–26px | 实时改 `--wp-blur` | `sj.wp-blur` |
| 壁纸亮度 30–100% | 实时改 `--wp-dim` | `sj.wp-dim` |
| 粒子层 / 推理场 / 看板娘 | 关掉对应引擎（刷新后彻底停） | `sj.particles` / `sj.cosmos` / `sj.live2d` |
| 一键还原 | 清掉以上全部键并刷新 | — |

- 滑杆与档位立即生效；粒子/推理场/看板娘是各自脚本启动阶段的早退开关，面板会先隐藏再提示刷新。
- 档位那一行会告诉你「这台机器被自动判成轻档了」（= 之前那次掉帧的自动降档），想强制完整效果点「完整」即可。

### 壁纸轮换与生成

- 清单在 `SITE_CONFIG.wallpapers[]`；每次进站随机选一张并用 `sessionStorage` 固定（滚动中不换图），加载失败自动顺延下一张，全部失败退回 `themeColors` 深色渐变（不会留空底）。
- 新图可以自己丢进 `assets/images/` 并加进清单；想程序化生成同风格的用 `node scripts/make-wallpapers.mjs [--force]`（ffmpeg 逐像素合成，零依赖零版权风险）。

### 三件动效与文章封面

- **导航当前项胶囊**（`js/nav-indicator.js`）：跟 `ScrollSpy` 的 `.nav-active` 走，只动 transform/width；启用后原来的下划线让位（脚本没跑时仍是下划线，观感不倒退）。
- **目录高亮当前章节**（`app.js` 的 `initTocSpy`）：滚动容器内取距顶部最近的标题，给对应 `.toc-link` 加 `.is-current` + `aria-current`。
- **灯箱入场**（`css/gallery.css`）：大图 `scale .94→1` + 淡入，换图重放；`prefers-reduced-motion` 下关闭。
- **文章卡封面**：`js/articles.js` 里给文章加可选字段 `cover: "assets/images/xxx.webp"` 即可（桌面左图右文 200×120，手机上图下文 16:9）；**没写 cover 的文章自动用「品牌渐变 + 栏目首字」**，图片 404 时 `onerror` 摘掉 `img` 露出首字，不留破图框。

### 顺手修掉的两个既有问题

1. **ScrollSpy 高亮一直只落在移动端抽屉里**：`collectNavSections` 把桌面导航与抽屉按 href 去重，只保留后出现的抽屉链接，于是桌面导航从不高亮（做胶囊时暴露）—— 改成同一 href 的所有链接一起标记。
2. **CSS 变量里的相对 `url()` 按样式表路径解析**：壁纸轮换写进 `--wp-image` 的相对路径被解析成 `/css/assets/...`，图片根本没显示 —— 现在先转绝对地址再写变量。

### 验收

```bash
node scripts/sync-chrome.mjs        # 站点外壳一致性（页面入口/标记块）
node scripts/dev-server.js          # 终端 A
node scripts/video-fx-smoke.mjs     # 终端 B：101 项（J/K/L/M 段分别覆盖第 1–4 轮）
```

## 🌱 花园与链接页（第 2 轮）

### 花园 `garden.html`（`js/garden.js` + `js/garden/*.js`）

一个页面装三个 canvas 玩具，**任何时刻只跑一个 rAF 循环**（站点背景已经在跑推理场/粒子，花园再加循环必须互相让路），标签页切走自动停帧，`prefers-reduced-motion` 下只画一帧、交互时补画。

| 玩具 | 看点 | 操作 |
| --- | --- | --- |
| 康威生命游戏 | 三条规则长出滑翔机与振荡子 | 拖动画活细胞 · 空格播放/暂停 · R 随机 · C 清空 · 速度滑杆 |
| 排序可视化 | 同一组随机数用三种算法排出来 | 冒泡/插入/快速切换 · 播放暂停 · 速度与规模滑杆 · 打乱重来 |
| 星空粒子 | 三层视差 + 闪烁 + 拖尾 | 密度滑杆 · 视差/拖尾开关 · 鼠标移动给整场偏移 |

- 玩具只需实现 `setup/draw/teardown`（可选 `controls()`／`pointer()`／`key()`），框架负责 DPR、尺寸、循环、控制条 DOM；加第四个玩具 = 新建一个文件推进 `window.GardenToys` + 在 `garden.html` 里加一个 `<script>`。
- 切换器写 `location.hash`（`#life` / `#sorting` / `#stars`），可直接分享某个玩具的直链。

### 链接页 `links.html`（`js/friends.js` + `js/bookmarks.js` + `js/links.js`）

- **友情链接**：数据在 `js/friends.js`（`name/url/desc/avatar`）；为空时显示空态与申请方式（邮箱 + GitHub），倾向收录原创、可稳定访问的站点。
- **收藏夹**：数据在 `js/bookmarks.js`（分组 → 条目：`name/url/desc/tags`）；分组胶囊筛选 + 本地关键词搜索（纯前端过滤，命中数实时显示）。
- 全是外链入口，页面本身不加载任何第三方资源（零外链红线不受影响）；站内相对链接（如 `archive.html`）直接跳转，外链统一 `rel="noopener noreferrer"`。

## 📖 连载阅读器（第 3 轮）

`novel.html` + `js/novel-data.js`（数据）+ `js/novel.js`（渲染）+ `css/novel.css`。

- **数据与界面解耦**：章节写在 `js/novel-data.js` 的 `window.NOVEL_BOOKS`（书 → 卷 → 章，正文是 Markdown），加一章就是加一条记录，刷新即可见。
- **阅读体验**：窄版心（34em）中文长文排版；章节抽屉（含当前章高亮）；上一章/下一章；键盘 **←/→** 翻章；**沉浸模式**（藏导航与工具，只留正文 + 一枚「退出沉浸」，Esc 也能退出）。
- **进度记忆**：每个书一本记录 —— `sj.novel.last.<bookId> = { chapter, scroll }`，从书架再进去会接着上次那一章；排版偏好存在 `sj.novel.type = { size, lh }`（字号 16–22、行高 1.6–2.1）。
- **可分享深链**：`novel.html#<bookId>/<chapterId>`，翻章时用 `replaceState` 同步地址栏，深链可直接落到某一章。
- **代码块**：正文里出现 ```` ``` ```` 时才按需加载 highlight（与首页手记同一套按需策略）。
- **现状**：站内还没有真正的连载内容，所以书架里放了一本标注「示例」的两章短书用于验证阅读器（页面顶部有提示，可一键「知道了」）；第 4 轮的本地写作台会直接往 `js/novel-data.js` 生成章节，届时删掉示例书即可。

## ✍️ 写作与发布（第 4 轮）：Markdown 源文件 + 本地写作台

### 数据流（运行时零改动）

```
posts/*.md            ─┐
posts/novel/<书>/*.md ─┼→ node scripts/build-articles.mjs ─→ js/articles.js（生成物）
                       │                                     js/novel-data.js（生成物）
                       └───────────────────────────────────→ rss.xml / sitemap.xml（顺带刷新）
```

- **站点运行时完全没变**：仍然只读 `window.ARTICLES_DATA` / `window.NOVEL_BOOKS`，字段与手写时代逐个一致。
- 迁移时做过**逐字段等价性验收**：现在跑 `node scripts/build-articles.mjs --compare .local/articles.js.bak-<时间戳>` 仍会报「16 篇文章逐字段一致（含正文）」。

### 命令

| 命令 | 作用 |
| --- | --- |
| `node scripts/build-articles.mjs` | 从 `posts/` 生成 `js/articles.js` + `js/novel-data.js` + RSS/sitemap |
| `node scripts/build-articles.mjs --check` | 只校验不写文件（id 唯一、日期格式、section 合法、摘要必填、tags 非空） |
| `node scripts/migrate-to-markdown.mjs [--force]` | 一次性迁移（已跑过）：把 `js/articles.js` 导出为 `posts/*.md`，并备份到 `.local/` |
| `node scripts/studio/server.mjs` | 启动本地写作台（见下） |

### 本地写作台（`scripts/studio/`）

```bash
node scripts/studio/server.mjs      # http://127.0.0.1:8329
node scripts/dev-server.js          # 另一个终端：预览线上效果 http://127.0.0.1:8328
```

- 三栏界面：左侧清单（文章 + 连载，可搜索）· 中间元信息表单 + Markdown 编辑器 · 右侧实时预览（用站点自托管的 marked + purify，渲染与线上一致）。
- 按钮：**新建文章** / **新建章节** / **保存（Ctrl+S，写 md → 校验 → 生成）** / **仅生成** / **演练**（走一遍发布流程但不提交）/ **发布**（生成 + `git add` + commit + push）。
- 图片：编辑封面时点「上传」，图片落 `assets/images/`；本机有 ffmpeg 会自动转 webp 并删掉原图。
- 删除：不真删，移入 `.local/trash-<时间戳>/`（`.local/` 不入库），随后重新生成。
- **安全边界**：只监听 `127.0.0.1`、无登录（本机工具）、读写路径限定在 `posts/**` 与 `assets/images/**`（拒绝 `..`）、git 命令用固定参数数组不经 shell。别把它暴露到公网。
- **校验失败时**：md 已落盘但不重新生成（方便你接着改），界面会把校验错误原样显示；改完再保存即可。

## 🌐 如何免费部署上线到公网？

你可以将当前整个 `d:\HTML` 目录上传到以下免费平台，获取专属二级域名分享给他人：

### 部署上线到专属主页：https://7stevejohn.github.io/
本仓库 `7SteveJohn.github.io` 是 GitHub 特别的**用户个人根主页仓库**。
只要推送到 `main` 分支，GitHub Pages 会**自动秒级部署**，直接生成根域名：
👉 **https://7stevejohn.github.io/**

只需在 `d:\HTML` 目录下执行以下命令即可：
```bash
git add .
git commit -m "feat: 升级为现代化作品集与独立博客系统"
git branch -M main
git push -u origin main --force
```
> 💡 提示：首次替换旧 Hexo 静态文件时推荐加上 `--force` 覆盖；后续每次更新项目或添加文章，只需正常 `git add .`、`git commit -m "更新内容"`、`git push` 即可！

### 推荐方案二：Vercel
1. 访问 [vercel.com](https://vercel.com/) 并使用 GitHub 账号登录；
2. 点击 **Add New Project**，选择刚才的 GitHub 仓库；
3. Framework Preset 选择 **Other**，直接点击 **Deploy**；
4. 几秒钟内即可自动生成全球 CDN 加速的访问网址，后续每次 `git push` 自动同步更新。
