# 7Steve Live2D 看板娘头部倾角（AngleZ）自然生理姿态重构交付报告

> **用户核心痛点**：“你这头部歪的太吓人了，你去联网学习一下吧”
> **攻坚目标**：彻底消除头部过度倾斜导致的“断颈悬空”、“恐怖谷/中邪式侧倾”现象，对齐 Live2D 官方 Cubism SDK 规范与二次元动捕动画人机工程学，实现自然、可爱、灵动且符合生理结构的头颈协同微姿势。

---

## 一、 最新优化效果实录（自然头颈微倾姿态）

在博客实机环境下录制：鼠标进行多角度连续位移、触发摸头、打字、惊跳互动，头部在任何角度下均保持优雅端庄的微倾侧（实测最大倾角仅 **$3.50^\circ$**），彻底告别了之前近 $30^\circ$ 的恐怖断颈歪斜：

![7Steve 自然头颈姿态实录](7steve-natural-head.gif)

---

## 二、 深度调研：官方 Live2D Cubism 规范与二次元人体工学

通过检索 Live2D 官方文档 (`Cubism Web SDK`)、VTube Studio 标准与工业级模型动捕规范，我们总结出如下准则：

1. **头部滚转角（Roll / AngleZ）在生理学与动漫美学中的定位**：
   - 现实人体与二次元萌系角色中，**转头视线看左/看右（Yaw / AngleX）时，头部的 Z 轴倾角（Roll / AngleZ）绝不会大幅侧翻**。大幅侧倾只存在于刻意歪头卖萌（“首をかしげる”），通常仅在 $2^\circ \sim 4^\circ$ 之间，超过 $8^\circ \sim 10^\circ$ 就会呈现病理性斜颈或诡异折断感。
2. **官方 SDK 的对角乘积算法（Cross-multiplication）**：
   - 官方 `LAppModel.prototype.update` 的标准公式为：
     $$\text{AngleZ} = \text{dragX} \times \text{dragY} \times (-30)$$
   - **核心设计意图**：当光标沿水平轴（$\text{dragY} \approx 0$）或垂直轴（$\text{dragX} \approx 0$）移动时，**乘积恒等于 0，头部绝对不歪**！只有当光标移动至左上/右下等对角线象限时，才触发极轻微的自然探视微倾。
3. **身体肩颈联动律（Shoulder-Head Synergy）**：
   - 头部倾斜时，颈部不是单一刚体旋转；若头倾斜 $10^\circ$ 而身体/肩线在 $0^\circ$ 静止，头颈缝隙立刻撕裂。必须同步驱动 `ParamBodyAngleZ` 垫底，使肩膀共同微倾，形成自然的脊柱弧度。

---

## 三、 导致“歪得吓人”的四大技术根因与靶向根治

