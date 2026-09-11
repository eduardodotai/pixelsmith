import { readPng, palette, bandProfile } from './lib/png.mjs';
import { getFlag, positionals, isCliInvocation, fail } from './lib/cli.mjs';

// Larguras de screenshot nativas de dispositivos comuns → fator de escala.
const KNOWN_WIDTHS = {
  // iPhone @3x (retrato)
  1125: 3, 1170: 3, 1179: 3, 1206: 3, 1242: 3, 1290: 3, 1320: 3,
  // iPhone/iPad @2x
  750: 2, 828: 2, 1536: 2, 1620: 2, 1640: 2, 1668: 2, 2048: 2, 2160: 2, 2224: 2, 2388: 2, 2732: 2,
  // MacBook / iMac @2x
  2560: 2, 2880: 2, 3024: 2, 3072: 2, 3456: 2, 3840: 2, 4480: 2, 5120: 2,
};

export function suggestScale(width, height) {
  if (KNOWN_WIDTHS[width]) return { scale: KNOWN_WIDTHS[width], reason: `largura conhecida de dispositivo @${KNOWN_WIDTHS[width]}x (${width})` };
  if (height / width >= 1.8 && width >= 1000) return { scale: 3, reason: `retrato alto (h/w ≥ 1,8) com largura ≥ 1000 (${width}) — provável celular @3x` };
  if (width >= 2400) return { scale: 2, reason: `largura ≥ 2400 (${width}) — provável desktop @2x` };
  return { scale: 1, reason: 'padrão (largura < 2400, sem perfil de celular)' };
}

export function inspectImage(path, { bands = 40, top = 8 } = {}) {
  const png = readPng(path);
  const { scale, reason } = suggestScale(png.width, png.height);
  return {
    width: png.width,
    height: png.height,
    suggestedScale: scale,
    scaleReason: reason,
    palette: palette(png, { top, step: png.width * png.height > 4_000_000 ? 2 : 1 }),
    bands: bandProfile(png, { bands }),
  };
}

if (isCliInvocation(import.meta.url)) {
  const argv = process.argv.slice(2);
  const [input] = positionals(argv);
  if (!input) fail('uso: node inspect-image.mjs <png> [--bands N] [--top N]');
  else {
    try {
      const r = inspectImage(input, { bands: Number(getFlag(argv, '--bands', 40)), top: Number(getFlag(argv, '--top', 8)) });
      console.log(JSON.stringify(r, null, 2));
    } catch (e) { fail(`inspect-image falhou: ${e.message}`); }
  }
}
