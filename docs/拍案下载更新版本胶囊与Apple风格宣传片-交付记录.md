# 拍案网盘下载更新、版本胶囊与 Apple 风格宣传片 · 交付记录

> **交付日期**：2026-11-08  
> **涉及项目**：拍案（PaiAn · 纯本地网文创作工作台，项目 ID: `paian`）  
> **执行依据**：
> 1. 更新网盘下载链接与提取码至最新百度网盘；
> 2. 参照 GitHub 官方 Releases 梳理历史版本，在产品卡片补齐类似 FileButler 的版本公告胶囊与全部版本折叠详情弹窗；
> 3. 仿照 FileButler 与 Fluxion 的 Apple 顶级产品发布片范式，全新渲染 1080p 30fps 拍案专属宣传视频与高保真配乐，驱动站点 Web Audio `__BEAT` 3D 共振。

---

## 一、网盘下载与版本胶囊更新

### 1. 百度网盘下载链接与提取码升级
- **新版链接**：`https://pan.baidu.com/s/1QRPC49ohJ0fbdrVw8sB--w?pwd=tq52`
- **提取码**：`tq52`
- **落地文件**：
  - `index.html`：更新 `#products article[data-project-id="paian"]` 中的主操作按钮 `href`、`data-copy-pwd="tq52"` 以及静态回显 `(提取码: tq52)`；同时将首屏目录导航 `02 拍案` 的版本标同步更新为 `v1.0.3`；
  - `js/projects.js`：更新 `downloadUrl` 与 `downloadPwd`，以及版本号 `version: "v1.0.3"`、更新日期 `updated: "2026-11-07"`、最新安装包 SHA256；
  - `js/bundles/home.js`：运行 `node scripts/build-bundles.mjs` 完成全量生产 bundle 同步构建。

### 2. GitHub 官方 Releases 对齐与版本公告胶囊集成
经探测 GitHub 官方仓库 `7SteveJohn/PaiAn`，拍案已发布 4 个正式版本：
- **v1.0.3**（2026-11-07，最新）：体检四页签（敏感词/平台惯例/口头禅雷达/本章汇总）、文风约束与 AI 味自检、检查更新（默认保持关闭，守住离线承诺）、码字冲刺计时、单章高速保存与数据双目录备份；
- **v1.0.2**（2026-09-30）：API Key 改为标准密码框交互，支持明文切换与持久化存储，修复 Key 回显错误；
- **v1.0.1**（2026-09-30）：书 → 卷 → 章三级结构，导入大纲自动建卷建章，批量写作字数弹性配置，数据文件夹一键安全迁移；
- **v1.0.0**（2026-09-29）：首个开源发布，纯本地长篇网文工作台，CodeMirror 6 定制编辑器、场景卡片无损重排与伏笔追踪。

在 `js/projects.js` 中完整注入 `announcement` 与 `changelog` 字段：
- **卡片指示胶囊**：呈现 `● v1.0.3 · 体检四页签 / 文风约束 全部 4 个版本 →`，样式与 FileButler 保持像素级统一；
- **交互联动与平滑滚动修复**：
  - 点击「全部 4 个版本 →」携带 `data-open-project="paian"` 与 `data-open-changelog`，由 `openProjectModal` 原生感知 `{ openChangelog: true }`；
  - 无论 Markdown 渲染器处于首次异步加载态还是已缓存同步态，均能稳定自动展开 `<details class="changelog">` 并通过 `scrollIntoView({ block: 'start', behavior: 'smooth' })` 聚焦历史版本列表，避免弹窗在二次唤起时卡死在顶部；
  - `hydrateProductLinks` 补充幂等排重保护（插入前清除旧 aside），防止热更新或多次渲染产生重复胶囊；
  - 拍案主卡片「了解更多」按钮补齐 `underline-offset-2` 样式。

---

## 二、Apple 风格宣传视频重构与视听设计

针对此前原型视频存在的 720p 简单长页滚动感与模板音轨，依据 Apple 顶级发布会短片规格进行了全链路视听重塑：

### 1. 视听设计美学范式
- **黑曜石深空钛金舞台（Obsidian Titanium Stage）**：采用深色渐变底板（`#0b0d12` ~ `#11151d`），辅以顶部聚光灯光晕与地表柔和漫反射；
- **原生无边框圆角视窗（Native Frameless Window）**：保持 Windows 软件真实界面，基于 `r=20px` 高精度圆角裁切，1px 金属倒角高光与双层物理接触遮蔽阴影，彻底拔除生硬的伪 macOS 红黄绿红绿灯圆点；
- **拟真物理光标（Precision Apple White Cursor）**：macOS 44px 矢量光标与方向阴影，沿三次贝塞尔缓动曲线划过屏幕，点击瞬间产生微米级按压形变（Scale 0.90）与光晕扩散环；
- **动态 Ken Burns 微距推镜**：镜头紧贴文字输入重心丝滑推进（1.0x → 1.18x），增强沉浸感。

