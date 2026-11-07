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
    description: "智能文件检索管家。支持主流云端 API Key 接入与本地模型，文件名、拼音、全文及扫描件 OCR 秒搜。整理文件前先出方案预览，勾选确认后才移动，并支持全流程一键撤销。",
    tags: ["Python", "Vue 3", "Cloud API / 本地AI", "SQLite / FTS5", "RAG"],
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
- **只读检索与多维匹配**：启动自动增量扫描，后台实时监听文件变更，毫秒级响应；支持「ext:pdf」「size:>100mb」「dm:本周」「path:桌面」等高级检索语法，长文本走 SQLite FTS5 全文索引，中文名支持全拼与首字母模糊匹配
- **EXIF 时间轴解析**：时间筛选深度解析照片 EXIF 元数据，规避系统拷贝或整理时修改文件创建时间的失真问题
- **端侧知识库问答**：新文档自动文本切块并向量化入库（bge-m3）；采用向量稠密检索与关键词倒排的 RRF 双路融合，回答精准标注引用来源（文件 · 章节 · 页码），支持多轮追问语义重写与历史对话持久化
- **可选精排**：设置里能装本地 rerank 模型（bge-reranker-v2-m3，CPU 跑）对检索结果重排；默认关着，装不上或内存不够就自动回退
- **模型自由接入**：本机 Ollama（模型常驻 30 分钟避免反复冷启动，亦可开启常驻首问零等待）、本机 LM Studio 一键检测、兼容任意 OpenAI 格式标准接口；支持「对话走云端、向量化留本地」双模架构，密钥加密存储于本地
- **图片内容多模态检索**：本地视觉模型自动生成图片场景描述与文本识别（OCR），支持语义搜图与票据编号匹配；未加载视觉模型时自动回退至系统原生 OCR 引擎
- **扫描件解析**：配置 OCR 视觉模型（Xiaomi-OCR-0，0.8B，约 2GB 显存）后，扫描版 PDF 优先进行版面结构化还原——表格保行列、公式转 LaTeX、按阅读顺序输出并入库；模型未就绪时自动回退系统 OCR
- **规则与模型混合整理**：预设规则与端侧模型协同进行分类预判，强制执行「方案预览 → 人工勾选确认 → 执行」安全流程；支持按批次整体撤销、重做，方案支持存为复用模板
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
    description: "一本随身查阅的网络技术与运维参考手册。收录华为、Cisco、中兴与 Linux 的多厂商命令对照、排障流程与面试题库，以单文件打包，随时秒开。",
    tags: ["Android", "WebView", "Gradle 8.9", "单页 SPA", "网络运维"],
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
    requires: "",
    sha256: "",
    details: `
<img src="assets/images/cover-netops.webp" alt="NetOps 2.0 实机界面" style="width:100%;border-radius:10px;border:1px solid rgba(0,0,0,.08);display:block;">
<p style="font-size:12px;color:#86868b;margin-top:6px;">NetOps 2.0 实机界面；38 秒介绍视频在项目卡片上。</p>

### 💡 这是什么
NetOps Handbook 是一本网络工程与运维随身参考手册。收录多厂商命令对照、故障排查路径、CLI 模拟器与技术题库，适合在学习、备考或日常维护时对照查阅。

**产品定位为辅助参考手册**：适合配合教材、在线课程与真机实验使用，用于高频命令速查、跨厂商配置对照、故障排障步骤梳理与面试重点巩固。

### ✨ 里面有什么
- **68 个知识模块 / 35 个排障案例 / 58 条多厂商命令对照 / 431 条 CLI 命令 / 53 道面试真题**
- **学习路线图**：从基础网络到云原生与 SRE 分五个递进阶段，每个阶段清晰界定目标并映射对应知识模块
- **排障字典**：每个故障按「现象 → 根因 → 命令 → 验证」四步展开，点开卡片就是一条完整的排查步骤
- **命令字典**：同一条命令把华为、Cisco、中兴、Linux 四个平台并排摆出来对照
- **面试题库**：高频真题带参考答案和 STAR 话术；另有模拟测验（随机抽题、自动判分）和错题本
- **速查表与术语词典**：提供高频 CLI 命令与网络、云原生技术专有名词索引
- **CLI 模拟器**：离线沙盒环境，支持直接键入命令，提供前缀联想与历史记录
- **数据导出**：学习进度、收藏夹与错题记录支持导出为标准 JSON 格式，便于跨设备迁移
- **多主题与视觉层次**：内置 14 款精选壁纸与三档毛玻璃效果（液态玻璃 / 标准毛玻璃 / 高斯模糊），浮层透明度根据壁纸亮度自动重算，性能受限设备自动降级渲染

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
    description: "为长篇小说创作设计的写作工具。支持依大纲辅助起草，生成内容经人工确认后再合入正文；内置场景卡片重排、伏笔追踪与人物关系图谱。",
    tags: ["Electron", "TypeScript", "CodeMirror 6", "写作工具"],
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
      items: ["体检四页签（敏感词/平台惯例/口头禅）", "文风约束与 AI 味自检", "检查更新（默认关）", "码字冲刺计时"],
      summary: "体检四页签 / 文风约束"
    },
    // 更新记录：来自 GitHub Releases（7SteveJohn/PaiAn），最新在前
    changelog: [
      { v: "v1.0.3", date: "2026-11-07", items: [
        "体检四页签：敏感词检测、平台惯例（章长·长段·对白比）、口头禅雷达与本章汇总",
        "文风约束：草稿/续写默认带六条可执行文风约束，支持按书覆盖；扩充 AI 味自检词表",
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
为长篇故事与深度写作定制的桌面工作台。AI 依大纲起草的内容会先暂存至「待审草稿」，经作者主动采纳后才会合入正文并生成快照，确保原稿节奏始终由作者掌控；支持连接本地 Ollama 模型或外部接口。

### ✨ 能干什么
- **写作页**：CodeMirror 6 编辑器（Obsidian 同款内核）、自动保存、实时字数与目标进度、专注模式、Markdown 一键预览
- **AI 工坊**：支持按段落、章节、全卷等多粒度起草，单章目标字数支持弹性配置；对剧情梗概单薄的章节主动触发内容门禁预警，批量生成具备实时进度可视化
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
    description: "Windows 游戏性能调优与帧生成工具。提供 51 项系统级体检与一键调优，让 RTX 20/30 卡也能开 DLSS 帧生成；支持游戏库管理、启动自动调优，所有系统修改都能一键还原。",
    tags: ["C#", "WinForms", "51 项体检", "DLSS 帧生成", "游戏联动", "实时监控"],
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
    requires: "Windows 10/11 · NVIDIA RTX 20 系及以上（帧生成功能）",
    details: `