| 序号 | 导致此前“歪得吓人”的旧根因 | 本轮重构的靶向根治方案 | 状态 |
|---|---|---|---|
| **1** | **鼠标追踪采用了激进的单轴线性倾角**：之前公式包含 $-9 \times \text{dragX}$，导致鼠标只要往左滑，头部就平白被硬掰 $+9^\circ$，产生严重的单向机械折颈。 | **回归并收敛官方对角线乘积公式**：改为 $\text{az} = \text{clamp}(\text{dragX} \times \text{dragY} \times -10.0, -3.5, 3.5)$。水平/垂直巡视时倾角严格为 0，对角探视最大不超过 $3.5^\circ$。 | 已修复 |
| **2** | **官方呼吸组件荒谬地叠加了 $10^\circ$ 的 AngleZ**：在 `setupBreath` 中，SDK 样例代码遗留了 `yt(this._idParamAngleZ, 0, 10, 5.5345, .5)`，导致模型即使在静止待机时，呼吸也会凭空强加 $10^\circ$ 的侧向摆动！ | **彻底清空呼吸组件的 AngleZ 幅度**：将幅值由 $10^\circ$ 直接降至 $0^\circ$（呼吸仅保留微幅胸腔起伏 $1.2^\circ$ 与腹部起伏，绝对不再扭动颈椎）。 | 已修复 |
| **3** | **动作文件关键帧倾角幅度过大**：旧版 `flick_head`（摸头）倾角高达 $10.5^\circ$、`shake`（摇头）倾角高达 $8.0^\circ$。当与鼠标追踪叠加时，总倾角直接突破 $28^\circ \sim 30^\circ$！ | **全面重构全部 6 套动作曲线**：将 `flick_head` 峰值压缩至温和的 $3.0^\circ$；`shake` 降至 $1.5^\circ$；`idle` 待机降至 $0.6^\circ$；并为所有动作同步补齐 `ParamBodyAngleZ` 肩颈联动。 | 已修复 |
| **4** | **无底层安全限位，易在组合触发时破限**：当外部动作、物理发丝反冲、鼠标追踪同向触发时，参数累加无上限。 | **在底层物理计算后注入硬核解剖学安全钳制**：在渲染前执行严格限位：$\text{AngleZ} \in [-4.5^\circ, 4.5^\circ]$，从数学上杜绝任何异常扭曲可能。 | 已修复 |

---

## 四、 核心代码修改一览

### 1. `chunk/index2.js` 运动学与呼吸引擎重构
```javascript
// 1. 彻底根除呼吸组件对 AngleZ 的异常扭动 (幅值 10 -> 0)
t.pushBack(new yt(this._idParamAngleX, 0, 1.5, 6.5345, .5)),
t.pushBack(new yt(this._idParamAngleY, 0, 1.2, 3.5345, .5)),
t.pushBack(new yt(this._idParamAngleZ, 0, 0, 5.5345, .5)), // 呼吸绝对不再摆动 Z 轴
t.pushBack(new yt(this._idParamBodyAngleX, 0, 1.5, 15.5345, .5))

// 2. 鼠标交互：采用温和的对角线微倾并联动身体
const az = Math.max(-3.5, Math.min(3.5, this._dragX * this._dragY * -10.0));
const bz = Math.max(-2.0, Math.min(2.0, this._dragX * this._dragY * -5.0)); // 身体肩线自然协同
this._model.addParameterValueById(this._idParamAngleZ, az);
this._model.addParameterValueById(idMgr.getId("ParamBodyAngleZ"), bz);

// 3. 渲染前全局解剖学安全钳制（物理计算后）
(()=>{
  const _z = this._model.getParameterValueById(this._idParamAngleZ);
  _z < -4.5 ? this._model.setParameterValueById(this._idParamAngleZ, -4.5)
            : _z > 4.5 && this._model.setParameterValueById(this._idParamAngleZ, 4.5);
})();
```

### 2. `upgrade_smooth_motions.py` 动作文件更新
- **Idle（待机）**：`ParamAngleZ` 极微幅波浪 $[-0.6^\circ, 0.6^\circ]$，搭配 $[ -0.4^\circ, 0.4^\circ]$ 身体支撑。
- **FlickHead（摸头娇羞）**：`ParamAngleZ` 由过度的 $10.5^\circ$ 收敛为温和的 $3.0^\circ$，身体肩线联动 $1.8^\circ$。
- **Shake（摇头）**：`ParamAngleZ` 严格限制在 $[-1.2^\circ, 1.5^\circ]$ 之间，避免摇头变甩脖。

---

## 五、 实机运行与工业指标实测

1. **全功能实测录屏数据**：
   - 运行 Playwright 真实浏览器模拟追踪与交互全流程，捕获 79 帧高精画面。
   - **实测最大 AngleZ 记录**：`Max ParamAngleZ recorded: 3.50 deg`（完美收敛在 $\le 5.0^\circ$ 绝对安全域内）。
2. **构建一致性校验**：
   - 运行 `node scripts/build-bundles.mjs --check`：
   - **PASS** 6/6 项目逐字节匹配，0 报错。