### 2. 拍案专属配乐：Lo-Fi 专注乐章（`Temp/paian-apple-score.m4a`）
- **曲风与速度**：88 BPM Cozy Lo-Fi Chillhop / Study Beats（舒适专注写作乐章）；
- **和声进行**：$\text{Fmaj9} \to \text{G6} \to \text{Em7} \to \text{Am9} \to \text{Dm9} \to \text{G13} \to \text{Cmaj9} \to \text{Am7}$（温暖、阳光、舒适、富有回味的爵士复调循环，拔除所有诡异颤音与恐怖片泛音）；
- **器乐物理模拟**：
  - **Vintage Rhodes & 毛毡大三角钢琴**：金属 Tine 敲击泛音与自然毛毡击弦，3400Hz 暖色滤波，无任何机器波形颤音；
  - **Lo-Fi Boom-Bap 鼓组与木质边击**：柔和饱满的 54Hz 冲量 Kick、340Hz 木质击打 Rimshot 与 54% 延迟 MPC Swing 沙锤；
  - **胶片微温床（Vinyl Bed）**：-40dB 极微黑胶颗粒，营造安静专注书房空间感；
  - **文学次低音 Sub-Bass**：45~80Hz 纯净圆润次低频，跟进和弦根音与五音行走；
  - **全拟真 Foley 拟声音效**：
    - **ASMR 机械轴体打字敲击声**：在 6.2s~9.8s 逐字键入时，精准触发 24 次清脆轴体击打与回弹；
    - **草稿采纳与保存钟声**：采纳确认瞬间释放 1760Hz 水晶通透钟鸣；
    - **场景卡片摩擦与卡扣音**：拖动重排时触发拟真纸质滑行与磁吸到位声；
    - **关系图谱展开与次低音冲击**：图谱连线展开时触发 25.5s 影院级 Sub-impact 冲击。
- **Web Audio `__BEAT` 频段实测数据**：
  - Max Bass RMS: `564.67`
  - Beat Triggers: `49` 次，完美驱动全站 3D Cymatics 粒子共振球与视窗呼吸光晕。
