# 星河随乐而舞 · 首页深空背景（D:\HTML 项目版提示词）

> **优化说明（相对通用版）**
> ① 通用版写的是"部署于 Hexo / VitePress 静态博客、输出完整单页 HTML、全部 CSS/JS 内嵌" ——
> 与本项目实况**完全不符**：`D:\HTML` 是**零构建手写静态站**，资源本就分离在 `css/`、`js/`，
> 已有 `js/cosmos.js`（1477 行）在跑。本版改为**在本项目内演进的工单**。
> ② 补上**落位与集成契约**（真文件路径、真 DOM id、真类名、真常量），AI 不必再自行探查。
> ③ 补上**三层动态层的共存让位规则**（WebGL 舞台 / 旧光粒子 / 星河），避免互相打架白烧 CPU。
> ④ 音频端从"自己写频谱解析"改为**沿用 `player.js` 已产出的 `window.__BEAT`**，规避重复
> `createMediaElementSource` 直接报错的老坑。
> ⑤ 补上**发布配套**（`sw.js` 版本号、`gen-rss`）与**项目既有验收方式**（playwright 扫运动量）。
> ⑥ 原有渲染硬约束、音频映射、禁止清单一条未删。

---

## 0. 项目实况（免探查速查）

| 项 | 实况 |
|---|---|
| 形态 | **零构建手写静态站**：无 `package.json`、无 npm 构建；双击 `index.html` 即可运行 |
| 样式 | Tailwind **预编译**为 `assets/vendor/tailwind.css`；自有样式在 `css/style.css` + `css/cosmos.css` |
| 脚本 | 原生 JS，`index.html` 末尾按序 `<script defer>`；仅 `js/gl-stage.js` 是 `type="module"` |
| 依赖 | **全部自托管**（`assets/fonts/inter.css`、`assets/vendor/{lucide,marked,highlight}`），**不得引 CDN**（大陆访问会阻塞） |
| 部署 | GitHub Pages：push `main` 自动发布到 `https://7stevejohn.github.io/`（可选 Vercel） |
| 离线 | PWA：`sw.js` 中 `const CACHE = 'sevenjohn-v35'` |
| 数据 | 与界面解耦：`js/projects.js`（作品）/ `js/articles.js`（文章）/ `js/status.js`（状态） |
| 存储 | 访客本地键统一 `sj.` 前缀，不上传任何数据 |
| 无障碍 | 全站必须尊重 `prefers-reduced-motion` |
| 页面 | `index.html`（博客首页，星河已接入）、`cosmos-home.html`（单文件演示页）、`404.html`、`holo-card/holographic-card.html` |

**已存在的动态层（三层，必须共存不打架）**

| 文件 | 角色 | 现状 |
|---|---|---|
| `js/gl-stage.js`（1013 行，WebGL/three，`#gl-stage`） | 首屏 3D 能量球舞台 | 已有"让位强度"：首屏 `{ sel:'#home', dim:0.34 }`，滚出首屏平滑回到 1；**主体实体不吃 dim** |
| `js/particles.js`（113 行） | 旧背景光粒子 | 第 15 行已实现让位：`if (document.getElementById('cosmos-canvas')) return;`；另暴露 `window.particlesParty(sec)` 供 Konami 彩蛋调用 |
| `js/cosmos.js`（1477 行） | **本任务的星河背景** | 五模块齐备，见下节 |
| `js/player.js`（318 行） | 左下角歌单播放器（`music/` 11 首） | `fftSize 1024`、复用 `BEAT_ARR`，产出 **`window.__BEAT`** 供 `gl-stage.js` 与 `cosmos.js` 共享 |

## 1. 任务定位

在既有 `js/cosmos.js` 的骨架上**外科手术式演进**首页深空背景：

