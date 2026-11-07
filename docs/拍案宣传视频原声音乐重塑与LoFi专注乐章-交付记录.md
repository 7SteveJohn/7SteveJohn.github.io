# 拍案宣传视频原声音乐重塑与 Lo-Fi 专注乐章 · 交付记录

> **交付日期**：2026-11-08  
> **涉及产品**：拍案（PaiAn · 纯本地网文创作工作台，项目 ID: `paian`）  
> **涉及文件**：
> - `Temp/make_paian_soundtrack.py`：拍案专属配乐合成器（全面重构）
> - `Temp/paian-apple-score.m4a`：拍案原声音轨母带（88 BPM Cozy Lo-Fi Chillhop）
> - `assets/video/paian-intro.mp4`：拍案 1080p 30fps 官方宣传片（重新封装无损音画同步）
> - `sw.js`：Service Worker 缓存版本升级至 `sevenjohn-v247`
> - `docs/screenshots/`：实测回归验证截图更新

---

## 一、问题背景与根因定位（Root Cause）

### 1. 用户反馈
用户反馈此前在 `Temp/make_paian_soundtrack.py` 中为「拍案」宣传片合成的背景音乐听感极为诡异惊悚（"跟鬼叫一样"）。

### 2. 根因声学诊断
经音频工程与合成器源码回溯排查：
- **致命缺陷源**：旧版合成器中的 `string_pad_chord()` 模块，采用纯正弦波叠加持续的多声部复音，并挂载了 **4.6Hz 持续频偏 Vibrato LFO**（`vibrato = 1.0 + 0.004 * np.sin(2 * np.pi * 4.6 * t)`）；
- **声学心理学原理**：在数字音频合成中，连续发声的低频正弦波与慢启动弦乐在带有 4~5Hz 频率颤动时，加上暗色小九和弦（`Am9`、`Em7/G`），其包络与泛音特征与悬疑恐怖片中的**特雷门琴（Theremin）及鬼哭哀号**完全同频；
- **场景严重错位**：拍案是面向网文作者沉浸写作的专注工作台，阴冷暗黑的弦乐颤音完全破坏了写作的温馨、宁静与专注心流。

---

## 二、视听重塑方案与声学架构

根据写作专注与 Apple 创意工具（Behind the Mac / 咖啡馆沉浸写作流）的审美标准，将配乐全面重构为 **Cozy Lo-Fi Study Beats / Warm Mellow Chillhop**。

### 1. 彻底拔除惊悚声源
- **100% 拔除 `string_pad_chord()` 及其 4.6Hz Vibrato LFO**；
- 杜绝一切长音正弦波颤音与惊悚无底无人声嗡鸣；
- 所有乐器均采用物理自然的指数衰减（Exponential Decay），告别机器发音感。

### 2. 全新乐器与和声设计（88 BPM）
- **曲风与速度**：88 BPM Cozy Lo-Fi Chillhop（Lo-Fi 嘻哈/咖啡厅学习专注节拍）；
- **和声进行（8 小节温暖王道爵士流行循环）**：
  $$\text{Fmaj9} \to \text{G6} \to \text{Em7} \to \text{Am9} \to \text{Dm9} \to \text{G13} \to \text{Cmaj9} \to \text{Am7}$$
  全段和弦充满大七度、大九度、十三度等明亮温暖且富有回味的爵士复调，彻底告别幽暗与压抑，宛若阳光透过百叶窗照在写字台上；
- **双层复古键盘（Warm Rhodes + Felt Grand Piano）**：
  - **Vintage Rhodes 电钢琴**：金属簧片敲击（Tine）泛音瞬态，加温润基频与次八度，经 3400Hz 温暖低通滤波器消除数字毛刺；
  - **Felt 毛毡大三角钢琴**：毛毡击弦瞬态与木质共鸣箱体，叠合自然三弦微调合唱；
  - **拟人化微扫弦（Strum Spread 18ms）**与第 2.5 拍爵士切分重击（Syncopated Stab），极富律动张力。

### 3. 舒适节奏组与次低音（Chillhop Boom-Bap & Literary Sub-Bass）
- **Lo-Fi Kick（低音鼓）**：105Hz $\to$ 52Hz 指数扫频，柔和丰满的 54Hz 次低频冲量，饱满击中 Web Audio 60~250Hz 分析窗，杜绝硬敲击刺耳声；
- **Wooden Rimshot / Brush Snare（木质边击/毛刷军鼓）**：340Hz 木质击打与 1500~5200Hz 细腻沙鼓声线，精准落在第 2 拍与第 4 拍；
- **Lazy Swing Shaker（慵懒摇荡沙锤）**：八分音符赋予 54% MPC 摇摆延迟（Swing），强弱交替律动；
- **Vinyl & Room Ambiance（胶片黑胶温床）**：-40dB 极微黑胶颗粒底噪与随机微弱爆鸣，营造安心专注空间氛围；
- **Literary Sub-Bass（文学次低音）**：45~80Hz 纯净次低频，跟进和弦根音与五音行走，为耳机与大音响提供从容温厚的低频支撑。

