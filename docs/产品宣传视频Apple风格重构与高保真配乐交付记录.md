# 产品宣传视频 Apple 风格重构与高保真配乐 · 交付记录

> **交付日期**：2026-11-07  
> **核心目标**：彻底消除原有宣传视频的「AI 模板味与廉价 PPT 感」，针对已完善的两大核心项目 **FileButler**（本地智能文件管家）与 **Fluxion**（系统性能与帧生成工作台），依据 Apple 顶级产品发布片规格进行全管线视听重塑：
> 1. **Phase 1: 高水准原声配乐与全拟真 Foley 音效**：合成器算法重构为温暖 Rhodes 电钢琴、模拟纯净低音 Sub-bass（60~250Hz 精准下潜支撑站点 Web Audio `__BEAT` 3D 律动）、58%~61% 人性化有机 Swing 摇摆感、立体声卷积声学空间、机械键盘逐键敲击与 UI 物理质感音效。
> 2. **Phase 2: 苹果级动态视觉资产与交互特写**：像素级 macOS 高精度白色光标、三次贝塞尔平滑轨迹与按压震荡波、真实逐字打字输入、动态 Ken Burns 电影级微距特写推镜（Macro Zoom-in）、黑曜石/深空钛金舞台顶光与双层物理接触阴影、高科技转速表动态加速读数（120 → 280 FPS）。
> 3. **Phase 3: 1080p 30fps 最终合成与落地验证**：高规格 H.264 + AAC 编码导出 `assets/video/filebutler-intro.mp4` 与 `fluxion-intro.mp4`，同步生成 2.5D 硬件视窗海报帧，完成全自动化实机浏览器测试验证。

---

## 一、原有视频的「AI 模板味」诊断与破局策略

在此前生成的原型宣传片中，存在典型的 AI 生成廉价感与模板化特征：
1. **生硬的绿色模糊大光斑（Blur Blobs）**：画面各处漂浮着 `make_orb(920, 40)` 纯绿渐变模糊球，具有强烈的 AI 设计套版感；
2. **死板的固定镜头与静态截屏**：整片 38 秒镜头完全死锁，只是将截图平贴在中央，缺乏聚焦细节与层次呼吸；
3. **生硬的机械动效**：大字逐字弹跳采用硬编码的 `ease_back` 橡皮筋弹簧，浮夸而不稳重；
4. **劣质电音 BGM**：简单的锯齿波与蜂鸣合成器，缺乏真实器乐质感，没有与画面交互发生共振的拟真环境声（Foley）。

### Apple 产品片的视觉美学范式
- **黑曜石深空钛金舞台（Obsidian Titanium Stage）**：移除一切杂乱彩色光斑，采用极简深灰渐变底色（`#0a0c10` ~ `#12151d`），辅以顶部柔光聚光灯（Studio Rim Spotlight）与底部微弱地表反射；
- **真实原生视窗（Native Frameless Window）**：保持 Windows 软件原生真实界面，嵌于优雅圆角（R=20px）、1px 极细微金属倒角高光与双层物理接触阴影（紧致遮蔽阴影 + 远场漫反射阴影）的现代无边框视窗中，坚决不向 Windows 原生软件生硬移植 macOS 红绿灯伪控制栏；
- **拟真物理光标（Precision Apple White Cursor）**：真实 44px macOS 矢量箭头轮廓与方向阴影，沿三次贝塞尔缓动曲线划过屏幕，点击瞬间产生微米级按压形变（Scale 0.90）与微环扩散光晕；
- **动态 Ken Burns 微距特写（Macro Camera）**：镜头不再死板不动，而是随交互重心丝滑推进（1.0x → 1.35x），引导视线聚焦在核心功能点（搜索框、问答气泡、帧生成转速表）。

---

## 二、Phase 1: 高保真配乐与拟真音效工程

配乐由底层数学与信号处理算法全新生成（`Temp/make_apple_soundtrack.py`），分为两大针对性主题：

