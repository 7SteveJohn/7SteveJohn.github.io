# 7Steve Live2D 角色骨骼解耦全量重构与肢体动作（方案 A）交付报告

> **用户核心诉求**：“还有肢体动作呢？”、“不要只是一个纸片来回扭动，我要生动的动作”
> **交付方案**：**方案 A（骨骼解耦全量重构）** —— 对 7Steve 立绘进行图层解耦、衣物底衬无缝补全，构建真正的二维骨骼系统（Skeleton Deformers），赋予角色举手挥手、全息键盘敲击、惊跳受击回缩等全套真实肢体动作。

---

## 一、 最新肢体动作实机运行效果录屏

在实际博客环境中驱动 Live2D Cubism Core 5.1.0 进行真实交互录制，覆盖**呼吸肢体浮动**、**抬臂招手（Wave）**、**全息屏键盘敲击（Geek Typing）**与**受击弹性退缩（Startled Recoil）**全流程：

![7Steve 肢体动作实录](7steve-limb-actions.gif)

---

## 二、 方案 A 骨骼解耦全量重构的四大攻坚步骤

```mermaid
flowchart TD
    A["7Steve 原始参考立绘"] --> B["1. 图层拆分与解耦<br/>(手臂/全息屏/躯干剥离)"]
    B --> C["2. 躯干与卫衣底衬修复<br/>(OpenCV Telea 补全无缝织物)"]
    C --> D["3. 骨骼与变形器自动绑定<br/>(psd2live --skeleton 引擎重构)"]
    D --> E["4. 运动学曲线与动作编写<br/>(三次贝塞尔三次样条缓动)"]
    E --> F["5. 实机集成与 Playwright 自动化验证<br/>(6/6 Bundle 验证通过)"]
```

### 1. 肢体图层解耦与肩膀圆角转轴补全
- **图层解耦**：从原先锁死在卫衣躯干的图案中，精准剥离出右臂（`handwear_arm_r`，包含大臂、HTML5橙色臂章、手肘蓬松褶皱、袖口、手掌与食指）和左手持屏手臂（`handwear_arm_l`）。
- **关节凸转轴构造**：为左右大臂的肩关节根部补绘了半球形凸转轴（Shoulder Pivot Cap），确保手臂在向上抬起 $60^\circ$ 或左右挥动时，肩窝不会出现漏缝或悬空脱臼。
- **全息屏独立化**：将全息平板（`prop_holo_tablet`，含 `Hello World!` 代码与 `JS` 徽章）提取为独立的半透明青色 HUD 图层（Alpha $\approx 90$），移除了原先硬压在平板后方的深蓝胸腔阴影，手臂活动时透过全息屏可见内部连贯的卫衣材质。

### 2. 躯干无缝修补（In-painting）
- 手臂移走后，卫衣原位置留下了大面积空白。采用 OpenCV Telea 算法配合多层抗锯齿羽化蒙版，重构了整片深蓝卫衣布料渐变、完整的袋鼠式口袋双边缝线，并完美修复了胸前 **`7Steve BLOG`** 的无损极简排版，彻底消除了手臂运动时露出的“残影”与断裂。
- 生成高精母版：`7steve_master.psd`（37层，分辨率 1024×1024）。

### 3. `psd2live` 骨骼绑定引擎扩展与 MOC3 编译
- 扩展了 `psd2live` 编译器核心（`Main.kt` 与 `CliOptions.kt`），新增 `--skeleton` 人形骨骼自动解耦与变形器绑定管线。
- 成功编译生成 **9 个关节骨骼链**：
  - 左臂运动链：`arm_upper_l`（左上臂） $\to$ `arm_fore_l`（左小臂） $\to$ `hand_l`（左手腕）
  - 右臂运动链：`arm_upper_r`（右上臂） $\to$ `arm_fore_r`（右小臂） $\to$ `hand_r`（右手腕）
  - 核心躯干脊柱：`lower_body`（骨盆） $\to$ `upper_body`（胸腔） $\to$ `head`（颈椎/头颅）
