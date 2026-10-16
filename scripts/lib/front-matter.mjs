/**
 * 极简 front matter 解析/序列化（零依赖）
 * ----------------------------------------------------
 * 支持的语法（够文章与连载章节用，复杂结构请改数据文件而不是硬塞进 front matter）：
 *
 *   ---
 *   id: some-id                # 行首 # 的整行注释会被忽略
 *   title: 带「引号」和: 冒号的标题
 *   tags: [Python, Ollama]     # 方括号数组，逗号分隔
 *   cover: "assets/images/x.webp"   # 需要引号时用单/双引号
 *   featured: true             # true/false 会解析成布尔
 *   ---
 *   正文……
 *
 * ❗不支持行尾注释：`tags: [C#]` 里的 # 是内容，按行尾注释处理会被吃掉。
 *   注释请单独占一行。
 */

const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function unquote(v) {
  const s = v.trim();
  if ((s.startsWith('"') && s.endsWith('"') && s.length > 1) || (s.startsWith("'") && s.endsWith("'") && s.length > 1)) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  }
  return s;
}

function parseValue(raw) {
  const v = raw.trim();
  if (!v) return '';
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((x) => unquote(x)).filter((x) => x !== '');
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  return unquote(v);
}

export function parseFrontMatter(text) {
  const src = String(text || '').replace(/^\uFEFF/, '');
  const m = FM.exec(src);
  if (!m) return { data: {}, body: src, hasFrontMatter: false };

  const data = {};
  m[1].split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const i = t.indexOf(':');
    if (i < 0) return;
    const key = t.slice(0, i).trim();
    if (!key) return;
    data[key] = parseValue(t.slice(i + 1));
  });
  return { data, body: src.slice(m[0].length), hasFrontMatter: true };
}

const NEED_QUOTE = /[:#\[\]{}",']|^\s|\s$|^$|^(true|false)$/;

function serValue(v) {
  if (Array.isArray(v)) return '[' + v.map((x) => serValue(x)).join(', ') + ']';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v == null ? '' : v);
  // 冒号、方括号、引号、首尾空格、空串、true/false 这类都要加引号，避免解析歧义
  return (NEED_QUOTE.test(s) || s === '' || /^(true|false)$/i.test(s)) ? '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"' : s;
}

/**
 * @param {object} data  字段表
 * @param {string[]} order 期望的键顺序（其余的按原顺序追加）
 * @param {string} body  正文（不以换行开头；会补一个换行）
 */
export function stringifyFrontMatter(data, order, body) {
  const keys = [];
  (order || []).forEach((k) => { if (data[k] !== undefined) keys.push(k); });
  Object.keys(data).forEach((k) => { if (!keys.includes(k)) keys.push(k); });
  const head = keys.map((k) => `${k}: ${serValue(data[k])}`).join('\n');
  const text = String(body == null ? '' : body).replace(/^\n+/, '').replace(/\s+$/, '');
  return `---\n${head}\n---\n\n${text}\n`;
}
