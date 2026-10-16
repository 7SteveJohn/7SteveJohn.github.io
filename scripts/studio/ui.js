/**
 * 写作台前端（scripts/studio/ui.js）
 * ----------------------------------------------------
 * 只跟本机服务打交道：列表 / 取单篇 / 保存（写 md → 校验 → 生成）/ 上传图片 / 发布。
 * 预览用的是站点自托管的 marked + purify（经 /vendor/ 提供），所以预览效果与线上一致。
 */
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const logEl = $('#log');
  const listEl = $('#list');
  const metaEl = $('#meta');
  const mdEl = $('#md');
  const preEl = $('#preview');
  const fileEl = $('#cur-file');
  const wordsEl = $('#words');

  const SECTIONS = [
    { v: '', t: '技术手记（缺省）' },
    { v: 'creation', t: '创作（小说 / 游戏创作）' },
    { v: 'essay', t: '随笔' },
    { v: 'ai', t: 'AI 学习' }
  ];

  // 字段描述：按类型渲染元信息表单
  const FIELDS = {
    article: [
      { k: 'id', label: 'id（深链用，英文/数字/短横线）', type: 'text' },
      { k: 'title', label: '标题', type: 'text' },
      { k: 'date', label: '日期 YYYY-MM-DD', type: 'text' },
      { k: 'readTime', label: '阅读时长（可留空）', type: 'text' },
      { k: 'category', label: '分类（如 架构设计 / 随笔）', type: 'text' },
      { k: 'section', label: '栏目', type: 'select', options: SECTIONS },
      { k: 'tags', label: '标签（逗号分隔）', type: 'tags' },
      { k: 'cover', label: '封面路径（可上传）', type: 'cover' },
      { k: 'summary', label: '摘要（列表与 RSS 用，必填）', type: 'text', wide: true }
    ],
    chapter: [
      { k: 'book', label: 'book（书 id）', type: 'text' },
      { k: 'bookTitle', label: '书名', type: 'text' },
      { k: 'author', label: '作者', type: 'text' },
      { k: 'volume', label: '卷名（如 第一卷 · 起）', type: 'text' },
      { k: 'chapter', label: 'chapter（章 id）', type: 'text' },
      { k: 'chapterTitle', label: '章节标题', type: 'text' },
      { k: 'order', label: '序号（数字，决定顺序）', type: 'number' },
      { k: 'bookCover', label: '书封面（可上传）', type: 'cover' },
      { k: 'bookSample', label: '标记为示例内容', type: 'checkbox' },
      { k: 'intro', label: '书简介', type: 'text', wide: true }
    ]
  };

  const state = { data: null, file: '', type: 'article', list: { articles: [], books: [] } };

  const api = async (p, opt) => {
    const r = await fetch(p, opt);
    return r.json();
  };
  function log(msg, isErr) {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    logEl.innerHTML += (logEl.innerHTML ? '\n' : '') + `<span class="${isErr ? 'err' : ''}">[${time}] ${esc(msg)}</span>`;
    logEl.scrollTop = logEl.scrollHeight;
  }
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------------- 列表 ----------------
  async function refresh(keepFile) {
    const d = await api('/api/list');
    if (!d.ok) return log('读取清单失败：' + d.error, true);
    state.list = d;
    renderList();
    if (keepFile) {
      const still = listFiles().includes(keepFile);
      state.file = still ? keepFile : '';
      if (!still) { fileEl.textContent = '未选择文件'; return; }
    }
  }
  function listFiles() {
    return [...state.list.articles.map((a) => a.file), ...state.list.books.flatMap((b) => b.chapters.map((c) => c.file))];
  }

  function renderList() {
    const q = ($('#search').value || '').trim().toLowerCase();
    const hit = (o) => !q || [o.id, o.title, (o.tags || []).join(' '), o.summary].join(' ').toLowerCase().includes(q);
    listEl.innerHTML = '';
    const arts = state.list.articles.filter(hit);
    if (arts.length) {
      listEl.insertAdjacentHTML('beforeend', `<p class="group-title">文章 · ${arts.length}</p>`);
      arts.forEach((a) => listEl.appendChild(itemBtn({
        file: a.file, title: a.title, meta: `${a.section || 'tech'} · ${a.date} · ${a.words} 字`
      })));
    }
    state.list.books.forEach((b) => {
      const chs = b.chapters.filter((c) => !q || hit({ id: c.chapter, title: c.title, summary: '' }));
      if (!chs.length) return;
      listEl.insertAdjacentHTML('beforeend', `<p class="group-title">连载 · ${esc(b.title)}</p>`);
      chs.forEach((c) => listEl.appendChild(itemBtn({
        file: c.file, title: c.title, meta: `${c.volume} · 第 ${c.order} 章 · ${c.words} 字`
      })));
    });
    if (!listEl.children.length) listEl.innerHTML = '<p class="group-title">没有匹配的文件</p>';
  }

  function itemBtn({ file, title, meta }) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'item' + (file === state.file ? ' is-on' : '');
    b.dataset.file = file;
    b.innerHTML = `<b>${esc(title || file)}</b><span>${esc(meta)}</span>`;
    b.addEventListener('click', () => load(file));
    return b;
  }

  // ---------------- 取单篇 ----------------
  async function load(file) {
    const d = await api('/api/get?file=' + encodeURIComponent(file));
    if (!d.ok) return log('打开失败：' + d.error, true);
    state.file = d.file;
    state.type = d.type;
    state.data = d.data || {};
    fileEl.textContent = d.file;
    renderMeta();
    mdEl.value = d.body || '';
    renderPreview();
    [...listEl.querySelectorAll('.item')].forEach((el) => el.classList.toggle('is-on', el.dataset.file === state.file));
  }

  // ---------------- 元信息表单 ----------------
  function renderMeta() {
    metaEl.innerHTML = '';
    const fields = FIELDS[state.type] || [];
    fields.forEach((f) => metaEl.appendChild(fieldEl(f)));
  }

  function fieldEl(f) {
    const wrap = document.createElement('div');
    wrap.className = 'field' + (f.wide ? ' wide' : '');
    const cur = state.data ? state.data[f.k] : undefined;
    wrap.innerHTML = `<label>${esc(f.label)}</label>`;

    if (f.type === 'select') {
      const sel = document.createElement('select');
      sel.dataset.k = f.k;
      f.options.forEach((o) => sel.insertAdjacentHTML('beforeend', `<option value="${o.v}">${esc(o.t)}</option>`));
      sel.value = cur == null ? '' : String(cur);
      wrap.appendChild(sel);
      return wrap;
    }
    if (f.type === 'checkbox') {
      const c = document.createElement('input');
      c.type = 'checkbox';
      c.dataset.k = f.k;
      c.checked = cur === true;
      wrap.appendChild(c);
      return wrap;
    }
    if (f.type === 'tags') {
      const i = document.createElement('input');
      i.type = 'text';
      i.dataset.k = f.k;
      i.value = Array.isArray(cur) ? cur.join(', ') : (cur || '');
      i.placeholder = 'Python, Windows';
      wrap.appendChild(i);
      return wrap;
    }
    if (f.type === 'cover') {
      const row = document.createElement('div');
      row.className = 'row';
      const i = document.createElement('input');
      i.type = 'text';
      i.dataset.k = f.k;
      i.value = cur || '';
      i.placeholder = 'assets/images/xxx.webp';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn';
      btn.textContent = '上传';
      btn.addEventListener('click', () => uploadImage(i));
      row.append(i, btn);
      wrap.appendChild(row);
      return wrap;
    }
    const i = document.createElement('input');
    i.type = f.type === 'number' ? 'number' : 'text';
    i.dataset.k = f.k;
    i.value = cur == null ? '' : String(cur);
    wrap.appendChild(i);
    return wrap;
  }

  function collect() {
    const data = {};
    metaEl.querySelectorAll('[data-k]').forEach((el) => {
      const k = el.dataset.k;
      if (el.type === 'checkbox') {
        const was = state.data ? state.data[k] : undefined;
        if (el.checked || was !== undefined) data[k] = el.checked;
        return;
      }
      const v = el.value.trim();
      if (k === 'tags') data[k] = v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];
      else if (k === 'order') data[k] = Number(v || 0);
      else if (v !== '') data[k] = v;
      else if (state.data && state.data[k] !== undefined) data[k] = '';
    });
    return data;
  }

  // ---------------- 预览 ----------------
  let renderT = 0;
  function renderPreview() {
    clearTimeout(renderT);
    renderT = setTimeout(() => {
      const md = mdEl.value || '';
      wordsEl.textContent = md.replace(/\s/g, '').length + ' 字';
      try {
        const html = window.marked ? window.marked.parse(md) : md;
        preEl.innerHTML = window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
      } catch (e) {
        preEl.textContent = '预览失败：' + e.message;
      }
      const cover = (collect().cover || collect().bookCover || '');
      const box = $('#cover-box');
      if (cover) {
        box.hidden = false;
        box.innerHTML = `<img src="/${esc(cover.replace(/^\/+/, ''))}" alt="封面预览" onerror="this.parentNode.hidden=true" />`;
      } else {
        box.hidden = true;
      }
    }, 220);
  }

  // ---------------- 保存 / 生成 / 发布 ----------------
  async function save() {
    if (!state.file) return log('还没选择文件（可以先点「新建文章」）', true);
    const data = collect();
    const r = await api('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: state.file, data, body: mdEl.value })
    });
    log(r.log || (r.ok ? '已保存并生成' : '保存失败'), !r.ok);
    if (!r.ok && r.error) log(r.error, true);
    if (r.ok) { state.data = data; refresh(true); }
  }

  async function publish() {
    const msg = prompt('提交信息（git commit -m）', 'content: 写作台更新');
    if (msg === null) return;
    const dryRun = $('#dry').checked;
    log(dryRun ? '演练中（不提交、不推送）……' : '发布中（生成 + 提交 + 推送）……');
    const r = await api('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, dryRun })
    });
    log(r.log || '', !r.ok);
    if (r.error) log(r.error, true);
  }

  async function uploadImage(inputEl) {
    const pick = document.createElement('input');
    pick.type = 'file';
    pick.accept = 'image/*';
    pick.addEventListener('change', async () => {
      const file = pick.files && pick.files[0];
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) return log('图片超过 8MB，先压缩一下', true);
      const buf = await file.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      log('上传中：' + file.name);
      const r = await api('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, data: b64 })
      });
      log(r.log || r.error, !r.ok);
      if (r.ok) { inputEl.value = r.path; renderPreview(); }
    });
    pick.click();
  }

  // ---------------- 新建 ----------------
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function newArticle() {
    const id = prompt('新文章 id（英文/数字/短横线，深链 index.html?post=<id>）', '');
    if (!id) return;
    const clean = id.trim().replace(/[^\w-]/g, '-');
    if (listFiles().includes('posts/' + clean + '.md')) return log('这个 id 已经存在：' + clean, true);
    state.type = 'article';
    state.file = 'posts/' + clean + '.md';
    state.data = { id: clean, date: today(), readTime: '', category: '技术手记', section: '', summary: '' };
    fileEl.textContent = state.file + '（未保存）';
    renderMeta();
    mdEl.value = '### 问题\n\n（先写清遇到了什么）\n\n### 过程\n\n（试了什么、撞了什么墙）\n\n### 结论\n\n（最后怎么定的，为什么）\n';
    renderPreview();
    log('已建立草稿，填好摘要后按 Ctrl+S 保存（会在 posts/ 下生成 ' + clean + '.md 并重新生成数据）');
  }

  function newChapter() {
    const book = prompt('书 id（英文/数字/短横线）', '');
    if (!book) return;
    const cleanBook = book.trim().replace(/[^\w-]/g, '-');
    const existing = state.list.books.find((b) => b.id === cleanBook);
    const chapter = prompt('章 id（如 ch-3）', 'ch-1');
    if (!chapter) return;
    const cleanCh = chapter.trim().replace(/[^\w-]/g, '-');
    const order = existing ? existing.chapters.length + 1 : 1;
    state.type = 'chapter';
    state.file = `posts/novel/${cleanBook}/${String(order).padStart(3, '0')}-${cleanCh}.md`;
    state.data = {
      book: cleanBook,
      bookTitle: existing ? existing.title : cleanBook,
      author: 'SevenJohn',
      volume: existing && existing.chapters[0] ? existing.chapters[0].volume : '第一卷 · 起',
      chapter: cleanCh,
      chapterTitle: '第 ' + order + ' 章 ',
      order,
      intro: existing ? '' : '一句话简介'
    };
    fileEl.textContent = state.file + '（未保存）';
    renderMeta();
    mdEl.value = '（正文 Markdown，章节标题写在 front matter 里）\n';
    renderPreview();
    log('已建立章节草稿，Ctrl+S 保存到 ' + state.file);
  }

  // ---------------- 事件 ----------------
  $('#btn-save').addEventListener('click', save);
  $('#btn-publish').addEventListener('click', publish);
  $('#btn-new-article').addEventListener('click', newArticle);
  $('#btn-new-chapter').addEventListener('click', newChapter);
  $('#btn-build').addEventListener('click', async () => {
    const r = await api('/api/build', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    log(r.log || r.error, !r.ok);
  });
  $('#btn-clear').addEventListener('click', () => { logEl.textContent = ''; });
  $('#search').addEventListener('input', renderList);
  mdEl.addEventListener('input', renderPreview);
  metaEl.addEventListener('input', renderPreview);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });

  // ---------------- 启动 ----------------
  (async () => {
    await refresh();
    log('写作台就绪。流程：新建/选中 → 写正文与元信息 → 保存（写 md + 校验 + 生成）→ 发布（提交并推送）。');
    log('预览用站点自托管的 marked + purify，与线上渲染一致；图片上传后会自动转 webp（若本机有 ffmpeg）。');
  })();
})();
