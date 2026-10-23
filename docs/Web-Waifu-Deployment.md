# 网页看板娘 (Live2D Web Waifu) 极简开箱部署套件

本目录是一个**完全独立、开箱即用**的网页 Live2D 看板娘挂载套件，专为个人博客、静态网站、技术文档和产品主页打造。

---

## 📁 目录结构

```text
web-waifu/
├── index.html                  # 演示首页（包含完整集成示范代码）
├── start_preview.py            # 本地 HTTP 预览服务（带跨域头，双击/命令行秒起）
├── start_preview.bat           # Windows 双击一键启动脚本
├── README.md                   # 本说明文档
└── assets/
    └── live2d/
        ├── waifu.css           # 挂件样式（左下角定位、气泡动画、工具栏）
        ├── waifu-tips.js       # 挂件交互核心（注视追踪、点击事件、一言、提示词调度）
        ├── waifu-tips.json     # 看板娘台词与对话库配置
        ├── live2dcubismcore.min.js # Live2D 官方 Cubism 5 SDK Core (支持 moc3 现代模型)
        ├── live2d.min.js       # Live2D 官方 Cubism 2 Core (兼容经典 moc 模型)
        ├── chunk/              # 异步渲染核心模块
        │   ├── index.js        # Cubism 2 渲染管线
        │   └── index2.js       # Cubism 5 渲染管线 (解剖学限位、阻尼物理、肢体骨骼联动)
        └── model/              # 模型资产库
            ├── 7steve/         # 默认模型：黑客少女 7Steve (解耦骨骼、挥手、敲键盘、受击回缩)
            └── shizuku/        # 备选模型：经典二次元少女 Shizuku
```

---

## 🚀 极速启动与体验

### 方式 1：双击批处理（最快）
- 在 Windows 资源管理器中，直接双击 `web-waifu\start_preview.bat`（或在 `d:\live2d\` 根目录双击 `start_web_waifu.bat`）。
- 浏览器会自动打开 `http://localhost:8088/index.html`。

### 方式 2：命令行启动
```bash
python start_preview.py
```
终端输出：
```text
============================================================
 Live2D Web Waifu Local Server running at http://localhost:8088
 Serving root: d:\live2d\web-waifu
 Press Ctrl+C to stop server
============================================================
```

---

## 💻 如何将看板娘集成到你的网站？

只需将 `assets/live2d` 文件夹拷贝到你的网站根目录，然后在网页的 `<body>` 结束前加入如下代码：

```html
<!-- 1. 引入样式与底层引擎 -->
<link rel="stylesheet" href="assets/live2d/waifu.css">
<script src="assets/live2d/live2dcubismcore.min.js"></script>
<script type="module" src="assets/live2d/waifu-tips.js"></script>

<!-- 2. 初始化看板娘 -->
<script>
  window.addEventListener('load', () => {
    window.initWidget({
      waifuPath: 'assets/live2d/waifu-tips.json',
      cubism2Path: 'assets/live2d/live2d.min.js',
      cubism5Path: 'assets/live2d/live2dcubismcore.min.js',
      modelId: 0, // 0 为 7Steve，1 为 Shizuku
      tools: ['hitokoto', 'switch-model', 'photo', 'info', 'quit']
    });
  });
</script>
```

---

## 🎮 内置交互与功能特性

1. **鼠标跟随（Eye & Head Follow）**：
   - 光标在浏览器任意位置移动时，看板娘眼睛和头部会进行平滑注视跟踪；底层通过角度限制保护（$\le 4.5^\circ$），绝不发生机械折颈。
2. **多区域触控与肢体动力学**：
   - **点击头部**：触发 `Wave`（抬臂挥手打招呼）与害羞眨眼反应。
   - **点击全息屏幕**：触发 `Geek Typing`（双臂前倾交替敲击全息键盘）与屏幕反冲振颤。
   - **点击身体腹部**：触发 `Tap Body`（受刺激弹性向后避让，双臂收拢护体）。
3. **悬浮工具栏**：
   - 💬 **随机一言（Hitokoto）**：实时抓取并朗读一句名言或治愈文字。
   - 🔄 **切换模型（Switch Model）**：在 7Steve 与 Shizuku 之间无缝热切换。
   - 📷 **一键截图（Photo）**：抓取当前高帧率 Canvas 生成透明背景高清 PNG 导出。
   - ❌ **隐藏与收起（Quit）**：收起至左下角小人物图标，点击即可重新展开。
