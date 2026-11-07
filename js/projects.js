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
 * - archived: 历史项目（true 时不上主展示，只出现在产品区底部的「历史项目」里）
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
    description: "不挑配置的智能文件检索管家。发票、扫描件与截屏直接搜图内文字（OCR 穿透）；文档不用打开直接问出处并定位页码；智能整理文件先出方案预览确认后再动，支持全流程无损一键撤销。主流云端 API Key 与本地模型双轨自由接入。",
    tags: ["Python 3", "OCR穿透秒搜", "免开文档问答(RAG)", "方案预览/一键撤销", "云端API/本地双模"],
    image: "assets/images/cover-filebutler.webp",
    demoUrl: "https://github.com/7SteveJohn/FileButler/releases",
    githubUrl: "https://github.com/7SteveJohn/FileButler",
    downloadUrl: "https://wwblz.lanzouu.com/iX5qd4eftu8b",
    downloadPwd: "8s2i",
    featured: true,
    role: "开发",
    challenge: "主要难在既要搜得快，又不能在文件移动时出差错。文件名和长文本走 SQLite FTS5 即时索引，语义向量则交给后台在空闲时慢慢跑；批量整理前必须弹出清单由人工确认，底层记好事务日志，随时能按批次撤销。",
    // ↓ 版本/运行环境/校验码：填上即显示在弹窗里，留空自动隐藏
    version: "v1.4.3",
    updated: "2026-11-03",
    // 更新公告：桌面贴在卡片右上侧（窄屏收成一行）；items 建议 3–4 条，summary 用于窄屏
    announcement: {
      version: "v1.4.3",
      date: "2026-11-03",
      items: ["扫描件 OCR 结构化解析", "预置系统目录排除", "Ollama 一键引导", "设置页说明收进提示"],
      summary: "扫描件 OCR / 系统目录排除"
    },
    // 更新记录：来自 GitHub Releases（7SteveJohn/FileButler），最新在前
    changelog: [
      { v: "v1.4.3", date: "2026-11-03", items: [
        "新增扫描件 OCR：扫描版 PDF 由视觉模型 Xiaomi-OCR-0 解析，表格保行列、公式转 LaTeX、按阅读顺序输出",
        "新装用户预置系统目录排除规则（C:\\Windows、Program Files 等），设置页可增删",
        "Ollama 未安装时提供 winget 一键引导；设置页长段说明收进 ⓘ 提示"
      ]},
      { v: "v1.4.2", date: "2026-10-27", items: [
        "设置页新增「模型目录」：模型可放任意盘，改完重启生效",
        "应用内下载的模型也落在同一目录，不再分裂两处",
        "服务在跑却显示 0 个模型时，可一键切到本机模型目录"
      ]},
      { v: "v1.4.1", date: "2026-10-22", items: [
        "修复文件页搜索框点「×」后，除搜索栏外整片界面消失"
      ]},
      { v: "v1.4.0", date: "2026-10-21", items: [
        "中英双语界面，设置里切换即时生效（700+ 词条）",
        "首屏与大库性能：统计改后台、补排序索引、WAL 自动回收",
        "Ollama 自动启动，退出时连推理子进程一起回收",
        "目录树修盘根误判、限 60 项、加搜索；托盘常驻"
      ]},
      { v: "v1.3.1", date: "2026-10-21", items: [
        "应用内更新：下载进度、SHA-256 校验、重启并安装",
        "支持回退上一版；崩溃日志写到数据目录 logs/app.log",
        "知识库：未索引文件可见、显示剩余时间、可中途取消"
      ]},
      { v: "v1.3.0", date: "2026-10-21", items: [
        "向量 + 关键词混合检索（RRF），可选本地 rerank 精排",
        "追问自动改写；来源带标题与页码；上下文 600→1200 字符",
        "PDF 换 PyMuPDF；标题感知切块；支持 .eml 邮件",
        "拼音 / 首字母搜索、EXIF 拍摄时间、相关度排序"
      ]},
      { v: "v1.2.1", date: "2026-09-30", items: [
        "密钥框常驻打码、可查看明文，留空保存沿用已存密钥",
        "「拉取模型列表」复用已存密钥；新增 --disable-gpu 应急参数"
      ]},
      { v: "v1.2.0", date: "2026-09-30", items: [
        "稳定性加固：连接回收、写锁 15s、FTS 分批、数据目录原子迁移",
        "LM Studio 免密钥接入；Ollama 模型常驻 30 分钟"
      ]},
      { v: "v1.1.6", date: "2026-09-20", items: [
        "「检查更新」默认走 GitHub Releases，不用再配更新源",
        "版本号按数字段比较；没有 exe 资产时回落到发布页",
        "只在点击时请求一次，无后台轮询"
      ]},
      { v: "v1.1.5", date: "2026-09-20", items: [
        "全盘正文索引（不依赖模型）、时间线视图",
        "安装向导可选数据位置；网格视图批量选择",
        "修去重清理撤销、VACUUM 空转、数据目录静默回落"
      ]},
      { v: "v1.1.4", date: "2026-09-03", items: [
        "基础功能成形：秒搜、知识库问答、图片语义搜索 + OCR",
        "可撤销的文件整理与重复文件清理"
      ]}
    ],
    requires: "",
    sha256: "",
    details: `
<img src="assets/images/cover-filebutler.webp" alt="FileButler 实机界面" style="width:100%;border-radius:10px;border:1px solid rgba(0,0,0,.08);display:block;">
<p style="font-size:12px;color:#86868b;margin-top:6px;">FileButler 实机主界面；38 秒介绍视频在项目卡片上。</p>

### 💡 这是什么
一款兼顾文件秒搜、智能归档与本地知识库问答的桌面工具。可以接入 Ollama 或 LM Studio 进行文档语义问答；在不开启大模型时，关键词检索、文件预览、批量整理与重复清理等基础功能依然能够完整运行。

### ✨ 能干什么
- **发票/扫描件/截屏 OCR 穿透秒搜**：图内文字直接搜！配置 Xiaomi-OCR-0 视觉模型，扫描版 PDF 与票据直接提取结构化文本（表格保行列、公式转 LaTeX、按阅读顺序输出），未加载视觉模型自动回退系统 OCR，再也不用手动翻找纸质或图片凭证
- **免开文档端侧知识库问答**：数百篇 PDF/Word/Markdown 不用逐个打开，向知识库直接提问，向量稠密检索与关键词倒排的 RRF 双路融合毫秒级答复，精准标注文档出处与具体页码，支持多轮追问语义重写与历史对话持久化
- **先出方案才动的无损一键撤销**：规则与端侧模型混合整理，先生成方案预览清单供人工勾选确认，执行全程落盘事务日志，随时一键批量原路撤销，绝不乱动关键文件
- **全配置自由接入**：不挑机器配置，既支持主流云端 API Key 直连（对话走云端、向量留本地），又支持本地 Ollama（模型常驻 30 分钟首问零等待）/ LM Studio 纯离线推理，密钥本地加密存储
- **只读检索与多维匹配**：启动自动增量扫描，后台实时监听文件变更，毫秒级响应；支持「ext:pdf」「size:>100mb」「dm:本周」「path:桌面」等高级检索语法，长文本走 SQLite FTS5 全文索引，中文名支持全拼与首字母模糊匹配
- **EXIF 时间轴解析**：时间筛选深度解析照片 EXIF 元数据，规避系统拷贝或整理时修改文件创建时间的失真问题
- **可选精排**：设置里能装本地 rerank 模型（bge-reranker-v2-m3，CPU 跑）对检索结果重排；默认关着，装不上或内存不够就自动回退
- **文件去重与健康诊断**：三级哈希渐进比对去重，自动隔离至临时清理目录（不直接物理删除，随时可恢复）；集成大文件占用与冲突副本诊断
- **交互与桌面集成**：中英双语界面、收藏与标签系统、内置 PDF 与 Markdown 即时预览、批量安全重命名（删除移至回收站）、SHA-256 校验、Alt+Space 全局快捷唤起、托盘常驻与系统深色模式自适应
- **数据目录与自动备份**：数据目录支持跨盘完整迁移、每天自动备份（保留 5 份快照）、配置一键导入导出

### 🛠️ 怎么做的
- 后端：Python 3.10+，SQLite 里放三套索引（FTS5 全文、文档块向量、图片描述），检索用 RRF 融合；watchdog 实时监控带防抖；预览服务只绑 127.0.0.1 并做白名单校验
- 前端：Vue 3 + Naive UI，Vite 打成单文件塞进 pywebview（Chromium 内核）
- 安全策略：文件移动严格遵循「方案预览 → 勾选确认 → 事务日志落盘」流程，重名自动递增序号防止覆盖；本地大模型不可用时自动降级至确定性规则整理与全文检索
- 打包：PyInstaller（onedir）+ Inno Setup，装到当前用户目录，不需要管理员权限
  `
  },
  {
    id: "netops-handbook",
    title: "NetOps Handbook · 网络工程与排障手册",
    category: "android",
    categoryName: "Android 应用",
    description: "随身携带的实战网络工程排障与面试重器。华为、Cisco、中兴与 Linux 四大主流厂商高频命令同屏并排对照；「现象 ➔ 根因 ➔ 命令 ➔ 验证」四步排障闭环，生产现场秒出处置指令；内置离线 CLI 命令行沙盒模拟器与 53 道大厂高频网络/SRE 结构化面试题库。零权限纯离线，机房地堡随时秒开。",
    tags: ["Android 移动端", "四厂商命令同屏对照", "四步闭环排障字典", "离线CLI交互沙盒", "大厂面试STAR题库"],
    image: "assets/images/cover-netops.webp",
    demoUrl: "https://github.com/7SteveJohn/netops-handbook/releases",
    githubUrl: "https://github.com/7SteveJohn/netops-handbook",
    downloadUrl: "https://wwblz.lanzouu.com/iSxU64ah31kb",
    downloadPwd: "5d7u",
    featured: true,
    role: "开发",
    challenge: "难点在于把几十万字的手册内容、矢量图表与交互组件全部内联进单个自包含页面中，并在本地 WebView 下保持流畅的页面切换与手势返回。工程上构建了专门用于 file:// 环境的内存导航栈，避免了传统浏览器路由在无服务环境下的跳转异常。",
    // ↓ 版本/运行环境/校验码：填上即显示在弹窗里，留空自动隐藏
    version: "v2.0.5",
    updated: "2026-09-30",
    // 更新公告：精炼胶囊指示条，嵌入产品卡左栏（完整版在详情弹窗）
    announcement: {
      version: "v2.0.5",
      date: "2026-09-30",
      items: ["四厂商命令同屏对照", "四步闭环排障字典", "离线CLI交互沙盒", "53道大厂STAR面试题库"],
      summary: "四厂商命令对照 / 离线CLI沙盒"
    },
    // 更新记录：来自 GitHub Releases（7SteveJohn/netops-handbook），最新在前
    changelog: [
      { v: "v2.0.5", date: "2026-09-30", items: [
        "四厂商命令同屏对照：华为 VRP、思科 IOS、中兴 ROS、Linux ip/route 同屏并排展示",
        "35 类高频故障「现象 ➔ 根因 ➔ 命令 ➔ 验证」四步排障闭环字典，现场秒出处置指令",
        "离线 CLI 命令行沙盒模拟器：收录 431 条实机命令，支持前缀补全与回溯",
        "53 道大厂网络与 SRE 面试真题：全套配备 STAR 结构化实战答题话术与错题攻坚"
      ]},
      { v: "v2.0.0", date: "2026-09-15", items: [
        "全新 2.0 极客视效：液态玻璃与高斯模糊毛玻璃，单文件离线加载",
        "纯离线无权限架构：零 INTERNET 网络权限申请，保密机房随时秒开"
      ]}
    ],
    requires: "",
    sha256: "",
    details: `
<img src="assets/images/cover-netops.webp" alt="NetOps 2.0 实机界面" style="width:100%;border-radius:10px;border:1px solid rgba(0,0,0,.08);display:block;">
<p style="font-size:12px;color:#86868b;margin-top:6px;">NetOps 2.0 实机界面；38 秒介绍视频在项目卡片上。</p>

### 💡 这是什么
NetOps Handbook 是专为网络工程师、系统运维与 SRE 量身打造的随身实战与面试武器库。收录华为、Cisco、中兴与 Linux 四大平台命令同屏并排对照、生产排障闭环路径、离线 CLI 沙盒模拟器与大厂面试高频真题；零权限纯离线运行，在无信号机房或严苛安全保密环境中随时秒开查阅。

### ✨ 独家杀手级卖点
- **四大主流厂商命令同屏对照（告别记忆混淆）**：同一网络配置意图，将华为 VRP、思科 IOS、中兴 ROS 与 Linux ip/route/iptables 四大平台命令并排对齐展示，跨平台运维无缝切换，语法差异一览无余
- **「现象 ➔ 根因 ➔ 命令 ➔ 验证」四步排障字典**：覆盖 35 类高频真实生产故障（路由震荡、ARP 欺骗、BGP 邻居卡死等），直出标准化处置命令，现场排障秒级闭环
- **离线 CLI 命令行沙盒模拟器**：收录 431 条实机命令，支持前缀联想补全与历史指令回溯，离线沙盒即敲即练，随时随地手机练就扎实手感
- **53 道大厂网络与 SRE 面试真题**：全套配备 STAR 结构化实战答题话术，支持随机真题抽测、自动判分与错题本攻坚，直击高频考点
- **零权限纯离线保障**：零 INTERNET 网络权限申请，保密机房与地下室无网环境随时秒开，企业拓扑结构与设备账号绝对不泄露
- **极客质感视觉体系**：内置 14 款极客壁纸与液态玻璃/高斯模糊毛玻璃视效，低配设备自适应降级，保证丝滑流畅

### 🛠️ 怎么做的
- **Android 壳层**：WebView 全屏 + 安全区适配 + 返回手势桥接，纯离线（不申请 INTERNET 权限）
- **内容端**：单文件结构，实现专用于 file:// 协议的轻量页面栈，矢量图与样式静态内联，不依赖任何外部资源
- **打包**：gen-data.js → build.js → 一个 index.html 文件，附冒烟测试和 APK 校验脚本
  `
  },
  {
    id: "gameboost",
    title: "GameBoost · 游戏底层性能调优",
    category: "desktop",
    categoryName: "桌面应用",
    description: "轻量级 Windows 游戏环境针对性调优工具。专注消除对战交火瞬间的 1% Low 帧率尖刺与输入延迟；自动化协同电源计划、GPU 响应、定时器分辨率与网络节流策略，优化配置支持一键备份还原。",
    tags: ["C#", "PowerShell", "Windows", "游戏性能"],
    image: "assets/images/cover-gameboost.webp",
    demoUrl: "https://github.com/7SteveJohn/GameBoost/releases",
    githubUrl: "https://github.com/7SteveJohn/GameBoost",
    downloadUrl: "https://wwblz.lanzouu.com/i1XLQ47ddyhe",
    downloadPwd: "8uz7",
    featured: false,
    archived: true,
    role: "开发",
    challenge: "系统调优最怕动了关键项导致不稳定或改不回来。因此在优化前会完整导出注册表与策略快照，所有项目都能单独开关或一键还原；修复过局部 Mutex 遭遇垃圾回收导致的单实例互斥失效问题，重构为静态生命周期持有。",
    // ↓ 版本/运行环境/校验码：填上即显示在弹窗里，留空自动隐藏
    version: "v1.0.5",
    updated: "2026-09-03",
    requires: "",
    sha256: "",
    details: `
<img src="assets/images/cover-gameboost.webp" alt="GameBoost 实机界面" style="width:100%;border-radius:10px;border:1px solid rgba(0,0,0,.08);display:block;">
<p style="font-size:12px;color:#86868b;margin-top:6px;">GameBoost 实机界面；开打前自动调优，改动可一键还原。</p>

### 💡 这是什么
GameBoost 是专为竞技射击游戏定制的轻量级 Windows 环境优化工具。针对对战交火瞬间的 **1% Low 帧率尖刺与输入延迟**进行底层调优，自动化协同电源计划、GPU 响应、定时器分辨率与网络策略；优化方案支持一键备份与无损还原。

### ✨ 能干什么
- 自动协同电源计划、显卡驱动参数、网络调度策略与高精度定时器分辨率
- 支持按机器配置分级筛选优化项，提供环境快照一键无损还原
- 执行前自动向 backup/ 目录备份注册表与策略，运行日志保存在 logs/
- 单文件可执行程序，支持 config.json 声明式开关并可与游戏进程启动联动
- 附带 PowerShell 模块与全流程自动化编译脚本

### 🛠️ 怎么做的
基于 C# 原生编译，提供 compile.ps1 一键构建打包脚本。单实例互斥采用静态生命周期持有，规避了局部 Mutex 遭遇垃圾回收导致的重入缺陷。

> 这类工具涉及系统底层关键配置调优，源码已完全开源，可自行审计并本地构建。
  `
  },
  {
    id: "gameboost-dlssg",
    title: "GameBoost-DLSSG · DLSS 帧生成",
    category: "desktop",
    categoryName: "桌面应用",
    description: "专为 RTX 20/30 系显卡定制的 DLSS 帧生成接入工具。基于 DLL 代理实现插帧支持；提供全平台游戏库扫描、DX12 快捷启动引导与加载状态实时诊断，改动独立隔离可安全还原。",
    tags: ["C#", "WinForms", "DLSS 帧生成", "游戏库管理", "Inno Setup"],
    image: "assets/images/cover-dlssg.webp",
    downloadUrl: "https://pan.baidu.com/s/1johUjnwCEfmjpwuz66tqyA?pwd=rw94",
    downloadPwd: "rw94",
    featured: false,
    archived: true,
    role: "开发",
    challenge: "注入 DLL 后，最难的是判断它到底有没有被游戏真正调用执行。这里通过分析游戏运行日志与进程实际载入的模块清单做双重核验；如果首选入口没被唤起，会自动切换备用入口确保代理接管。",
    version: "v1.0.0",
    updated: "2026-09-20",
    requires: "Windows 10/11 · NVIDIA RTX 20/30 系（40 系以上原生支持，无需本工具）",
    details: `
<img src="assets/images/cover-dlssg.webp" alt="GameBoost-DLSSG 实机界面" style="width:100%;border-radius:10px;border:1px solid rgba(0,0,0,.08);display:block;">
<p style="font-size:12px;color:#86868b;margin-top:6px;">GameBoost-DLSSG 实机界面；给 20/30 系显卡开启 DLSS 帧生成。</p>

### 💡 这是什么
GameBoost-DLSSG 是专为 **RTX 20/30 系** 显卡定制的 DLSS 帧生成管理工具。基于开源 DLL 代理方案实现跨代显卡的插帧支持，附带游戏库扫描、DX12 快捷启动与状态诊断能力，改动独立隔离且可一键还原。

### 🎮 帧生成（给 20/30 系）
- 扫描全平台游戏（Steam / 本地目录均可收录），自动识别是否包含 DLSS-FG / FSR3 动态链接库
- 支持「DX12 模式启动」并直接进入游戏画面设置开启「超分辨率 / 帧生成」
- 配套多套代理架构插件：通用代理层、签名版 0.3.x 与专用 XeSS 支持包，更新时替换同名文件即可
- 「运行诊断」基于运行时日志与进程模块加载状态，清晰呈现代理注入是否实际生效
- 提供设备属性一致性配置项，支持一键还原
- 实测验证：《赛博朋克 2077》(2.31) 帧率由 120 FPS 提升至 280 FPS

### ⚠️ 用前须知
- 帧生成前置依赖 Windows「硬件加速 GPU 调度」（HAGS），工具内置环境检测；建议原生帧率高于 40 FPS 时开启，显存占用约增加 300MB（1080p）
- 含有侵入式反作弊机制的在线网游避免注入第三方代理 DLL，防范安全误封
- 竞技类 FPS 游戏（如 CS2、Valorant）不建议开启插帧，优先保障输入端到端低延迟
- 建议解压至具有完整写入权限的独立目录中运行，按需授予 UAC 权限

### 🛠️ 怎么做的
原生 C# / WinForms 单文件，便携版双击就能跑，也有安装版；卸载就是删文件夹或走系统卸载，不残留。细节都在程序里的「说明」页。
  `
  },
  {
    id: "paian",
    title: "拍案 · 网文创作工作台",
    category: "desktop",
    categoryName: "桌面应用",
    description: "为长篇小说量身打造的沉浸写作工作台。独创码字抽卡激励体系，码字净产出换抽卡，抽取 N~SSR 四级灵感卡牌专治卡文破局；网文体检四页签深度排查敏感词、口头禅与对白节奏；支持依大纲起草、场景卡片无损重排与伏笔因果牵线。",
    tags: ["Electron", "码字抽卡激励 (N~SSR)", "网文体检雷达", "大纲AI起草", "伏笔追踪与牵线"],
    image: "assets/images/cover-paian.webp",
    demoUrl: "https://github.com/7SteveJohn/PaiAn/releases",
    githubUrl: "https://github.com/7SteveJohn/PaiAn",
    downloadUrl: "https://pan.baidu.com/s/1QRPC49ohJ0fbdrVw8sB--w?pwd=tq52",
    downloadPwd: "tq52",
    featured: false,
    role: "开发",
    challenge: "长篇创作最忌讳两点：AI 擅自污染正文，以及多章节后剧情设定前后撕裂。为此构建了独立的草稿暂存机制，采纳时自动保存快照；场景卡片重排采用无损文本切分，确保拼合还原与原稿逐字节一致；设定检查限定在实体与专有名词的作用域内，避免日常对话修辞引发误报。",
    // ↓ 版本/运行环境/校验码：填上即显示在弹窗里，留空自动隐藏
    version: "v1.0.3",
    updated: "2026-11-07",
    // 更新公告：精炼胶囊指示条，嵌入产品卡左栏（完整版在详情弹窗）
    announcement: {
      version: "v1.0.3",
      date: "2026-11-07",
      items: ["独创码字抽卡激励 (N~SSR)", "体检四页签（敏感词/口头禅）", "文风约束与 AI 味自检", "码字冲刺计时"],
      summary: "码字抽卡激励 / 体检四页签"
    },
    // 更新记录：来自 GitHub Releases（7SteveJohn/PaiAn），最新在前
    changelog: [
      { v: "v1.0.3", date: "2026-11-07", items: [
        "独创码字抽卡激励：码字净产出兑换抽卡，抽取 N~SSR 四级灵感卡牌专治卡文，新卡进手牌、重复卡转墨",
        "体检四页签：敏感词检测、平台惯例（章长·长段·对白比）、口头禅雷达与本章汇总",
        "文风约束与 AI 味自检：草稿/续写默认带六条可执行文风约束，支持按书覆盖；扩充 AI 味自检词表",
        "AI 工坊增加 OOC 检查（对照人物卡判台词）与开头结尾钩子体检",
        "检查更新：设置内可选启动时检查，默认保持关闭坚守纯离线承诺",
        "码字冲刺：支持 15/25/45 分钟沉浸计时，打字历史自动汇总进统计页",
        "数据安全与底层加固：单章高速保存、备份镜像双目录、掉电防损坏与关窗自动快照"
      ]},
      { v: "v1.0.2", date: "2026-09-30", items: [
        "API Key 改为标准密码框交互：支持明文切换与持久化存储",
        "修复 Key 回显接口错误"
      ]},
      { v: "v1.0.1", date: "2026-09-30", items: [
        "书 → 卷 → 章三级结构：导入大纲自动识别卷标与建卷建章",
        "批量写作：卷头支持「写本卷」，每章字数支持弹性配置",
        "设置页支持数据文件夹与备份一键安全迁移",
        "稳定性修复：创建按钮空标题提示、永久删除误报警告修复"
      ]},
      { v: "v1.0.0", date: "2026-09-29", items: [
        "首个开源发布：纯本地长篇网文创作工作台",
        "CodeMirror 6 深度定制编辑器、场景卡片无损重排与伏笔追踪",
        "纯本地离线运行，数据 100% 留存在本机"
      ]}
    ],
    requires: "Windows 10/11（安装版免装 Node.js）",
    sha256: "d8f7f12c5e66e6b1e1dab520b35d80848617105a21ef1976c2ab69b112508e06",
    details: `
<img src="assets/images/cover-paian.webp" alt="拍案 写作页实机" style="width:100%;border-radius:10px;border:1px solid rgba(0,0,0,.08);display:block;">
<p style="font-size:12px;color:#86868b;margin-top:6px;">拍案写作页：章节列表、正文编辑与右侧素材抽屉；38 秒介绍视频在项目卡片上。</p>

### 💡 这是什么
为长篇故事与深度写作量身定制的沉浸桌面工作台。独创码字抽卡激励体系，码字净产出换抽卡破局专治卡文；AI 依大纲起草的内容先暂存至「待审草稿」，经作者主动采纳后才合入正文并生成快照，确保原稿节奏始终由作者掌控；纯本地离线运行，支持连接本地 Ollama 模型或外部接口。

### ✨ 能干什么
- **独创码字抽卡激励（专治卡文）**：码字净产出实时兑换抽卡机会！抽取 N（环境小插曲）、R（角色微反应）、SR（突发暗线伏笔）、SSR（剧情惊天大反转）四级灵感卡牌；抽到新卡一键纳入大纲手牌推进剧情，重复卡自动分解为墨水兑换稀有卡，用正向激励彻底根治灵感枯竭与卡文拖延
- **网文体检四页签（防限流封禁）**：集成敏感词排查、平台惯例（章长·长段·对白比合规扫描）、口头禅高频词雷达与本章合规汇总，一键全稿排雷，保障发文合规与阅读爽感
- **写作页**：CodeMirror 6 编辑器（Obsidian 同款内核）、自动保存、实时字数与目标进度、专注模式、Markdown 一键预览
- **AI 工坊**：支持按段落、章节、全卷等多粒度依大纲起草，单章目标字数支持弹性配置；对剧情梗概单薄的章节主动触发内容门禁预警，批量生成具备实时进度可视化
- **出场记忆**：采纳章节后自动抽取出场人物 / 物品 / 事件写进人物卡与设定卡，幻觉角色一键清洗
- **分卷**：书 → 卷 → 章三级结构，导入大纲自动识别卷标、建卷建章；整卷重命名，改中间某章的卷即拆卷，导出自动插入卷标题
- **场景板**：本章按空行切成场景卡片，拖动重排或整块搬去下一章；拼回去与原稿逐字节相等，跨章挪动可整步退回
- **正文标记**：支持对伏笔、彩蛋、角色与场景进行非侵入式高亮标记，保持原文纯净，导出时自动剔除辅助标记
- **素材抽屉**：伏笔追踪（按挂的章数计息）、碎片箱、人物卡、设定卡、分支沙盘、本地词库取名面板（不联网）
- **牵线**：章、人物、伏笔摆成节点牵出因果，一键牵线、断线诊断，「演一遍」沿推动线逐拍放
- **复盘**：提供节奏律动分析（句长与对白分布）、伏笔生命周期追踪、模板化表达自检及设定一致性守夜人（境界回退 / 称谓混淆 / 远场断线预警）
- **抗拖延**：支持线性推进模式（限定单向追加写作）与断点现场即时恢复
- **导入与迁移**：TXT / 大纲 / docx 导入（自动识别卷标、按章名分发进各章剧情要点，可撤销）；导出 md / txt / 分卷 / docx / epub（Windows 换行可直接投稿）；每日自动备份（保留 7 天）、数据文件夹一键迁移，支持 Obsidian 库双向同步

### 🛠️ 怎么做的
基于 Electron + Vite + TypeScript 构建，数据完全持久化在本地文件系统；提供免安装便携版与标准安装包，无需预装 Node.js 环境。场景重排、文本质量自检与设定守夜人均采用确定性算法实现，不消耗额外 Token；UI 冒烟与测试用例齐备。
  `
  },
  {
    id: "fluxion",
    title: "Fluxion · 完整版性能套件",
    category: "desktop",
    categoryName: "桌面应用",
    description: "Windows 竞技级游戏性能套件。RTX 20/30 系老显卡强开 DLSS 帧生成，实测帧率 120 ➔ 280 FPS 瞬间翻倍；51 项底层体检专治对战交火 1% Low 掉帧卡顿与输入延迟；进游戏自适应调优，退出瞬时无感还原。",
    tags: ["C# 原生编译", "RTX 20/30 强开DLSS帧生成", "51项底层体检", "治1% Low掉帧", "游戏联动/无损还原"],
    image: "assets/images/cover-fluxion.webp",
    githubUrl: "https://github.com/7SteveJohn/Fluxion",
    demoUrl: "https://github.com/7SteveJohn/Fluxion/releases",
    downloadUrl: "https://wwblz.lanzouu.com/b00q1u0qpa",
    downloadPwd: "1ici",
    featured: true,
    role: "开发",
    challenge: "主要是 51 项系统改动的真实状态回读，以及老显卡帧生成的可靠接入。每项改动前备份环境快照，状态分四档真实回读，对可能影响硬件稳定性的高危项只做检测不给调整；帧生成端根据模块加载和日志做双重校验，未生效时自动尝试其他入口。",
    version: "v1.3.0",
    updated: "2026-11-01",
    // 更新公告：精炼胶囊指示条，嵌入产品卡左栏（完整版在详情弹窗）
    announcement: {
      version: "v1.3.0",
      date: "2026-11-01",
      items: ["RTX 20/30 强开DLSS帧生成", "51项底层体检(治1% Low)", "进游戏自动调优/退出还原", "六大平台游戏库全景纳管"],
      summary: "老卡强开帧生成 / 51项底层体检"
    },
    // 更新记录：来自 GitHub Releases（7SteveJohn/Fluxion），最新在前
    changelog: [
      { v: "v1.3.0", date: "2026-11-01", items: [
        "RTX 20/30 系老显卡强开 DLSS 3 帧生成：接管 nvngx_dlssg.dll 代理注入，《赛博朋克 2077》实测 120 ➔ 280 FPS 瞬间翻倍",
        "51 项底层硬核系统体检：18 项可细调，游戏期自适应切档，退出游戏瞬时无感还原",
        "现代 Win11 亚克力视觉重塑：内嵌 MiSans 三字重，边缘消毛刺，深浅色自适应",
        "全自动多级封面游戏库：六大平台全景纳管，Steam CDN / Bing 智能补齐非 Steam 游戏封面"
      ]},
      { v: "v1.2.0", date: "2026-10-15", items: [
        "新增反作弊游戏绕行加载链（d3d12/dxgi），支持《绝区零》《鸣潮》帧生成代理",
        "数据目录自绘异步卡片选择器，支持跨盘符一键无损校验迁移",
        "物理显示器探测与电竞 4:3 / 16:11 快速拉伸切换，附带单屏防黑屏安全保护"
      ]},
      { v: "v1.0.0", date: "2026-09-20", items: [
        "首个发布版本：底层电源计划、NVAPI 驱动级配置与游戏联动原型上线"
      ]}
    ],
    requires: "Windows 10/11 · NVIDIA RTX 20 系及以上（帧生成功能）",
    details: `
<img src="assets/images/cover-fluxion.webp" alt="Fluxion 实机界面" style="width:100%;border-radius:10px;border:1px solid rgba(0,0,0,.08);display:block;">
<p style="font-size:12px;color:#86868b;margin-top:6px;">Fluxion 实机主界面；38 秒介绍视频在项目卡片上。</p>

### 💡 这是什么
Fluxion 是集 Windows 底层系统调优、全平台游戏库管理与跨代 DLSS 帧生成于一体的竞技级性能套件。包含仪表盘、性能优化、游戏库、实时监控等核心模块：**为 RTX 20/30 系老显卡强开 DLSS 帧生成实现帧率瞬间翻倍，提供 51 项系统级底层调优彻底消除对战交火瞬间的 1% Low 卡顿掉帧，且进游戏自动调优、退出瞬时无感还原。**

### 📊 仪表盘
- 游戏联动状态（远程状态 / 联动 / 场景）+ 实时负载瓦片：CPU / 内存 / GPU / GPU 温度
- 快捷操作：一键优化、系统体检、恢复备份
- 帧生成运行时一览：运行时是否就绪、HAGS 状态、已注入方案数、最近一次接入结果

### ⚡ 性能优化（51 项底层体检，专治 1% Low 掉帧与输入延迟）
- **RTX 20/30 系老卡强开 DLSS 帧生成（120 ➔ 280 FPS）**：打破代际锁死限制，跑真 DLSS 多帧生成（2X-6X），《赛博朋克 2077》实测帧率从 120 FPS 飙升至 280 FPS 瞬间翻倍，告别换代焦虑
- **51 项底层体检与针对性调优**：18 项可细调，状态分四档真实回读，所有修改统一导出环境快照并支持一键无损还原
- **进游戏自动调优，退出瞬时无感还原**：与游戏进程无缝联动，进游戏切卓越性能电源并挂起后台冗余任务，退出游戏毫秒级全自动恢复原状，不给日常办公带来一丝负担
- **电源**：卓越性能计划、处理器 100%、关 USB 选择性暂停 / PCIe ASPM / 睡眠休眠硬盘超时；游戏期联动切档
- **调度**：Win32PrioritySeparation=38（短量子 + 前台增强）、混合架构异类线程调度策略（Intel Thread Director 官方做法，替代硬绑 P 核）
- **GPU**：关 GameDVR、游戏模式、HAGS 开关；NVAPI 驱动配置自动化（竞技档 / 3A 档双档，等价 NVIDIA 面板手动设置）
- **网络**：关 Nagle、关流量节流、SystemResponsiveness=10、网卡节能全关，消除网络抖动与高 ping
- **内存 / 服务 / 输入**：内核不换页（DisablePagingExecutive）、SysMain 禁用、关鼠标加速，极速响应
- **后台 / 定时器 / 桌面**：游戏加速包（挂起后台进程 + 内存整理 + 暂停更新下载，退出完整恢复）、游戏期 0.5ms 高精度定时器（仅 FPS 档）、DWM 特效精简
- **取值细调**：体检表 19 行可双击细调——着色器缓存 12 档、DLSS 模型覆盖 / 强制预设、预渲染帧数、HAGS、量子长度等 18 个可调项，默认值 = 改造前行为；状态分四档徽章（已生效 / 未生效 / 待确认 / 需处理）
- **稳定优先**：HPET 强制、GPU 中断绑核、MSI 强制转换、rBAR 全局强开等影响硬件稳定性的项目**只做检测、不提供危险调整**；所有优化项执行前统一导出环境快照

### 🎮 帧生成（DLSS MFG 0.3.5 · 代理模式，给 RTX 20/30 系）
- **方案 B（代理模式）**：接管游戏的 nvngx_dlssg.dll 加载，跑真 DLSS 多帧生成（2X-6X）；架构 Router（SM86 / SM75）、内核类型（PTX / Cubin）、光流精度、最大生成帧、日志级别全部可调
- **方案 A（OptiScaler 注入）**：把本机显卡伪装成 RTX 5090 让游戏菜单亮出「DLSS 帧生成」，插帧交给 Intel XeSS-FG 引擎或原生 DLSSG——与方案 B 互斥二选一
- **反作弊游戏自动改用 d3d12 / dxgi 入口**：绝区零 / 鸣潮这类按文件名拦 version.dll 的反作弊，拦不住 DX12 游戏必加载的系统库
- **运行诊断**：日志 + 进程模块双证据，直接告诉你代理有没有真激活；遗留代理停放、入口巡检、备份与回收（送回收站，最新一份永久保留）
- **实测**：《赛博朋克 2077》120 → 280 帧；鸣潮实测 6X（30 系）

### 🎯 游戏库
- **全平台扫描**：Steam、Epic、WeGame、战网、Ubisoft Connect、EA App，外加启动器自定义路径、注册表卸载项、引擎目录结构特征
- **封面**：Steam CDN + 名称检索 + Bing 三级获取，非 Steam 游戏也能补上；宽幅自适应裁切，小窗和全屏都不切半张
- **管理**：封面墙 + 搜索 + 收藏 + 最近游玩；右键启动（支持 DX12 模式）/ 打开目录 / 收藏 / 重命名 / 私密 / 隐藏 / 移除；自定义添加游戏、批量补封面；被忽略清单挡住的目录灰显可见、一键恢复收录

### 📈 实时监控
- CPU / GPU / 内存实时曲线（最近 90 个采样）+ 与数据目录同步的运行日志

### 🎛️ 设置与其他
- **界面**：内嵌 MiSans 三字重（Bold / Medium / Regular）；亚克力卡片边缘消毛刺；浅色 / 深色主题与托盘菜单配色统一；Windows 11 下窗口圆角、标题栏随主题深浅
- **显示适配**：枚举物理显示器与当前分辨率，CS2 / 无畏契约等 4:3、16:11 快捷切换；单屏拉伸防黑屏保护；DPI PerMonitorV2
- **数据目录**：自绘异步目录选择器，不再卡死超时，支持粘贴绝对路径；跨盘一键迁移（校验 → 复制 → 哈希 → 切换），配置、封面、备份都不丢
- **场景联动**：进游戏按预设档位自适应切换系统状态（临时电源计划 / 游戏加速包 / 后台串流休眠），游戏退出后完整无损还原；根据对局类型智能匹配策略
- **开机自启**：走提权计划任务，登录不弹 UAC；托盘、硬件告警、漂移检测
- **便携版 / 安装版**同一个 exe 运行时自动判断，升级保留你的配置

### 说明
完整版包含系统级深度调优与全平台游戏管理，若仅需要跨代显卡帧生成功能，亦可参考历史归档中的单功能版 **GameBoost-DLSSG**。
  `
  }
];
