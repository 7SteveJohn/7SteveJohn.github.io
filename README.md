# 🌟 我的个人博客与作品展示网站

这是一个现代化、轻量、高颜值的**个人独立博客与项目作品集（Portfolio & Blog）**网站。专为开发者打造，兼顾美观与极简维护，无需繁琐的 Node.js 编译构建，开箱即用。

---

## ✨ 核心特色

1. **零构建依赖，双击即用**：采用现代标准 HTML5 + Tailwind CSS + 原生 ES6，直接用浏览器双击 `index.html` 即可运行。
2. **数据与界面完全解耦**：
   - 项目数据维护于 [`js/projects.js`](file:///d:/HTML/js/projects.js)；
   - 博客文章维护于 [`js/articles.js`](file:///d:/HTML/js/articles.js)；
   - 新增项目或写博客，仅需在对应文件追加数据，界面自动动态渲染。文章列表为空时，博客区块与导航入口会自动隐藏。
3. **全功能支持**：
   - 🌓 自动与手动的暗黑/明亮主题切换（配置记忆持久化）；
   - 🔍 项目分类过滤与实时关键词搜索；
   - 📝 沉浸式 Markdown 博客阅读弹窗与代码语法高亮；
   - 📱 完美适配 PC 电脑端、平板与手机端。

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

### 手动编辑 `js/projects.js`
在 `PROJECTS_DATA` 数组中追加一个项目对象：
```javascript
{
  id: "my-awesome-project",
  title: "我的项目名称",
  category: "frontend",               // 可选: frontend (前端) | fullstack (全栈) | tools (工具)
  categoryName: "前端开发",
  description: "一句话介绍这个项目的核心亮点与用途",
  tags: ["Vue3", "TailwindCSS", "Vite"],
  image: "assets/images/my-project.png", // 可以是本地相对路径或网络图片地址
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

> 💡 **小贴士**：如果项目有截图，建议将图片保存在 `assets/images/` 目录下，并在 `image` 字段填写例如 `"assets/images/your-screenshot.png"`。

---

## ✍️ 如何写一篇新的技术博客？

打开 [`js/articles.js`](file:///d:/HTML/js/articles.js)，在 `ARTICLES_DATA` 数组中添加你的新文章：
```javascript
{
  id: "my-new-post",
  title: "这是我的新文章标题",
  date: "2026-03-03",
  readTime: "5 分钟",
  category: "技术心得",
  summary: "一句话概括文章的核心内容...",
  tags: ["JavaScript", "CSS"],
  content: `
## 这里是 Markdown 正文
支持 **粗体**、*斜体*、列表、代码块高亮：

\`\`\`javascript
console.log("Hello, World!");
\`\`\`
  `
}
```

---

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
