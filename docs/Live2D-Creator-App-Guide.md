# PSD2Live 桌面端 Live2D 制作器使用指南与部署说明

本目录已部署完整的 **PSD2Live 2D 角色绑定与动画可视化桌面编辑器**（开箱即用原生 Windows 应用程序，内嵌专用独立 Runtime，无需额外安装或配置 Java 环境）。

---

## 🚀 一键启动方式

在 Windows 资源管理器中，进入 `d:\live2d\` 目录：
1. **双击启动脚本**：直接双击 [`d:\live2d\启动Live2D制作器.bat`](file:///D:/live2d/%E5%90%AF%E5%8A%A8Live2D%E5%88%B6%E4%BD%9C%E5%99%A8.bat)（或 `start_psd2live_editor.bat`）。
2. **直接运行可执行文件**：双击 [`d:\live2d\PSD2Live-Editor\PSD2Live.exe`](file:///D:/live2d/PSD2Live-Editor/PSD2Live.exe)。

---

## 🎨 核心功能与工作区一览

PSD2Live 是一套专为 Live2D / 2D 角色打造的现代化绑定工具链，支持从分层 PSD 自动生成或手动精修角色，包含八大可视化工作区：

```mermaid
flowchart LR
    A["PSD 分层文件"] --> B["导入 / 自动识别图层"]
    B --> C["网格工作区 (Mesh)"]
    C --> D["绑定工作区 (Rigging)"]
    D --> E["骨骼与变形器 (Deformers)"]
    E --> F["物理与摆锤 (Physics)"]
    F --> G["时间轴动画 (Animation)"]
    G --> H["导出 MOC3 / CMO3 / Web"]
```

| 工作区标签 | 核心能力 |
|---|---|
| **开始 (Start)** | 拖入 PSD 一键自动绑定（最小/默认/完整预设），或从 Cubism CMO3 文件导入现有工程。 |
| **编辑 (Edit)** | 处理曲面变形器（Warp Deformer）、旋转变形器（Rotation Deformer）、关键形（Keyforms）与骨骼。 |
| **网格 (Mesh)** | 编辑图层多边形拓扑网格，支持自动三角剖分、边缘收缩与手动加点加线。 |
| **绑定 (Rigging)** | 编辑画布与实时注视预览并排，直观调节视线跟随九宫格与五官表情参数。 |
| **动画 (Animation)** | 时间轴、贝塞尔关键帧曲线、动作列表（待机、点头、打招呼、敲键盘等动作制作）。 |
| **物理 (Physics)** | 实时调节头发、饰品、裙摆、衣服飘带的钟摆/弹簧物理与重力阻尼模拟。 |
| **纹理 (Texture)** | 纹理集排布（Texture Atlas），支持图块紧凑嵌套、逐层纹理分辨率缩放与高清化。 |
| **预览 (Preview)** | 大尺寸全屏无干扰预览，测试鼠标跟随、点击反应与完整动作回放。 |

---

## 📦 导出格式支持

- **Live2D Cubism 规范**：导出标准 `.moc3`、`.model3.json`、`.cdi3.json`、`.physics3.json`、`.motion3.json`。
- **Cubism 工程文件**：导出 `.cmo3`，可无缝移交至官方 Live2D Cubism Editor。
- **VTube Studio / 面捕**：直接生成适用于 VTS 的标准模型目录。
- **Web / 游戏引擎**：一键导出用于前端网页（WebAssembly/PixiJS）、Spine、Unity、Godot 的运行时素材。

---

## 💡 快捷键速查

- `F1`：打开内置交互式新手教程与图层规范指南。
- `Ctrl+Shift+O`：导入 PSD 分层立绘。
- `Ctrl+S`：保存当前制作工程（`.psd2live`）。
- `Ctrl+G`：导出模型（选择 MOC3 / CMO3 等格式）。
- `Space + 鼠标左键拖动`：平移画布。
- `鼠标滚轮`：缩放画布。
