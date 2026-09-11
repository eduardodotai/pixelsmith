// Vendored from figsmith (github.com/eduardodotai/figsmith, itself vendored from mirrorsmith) on 2026-09-11; keep API stable.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from './serve.mjs';

let ctx;
before(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'serve-'));
  writeFileSync(join(dir, 'index.html'), '<h1>home</h1>');
  mkdirSync(join(dir, 'css'));
  writeFileSync(join(dir, 'css', 'app.css'), 'body{color:red}');
  writeFileSync(join(dir, 'movie.bin'), Buffer.from('0123456789'));
  ctx = await startServer(dir, { port: 0, spa: true });
});
after(() => ctx.server.close());

test('serves index.html', async () => {
  const r = await fetch(`${ctx.url}/`);
  assert.equal(r.status, 200);
  assert.match(await r.text(), /home/);
});
test('serves nested asset with content-type', async () => {
  const r = await fetch(`${ctx.url}/css/app.css`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /css/);
});
test('SPA fallback returns index for unknown route', async () => {
  const r = await fetch(`${ctx.url}/does/not/exist`);
  assert.equal(r.status, 200);
  assert.match(await r.text(), /home/);
});
test('byte-range request returns 206 + partial body', async () => {
  const r = await fetch(`${ctx.url}/movie.bin`, { headers: { Range: 'bytes=2-4' } });
  assert.equal(r.status, 206);
  assert.equal(await r.text(), '234');
  assert.equal(r.headers.get('content-range'), 'bytes 2-4/10');
});
test('blocks path traversal (percent-encoded, so fetch does not normalize it away)', async () => {
  const r = await fetch(`${ctx.url}/%2e%2e%2f%2e%2e%2fetc%2fpasswd`);
  assert.equal(r.status, 403);
});
