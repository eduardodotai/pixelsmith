import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';

// Guard de CLI robusto a symlinks (~/.claude/skills/pixelsmith → repo): argv[1] mantém o caminho
// simbólico; import.meta.url é o realpath. Comparar sem resolver faz o bloco CLI nunca rodar.
export function isCliInvocation(moduleUrl) {
  if (!process.argv[1]) return false;
  try { return moduleUrl === pathToFileURL(realpathSync(process.argv[1])).href; }
  catch { return false; }
}

export function getFlag(argv, name, def) {
  const i = argv.indexOf(name);
  if (i === -1) return def;
  return i + 1 < argv.length ? argv[i + 1] : undefined;
}

// Argumentos que não são flags nem valores de flags. Convenção: toda flag `--x` carrega 1 valor.
export function positionals(argv) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) { i++; continue; }
    out.push(argv[i]);
  }
  return out;
}

export function parseBox(s) {
  const p = String(s).split(',').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n)) || p[2] <= 0 || p[3] <= 0) {
    throw new Error(`caixa inválida: "${s}" (esperado x,y,w,h inteiros, com w e h > 0)`);
  }
  const [x, y, w, h] = p;
  return { x, y, w, h };
}

export function fail(msg) {
  console.error(msg);
  process.exitCode = 1;
}
