# 🌟 我的个人博客与作品展示网站

这是一个现代化、轻量、高颜值的**个人独立博客与项目作品集（Portfolio & Blog）**网站。专为开发者打造，兼顾美观与极简维护，无需繁琐的 Node.js 编译构建，开箱即用。

---

## ✨ 核心特色

1. **零构建依赖，双击即用**：采用现代标准 HTML5 + Tailwind CSS + 原生 ES6，直接用浏览器双击 `index.html` 即可运行。
2. **数据与界面解耦**：
   - 三个旗舰产品（统称**个人工具**）的介绍、下载/仓库链接与提取码统一维护于 [`js/projects.js`](file:///d:/HTML/js/projects.js)——**改链接只改这一个文件**，产品卡片与详情弹窗会在页面加载时自动水合同步；
   - 全部文字内容（技术手记 / 创作 / 随笔）维护于 [`js/articles.js`](file:///d:/HTML/js/articles.js)，用可选字段 `section` 路由模块，追加数据后界面自动渲染，每篇拥有可分享的独立深链（`?post=文章id`）；某类内容为空时，对应模块与导航入口自动隐藏。
3. **全功能支持**：
   - 🌓 自动与手动的暗黑/明亮主题切换（配置记忆持久化）；
   - 📝 沉浸式 Markdown 阅读弹窗与代码语法高亮（手记、小说、游戏创作、随笔通用），带阅读进度条、← → 方向键翻章、代码块一键复制；
   - 📡 RSS 订阅（`rss.xml`）与 SEO 配套（`sitemap.xml` / `robots.txt` / Open Graph 分享卡片）；
   - 📴 PWA 离线缓存（Service Worker）：断网也能读，可"添加到主屏幕"当 App 用；
 - 🌌 背景光粒子、滚动浮现编排等 动效（全量尊重 `prefers-reduced-motion`）；
   - 📱 完美适配 PC 电脑端、平板与手机端（移动端含汉堡导航菜单）。

---

## 🚀 快速开始与本地预览

### 方法一：直接双击打开（最简单）
在资源管理器中进入 `d:\HTML\` 文件夹，直接双击 `index.html`，用 Chrome、Edge 等现代浏览器打开即可。

### 方法二：通过本地服务器运行（推荐）
在终端中执行：
```bash
# 使用 npx 启动轻量静态服务
npx serve d:/HTML
```
或者在 VS Code 中安装 **Live Server** 插件，右键 `index.html` 选择 **"Open with Live Server"** 即可支持热刷新。

---

## 🛠️ 如何将你自己的项目上传展示？

旗舰作品专栏（`index.html` 中的三个 `<article>`）负责展示文案排版；**下载链接、提取码、GitHub 仓库/Releases 地址请只在 [`js/projects.js`](file:///d:/HTML/js/projects.js) 中维护**——页面加载时 `app.js` 会按 `data-project-id` 自动把这些链接水合到卡片按钮上（HTML 中的初始 href 仅作 JS 失效时的兜底）。

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

全部文字内容都在 [`js/articles.js`](file:///d:/HTML/js/articles.js) 的 `ARTICLES_DATA` 数组里，用可选字段 `section` 决定出现在哪个模块：

| 想发布到 | 怎么填 |
| --- | --- |
| 技术手记 | 不填 `section` |
| 创作 → 小说 | `section: "creation"`，`category: "小说"` |
| 创作 → 游戏创作 | `section: "creation"`，`category: "游戏创作"` |
| 随笔 | `section: "essay"`，`category: "随笔"` |

```javascript
{
  id: "my-new-post",          // id 即深链：https://7stevejohn.github.io/?post=my-new-post
  section: "creation",        // 可选，见上表；不填 = 技术手记
  category: "小说",            // 创作模块必填（小说 / 游戏创作）；手记随笔随意
  title: "作品名 · 第一章：启程",
  date: "2026-03-03",
  readTime: "5 分钟",
  summary: "一句话概括本章或本篇内容...",
  tags: ["连载中"],
  content: `
## 这里是 Markdown 正文
支持 **粗体**、*斜体*、列表、代码块高亮。
  `
}
```

> 💡 目前 `articles.js` 里带 **【示例】** 前缀的三条是占位演示（小说 / 游戏创作 / 随笔各一条），替换成自己的内容后删掉即可。随笔模块在没有内容时会整体隐藏，想发布第一条时照上表加数据即可。

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
| `sw.js` | Service Worker 离线缓存 | ⚠️ 改动静态资源后发布时，把顶部 `CACHE` 版本号 +1，否则老用户可能读到旧缓存 |

---

## 🗂️ 读者互动与本地功能一览

以下功能**全部只存访客本机 LocalStorage（`sj.` 前缀），不上传任何数据**；跨访客统计/留言类功能见下节第三方接入。

| 功能 | 用法 | 存储键 |
| --- | --- | --- |
| 本地文本批注 | 弹窗内选中正文 → 写批注 → 保存；黄色高亮持久保留，点击高亮可查看/删除 | `sj.ann.<文章id>` |
| 情绪反馈 | 文章底部点 💫共鸣 / 💡启发 / ❓疑惑 / 🌧唏嘘（单选可取消，仅标记自己的感受） | `sj.emo.<文章id>` |
| 随便看看 | Ctrl/⌘+K 面板右下角 🎲，随机打开一篇旧文 | 无 |
| 时光回溯 | 文章数据加 `revisions` 字段即可在弹窗切换新旧版本（见下） | 无 |
| 读完致谢 | 弹窗内读到 100% 出现一次性提示 | 无 |
| 键盘彩蛋 | 依次按 ↑↑↓↓←→←→BA，粒子变彩色庆典 20 秒 | 无 |
| 访客计数 | 页脚"累计访问/访客"由 [不蒜子](https://busuanzi.ibruce.info/) 统计，无账号、不展示 IP；服务不可达时自动隐藏 | 无 |

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

**状态仪表盘**——编辑 [`js/status.js`](file:///d:/HTML/js/status.js) 的 `SITE_STATUS`（在读/在做/心情/更新日期），首页头像区自动展示；留空则整行隐藏。

## 💬 读者共创类功能接入指引（可选，需注册第三方服务）

按方案约束，留言/投票/表单类跨访客交互全部走第三方、不自建后端，且发布前需人工审核：

1. **评论 / 反向问答**：注册 [giscus.app](https://giscus.app)（基于 GitHub Discussions）→ 仓库开启 Discussions → 按 giscus.app 向导生成配置 → 在 `index.html` 弹窗模板后插入其 `<script>` 挂载代码即可。
2. **回信表单 / 读者共创投递**：注册 [Formspree](https://formspree.io)（免费档够用）→ 拿到表单 endpoint → 新增一个"回信"区块放 `<form action="https://formspree.io/f/你的ID" method="POST">`；投稿进入你的邮箱，人工筛选后整理成博文发布。
3. **邮件订阅**：[Buttondown](https://buttondown.email) 或 [follow.it](https://follow.it)，同样一段嵌入代码；也可以只保留 RSS（已内置 `rss.xml`）。

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