- **主落位**：`js/cosmos.js`（逻辑）+ `css/cosmos.css`（样式）+ `index.html`（接线）。
- **需要单文件演示页时**才另出 `cosmos-home.html`（自成一体、内嵌全部 CSS/JS）。
- **不要重写**：除非某项硬约束确实缺失，否则保留现有模块结构、变量命名与注释风格。

## 2. 现有实现（改动前必须先看懂，能复用就不重造）

`js/cosmos.js` 主干（注释已全中文，沿用其风格）：

- 五模块索引：**①噪声采样 ②curl 流场采样 ③音频频谱解析 ④涡流力场 ⑤渲染循环**。
- `CFG` 已含三档倍率与全部后处理参数，**新增效果一律挂进 `CFG`，不要把魔数散在代码里**：
  `density / intensity / motion`（=1.0）、`fpsActive 48`、`fpsBlur 16`（失焦）、`fpsHidden 5`（后台）、
  `trailQuiet 0.26`、`trailLoud 0.075`、`bloomEvery 3`、`bloomAlpha 0.075`、
  `caAlpha 0.030`（色差）、`grainAlpha 0.050`（颗粒）、`vignette 0.92`（暗角）、`introMs 3800`（入场）。
- 粒子分层数组：`layer.far / fiber / arm / dust / faint / bright / mote / mist / ring`。
- 音频：本地曲目（`<audio id="cosmos-audio">`）与站点歌单**互斥让位**，站点歌单开播即交出主导权。
- 生命周期：`blur` → `fpsBlur`；`visibilitychange` 后台 → `setInterval(1000/fpsHidden)` 而非 rAF。
- `prefers-reduced-motion`：**静默走完 `introMs` 入场再彻底停笔**（`stopped` 置位，帧首不再续帧）。

**集成契约（index.html 侧，改 id / 类名会连带改坏，勿动）**

| 位置 | 内容 |
|---|---|
| 画布 | `<canvas id="cosmos-canvas" aria-hidden="true">`（fixed 铺满视口，压在所有内容之下） |
| 样式 | `<link rel="stylesheet" href="css/cosmos.css" />` |
| 控制台 | `<div id="cosmos-dock">` → `#cosmos-panel`（`#cosmos-fold` 折叠 / `#cosmos-file` 上传 / `#cosmos-vol` 音量 / `#cosmos-reset` 重置 / `#cosmos-state` 状态文案）→ `#cosmos-chip` 收起态圆钮 |
| 音频元素 | `<audio id="cosmos-audio" preload="none">` |
| 脚本 | `<script src="js/cosmos.js" defer></script>` |

`css/cosmos.css` 已有类名：`.cosmos-dock .cosmos-panel .cosmos-head .cosmos-title .cosmos-body .cosmos-file .cosmos-row .cosmos-lab .cosmos-range .cosmos-btn .cosmos-state .cosmos-chip`；
**必留这条补丁**（自定义 `display` 会盖掉 `[hidden]`）：

```css
.cosmos-panel[hidden], .cosmos-chip[hidden] { display: none; }
```

## 3. 渲染硬约束（写进代码逻辑，禁止简化）

1. 星云与星光一律 `globalCompositeOperation = 'lighter'`（加法发光）。
2. **主画布禁止 `clearRect`**，采用衰减擦除：`rgba(0,2,7,trailAlpha)` 半透明底色填充保留残影；
   `trailAlpha` 由低频实时插值 —— 安静 `0.26` ↔ 重鼓 `0.075`（低频越强残影越长）。
   **仅离屏缓冲可以 `clearRect`**（如 bloom 缓冲），且要在注释里点明这一点。
3. **动态涡流力场**：常驻 **3~6 个漫游漩涡源**（位置沿利萨如曲线缓慢漫游，不固定），
   强度/半径读频谱实时插值；对星云絮团与尘埃同时施加**切向扭转 + 径向排斥**，按距离衰减；
   产出局部卷曲、撕扯、断裂后**缓慢融合**的湍流。
   涡流结果作为**期望速度注入**（`v += (vTarget - v) * k`），不要直接累加；
   被撕开后的愈合靠**归位弹簧**（系数越小愈合越慢）。漂移基准沿用 **curl noise**（疏网格每 2 帧更新，无散度）。
