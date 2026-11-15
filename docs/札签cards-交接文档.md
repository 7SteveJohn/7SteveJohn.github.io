# 札签 cards · 交接文档（2026-11-15 起，2026-11-16 二次大更新：模块化 + 首页嵌入）

> 给新对话的完整上下文。目标：札签卷宗融入博客——独立页 + **首页 #blog 内嵌卷宗视图**。
> 本文档假设读者从零开始读，所有历史决策都写明了原因。

---

## 1. 一句话现状

札签已从单文件 demo 升级为**三件套模块**：`js/cards.js`（CardsCore，体验本体零重写）+ `css/cards.css`（.cards-scope 作用域化）+ `cards.html`（thin shell 独立页）。**首页 #blog 已内嵌卷宗架**（默认视图，「札签卷宗 ⇄ 文章列表」切换），点卷宗开全屏 portal。独立页与首页共用同一模块。**2026-11-16 晚：用户拍板「全部文章卡包化」——创作/随笔/AI 学习三个列表区块连同导航锚点撤除，#blog 成为唯一文章区（全库 19 篇 9 卷，标题「文章 · 开发手记、创作随笔与 AI 学习」，导航标签「文章」），列表视图也是全库同口径。**全部链路实测绿、零报错；本地 main 领先远端，push 等用户确认。

## 2. 交付物与文件

| 文件 | 状态 | 说明 |
|---|---|---|
| `D:\HTML\js\cards.js` | 新增（37.9KB） | CardsCore 模块：`mount(root, opts)` / `destroy()`；体验逻辑从旧 cards.html 内联脚本**整体提取、零重写**（构建器 `$TEMP/cards-js-build.mjs`，37 条精确替换+断言） |
| `D:\HTML\css\cards.css` | 新增（31.7KB） | 全部选择器 `.cards-scope ` 前缀；:root/html.dark 25 变量 → `.cards-scope` / `html.dark .cards-scope`；body 级规则拆 `body.cards-page`（独立页）+ `#cards-root`（portal）；末尾 `.cards-scope--inline` 覆写段（首页内嵌用） |
| `D:\HTML\cards.html` | thin shell（1585→80 行） | 壳顶栏/页脚 + VT 时长 + body 级规则内联自持；`CardsCore.mount(#cards-main, {mode:'full', standalone:true, themeBtn})` |
| `D:\HTML\index.html` | 已改 | #blog 栏头 `札签卷宗 ⇄ 文章列表` toggle 按钮 + `<div id="blog-cards" class="cards-scope cards-scope--inline" hidden>`；**#ai/#creation/#essays 三区块已删**，标题「文章 · 开发手记、创作随笔与 AI 学习」；home.js ?v=20261116b |
| `D:\HTML\js\app.js` | 已改 | `initBlogCards()`（视图记忆 sj.blogView / IO 懒加载 / openPortal+token 门控 / ✕ 按钮）；`initArticles` match=`()=>true`（列表=全库）；`initCreation/initEssays/initAi` 已删；已进 home bundle 重建 |
| `D:\HTML\sw.js` | **故意没动** | cards.css/js 不进 CORE（SWR 运行时缓存兜底，离线首访回落列表）；archive/index 只改内容不改 CORE 清单 → 不 bump |
| `C:\...\Temp\cards-css-build.mjs` / `cards-js-build.mjs` | 临时构建器 | 从 `cards-style-raw.css` / `cards-script-raw.js`（旧 cards.html 的 sed 抽取）生成，可复跑幂等；改模块后重跑 |
| 本文档 + memory `card-deck-3d-bookshelf.md` | 持久 | 交接知识库 |

## 3. 页面结构（已定型，别重做）

**流程**：卷宗架（白纸封筒+袋口折边+分类色封签+左缘竖色签+「未启 N 札」）→ 点卷宗 = 拆封仪式（封条撕飞→墨线光轮→纸屑→卷签升起）→ 牌堆（**拖动左右=翻看下一张不计数；轻点=拆签阅读**）→ VT morph 进阅读页 → 关闭回原视图。左下「已入册」托盘；右上「总目」右侧窄抽屉（408px）。

