// Servidor estático mínimo para testar o painel localmente.
//   node serve.js          → só este computador (http://localhost:8787)
//   node serve.js --rede   → libera para outros aparelhos da mesma rede Wi-Fi
const http = require('http'), fs = require('fs'), path = require('path');

const PORTA = 8787;
const HOST = process.argv.includes('--rede') ? '0.0.0.0' : '127.0.0.1';

// Lista fechada: nada fora disto é servido (nem .git, nem serve.js, nem outros arquivos da pasta)
const ARQUIVOS = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/mapa-brasil.js': ['mapa-brasil.js', 'text/javascript; charset=utf-8'],
};

const SEGURANCA = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cache-Control': 'no-store',
};

http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.writeHead(405, { ...SEGURANCA, Allow: 'GET, HEAD' }).end();
  }
  const rota = ARQUIVOS[(req.url || '/').split('?')[0]];
  if (!rota) return res.writeHead(404, SEGURANCA).end('Não encontrado');

  fs.readFile(path.join(__dirname, rota[0]), (err, buf) => {
    if (err) return res.writeHead(500, SEGURANCA).end();
    res.writeHead(200, { ...SEGURANCA, 'Content-Type': rota[1] });
    res.end(req.method === 'HEAD' ? undefined : buf);
  });
}).listen(PORTA, HOST, () => {
  console.log(`Apuração 2026 em http://localhost:${PORTA}`);
  if (HOST === '0.0.0.0') console.log('Atenção: acessível por outros aparelhos da rede. Feche com Ctrl+C quando terminar.');
});
