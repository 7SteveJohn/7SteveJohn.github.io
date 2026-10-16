/**
 * 收藏数据（links.html 的「收藏夹」区）
 * ----------------------------------------------------
 * 结构：分组 → 条目。加一条就是加一行，刷新即可见。
 *   { group: '分组名',
 *     items: [{ name, url, desc, tags: ['标签'] }] }
 *
 * ❗这里只放**外链入口**，不加载任何第三方资源（站点的零外链红线不受影响：
 *   访客点开才离开本站，页面本身不会请求这些域名）。
 * 默认这几条是通用开发资源，可随意删改；你自己的常用链接建议放最上面一组。
 */
window.BOOKMARKS_DATA = [
  {
    group: '开发文档',
    items: [
      { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/zh-CN/', desc: 'Web 平台最权威的中文文档：HTML / CSS / JS 与浏览器 API', tags: ['前端', '参考'] },
      { name: 'Can I use', url: 'https://caniuse.com/', desc: '某个 CSS/JS 特性在各浏览器里的支持情况，写兼容代码前先查', tags: ['兼容性'] },
      { name: 'Android Developers', url: 'https://developer.android.com/', desc: 'Android 官方文档，权限模型与生命周期都在这里', tags: ['Android'] },
      { name: 'Python 官方文档', url: 'https://docs.python.org/zh-cn/3/', desc: '标准库速查，比搜索引擎更准', tags: ['Python'] }
    ]
  },
  {
    group: '工具与素材',
    items: [
      { name: 'Squoosh', url: 'https://squoosh.app/', desc: '浏览器内的图片压缩：本站封面转 webp 就用它（本地跑，不上传）', tags: ['图片', '性能'] },
      { name: 'regex101', url: 'https://regex101.com/', desc: '正则调试与逐段解释，写完先在这里试', tags: ['正则'] },
      { name: 'GitHub', url: 'https://github.com/', desc: '代码与部署的落脚点', tags: ['Git'] }
    ]
  },
  {
    group: '本站相关',
    items: [
      { name: '本站 GitHub 仓库', url: 'https://github.com/7SteveJohn/7SteveJohn.github.io', desc: '这个站的源码：纯静态、零外链、可双击打开', tags: ['源码'] },
      { name: '归档 · 时间河', url: 'archive.html', desc: '全部文章按时间排成一条曲线（站内页面）', tags: ['站内'] }
    ]
  }
];
