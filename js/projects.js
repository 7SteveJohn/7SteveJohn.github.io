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
  },
  {
    id: "fluxion",
    title: "Fluxion · 完整版性能套件",
    category: "desktop",
    categoryName: "桌面应用",
    description: "我的集大成之作：GameBoost（系统优化）+ DLSSG-Tool（帧生成）合并重构的完整版——51 项体检一键优化、DLSS 帧生成、游戏库、进游戏自动切状态、实时监控，所有改动可一键还原。另有面向外人的分享版（见 GameBoost-DLSSG 卡），只保留了帧生成部分。",
    tags: ["C#", "WinForms", "51 项体检", "DLSS 帧生成", "游戏联动", "实时监控"],
    image: "assets/images/cover-fluxion.webp",
    featured: true,
    version: "v1.6.7",
    updated: "2026-09-21",
    requires: "Windows 10/11 · NVIDIA RTX 20 系及以上（帧生成功能）",
    details: `
<video controls preload="none" poster="assets/images/fluxion-tour-poster.jpg" src="assets/video/fluxion-intro.mp4" style="width:100%;aspect-ratio:16/9;border-radius:10px;background:#000;margin-bottom:6px;"></video>
<p style="font-size:12px;color:#86868b;margin-top:0;">38 秒介绍片：一镜一件事，讲清它替你做掉哪些活。</p>

### 💡 这是什么
继 FileButler 之后我的集大成之作：GameBoost（系统优化）和 DLSSG-Tool（帧生成）合并重构的完整版，七个页面——仪表盘、性能优化、帧生成、游戏库、实时监控、说明、设置。一句话：**一键把系统调到适合游戏的状态，并给 RTX 20/30 系接上 NVIDIA 官方只给 40/50 系的 DLSS 帧生成。**

### 📊 仪表盘
- 游戏联动状态（远程状态 / 联动 / 场景）+ 实时负载瓦片：CPU / 内存 / GPU / GPU 温度
- 快捷操作：一键优化、系统体检、恢复备份
- 帧生成运行时一览：运行时是否就绪、HAGS 状态、已注入方案数、最近一次接入结果

### ⚡ 性能优化（51 项体检，全部真实生效，可一键还原）
- **电源**：卓越性能计划、处理器 100%、关 USB 选择性暂停 / PCIe ASPM / 睡眠休眠硬盘超时；游戏期联动切档（进游戏切、退出还原，办公零影响）
- **调度**：Win32PrioritySeparation=38（短量子 + 前台增强）、混合架构异类线程调度策略（Intel Thread Director 官方做法，替代硬绑 P 核）
- **GPU**：关 GameDVR、游戏模式、HAGS 开关；NVAPI 驱动配置自动化（竞技档 / 3A 档双档，等价 NVIDIA 面板手动设置）
- **网络**：关 Nagle、关流量节流、SystemResponsiveness=10、网卡节能全关
- **内存 / 服务 / 输入**：内核不换页（DisablePagingExecutive）、SysMain 禁用、关鼠标加速
- **后台 / 定时器 / 桌面**：游戏加速包（挂起后台进程 + 内存整理 + 暂停更新下载，退出完整恢复）、游戏期 0.5ms 定时器（仅 FPS 档）、DWM 特效精简
- **监控**：nvlddmkm 崩溃取证、C 盘守护、网络哨兵、NVIDIA 覆盖层规避
- **取值细调**：体检表 19 行可双击细调——着色器缓存 12 档、DLSS 模型覆盖 / 强制预设、预渲染帧数、HAGS、量子长度等 18 个可调项，默认值 = 改造前行为；状态分四档徽章（已生效 / 未生效 / 待确认 / 需处理）
- **安全底线**：HPET 强制、GPU 中断绑核、MSI 强制转换、rBAR 全局强开这类改错会丢设备的项**只读核验、不给旋钮**；所有修改执行前自动备份

### 🎮 帧生成（DLSS MFG 0.3.5 · 代理模式，给 RTX 20/30 系）
- **方案 B（代理模式）**：接管游戏的 nvngx_dlssg.dll 加载，跑真 DLSS 多帧生成（2X-6X，AI 模型仍是 NVIDIA 原厂）；架构 Router（SM86 / SM75）、内核类型（PTX / Cubin）、光流精度、最大生成帧、日志级别全部可调
- **方案 A（OptiScaler 注入）**：把本机显卡伪装成 RTX 5090 让游戏菜单亮出「DLSS 帧生成」，插帧交给 Intel XeSS-FG 引擎或原生 DLSSG——与方案 B 互斥二选一
- **反作弊游戏自动改用 d3d12 / dxgi 入口**：绝区零 / 鸣潮这类按文件名拦 version.dll 的反作弊，拦不住 DX12 游戏必加载的系统库
- **运行诊断**：日志 + 进程模块双证据，直接告诉你代理有没有真激活；遗留代理停放、入口巡检、备份与回收（送回收站，最新一份永久保留）
- **实测**：《赛博朋克 2077》135 → 190 帧；鸣潮实测 6X（30 系）

### 🎯 游戏库
- 全平台扫描：Steam、启动器自定义路径、注册表卸载项、引擎目录结构特征（本机扫到 17 款）
- 封面墙 + 搜索 + 收藏 + 最近游玩；右键管理：启动（支持 DX12 模式）/ 打开目录 / 收藏 / 重命名 / 私密 / 隐藏 / 移除
- 自定义添加游戏、批量获取封面；被忽略清单挡住的目录灰显可见、一键恢复收录

### 📈 实时监控
- CPU / GPU / 内存实时曲线（最近 90 个采样）+ 与数据目录同步的运行日志

### 🎛️ 设置与其他
- **场景联动**：进游戏按档位自动切状态（临时电源 / 加速包 / 远控暂停），退出完整还原；竞技网游（CS2 / 无罪契约 / 三角洲）才停远控，二游与 3A 不动你的远控
- **界面**：浅色 / 深色主题、界面动画开关，Windows 11 下窗口圆角、标题栏随主题深浅
- **开机自启**：走提权计划任务，登录不弹 UAC；托盘、硬件告警、漂移检测
- **便携版 / 安装版**同一个 exe 运行时自动判断，升级保留你的配置

### 说明
完整版要动电源、注册表、网卡这些系统设置，风险面比分享版大，我还没整理成能放心发给别人的形态——暂不公开下载。想用帧生成功能，用 **GameBoost-DLSSG 分享版**（单独一张卡）就行，同一套方案。
  `
  }
];
