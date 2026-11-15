# 札签 cards.html · 交接文档（2026-11-15，2026-11-16 更新）

> 给新对话的完整上下文。目标：把「札签卷宗」文章抽卡页收尾融入博客。
> 本文档假设读者从零开始读，所有历史决策都写明了原因。
> **2026-11-16 更新**：提交完成（8d22509）、`reduce` 定案写明注释、归档页入口已加。
> 剩余 = 用户真机验收 + 可选深化（第 5 节）。

---

## 1. 一句话现状

`D:\HTML\cards.html`（单文件、零框架、读 `js/articles.js` 真数据）已经是**博客正式子页**：手写壳 + 主题同键 + 首页/归档入口 + 正文渲染走博客管线 + `?post=` 深链闭环，全部交互可用、零报错。**已提交（8d22509），本地 main 领先 origin/main，push 等用户确认**。剩余工作见第 5 节。

## 2. 交付物与文件

| 文件 | 状态 | 说明 |
|---|---|---|
| `D:\HTML\cards.html` | 已提交（8d22509） | 全部本体：卷宗架→拆封→牌堆→阅读 + 总目抽屉 + 已入册托盘；`reduce` 定案注释（11-16） |
| `D:\HTML\index.html` | 已提交 | `#blog` 栏头「札签卷宗 →」链接 |
| `D:\HTML\archive.html` | 已提交 | 归档页 page-sub 尾部同款「札签卷宗 →」链接（11-16 收尾） |
| `D:\HTML\sw.js` | **故意没动** | cards.html 不进 CORE（低频页走导航 SWR 自动入库）；archive.html 只是改内容不改 CORE 清单，按 sw.js 头部新规不 bump |
| 本文档 + memory `card-deck-3d-bookshelf.md` | 持久 | 交接知识库 |

## 3. 页面结构（已定型，别重做）

**流程**：卷宗架（9 个分类卷宗，白纸封筒+袋口折边+分类色封签+左缘竖色签+红章「未启 N 札」）→ 点卷宗 = 拆封仪式（封条撕飞→墨线光轮→纸屑→卷签升起）→ 牌堆（**拖动左右 = 翻看下一张不计数；轻点 = 拆签阅读**——这是用户明确的交互语义）→ VT morph 进阅读页 → 关闭回原视图。左下角「已入册」托盘（读过的小签，随时重读）。右上「总目」= **右侧窄抽屉浮层**（408px，毛玻璃透底，不切视野）。

**明确的禁区**（用户否决过的，别加回来）：
- 金箔/赌场感/烫金 = 廉价；做旧纹理 = 老旧。要的是白纸墨字 + 发丝边框 + 分类色点睛（refero 编辑风）
- 书架/书体建模已被整体放弃（`bookEls/ensureBook` 已删干净）
- 卷宗卡面上**没有**水印大字、没有「内卡露头」（patch5 删过，加回去会被骂）
- 总目录**不能**是整页跳转，也不能是占半屏的大模态——就是现在的右侧窄抽屉

## 4. 已完成的博客融入（复述给新对话，别重做）

1. **壳**：手写吸顶顶栏（楠屿札记 → `./`、技术手记 → `./#blog`、归档、主题钮）+ 页脚。不引 Tailwind，不碰博客构建链。
2. **主题**：与博客同键 `sj.theme`（博客 js/app.js 读写同一键），`:root`/`html.dark` 双 token 全变量化。
3. **暗色 = 博客同款液态玻璃**：`--paper:rgba(16,22,34,.75)`、`--glass:blur(14px) saturate(1.25)`（挂在 pack/card-inner/cat-panel/pile-book），accent/hover 用 sky `#38bdf8`；亮色 `--glass:none`。底色 `#060911` 对齐博客。
4. **正文管线**：`<script src="js/markdown-loader.js" defer>`（独立 IIFE 无副作用）→ `renderBody()` 走 `ensureMarkdown()`→marked+DOMPurify；`miniMd()` 仅兜底；`ensureBodyHl()` 复刻博客 ensureHighlight（正文真有 `pre code` 才拉 highlight）。
5. **深链闭环**：阅读页「在博客中阅读 →」→ `./?post=<id>`（博客 app.js 原生支持深链开弹窗）。
6. **入口**：首页 `#blog` 栏头「札签卷宗 →」+ 归档页 page-sub 尾部同款链接（11-16）。
7. **历史集成**：reader/抽屉打开各 `pushState({cardsOv})`，popstate 统一关层，UI 关闭走 `history.back()` → 浏览器后退手势 = 关浮层而非退回博客。牌堆↔卷宗架的视图切换**故意没**进 history（有 ← 按钮承担，避免后退链变长）。
8. **性能**：总目浮层 backdrop 拆两层（blur 层只显隐不做 opacity 过渡，白纱层承担渐入），浮层开着时 `body.cat-open` 冻结底下所有装饰动画与牌堆视差，openCatalog 不再包 View Transition，关闭即收无退场动画。

## 5. 剩余工作（按优先级）

