/**
 * 个人项目数据配置 (projects.js)
 * ----------------------------------------------------
 * 💡 如何添加你的新项目？
 * 复制下方任意一个对象结构，粘贴到数组最前面即可！
 * 
 * 字段说明：
 * - id: 唯一标识（数字或英文简写）
 * - title: 项目名称
 * - category: 分类标识 (all | desktop | android)
 * - categoryName: 分类显示名称（如：桌面应用、Android 应用）
 * - description: 一句话/简短介绍项目亮点与功能
 * - tags: 技术栈标签数组（如：["Vue 3", "Vite", "Tailwind"]）
 * - image: 项目封面图（可选。不填时自动渲染「渐变+首字母」品牌封面；可填网络链接或 assets/images/ 本地路径）
 * - demoUrl: 在线演示地址（若暂无请填 "#"）
 * - githubUrl: 源码仓库地址（GitHub/Gitee链接，若暂无请填 "#"）
 * - downloadUrl: 下载地址（如蓝奏云网盘链接，若暂无则不填该字段）
 * - downloadPwd: 下载提取码/密码（与 downloadUrl 配套，若无密码则不填）
 * - featured: 是否推荐在醒目位置展示 (true / false)
 * - details: 点击查看详情时的完整介绍（支持 Markdown 或文字排版）
 */

