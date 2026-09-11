import { pathToFileURL } from 'node:url';
// Vendored from figsmith (github.com/eduardodotai/figsmith, itself vendored from mirrorsmith) on 2026-09-11; keep API stable.
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

// Compare two PNGs and return a perceptual fidelity score (0-100).
// When dimensions differ, compares the overlapping top-left region and counts
// the non-overlapping area as fully mismatched (an honest size penalty).
export async function diffImages(pathA, pathB, { outPath } = {}) {
  const a = PNG.sync.read(readFileSync(pathA));
  const b = PNG.sync.read(readFileSync(pathB));
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const fullTotal = Math.max(a.width * a.height, b.width * b.height);

  const crop = (img) => {
    if (img.width === width && img.height === height) return img;
    const out = new PNG({ width, height });
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const s = (img.width * y + x) * 4;
        const d = (width * y + x) * 4;
        out.data[d] = img.data[s]; out.data[d + 1] = img.data[s + 1];
        out.data[d + 2] = img.data[s + 2]; out.data[d + 3] = img.data[s + 3];
      }
    }
    return out;
  };

  const ca = crop(a), cb = crop(b);
  const diff = new PNG({ width, height });
  const mismatchedInRegion = pixelmatch(ca.data, cb.data, diff.data, width, height, { threshold: 0.1 });
  const nonOverlap = fullTotal - width * height;
  const mismatched = mismatchedInRegion + nonOverlap;
  const scorePct = Math.max(0, Math.round((1 - mismatched / fullTotal) * 10000) / 100);
  if (outPath) writeFileSync(outPath, PNG.sync.write(diff));
  return { scorePct, mismatched, total: fullTotal, width, height };
}

// CLI

// Guard de CLI robusto a symlinks: import.meta.url é o realpath do módulo,
// mas argv[1] mantém o caminho simbólico (ex.: ~/.claude/skills/figsmith) —
// comparar sem resolver fazia o bloco CLI nunca rodar (exit 0 silencioso).
function isCliInvocation(moduleUrl) {
  if (!process.argv[1]) return false;
  try { return moduleUrl === pathToFileURL(realpathSync(process.argv[1])).href; }
  catch { return false; }
}

if (isCliInvocation(import.meta.url)) {
  const [a, b] = process.argv.slice(2);
  const outIdx = process.argv.indexOf('--out');
  const outPath = outIdx > -1 ? process.argv[outIdx + 1] : undefined;
  diffImages(a, b, { outPath }).then((r) => console.log(JSON.stringify(r, null, 2)));
}
