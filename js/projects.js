/**
 * 个人项目数据配置 (projects.js)
 * ----------------------------------------------------
 * 💡 如何添加你的新项目？
 * 复制下方任意一个对象结构，粘贴到数组最前面即可！
 * 
 * 字段说明：
 * - id: 唯一标识（数字或英文简写）
 * - title: 项目名称
 * - category: 分类标识 (all | frontend | fullstack | tools | mini)
 * - categoryName: 分类显示名称（如：前端开发、全栈应用、效率工具）
 * - description: 一句话/简短介绍项目亮点与功能
 * - tags: 技术栈标签数组（如：["Vue 3", "Vite", "Tailwind"]）
 * - image: 项目封面图（可以是网络图片链接，或者放在 assets/images/ 中的本地相对路径）
 * - demoUrl: 在线演示地址（若暂无请填 "#"）
 * - githubUrl: 源码仓库地址（GitHub/Gitee链接，若暂无请填 "#"）
 * - featured: 是否推荐在醒目位置展示 (true / false)
 * - details: 点击查看详情时的完整介绍（支持 Markdown 或文字排版）
 */

window.PROJECTS_DATA = [
  {
    id: "filebutler",
    title: "FileButler · 本地智能文件管家",
    category: "fullstack",
    categoryName: "全栈开发",
    description: "完全本地运行的文件整理 + 知识库问答桌面应用：AI 由 Ollama 免费模型驱动，无需 API Key。支持 Everything 式秒搜、文档自动向量化、图片语义搜索/OCR、重复文件安全清理，全程可撤销，数据不出本机。",
    tags: ["Python", "Vue 3", "Ollama", "SQLite / FTS5", "RAG"],
    image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80",
    demoUrl: "https://github.com/7SteveJohn/FileButler/releases",
    githubUrl: "https://github.com/7SteveJohn/FileButler",
    featured: true,
    details: `
### 💡 项目介绍
FileButler 是一款**完全本地运行**的智能文件管家桌面应用（pywebview + Vue 3 单窗口内嵌），把文件整理与个人知识库问答合二为一。所有 AI 能力由本机 Ollama 免费开源模型提供，**不需要任何 API Key，数据不出本机**。

### ✨ 核心功能
- **自动文件编目（Everything 式，只读）**：启动自动扫描用户目录，watchdog 后台实时监控，新文件几秒内可搜；支持 \`ext:pdf\`、\`size:>100mb\`、\`dm:本周\` 等搜索语法，长词走 FTS5 全文索引
- **自动知识库问答（RAG）**：监控目录的新文档自动向量化入库（bge-m3），无需手动索引即可内容搜索与问答，对话历史可回看
- **图片语义搜索 + OCR**：视觉模型生成描述并转录图中文字，搜「日落」找照片、搜发票号找截图
- **智能文件整理**：规则 + 本地大模型批量分类 → 预览确认 → 执行移动 → 全程可撤销，**绝不会自动移动文件**；整理方案可存为模板
- **重复文件安全清理**：三级哈希找重 → 按规则保留 → 移入「待清理」文件夹（不删除，可撤销）
- **每周文件报告 / 数据库自动备份 / 开机自启 / 托盘常驻 / 深色模式**

### 🛠️ 技术要点
- 后端：Python（SQLite 向量检索、watchdog 实时监控、仅 127.0.0.1 白名单校验的缩略图服务、RAG 管线）
- 前端：Vue 3 + Naive UI，Vite 构建为单文件内嵌 pywebview
- 安全设计：所有文件移动前必须「预览 → 勾选确认」，每步操作写日志、按批次一键撤销，Ollama 未就绪时自动降级为规则整理 + 关键词搜索
    `
  },
  {
    id: "netops-handbook",
    title: "NetOps Handbook · 离线网络运维知识体系",
    category: "fullstack",
    categoryName: "全栈开发",
    description: "100% 离线的 Android 应用：58 知识模块、25 排障案例、500+ 多厂商 CLI 命令、30 道面试真题。WebView 壳层 + 单文件 SPA 架构，零网络权限，数据与界面完全解耦。",
    tags: ["Android", "WebView", "Gradle 8.9", "单页 SPA", "离线应用"],
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
    demoUrl: "#",
    githubUrl: "https://github.com/7SteveJohn/netops-handbook",
    featured: true,
    details: `
### 💡 项目介绍
NetOps 2.0 是一款**零网络权限、100% 离线**的 Android 网络运维知识应用，覆盖传统网络、云原生、故障排查与面试准备四大方向，专为工程师在无网环境下的速查与学习打造。

### ✨ 核心数据
- **58 个知识模块** / **25 个排障案例** / **500+ 条多厂商 CLI 命令**（含命令字典与模拟器） / **30 道面试真题**
- 内置 CLI 模拟器：前缀联想、历史持久化、快速按钮分组
- 学习进度 / 收藏支持 JSON 导出导入
- 液态玻璃三模式主题（透明 / 毛玻璃 / 高斯），带 Android WebView 降级检测，低端机自动降级 backdrop-filter

### 🛠️ 技术架构
- **Android 壳层**：edge-to-edge WebView + safe-area 注入 + @JavascriptInterface 回退栈桥接 + OnBackPressedCallback 手势返回，纯离线（不申请 INTERNET 权限），release 签名就绪
- **Web 端**：单页 SPA，自研导航栈适配 file:// WebView；SVG/CSS 全部内联，零外部依赖
- **构建链路**：gen-data.js → build.js → assets/index.html 单文件打包，附冒烟测试与 APK 校验脚本
    `
  },
  {
    id: "gameboost",
    title: "GameBoost · 竞技游戏一键优化工具",
    category: "tools",
    categoryName: "实用工具",
    description: "Windows 竞技游戏一键优化：针对 CS2 / 瓦罗兰特 / 三角洲行动，自动调优电源、GPU、网络、CPU 调度与定时器分辨率，压低帧生成时间抖动。硬件自适应，全部可回滚。",
    tags: ["C#", "PowerShell", "Windows", "游戏性能"],
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80",
    demoUrl: "#",
    githubUrl: "https://github.com/7SteveJohn/GameBoost",
    featured: false,
    details: `
### 💡 项目介绍
GameBoost 是一款 Windows 竞技游戏一键自动优化工具，面向 CS2 / Valorant / 三角洲行动等竞技 FPS 场景，核心目标是**压低帧生成时间的抖动**，而不是跑分。

### ✨ 功能特性
- 自动调优电源计划、GPU、网络参数、CPU 调度与定时器分辨率
- 硬件自适应：根据本机配置选择优化项，全部可一键回滚
- 优化前自动备份至 backup/ 目录，运行日志落盘 logs/
- 原生 exe 双击即用（自包含，内嵌自定义图标），config.json 可编辑优化项开关与游戏联动
- 附带 PowerShell 引擎模块与重编译脚本（csc 编译 + 嵌图标）

### 🛠️ 技术细节
C# 源码（GameBoost.cs）+ compile.ps1 自动编译打包；曾修复单实例锁被 .NET GC 回收导致失效的经典坑（局部 Mutex）。
    `
  },
  {
    id: "project-1",
    title: "个人现代化博客与作品集",
    category: "frontend",
    categoryName: "前端开发",
    description: "基于轻量现代化前端技术栈打造的极简个人主页与技术博客，支持暗黑模式、Markdown渲染与零门槛项目管理。",
    tags: ["HTML5", "TailwindCSS", "JavaScript", "Markdown"],
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    demoUrl: "https://7stevejohn.github.io/",
    githubUrl: "https://github.com/7SteveJohn/7SteveJohn.github.io",
    featured: true,
    details: `
### 💡 项目背景与愿景
为了能便捷、优雅地向面试官或技术同行展示自己的前端作品与学习心得，独立设计并开发了该套响应式个人主页与博客系统。

### ✨ 核心特色
1. **纯静态零构建依赖**：双击即可本地运行，亦可一键部署至 GitHub Pages、Vercel。
2. **数据界面解耦**：项目与文章完全通过独立的数据配置文件驱动，新增项目只需复制粘贴配置。
3. **沉浸式阅读与暗色模式**：内置舒适的深色/浅色配色切换，集成 Marked 引擎实现文章排版与高亮。
    `
  }
];