### 1. FileButler 配乐架构（116 BPM Neo-Soul 科技律动）
- **和声进程**：$D\flat\text{maj9} \to \text{Fm9} \to \text{B}\flat\text{m9} \to \text{E}\flat\text{9sus}$（温暖、知性、从容的科技管家质感）；
- **Rhodes 电钢琴物理模拟**：基频弦振叠加 2/3/4 次谐波，加入金属性 Tine 敲击瞬态（衰减 35ms）与微失谐合唱（$\pm 3 \text{ cents}$），并通过 4.2Hz LFO 调制立体声自相盘旋（Tremolo Auto-Pan）；
- **暖色 Sub-Bass**：基频精准下潜至 40~90Hz，并在底鼓击打瞬间触发 140ms 侧链闪避（Sidechain Ducking），留出干净瞬态；
- **有机 Swing 鼓组**：八分音符与十六分音符应用 59% 有机摇摆系数，紧致木质军鼓边击（Rimshot Clack）替代原有的廉价合成拍手；
- **全同步拟真 Foley 音效**：
  - **机械键盘敲击声**：在搜索与提问输入时，逐字触发带轻微音高抖动（$\pm 8\%$）的真实轴体声（2700Hz 触底清脆 Click + 135Hz 腔体共鸣 Thud）；
  - **UI Pop 微动效声**：光标点击聚焦、搜索框高亮时触发 600Hz → 1600Hz 极速对数变频气泡音；
  - **端侧模型推理谐波**：提问等待期间，微弱脉冲点阵伴随 220Hz 柔和泛音浮动；
  - **保险箱闭锁音（Vault Lock）**：在强调「默认不出门 · 100% 本机运行」时，触发厚重低音冲击与金属机械卡扣声。

### 2. Fluxion 配乐架构（118 BPM 黑曜石性能电音）
- **和声进程**：$\text{Cm9} \to \text{A}\flat\text{maj7} \to \text{E}\flat\text{maj7} \to \text{B}\flat\text{9}$（凌厉、深邃、高性能极客质感）；
- **高能合成贝斯**：低通截止频率设为 280Hz，带谐振泛音，十六分切分连续推进；
- **全息扫盘与加速升效（Tachometer Acceleration Riser）**：在展示 DLSS 帧生成由 120 帧飙升至 280 帧的关键段落（21.0s ~ 25.0s），音效频率沿对数曲线从 120Hz 连续跃升至 280Hz，并在触顶瞬间释放重击（Sub-impact Drop）与高保真水晶泛音钟声。

### 3. Web Audio `__BEAT` 频段实测验证
为了确保视频播放时，其原声音频能够直接接管站点的 Web Audio 分析器并精准驱动 3D Cymatics 粒子共振球，音频在 60~250Hz 的低频 RMS 能量被严格调校：
- **FileButler 乐轨**：峰值低频 RMS 达 247.09，在 38 秒内稳定产出 66 次有效 Beat Trigger（平均每秒 1.74 次重击，完美契合 116 BPM 节拍）；
- **Fluxion 乐轨**：峰值低频 RMS 达 255.22，产出 65 次有效 Beat Trigger；
- 播放期间，视窗容器 `.cover-box` 的 `--beat-pulse` 动态变量随重音实时起伏，驱动外框光晕与 3D 粒子球物理张合。

---

## 三、Phase 2 & Phase 3: 镜头编排与成片规格

