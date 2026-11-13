# FileButler 视频开屏封面与海报统一 - 交付记录

> **交付时间**：2026-11-11  
> **服务工作区**：`d:\HTML`  
> **Service Worker 版本**：`sevenjohn-v257`  
> **涉及产品**：FileButler（对齐拍案、Fluxion 60 秒 Apple 风格开屏封面；NetOps Handbook 按历史约定保持 38 秒原状不动）

---

## 1. 问题定位

比对首页 4 张产品卡片的实际视频封面（`<video poster>`）与视频成片后，确认 [`assets/images/filebutler-tour-poster.jpg`](../assets/images/filebutler-tour-poster.jpg) 与拍案、Fluxion 存在明显不一致：

1. **封面取帧错位**：[`paian-tour-poster.jpg`](../assets/images/paian-tour-poster.jpg) 与 [`fluxion-tour-poster.jpg`](../assets/images/fluxion-tour-poster.jpg) 均取自第 1 幕开屏 Hero 帧（`3.2s`，居中徽标 + 品牌大字 + 副标 + 版本号胶囊）；而 `filebutler-tour-poster.jpg` 误使用了第 2 幕正片功能帧（约 `5.0s` 处的「直接搜名字，毫秒级出结果」及完整亮白主窗口），未展示居中开屏封面。
2. **浅色底窗透白反差**：[`Temp/render_fb_apple.py`](../Temp/render_fb_apple.py) 的 `render_scene_cover` 原仅在 `y = 0..760` 施加压暗遮罩，FileButler 原生浅白底窗在下方边缘仍会透出较亮白块；同时全量渲染主流程末尾未像 `render_paian_apple.py` 那样自动刷新 `POSTER`。

---

## 2. 修复与统一方案

1. **统一开屏暗调与聚光罩层（[`Temp/render_fb_apple.py`](../Temp/render_fb_apple.py)）**：
   - 在 `render_scene_cover` 中新增全幅深空幕布柔光遮罩（`(11, 13, 17, 190 * fade)`）并预计算上半区聚光柔光蒙版 `_COVER_VIGN_MASK`，保留 FileButler 软件界面轮廓辨识度的同时消除左下角突兀亮白块，使开屏整体暗调与拍案、Fluxion 保持同族质感。
   - 在全量渲染结尾补齐 `render_frame(3.2)` 自动写回 `assets/images/filebutler-tour-poster.jpg`，杜绝视频重渲染后海报滞留旧帧。
2. **重渲染视频与导出 `3.2s` Hero 海报**：
   - 重新渲染 [`assets/video/filebutler-intro.mp4`](../assets/video/filebutler-intro.mp4)（1920×1080 @ 30fps，H.264 + AAC Stereo 44.1kHz，精确 60.0s / 1800 帧，4,686,810 字节）。
   - 同步刷新 [`assets/images/filebutler-tour-poster.jpg`](../assets/images/filebutler-tour-poster.jpg) 为 `3.2s` 居中 Hero 开屏帧（文件夹徽标 + `FileButler` + `智能文件检索管家 · 支持云端主流 API 与本地模型` + `v1.4.3 · 任意电脑即开即用`）。
3. **离线缓存更新（[`sw.js`](../sw.js)）**：
   - 将 `CACHE` 版本从 `sevenjohn-v256` 升级为 `sevenjohn-v257`，确保已缓存站点资源的用户重新访问时及时更新封面与视频缓存。

---

## 3. 验证结果

- **`ffprobe` 媒体元数据探针**：`filebutler-intro.mp4` 为 `1920x1080`、`30/1` fps、`h264` + `aac (44100 Hz, 2ch)`、`duration=60.000000`、`size=4686810`。
- **实际浏览器截图对比**：Chromium 1440×900 实机渲染 `filebutler` 卡片与 `paian`、`fluxion` 卡片呈现完全一致的暗色 Apple 风格居中 Hero 封面与播放键视觉。
- **自动化脚本校验**：
  - `node scripts/smoke-videos.mjs`：4 张卡片视窗尺寸（`363x204`、`fit=cover`）、下载链接与提取码断言全部 `PASS`，无 `pageerror`。
  - `node scripts/verify-all-covers-complete.mjs`：`TOTAL: 33 passed / 0 failed`。
