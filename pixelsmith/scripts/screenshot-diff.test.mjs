// Vendored from figsmith (github.com/eduardodotai/figsmith, itself vendored from mirrorsmith) on 2026-09-11; keep API stable.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { diffImages } from './screenshot-diff.mjs';

function makePng(path, w, h, fill) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    png.data[o] = fill[0]; png.data[o + 1] = fill[1]; png.data[o + 2] = fill[2]; png.data[o + 3] = 255;
  }
  writeFileSync(path, PNG.sync.write(png));
}
let dir;
before(() => { dir = mkdtempSync(join(tmpdir(), 'diff-')); });

test('identical images score 100%', async () => {
  const a = join(dir, 'a.png'), b = join(dir, 'b.png');
  makePng(a, 10, 10, [0, 0, 0]); makePng(b, 10, 10, [0, 0, 0]);
  const r = await diffImages(a, b);
  assert.equal(r.scorePct, 100);
});
test('fully different images score near 0%', async () => {
  const a = join(dir, 'c.png'), b = join(dir, 'd.png');
  makePng(a, 10, 10, [0, 0, 0]); makePng(b, 10, 10, [255, 255, 255]);
  const r = await diffImages(a, b);
  assert.ok(r.scorePct < 5);
});
test('size mismatch penalizes score and still returns', async () => {
  const a = join(dir, 'e.png'), b = join(dir, 'f.png');
  makePng(a, 10, 10, [0, 0, 0]); makePng(b, 10, 5, [0, 0, 0]);
  const r = await diffImages(a, b);
  assert.ok(r.scorePct > 0 && r.scorePct < 100);
});
