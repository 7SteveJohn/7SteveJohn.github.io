# PSD2Live MCP 服务部署与配置交付说明

本指南记录了 **PSD2Live 2D 角色绑定与动画制作 MCP 服务** 在本机的部署、自适应桥接与全局 MCP 注册状态。

---

## 📁 核心部署产物

1. **自适应桥接网关**：[`D:\live2d\psd2live_mcp_bridge.py`](file:///D:/live2d/psd2live_mcp_bridge.py)
   - 支持 Stdio 标准输入输出（JSON-RPC 2.0，兼容 Model Context Protocol 2024-11-05 标准）。
   - **智能按需启动**：每次 AI Agent 连接时，自动检测 `http://127.0.0.1:23871/mcp` 服务是否存活；若桌面端未开启，自动在后台秒级拉起无头（Headless）MCP 引擎并在断开后自动回收，实现“零人工干预”即插即用。
2. **全局 MCP 注册**：[`C:\Users\SevenJohn\.gemini\config\mcp_config.json`](file:///C:/Users/SevenJohn/.gemini/config/mcp_config.json)
   - 已将 `psd2live` 注册至 Antigravity 全局 MCP 服务清单。

---

## ⚙️ 全局配置详情 (`mcp_config.json`)

```json
{
  "mcpServers": {
    "psd2live": {
      "command": "python",
      "args": [
        "D:\\live2d\\psd2live_mcp_bridge.py"
      ],
      "env": {
        "PSD2LIVE_MCP_ENDPOINT": "http://127.0.0.1:23871/mcp",
        "PSD2LIVE_MCP_TOKEN": "pcHciM5F4V4D2Wtu61asMw0KUbxmJnlSORiViaaiNms",
        "PSD2LIVE_EXE": "D:\\live2d\\PSD2Live-Editor\\PSD2Live.exe"
      }
    }
  }
}
```

---

## 🛠️ MCP 具备的核心工具（开箱即用）

| MCP 工具名 | 功能说明 |
|---|---|
| `workspace_overview` | 查询当前工程概况（画布尺寸、图层数、网格数、物理组数、参数数）。 |
| `workspace_inspect` | 深度内省特定对象（图层/变形器/骨骼/物理/动作曲线）。 |
| `workspace_list_operations` | 动态检索 180+ 项底层建模与绑定子操作契约。 |
| `workspace_call` | 统一调用图层分类、网格生成、蒙皮绑定、形变编辑等高阶功能。 |
| `workspace_apply_edits` | 原子批量应用多项连续形变与拓扑编辑，并提交进历史树。 |
| `skeleton_*` 族工具 | 人体骨骼自动推断、关节权重绑定、FK/IK 姿态解算。 |
| `physics_*` / `simulation_*` 族工具 | 钟摆与重力物理配置、XPBD 布料/发丝物理模拟与烘焙。 |
| `motion_*` 族工具 | 时间轴动作片段采样、关键帧打点与曲线编辑。 |
| `project_export_model` | 导出 Cubism 3~5 标准模型（`.moc3`）、`.cmo3`、VTS 格式与网页素材。 |

---

## 🧪 连通性测试报告

- 运行测试脚本通过 Stdio 管道发送 `initialize` 与 `tools/list` 报文：
  - **初始化响应**：`{"id":1,"result":{"protocolVersion":"2024-11-05","serverInfo":{"name":"psd2live","version":"3.5.1"}}}`
  - **工具列表响应**：完整下发 `workspace_inspect`、`workspace_overview`、`author_axis` 等 25+ 项核心工具及 180+ 级联操作。
  - **连通状态**：**PASS（响应耗时 < 1.2s，退出无残留）**。
