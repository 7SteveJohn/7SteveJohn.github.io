/* Range 支持的静态服务器（模拟 GitHub Pages/Fastly 行为），端口 8328 */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = 'D:/HTML';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
  '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain'
};
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const abs = path.join(ROOT, p);
  fs.stat(abs, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<h1>File not found</h1>'); return; }
    const type = MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d+)-(\d*)/.exec(range) || [];
      let start = Number(m[1] || 0), end = m[2] ? Number(m[2]) : st.size - 1;
      if (start >= st.size) { res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }); res.end(); return; }
      end = Math.min(end, st.size - 1);
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': 'bytes ' + start + '-' + end + '/' + st.size, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes' });
      fs.createReadStream(abs, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
      fs.createReadStream(abs).pipe(res);
    }
  });
}).listen(8328, '127.0.0.1', () => console.log('node static server (Range OK) on http://localhost:8328'));