### 1. FileButler（`filebutler-intro.mp4`，38 秒，3.22 MB）
| 时间段 | 镜头场景与运镜 | 视觉呈现与交互细节 | 声音与 Foley 同步 |
|---|---|---|---|
| `0.0s - 4.5s` | **Hero 开屏**<br>`zoom: 1.0` | 深空钛金舞台，FileButler 2.5D 硬件视窗优雅升起；大标题渐显与版本胶囊「v1.4.3 · 100% 本机运行」 | 温暖 Rhodes 和弦开场，柔和次低音铺底 |
| `4.5s - 11.5s` | **毫秒检索与真实打字**<br>`zoom: 1.0 → 1.30` | 镜头推近搜索栏。白色光标自右下角划出三次贝塞尔弧线精准命中搜索框并点击（扩散震荡波）；输入框高亮，逐字键入 `dm:本周 ext:pdf`；键入完毕瞬间，下方列表实时过滤出匹配合同高亮行 | 光标点击 Pop 声；12 次机械轴体逐键键击声（6.4s~8.1s）；检索结果弹出水晶钟声 |
| `11.5s - 17.5s` | **多维搜索语法展板**<br>`zoom: 1.0` | 镜头平滑回位。4 枚精致深色玻璃语法卡片错落滑入：`ext:pdf`、`size:>100mb`、`dm:本周`、`path:财务` | 节奏切分律动推进，轻微微动效点缀 |
| `17.5s - 24.5s` | **不打开文件·直接提问**<br>`zoom: 1.18` | 镜头聚焦知识库问答卡。用户提问气泡「这份合同的违约金是多少？」；神经脉冲微光点阵波形浮动；端侧模型回答卡片顺畅吸附入位，带确切引用角标「合同_2024.pdf · 第 3 页」 | 脉冲悬念静音；回答入位时重击与亮色钟鸣 |
| `24.5s - 29.5s` | **先出方案·点头才动**<br>`zoom: 1.0` | 视窗平滑切换至实机文件整理器。光标移动至「生成整理计划 (预览)」按钮触发点击；分类预检徽章点亮 | 按钮点击反馈音，低音稳健过渡 |
| `29.5s - 34.0s` | **默认不出门·100% 本机**<br>`zoom: 1.0` | 钛金安全盾牌与同心雷达环波；高对比大字「默认不出门 · 隐私零外泄」；Ollama 127.0.0.1 标志与 3 枚钛金保证标签 | 沉稳次重音冲击，厚重闭锁卡扣声 |
| `34.0s - 38.0s` | **Apple 式优雅收尾**<br>`zoom: 1.0` | 极简品牌 Logo、版本号与官网域名 `7stevejohn.github.io`，下划线平滑拉伸划过 | 尾奏 Rhodes 和弦余音绕梁，平稳淡出 |

### 2. Fluxion（`fluxion-intro.mp4`，38 秒，4.37 MB）
| 时间段 | 镜头场景与运镜 | 视觉呈现与交互细节 | 声音与 Foley 同步 |
|---|---|---|---|
| `0.0s - 4.5s` | **黑曜石性能工作台**<br>`zoom: 1.0` | 深色磨砂机身，闪电标志与「Fluxion · 系统调优与帧生成工作台」大字；实机仪表盘浮空展现 | 凌厉电音扫频与低频冲击起拍 |
| `4.5s - 11.5s` | **全平台游戏纳管**<br>`zoom: 1.18` | 视窗切换至游戏库。光标平滑移动至左侧游戏列表中的《赛博朋克 2077》，精准点击；主视图瞬时点亮《赛博朋克 2077》全景展板并亮起 RTX 3060 Ti 守护徽章 | 快速三连扫盘音效；游戏选中触发高亮 Pop |
| `11.5s - 18.5s` | **51 项体检·深度调优**<br>`zoom: 1.18` | 镜头推近性能优化面板。光标点击「一键优化」按钮；全系统 51 项参数检测绿灯闪烁转为「已生效」；安全还原点已创建气泡展开 | 机械按键脆响；优化生效确认音 |
| `18.5s - 27.5s` | **高潮：DLSS 帧生成飙升**<br>`zoom: 1.16` | 镜头微距推近。左侧**环形高科技转速表仪表盘**启动，弧光与数字自 `120 FPS` 飞速攀升至 `280 FPS`，帧生成延迟自 41.7ms 压至 17.8ms；右侧展现「代理模式 / 注入方案 / 原生 D3D12 入口」三大支撑架构；底部点亮「+133% 跃升 · 实测 120 → 280 帧」 | 频率自 120Hz 飙升至 280Hz 的飞轮加速声；触顶 280 帧时爆发强劲 Sub-drop 重音与极光泛音 |
| `27.5s - 33.5s` | **静默联动·零封号风险**<br>`zoom: 1.0` | 镜头拉伸至全屏仪表盘；展现实时 CPU/GPU 低负载；3 枚纯用户态安全胶囊点亮 | 节奏鼓点收敛，从容电音律动 |
| `33.5s - 38.0s` | **Apple 式优雅收尾**<br>`zoom: 1.0` | 闪电 Logo，Fluxion 字母排印，`7stevejohn.github.io` 域名下划线展开 | 尾音水晶钟鸣，平滑淡出 |