- **独立专项交付记录**：详见 [`docs/拍案宣传视频原声音乐重塑与LoFi专注乐章-交付记录.md`](file:///d:/HTML/docs/%E6%8B%8D%E6%A1%88%E5%AE%A3%E4%BC%A0%E8%A7%86%E9%A2%91%E5%8E%9F%E5%A3%B0%E9%9F%B3%E4%B9%90%E9%87%8D%E5%A1%91%E4%B8%8ELoFi%E4%B8%93%E6%B3%A8%E4%B9%90%E7%AB%A0-%E4%BA%A4%E4%BB%98%E8%AE%B0%E5%BD%95.md)。

### 3. 38 秒全片分镜编排
| 时间段 | 场景与镜头 | 画面呈现与核心功能点 | 声音与 Foley 同步 |
|---|---|---|---|
| `0.0s - 4.5s` | **Hero 开屏**<br>`zoom: 1.0` | 深空钛金舞台，2.5D 硬件视窗优雅升起；大标题「拍案」渐显，深蓝朱印徽标与「v1.0.3 · 纯本地 100% 离线」胶囊 | 温暖古典钢琴琶音开场，柔和弦乐铺底 |
| `4.5s - 11.5s` | **长篇小说写作与打字特写**<br>`zoom: 1.0 → 1.18` | 镜头推近 CodeMirror 6 编辑器。白色光标划入点击；光标紧随打字流平滑右移，实时逐字键入「剑光未至，风先起了。少年按住腰间竹鞘，指节微微发白。」；底部字数实时递增至 2,480 字 | 光标点击 Pop 声；24 次逐键轴体打字清脆声；字数落定保存钟鸣 |
| `11.5s - 18.5s` | **依大纲起草与人工确认**<br>`zoom: 1.05` | 视窗切至大纲工作台。光标点击「批量生成草稿」；琥珀金浮窗展开「待审草稿（暂存中 · 未入正文）」；光标点击「确认采纳合入正文」，绿光闪烁转为「已采纳合入正文 · 自动生成快照备份」 | 按钮点击反馈音；AI 生成微光浮动；采纳确认高音泛音钟声 |
| `18.5s - 25.5s` | **场景卡片重排与伏笔追踪**<br>`zoom: 1.0` | 视窗切至场景板。光标按压「卡片 2」产生悬浮投影，向上拖动越过「卡片 1」，两卡平滑交换位置并磁吸入位；右侧素材抽屉展开伏笔追踪标签（「扣上刻着一个他认得的字 · 挂 3 章计息推进」） | 按压 Pop 声；纸质滑动摩擦音；磁吸卡扣脆响 |
| `25.5s - 32.5s` | **人物关系图谱高潮**<br>`zoom: 1.0` | 视窗切至牵线画布。林越、阿禾、黑车帮、守夜人四大主角星象节点亮起，彩色因果连线与关系标签（救命恩人、暗中被盯、身世密信）平滑绘制；底部展现实时守夜人诊断条 | 强劲次低音 Sub-drop 重击；高音水晶钟声；连线延伸音效 |
| `32.5s - 34.5s` | **纯本地 100% 离线安全**<br>`zoom: 1.0` | 钛金安全盾牌与本地硬盘锁扣；高对比大字「默认不出门 · 纯本地运行」与 3 枚纯本地技术标签 | 沉稳低音缓冲，闭锁机械卡扣 |
| `34.5s - 38.0s` | **Apple 式优雅收尾**<br>`zoom: 1.0` | 拍案印章 Logo、大字排印、`7stevejohn.github.io` 域名下划线展开与 v1.0.3 版本标记 | 尾奏钢琴余音绕梁，平滑淡出黑屏 |

---

## 三、测试与回归验证记录

### 1. 媒体与视频完整性（FFprobe 实测）
```powershell
ffprobe -v error -show_entries format=duration,size,bit_rate:stream=codec_name,width,height,r_frame_rate,channels,sample_rate -of default=noprint_wrappers=1 assets\video\paian-intro.mp4
```
- **画面规格**：1920x1080 @ 30fps，H.264 (High Profile, yuv420p)
- **音频规格**：AAC 立体声 44.1kHz，192 kbps
- **时长与尺寸**：精确 38.000000 秒，文件大小 6.24 MB
- **容器特性**：写入 `+faststart`（moov atom 置顶，支持浏览器首帧即开秒播）
- **海报匹配**：刷新 `assets/images/paian-tour-poster.jpg` 为 1080p 高清海报帧，风格与 FileButler / Fluxion 完全一致。

### 2. 实机浏览器自动化断言（Playwright 实测）
通过 `Temp/verify_paian_features.mjs`、`scripts/smoke-videos.mjs` 以及 `scripts/verify-video-music-mutex.mjs` 进行全链路端到端自动化测试：
1. **产品卡片展示断言**：
   - 提取码正确解析为 `tq52`，下载直链包含 `1QRPC49ohJ0fbdrVw8sB--w`；
   - 版本公告胶囊渲染 `● v1.0.3 · 体检四页签 / 文风约束 全部 4 个版本 →`；
   - 视频封面海报正确引用 `assets/images/paian-tour-poster.jpg`。
2. **版本记录弹窗联动断言**：
   - 点击「全部 4 个版本 →」，详情弹窗正常弹出，`<details class="changelog">` 处于展开状态（`isOpen: true`）；
   - 全部 4 个历史版本（v1.0.3、v1.0.2、v1.0.1、v1.0.0）均按日期倒序排布。
3. **视频起播与 Web Audio 律动接管**：
   - 点击拍案视频起播按钮，视频流畅播放（`currentTime > 1.0s`，`paused: false`）；
   - 视窗外框 `.cover-box` 成功注入 `.is-playing-beat`，背景音乐在视频起播瞬间安全静默；
   - 离开视口时视频自动暂停并恢复背景音乐。
4. **控制台纯净度**：
   - 整个操作周期 0 `pageerror`，无任何未捕获异常。

---

## 四、产出物索引清单

- `assets/video/paian-intro.mp4`：拍案 1080p 30fps Apple 风格宣传片
- `assets/images/paian-tour-poster.jpg`：1080p 硬件视窗视频海报帧
- `Temp/render_paian_apple.py`：视频逐帧渲染脚本
- `Temp/make_paian_soundtrack.py`：拍案文学新古典配乐合成器
- `Temp/paian-apple-score.m4a`：拍案原声母带音频
- `Temp/verify_paian_features.mjs`：端到端自动化测试脚本
- `docs/screenshots/test-paian-card-capsule.png`：拍案卡片版本胶囊实测截图
- `docs/screenshots/test-paian-modal-changelog.png`：拍案全部版本弹窗展开实测截图
- `docs/screenshots/test-paian-video-playing.png`：拍案宣传片浏览器实机起播实测截图
