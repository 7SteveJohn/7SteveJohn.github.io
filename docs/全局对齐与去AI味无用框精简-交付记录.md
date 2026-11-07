# 全局元素像素级对齐与消除多余无用框（彻底去 AI 味）交付记录

## 1. 核心诉求与根因诊断

### 诉求 1：图 1 元素严重未对齐检测与修复
- **用户反馈**：“这类没有对齐的元素请全局检测，哪里没有对齐，请将它们对齐，因为没有对齐显得 AI 味儿非常的重。”
- **底层根因分析（实测像素度量）**：
  1. **荒谬的 top margin**：在 `css/style.css:3389` 中，`.announce-more` 显式设置了 `margin-top: 10px;`。
  2. **选择器特异性污染**：卡片底部的「了解更多」胶囊样式 `#products button[data-open-project]` 因缺少排除条件，误伤了同样带 `data-open-project` 属性的 `.announce-more`，导致外层大胶囊（`.announce-line`）内部又被硬生生套了一个带浅蓝背景与边框的小胶囊（胶囊套胶囊）。
  3. **中心线严重脱节**：实测渲染数据中，大胶囊高 51.5px，按钮距离顶边 16px、底边仅 6px，下沉偏差达 5px，下边缘几乎贴住底边；蓝点 `●`（高 6px）与文本、按钮三者中心线完全错开，肉眼呈现一高一低、歪斜下坠的粗劣感。

### 诉求 2：图 2 无用框全面清理（“哐哐哐圈起来，显得拥挤且 AI 味重”）
- **用户反馈**：“像图2这种没有用的框，就把它们删掉，因为这样也会显得AI味非常重，知道吧？就哐哐哐圈起来，很多地方本来空间就不多，你再一圈，显得非常拥挤。”
- **底层根因排查**：
  1. **弹窗正文重复圈框**：`#project-modal` 的常驻顶栏已经有明确的分类标签（`project-bar-category`）与大标题，但在正文内容区第一行又强行画了一个带边框的圆角框圈住 `[桌面应用]`，不仅语义 100% 重复，更在宝贵的弹窗空间顶部凭空占用一行；
  2. **文章阅读弹窗重复圈框**：`#article-modal` 顶栏已有分类，正文首行同样画框圈住 `[技术手记]`；
  3. **旗舰卡片 eyebrow 到处加框**：卡片顶部原本用于标识技术栈与形态的导语（如 `端侧 AI 桌面应用 · pywebview / Vue 3 / Ollama`）被强行施加 `border border-black/8 dark:border-white/12 px-2.5 py-1 rounded-md`，形成卡片内到处都是线框、视觉窒息的 AI 模版通病。

---

## 2. 实施修复方案

### (1) 公告胶囊行绝对像素级对齐（偏差 < 0.01px）
- **隔离选择器污染**：在 `css/style.css` 中将产品卡按钮规则修改为 `#products button[data-open-project]:not(.announce-more)`，阻止胶囊边框、阴影、背景污染公告内部链接；
- **重构公告条中心对齐**：
  - `.announce-line`：统一 `display: inline-flex; align-items: center; line-height: 1.2; padding: 0.25rem 0.75rem; border-radius: 9999px;`，避免意外折行；
  - `.announce-dot`：统一 `display: inline-block; vertical-align: middle; align-self: center;`；
  - `.announce-more`：彻底拔除 `margin-top: 10px`，重置为 `margin: 0 !important; border: 0 !important; background: transparent !important; display: inline-flex !important; align-items: center !important; align-self: center !important;`，呈现如同 Apple / GitHub 官方级纯净利落的内联文本操作链接。
- **实测验证数据**：
  - 容器中心 Y：`1041.625`
  - 蓝点中心 Y：`1041.625`（偏差 0.000px）
  - 文本中心 Y：`1041.625`（偏差 0.000px）
  - 按钮中心 Y：`1041.617`（偏差 0.008px）
  - **最大中心线偏差从原本 5.0px 降低至 0.0078px（严格物理像素对齐）**。

### (2) 全面清除无用框，还原本真呼吸感
1. **清理项目详情弹窗正文分类框**：
   - 移除 `js/app.js` 中 `openProjectModal` 内正文头部的 `<span class="... border ...">${project.categoryName}</span>`；
   - 弹窗顶部栏已有清晰类别胶囊，正文直接以大标题与产品介绍自然舒展展开，彻底释放顶部空间；