### 4. 极致毫秒级 Foley 拟音（与视频分镜精确咬合）
| 时间戳 | 分镜画面动作 | 拟声音效实现 | 听感特征 |
|---|---|---|---|
| `0.85s` | 开屏视窗升起 | `foley_ui_pop(750Hz)` | 柔和气泡微弹音 |
| `5.80s` | 光标移至编辑器点击 | `foley_ui_pop(1200Hz)` | 清爽聚焦微击 |
| `6.20s - 9.75s` | 正文逐字键入（24 字） | `foley_key_clack(pvar)` | 24 次带随机音高微差的 ASMR 级客制化机械轴体敲击与触底回弹 |
| `10.10s` | 底部字数保存落定 | `bell_chime(1318.51Hz)` | E6 纯净微风铃叮音 |
| `13.20s` | 点击「批量生成草稿」 | `foley_ui_pop(1100Hz)` | 按钮按压触感 |
| `13.60s` | AI 创作流浮现 | `bell_chime(880Hz)` | A5 水晶微光泛音 |
| `15.50s` | 点击「确认采纳」 | `foley_ui_pop(1350Hz)` | 确认采纳清脆按压 |
| `15.65s` | 绿光闪烁快照备份 | `bell_chime(1760Hz)` | A6 确认通透钟鸣 |
| `19.80s` | 场景卡片悬浮拖动 | `foley_ui_pop(950Hz)` | 卡片拾取 Pop |
| `20.20s / 20.80s` | 卡片位置滑动互换 | `foley_paper_glide(0.45s)` | 真实纸质卡片滑动机理摩擦 |
| `21.80s` | 磁吸卡扣到位入座 | `wood_rimshot(0.14s) + pop` | 清脆卡扣合拢回弹 |
| `25.50s` | 人物网络高潮展开 | `sub_impact(2.2s) + bell(1046.5Hz)` | 温暖次低音冲击 + C6 宏大泛音 |
| `27.2s / 28.6s / 30.2s` | 人物因果连线延伸 | `bell_chime(E6, G6, C7)` | 星象节点共振鸣响 |
| `32.60s` | 离线本地硬盘锁合 | `sub_impact(1.6s)` | 沉稳闭锁安心感 |
| `34.20s` | Apple 式收尾尾奏 | `bell_chime(D6, 2.6s)` | D6 钟声自然衰减淡出 |

---

## 三、验证记录与数据指标

### 1. Web Audio `__BEAT` 律动响应与驱动能力
经音频分析窗实测：
- **Max Bass RMS**：`564.67`（完全满足 `> 200` 要求）；
- **Beat Triggers**：`49` 次（平均每秒 1.3 次精准重音冲击）；
- **律动表现**：在 `http://127.0.0.1:8328/` 实机播放时，拍案视窗外框 `.cover-box` 瞬间获得 `.is-playing-beat` 类，`--beat-pulse` 随 Chillhop 鼓点呈现极为自然、富有弹性的呼吸微光，背景音乐安全静默。

### 2. 自动化回归测试（Playwright 实测）
1. **`Temp/verify_paian_features.mjs`**：
   - 卡片下载直链 `1QRPC49ohJ0fbdrVw8sB--w` 与提取码 `tq52` 校验通过；
   - 卡片胶囊与详情弹窗历史 4 版本联动校验通过；
   - 拍案宣传视频起播测试：`paused: false, currentTime: 1.14s, duration: 38s, hasBeatClass: true`；
   - 结果：`=== ALL PAIAN VERIFICATIONS PASSED WITH 100% SUCCESS ===`。
2. **`scripts/smoke-videos.mjs`**：
   - 4 部产品视频卡片全部正常：`363x204 controls=false fit=cover`；
   - 结果：`PASS 无 pageerror`。
3. **`scripts/verify-video-music-mutex.mjs`**：
   - 背景音乐播放 $\to$ 视频起播音乐暂停 $\to$ 视口滚动离开自动暂停视频并恢复音乐 $\to$ 滚回重看，全链路 100% 互斥；
   - 结果：`=== ALL TESTS PASSED WITH 100% SUCCESS ===`。

### 3. 产物与流媒体参数
- **文件路径**：`assets/video/paian-intro.mp4`
- **视频流**：1920x1080 @ 30fps，H.264 High Profile，无损保留
- **音频流**：AAC 44.1kHz 立体声，192 kbps，时长精确 38.000000 秒
- **封包参数**：`+faststart`（moov atom 置顶，秒开播放）