4. **逐帧色彩扰动**：颜色在紫-靛-洋红间平滑 lerp，**严禁色块生硬跳变**。
5. **后处理禁止每帧高斯模糊**：每 `bloomEvery`(3) 帧做一次体积辉光，以 `bloomAlpha`(0.075) 叠回；
   随后依次：胶片颗粒 → 暗角 → 微弱镜头色差（红/蓝通道 ±偏移）。暗角与冷蓝环境辉光用 CSS 静态层实现，零每帧开销。
6. **暗色尘埃带必须用 `source-over` 画在云絮之前** —— 画在之后会被加法盖掉，星云立刻退化成均匀色块。
7. 环境底色 `#000007`（不是纯黑）；整幅叠加极低强度静态颗粒，消除 CG 塑料感。

## 4. 四层宇宙分层（远景 → 近景，每层独立噪声采样）

| 层 | 内容 | 形态与色彩 | 音频响应 |
|---|---|---|---|
| 1 远景巨型分子云（`layer.far` + `layer.fiber`） | 大尺度 simplex 2D 定轮廓的舒展分子云 | 内部密布细长柔和的**暗色气体纤维沟壑**；厚薄不均，有的浓密隆起、有的稀薄消散成**空洞缺口**；低饱和暗紫罗兰 / 灰靛蓝 / 灰紫青，局部零星极淡酒红，**禁止鲜亮艳色** | 低频：整体外扩、纤维拉伸；中频：沟壑顺涡流缓慢扭曲；**高频几乎不影响本层**；安静后回缩 |
| 2 中景旋臂星团（`layer.arm`，视觉主体） | **两套频率噪声叠加**：大噪声定絮团轮廓，高频小噪声刻画细碎丝状电离气流 | 松散螺旋旋臂**由无数间断云絮拼接，不是平滑整条带子**；旋臂上密布致密发光云核 + 柔和弥散光晕；**旋臂之间必须有深色星际尘埃带**（半透明深灰紫的暗色阻隔条，吸收光线制造明暗对比 —— 关键细节，不能省）；蓝-紫-洋红柔和渐变，云核处饱和度适度提高 | 低频：旋臂整体外甩、云核瞬间增亮、**尘埃带被拉扯变形**、生成向外扩散后衰减的环形冲击波（`layer.ring`）；中频：漩涡角速度提高、旋臂缠绕回旋、云核明暗呼吸；低谷：撕扯停止、絮段缓慢聚拢 |
| 3 近景星辰（`layer.faint` / `layer.bright` / 流星） | 三类星体，叠加星光衍射 | ①**暗弱繁星**（数量最多）：极小尺寸、低亮度、**闪烁相位与速度逐星随机**，绝不整屏同步眨眼；②**明亮恒星**：多层嵌套径向柔化光晕，星芒是**柔和弥散的四向微光，不是尖锐硬十字**；③**瞬时流星星屑**：仅高频触发、短生命周期、拖尾加法叠加淡出、轨迹末端散落一簇转瞬即逝的星屑。**所有星辰受涡流微弱拖拽**，顺附近星云流动方向偏移，不孤立漂浮 | 重鼓：亮星光晕半径放大、亮度冲高后平滑回落；中频：全场星辰缓慢呼吸明暗；高频：**只扰动本层** |
| 4 冷尘埃雾霭（`layer.dust` / `layer.mote` / `layer.mist`） | 亚像素级微小半透明尘埃微粒 | 缓慢无规则飘荡；整幅流动一层轻薄冷色雾霭；被涡流带动；**柔化星云边缘、填充深空空隙**，营造真实宇宙空气感 | 中频：流动速度加快 |

