# 7Steve 看板娘 — 路线 A（原设立绘 2.5D 深度视差交互）交付记录

> **交付时间**：2026-10-18  
> **方案选型**：路线 A（真·7steve 立绘驱动的 Web 视差与微动看板娘）  
> **核心目标**：彻底解决老模型套壳换皮失真问题，100% 还原用户提供的参考图立绘与角色标识。

---

## 一、 为什么切换至路线 A？

前期尝试的“方案一（Shizuku 模型换皮嫁接）”受制于旧版 Live2D 预设模型的骨骼与多边形拓扑限制：
1. **服饰失真**：原骨骼为 JK 贴身衬衫与大蝴蝶结，无法呈现宽松落肩连帽卫衣（Hoodie）及胸前 "7Steve" 标志；
2. **配件脱节**：原骨骼无独立眼镜骨骼，贴图导致穿模与额头双重脸异常，被迫移除眼镜；
3. **外设缺失**：手持全息平板（Hello World! JS）、浮空赛博猫与代码视窗无法自然挂载。

**路线 A 采取全新架构**：直接基于原设立绘（`7steve.jpg`）高精度切片与透明分层资产，构建轻量、纯自托管、零 WebGL 报错隐患的 **Web 2.5D 视差与微动看板娘引擎**。

---

## 二、 交付资产与技术实现

### 1. 核心部件资产
- **真·7steve 原设立绘高精透明半身像**：[7steve-bust.png](file:///D:/HTML/assets/vendor/live2d/7steve-bust.png)
- **浮空赛博小猫独立构件**：[7steve-cybercat.png](file:///D:/HTML/assets/vendor/live2d/7steve-cybercat.png)
- **手持全息屏高亮层**：[7steve-hologram.png](file:///D:/HTML/assets/vendor/live2d/7steve-hologram.png)
- **完整角色透明图**：[7steve-transparent.png](file:///D:/HTML/assets/vendor/live2d/7steve-transparent.png)
- **商业级分层 PSD 源文件（备用）**：[7steve.psd](file:///d:/live2d/7steve.psd)

### 2. 前端 2.5D 交互引擎实现
- **引擎入口**：[7steve-mascot.js](file:///D:/HTML/assets/vendor/live2d/7steve-mascot.js)
- **加载控制器**：[live2d.js](file:///D:/HTML/js/live2d.js) 自动探测并首选加载 7Steve 2.5D 引擎，异常时平滑降级。
- **动画原理与动力学重构（告别生硬）**：
  1. **弹簧阻尼动力学（Hooke's Law Spring-Damper）**：引入真正的二阶物理弹簧系统（刚度 $k$ 与阻尼 $d$），转头与交互具备真实的加速度、超调回弹（Overshoot）与微观弹性收敛，彻底摒弃死板机械的线性 Lerp；
  2. **惯性剪切滞后摆动（Inertial Follow-Through）**：根据转头瞬时角速度动态计算发丝与双马尾的剪切角（`skewX`），实现自然的“头先转、发尾后跟”物理惯性；
  3. **有机非对称生命呼吸（Organic Breathing）**：重构呼吸曲线为“慢吸挺胸（45%） $\rightarrow$ 屏气微停（10%） $\rightarrow$ 缓呼放松（45%）”，告别均匀呆板的整体伸缩；
  4. **挤压与拉伸弹性冲量（Squash & Stretch）**：摸头受力柔和下压、逗猫腾跃拉伸、戳刺果冻回弹；
  5. **精细局部热区交互**：摸头害羞红晕与猫耳微颤、逗猫跃起电光粒子、全息屏触碰震波涟漪、连续戳刺后撤避让、22秒无操作打瞌睡（`Zzz`）。

---

## 三、 运行验证结果

### 1. 动效验证与 GIF
- **动态录制演示图**：[7steve-route-a-demo.gif](file:///d:/live2d/7steve-route-a-demo.gif)
- **博客实机运行截图**：[blog_7steve_live.png](file:///d:/live2d/blog_7steve_live.png)

### 2. 博客主站工程校验
- **工程构建校验**：`node scripts/build-bundles.mjs --check` 全部 6 项 PASS。
- **页面错误**：0 控制台报错，不抢占首屏带宽，尊重 `sj.live2d=off` 与无障碍减弱动效偏好。
