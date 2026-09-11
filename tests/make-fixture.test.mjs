import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { TRUTH, drawFixture, drawWithChrome } from './make-fixture.mjs';
import { readPng } from '../pixelsmith/scripts/lib/png.mjs';

const px = (png, x, y) => Array.from(png.data.subarray((png.width * y + x) * 4, (png.width * y + x) * 4 + 3));
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

test('drawFixture respeita a verdade (dims, seções, asset)', () => {
  const p = drawFixture(1);
  assert.equal(p.width, TRUTH.width); assert.equal(p.height, TRUTH.height);
  assert.deepEqual(px(p, 10, 10), hexToRgb(TRUTH.colors.header));
  const hero = TRUTH.sections.find((s) => s.name === 'hero');
  assert.deepEqual(px(p, 10, hero.y + 10), hexToRgb(TRUTH.colors.hero));
  const a = TRUTH.assets[0];
  assert.deepEqual(px(p, a.x + 1, a.y + 1), hexToRgb(TRUTH.colors.photo));
});

test('drawFixture(2) é o @1x em dobro', () => {
  const p1 = drawFixture(1), p2 = drawFixture(2);
  assert.equal(p2.width, p1.width * 2);
  assert.deepEqual(px(p2, 21, 21), px(p1, 10, 10));
});

test('drawWithChrome adiciona 90px de chrome no topo', () => {
  const c = drawWithChrome();
  assert.equal(c.height, TRUTH.height + TRUTH.chromeHeight);
  assert.deepEqual(px(c, 5, 5), hexToRgb(TRUTH.colors.chrome));
  assert.deepEqual(px(c, 10, TRUTH.chromeHeight + 10), hexToRgb(TRUTH.colors.header));
});

test('fixtures em disco batem com o gerador e com ground-truth.json', () => {
  const dir = 'tests/fixtures/synthetic';
  for (const f of ['synthetic-desk.png', 'synthetic-desk@2x.png', 'synthetic-desk-chrome.png', 'ground-truth.json']) assert.ok(existsSync(`${dir}/${f}`), f);
  assert.deepEqual(JSON.parse(readFileSync(`${dir}/ground-truth.json`, 'utf8')), TRUTH);
  assert.deepEqual(Buffer.from(readPng(`${dir}/synthetic-desk.png`).data), Buffer.from(drawFixture(1).data));
});