## 5. 音频律动映射（沿用 `window.__BEAT`，全部运动 lerp 平滑，严禁硬跳变）

**数据源（关键，照做）**

- **站点歌单播放中** → 直接读 `player.js` 已经算好的 `window.__BEAT`（`{ level, mid, treble, slow, rise, ctx }`）。
  **不要对同一个 `<audio>` 再 `createMediaElementSource`**（浏览器会直接报错），也不要重复解析频谱。
- **用户上传本地曲目** → 由 `cosmos.js` 自己的 `<audio id="cosmos-audio">` + 自有 AnalyserNode 解析；
  站点歌单一开播即让出主导权，**两首歌绝不同时发声**。
- 信号端参数与 `player.js` 对齐：`fftSize = 1024`（每 bin ≈47Hz，鼓点区 0~370Hz 落在最低 8 个 bin）、
  `smoothingTimeConstant = 0.2`（默认 0.8 会把鼓点抹平）；
  中频取 10~60 bin、高频取 70~210 bin（照抄 `player.js` 的划分，别另立一套）。
- 节拍判据用**相对上一帧的涨幅** `rise > max(0.012, 慢均值*0.07)`，**不要**与峰值/慢均值比较
  （很多曲子低频全程高电平，比较法会饱和到永不触发），外加 220ms 不应期。
- 包络快攻慢放：`a += (raw - a) * (raw > a ? 0.30 : 0.055)`。

| 频段 | 触发效果 |
|---|---|
| 低频（重鼓） | 整体外扩；涡流强度瞬间拉高；径向排斥增强；絮段拉伸撕裂；云核爆亮；环形冲击波；星芒放大；**残影拖尾变长**（`trailAlpha` 下降） |
| 中频（旋律/人声/乐器） | 漩涡角速度提升；旋臂持续回旋缠绕；尘埃纤维顺涡流扭曲；全场星辰呼吸明暗；雾霭流速加快 |
| 高频（细碎音符） | 瞬时星屑迸发；短流星划过；**只扰动近景层**，远景几乎不受影响 |
| 静默低谷 | 涡流平滑衰减；被撕开的絮段缓慢聚拢愈合；速度回落；保留微弱呼吸闪烁；深空回归静谧 |

## 6. 共存与让位规则（本项目特有，别漏）

1. 首屏已有 WebGL 3D 舞台（`gl-stage.js`）：星河是首屏主角，**3D 舞台按既有 `dim:0.34` 退居背景**；
   `dim` 只作用于环境件与画布 opacity，**不作用于主体实体**。
2. 旧光粒子层（`particles.js`）检测到 `#cosmos-canvas` 存在时**自行退出**，不要两层叠着跑。
3. 两套音频链路互斥（见第 5 节）；`#cosmos-state` 的状态文案要如实反映"本地曲目 / 站点歌单 / 静音"。
4. Konami 彩蛋（`window.particlesParty`）走的是光粒子层，星河不参与，别抢它的调用权。

## 7. 项目工程约定（每条都会被打回）

- **零外部依赖**：不引 CDN、不引 npm 包、不加构建步骤；图标用自托管 Lucide，字体用自托管 Inter。
- 访客本地数据一律 `sj.` 前缀。
- 完整尊重 `prefers-reduced-motion`（面板动画也要一并关掉）。
- 移动端适配：窄屏下星际密度与粒子上限按面积折算；右下角面板缩一档、**不压正文**。
- 新增可调项挂进 `CFG`；新增注释沿用现有中文风格与模块编号。
- 交付前自查：`index.html` 直接双击可跑；控制台无报错；标签页切后台 CPU 占用明显下降。

## 8. 发布配套（改完必须做）

