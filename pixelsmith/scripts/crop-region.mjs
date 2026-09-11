import { readPng, writePng, crop } from './lib/png.mjs';
import { getFlag, positionals, parseBox, isCliInvocation, fail } from './lib/cli.mjs';

// Recorta uma região do print (px do ARQUIVO de origem — se o print é @2x, a caixa é @2x).
export function cropRegion(input, { box, out }) {
  if (!out) throw new Error('--out é obrigatório');
  const png = crop(readPng(input), box);
  writePng(out, png);
  return { out, width: png.width, height: png.height };
}

if (isCliInvocation(import.meta.url)) {
  const argv = process.argv.slice(2);
  const [input] = positionals(argv);
  const box = getFlag(argv, '--box'), out = getFlag(argv, '--out');
  if (!input || !box || !out) fail('uso: node crop-region.mjs <png> --box x,y,w,h --out <png>');
  else {
    try { console.log(JSON.stringify(cropRegion(input, { box: parseBox(box), out }), null, 2)); }
    catch (e) { fail(`crop-region falhou: ${e.message}`); }
  }
}
