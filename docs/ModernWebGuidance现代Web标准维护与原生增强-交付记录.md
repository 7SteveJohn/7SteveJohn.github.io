# Modern Web Guidance 现代 Web 标准维护与原生特性增强 — 交付记录

> **交付日期**：2026-11-18  
> **参考标准库**：Google Chrome / Edge / Firefox / MDN `modern-web-guidance`  
> **核心原则**：**100% 不影响任何现有业务功能与回归断言**（3D 声学谐振场、WebAudio 节拍联动、视频/音乐互斥、7steve Live2D 看板娘、札签拆包抽卡与离线 SW 缓存均原样保留），在此基础上完成标准一致性维护、渲染性能减负与三项现代浏览器原生「黑科技」渐进增强。

---

## 一、 稳定性与现代标准维护（`legacy-scan` 检出项治理）

1. **明暗主题 `color-scheme` 原生控件同步与跨标签页实时联动（`dark-mode-toggle`）**
   - 在 `index.html`、`cards.html`、`archive.html`、`gallery.html`、`404.html` 头部内联防闪烁脚本前统一声明 `<meta name="color-scheme" content="light dark" />`，并在首屏同步写入当前解析态（`dark` / `light`），同时修复了 `404.html` 早先硬编码恒深色与未加 `sj.` 存储键前缀的历史遗留问题。
   - 在 `css/style.css` 与 `css/cards.css` 中保持 `:root { color-scheme: light dark; }` 基础声明，通过 `:has(> head > meta[name="color-scheme"][content="..."])` 与 `.dark` 映射原生配色方案，使 `<video>` 原生控制栏、滑块、选中态与系统级滚动条彻底告别暗色模式下的白底闪烁。
   - 在 `js/app.js`、`js/subpage.js`、`js/cards.js` 中补齐 `window.addEventListener('storage', ...)` 监听，在任一标签页切换明暗主题时，已打开的其他站内标签页实时无感同步。
2. **W3C 标准滚动条与 `@supports` 渐进回退（`customize-scrollbar-color-and-thickness`）**
   - 在 `css/style.css` 中声明符合 WCAG 1.4.11（对比度 ≥ 3:1）的 `--scrollbar-thumb` / `--scrollbar-track` 变量，启用标准 `scrollbar-width: thin` 与 `scrollbar-color`（覆盖 Firefox、Chrome 121+、Safari 26.2+）。
   - 将旧有 `::-webkit-scrollbar` 私有伪元素收拢至 `@supports not (scrollbar-color: auto)` 回退块内，并重置 `scrollbar-width: auto` 避免旧内核下样式互斥失效。
3. **无副作用数组操作、安全 DOM 清空与现代异步原语（`js`）**
   - 将 `js/player.js`、`js/cards.js`、`js/companion-avatar.js` 中共 11 处 `el.innerHTML = ''` 统一替换为 `el.replaceChildren()`，避免无谓唤醒 HTML 解析器并兼容严格 Trusted Types CSP。
   - 将 `js/app.js`、`js/archive.js`、`js/cards.js`、`js/player.js`、`js/tab-nav.js`、`js/cosmos/audio/BeatDetector.js` 中共 9 处 `arr.slice().sort(...)` / `[...arr].sort(...)` 升级为原生 `.toSorted(...)`。
   - 将 `js/app.js` `initScrollSpy()` 中的导航锚点分组升级为 `Object.groupBy()`（配合 `?? []` 读取无原型字典），将 `js/wallpaper.js` 档位 Promise 升级为 `Promise.withResolvers()`。

---

## 二、 渲染与网络性能减负

1. **首屏以下介绍视频延迟加载（`lazy-load-video-and-audio`）**
   - 为 `index.html` `#products` 区全部 5 个产品介绍 `<video>` 补齐显式整数宽高 `width="1920" height="1080"` 与 `loading="lazy"`（配合原有 `preload="none"`），在支持媒体懒加载的现代内核中延迟首屏外高清海报图的并发抢占，同时锁定 `16:9` 固有几何尺寸杜绝 CLS 布局偏移。
2. **首屏外重度列表延迟布局与绘制（`defer-rendering-heavy-content`）**
   - 对 `#articles-list > article`（21 张文章卡片）与札签总目录 `.cards-scope .cat-group` 启用 `content-visibility: auto` 并配对 `contain-intrinsic-size: auto none auto ...`，跳过视口外 DOM 子树的初始布局与绘制开销，且完全保留滚动条高度稳定与键盘焦点可达性。

---

## 三、 新增三项原生 Web 平台特色功能（100% 渐进增强）

1. **`⌘K` 搜索词「零 DOM 侵入」正文高亮与词间巡航（`highlight-text-ranges` — CSS Custom Highlight API）**
   - **体验**：在 `⌘K` 搜索面板输入关键词（如 `显存`、`ollama`、`bge-m3`）并回车打开任意手记或项目详情（或访问带 `?post=<id>&hl=<词>` 的深链）时，阅读器会直接在正文内高亮全部命中词、自动平滑滚至首处命中位置，并在弹窗顶栏浮现紧凑的 `命中 1/N [↑] [↓] [×]` 巡航胶囊（同时支持 `F3` / `Shift+F3` 快捷键切换、关闭弹窗自动清理）。
   - **技术亮点**：全程基于 `TreeWalker` + `Range` + `CSS.highlights` + `::highlight()` 伪元素绘制，**不向 `.markdown-body` 插入任何 `<mark>` 节点**，零破坏代码块一键复制按钮、语法高亮与章节目录锚点。
2. **悬停预测预渲染「秒开」+ 全站跨文档/同文档丝滑转场（`improve-next-page-load-performance` + `cross-document-transitions` + `same-document-transitions`）**
   - **Speculation Rules API**：在 `index.html`、`cards.html`、`archive.html`、`gallery.html` 注入 `<script type="speculationrules">` 文档规则（排除外链、下载直链与大体积媒体路径），当指针悬停在顶栏/底栏的「札签」「归档」「照片墙」「首页」链接上约 200ms（`eagerness: "moderate"`）即在后台预取/预渲染目标页，点击瞬间切换。
   - **View Transitions**：启用 `@view-transition { navigation: auto; }` 跨页面平滑过渡，并为首页 `#blog`「札签卷宗 ⇄ 文章列表」切换接入 `document.startViewTransition()` 同文档过渡与无障碍焦点保持（开启系统「减少动态效果」时自动关闭全部过渡动画）。
3. **折叠列表原生 `Ctrl+F` 穿透唤醒（`search-hidden-content` — `hidden="until-found"` + `beforematch`）**
   - **痛点解决**：首页 `#blog` 默认处于「札签卷宗（卡包架）」视图时，原先 `#articles-list` 使用普通 `hidden`（`display: none`），导致访客在首页按浏览器原生 `Ctrl+F` 搜索文章标题或摘要关键词时无法搜到收起状态下的 21 篇文章。
   - **原生唤醒**：现升级为 `hidden="until-found"` 并监听 `beforematch` 事件（同时在 `css/cards.css` 放行 `:not([hidden="until-found"])`）。访客在首页任意位置按 `Ctrl+F` 输入任意文章内的字词，浏览器会自动触发切换至「文章列表」视图、同步按钮 `aria-pressed` 状态并精准滚至命中卡片（不支持 `onbeforematch` 的旧浏览器自动回退普通 `hidden`）。