**明确的禁区**（用户否决过，别加回来）：金箔/赌场感/烫金=廉价；做旧=老旧；书架建模已弃；卷宗卡面无水印大字/内卡露头；总目不能整页跳转/半屏模态。

## 4. 三种挂载模式（CardsCore.mount 的约定）

```
mount(root, opts) → { destroy } | null
opts.mode       'full' 全屏体验 | 'shelf' 仅卷宗架
opts.standalone true=独立页（主题钮接管、读罢自解锁 body）
opts.startPack  full 挂载后自动拆这卷（portal 进场）
opts.filter     条目过滤（首页传 a=>!a.section 只收 9 篇手记；独立页不传=全库 19）
opts.onExit     full+嵌入：Esc 在卷宗架档回调宿主
opts.requestOpen shelf：点卷宗回调宿主
opts.themeBtn   standalone 主题钮元素（在壳顶栏里，不在挂载根内！）
```

| 挂载 | 宿主 | 位置 |
|---|---|---|
| 独立页 full | cards.html | `#cards-main`（body.cards-scope.cards-page 之下） |
| 首页 shelf | index.html #blog | `#blog-cards.cards-scope.cards-scope--inline`（hidden 切换，**列表 DOM 永不清**）；**不传 filter = 全库 19 篇 9 卷**（首页唯一文章区） |
| 首页 portal | app.js 动态建 | `#cards-root.cards-scope`（fixed inset:0 z-55，destroy+remove）；同全库口径 |

**作用域手术要点**（改 CSS 前读）：冻结类 `cat-open` 挂 **scope 根**（`scopeEl = root.closest('.cards-scope') || root`）；gacha fx 挂 scopeEl（portal 内 z 正确、standalone=body 与旧一致）；`--ink` 取色用 `getComputedStyle(scopeEl)`；`::view-transition` 三条**只在独立页 shell 内联**（首页用自己的 VT 时长）；`.spread` 是纯 JS 状态类无 CSS（grep 扫孤儿类时别误报）。

## 5. 首页集成（app.js initBlogCards）

- **视图切换**：`sj.blogView` 记忆（默认 deck）；列表 DOM 永远渲染只切显示——`test-scroll-and-covers / verify-all-covers-complete / video-fx-smoke / test-review-verification` 四个脚本锁死 `#articles-list` DOM 形态，**别清列表**
- **懒加载**：IO rootMargin 600px 观察 #blog → 注入 cards.css+cards.js → mount shelf；失败回落列表并藏按钮。⚠️ IAB/后台页签 IO 会节流不触发（同 §7.3 rAF 冻结），测试走按钮点击路径
- **portal 生命周期**：openPortal 建 root → mount（✕ 按钮**必须在 mount 之后追加**，innerHTML 会清根）→ pushState `{cardsOv:'portal', portalToken}` → body 锁滚；退出三路（✕/Esc 两下/后退手势）都走 history.back() → popstate **token 门控**销毁：`(history.state?.portalToken) !== portal.token` 即关——一次性 token 防多 portal 条目残留（刷新前的旧条目）误放行
- **口径（2026-11-16 晚定）**：shelf/portal/列表视图一律**全库 19 篇 9 卷**（filter 已移除）；创作/随笔/AI 学习三区块已撤，文章唯一入口=#blog 卡包
- **分类目录条**（`#blog-toc`，在卡包架/列表**下方附录位**，details **默认收起**）：summary 一行 mono「// 目录 · 9 卷 19 篇」；展开=两级索引（分类+accent 篇数，点=拆封仪式 / 每篇文章标题，点=startArticle 直达阅读）；openPortal/openArticleFromToc 都包 ensureCards（懒加载前点也能直达）；grid 用 inline style（gap-x-4 未编译别用）。曾放栏头下展开态，被用户评「抢了卡包的风头」→ 降位+收起（14ce6c8）
- **弹窗互斥**：嵌入模式阅读页「在博客中阅读」被 hidden（防文章弹窗叠 portal 抢 body 锁）；模块 `closeReaderNow` 在 standalone 才解锁 body（嵌入模式的锁归宿主）

