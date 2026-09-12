import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { readPng, writePng, crop as cropPng, downscaleBox } from './lib/png.mjs';
import { getFlag, getNumber, positionals, parseBox, isCliInvocation, fail } from './lib/cli.mjs';

// Conversão JPG/HEIC/WebP → PNG. Só macOS (sips). Fora dele: erro instrutivo, nunca tentativa silenciosa.
export async function defaultConvert(input, { platform = process.platform, exec = execFileSync } = {}) {
  if (platform !== 'darwin') {
    throw new Error(`conversão de ${extname(input)} só é automática no macOS (sips). Converta para PNG e rode de novo.`);
  }
  const dir = mkdtempSync(join(tmpdir(), 'pixelsmith-'));
  // O PNG convertido vive só até o fim do processo: normalizeImage já o leu e gravou o --out.
  process.once('exit', () => { try { rmSync(dir, { recursive: true, force: true }); } catch {} });
  const out = join(dir, basename(input, extname(input)) + '.png');
  exec('sips', ['-s', 'format', 'png', input, '--out', out]);
  if (!existsSync(out)) throw new Error(`sips não converteu ${input}: arquivo inexistente ou formato não suportado`);
  return out;
}

export async function normalizeImage(input, { out, scale = 1, crop, convertImpl = defaultConvert } = {}) {
  if (!out) throw new Error('--out é obrigatório');
  const src = extname(input).toLowerCase() === '.png' ? input : await convertImpl(input);
  let png = readPng(src);
  if (crop) png = cropPng(png, crop);
  png = downscaleBox(png, scale);
  writePng(out, png);
  return { out, width: png.width, height: png.height, scale, cropped: Boolean(crop) };
}

if (isCliInvocation(import.meta.url)) {
  const argv = process.argv.slice(2);
  const [input] = positionals(argv);
  const out = getFlag(argv, '--out');
  if (!input || !out) fail('uso: node normalize-image.mjs <in> --out <png> [--scale S] [--crop x,y,w,h]');
  else {
    try {
      const scale = getNumber(argv, '--scale', 1);
      const cropFlag = getFlag(argv, '--crop');
      const crop = cropFlag ? parseBox(cropFlag) : undefined;
      normalizeImage(input, { out, scale, crop })
        .then((r) => console.log(JSON.stringify(r, null, 2)))
        .catch((e) => fail(`normalize-image falhou: ${e.message}`));
    } catch (e) {
      fail(`normalize-image falhou: ${e.message}`);
    }
  }
}