---

## 四、验证记录与回归测试

### 1. 媒体与视频完整性测试
使用 `ffprobe` 对最终产出物进行了全量元数据探测：
```powershell
ffprobe -v error -show_entries format=duration,size,bit_rate:stream=codec_name,width,height,r_frame_rate,channels,sample_rate -of default=noprint_wrappers=1 assets\video\filebutler-intro.mp4
ffprobe -v error -show_entries format=duration,size,bit_rate:stream=codec_name,width,height,r_frame_rate,channels,sample_rate -of default=noprint_wrappers=1 assets\video\fluxion-intro.mp4
```
- **FileButler 视频**：1920x1080 @ 30fps，H.264 (High Profile, yuv420p)，AAC 立体声 44.1kHz，时长精确为 38.000000 秒，尺寸 3.22 MB；
- **Fluxion 视频**：1920x1080 @ 30fps，H.264 (High Profile, yuv420p)，AAC 立体声 44.1kHz，时长精确为 38.000000 秒，尺寸 4.37 MB；
- 两个视频均写入 `+faststart`（moov atom 置于文件首部），保证网络加载毫秒级首帧起播。

### 2. 真实浏览器播放与互斥测试（Playwright 实测）
运行 `node scripts/smoke-videos.mjs` 与 `node scripts/verify-video-music-mutex.mjs`：
- **卡片视频布局与懒加载**：全部 4 个视频开屏尺寸、圆角与控制条状态均通过断言；
- **声学互斥测试**：背景音乐在视频点击起播瞬间（7ms 内）立即安全暂停，杜绝双音轨混杂；
- **原声律动接管测试**：视频起播时，Web Audio `AudioContext` 正常为 `running`，视窗容器成功获得 `.is-playing-beat`，`--beat-pulse` 随视频 BGM 节拍实时律动；
- **离开视口自动暂停与恢复**：用户向下滑动离开视频时，视频自动暂停并恢复背景音乐；重新滑回点击时无缝恢复；
- **全站脚本控制台**：无任何 JavaScript `pageerror` 或异常告警。

### 3. Reviewer 严格审查与细节缺陷修复记录（2026-11-07 强化修复）
在第二轮独立审查与端到端逐帧断言中，针对首版渲染结果发现了 6 处关键细节缺陷并已全部彻底修复：
1. **FileButler 场景 3 语法展板中文豆腐块（Tofu Box）**：
   - *问题现象*：`dm:本周` 与 `path:财务` 卡片中，中文字符显示为乱码方块 `dm:??`。
   - *根因分析*：`render_fb_apple.py` 中语法卡片误指定 `F_M44 = font(44, mono=True)`（`consola.ttf` 等宽英文字体），缺少 CJK 中文表意字符集。
   - *修复方案*：改用支持全中文 Noto Sans SC 的粗体字体 `font(42, "Bold")`，中英文符号统一高清渲染无任何乱码。
2. **Fluxion 场景 5 静默联动底层胶囊出界与侧边栏遮挡**：
   - *问题现象*：3 枚安全状态胶囊左边界落在 `bx = 180`，越过视窗左边缘（`WIN_X = 240`），并严重遮挡了游戏库侧边栏文本（`Wannabe Galgame God` 等）。
   - *根因分析*：固定绝对坐标计算未考虑 2.5D 视窗居中偏移与侧边栏安全区。
   - *修复方案*：重构为底部居中半透明磨砂毛玻璃 Dock 悬浮栏（`dock_w = 1040, dock_x = 540, dock_y = 836`），与左侧侧边栏物理完全隔离，视觉秩序井然。
