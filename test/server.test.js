'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../server');

test('health endpoint reports a working server and lobby count', async t => {
  const instance = await startServer({ port: 0, host: '127.0.0.1' });
  t.after(() => new Promise(resolve => instance.httpServer.close(resolve)));

  const response = await fetch(`http://127.0.0.1:${instance.port}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, activeLobbies: 0 });
});
