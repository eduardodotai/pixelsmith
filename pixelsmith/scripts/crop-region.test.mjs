import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cropRegion } from './crop-region.mjs';
import { readPng } from './lib/png.mjs';
import { TRUTH } from '../../tests/make-fixture.mjs';

const FX = 'tests/fixtures/synthetic';
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

test('recorta o asset do print com as dimensões da caixa e a cor certa', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'crop-')), 'hero-photo.png');
  const a = TRUTH.assets[0];
  const r = cropRegion(`${FX}/synthetic-desk.png`, { box: a, out });
  assert.deepEqual(r, { out, width: a.w, height: a.h });
  const png = readPng(out);
  assert.deepEqual(Array.from(png.data.subarray(0, 3)), hexToRgb(TRUTH.colors.photo));
  assert.deepEqual(Array.from(png.data.subarray((png.width * png.height - 1) * 4, (png.width * png.height - 1) * 4 + 3)), hexToRgb(TRUTH.colors.photo));
});

test('caixa fora da imagem lança RangeError', () => {
  assert.throws(() => cropRegion(`${FX}/synthetic-desk.png`, { box: { x: 1400, y: 0, w: 100, h: 10 }, out: '/dev/null' }), RangeError);
});
