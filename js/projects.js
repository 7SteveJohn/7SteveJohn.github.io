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
 * - description: 一句话/简短介绍。❗卡片与弹窗都读这一份（改完跑 node scripts/gen-card-copy.js 同步进 index.html）
 * - tags: 技术栈标签数组（如：["Vue 3", "Vite", "Tailwind"]）
 * - image: 项目封面图（可选。不填时自动渲染「渐变+首字母」品牌封面；可填网络链接或 assets/images/ 本地路径）
 * - demoUrl: 在线演示地址（若暂无请填 "#"）
 * - githubUrl: 源码仓库地址（GitHub/Gitee链接，若暂无请填 "#"）
 * - downloadUrl: 下载地址（如蓝奏云网盘链接，若暂无则不填该字段）
 * - downloadPwd: 下载提取码/密码（与 downloadUrl 配套，若无密码则不填）
 * - featured: 是否推荐在醒目位置展示 (true / false)
 * - role: 我在项目里担任的角色（只写当了什么，别强调独立/一个人）
 * - challenge: 技术难点与解法（写清「难在哪 + 怎么解的」，别写成功能介绍）
 * - details: 点击查看详情时的完整介绍（支持 Markdown 或文字排版）
 */

window.PROJECTS_DATA = [
  {
    id: "filebutler",
    title: "FileButler · 本地文件管家",
    category: "desktop",
    categoryName: "桌面应用",
    description: "文件整理和本地知识库问答在同一个应用里完成：AI 跑在本机 Ollama 上，不需要 API Key，文件不上传。支持文件搜索、文档自动索引、按内容查找图片、重复文件清理；每一步有记录，可以撤销。",
    tags: ["Python", "Vue 3", "Ollama", "SQLite / FTS5", "RAG"],
    image: "assets/images/cover-filebutler.webp",
    demoUrl: "https://github.com/7SteveJohn/FileButler/releases",
    githubUrl: "https://github.com/7SteveJohn/FileButler",
    downloadUrl: "https://wwblz.lanzouu.com/iSvda4ahgxfg",
    downloadPwd: "2uk5",
    featured: true,
    role: "开发",
    challenge: "难点是「搜得快」和「撤得回」互相打架：几万份文件要秒级出结果，但整理动作必须能反悔。解法是分两条索引——文件名与长文本走 SQLite FTS5 倒排（毫秒级），语义问答交给 bge-m3 向量库在后台空闲时慢慢建；所有移动都先生成方案、勾选确认后才执行，每一步写事务日志，出错按批次整体回滚。",
    // ↓ 版本/运行环境/校验码：填上即显示在弹窗里，留空自动隐藏
    version: "v1.2.1",
    updated: "2026-10-01",
    requires: "",
    sha256: "",
    details: `
<img src="assets/images/cover-filebutler.webp" alt="FileButler 实机界面" style="width:100%;border-radius:10px;border:1px solid rgba(0,0,0,.08);display:block;">
<p style="font-size:12px;color:#86868b;margin-top:6px;">FileButler 实机主界面；38 秒介绍视频在项目卡片上。</p>

### 💡 这是什么
文件越堆越乱、想找的东西永远翻不出来——FileButler 就是为这个写的。它是一个**全在你自己电脑上跑**的文件管家 + 知识库问答：AI 用本机 Ollama 的免费模型，**不用申请任何 API Key，文件不会离开这台机器**。

### ✨ 能干什么
- **秒搜（只读，不动你的文件）**：启动自动扫描，后台盯着新文件，几秒内就能搜到；支持「ext:pdf」「size:>100mb」「dm:本周」这种语法，长词走全文索引
- **直接问文件**：新文档自动转成向量入库（bge-m3），不用手动整理，问它就行，聊天记录能回看
- **模型接入**：默认本机 Ollama，模型常驻 30 分钟不反复载入，可开「启动时预载 + 常驻不卸载」首问零等待；也支持 LM Studio 一键检测接入
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
    description: "面向初学者的离线网络手册：68 个知识模块、35 个排障案例、58 条多厂商命令对照、431 条 CLI 命令、53 道面试真题。配合教材与实验使用，不能只靠它学会网络。未申请网络权限，没信号也能翻。",
    tags: ["Android", "WebView", "Gradle 8.9", "单页 SPA", "离线应用"],
    image: "assets/images/cover-netops.webp",
    demoUrl: "https://github.com/7SteveJohn/netops-handbook/releases",
    githubUrl: "https://github.com/7SteveJohn/netops-handbook",
    downloadUrl: "https://wwblz.lanzouu.com/iSxU64ah31kb",
    downloadPwd: "5d7u",
    featured: true,
    role: "开发",
    challenge: "难点是「断网也要能翻」这条硬约束把所有常规方案都否掉了：CDN、在线搜索、远端更新全不能用。解法是把全部模块编译进单个 HTML 文件随包带走，导航栈自己写（file:// 下浏览器 history 行为不可靠），图形样式全部内联；Android 端索性不申明 INTERNET 权限，从系统层面断掉联网可能，而不是靠自觉。",
    // ↓ 版本/运行环境/校验码：填上即显示在弹窗里，留空自动隐藏
    version: "v2.0.5",
    updated: "2026-09-30",
    requires: "",
    sha256: "",
    details: `
<img src="assets/images/cover-netops.webp" alt="NetOps 2.0 实机界面" style="width:100%;border-radius:10px;border:1px solid rgba(0,0,0,.08);display:block;">
<p style="font-size:12px;color:#86868b;margin-top:6px;">NetOps 2.0 实机界面；38 秒介绍视频在项目卡片上。</p>

### 💡 这是什么
NetOps 是一本**能装进口袋的离线网络小册子**。断网、没信号、蹲在机房角落都翻得开——它未申请网络权限。

**它的定位是辅助工具，不是一门能独立走完的课**：得配合教材、网课和真机实验一起用——课前翻一遍混个脸熟，课上忘了解释随手查，面试前拿出来突击。只指望翻它就把网络学明白，不现实。

### ✨ 里面有什么
- **68 个知识模块 / 35 个排障案例 / 58 条多厂商命令对照 / 431 条 CLI 命令 / 53 道面试真题**
- **学习路线图**：从打地基到云原生与 SRE 分五个阶段，每个阶段写明这一程要达成什么，点进阶段就是对应的知识模块
- **排障字典**：每个故障按「现象 → 根因 → 命令 → 验证」四步展开，点开卡片就是一条完整链路
- **命令字典**：同一条命令把华为、Cisco、中兴、Linux 四个平台并排摆出来对照
- **面试题库**：高频真题带参考答案和 STAR 话术；另有模拟测验（随机抽题、自动判分）和错题本
- **速查表、术语词典**：面试前十分钟能把关键命令过一遍；网络与云原生的黑话也随手可查
- **CLI 模拟器**：离线沙盒，可以直接敲命令，有前缀联想和历史记录
- 学习进度、收藏、错题都能导出成 JSON，换手机不丢
- 14 张内置壁纸，另有三档毛玻璃（液态玻璃 / 标准毛玻璃 / 高斯模糊）；换壁纸后浮层的不透明度下限会按新壁纸的亮度重算，不必手动调，低端机自动降级

### 🛠️ 怎么做的
- **Android 壳层**：WebView 全屏 + 安全区适配 + 返回手势桥接，纯离线（不申请 INTERNET 权限）
- **内容端**：单文件网页，导航栈是自己写的（为了能用 file:// 直接打开），图形样式全部内联，零外部依赖
- **打包**：gen-data.js → build.js → 一个 index.html 文件，附冒烟测试和 APK 校验脚本
  `
  },
  {
    id: "gameboost",
    title: "GameBoost · 打游戏前点一下",
    category: "desktop",
    categoryName: "桌面应用",
    description: "在启动 CS2、Valorant、三角洲行动前运行一次：电源、GPU、CPU 调度、网络、定时器分辨率自动调好，解决对枪瞬间的掉帧与输入延迟，改动可一键还原。",
    tags: ["C#", "PowerShell", "Windows", "游戏性能"],
    image: "assets/images/cover-gameboost.webp",
    demoUrl: "https://github.com/7SteveJohn/GameBoost/releases",
    githubUrl: "https://github.com/7SteveJohn/GameBoost",
    downloadUrl: "https://wwblz.lanzouu.com/i1XLQ47ddyhe",
    downloadPwd: "8uz7",
    featured: false,
    role: "开发",
    challenge: "难点不是「能不能改」，是「改错了怎么救回来」——电源计划、定时器分辨率、注册表这些动错了系统就废。解法是执行前统一导出备份快照（backup/），每一项都能单独关、整体一键还原。踩过的坑：单实例锁用的是局部 Mutex，被 .NET 垃圾回收后锁失效，能同时开好几个窗口，改成静态持有后修掉。",
    // ↓ 版本/运行环境/校验码：填上即显示在弹窗里，留空自动隐藏
    version: "v1.0.5",
    updated: "2026-09-03",
    requires: "",
    sha256: "",
    details: `
### 💡 这是什么
打 CS2、Valorant、三角洲这类游戏，最烦的不是平均帧数低，是**对枪那一下突然卡一下**。GameBoost 就是冲着这个做的——开打前点一下，把该调的都调好。跑分多少不重要。

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
    description: "给 RTX 20/30 系开启 DLSS 帧生成（该功能官方只提供给 40/50 系）：游戏库扫描、DX12 模式启动、运行诊断，改动可一键还原。分享版只含帧生成，不含系统优化。",
    tags: ["C#", "WinForms", "DLSS 帧生成", "游戏库管理", "Inno Setup"],
    image: "assets/images/cover-dlssg.webp",
    downloadUrl: "https://pan.baidu.com/s/1johUjnwCEfmjpwuz66tqyA?pwd=rw94",
    downloadPwd: "rw94",
    featured: false,
    role: "开发",
    challenge: "难点是「注入完没法判断到底生效没有」：DLL 被加载进进程，不等于被调用。解法是不再靠猜——用日志文件加目标进程已加载模块列表双证据判定代理是否真激活；没激活就自动换下一个入口 DLL 重试（《赛博朋克 2077》对 version.dll 只加载不调用，换 winmm.dll 后才真正生效）。",
    version: "v1.0.0",
    updated: "2026-09-20",
    requires: "Windows 10/11 · NVIDIA RTX 20/30 系（40 系以上原生支持，无需本工具）",
    details: `
### 💡 这是什么
一个帧生成管理工具的分享版（v1.0.0）：给 **RTX 20/30 系**显卡接上 **NVIDIA 官方只开放给 40/50 系的 DLSS 帧生成**（基于开源项目 dlssg_for_sm86 的 DLL 代理方案）。40 系及以上显卡系统原生就有，不用装。

这是我自用的工具，整理出一份分享版，没往 GitHub 放，用得上的朋友直接网盘拿。

### 🎮 帧生成（给 20/30 系）
- 扫描全平台游戏（Steam / 本地目录都能收进游戏库），标出每款是否带 DLSS-FG / FSR3 组件
- 右键「DX12 模式启动」再进游戏，画面设置里就会出现「超分辨率 / 帧生成」开关
- 插件包配套：通用代理、签名版 0.3.x、绝区零专用 XeSS 包，出新版替换同名文件即可
- 「运行诊断」用日志 + 进程模块双证据，直接告诉你代理有没有真的激活
- 「显卡名伪装」能改掉整机看到的显卡型号，一键还原
- 实测记录：《赛博朋克 2077》(2.31) 120 → 280 帧

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
    id: "paian",
    title: "拍案 · 网文创作工作台",
    category: "desktop",
    categoryName: "桌面应用",
    description: "给网文作者的纯本地工作台：AI 按细纲逐章出稿、批量写整卷，草稿采纳才进正文；场景重排、伏笔追踪、出场记忆、牵线关系图。数据全部留在自己电脑上，断网也能写。",
    tags: ["Electron", "TypeScript", "CodeMirror 6", "纯本地"],
    image: "assets/images/cover-paian.webp",
    demoUrl: "https://github.com/7SteveJohn/PaiAn/releases",
    githubUrl: "https://github.com/7SteveJohn/PaiAn",
    downloadUrl: "https://pan.baidu.com/s/1bDLB4CS2y2WuAvAo7aESZQ?pwd=cx6g",
    downloadPwd: "cx6g",
    featured: false,
    role: "开发",
    challenge: "难点是「纯本地」三个字把常规方案砍掉一半：数据不出电脑，AI 出的稿只落「待审草稿」、采纳才动正文且原稿先存快照，信任问题用流程而不是承诺解决。场景重排的切块与拼回做成纯函数，断言钉着「拼回去与原稿逐字节相等」——CRLF、段间空行、章末空行都不被规整，重排全章字节数不变；设定一致性检查只算叙述、只认唯一归属，台词里的境界词一律不计，挡掉几处误报也如实报出来。",
    // ↓ 版本/运行环境/校验码：填上即显示在弹窗里，留空自动隐藏
    version: "v1.0.2",
    updated: "2026-10-01",
    requires: "Windows 10/11（安装版免装 Node.js）",
    sha256: "",
    details: `
<img src="assets/images/cover-paian.webp" alt="拍案 写作页实机" style="width:100%;border-radius:10px;border:1px solid rgba(0,0,0,.08);display:block;">
<p style="font-size:12px;color:#86868b;margin-top:6px;">拍案写作页：章节列表、正文编辑与右侧素材抽屉；38 秒介绍视频在项目卡片上。</p>

### 💡 这是什么
给网文作者的**纯本地**创作工作台：数据全部保存在自己电脑上，不上传任何服务器，断网也能写。AI 按你的细纲出稿——草稿只落「待审草稿」，**采纳才进正文**，原正文先存快照，AI 永远不会背着你改稿；接本地 Ollama 零成本，或 DeepSeek / 智谱 / Kimi 等 OpenAI 兼容 API（Key 只存本机）。

### ✨ 能干什么
- **写作页**：CodeMirror 6 编辑器（Obsidian 同款内核）、自动保存、实时字数与目标进度、专注模式、Markdown 一键预览
- **AI 工坊**：写一段 / 本章草稿 / 写本卷 / 写全书，每章字数 300–5000 自定义（默认 2000）；要点太薄的章先提醒再生成（内容门禁），批量出稿实时显示进度
- **出场记忆**：采纳章节后自动抽取出场人物 / 物品 / 事件写进人物卡与设定卡，幻觉角色一键清洗
- **分卷**：书 → 卷 → 章三级结构，导入大纲自动识别卷标、建卷建章；整卷重命名，改中间某章的卷即拆卷，导出自动插入卷标题
- **场景板**：本章按空行切成场景卡片，拖动重排或整块搬去下一章；拼回去与原稿逐字节相等，跨章挪动可整步退回
- **正文标记**：选中即标 伏笔 / 彩蛋 / 人物 / 场景 / 碎片，不污染原文，导出自动清除
- **素材抽屉**：伏笔追踪（按挂的章数计息）、碎片箱、人物卡、设定卡、分支沙盘、本地词库取名面板（不联网）
- **牵线**：章、人物、伏笔摆成节点牵出因果，一键牵线、断线诊断，「演一遍」沿推动线逐拍放
- **复盘**：节奏琴键（句长 / 对白占比）、对白天平、伏笔利息、AI 味自检（10 条模板句式，命中画虚线不改原文）、设定守夜人（境界回退 / 称谓易串 / 远场沉默）
- **抗拖延**：冻结修改（只能向下续写）、断点记忆（下次进站直接回到现场）
- **导入与迁移**：TXT / 大纲 / docx 导入（自动识别卷标、按章名分发进各章剧情要点，可撤销）；导出 md / txt / 分卷 / docx / epub（Windows 换行可直接投稿）；每日自动备份（保留 7 天）、数据文件夹一键迁移，支持 Obsidian 库双向同步

### 🛠️ 怎么做的
Electron + Vite + TypeScript，数据存本机文件夹（卸载不删稿子）；NSIS 安装包与免安装便携版，都不需要装 Node.js。场景重排、AI 味自检、设定守夜人是确定性实现，不调模型、零 token；UI 冒烟与 API / 提示词缓存等测试脚本齐备。
  `
  },
  {
    id: "fluxion",
    title: "Fluxion · 完整版性能套件",
    category: "desktop",
    categoryName: "桌面应用",
    description: "GameBoost（系统优化）与 DLSSG-Tool（帧生成）合并重构的完整版：51 项体检一键优化、DLSS 帧生成、游戏库、进游戏自动切状态、实时监控，改动可一键还原。分享版见 GameBoost-DLSSG 卡。",
    tags: ["C#", "WinForms", "51 项体检", "DLSS 帧生成", "游戏联动", "实时监控"],
    image: "assets/images/cover-fluxion.webp",
    githubUrl: "https://github.com/7SteveJohn/Fluxion",
    featured: true,
    role: "开发",
    challenge: "两件事最难：一是 51 项系统改动要「真的生效」且能一键还原，二是 20/30 系帧生成代理经常「加载了但没激活」。解法分别是：每项执行前先备份并把状态分成已生效 / 未生效 / 待确认 / 需处理四档，HPET 强制、MSI 强制转换这类改错会丢设备的项只核验不给旋钮；代理是否激活用日志 + 进程模块双证据判定，失败自动换入口 DLL 重试。",
    version: "v1.1.0",
    updated: "2026-09-30",
    requires: "Windows 10/11 · NVIDIA RTX 20 系及以上（帧生成功能）",
    details: `
<img src="assets/images/cover-fluxion.webp" alt="Fluxion 实机界面" style="width:100%;border-radius:10px;border:1px solid rgba(0,0,0,.08);display:block;">
<p style="font-size:12px;color:#86868b;margin-top:6px;">Fluxion 实机主界面；38 秒介绍视频在项目卡片上。</p>

### 💡 这是什么
GameBoost（系统优化）和 DLSSG-Tool（帧生成）合并重构的完整版，七个页面——仪表盘、性能优化、帧生成、游戏库、实时监控、说明、设置。一句话：**一键把系统调到适合游戏的状态，并给 RTX 20/30 系接上 NVIDIA 官方只给 40/50 系的 DLSS 帧生成。**

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
- **方案 B（代理模式）**：接管游戏的 nvngx_dlssg.dll 加载，跑真 DLSS 多帧生成（2X-6X）；架构 Router（SM86 / SM75）、内核类型（PTX / Cubin）、光流精度、最大生成帧、日志级别全部可调
- **方案 A（OptiScaler 注入）**：把本机显卡伪装成 RTX 5090 让游戏菜单亮出「DLSS 帧生成」，插帧交给 Intel XeSS-FG 引擎或原生 DLSSG——与方案 B 互斥二选一
- **反作弊游戏自动改用 d3d12 / dxgi 入口**：绝区零 / 鸣潮这类按文件名拦 version.dll 的反作弊，拦不住 DX12 游戏必加载的系统库
- **运行诊断**：日志 + 进程模块双证据，直接告诉你代理有没有真激活；遗留代理停放、入口巡检、备份与回收（送回收站，最新一份永久保留）
- **实测**：《赛博朋克 2077》120 → 280 帧；鸣潮实测 6X（30 系）

### 🎯 游戏库
- 全平台扫描：Steam、启动器自定义路径、注册表卸载项、引擎目录结构特征
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
完整版要动电源、注册表、网卡这些系统设置，风险面比分享版大——源码放在 GitHub 上，安装包暂不对外分发。想用帧生成功能，用 **GameBoost-DLSSG 分享版**（单独一张卡）就行，同一套方案。
  `
  }
];