- 生成专属骨骼控制参数（注册进 `cdi3.json` 与 `7steve.moc3`）：
  - `ParamArmRA`（右上臂旋转，$-30^\circ \sim 60^\circ$）
  - `ParamArmRB`（右前臂曲屈，$-20^\circ \sim 75^\circ$）
  - `ParamHandR`（右手腕摆动，$-45^\circ \sim 45^\circ$）
  - `ParamArmLA`、`ParamArmLB`、`ParamHandL`（左手及全息屏协同）
  - `ParamSkelUpperBody`、`ParamSkelLowerBody`（躯干受力弯曲）

### 4. 高阶三次贝塞尔肢体动力学动作套件
在 `generate_perfect_limb_motions.py` 中编写了符合物理动量与解剖学缓动规律的动作曲线：

| 动作名称 | 动作触发场景 | 肢体运动轨迹与动力学特征 |
|---|---|---|
| **Wave (打招呼)** | 头部点击 / 初次加载唤醒 | 右大臂优雅抬升至 $48^\circ$，小臂弯曲向上 $62^\circ$，手掌呈现高频自然的 $\pm 28^\circ$ 左右挥手循环，伴随身体微侧倾 $2^\circ$。 |
| **Geek Typing (极客打字)** | 点击全息平板区域 | 双臂向前抬起进入悬空打字姿势，左右手腕与小臂交替敲击全息键盘，全息屏随手指敲击产生微幅反冲振颤，角色身体微微前倾，体现沉浸于写代码的极客感。 |
| **Tap Body (受击退缩)** | 点击身体 / 腹部区域 | 受到外界刺激瞬间，身体受冲击向后缩回（阻尼欠阻尼弹簧振荡），双臂防御性向胸前收拢并瞬间外展护住核心，呈现富有弹性的惊慌反应。 |
| **Flick Head (摸头害羞)** | 抚摸发丝 / 顶部区域 | 头部维持在安全倾角（$\le 3^\circ$），手臂微微抬起护在颊侧，配合微幅眨眼与脸颊泛红，呈现乖巧腼腆互动。 |
| **Idle (待机呼吸)** | 无操作常驻状态 | 消除原先僵直的静态悬挂，双臂随胸腔呼吸波浪产生上下 $1.5^\circ$ 的悬浮微动，展现活生生的呼吸感。 |

---

## 三、 交付文件清单

1. **Live2D 模型核心资产** (`D:\HTML\assets\vendor\live2d\model\7steve\` 与 `D:\live2d\psd2live_model\`):
   - `7steve.moc3` (8,868,800 字节，集成 9 节点骨骼变形器)
   - `7steve.cdi3.json` (集成 `ParamArmRA/B`、`ParamHandR` 等完整骨骼参数定义)
   - `7steve.model3.json` (完成 11 种姿势与动作组调度配置)
   - 动作套件：
     - `7steve.wave.motion3.json`
     - `7steve.geek_typing.motion3.json`
     - `7steve.tap_body.motion3.json`
     - `7steve.flick_head.motion3.json`
     - `7steve.idle.motion3.json`
     - `7steve.shy.motion3.json`, `7steve.cheer.motion3.json`, `7steve.sway.motion3.json`, `7steve.headTilt.motion3.json`
2. **源码与工程管线** (`D:\live2d\`):
   - `build_clean_decoupled_psd.py`：图层解耦与 OpenCV Telea 智能无缝补全工具
   - `generate_perfect_limb_motions.py`：贝塞尔肢体运动学合成器
   - `psd2live/src/main/kotlin/io/github/psd2live/Main.kt`：新增 `--skeleton` 骨骼自动装配选项
   - `7steve_master.psd`：解耦分层 PSD 母版
3. **验证与实录动图** (`docs/`):
   - `7steve-limb-actions.gif` (实机交互全流程 53 帧高精录屏动图)

---

## 四、 工业级构建与系统校验

- **构建检查**：执行 `node scripts/build-bundles.mjs --check`
  ```
  PASS  bundle:core
  PASS  bundle:home
  PASS  bundle:sub
  PASS  bundle:garden
  PASS  bundle:links
  PASS  bundle:novel
  build-bundles: 6 项一致（与源文件逐字节相同）
  ```
- **控制台状态**：Chrome Headless Playwright 录制全流程中，Live2D Cubism Core 5.1.0 完美加载，零 404，零 JavaScript 异常报错。