## 6. 剩余工作

1. **用户真机验收**（headless/IAB 测不了动效）：首页点卷宗的拆封仪式、portal 内拖拽手感、✕/后退手势、shelf 在首页亮暗两态的观感、blog 区高度是否舒服
2. **push**：本地 main 领先远端 13 个提交（含 66c31c8 收尾 + 本次模块化），用户确认后 push
3. **可选深化**（交接 5.5-②）：归档页与札签互链成「表格/卡片/卷宗」三浏览形态
4. **上线后观察**：cards.js/css 未进 CORE，离线首访卷宗视图会回落列表（第二次访问 SWR 已缓存）——用户在意的话再加 CORE+bump

## 7. 验证工作流（已实测可复用）

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8391/cards.html   # 000 就重启 guard
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8327/index.html   # 000 就 python -m http.server 8327 --bind 127.0.0.1
SITE_BASE=http://localhost:8327/ node scripts/smoke-home.mjs                # 15/15
node scripts/verify-all-covers-complete.mjs                                  # 33/33（写死 8328 的脚本先起 8328）
```
- browser-use：断言优先截图；**首页测试先清 SW+caches 再 reload**（改 bundle 同 URL 必吃旧缓存）；固定 waitForTimeout 有竞态，用轮询断言
- ⚠️ `test-scroll-and-covers` 恒 17 过 1 挂（「dedicated covers」把 start-here 两个按钮算进卡片，10-31 起先于本次改动存在，非回归）
- 改模块后：`node $TEMP/cards-js-build.mjs`（或 css 版）→ `node --check` → build-bundles → 四脚本

## 8. 踩坑记录（必读，全部实测）

1. **patch/构建脚本里含 `${...}` 的串必须单引号**；替换串先 grep 命中数再 split/join，禁止裸 re.sub
2. **大范围搬移后必 grep 动态类名**（gacha-*/motes/spread/no-t/is-top/…在 cards.css 全须在场）
3. **mount 的 innerHTML 会清挂载根**——宿主注入的元素（如 ✕）必须 mount 之后再 append
4. **history 门控用一次性 token**：多 portal 条目残留（刷新前会话）会让 cardsOv 标记失灵；`portalToken` 不匹配即销毁
5. **嵌入模式 body 锁归宿主**：模块 closeReaderNow 只在 standalone 解锁，否则读罢 portal 底页可滚
6. **CSS 媒体块内的选择器也要前缀**——作用域构建器 v1 只扫 depth 0 漏了 @media 内层（.pile/reduce 块），已修为「pre-brace 无分号即选择器」
7. browser-use 后台页签：rAF/IO/WAAPI 全冻结、setTimeout 节流——只验 timer 状态变化，动效真机看；进场 class 用 setTimeout(30) 别用 rAF
8. WAAPI easing 不解析 CSS 变量 → SPRING 字面量随 JS 走；拖拽 `_suppressed`/pointercancel 归位语义别动；vt() 240ms 自愈别删；总目三件套（blur 显隐+冻结+即收）别拆
9. 同一文件多个 Edit 不能并行（旧快照覆盖）；中文提交信息走 `git commit -F` 文件

## 9. 用户偏好（风格合同）

- 学生、自娱博客、免费优先、karpathy 纪律（外科手术式改动，别推翻重做）
- refero 编辑风、反 AI 味；白纸+发丝边框+近黑+分类色点睛=对味；金/赌场/霓虹=廉价；做旧=老旧
- 最大权限自主推进；最终关卡=用户真机看动效；会话间用户会自己动手改站——**动手前先重读文件**
