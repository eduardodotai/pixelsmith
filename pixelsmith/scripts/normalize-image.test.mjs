import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { normalizeImage, defaultConvert } from './normalize-image.mjs';
import { readPng } from './lib/png.mjs';
import { TRUTH } from '../../tests/make-fixture.mjs';

const FX = 'tests/fixtures/synthetic';
const same = (a, b) => assert.deepEqual(Buffer.from(readPng(a).data), Buffer.from(readPng(b).data));
let dir; test.before(() => { dir = mkdtempSync(join(tmpdir(), 'norm-')); });

test('@2x → @1x com --scale 2 é byte-idêntico ao fixture @1x', async () => {
  const out = join(dir, 'a.png');
  const r = await normalizeImage(`${FX}/synthetic-desk@2x.png`, { out, scale: 2 });
  assert.deepEqual(r, { out, width: TRUTH.width, height: TRUTH.height, scale: 2, cropped: false });
  same(out, `${FX}/synthetic-desk.png`);
});

test('--crop remove o chrome do browser', async () => {
  const out = join(dir, 'b.png');
  const r = await normalizeImage(`${FX}/synthetic-desk-chrome.png`, { out, crop: { x: 0, y: TRUTH.chromeHeight, w: TRUTH.width, h: TRUTH.height } });
  assert.equal(r.cropped, true);
  same(out, `${FX}/synthetic-desk.png`);
});

test('não-PNG passa pelo convertImpl injetado', async () => {
  const out = join(dir, 'c.png');
  let called = null;
  const r = await normalizeImage('/nao/existe/print.jpg', { out, convertImpl: async (i) => { called = i; return `${FX}/synthetic-desk.png`; } });
  assert.equal(called, '/nao/existe/print.jpg');
  assert.equal(r.width, TRUTH.width);
});

test('defaultConvert fora do macOS falha com instrução', async () => {
  await assert.rejects(() => defaultConvert('x.jpg', { platform: 'linux' }), /Converta para PNG/);
});

test('defaultConvert no macOS chama sips com os argumentos certos', async () => {
  const calls = [];
  const out = await defaultConvert('/tmp/x.heic', { platform: 'darwin', exec: (cmd, args) => { calls.push([cmd, args]); } });
  assert.equal(calls[0][0], 'sips');
  assert.deepEqual(calls[0][1].slice(0, 3), ['-s', 'format', 'png']);
  assert.equal(calls[0][1][3], '/tmp/x.heic');
  assert.ok(out.endsWith('.png'));
});

test('defaultConvert registra limpeza do tmpdir na saída do processo', async () => {
  const before = process.listenerCount('exit');
  const out = await defaultConvert('/tmp/y.heic', { platform: 'darwin', exec: () => {} });
  assert.equal(process.listenerCount('exit'), before + 1);
  assert.ok(existsSync(dirname(out)));
  process.emit('exit', 0);   // dispara os hooks registrados → tmpdir removido
  assert.equal(existsSync(dirname(out)), false);
});
