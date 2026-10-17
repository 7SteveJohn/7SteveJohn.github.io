/**
 * 按住 Tab 唤出目录 / 快速导航（首页与 archive、gallery 共用）
 * ----------------------------------------------------
 * 交互设计（对齐参考视频里的「按住 Tab 键显示导航目录」）：
 *   - 按住 Tab 约 180ms 才接管：不到阈值就抬手 = 浏览器原生焦点导航，一点没动
 *   - 接管后弹出玻璃浮层：在文章阅读弹窗里列该文目录，在页面上列章节与最近文章
 *   - 按住期间 Tab / Shift+Tab 循环高亮（首尾环绕，130ms 防连发），松开跳到高亮项
 *   - Esc 取消，点遮罩取消；aria-live 播报当前状态
 * 实现取舍：首次 keydown 不 preventDefault —— 浏览器会把焦点往后挪一格并发一次
 *   「滚动到焦点」，代价是按住时可能闪一下焦点环；换来的是「轻点 Tab 完全走原生」，
 *   键盘可达性不会因为加了这个功能而倒退。
 * 不依赖 app.js：跳转数学与它保持一致（顶部留 64px、reduced-motion 下不走平滑）。
 */
(function () {
  'use strict';

  const HOLD = 180;        // 按住多久才算「要目录」
  const CYCLE_GAP = 200;   // 连续按住时的换项最小间隔（系统连发大约 30ms 一次，太密不好选）
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let box = null;          // 浮层元素（懒建）
  let live = null;         // aria-live 播报区
  let listEl = null;       // 列表容器
  let entries = [];        // [{ label, kind, el?, href? }]
  let active = 0;
  let engaged = false;
  let timer = 0;
  let lastCycle = 0;

  const isEditable = (el) => !!el && (el.isContentEditable === true || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

  // ---- 收集条目 ----
  function sectionLabel(sec) {
    if (sec.dataset.navLabel) return sec.dataset.navLabel;
    const nav = document.querySelector(`header.site-header nav a[href$="#${sec.id}"]`);
    if (nav && nav.textContent.trim()) return nav.textContent.trim();
    const h = sec.querySelector('h1, h2, h3');
    if (h && h.textContent.trim()) return h.textContent.trim();
    return sec.id;
  }

  function collect() {
    const modal = document.getElementById('article-modal');
    const modalOpen = modal && !modal.classList.contains('hidden');
    const content = document.getElementById('article-modal-content');

    if (modalOpen && content) {
      const toc = [...content.querySelectorAll('.toc-box .toc-link')];
      if (toc.length) {
        return toc.map((a) => {
          const id = a.dataset.tocId;
          const target = id ? content.querySelector('#' + CSS.escape(id)) : null;
          return { label: a.textContent.trim(), kind: 'toc', el: target };
        }).filter((x) => x.el);
      }
      // 标题少于 3 个时 app.js 不生成目录：直接把正文二三级标题列出来
      const heads = [...content.querySelectorAll('.markdown-body h2, .markdown-body h3')];
      if (heads.length) {
        return heads.map((h) => ({ label: h.textContent.trim(), kind: 'toc', el: h }));
      }
    }

    const out = [];
    // 本页章节（首页是 #home/#products/…；次级页是归档/照片墙的主体）
    [...document.querySelectorAll('section[id], main > [id]')].forEach((sec) => {
      if (!sec.id || sec.offsetParent === null) return;
      if (sec.closest('#article-modal, #project-modal, #search-palette')) return;
      out.push({ label: sectionLabel(sec), kind: 'section', el: sec });
    });
    // 站点入口
    out.push({ label: '首页', kind: 'link', href: 'index.html' });
    if (!document.getElementById('archive-list')) out.push({ label: '归档 · 时间河', kind: 'link', href: 'archive.html' });
    if (!document.getElementById('gallery-grid')) out.push({ label: '照片墙', kind: 'link', href: 'gallery.html' });
    // 最近文章（次级页也有 articles.js，一样能用；深链回首页阅读弹窗）
    const arts = (window.ARTICLES_DATA || []).slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 6);
    arts.forEach((a) => {
      out.push({ label: a.title || a.id, kind: 'link', href: 'index.html?post=' + encodeURIComponent(a.id) });
    });
    return out;
  }

  // ---- 浮层 ----
  function build() {
    if (box) return;
    box = document.createElement('div');
    box.id = 'tabnav';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', '快速导航');
    box.hidden = true;

    const panel = document.createElement('div');
    panel.className = 'tabnav-panel glass-spec';
    panel.innerHTML =
      '<p class="tabnav-title">快速导航</p>' +
      '<ul class="tabnav-list" role="listbox" aria-label="可跳转的条目"></ul>' +
      '<p class="tabnav-hint"><b>Tab</b> 循环 · 松开跳转 · <b>Esc</b> 取消</p>';
    box.appendChild(panel);

    live = document.createElement('p');
    live.className = 'tabnav-live';
    live.setAttribute('aria-live', 'polite');

    listEl = panel.querySelector('.tabnav-list');
    document.body.append(box, live);
    box.addEventListener('mousedown', (e) => {
      if (e.target === box) close(false);          // 点遮罩 = 取消
    });
  }

  function paint() {
    [...listEl.children].forEach((li, i) => {
      const on = i === active;
      li.classList.toggle('is-active', on);
      li.setAttribute('aria-selected', String(on));
    });
    const cur = listEl.children[active];
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  }

  function open() {
    build();
    entries = collect();
    if (!entries.length) return false;
    // 弹窗态默认高亮当前该读到的那个标题，页面上默认第一项
    active = 0;
    listEl.textContent = '';
    entries.forEach((it, i) => {
      const li = document.createElement('li');
      li.className = 'tabnav-item';
      li.setAttribute('role', 'option');
      li.dataset.i = String(i);
      li.textContent = it.label;
      li.addEventListener('mouseenter', () => { active = i; paint(); });
      li.addEventListener('click', () => { active = i; close(true); });
      listEl.appendChild(li);
    });
    paint();
    box.hidden = false;
    live.textContent = `已打开快速导航，共 ${entries.length} 项。按住 Tab 循环选择，松开跳转，Esc 取消。`;
    return true;
  }

  function cycle(dir) {
    active = (active + dir + entries.length) % entries.length;
    paint();
    live.textContent = listEl.children[active].textContent;
  }

  // ---- 跳转 ----
  function jump(it) {
    if (!it) return;
    if (it.el) {
      const scroller = document.getElementById('article-modal-content');
      if (scroller && scroller.contains(it.el)) {
        const top = it.el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 16;
        scroller.scrollTo({ top, behavior: reduce() ? 'auto' : 'smooth' });
        return;
      }
      const y = it.el.id === 'home' ? 0
        : it.el.getBoundingClientRect().top + window.scrollY - 64;
      // 统一走 app.js 暴露的 smoothScrollTo（原生平滑滚动）。
      // ❗原先这里调用 window.__dampedScroll(y)，但它是对象不是函数 —— 选中"章节"项时会抛
      //   TypeError 导致跳转静默失败（2026-10-17 随滚轮阻尼一起修正）。
      if (window.smoothScrollTo) window.smoothScrollTo(y);
      else window.scrollTo({ top: y, behavior: reduce() ? 'auto' : 'smooth' });
      if (it.el.id) history.pushState(null, '', '#' + it.el.id);
      return;
    }
    if (it.href) location.href = it.href;
  }

  function close(commit) {
    if (!engaged) return;
    engaged = false;
    clearTimeout(timer);
    const it = entries[active];
    if (box) box.hidden = true;
    if (commit) jump(it);
  }

  // ---- 键盘 ----
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || e.ctrlKey || e.altKey || e.metaKey) return;
    if (isEditable(document.activeElement)) return;

    if (engaged) {
      e.preventDefault();                       // 接管后不再让浏览器挪焦点
      const now = performance.now();
      if (e.repeat && now - lastCycle < CYCLE_GAP) return;   // 系统级连发太快，节流
      lastCycle = now;
      cycle(e.shiftKey ? -1 : 1);
      return;
    }
    if (timer) return;                          // 已经按住过一次，等抬手
    timer = setTimeout(() => {
      timer = 0;
      if (open()) {
        engaged = true;
        lastCycle = performance.now();   // 刚弹出来先停一拍，别立刻跳走
      }
    }, HOLD);
  });

  document.addEventListener('keyup', (e) => {
    if (e.key !== 'Tab') return;
    if (engaged) close(true);
    else if (timer) { clearTimeout(timer); timer = 0; }
  });

  // 捕获阶段拦 Esc：否则 app.js 的全局 Esc 会顺手把阅读弹窗也关掉
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && engaged) {
      e.preventDefault();
      e.stopPropagation();
      close(false);
    }
  }, true);

  window.addEventListener('blur', () => { if (engaged) close(false); });
})();
