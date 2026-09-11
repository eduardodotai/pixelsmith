import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestScale, inspectImage } from './inspect-image.mjs';
import { TRUTH } from '../../tests/make-fixture.mjs';

const FX = 'tests/fixtures/synthetic';

test('suggestScale: larguras conhecidas, retrato hi-res, largo, padrão', () => {
  assert.deepEqual(suggestScale(2880, 1800), { scale: 2, reason: 'largura conhecida de dispositivo @2x (2880)' });
  assert.deepEqual(suggestScale(1170, 2532), { scale: 3, reason: 'largura conhecida de dispositivo @3x (1170)' });
  assert.equal(suggestScale(1080, 2400).scale, 3);   // retrato alto (h/w 2,2) ≥ 1000 sem tabela
  assert.equal(suggestScale(1440, 1600).scale, 1);   // retrato baixo (h/w 1,1) NÃO é celular
  assert.equal(suggestScale(2600, 1500).scale, 2);   // ≥ 2400
  assert.deepEqual(suggestScale(1280, 800), { scale: 1, reason: 'padrão (largura < 2400, sem perfil de celular)' });
});

test('inspectImage no fixture @1x: dims, escala 1, paleta e fronteiras de seção', () => {
  const r = inspectImage(`${FX}/synthetic-desk.png`, { bands: 40, top: 8 });
  assert.equal(r.width, TRUTH.width); assert.equal(r.height, TRUTH.height);
  assert.equal(r.suggestedScale, 1);
  const hexes = r.palette.map((p) => p.hex);
  for (const h of [TRUTH.colors.bg, TRUTH.colors.hero, TRUTH.colors.header, TRUTH.colors.footer, TRUTH.colors.card]) assert.ok(hexes.includes(h), h);
  assert.equal(r.bands.length, 40);
  // salto de luminância entre banda 1 (header escuro, y 40-79) e banda 2 (hero claro, y 80-119)
  assert.ok(r.bands[2].lum - r.bands[1].lum > 100);
  assert.equal(r.bands[2].y0, 80);
});

test('inspectImage no fixture @2x sugere escala 2', () => {
  const r = inspectImage(`${FX}/synthetic-desk@2x.png`, { bands: 10, top: 3 });
  assert.equal(r.width, 2880); assert.equal(r.suggestedScale, 2);
});
