// Quick local test for serverless handlers without Vercel
const http = require('http');
const hitHandler = require('./api/hit/[key]');
const badgeHandler = require('./api/badge/[key]');

function mockReqRes(path) {
  const [_, type, key] = path.split('/');
  const req = { query: { key }, headers: { 'user-agent': 'test-agent' } , socket: { remoteAddress: '127.0.0.1' } };
  const res = {
    status(code) { this._status = code; return this; },
    json(obj) { console.log('RES JSON:', obj); },
    setHeader() {},
  };
  return { req, res };
}

async function run() {
  console.log('Badge before hit:');
  badgeHandler(mockReqRes('/badge/test-repo').req, mockReqRes('/badge/test-repo').res);

  console.log('Register hit:');
  await hitHandler(mockReqRes('/hit/test-repo').req, mockReqRes('/hit/test-repo').res);

  console.log('Badge after hit:');
  badgeHandler(mockReqRes('/badge/test-repo').req, mockReqRes('/badge/test-repo').res);
}

run().catch(console.error);
