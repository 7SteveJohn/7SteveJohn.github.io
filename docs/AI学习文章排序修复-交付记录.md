# AI 学习文章排序修复 · 交付记录

## 1. 问题背景
在首页「把 AI 想明白 · 于此拆解概念、原理、路径与边界」板块中，文章卡片的展示顺序出现错乱（呈现为「四、Agent 为什么会翻车...」、「五、中国 AI 的长板与短板...」、「一、Token 是什么...」），未按标题自带的中文序号（一至七）正确排序。

## 2. 根因分析
1. **构建脚本排序缺陷**：在 `scripts/build-articles.mjs` 中，读取 `posts/*.md` 时代替原手写数组的是 `listMd(POSTS).sort()`。该操作仅按照本地磁盘文件名（字母 ASCII 字典序）读取文件：
   - `ai-agent-boundary.md`（四）
   - `ai-china-landscape.md`（五）
   - `ai-concepts-primer.md`（一）
   - `ai-frontier-mirror.md`（七）
   - `ai-jobs-rethink.md`（六）
   - `ai-learning-paths.md`（三）
   - `ai-model-training.md`（二）
   生成的 `window.ARTICLES_DATA` 中 AI 模块项顺序被全盘打乱为：四、五、一、七、六、三、二。
2. **前端假定依赖**：`js/app.js` 在渲染 AI 模块时配置了 `useArrayOrder: true`（依赖数据源数组保持预设顺序），且弹窗翻页 `getSiblingList` 亦直接读取数组顺序，缺乏对标题序号的容错排序。

## 3. 修复方案实施

### 3.1 构建源头修复 (`scripts/build-articles.mjs`)
- 新增 `parseTitleOrder(title)`：精准解析标题开头的中文数字序号（「一、」、「二、」...至「十」）及阿拉伯数字序号。
- 规范化排序输出：
  - 普通文章（手记、随笔、创作）按发布日期升序输出，与历史手写结构完全对齐；
  - AI 学习系列文章（`section === 'ai'`）按标题中文序号（一至七）严格升序排列在手记后。
- 重新生成 `js/articles.js`、`js/novel-data.js`、`rss.xml`、`sitemap.xml`。

### 3.2 前端双重容错保底 (`js/app.js`)
- 新增 `getTitleOrder(title)` 提取中文与数字序号。
- 在 `renderArticleSection` 中：当 `useArrayOrder: true` 时，显式按标题序号升序排序。
- 在 `getSiblingList` 中：当 `article.section === 'ai'` 时，上一篇/下一篇翻页列表按标题序号升序排序。

### 3.3 Bundle 同步编译 (`scripts/build-bundles.mjs`)
- 执行 `node scripts/build-bundles.mjs`，将更新后的 `js/app.js` 重新编译入 `js/bundles/home.js`。

## 4. 验证结果
1. `node scripts/build-articles.mjs --check`：通过（16 篇文章，1 本书）。
2. `node scripts/build-bundles.mjs --check`：通过（6 个 bundle 校验逐字节一致）。
3. 检查生成的数据 `js/articles.js` 与前端运行时渲染：
   - 1. 一、Token 是什么：把 AI 圈最容易用错的几个词说清楚 (2026-09-23)
   - 2. 二、大模型是怎么炼成的：从数据清洗到人类对齐 (2026-09-25)
   - 3. 三、学 AI 要不要先啃高数：普通人现实可走的四条路 (2026-09-27)
   - 4. 四、Agent 为什么会翻车：智能体的能力边界在哪 (2026-09-29)
   - 5. 五、中国 AI 的长板与短板：为什么落地快、原创少 (2026-10-01)
   - 6. 六、AI 会抢走谁的饭碗：为什么不必都挤向开发岗 (2026-10-03)
   - 7. 七、AI 的下一程：算力的账、走出屏幕的智能与治理的规则 (2026-10-05)
   已完全按照标题序号（一至七）正序展示，弹窗顺序翻页恢复正常。
