import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bandDiff } from './band-diff.mjs';
import { createPng, writePng, readPng } from './lib/png.mjs';
import { TRUTH } from '../../tests/make-fixture.mjs';

const FX = 'tests/fixtures/synthetic';
const REF = `${FX}/synthetic-desk.png`;

test('imagens idênticas: 0% em toda banda, sem drift', () => {
  const r = bandDiff(REF, REF, { band: 50 });
  assert.equal(r.bands.length, 32);
  assert.ok(r.bands.every((b) => b.mismatchPct === 0));
  assert.equal(r.firstDriftBand, null);
  assert.equal(r.worst.length, 5);
});

test('imagem deslocada 40px: drift começa na banda 0 e áreas chapadas ficam limpas', () => {
  const ref = readPng(REF);
  const shifted = createPng(ref.width, ref.height, [255, 255, 255, 255]);
  shifted.data.set(ref.data.subarray(0, (ref.height - 40) * ref.width * 4), 40 * ref.width * 4);
  const p = join(mkdtempSync(join(tmpdir(), 'bd-')), 'shifted.png');
  writePng(p, shifted);
  const r = bandDiff(p, REF, { band: 50, threshold: 15 });
  assert.equal(r.firstDriftBand.y0, 0);
  assert.ok(r.bands[0].mismatchPct > 50);
  // faixa y 300-349: hero chapado nos dois (deslocado mostra hero y 260-309 → também chapado)... exceto a foto (x 800-1320, y 160-520) — presente nos dois em toda a faixa → 0
  assert.equal(r.bands[6].mismatchPct, 0);
});

test('altura extra conta como mismatch total', () => {
  const tall = createPng(TRUTH.width, TRUTH.height + 100, [255, 255, 255, 255]);
  tall.data.set(readPng(REF).data, 0);
  const p = join(mkdtempSync(join(tmpdir(), 'bd2-')), 'tall.png');
  writePng(p, tall);
  const r = bandDiff(p, REF, { band: 50 });
  assert.equal(r.bands.length, 34);
  assert.equal(r.bands[33].mismatchPct, 100);
  assert.equal(r.bands[0].mismatchPct, 0);
});

test('band inválido lança RangeError sem travar', () => {
  assert.throws(() => bandDiff(REF, REF, { band: 0 }), RangeError);
  assert.throws(() => bandDiff(REF, REF, { band: -5 }), RangeError);
  assert.throws(() => bandDiff(REF, REF, { band: 12.5 }), RangeError);
});