3. **Fluxion 场景 3 光标点击空置暗区 & 优化成功 Toast 遮挡按钮**：
   - *问题现象*：光标在 `x = 532` 处点击了纯黑虚空，未能命中位于 `x = 643` 的蓝色「一键优化」按钮；点击后全屏绿色成功条直接横亘遮挡在 5 枚操作按钮正上方。
   - *根因分析*：视口缩放与位移未代入光标归一化坐标计算；弹窗定位在按钮区正中。
   - *修复方案*：将光标落点精准校准至按钮几何中心 `(643, 462)`；优化成功通知改为 macOS 原生右上角精致 Toast 浮窗（`toast_y = 345`），保留按钮操作区域完全可见。
4. **FileButler 场景 5 智能整理光标误触路径栏**：
   - *问题现象*：光标点击坐标为 `y = 933`，落在上方的目录路径文字行上，而非目标绿色按钮。
   - *根因分析*：垂直坐标未考虑界面布局调整后的按钮实际中心高度（`y = 1034`）。
   - *修复方案*：校准光标最终着陆坐标为 `(626, 1034)`，精准直击「生成整理计划 (预览)」胶囊按钮中央。
5. **FileButler 场景 2 检索键入时光标原位静止遮挡文字**：
   - *问题现象*：光标在键入期间一直僵死在 `(sb_x + 50, sb_y + 18)`，直接覆盖在正在输入的文字上方。
   - *修复方案*：键入阶段让光标跟随输入流平滑向右微移至 `sb_x + 280, sb_y + 60`，随后平滑滑向高亮匹配项，打字过程字迹一览无余。
6. **Fluxion 场景 2 游戏库虚假选中与画面不符**：
   - *问题现象*：光标点击网格任意卡片后，界面跳至不相关的独立游戏「Chill with You Lo-Fi Story」，与文案声称纳管《赛博朋克 2077》相违背。
   - *修复方案*：全新生成真实的《赛博朋克 2077》深色详情面板（`Temp/flux-shots/real_dark_p2_cp2077.png`），光标精准移动并点击列表中的《赛博朋克 2077》项（`WIN_X + 848 * scale, WIN_Y + 36 + 645 * scale`），视图无缝切换至匹配详情，逻辑完全闭环。

### 4. 消除 macOS 虚假红绿灯装饰，还原 Windows 原生无边框圆角视窗（2026-11-07 体验优化与对齐加固）
用户明确反馈核心需求为「仿照 Apple 顶级发布会与宣发短片的电影级视听质感（影棚顶光、钛金舞台、三次贝塞尔精密光标、微距特写推镜、Rhodes 律动与 Foley 环境声设计）」，而非「生硬地将 Windows 软件界面伪装成带有 macOS 红黄绿红绿灯圆点（● ● ●）的 Mac 窗口」。

针对该反馈与独立二次审查中发现的边缘对齐细节，对渲染管线与所有动画图层进行了彻底优化：
1. **彻底拔除伪 macOS 顶栏与红黄绿三色圆点**：
   - 清除 `Temp/render_fb_apple.py` 与 `Temp/render_fluxion_apple.py` 的 `build_hardware_window()` 中硬编码的 `header_h = 36` 标题栏以及 `dots = [(24, 18, ...), (44, 18, ...), (64, 18, ...)]`。
   - 改用基于 `ImageDraw.Draw(mask).rounded_rectangle` 遮罩的高精度无边框圆角（R=20px）硬件裁切，保留微金属 1px 倒角边框（`outline=(255, 255, 255, 36)`）与豪华双层软阴影，真实保留并呈现 FileButler 与 Fluxion 自身原生优雅的 Windows Fluent 顶栏与深浅色界面。
