import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPng, fillRect, crop, downscaleBox, palette, bandProfile, toHex, readPng, writePng } from './png.mjs';

const px = (png, x, y) => Array.from(png.data.subarray((png.width * y + x) * 4, (png.width * y + x) * 4 + 4));

test('createPng + fillRect + round-trip em disco', () => {
  const p = createPng(4, 4, [255, 255, 255, 255]);
  fillRect(p, 1, 1, 2, 2, [0, 0, 0, 255]);
  assert.deepEqual(px(p, 0, 0), [255, 255, 255, 255]);
  assert.deepEqual(px(p, 1, 1), [0, 0, 0, 255]);
  const dir = mkdtempSync(join(tmpdir(), 'png-'));
  writePng(join(dir, 'a.png'), p);
  assert.deepEqual(px(readPng(join(dir, 'a.png')), 2, 2), [0, 0, 0, 255]);
});

test('fillRect clampa aos limites sem lançar', () => {
  const p = createPng(3, 3);
  fillRect(p, 2, 2, 10, 10, [1, 2, 3, 255]);
  assert.deepEqual(px(p, 2, 2), [1, 2, 3, 255]);
  assert.deepEqual(px(p, 1, 1), [255, 255, 255, 255]);
});

test('crop extrai a região exata e rejeita caixa fora', () => {
  const p = createPng(10, 10);
  fillRect(p, 3, 4, 2, 2, [9, 9, 9, 255]);
  const c = crop(p, { x: 3, y: 4, w: 2, h: 2 });
  assert.equal(c.width, 2); assert.equal(c.height, 2);
  assert.deepEqual(px(c, 0, 0), [9, 9, 9, 255]);
  assert.throws(() => crop(p, { x: 9, y: 0, w: 2, h: 1 }), RangeError);
  assert.throws(() => crop(p, { x: 0, y: 0, w: 0, h: 1 }), RangeError);
});

test('downscaleBox faz média de blocos e floor das dimensões', () => {
  const p = createPng(5, 4, [0, 0, 0, 255]);
  fillRect(p, 0, 0, 1, 1, [255, 255, 255, 255]); // 1 branco num bloco 2×2 → média 63.75 → 64
  const d = downscaleBox(p, 2);
  assert.equal(d.width, 2); assert.equal(d.height, 2);
  assert.deepEqual(px(d, 0, 0), [64, 64, 64, 255]);
  assert.deepEqual(px(d, 1, 1), [0, 0, 0, 255]);
  assert.equal(downscaleBox(p, 1), p);
  assert.throws(() => downscaleBox(p, 0), RangeError);
  assert.throws(() => downscaleBox(createPng(5, 4), 10), RangeError);
  assert.throws(() => downscaleBox(createPng(2, 10), 5), RangeError);
});

test('palette ordena por frequência com hex exato para cores chapadas', () => {
  const p = createPng(10, 10, [255, 255, 255, 255]);
  fillRect(p, 0, 0, 10, 3, [0x11, 0x18, 0x27, 255]); // 30%
  const pal = palette(p, { top: 3 });
  assert.deepEqual(pal[0], { hex: '#ffffff', pct: 70 });
  assert.deepEqual(pal[1], { hex: '#111827', pct: 30 });
  assert.equal(pal.length, 2);
});

test('bandProfile separa banda escura de banda clara', () => {
  const p = createPng(4, 8, [255, 255, 255, 255]);
  fillRect(p, 0, 0, 4, 4, [0, 0, 0, 255]);
  const b = bandProfile(p, { bands: 2 });
  assert.deepEqual(b.map((x) => [x.y0, x.y1]), [[0, 4], [4, 8]]);
  assert.equal(b[0].lum, 0); assert.equal(b[1].lum, 255);
  assert.equal(b[0].variance, 0);
});

test('bandProfile: última banda absorve o resto', () => {
  const b = bandProfile(createPng(2, 7), { bands: 3 });
  assert.deepEqual(b.map((x) => [x.y0, x.y1]), [[0, 2], [2, 4], [4, 7]]);
});

test('toHex', () => { assert.equal(toHex(255, 0, 16), '#ff0010'); });

test('writePng cria o diretório de saída se não existir', () => {
  const dir = mkdtempSync(join(tmpdir(), 'png-'));
  const out = join(dir, 'a', 'b', 'c.png');
  writePng(out, createPng(2, 2));
  assert.equal(readPng(out).width, 2);
});

test('palette e bandProfile rejeitam top/bands inválidos e clampam bands à altura', () => {
  const p = createPng(3, 3);
  assert.throws(() => palette(p, { top: 0 }), RangeError);
  assert.throws(() => bandProfile(p, { bands: 0 }), RangeError);
  assert.throws(() => bandProfile(p, { bands: -3 }), RangeError);
  assert.throws(() => bandProfile(p, { bands: 1.5 }), RangeError);
  assert.equal(bandProfile(p, { bands: 10 }).length, 3);
});