| 动作 | 命令/文件 |
|---|---|
| 静态资源有变 → 提升缓存版本 | 改 `sw.js`：`const CACHE = 'sevenjohn-v35'` → `v36` |
| 动了文章数据 | `node scripts/gen-rss.js` 重新生成 `rss.xml` / `sitemap.xml` |
| 动了部署配套 | 按 `README.md` 的"部署配套文件一览"表同步更新 |
| 发布 | `git add . && git commit && git push`（Pages 自动部署） |

## 9. 验收标准（本项目既有方式 + 探针断言）

**既有方式**：`scripts/gl-motion-scan.mjs` 是本项目的运动量扫描范式 ——
`playwright-core` + `channel:'msedge'` + `--enable-unsafe-swiftshader`，视口 **1440×900**，
逐个滚动到 `#home / #metrics / #products / #philosophy / #about`，每处间隔 700ms 截两张图对比字节数，
并读页面探针状态。星河验收**照此模式**写一份同类脚本即可。

**探针断言**（页面已内置 `window.__COSMOS`，扩展而不要另起名字）：

- `__COSMOS.info()`：`counts` 八层均有粒子、`vortex` 落在 3~6、`frame` 持续增长、`intro` 收敛到 1；
- `__COSMOS.feed(b, m, t)` 免音频喂频谱后：低频被吸收、`ring` 计数上升、高频触发流星/星屑、
  松手 2 秒后各频段平滑回落到 < 0.05；
- **画布不是纯黑也不是过曝**：全画布等步长抽样亮度均值落在 **4~12 / 255**，暗部（<12）> 80%，亮部（>180）< 1%；
- **滚动后画布锁在视口原点**：`getBoundingClientRect().top === 0` 且页面已滚动 > 100px；
- 间隔 500ms 两次像素签名不同（持续流动）；
- `prefers-reduced-motion` 下停笔后，**帧号与像素签名完全一致**；
- 无 console error / pageerror。

## 10. 明确禁止清单

- 禁止生成光滑无内部纹理的纯色烟雾星云；
- 禁止所有星星同步闪烁；
- 禁止硬十字尖锐星芒；
- 禁止对主画布 `clearRect` 清空；
- 禁止使用外部图片、贴图、CDN 资源（全部纹理靠 Simplex 噪声程序生成）；
- 禁止出现实体行星、恒星球体（只保留星云、星团、星辰、星尘）；
- 禁止强烈刺眼高光（所有发光区域必须有柔和弥散衰减）；
- 禁止把"星河"做成本项目之外的新站点 / 新构建流程（本项目零构建，别引入 npm）。

## 11. 五个已知实现坑（务必规避）

1. **停循环要停"帧尾续帧"**：`cancelAnimationFrame` 清句柄不够，在途那一帧末尾还会自己排下一帧。
   加 `stopped` 标志在帧首判（本项目已这么做，别改坏）。
2. **`prefers-reduced-motion` 不是"少跑几帧就停"**：入场只走到六成会留下半成品；
   正确做法是静默走完 `introMs` 再彻底停笔。停笔后任何改变画面的操作（resize / 重置）都要补排一帧。
3. **星体"类别标志"不能与"逐帧亮度"共用同一属性名**：写成 `bright: isBright`（布尔）之后每帧
   又 `bright = base * tw`（数字）会把标志覆盖 → `if (bright)` 恒真 → **全部暗星被画成明亮恒星**。
   类别用 `isBright`（不变）、亮度用 `bright`（每帧重算），分开命名；探针**按类别分别计数**才抓得到。
4. **节拍不应期的时钟必须始终推进**：拿"只在未加载音乐时才累加"的模拟律动相位当基准，
   音乐一加载该变量就冻结 → 第一次节拍后**永远检测不到鼓点**。单独维护每帧无条件 `t += dt` 的引擎时钟。
5. **批量改文件里的字符串一律用 `str.replace` + 普通字符串**，不要用 `re.sub` 的 replacement
   （它会把字面 `\"` 写进文件，直接改坏源码）。