2. **全局垂直坐标系统去偏与交互微动效像素级校准**：
   - 移除伪标题栏后，软件主界面内容上移 36px 回归几何基准。
   - **FileButler**：
     - 搜索框覆盖图层：`sb_y = WIN_Y + int(76 * scale)`（移除 `+ 36`），自动对齐搜索打字输入框、闪烁光标、光标进入与滑行动画；
     - **搜索结果高亮行对齐修复**：此前 `hl_y` 误沿用相对偏置 `sb_y + sb_h + 96`，导致绿色高亮框误盖在「文件名 类别 大小 修改时间」表头字段上；修正为 `hl_y = WIN_Y + int(248 * scale)`，高亮矩形与「匹配: 本周修改 · PDF 文档」胶囊精准垂直居中包络首行文件结果，光标平滑滑入行中；
     - 智能整理器按钮：按钮点击最终落点校准为 `(WIN_X + int(326 * scale), WIN_Y + int(628 * scale)) = (625, 974)`，光标与扩散微环精准正中「生成整理计划 (预览)」绿色按钮。
   - **Fluxion**：
     - **游戏库网格点击中心化**：Cyberpunk 2077 卡片黄色海报区域范围为 X=[836, 1004]、Y=[558, 721]，此前 `cp_card_x = WIN_X + int(848 * scale)` 落在靠近左边界接缝处，现校准为卡片几何中心 `cp_card_x = WIN_X + int(920 * scale)`、`cp_card_y = WIN_Y + int(640 * scale)`，点击正中海报角色中心；
     - **滑行终点与操作按钮校准**：选中后光标平滑滑向「安装并应用」按钮中心 `drift_p1 = (WIN_X + int(390 * scale), WIN_Y + int(693 * scale))`；
     - **就绪状态脉冲胶囊视口内复位**：此前胶囊放置于 `WIN_Y + int(838 * scale) = 1024`，因特写镜头 `cam_zoom = 1.18`（视口底部截断线为 997.6）导致胶囊完全出界不可见；现将其重构收纳至右侧「此游戏的适配方案」卡片内操作按钮右侧安全区 `(WIN_X + int(690 * scale), WIN_Y + int(682 * scale))`，在特写镜头下 100% 完整可见且与操作按钮相得益彰；
     - 性能优化面板：一键优化按钮点击坐标调整为 `btn_y = WIN_Y + int(174 * scale)`，通知 Toast 浮窗调整至 `toast_y = WIN_Y + 39`，完美贴合原生右上角且避开操作区。
3. **海报与视频资产重构并同步验证**：
   - 修复 Windows Python 3.14 环境下 Pillow `save()` 传入 `pathlib.Path` 对象的兼容性问题，统一封装 `str(path)`；
   - 重新渲染 1080p 30fps 最终母带视频 `assets/video/filebutler-intro.mp4`（3.21 MB）与 `assets/video/fluxion-intro.mp4`（4.38 MB）；
   - 刷新视频封面海报 `assets/images/filebutler-tour-poster.jpg` 与 `assets/images/fluxion-tour-poster.jpg`；
   - 运行自动化回归测试脚本 `node scripts/smoke-videos.mjs`、`node scripts/verify-video-music-mutex.mjs` 与 `node scripts/test-product-click.mjs`，确保播放、互斥和 Web Audio 律动 100% 稳定通过。

---

## 五、交付物清单

1. **宣传视频成品文件**：
   - `assets/video/filebutler-intro.mp4`（FileButler 苹果风重制版，1080p 30fps 38s，3.21 MB）
   - `assets/video/fluxion-intro.mp4`（Fluxion 苹果风重制版，1080p 30fps 38s，4.38 MB）
2. **高规格海报帧（Cover Posters）**：
   - `assets/images/filebutler-tour-poster.jpg`（1080p 2.5D 原生无边框圆角封面）
   - `assets/images/fluxion-tour-poster.jpg`（1080p 2.5D 原生无边框圆角黑曜石封面）
3. **合成与配乐源代码（可重现资产）**：
   - `Temp/make_apple_soundtrack.py`（Apple 级合成器与 Foley 音频生成脚本）
   - `Temp/render_fb_apple.py`（FileButler 苹果风 1080p 逐帧渲染脚本）
   - `Temp/render_fluxion_apple.py`（Fluxion 苹果风 1080p 逐帧渲染脚本）
   - `Temp/gen_cp_details.py`（真实《赛博朋克 2077》详情面板资产生成脚本）
   - `Temp/fb-apple-score.m4a`（FileButler 38s 无损母带音轨）
   - `Temp/fluxion-apple-score.m4a`（Fluxion 38s 无损母带音轨）
4. **技术交付记录**：
   - `docs/产品宣传视频Apple风格重构与高保真配乐交付记录.md`（本文档）
