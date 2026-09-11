import pixelmatch from 'pixelmatch';
import { readPng, crop } from './lib/png.mjs';
import { getNumber, positionals, isCliInvocation, fail } from './lib/cli.mjs';

// Mismatch por faixa horizontal. Mesma honestidade do screenshot-diff: área não sobreposta
// (largura ou altura extra de uma das imagens) conta como mismatch total.
export function bandDiff(pathA, pathB, { band = 50, threshold = 15 } = {}) {
  if (!Number.isInteger(band) || band <= 0) throw new RangeError(`--band inválido: ${band} (esperado inteiro > 0)`);
  const a = readPng(pathA), b = readPng(pathB);
  const width = Math.min(a.width, b.width), fullWidth = Math.max(a.width, b.width);
  const maxH = Math.max(a.height, b.height), overlapH = Math.min(a.height, b.height);
  const bands = [];
  for (let y0 = 0; y0 < maxH; y0 += band) {
    const y1 = Math.min(maxH, y0 + band);
    const oh = Math.max(0, Math.min(overlapH, y1) - y0);
    let mismatched = 0;
    if (oh > 0) {
      const ca = crop(a, { x: 0, y: y0, w: width, h: oh }), cb = crop(b, { x: 0, y: y0, w: width, h: oh });
      mismatched += pixelmatch(ca.data, cb.data, null, width, oh, { threshold: 0.1 });
    }
    const total = fullWidth * (y1 - y0);
    mismatched += total - width * oh;
    bands.push({ y0, y1, mismatchPct: Math.round((mismatched / total) * 10000) / 100 });
  }
  const firstDriftBand = bands.find((x) => x.mismatchPct > threshold) ?? null;
  const worst = [...bands].sort((p, q) => q.mismatchPct - p.mismatchPct).slice(0, 5);
  return { band, threshold, bands, firstDriftBand, worst };
}

if (isCliInvocation(import.meta.url)) {
  const argv = process.argv.slice(2);
  const [pa, pb] = positionals(argv);
  if (!pa || !pb) fail('uso: node band-diff.mjs <a.png> <b.png> [--band 50] [--threshold 15]');
  else {
    try {
      console.log(JSON.stringify(bandDiff(pa, pb, { band: getNumber(argv, '--band', 50), threshold: getNumber(argv, '--threshold', 15) }), null, 2));
    } catch (e) { fail(`band-diff falhou: ${e.message}`); }
  }
}
