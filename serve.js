// Servidor estático mínimo: node serve.js  →  http://localhost:8787
const http = require('http'), fs = require('fs'), path = require('path');
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css' };
http.createServer((req, res) => {
  const file = path.join(__dirname, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(__dirname)) return res.writeHead(403).end();
  fs.readFile(file, (err, buf) => {
    if (err) return res.writeHead(404).end('Não encontrado');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(buf);
  });
}).listen(8787, () => console.log('Apuração 2026 em http://localhost:8787'));