window.PROJECTS_DATA = [
  {
    id: "filebutler",
    title: "FileButler · 本地文件管家",
    category: "desktop",
    categoryName: "桌面应用",
    description: "文件乱成一团？这个帮你收拾。文件整理 + 直接问文件，都在你自己电脑上跑：AI 用本机 Ollama 免费模型，不用 API Key；秒搜、图片语义搜索、重复文件清理，每一步都能撤销，数据不出本机。",
    tags: ["Python", "Vue 3", "Ollama", "SQLite / FTS5", "RAG"],
    image: "assets/images/cover-filebutler.webp",
    demoUrl: "https://github.com/7SteveJohn/FileButler/releases",
    githubUrl: "https://github.com/7SteveJohn/FileButler",
    downloadUrl: "https://wwblz.lanzouu.com/irw4346nqpfa",
    downloadPwd: "95ak",
    featured: true,
    // ↓ 版本/运行环境/校验码：填上即显示在弹窗里，留空自动隐藏
    version: "",
    updated: "",
    requires: "",
    sha256: "",
    details: `
### 💡 这是什么
文件越堆越乱、想找的东西永远翻不出来——FileButler 就是为这个写的。它是一个**全在你自己电脑上跑**的文件管家 + 知识库问答：AI 用本机 Ollama 的免费模型，**不用申请任何 API Key，文件不会离开这台机器**。

### ✨ 能干什么
- **秒搜（只读，不动你的文件）**：启动自动扫描，后台盯着新文件，几秒内就能搜到；支持「ext:pdf」「size:>100mb」「dm:本周」这种语法，长词走全文索引
- **直接问文件**：新文档自动转成向量入库（bge-m3），不用手动整理，问它就行，聊天记录能回看
- **图片也能搜**：模型给图写描述、把图里的字抄出来，搜「日落」找照片、搜发票号找截图
- **批量整理**：规则 + 本地模型先分类 → 给你预览 → 你勾选确认 → 才移动，**不会擅自挪动任何文件**，每一步都能撤销，方案还能存成模板
- **找重复文件**：三级哈希查重 → 按规则保留 → 挪进「待清理」文件夹（只挪不删，随时撤销）
- 另外还有：每周文件报告、数据库自动备份、开机自启、托盘常驻、深色模式

### 🛠️ 怎么做的
- 后端：Python（SQLite 向量检索、watchdog 实时监控、缩略图服务只认 127.0.0.1、RAG 管线）
- 前端：Vue 3 + Naive UI，Vite 打成单文件塞进 pywebview
- 保险设计：移动前必须「预览 → 勾选确认」，每步写日志、按批次撤销；Ollama 没开时自动退回规则整理 + 关键词搜索
  `
  },
  {
    id: "netops-handbook",
    title: "NetOps Handbook · 给小白的离线网络手册",
    category: "android",
    categoryName: "Android 应用",
    description: "一本装在手机里的离线网络手册：58 个知识模块、25 个排障案例、500+ 条命令速查、30 道面试真题。做给想学网络的新手看，零联网权限，没信号也能翻。",
    tags: ["Android", "WebView", "Gradle 8.9", "单页 SPA", "离线应用"],
    image: "assets/images/cover-netops.webp",
    demoUrl: "https://github.com/7SteveJohn/netops-handbook/releases",
    githubUrl: "https://github.com/7SteveJohn/netops-handbook",
    downloadUrl: "https://wwblz.lanzouu.com/iTcqo46ntzy",
    downloadPwd: "9uma",
    featured: true,
    // ↓ 版本/运行环境/校验码：填上即显示在弹窗里，留空自动隐藏
    version: "",
    updated: "",
    requires: "",
    sha256: "",
    details: `
### 💡 这是什么
NetOps 是一本**能装进口袋的离线网络小册子**。断网、没信号、蹲在机房角落都翻得开——它压根不申请联网权限。

给想学网络但不知道从哪下手的人做的：不用先啃完一本教材，翻开就能查。

### ✨ 里面有什么
- **58 个知识模块** / **25 个排障案例** / **500+ 条命令速查**（带字典和模拟器） / **30 道面试真题**
- 命令看不懂？内置模拟器可以直接敲，有前缀联想和历史记录
- 学习进度和收藏能导出成 JSON，换手机不丢
- 三种毛玻璃主题（透明 / 毛玻璃 / 高斯），低端机会自动降级

### 🛠️ 怎么做的
- **Android 壳层**：WebView 全屏 + 安全区适配 + 返回手势桥接，纯离线（不申请 INTERNET 权限），release 签名已就绪
- **内容端**：单文件网页，导航栈是自己写的（为了能用 file:// 直接打开），图形样式全部内联，零外部依赖
- **打包**：gen-data.js → build.js → 一个 index.html 文件，附冒烟测试和 APK 校验脚本
  `
  },
  {
    id: "gameboost",
    title: "GameBoost · 打游戏前点一下",
    category: "desktop",
    categoryName: "桌面应用",
    description: "打 CS2 / 瓦罗兰特 / 三角洲之前点一下，自动把电源、显卡、网络、CPU 调度和定时器分辨率调好，专治对枪那一瞬间的卡顿。按你机器配置来，全部能一键还原。",
    tags: ["C#", "PowerShell", "Windows", "游戏性能"],
    image: "assets/images/cover-gameboost.webp",
    demoUrl: "https://github.com/7SteveJohn/GameBoost/releases",
    githubUrl: "https://github.com/7SteveJohn/GameBoost",
    downloadUrl: "https://wwblz.lanzouu.com/i1XLQ47ddyhe",
    downloadPwd: "8uz7",
    featured: false,
    // ↓ 版本/运行环境/校验码：填上即显示在弹窗里，留空自动隐藏
    version: "",
    updated: "",
    requires: "",
    sha256: "",
    details: `
### 💡 这是什么
打 CS2、瓦罗兰特、三角洲这类游戏，最烦的不是平均帧数低，是**对枪那一下突然卡一下**。GameBoost 就是冲着这个做的——开打前点一下，把该调的都调好。跑分多少不重要。

### ✨ 能干什么
- 自动调电源计划、显卡、网络、CPU 调度和定时器分辨率
- 按你机器的配置挑优化项，不喜欢就一键还原
- 优化前自动备份到 backup/，日志写到 logs/
- 一个 exe 双击就跑，config.json 里能开关每一项，也能跟游戏联动
- 附带 PowerShell 引擎模块和重新编译的脚本

### 🛠️ 怎么做的
C# 写的（GameBoost.cs），compile.ps1 一键编译打包。踩过一个坑：单实例锁被 .NET 回收掉，导致能开好几个（局部 Mutex 的经典问题）。

> 这类工具会动系统底层设置（电源计划、定时器分辨率等），个别杀软可能误报。源码已开源，不放心的可以自己看完再编译。
  `
  },
  {
    id: "gameboost-dlssg",
    title: "GameBoost-DLSSG · DLSS 帧生成",
    category: "desktop",
    categoryName: "桌面应用",
    description: "给 RTX 20/30 系显卡开上官方只给 40/50 系的 DLSS 帧生成：游戏库管理、DX12 模式启动、运行诊断，改动一键还原。",
    tags: ["C#", "WinForms", "DLSS 帧生成", "游戏库管理", "Inno Setup"],
    image: "assets/images/cover-dlssg.webp",
    downloadUrl: "https://pan.baidu.com/s/1johUjnwCEfmjpwuz66tqyA?pwd=rw94",
    downloadPwd: "rw94",
    featured: false,
    version: "v1.0.0",
    updated: "2026-09-20",
    requires: "Windows 10/11 · NVIDIA RTX 20/30 系（40 系以上原生支持，无需本工具）",
    details: `
### 💡 这是什么
一个帧生成管理工具的分享版（v1.0.0）：给 **RTX 20/30 系**显卡接上 **NVIDIA 官方只开放给 40/50 系的 DLSS 帧生成**（基于开源项目 dlssg_for_sm86 的 DLL 代理方案，AI 模型仍是 NVIDIA 原厂）。40 系及以上显卡系统原生就有，不用装。

这是我自用的工具，整理出一份分享版，没往 GitHub 放，用得上的朋友直接网盘拿。

### 🎮 帧生成（给 20/30 系）
- 扫描全平台游戏（Steam / 本地目录都能收进游戏库），标出每款是否带 DLSS-FG / FSR3 组件
- 右键「DX12 模式启动」再进游戏，画面设置里就会出现「超分辨率 / 帧生成」开关
- 插件包配套：通用代理、签名版 0.3.x、绝区零专用 XeSS 包，出新版替换同名文件即可
- 「运行诊断」用日志 + 进程模块双证据，直接告诉你代理有没有真的激活
- 「显卡名伪装」能改掉整机看到的显卡型号，一键还原
- 实测记录：《赛博朋克 2077》(2.31) 135 → 190 帧

### ⚠️ 用前须知
- 帧生成必须开 Windows 的「硬件加速 GPU 调度」（工具会检测提示）；基础帧低于 40 别开，先超分再帧生成；8GB 显存开 2 倍帧约需 320MB（1080p）余量
- 给带反作弊的游戏（绝区零 / 鸣潮这类）注入第三方 DLL 可能封号，风险自负
- 竞技射击（CS2 / 瓦 / 三角洲）别开帧生成——加延迟
- 解压到能写的文件夹再运行（别放 C:\\Program Files），双击允许 UAC

### 🛠️ 怎么做的
原生 C# / WinForms 单文件，便携版双击就能跑，也有安装版；卸载就是删文件夹或走系统卸载，不残留。细节都在程序里的「说明」页。
  `
  }
];