1. ~~**提交**~~ ✅ 已完成：8d22509（cards.html + index.html + 本文档）。本地 main 领先远端 12 个提交，**push 等用户确认**。
2. **用户真机验收**（headless 测不了，逐条让用户看）：拆封仪式节奏、扇面卡汇入牌堆、玻璃质感与 sky 辉光、抽屉滑入手感、暗色观感。
3. ~~**`reduce` 常量决策**~~ ✅ 已定案（11-16）：保持 `const reduce = false`（cards.html:774），注释写明「本机 prefers-reduced-motion:reduce 误报，接 matchMedia 等于自断全部特效」。
4. ~~**归档页入口**~~ ✅ 已完成（11-16）：archive.html page-sub 尾部加了同款「札签卷宗 →」链接（类名照抄 index.html #blog 栏头，四个类名已验证在预编译 tailwind.css 里，无需重建）。
5. **可选深化**（问用户要不要）：① 首页 #blog 做「列表 ⇄ 卷宗」视图切换，卷宗架嵌进首页（动态加载 cards.html 的核心逻辑，首屏零成本）；② 归档页与札签互链成「表格/卡片/卷宗」三种浏览形态。

## 6. 验证工作流（新对话照抄）

```bash
# 服务器挂了（curl 000）就重启守护：
node /c/Users/SevenJohn/AppData/Local/Temp/deck-server-guard.cjs   # 后台跑
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8391/cards.html
```
- 测试地址：`http://127.0.0.1:8391/cards.html`（`?motion=1` 只是防缓存惯例，代码里无逻辑）
- 验证姿势：browser-use `tabs.new()` 开后台页签 + `playwright.evaluate` 状态断言 + `nodeRepl.emitImage` 截图。**每批调用都要重新 `setupBrowserRuntime` + 重取 tab**（内核不跨调用保留变量）
- 断言优先于截图：headless 截图常是陈旧帧、无 GPU 合成（backdrop-filter 渲不出）
- 大改后跑：`new Function(主脚本块)` 查语法 + 页内 `addEventListener('error')` 探针 + 全链路（架→拆→拖→点→读→回→抽屉→Esc→后退）

## 7. 踩坑记录（必读，全部实测）

1. **patch 脚本里含 `${...}` 的匹配串必须用单引号**——反引号会被脚本自身求值（ReferenceError）。
2. **大范围删改后必须 grep 旧引用**：曾两次翻车（presentingId 随重构消失→运行时才炸；gacha CSS 被整段切除→JS 在生成无样式元素）。
3. **browser-use 后台页签**：rAF 只跑 1 帧、CSS animation/WAAPI 时间轴全程冻结、setTimeout 被节流（1350ms 仪式会拖到 ~2s+）、setInterval ~1Hz。只能验证 timer 驱动的状态变化；动画轨迹只能用户真机看。进场 class 用 `setTimeout(…,30)` 别用 rAF。
4. **8391 服务器会静默死**：curl 000 就是挂了，重启 guard 即可。
5. **WAAPI `easing` 不解析 CSS 变量**：JS animate() 用文件里的 SPRING 常量（字面量 linear()），CSS 侧可用 `var(--spring)`。
6. **拖拽**：`_suppressed` 只在真实拖动（`d.moved`）后设置，否则吞掉轻点；`pointercancel`/动画 `oncancel` 必须归位，否则卡片悬空、状态锁死；原生拖拽要 `user-select:none` + `dragstart` preventDefault。
7. **vt() 必须带 240ms 自愈**：startViewTransition 回调在页签半隐藏时无限推迟，全站流转会卡死（曾致「书架用不了/第二张抽不了」）。
8. **总目抽屉的性能三件套不能拆**：blur 层不做 opacity 过渡 + 开层冻结底层动画 + 关闭即收。合起来才顺滑。

## 8. cards.html 内部架构速览（改代码前读）

- **状态**：`view` ∈ packs/deck/reader（**catalog 不是 view**，抽屉是叠加层）；`packs` Map（cat→{deck:[],readEver:Set}）；`cardEls`/`chipEls`/`borrowed`；`catalogReturn`；`histDepth`
- **VT morph 锚点**：`card-<id>` 同一时刻只能挂一个元素，统一走 `giveName(id, el)`（持有者互斥：目录卡/牌堆卡/托盘签/阅读页 hero）。目录借用 `ensureCard` 建、`borrowed` 记账、`closeCatalogNow` 回收
- **牌堆**：`layout()` 算每张的 baseTransform（i/n + 每卡 jitter）；拖动跟手靠 `.card.is-top{transition:none}` + `.deck.no-t`；`cycleAway` 把顶卡 splice+unshift 回牌底（回收循环，永不空）；卡片回收不是删除
- **拆封仪式**：openPack 里 setTimeout 链（1350ms 后 vt(go) + 扇面卡 transition 接管下坠淡出）；后台页签下这段会被节流，属预期
- **抽屉**：`openCatalog/closeCatalog/closeCatalogNow` 三函数分工：open 直接构建+滑入（无 VT）；close 走 history.back()；closeNow 干回收（借卡、锚点归还、`cat-open` 冻结解除）
- **调参旋钮**：`--card-w/h`（300/432）、PALETTE 九分类色、封签高度、抽屉宽 408px、面板圆角

## 9. 用户偏好（风格合同）

- 学生、自娱博客、免费优先、karpathy 纪律（外科手术式改动，别推翻重做）
- 审美：refero 编辑风、反 AI 味；白纸+发丝边框+近黑+一点分类色 = 对味；金色/赌场/霓虹 = 廉价；做旧 = 老旧；塑料彩 = 廉价
- 最大权限自主推进；验证以「用户真机看动效」为最终关卡，headless 只做状态断言
- 会话间用户会自己动手改站——改动前先重读文件（可能已被 design mode 改过）
