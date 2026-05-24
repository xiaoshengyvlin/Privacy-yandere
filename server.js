const http = require('http');

const PORT = process.env.PORT || 8080;
const IP_API = 'http://ip-api.com/json/';

http.createServer((req, res) => {
  if (req.method !== 'GET' || req.url !== '/api/geo') {
    res.writeHead(404);
    res.end();
    return;
  }

  // x-forwarded-for 可能含多级代理 IP，取最左边（原始客户端）
  let clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
              || req.socket.remoteAddress;

  // 只允许 IPv4 和合法格式，防注入
  if (!/^[0-9a-fA-F.:]+$/.test(clientIp) || clientIp.length > 45) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'fail' }));
    return;
  }

  if (clientIp.startsWith('::ffff:')) clientIp = clientIp.slice(7);

  http.get(IP_API + clientIp, (upstream) => {
    let body = '';
    upstream.on('data', c => body += c);
    upstream.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
    });
  }).on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'fail' }));
  });
}).listen(PORT, '127.0.0.1', () => {
  // 只监听 127.0.0.1，拒绝外部直连
  console.log(`Geo proxy listening on 127.0.0.1:${PORT}`);
});
