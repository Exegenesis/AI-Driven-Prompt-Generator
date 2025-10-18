const http = require('http');
const data = JSON.stringify({ goal: 'Create a landing page copy', audience: 'startup founders' });
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/generate-prompt',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

try {
  const req = http.request(options, (res) => {
    console.log('STATUS', res.statusCode);
    let body = '';
    res.on('data', (c) => (body += c));
    res.on('end', () => {
      console.log('BODY', body);
    });
  });
  req.on('error', (e) => console.error('ERR', e));
  req.write(data);
  req.end();
} catch (err) {
  console.error('UNCAUGHT', err);
}