<img src="assets/images/cover-fluxion.webp" alt="Fluxion 实机界面" style="width:100%;border-radius:10px;border:1px solid rgba(0,0,0,.08);display:block;">
<p style="font-size:12px;color:#86868b;margin-top:6px;">Fluxion 实机主界面；38 秒介绍视频在项目卡片上。</p>

### 💡 这是什么
Fluxion 是集 Windows 底层系统调优、全平台游戏库管理与 DLSS 帧生成于一体的性能套件。包含仪表盘、性能优化、游戏库、实时监控等核心模块：**提供底层安全调优以消除交战瞬间卡顿，同时为 RTX 20/30 系显卡接入 DLSS 帧生成能力，所有系统修改均支持无损一键还原。**

### 📊 仪表盘
- 游戏联动状态（远程状态 / 联动 / 场景）+ 实时负载瓦片：CPU / 内存 / GPU / GPU 温度
- 快捷操作：一键优化、系统体检、恢复备份
- 帧生成运行时一览：运行时是否就绪、HAGS 状态、已注入方案数、最近一次接入结果

### ⚡ 性能优化（51 项体检，其中 18 项可细调，全部可一键还原）
- **电源**：卓越性能计划、处理器 100%、关 USB 选择性暂停 / PCIe ASPM / 睡眠休眠硬盘超时；游戏期联动切档（进游戏切、退出还原，办公零影响）
- **调度**：Win32PrioritySeparation=38（短量子 + 前台增强）、混合架构异类线程调度策略（Intel Thread Director 官方做法，替代硬绑 P 核）
- **GPU**：关 GameDVR、游戏模式、HAGS 开关；NVAPI 驱动配置自动化（竞技档 / 3A 档双档，等价 NVIDIA 面板手动设置）
- **网络**：关 Nagle、关流量节流、SystemResponsiveness=10、网卡节能全关
- **内存 / 服务 / 输入**：内核不换页（DisablePagingExecutive）、SysMain 禁用、关鼠标加速
- **后台 / 定时器 / 桌面**：游戏加速包（挂起后台进程 + 内存整理 + 暂停更新下载，退出完整恢复）、游戏期 0.5ms 定时器（仅 FPS 档）、DWM 特效精简
- **监控**：nvlddmkm 崩溃取证、C 盘守护、网络哨兵、NVIDIA 覆盖层规避
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
