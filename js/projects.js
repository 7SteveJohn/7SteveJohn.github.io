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
    id: "project-1",
    title: "个人现代化博客与作品集",
    category: "frontend",
    categoryName: "前端开发",
    description: "基于轻量现代化前端技术栈打造的极简个人主页与技术博客，支持暗黑模式、Markdown渲染与零门槛项目管理。",
    tags: ["HTML5", "TailwindCSS", "JavaScript", "Markdown"],
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    demoUrl: "#",
    githubUrl: "https://github.com/7SteveJohn",
    featured: true,
    details: `
### 💡 项目背景与愿景
为了能便捷、优雅地向面试官或技术同行展示自己的前端作品与学习心得，独立设计并开发了该套响应式个人主页与博客系统。

### ✨ 核心特色
1. **纯静态零构建依赖**：双击即可本地运行，亦可一键部署至 GitHub Pages、Vercel。
2. **数据界面解耦**：项目与文章完全通过独立的数据配置文件驱动，新增项目只需复制粘贴配置。
3. **沉浸式阅读与暗色模式**：内置舒适的深色/浅色配色切换，集成 Marked 引擎实现文章排版与高亮。
    `
  },
  {
    id: "project-2",
    title: "响应式电商商城原型系统",
    category: "frontend",
    categoryName: "前端开发",
    description: "移动端与桌面端自适应的在线商城前端界面，包含商品列表检索、购物车飞入动效与结算流程模拟。",
    tags: ["JavaScript", "CSS3 Flex/Grid", "LocalStorage", "响应式"],
    image: "https://images.unsplash.com/photo-1557821552-17105176677c?auto=format&fit=crop&w=800&q=80",
    demoUrl: "#",
    githubUrl: "https://github.com/7SteveJohn",
    featured: true,
    details: `
### 🛒 项目介绍
模拟真实电商平台的购物闭环，强化了对前端状态管理（本地存储 LocalStorage 模拟购物车数据持久化）与动效细节的把控。
    `
  },
  {
    id: "project-3",
    title: "全栈即时任务看板 (Kanban)",
    category: "fullstack",
    categoryName: "全栈开发",
    description: "支持卡片拖拽流转（Drag & Drop）、阶段分类与实时持久化的敏捷看板，专为个人日程与敏捷开发打造。",
    tags: ["Node.js", "Express", "SQLite", "Drag&Drop API"],
    image: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?auto=format&fit=crop&w=800&q=80",
    demoUrl: "#",
    githubUrl: "https://github.com/7SteveJohn",
    featured: false,
    details: `
### 📋 功能清单
- 支持任务多泳道（待办、进行中、已完成）自由拖拽流转。
- 任务可设定截止时间与优先级标签，支持按关键字极速检索。
    `
  },
  {
    id: "project-4",
    title: "代码轻量格式化与转码小工具",
    category: "tools",
    categoryName: "实用工具",
    description: "纯前端离线运行的开发者多功能工具箱：支持 JSON 美化/压缩、Base64 编解码、颜色格式互转等。",
    tags: ["HTML5", "原生JS", "Web API", "效率工具"],
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
    demoUrl: "#",
    githubUrl: "https://github.com/7SteveJohn",
    featured: false,
    details: `
### 🛠️ 纯前端安全免上传
所有数据转换与格式化均在本地浏览器内存中完成，无服务器隐私泄露风险。
    `
  }
];