2. **清理文章弹窗分类框**：
   - 移除 `js/app.js` 中 `openArticleModal` 内正文头部的分类 border 框，精炼保留日期与阅读时间纯文本元数据；
3. **清理产品卡片顶部 eyebrow 边框**：
   - 将 `index.html` 中 4 款旗舰单品卡片顶部的 `px-2.5 py-1 rounded-md border border-black/8 dark:border-white/12` 剥离；
   - 保留优雅轻盈的 `inline-block text-xs font-mono text-[#86868b] tracking-wide`，卡片整体层次分明，告别“哐哐哐到处加框”的拥挤与廉价感。

### (3) 更新记录（Changelog）与弹窗内“条条框框”全面根除
针对用户再次指出“**很多条条框框的，你看它有存在的必要吗？**”进行二次全面清理：

1. **拔除 Changelog 外层大灰框与背景**：
   - 移除 `.changelog` 的外边框 `border: 1px solid rgba(0, 0, 0, 0.08)`、背景色 `background: rgba(0, 0, 0, 0.015)` 与圆角；
   - 展开后不再像一个被关在笼子里的表单小控件，而是与弹窗底色通透融为一体；
2. **拔除每一个版本号的小蓝框背景**：
   - 彻底移除 `.cl-v` 的 `padding: 0.15rem 0.5rem; border-radius: 4px; background: rgba(37, 99, 235, 0.08);`；
   - 版本号（`v1.4.3` 等）直接以等宽纯文本呈现，告别一排下去全是小方块的廉价 AI 模板感；
3. **拔除横切全屏的 11 道切线（条条）**：
   - 移除 `.cl-item` 的 `border-bottom: 1px solid rgba(0, 0, 0, 0.06)`；
   - 移除 `summary` 下方的横切线；
   - 采用纯净的纵向空间呼吸节奏进行视觉分段，阅读感如丝般顺滑；
4. **拔除右侧版本计数的胶囊框**：
   - `.cl-count` 去除背景和边框，直接呈现为等宽纯文本；
5. **拔除正文环境/规格的大灰框**：
   - 移除正文规格卡片的 `rounded-xl border border-black/10 bg-black/[0.02]`，改为轻量内联排版。

### (4) 卡片 3D 彻底精简与彻底减负
根据最终体验决策：“既然体现不出来，把 3D 删掉，别徒增缓存和复杂度”，进行了全站连根拔起式的纯净减负：

1. **JS 引擎与监听器全量清除**：
   - 彻底删除 `index.html` 底部的 `bootstrapTilt` 脚本逻辑；
   - 彻底删除 `js/site-config.js` 中的 3D 物理翘板算法、按压深陷、鼠标跟手与陀螺仪（约 170 行代码），保留纯净 no-op 函数兜底；
   - 彻底删除 `js/app.js`、`js/archive.js`、`js/gallery.js` 中对卡片和瓷砖的 3D tilt 挂载。
2. **CSS 样式与分层全量还原**：
   - 彻底移除 `css/style.css`、`css/archive.css`、`css/gallery.css` 中的 `transform-style: preserve-3d`、`will-change`、动态光泽微层以及所有子元素 `translateZ(...)`；
   - 卡片恢复纯粹、极简的 Apple 风格 Bento 卡片：仅保留悬停轻柔微上浮（`translateY(-2px)`）和点按弹性微缩放（`scale(0.995)`），零重绘开销、零视差抖动、零缓存负担。

---

## 3. 构建与部署验证

1. **重新编译前端 Bundles**：
   - 运行 `node scripts/build-bundles.mjs`，全量更新 `core.js` 与 `home.js`；
   - `core.js` 从 43.0KB 精简至 **35.2KB**，全站 bundle 总体积直降 8.2KB；
   - 运行 `node scripts/build-bundles.mjs --check`，6 个 bundle 全部通过逐字节一致性校验；
2. **升级版本控制与缓存**：
   - 升级 Service Worker 缓存至 `sevenjohn-v244`；
   - 升级 `index.html` 资源时间戳至 `?v=20261107_v244`；
3. **Playwright 纯净验证 100% 通过**：
   - 鼠标划过卡片内联 `style.transform` 保持 `(none)`；
   - 页面平滑无任何报错，去 AI 味与去框成果完整保留。
