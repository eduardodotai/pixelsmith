# pixelsmith Skill v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Skill instalável de Claude Code que transforma um print de interface em código front-end (site estático standalone ou componente dentro do projeto atual) com fidelidade perceptual medida e report honesto.

**Architecture:** Skill única (`pixelsmith/` = SKILL.md espinha + `scripts/` + `references/`). Scripts Node puros sobre um núcleo `lib/png.mjs` (pngjs) e `lib/cli.mjs`; `serve.mjs`/`screenshot-diff.mjs` vendorados da figsmith. Um fixture sintético desenhado por script dá verdade conhecida aos testes sem browser. O modelo faz a leitura do print e a construção seguindo 4 playbooks; os scripts medem.

**Tech Stack:** Node ≥ 20 (`node:test`, `node:assert/strict`, ESM `"type": "module"`), pixelmatch ^6, pngjs ^7, `sips` (macOS, runtime only).

**Spec:** `docs/specs/2026-09-11-pixelsmith-skill-design.md` — o plano argumenta a partir dela; executores leem ambos.

## Global Constraints

- **Repo:** `/Users/eduardosantos/projects/pixelsmith-skill`, remote `https://github.com/eduardodotai/pixelsmith.git`, branch `main`. Público: NUNCA commitar prints de clientes/terceiros; só o fixture sintético.
- **Fonte vendor:** `~/projects/figsmith-skill/figsmith/scripts/{serve.mjs,serve.test.mjs,screenshot-diff.mjs,screenshot-diff.test.mjs}` — copiar byte a byte, trocando só o comentário de origem.
- **Deps:** apenas `pixelmatch ^6.0.0` e `pngjs ^7.0.0`. Nenhuma dependência nativa (sem sharp/canvas). Conversão de formato só via `sips` em runtime, nunca nos testes.
- **Scripts dual-mode:** exportam a função principal e têm bloco CLI guardado por `isCliInvocation(import.meta.url)` de `lib/cli.mjs` (robusto a symlink). Saída JSON no stdout (`JSON.stringify(r, null, 2)`); erro → mensagem no stderr + `process.exitCode = 1`; nunca silencioso.
- **Testes:** `node --test pixelsmith/scripts/*.test.mjs pixelsmith/scripts/lib/*.test.mjs tests/*.test.mjs` (glob explícito — `node --test <dir>` falha neste ambiente). Arquivos `<script>.test.mjs` co-locados. Rodar sempre da raiz do repo.
- **Idioma:** PT-BR em SKILL.md, playbooks, README, mensagens de erro e commits. Código e nomes de API em inglês.
- **Commits:** frequentes, prefixos `feat:`/`fix:`/`docs:`/`test:`/`chore:`, terminando com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Push livre (repo já autorizado pelo usuário).
- **Honestidade:** nenhum texto da skill pode prometer ou reportar 100% de fidelidade.

## File Structure (alvo)

```
pixelsmith/
  SKILL.md
  package.json
  scripts/
    lib/cli.mjs (+ .test.mjs)        # isCliInvocation, getFlag, positionals, parseBox, fail
    lib/png.mjs (+ .test.mjs)        # readPng, writePng, createPng, fillRect, crop, downscaleBox, palette, bandProfile, toHex
    inspect-image.mjs (+ .test.mjs)
    normalize-image.mjs (+ .test.mjs)
    crop-region.mjs (+ .test.mjs)
    band-diff.mjs (+ .test.mjs)
    detect-stack.mjs (+ .test.mjs)
    serve.mjs (+ .test.mjs)          # vendorado
    screenshot-diff.mjs (+ .test.mjs)# vendorado
    install.sh
  references/
    read-the-print-playbook.md
    recreate-playbook.md
    in-project-playbook.md
    validate-playbook.md
tests/
  make-fixture.mjs (+ make-fixture.test.mjs)
  fixtures/synthetic/synthetic-desk.png
  fixtures/synthetic/synthetic-desk@2x.png
  fixtures/synthetic/synthetic-desk-chrome.png
  fixtures/synthetic/ground-truth.json
docs/specs/…  docs/plans/…
README.md  LICENSE  .gitignore
```

---

### Task 1: Scaffold do pacote + vendor de serve/screenshot-diff + lib/cli

**Files:**
- Create: `pixelsmith/package.json`, `pixelsmith/scripts/install.sh`, `pixelsmith/scripts/lib/cli.mjs`, `pixelsmith/scripts/lib/cli.test.mjs`
- Create (vendor): `pixelsmith/scripts/serve.mjs`, `pixelsmith/scripts/serve.test.mjs`, `pixelsmith/scripts/screenshot-diff.mjs`, `pixelsmith/scripts/screenshot-diff.test.mjs`

**Interfaces:**
- Produces: `isCliInvocation(moduleUrl): boolean`, `getFlag(argv, name, def?): string|undefined`, `positionals(argv): string[]`, `parseBox('x,y,w,h'): {x,y,w,h}`, `fail(msg): void` (stderr + exitCode 1).
- Produces: `diffImages(pathA, pathB, {outPath}) → {scorePct, mismatched, total, width, height}` e `createServer(rootDir, {spa})` (vendorados, API inalterada).

- [ ] **Step 1: package.json e install.sh**

`pixelsmith/package.json`:
```json
{
  "name": "pixelsmith-skill-runtime",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Co-located runtime deps for the pixelsmith skill scripts.",
  "dependencies": { "pixelmatch": "^6.0.0", "pngjs": "^7.0.0" }
}
```

`pixelsmith/scripts/install.sh` (chmod +x):
```bash
#!/usr/bin/env bash
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-$HOME/.claude/skills/pixelsmith}"
cd "$SKILL_DIR" && npm install --omit=dev
mkdir -p "$(dirname "$TARGET")"
ln -sfn "$SKILL_DIR" "$TARGET"
echo "pixelsmith installed at $TARGET (symlink → $SKILL_DIR)"
```

Run: `cd pixelsmith && npm install --omit=dev` — Expected: `node_modules/pixelmatch` e `node_modules/pngjs` existem; `node_modules/` já está no `.gitignore`.

- [ ] **Step 2: Vendor**

```bash
SRC=~/projects/figsmith-skill/figsmith/scripts
for f in serve.mjs serve.test.mjs screenshot-diff.mjs screenshot-diff.test.mjs; do cp "$SRC/$f" pixelsmith/scripts/$f; done
sed -i '' 's|// Vendored from mirrorsmith (github.com/eduardodotai — mirrorsmith-skill) on 2026-07-15; keep API stable.|// Vendored from figsmith (github.com/eduardodotai/figsmith, itself vendored from mirrorsmith) on 2026-09-11; keep API stable.|' pixelsmith/scripts/serve.mjs pixelsmith/scripts/serve.test.mjs pixelsmith/scripts/screenshot-diff.mjs pixelsmith/scripts/screenshot-diff.test.mjs
```

Run: `node --test pixelsmith/scripts/*.test.mjs` — Expected: todos os testes vendorados passam (serve + screenshot-diff).

- [ ] **Step 3: Teste falhando de lib/cli**

`pixelsmith/scripts/lib/cli.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getFlag, positionals, parseBox, isCliInvocation } from './cli.mjs';

test('getFlag returns value after flag, default otherwise', () => {
  assert.equal(getFlag(['a.png', '--out', 'x.png'], '--out'), 'x.png');
  assert.equal(getFlag(['a.png'], '--out', 'def'), 'def');
  assert.equal(getFlag(['a.png', '--out'], '--out'), undefined);
});
test('positionals skips flags and their values', () => {
  assert.deepEqual(positionals(['a.png', '--out', 'x.png', 'b.png', '--scale', '2']), ['a.png', 'b.png']);
});
test('parseBox parses x,y,w,h and rejects bad input', () => {
  assert.deepEqual(parseBox('10,20,30,40'), { x: 10, y: 20, w: 30, h: 40 });
  assert.throws(() => parseBox('10,20,30'), /x,y,w,h/);
  assert.throws(() => parseBox('10,20,0,40'), /x,y,w,h/);
  assert.throws(() => parseBox('a,b,c,d'), /x,y,w,h/);
});
test('isCliInvocation is false when argv[1] is another module', () => {
  assert.equal(isCliInvocation('file:///definitely/not/argv1.mjs'), false);
});
```

Run: `node --test pixelsmith/scripts/lib/*.test.mjs` — Expected: FAIL (`Cannot find module './cli.mjs'`).

- [ ] **Step 4: Implementar lib/cli.mjs**

```js
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
```

- [ ] **Step 5: Rodar testes**

Run: `node --test pixelsmith/scripts/*.test.mjs pixelsmith/scripts/lib/*.test.mjs` — Expected: PASS (vendorados + 4 de cli).

- [ ] **Step 6: Commit**

```bash
git add pixelsmith/package.json pixelsmith/scripts
git commit -m "chore: scaffold do pacote, vendor de serve/screenshot-diff e lib/cli

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: `lib/png.mjs` — núcleo de imagem

**Files:**
- Create: `pixelsmith/scripts/lib/png.mjs`, `pixelsmith/scripts/lib/png.test.mjs`

**Interfaces:**
- Produces:
  - `readPng(path) → PNG`, `writePng(path, png)`
  - `createPng(width, height, rgba=[255,255,255,255]) → PNG`
  - `fillRect(png, x, y, w, h, rgba) → png` (in place, clampa aos limites)
  - `crop(png, {x,y,w,h}) → PNG` — lança `RangeError` se a caixa sai da imagem ou w/h ≤ 0
  - `downscaleBox(png, factor) → PNG` — fator inteiro ≥ 1; média de blocos `factor×factor`; dims = `Math.floor(dim/factor)`
  - `palette(png, {top=8, step=1}) → [{hex, pct}]` — quantização 5 bits/canal (`& 0xF8`), hex = média real do bucket, pct com 2 casas, ordenado desc
  - `bandProfile(png, {bands=40}) → [{y0, y1, lum, variance}]` — luminância Rec.601 (0–255, 1 casa), variância (1 casa); última banda absorve o resto
  - `toHex(r,g,b) → '#rrggbb'`

- [ ] **Step 1: Teste falhando**

`pixelsmith/scripts/lib/png.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPng, fillRect, crop, downscaleBox, palette, bandProfile, toHex, readPng, writePng } from './png.mjs';

const px = (png, x, y) => Array.from(png.data.subarray((png.width * y + x) * 4, (png.width * y + x) * 4 + 4));

test('createPng + fillRect + round-trip em disco', () => {
  const p = createPng(4, 4, [255, 255, 255, 255]);
  fillRect(p, 1, 1, 2, 2, [0, 0, 0, 255]);
  assert.deepEqual(px(p, 0, 0), [255, 255, 255, 255]);
  assert.deepEqual(px(p, 1, 1), [0, 0, 0, 255]);
  const dir = mkdtempSync(join(tmpdir(), 'png-'));
  writePng(join(dir, 'a.png'), p);
  assert.deepEqual(px(readPng(join(dir, 'a.png')), 2, 2), [0, 0, 0, 255]);
});

test('fillRect clampa aos limites sem lançar', () => {
  const p = createPng(3, 3);
  fillRect(p, 2, 2, 10, 10, [1, 2, 3, 255]);
  assert.deepEqual(px(p, 2, 2), [1, 2, 3, 255]);
  assert.deepEqual(px(p, 1, 1), [255, 255, 255, 255]);
});

test('crop extrai a região exata e rejeita caixa fora', () => {
  const p = createPng(10, 10);
  fillRect(p, 3, 4, 2, 2, [9, 9, 9, 255]);
  const c = crop(p, { x: 3, y: 4, w: 2, h: 2 });
  assert.equal(c.width, 2); assert.equal(c.height, 2);
  assert.deepEqual(px(c, 0, 0), [9, 9, 9, 255]);
  assert.throws(() => crop(p, { x: 9, y: 0, w: 2, h: 1 }), RangeError);
  assert.throws(() => crop(p, { x: 0, y: 0, w: 0, h: 1 }), RangeError);
});

test('downscaleBox faz média de blocos e floor das dimensões', () => {
  const p = createPng(5, 4, [0, 0, 0, 255]);
  fillRect(p, 0, 0, 1, 1, [255, 255, 255, 255]); // 1 branco num bloco 2×2 → média 63.75 → 64
  const d = downscaleBox(p, 2);
  assert.equal(d.width, 2); assert.equal(d.height, 2);
  assert.deepEqual(px(d, 0, 0), [64, 64, 64, 255]);
  assert.deepEqual(px(d, 1, 1), [0, 0, 0, 255]);
  assert.equal(downscaleBox(p, 1), p);
  assert.throws(() => downscaleBox(p, 0), RangeError);
});

test('palette ordena por frequência com hex exato para cores chapadas', () => {
  const p = createPng(10, 10, [255, 255, 255, 255]);
  fillRect(p, 0, 0, 10, 3, [0x11, 0x18, 0x27, 255]); // 30%
  const pal = palette(p, { top: 3 });
  assert.deepEqual(pal[0], { hex: '#ffffff', pct: 70 });
  assert.deepEqual(pal[1], { hex: '#111827', pct: 30 });
  assert.equal(pal.length, 2);
});

test('bandProfile separa banda escura de banda clara', () => {
  const p = createPng(4, 8, [255, 255, 255, 255]);
  fillRect(p, 0, 0, 4, 4, [0, 0, 0, 255]);
  const b = bandProfile(p, { bands: 2 });
  assert.deepEqual(b.map((x) => [x.y0, x.y1]), [[0, 4], [4, 8]]);
  assert.equal(b[0].lum, 0); assert.equal(b[1].lum, 255);
  assert.equal(b[0].variance, 0);
});

test('bandProfile: última banda absorve o resto', () => {
  const b = bandProfile(createPng(2, 7), { bands: 3 });
  assert.deepEqual(b.map((x) => [x.y0, x.y1]), [[0, 2], [2, 4], [4, 7]]);
});

test('toHex', () => { assert.equal(toHex(255, 0, 16), '#ff0010'); });
```

Run: `node --test pixelsmith/scripts/lib/png.test.mjs` — Expected: FAIL (módulo ausente).

- [ ] **Step 2: Implementar**

`pixelsmith/scripts/lib/png.mjs`:
```js
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

export function readPng(path) { return PNG.sync.read(readFileSync(path)); }
export function writePng(path, png) { writeFileSync(path, PNG.sync.write(png)); }

export function toHex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

export function createPng(width, height, rgba = [255, 255, 255, 255]) {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) png.data.set(rgba, i * 4);
  return png;
}

export function fillRect(png, x, y, w, h, rgba) {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(png.width, x + w), y1 = Math.min(png.height, y + h);
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) png.data.set(rgba, (png.width * yy + xx) * 4);
  return png;
}

export function crop(png, { x, y, w, h }) {
  if (!(w > 0 && h > 0) || x < 0 || y < 0 || x + w > png.width || y + h > png.height) {
    throw new RangeError(`caixa ${x},${y},${w},${h} fora da imagem ${png.width}×${png.height}`);
  }
  const out = new PNG({ width: w, height: h });
  for (let yy = 0; yy < h; yy++) {
    const src = ((y + yy) * png.width + x) * 4;
    out.data.set(png.data.subarray(src, src + w * 4), yy * w * 4);
  }
  return out;
}

// Box filter: cada pixel de saída é a média de um bloco factor×factor. Blocos parciais são descartados (floor).
export function downscaleBox(png, factor) {
  if (!Number.isInteger(factor) || factor < 1) throw new RangeError(`fator inválido: ${factor}`);
  if (factor === 1) return png;
  const w = Math.floor(png.width / factor), h = Math.floor(png.height / factor);
  const out = new PNG({ width: w, height: h });
  const n = factor * factor;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let dy = 0; dy < factor; dy++) for (let dx = 0; dx < factor; dx++) {
      const s = ((y * factor + dy) * png.width + (x * factor + dx)) * 4;
      r += png.data[s]; g += png.data[s + 1]; b += png.data[s + 2]; a += png.data[s + 3];
    }
    const d = (y * w + x) * 4;
    out.data[d] = Math.round(r / n); out.data[d + 1] = Math.round(g / n);
    out.data[d + 2] = Math.round(b / n); out.data[d + 3] = Math.round(a / n);
  }
  return out;
}

// Quantiza a 5 bits por canal, agrega por bucket, devolve top-N com a cor MÉDIA real do bucket.
export function palette(png, { top = 8, step = 1 } = {}) {
  const buckets = new Map();
  let sampled = 0;
  for (let y = 0; y < png.height; y += step) for (let x = 0; x < png.width; x += step) {
    const i = (y * png.width + x) * 4;
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    const key = ((r & 0xf8) << 16) | ((g & 0xf8) << 8) | (b & 0xf8);
    let e = buckets.get(key);
    if (!e) { e = { n: 0, r: 0, g: 0, b: 0 }; buckets.set(key, e); }
    e.n++; e.r += r; e.g += g; e.b += b; sampled++;
  }
  return [...buckets.values()]
    .sort((p, q) => q.n - p.n)
    .slice(0, top)
    .map((e) => ({ hex: toHex(e.r / e.n, e.g / e.n, e.b / e.n), pct: Math.round((e.n / sampled) * 10000) / 100 }));
}

// Luminância média (Rec.601) e variância por faixa horizontal. Serve para achar fronteiras de seção.
export function bandProfile(png, { bands = 40 } = {}) {
  const size = Math.max(1, Math.floor(png.height / bands));
  const out = [];
  for (let b = 0; b < bands && b * size < png.height; b++) {
    const y0 = b * size;
    const y1 = b === bands - 1 ? png.height : Math.min(png.height, y0 + size);
    let sum = 0, sumSq = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const l = 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
      sum += l; sumSq += l * l; n++;
    }
    const mean = sum / n;
    out.push({ y0, y1, lum: Math.round(mean * 10) / 10, variance: Math.round((sumSq / n - mean * mean) * 10) / 10 });
  }
  return out;
}
```

- [ ] **Step 3: Rodar testes**

Run: `node --test pixelsmith/scripts/lib/*.test.mjs` — Expected: PASS (8 de png + 4 de cli).

- [ ] **Step 4: Commit**

```bash
git add pixelsmith/scripts/lib/png.mjs pixelsmith/scripts/lib/png.test.mjs
git commit -m "feat: lib/png — crop, downscale box, paleta e perfil por faixa sobre pngjs

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Fixture sintético com verdade conhecida

**Files:**
- Create: `tests/make-fixture.mjs`, `tests/make-fixture.test.mjs`, `tests/fixtures/synthetic/{synthetic-desk.png,synthetic-desk@2x.png,synthetic-desk-chrome.png,ground-truth.json}`

**Interfaces:**
- Produces: `TRUTH` (objeto abaixo, também serializado em `ground-truth.json`), `drawFixture(scale=1) → PNG`, `drawWithChrome() → PNG` (banda cinza de 90px no topo + o desk @1x), `writeFixtures(dir)`.
- Consumes: `createPng`, `fillRect`, `writePng` de `lib/png.mjs`.

- [ ] **Step 1: Teste falhando**

`tests/make-fixture.test.mjs`:
```js
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
```

Run: `node --test tests/*.test.mjs` — Expected: FAIL (módulo ausente).

- [ ] **Step 2: Implementar o gerador**

`tests/make-fixture.mjs`:
```js
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createPng, fillRect, writePng } from '../pixelsmith/scripts/lib/png.mjs';
import { isCliInvocation } from '../pixelsmith/scripts/lib/cli.mjs';

// Verdade conhecida do "print" sintético. Tudo em px @1x.
export const TRUTH = {
  width: 1440,
  height: 1600,
  chromeHeight: 90,
  colors: {
    bg: '#ffffff', header: '#111827', hero: '#f3f4f6', photo: '#2563eb', accent: '#f59e0b',
    card: '#e5e7eb', cardTitle: '#374151', footer: '#1f2937', chrome: '#d1d5db',
  },
  sections: [
    { name: 'header', y: 0, h: 80 },
    { name: 'hero', y: 80, h: 520 },
    { name: 'cards', y: 600, h: 640 },
    { name: 'footer', y: 1240, h: 360 },
  ],
  assets: [{ name: 'hero-photo', x: 800, y: 160, w: 520, h: 360 }],
  elements: {
    heroTitleBar: { x: 120, y: 200, w: 520, h: 48 },
    heroCta: { x: 120, y: 420, w: 200, h: 56 },
    cards: [
      { x: 120, y: 680, w: 360, h: 480 }, { x: 540, y: 680, w: 360, h: 480 }, { x: 960, y: 680, w: 360, h: 480 },
    ],
    cardTitleBar: { dx: 24, dy: 24, w: 200, h: 24 },
  },
};

const rgb = (hex) => [...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)), 255];

export function drawFixture(scale = 1) {
  const T = TRUTH, C = T.colors, s = scale;
  const png = createPng(T.width * s, T.height * s, rgb(C.bg));
  const rect = (x, y, w, h, hex) => fillRect(png, x * s, y * s, w * s, h * s, rgb(hex));
  for (const sec of T.sections) {
    const color = { header: C.header, hero: C.hero, cards: C.bg, footer: C.footer }[sec.name];
    rect(0, sec.y, T.width, sec.h, color);
  }
  const E = T.elements;
  rect(E.heroTitleBar.x, E.heroTitleBar.y, E.heroTitleBar.w, E.heroTitleBar.h, C.header);
  rect(E.heroCta.x, E.heroCta.y, E.heroCta.w, E.heroCta.h, C.accent);
  const a = T.assets[0];
  rect(a.x, a.y, a.w, a.h, C.photo);
  for (const c of E.cards) {
    rect(c.x, c.y, c.w, c.h, C.card);
    rect(c.x + E.cardTitleBar.dx, c.y + E.cardTitleBar.dy, E.cardTitleBar.w, E.cardTitleBar.h, C.cardTitle);
  }
  return png;
}

export function drawWithChrome() {
  const T = TRUTH;
  const base = drawFixture(1);
  const png = createPng(T.width, T.height + T.chromeHeight, rgb(T.colors.chrome));
  png.data.set(base.data, T.chromeHeight * T.width * 4);
  return png;
}

export function writeFixtures(dir) {
  mkdirSync(dir, { recursive: true });
  writePng(join(dir, 'synthetic-desk.png'), drawFixture(1));
  writePng(join(dir, 'synthetic-desk@2x.png'), drawFixture(2));
  writePng(join(dir, 'synthetic-desk-chrome.png'), drawWithChrome());
  writeFileSync(join(dir, 'ground-truth.json'), JSON.stringify(TRUTH, null, 2) + '\n');
}

if (isCliInvocation(import.meta.url)) {
  const dir = process.argv[2] || 'tests/fixtures/synthetic';
  writeFixtures(dir);
  console.log(`fixtures escritos em ${dir}`);
}
```

- [ ] **Step 3: Gerar fixtures e rodar testes**

Run: `node tests/make-fixture.mjs && ls -la tests/fixtures/synthetic && node --test tests/*.test.mjs` — Expected: 4 PNG/JSON gerados (cores chapadas comprimem bem: cada PNG < 60 KB) e PASS 4/4.

- [ ] **Step 4: Commit**

```bash
git add tests
git commit -m "test: fixture sintético com verdade conhecida (desk @1x, @2x, com chrome)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: `inspect-image.mjs`

**Files:**
- Create: `pixelsmith/scripts/inspect-image.mjs`, `pixelsmith/scripts/inspect-image.test.mjs`

**Interfaces:**
- Consumes: `readPng`, `palette`, `bandProfile` (lib/png), `getFlag`, `positionals`, `isCliInvocation`, `fail` (lib/cli).
- Produces: `suggestScale(width, height) → {scale: 1|2|3, reason: string}`, `inspectImage(path, {bands=40, top=8}) → {width, height, suggestedScale, scaleReason, palette, bands}`.
- CLI: `node inspect-image.mjs <png> [--bands N] [--top N]`.

- [ ] **Step 1: Teste falhando**

`pixelsmith/scripts/inspect-image.test.mjs`:
```js
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
```

Run: `node --test pixelsmith/scripts/inspect-image.test.mjs` — Expected: FAIL.

- [ ] **Step 2: Implementar**

`pixelsmith/scripts/inspect-image.mjs`:
```js
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
```

- [ ] **Step 3: Rodar testes + CLI real**

Run: `node --test pixelsmith/scripts/inspect-image.test.mjs && node pixelsmith/scripts/inspect-image.mjs tests/fixtures/synthetic/synthetic-desk@2x.png --bands 4 | head -8` — Expected: PASS 3/3; CLI imprime JSON com `"suggestedScale": 2`.

- [ ] **Step 4: Commit**

```bash
git add pixelsmith/scripts/inspect-image.mjs pixelsmith/scripts/inspect-image.test.mjs
git commit -m "feat: inspect-image — dimensões, escala sugerida, paleta e perfil por faixa

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: `normalize-image.mjs`

**Files:**
- Create: `pixelsmith/scripts/normalize-image.mjs`, `pixelsmith/scripts/normalize-image.test.mjs`

**Interfaces:**
- Consumes: `readPng`, `writePng`, `crop`, `downscaleBox` (lib/png); `getFlag`, `positionals`, `parseBox`, `isCliInvocation`, `fail` (lib/cli).
- Produces: `normalizeImage(input, {out, scale=1, crop?, convertImpl=defaultConvert}) → Promise<{out, width, height, scale, cropped}>`; `defaultConvert(input, {platform=process.platform, exec=execFileSync}) → Promise<pngPath>`.
- CLI: `node normalize-image.mjs <in> --out <png> [--scale S] [--crop x,y,w,h]`.

- [ ] **Step 1: Teste falhando**

`pixelsmith/scripts/normalize-image.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizeImage, defaultConvert } from './normalize-image.mjs';
import { readPng } from './lib/png.mjs';
import { TRUTH } from '../../tests/make-fixture.mjs';

const FX = 'tests/fixtures/synthetic';
const same = (a, b) => assert.deepEqual(Buffer.from(readPng(a).data), Buffer.from(readPng(b).data));
let dir; test.before(() => { dir = mkdtempSync(join(tmpdir(), 'norm-')); });

test('@2x → @1x com --scale 2 é byte-idêntico ao fixture @1x', async () => {
  const out = join(dir, 'a.png');
  const r = await normalizeImage(`${FX}/synthetic-desk@2x.png`, { out, scale: 2 });
  assert.deepEqual(r, { out, width: TRUTH.width, height: TRUTH.height, scale: 2, cropped: false });
  same(out, `${FX}/synthetic-desk.png`);
});

test('--crop remove o chrome do browser', async () => {
  const out = join(dir, 'b.png');
  const r = await normalizeImage(`${FX}/synthetic-desk-chrome.png`, { out, crop: { x: 0, y: TRUTH.chromeHeight, w: TRUTH.width, h: TRUTH.height } });
  assert.equal(r.cropped, true);
  same(out, `${FX}/synthetic-desk.png`);
});

test('não-PNG passa pelo convertImpl injetado', async () => {
  const out = join(dir, 'c.png');
  let called = null;
  const r = await normalizeImage('/nao/existe/print.jpg', { out, convertImpl: async (i) => { called = i; return `${FX}/synthetic-desk.png`; } });
  assert.equal(called, '/nao/existe/print.jpg');
  assert.equal(r.width, TRUTH.width);
});

test('defaultConvert fora do macOS falha com instrução', async () => {
  await assert.rejects(() => defaultConvert('x.jpg', { platform: 'linux' }), /Converta para PNG/);
});

test('defaultConvert no macOS chama sips com os argumentos certos', async () => {
  const calls = [];
  const out = await defaultConvert('/tmp/x.heic', { platform: 'darwin', exec: (cmd, args) => { calls.push([cmd, args]); } });
  assert.equal(calls[0][0], 'sips');
  assert.deepEqual(calls[0][1].slice(0, 3), ['-s', 'format', 'png']);
  assert.equal(calls[0][1][3], '/tmp/x.heic');
  assert.ok(out.endsWith('.png'));
});
```

Run: `node --test pixelsmith/scripts/normalize-image.test.mjs` — Expected: FAIL.

- [ ] **Step 2: Implementar**

`pixelsmith/scripts/normalize-image.mjs`:
```js
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { readPng, writePng, crop as cropPng, downscaleBox } from './lib/png.mjs';
import { getFlag, positionals, parseBox, isCliInvocation, fail } from './lib/cli.mjs';

// Conversão JPG/HEIC/WebP → PNG. Só macOS (sips). Fora dele: erro instrutivo, nunca tentativa silenciosa.
export async function defaultConvert(input, { platform = process.platform, exec = execFileSync } = {}) {
  if (platform !== 'darwin') {
    throw new Error(`conversão de ${extname(input)} só é automática no macOS (sips). Converta para PNG e rode de novo.`);
  }
  const out = join(mkdtempSync(join(tmpdir(), 'pixelsmith-')), basename(input, extname(input)) + '.png');
  exec('sips', ['-s', 'format', 'png', input, '--out', out], { stdio: 'pipe' });
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
    const cropFlag = getFlag(argv, '--crop');
    normalizeImage(input, { out, scale: Number(getFlag(argv, '--scale', 1)), crop: cropFlag ? parseBox(cropFlag) : undefined })
      .then((r) => console.log(JSON.stringify(r, null, 2)))
      .catch((e) => fail(`normalize-image falhou: ${e.message}`));
  }
}
```

- [ ] **Step 3: Rodar testes**

Run: `node --test pixelsmith/scripts/normalize-image.test.mjs` — Expected: PASS 5/5.

- [ ] **Step 4: Commit**

```bash
git add pixelsmith/scripts/normalize-image.mjs pixelsmith/scripts/normalize-image.test.mjs
git commit -m "feat: normalize-image — conversão via sips, crop de chrome e downscale para @1x

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: `crop-region.mjs`

**Files:**
- Create: `pixelsmith/scripts/crop-region.mjs`, `pixelsmith/scripts/crop-region.test.mjs`

**Interfaces:**
- Consumes: `readPng`, `writePng`, `crop` (lib/png); `getFlag`, `positionals`, `parseBox`, `isCliInvocation`, `fail` (lib/cli).
- Produces: `cropRegion(input, {box, out}) → {out, width, height}`.
- CLI: `node crop-region.mjs <png> --box x,y,w,h --out <png>`.

- [ ] **Step 1: Teste falhando**

`pixelsmith/scripts/crop-region.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cropRegion } from './crop-region.mjs';
import { readPng } from './lib/png.mjs';
import { TRUTH } from '../../tests/make-fixture.mjs';

const FX = 'tests/fixtures/synthetic';
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

test('recorta o asset do print com as dimensões da caixa e a cor certa', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'crop-')), 'hero-photo.png');
  const a = TRUTH.assets[0];
  const r = cropRegion(`${FX}/synthetic-desk.png`, { box: a, out });
  assert.deepEqual(r, { out, width: a.w, height: a.h });
  const png = readPng(out);
  assert.deepEqual(Array.from(png.data.subarray(0, 3)), hexToRgb(TRUTH.colors.photo));
  assert.deepEqual(Array.from(png.data.subarray((png.width * png.height - 1) * 4, (png.width * png.height - 1) * 4 + 3)), hexToRgb(TRUTH.colors.photo));
});

test('caixa fora da imagem lança RangeError', () => {
  assert.throws(() => cropRegion(`${FX}/synthetic-desk.png`, { box: { x: 1400, y: 0, w: 100, h: 10 }, out: '/dev/null' }), RangeError);
});
```

Run: `node --test pixelsmith/scripts/crop-region.test.mjs` — Expected: FAIL.

- [ ] **Step 2: Implementar**

`pixelsmith/scripts/crop-region.mjs`:
```js
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
```

- [ ] **Step 3: Rodar testes**

Run: `node --test pixelsmith/scripts/crop-region.test.mjs` — Expected: PASS 2/2.

- [ ] **Step 4: Commit**

```bash
git add pixelsmith/scripts/crop-region.mjs pixelsmith/scripts/crop-region.test.mjs
git commit -m "feat: crop-region — recorte de assets direto do print

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: `band-diff.mjs`

**Files:**
- Create: `pixelsmith/scripts/band-diff.mjs`, `pixelsmith/scripts/band-diff.test.mjs`

**Interfaces:**
- Consumes: `readPng`, `crop` (lib/png); `pixelmatch`; `getFlag`, `positionals`, `isCliInvocation`, `fail` (lib/cli).
- Produces: `bandDiff(pathA, pathB, {band=50, threshold=15}) → {band, threshold, bands:[{y0,y1,mismatchPct}], firstDriftBand: {y0,y1,mismatchPct}|null, worst:[até 5, desc]}`.
- CLI: `node band-diff.mjs <a.png> <b.png> [--band 50] [--threshold 15]`.

- [ ] **Step 1: Teste falhando**

`pixelsmith/scripts/band-diff.test.mjs`:
```js
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
```

Run: `node --test pixelsmith/scripts/band-diff.test.mjs` — Expected: FAIL.

- [ ] **Step 2: Implementar**

`pixelsmith/scripts/band-diff.mjs`:
```js
import pixelmatch from 'pixelmatch';
import { readPng, crop } from './lib/png.mjs';
import { getFlag, positionals, isCliInvocation, fail } from './lib/cli.mjs';

// Mismatch por faixa horizontal. Mesma honestidade do screenshot-diff: área não sobreposta
// (largura ou altura extra de uma das imagens) conta como mismatch total.
export function bandDiff(pathA, pathB, { band = 50, threshold = 15 } = {}) {
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
      console.log(JSON.stringify(bandDiff(pa, pb, { band: Number(getFlag(argv, '--band', 50)), threshold: Number(getFlag(argv, '--threshold', 15)) }), null, 2));
    } catch (e) { fail(`band-diff falhou: ${e.message}`); }
  }
}
```

- [ ] **Step 3: Rodar testes**

Run: `node --test pixelsmith/scripts/band-diff.test.mjs` — Expected: PASS 3/3.

- [ ] **Step 4: Commit**

```bash
git add pixelsmith/scripts/band-diff.mjs pixelsmith/scripts/band-diff.test.mjs
git commit -m "feat: band-diff — mismatch por faixa de y para o loop drift-first

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: `detect-stack.mjs`

**Files:**
- Create: `pixelsmith/scripts/detect-stack.mjs`, `pixelsmith/scripts/detect-stack.test.mjs`

**Interfaces:**
- Consumes: `node:fs`, `node:path`; `positionals`, `isCliInvocation`, `fail` (lib/cli).
- Produces: `detectStack(dir='.') → { framework: 'next'|'astro'|'sveltekit'|'svelte'|'nuxt'|'vue'|'vite-react'|null, router: 'app'|'pages'|null, typescript: boolean, styling: string[], componentsDir: string[], tokenFiles: [{path, hasRootVars}], packageManager: 'pnpm'|'yarn'|'bun'|'npm', devCommand: string|null }`. Só leitura de fs; nada é executado ou instalado.
- CLI: `node detect-stack.mjs [dir]`.

- [ ] **Step 1: Teste falhando**

`pixelsmith/scripts/detect-stack.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectStack } from './detect-stack.mjs';

function project(files) {
  const dir = mkdtempSync(join(tmpdir(), 'stack-'));
  for (const [p, content] of Object.entries(files)) {
    mkdirSync(join(dir, p, '..'), { recursive: true });
    writeFileSync(join(dir, p), typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}

test('next app router + tailwind@4 + ts + pnpm', () => {
  const dir = project({
    'package.json': { dependencies: { next: '15.0.0', react: '19.0.0' }, devDependencies: { tailwindcss: '^4.0.0' }, scripts: { dev: 'next dev' } },
    'tsconfig.json': '{}', 'pnpm-lock.yaml': '', 'app/layout.tsx': '', 'app/globals.css': ':root { --bg: #fff; }',
    'src/components/Button.tsx': '',
  });
  const r = detectStack(dir);
  assert.equal(r.framework, 'next'); assert.equal(r.router, 'app'); assert.equal(r.typescript, true);
  assert.deepEqual(r.styling, ['tailwind@4']);
  assert.deepEqual(r.componentsDir, ['src/components']);
  assert.deepEqual(r.tokenFiles, [{ path: 'app/globals.css', hasRootVars: true }]);
  assert.equal(r.packageManager, 'pnpm'); assert.equal(r.devCommand, 'pnpm dev');
});

test('next pages router + css modules + npm', () => {
  const dir = project({
    'package.json': { dependencies: { next: '14.0.0', react: '18.0.0' }, scripts: { dev: 'next dev' } },
    'package-lock.json': '{}', 'pages/index.js': '', 'components/Hero.module.css': '', 'components/Hero.jsx': '',
  });
  const r = detectStack(dir);
  assert.equal(r.router, 'pages'); assert.equal(r.typescript, false);
  assert.deepEqual(r.styling, ['css-modules']);
  assert.deepEqual(r.componentsDir, ['components']);
  assert.equal(r.devCommand, 'npm run dev');
});

test('vite-react + tailwind@3 + yarn; vanilla quando nada é detectado', () => {
  const dir = project({
    'package.json': { dependencies: { react: '18.0.0' }, devDependencies: { vite: '5.0.0', tailwindcss: '3.4.0' }, scripts: { dev: 'vite' } },
    'yarn.lock': '', 'tailwind.config.js': 'module.exports = {}', 'src/index.css': '@tailwind base;',
  });
  const r = detectStack(dir);
  assert.equal(r.framework, 'vite-react'); assert.equal(r.router, null);
  assert.deepEqual(r.styling, ['tailwind@3']);
  assert.deepEqual(r.tokenFiles, [{ path: 'tailwind.config.js', hasRootVars: false }, { path: 'src/index.css', hasRootVars: false }]);
  assert.equal(r.devCommand, 'yarn dev');
  const plain = project({ 'package.json': { dependencies: { react: '18.0.0' } } });
  assert.equal(detectStack(plain).framework, null);
  assert.deepEqual(detectStack(plain).styling, ['vanilla']);
  assert.equal(detectStack(plain).devCommand, null);
});

test('astro, sveltekit, nuxt, vue, styled-components, bun', () => {
  assert.equal(detectStack(project({ 'package.json': { dependencies: { astro: '4.0.0' } } })).framework, 'astro');
  assert.equal(detectStack(project({ 'package.json': { devDependencies: { '@sveltejs/kit': '2.0.0', svelte: '5.0.0' } } })).framework, 'sveltekit');
  assert.equal(detectStack(project({ 'package.json': { devDependencies: { svelte: '5.0.0', vite: '5.0.0' } } })).framework, 'svelte');
  assert.equal(detectStack(project({ 'package.json': { dependencies: { nuxt: '3.0.0', vue: '3.0.0' } } })).framework, 'nuxt');
  assert.equal(detectStack(project({ 'package.json': { dependencies: { vue: '3.0.0' }, devDependencies: { vite: '5.0.0' } } })).framework, 'vue');
  const sc = detectStack(project({ 'package.json': { dependencies: { react: '18', 'styled-components': '6' }, scripts: { dev: 'x' } }, 'bun.lockb': '' }));
  assert.deepEqual(sc.styling, ['styled-components']); assert.equal(sc.packageManager, 'bun'); assert.equal(sc.devCommand, 'bun dev');
});

test('sem package.json: tudo nulo/vazio, sem lançar', () => {
  const r = detectStack(mkdtempSync(join(tmpdir(), 'empty-')));
  assert.equal(r.framework, null); assert.deepEqual(r.styling, ['vanilla']); assert.equal(r.packageManager, 'npm');
});
```

Run: `node --test pixelsmith/scripts/detect-stack.test.mjs` — Expected: FAIL.

- [ ] **Step 2: Implementar**

`pixelsmith/scripts/detect-stack.mjs`:
```js
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { positionals, isCliInvocation, fail } from './lib/cli.mjs';

const COMPONENT_DIRS = ['src/components', 'components', 'app/components', 'src/lib/components', 'src/ui', 'src/app/components'];
const TOKEN_FILES = [
  'tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs', 'tailwind.config.cjs',
  'app/globals.css', 'src/app/globals.css', 'src/index.css', 'src/styles/globals.css', 'styles/globals.css',
  'src/styles/tokens.css', 'src/theme.ts', 'src/theme.js', 'src/lib/theme.ts',
];

function readJson(p) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } }
function major(v) { const m = String(v ?? '').match(/(\d+)/); return m ? Number(m[1]) : null; }

// Procura *.module.css até 4 níveis, ignorando node_modules e pastas ocultas.
function hasCssModules(root, depth = 0) {
  if (depth > 4) return false;
  let entries;
  try { entries = readdirSync(root); } catch { return false; }
  for (const e of entries) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const p = join(root, e);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { if (hasCssModules(p, depth + 1)) return true; }
    else if (/\.module\.(css|scss|sass)$/.test(e)) return true;
  }
  return false;
}

export function detectStack(dir = '.') {
  const pkg = readJson(join(dir, 'package.json')) ?? {};
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const has = (n) => Object.prototype.hasOwnProperty.call(deps, n);
  const exists = (p) => existsSync(join(dir, p));

  let framework = null;
  if (has('next')) framework = 'next';
  else if (has('astro')) framework = 'astro';
  else if (has('@sveltejs/kit')) framework = 'sveltekit';
  else if (has('svelte')) framework = 'svelte';
  else if (has('nuxt')) framework = 'nuxt';
  else if (has('vue')) framework = 'vue';
  else if (has('react') && has('vite')) framework = 'vite-react';

  let router = null;
  if (framework === 'next') {
    if (exists('app') || exists('src/app')) router = 'app';
    else if (exists('pages') || exists('src/pages')) router = 'pages';
  }

  const styling = [];
  if (has('tailwindcss')) styling.push(`tailwind@${major(deps.tailwindcss) ?? '?'}`);
  if (hasCssModules(dir)) styling.push('css-modules');
  if (has('styled-components')) styling.push('styled-components');
  if (styling.length === 0) styling.push('vanilla');

  const componentsDir = COMPONENT_DIRS.filter(exists);
  const tokenFiles = TOKEN_FILES.filter(exists).map((p) => ({
    path: p,
    hasRootVars: /\.css$/.test(p) && /:root\s*\{[^}]*--/.test(readFileSync(join(dir, p), 'utf8')),
  }));

  let packageManager = 'npm';
  if (exists('pnpm-lock.yaml')) packageManager = 'pnpm';
  else if (exists('yarn.lock')) packageManager = 'yarn';
  else if (exists('bun.lockb') || exists('bun.lock')) packageManager = 'bun';
  else if (typeof pkg.packageManager === 'string') packageManager = pkg.packageManager.split('@')[0] || 'npm';

  const devCommand = pkg.scripts?.dev ? (packageManager === 'npm' ? 'npm run dev' : `${packageManager} dev`) : null;

  return { framework, router, typescript: exists('tsconfig.json'), styling, componentsDir, tokenFiles, packageManager, devCommand };
}

if (isCliInvocation(import.meta.url)) {
  const [dir] = positionals(process.argv.slice(2));
  try { console.log(JSON.stringify(detectStack(dir ?? '.'), null, 2)); }
  catch (e) { fail(`detect-stack falhou: ${e.message}`); }
}
```

- [ ] **Step 3: Rodar testes + CLI real no omni-core**

Run: `node --test pixelsmith/scripts/detect-stack.test.mjs && node pixelsmith/scripts/detect-stack.mjs ~/projects/omni-core` — Expected: PASS 5/5; no omni-core, `framework: "next"` (ou o que o projeto realmente tiver — registrar a saída no report da task).

- [ ] **Step 4: Commit**

```bash
git add pixelsmith/scripts/detect-stack.mjs pixelsmith/scripts/detect-stack.test.mjs
git commit -m "feat: detect-stack — framework, router, estilização, tokens e comando dev por leitura de fs

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Playbooks (`references/`)

**Files:**
- Create: `pixelsmith/references/read-the-print-playbook.md`, `pixelsmith/references/recreate-playbook.md`, `pixelsmith/references/in-project-playbook.md`, `pixelsmith/references/validate-playbook.md`

**Interfaces:**
- Consumes: os contratos de CLI das Tasks 4–8 (nomes e flags exatos).
- Produces: os 4 documentos que a SKILL.md (Task 10) referencia por nome de arquivo.

- [ ] **Step 1: `read-the-print-playbook.md`**

```markdown
# Playbook — Ler o print (sem se enganar)

Um print não tem árvore. Tudo que a figsmith lê do `figma-tree.json` aqui
precisa ser MEDIDO na imagem. Regra de ouro: **nunca estime de olho o que dá
para medir com um crop.**

## 1. Escala primeiro, sempre

`inspect-image.mjs` sugere a escala (`suggestedScale` + `scaleReason`). Confirme
com o usuário em 1 pergunta ("esse print é de tela retina? sugestão: 2x"). Toda
medida abaixo é em **px @1x** — a referência de validação é
`reference/desk@1x.png` gerada por `normalize-image.mjs --scale S`.

Sinais de retina que o script não vê: texto muito nítido em fonte pequena,
ícones de 32px+ que "parecem" 16px, largura 2560+ com layout que claramente é
1280.

## 2. Tire o que não é interface

Chrome do browser (barra de URL, abas), barra de status do celular, dock,
cursor, scrollbar, notificações. Meça a altura da faixa no arquivo ORIGINAL e
recorte no `normalize-image.mjs --crop x,y,w,h` (crop é em px do arquivo, antes
do downscale). Sem isso o score de validação compara UI com chrome e o drift
começa no pixel 0.

## 3. Mapa de seções — o "absoluteBoundingBox" do print

1. `inspect-image.mjs --bands 40`: o perfil `bands[].lum/variance` mostra onde
   o fundo muda (salto de luminância) e onde há conteúdo denso (variância alta).
2. Para cada fronteira candidata, `crop-region.mjs` de uma faixa de 60px em
   torno dela e olhe a imagem: confirme o y exato da transição.
3. Escreva `pixelsmith/section-map.json`:
   ```json
   { "scale": 2, "width": 1440,
     "sections": [ { "name": "hero", "top": 80, "height": 520, "bg": "#f3f4f6",
       "columns": { "count": 2, "gutter": 40, "contentLeft": 120, "contentRight": 1320 } } ],
     "font": { "family": "Inter", "evidence": "specimen 2026-09-11", "fallback": true },
     "assets": [ { "name": "hero-photo", "box1x": [800,160,520,360], "boxFile": [1600,320,1040,720] } ] }
   ```
4. Colunas e gutters: crop de uma faixa horizontal de 20px onde os cards
   aparecem e leia os x de início/fim de cada bloco.

Tolerância de medida: ±4px @1x. Anote a medida, não o "aproximadamente".

## 4. Cores por amostragem, nunca por memória

- `palette` do inspect dá os fundos e as cores dominantes.
- Para cor de texto, acento, borda: crop de 8×8px numa área CHAPADA do
  elemento (não em borda antialiasada) e leia o hex. Uma amostra em
  antialiasing dá cor errada — escolha o miolo.
- Gradiente: amostre início, meio e fim; declare o ângulo pela direção da
  variação.
- Print JPEG: cores chapadas vêm com ruído de ±3; arredonde para o hex "limpo"
  mais próximo e declare no report.

## 5. Fonte por evidência de glifo

Igual à figsmith: recorte 2–3 trechos de texto (título, corpo, botão), monte
`pixelsmith/specimen.html` com as candidatas (system-ui, Inter, Geist, Roboto,
SF Pro, Helvetica Neue, e as que o projeto já carrega no modo in-project) nos
mesmos textos e tamanhos, sirva com `serve.mjs` e compare estruturas de glifo
(`a` de uma ou duas histórias, cauda do `g`, `R` com perna reta ou curva,
largura do `M`). Tamanho: meça a altura de caixa-alta (cap height) no crop e
converta (cap height ≈ 0,7 × font-size para a maioria das sans).
Fonte não identificada → substituta declarada no report, com o gap estimado.

## 6. Inventário de assets: recortar ou reproduzir?

| É | Faz |
|---|---|
| Foto, ilustração, logo bitmap, screenshot dentro do print, avatar | **Recorta** com `crop-region.mjs` do arquivo ORIGINAL (melhor resolução), caixa registrada em @1x E em px do arquivo |
| Ícone simples (seta, check, hambúrguer), gradiente, sombra, borda, badge de cor chapada | **Reproduz em CSS/SVG inline** |
| Ícone complexo ou logo vetorial que não dá para reproduzir | Recorta como PNG e declara no report como "asset raster de um vetor" |
| Elemento parcialmente coberto (texto sobre a foto) | Recorta a foto inteira; o texto é reconstruído por cima. Se o texto "vaza" no recorte, declare |

Nunca recorte o print inteiro e embede como imagem: o objetivo é código.

## 7. Copy verbatim

Transcreva exatamente, com maiúsculas, pontuação e quebras de linha do print.
Ênfases (negrito, cor, sublinhado) viram `<span>`/`<strong>`. Texto ilegível
por resolução → marque `[ilegível]` e pergunte ao usuário em vez de inventar.
Modo base-de-layout (print de terceiro): copy substituída por texto neutro de
comprimento equivalente (mesmo número de linhas), declarado no report.

## 8. Gate de saída

Apresente o `section-map.json` resumido em 1 mensagem (seções + medidas +
fonte + assets) e peça confirmação. Só então construa.
```

- [ ] **Step 2: `recreate-playbook.md`**

```markdown
# Playbook — Recreate (modo standalone: print → HTML/CSS estático)

Entrada: `section-map.json`, `reference/desk@1x.png` (e `mobile@1x.png` se
houver), `assets/`. Saída: `site/` servível por `serve.mjs`, sem build, sem
CDN, sem JS de motion.

## Estrutura de saída

```
site/
├── index.html
├── css/
│   ├── tokens.css      # :root com as cores/fontes/espaçamentos do section-map
│   ├── base.css        # reset, tipografia base, container
│   ├── sections.css    # uma região comentada por seção, com as medidas em px
│   └── responsive.css  # só quando há print mobile
├── js/main.js          # só quando há 2 prints: fit-zoom (abaixo). Nada de motion.
└── assets/             # cópias dos recortes
```

- `tokens.css`: nomes semânticos (`--c-bg`, `--c-surface`, `--c-text`,
  `--c-accent`, `--font-sans`, `--space-section`). Cores fora do top-N ficam
  inline onde aparecem.
- `sections.css` carrega o comentário de medida por seção
  (`/* hero: top 80, h 520 @1440 */`) — é o que permite auditar drift na
  validação sem reabrir o mapa.

## Layout

- Flex/grid por padrão; `position: absolute` só para decoração sobreposta.
- Largura do container = `contentRight − contentLeft` do mapa; margens laterais
  = `contentLeft`.
- Alturas: **não fixe `height` em seções de conteúdo** — use padding e
  line-height que resultem na altura medida; fixe altura só em blocos de mídia.
  Seção com `height` fixa esconde overflow e "passa" no diff enquanto o
  conteúdo está errado.
- Elementos exclusivos de um print (só desk ou só mobile) recebem
  `display: none` explícito no outro breakpoint.

## Copy, fontes e assets

- Copy verbatim do `section-map.json` (regra 7 do playbook de leitura).
- Fonte: a escolhida no specimen; se substituta, mantenha as métricas
  (font-size e line-height medidos) e declare o gap.
- Assets: `<img>` com `width`/`height` da caixa @1x e `object-fit: cover`.
  Foto de fundo: `background-size: cover` posicionada como no print.

## Duas larguras (desk + mobile)

Só há 2 canvas fixos. Inclua o fit-zoom da figsmith em `js/main.js` para
larguras intermediárias (layout, não motion):

```js
const DESK_W = 1440, MOB_W = 390; // do section-map
const apply = () => {
  const page = document.querySelector('.page');
  const w = window.innerWidth;
  const zoom = w >= 768 ? Math.min(1, w / DESK_W) : Math.min(1.5, w / MOB_W);
  page.style.zoom = zoom === 1 ? '' : String(zoom);
};
window.addEventListener('resize', apply); apply();
```

`responsive.css` com `@media (max-width: 767px)` e `.page { margin: 0 auto }`.
A validação captura nas larguras EXATAS dos prints → zoom = 1 → sem efeito no
score.

## Qualidade

Se `impeccable` ou `frontend-design` estiverem disponíveis, use para semântica,
acessibilidade e organização do CSS — **sem alterar medidas**. Fidelidade ganha
de estética: o print é a verdade.
```

- [ ] **Step 3: `in-project-playbook.md`**

```markdown
# Playbook — In-project (print → componente no projeto atual)

Objetivo: o componente parece **nascido no projeto**, não colado. Mesma
linguagem, mesmos tokens, mesma pasta. Fidelidade é medida numa rota-harness
temporária.

## 1. Detectar

```bash
node <skill-dir>/scripts/detect-stack.mjs . > pixelsmith/stack.json
```

- `framework: null` → avise e caia para o modo standalone; entregue `site/` e
  diga no report que o CSS é referência para portar.
- Leia os `tokenFiles` retornados ANTES de escrever qualquer cor.

## 2. Tokens do projeto primeiro

Para cada cor do `section-map.json`:
1. Procure equivalente nos tokens existentes (Tailwind `theme.colors`, `:root`
   vars, `theme.ts`). Aceite se a distância for pequena: |ΔR|+|ΔG|+|ΔB| ≤ 24
   (≈ imperceptível em UI chapada).
2. Sem equivalente → crie o token **no arquivo de tokens do projeto** (não
   inline), com nome no padrão do projeto, e liste no report como "token novo".
3. Nunca escreva hex solto em JSX/Tailwind (`bg-[#2563eb]`) quando existe
   token. Arbitrário só para valores únicos de layout (ex.: `h-[520px]`).

Tipografia e espaçamento: mesma regra (escala do Tailwind / vars do projeto;
valor arbitrário só quando a medida não cai na escala e importa para a
fidelidade).

## 3. Idioma do componente

| Stack | Escreve |
|---|---|
| `next`/`vite-react` + TS | `<Nome>.tsx` com `Props` tipadas; conteúdo (copy, src de imagens) via props com defaults = o print |
| Tailwind | classes utilitárias; nada de CSS novo salvo `@apply` se o projeto já usa |
| CSS Modules | `<Nome>.module.css` ao lado, classes locais |
| styled-components | styled no mesmo arquivo, tokens via `theme` |
| `vue`/`nuxt` | SFC `<Nome>.vue` (script setup se o projeto usa) |
| `svelte`/`sveltekit` | `<Nome>.svelte` |
| `astro` | `<Nome>.astro` |

Pasta: o primeiro de `componentsDir`; se vazio, pergunte (1 pergunta). Assets
recortados vão para a pasta pública convencional (`public/` em Next/Vite/Astro,
`static/` em SvelteKit) sob `pixelsmith/<slug>/`.

Server vs. client: componente puro de apresentação → server component (Next
app) sem `'use client'`, a menos que use estado/handlers.

## 4. Rota-harness (temporária, prefixo `pixelsmith-harness`)

Renderiza SÓ o componente, na largura exata do print @1x, sem layout global
(sem header/sidebar/providers de app que mudem o visual). Antes de escrever:
verifique que o caminho não existe (colisão → abortar e perguntar).

Next app router — `app/pixelsmith-harness/<slug>/page.tsx` (ou `src/app/...`):
```tsx
import Nome from '@/components/Nome';
export default function Page() {
  return <div style={{ width: 1440, margin: 0 }}><Nome /></div>;
}
```
O layout raiz (`app/layout.tsx`) SEMPRE envolve a página — um layout aninhado
não o substitui, e um route group também não escapa dele. Por isso a
validação fotografa o `div` do harness, não a página inteira (§5). Se o
layout raiz injeta header/nav/sidebar ou limita a largura de forma que
altere o visual do componente, adicione no próprio `page.tsx` do harness um
`<style>` escopado que esconda `header, nav, aside` e zere a largura máxima
do `main`; só toque em `app/layout.tsx` depois de perguntar ao usuário.

Next pages router — `pages/pixelsmith-harness-<slug>.tsx` com o mesmo `<div>`.

Vite (React/Vue/Svelte) — `pixelsmith-harness.html` na raiz +
`src/pixelsmith-harness.(tsx|ts)` que monta o componente no `#root` com a
largura fixa; acessível em `http://localhost:5173/pixelsmith-harness.html`.

Astro — `src/pages/pixelsmith-harness-<slug>.astro` importando o componente.

SvelteKit — `src/routes/pixelsmith-harness-<slug>/+page.svelte`.

Nuxt — `pages/pixelsmith-harness-<slug>.vue` importando o componente num
`<div :style="{ width: '1440px', margin: 0 }">`.

Dev server: se não estiver respondendo na porta esperada, rode `devCommand`
em background e espere até 60s pela porta; se não subir, pare a validação e
entregue o componente **sem score, dizendo isso**.

## 5. Validar e limpar

- Screenshot via chrome-devtools do elemento `div` do harness (não full-page
  da rota) na largura do print; diff e loop conforme `validate-playbook.md`.
- Ao terminar: **remova** a rota-harness (e o `layout.tsx` auxiliar), a menos
  que o usuário peça para manter. `pixelsmith/` (artefatos) fica fora de `src/`
  e entra no `.gitignore` do projeto (adicione a linha se não existir), salvo
  pedido contrário.
- Report lista TODOS os arquivos criados/alterados no projeto, com o que mudou.
```

- [ ] **Step 4: `validate-playbook.md`**

```markdown
# Playbook — Validate (diff perceptual, drift-first, platô, report)

Ferramentas: `serve.mjs` (standalone) ou o dev server (in-project),
screenshot via chrome-devtools MCP, `screenshot-diff.mjs` (score),
`band-diff.mjs` (onde o drift começa).

## 1. Captura

- Viewport na largura EXATA da referência @1x (`reference/desk@1x.png`).
  Device scale factor 1 (screenshot em px CSS). Se o MCP capturar em 2x,
  normalize o screenshot com `normalize-image.mjs --scale 2` antes do diff.
- Standalone: full-page. In-project: screenshot do `div` do harness.
- Fontes carregadas: espere `document.fonts.ready` antes de capturar.
- Sem hover, sem foco, sem scrollbar visível (`overflow` do body sem barra).

## 2. Medir

```bash
node <skill-dir>/scripts/screenshot-diff.mjs pixelsmith/shots/desk-N.png pixelsmith/reference/desk@1x.png --out pixelsmith/shots/diff-desk-N.png
node <skill-dir>/scripts/band-diff.mjs      pixelsmith/shots/desk-N.png pixelsmith/reference/desk@1x.png --band 50
```

`scorePct` é o número do report. Área não sobreposta (altura diferente) conta
como mismatch total — isso é intencional; não normalize dimensões.

## 3. Loop drift-first

1. `firstDriftBand` diz onde a divergência COMEÇA. Abra o crop dessa faixa nas
   duas imagens lado a lado (`crop-region.mjs` na mesma caixa) e ache a causa
   (altura de bloco, padding, line-height, imagem com altura errada).
2. Corrija SÓ isso. Re-capture, re-meça.
3. Repita. Pare quando: **score ≥ 90%** por viewport, OU **platô: 3 iterações
   seguidas com ganho < 0,5%** cada. Nunca use número fixo de iterações.
4. Registre cada iteração: `{ n, scorePct, ganho, o que mudou }` — vira a
   tabela do report e prova o platô.

Ordem de impacto real (herdada da figsmith): drift vertical acumulado ≫
reamostragem de imagem > antialiasing de fonte > fonte substituta > blur.

## 4. Ruídos típicos de PRINT (declarar, não "consertar")

| Ruído | Efeito no score | O que fazer |
|---|---|---|
| Artefatos JPEG | mismatch difuso em áreas chapadas (1–5%) | declarar; não ajustar cores para "casar" com ruído |
| Antialiasing de fonte (renderer diferente) | 2–8% em texto denso | declarar |
| Fonte substituta | pequeno, real em texto justo | declarar com a fonte usada |
| Conteúdo dinâmico (relógio, badge, avatar, contador) | mismatch localizado | reproduzir o valor do print; declarar como dinâmico |
| Foto de tela (celular fotografando monitor) | blur + moiré + perspectiva | dizer que o score é indicativo; não iterar além do platô |
| Asset recortado com borda de contexto | halo no contorno | recortar 1–2px por dentro; declarar se sobrar |
| Print de terceiro em modo base-de-layout | assets/copy diferentes de propósito | score mede LAYOUT; dizer isso explicitamente |

## 5. Report (`pixelsmith/report.md`)

Obrigatório:
- Modo (standalone / in-project + stack detectado) e gate de origem aplicado.
- Escala usada e razão; crop de chrome aplicado (se houve).
- Score final por viewport + tabela de iterações (n, score, ganho, mudança).
- Tabela de drift por seção: top/height medido vs. mapa, tolerância ±6px.
- Mapa de editabilidade: onde trocar copy, cores/tokens, imagens.
- In-project: lista de arquivos criados/alterados; tokens novos; harness
  removido ou mantido.
- **"Não reproduzido"**: cada gap com causa e impacto estimado.

**Nunca declare 100%.** O número é o que o diff mediu; gap é listado, não
maquiado.
```

- [ ] **Step 5: Verificar referências cruzadas e commit**

Run: `grep -o '[a-z-]*\.mjs' pixelsmith/references/*.md | sort -u` — Expected: só nomes que existem em `pixelsmith/scripts/` (inspect-image, normalize-image, crop-region, band-diff, detect-stack, serve, screenshot-diff).

```bash
git add pixelsmith/references
git commit -m "docs: playbooks de leitura do print, recreate, in-project e validate

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: SKILL.md + README + instalação live

**Files:**
- Create: `pixelsmith/SKILL.md`, `README.md`
- Modify: `~/.claude/skills/pixelsmith` (symlink via install.sh)

**Interfaces:**
- Consumes: todos os scripts (CLI exatas) e os 4 playbooks.
- Produces: skill registrada em `~/.claude/skills/pixelsmith`.

- [ ] **Step 1: SKILL.md**

```markdown
---
name: pixelsmith
description: Turn a screenshot / image of a UI (a "print") into faithful front-end code — a standalone static site (HTML/CSS) or a component written inside the current project (Next, Vite+React, Vue, Svelte, Astro; Tailwind, CSS Modules or vanilla) — with a measured perceptual-fidelity score and an honest gap report. Use when the user shares a UI image with intent to build — "screenshot to code", "implementa esse print", "transforma essa imagem em código/site/componente", "faz igual a esse print", "pixelsmith" — or asks to reproduce a design they only have as an image. Requires chrome-devtools MCP. Not for live URLs (mirrorsmith), Figma files (figsmith), token extraction only (site-identity-snapshot), video input, or AI image generation.
---

# pixelsmith

Transforma um print de interface em código front-end fiel, com fidelidade
**medida** e report honesto. Terceiro input da família: `mirrorsmith` parte de
uma URL viva, `figsmith` de um arquivo Figma, `pixelsmith` de um **pixel**.

> **Scripts:** vivem em `<skill-dir>/scripts/`. Rode `npm install --omit=dev`
> em `<skill-dir>` uma vez (o `install.sh` já faz). **Execute sempre do
> diretório do PROJETO de saída** (`node <skill-dir>/scripts/... `): os
> artefatos vão para `./pixelsmith/`.

## Playbooks que esta espinha delega
- `references/read-the-print-playbook.md` — escala, crop de chrome, mapa de seções medido, cores por amostragem, fonte por glifo, inventário de assets, copy verbatim. Leia ANTES da Fase 1.
- `references/recreate-playbook.md` — saída standalone (estrutura, layout, assets, fit-zoom). A Fase 2 standalone segue ele.
- `references/in-project-playbook.md` — stack, tokens do projeto primeiro, idioma do componente, rota-harness `pixelsmith-harness`, limpeza. A Fase 2 in-project segue ele.
- `references/validate-playbook.md` — captura, diff @1x, band-diff, loop drift-first, platô, ruídos de print, report. A Fase 3 segue ele.

## Pipeline

### Fase 0 — Intake
- Imagens: 1 print obrigatório (desk OU componente), print mobile opcional. PNG/JPG/HEIC/WebP.
- Para cada print:
  ```bash
  node <skill-dir>/scripts/inspect-image.mjs <print> --bands 40
  ```
  → confirme a **escala** com o usuário (`suggestedScale` + razão). Se há chrome de browser/status bar/cursor, meça a faixa e recorte:
  ```bash
  node <skill-dir>/scripts/normalize-image.mjs <print> --out pixelsmith/reference/desk@1x.png --scale S [--crop x,y,w,h]
  ```
- **Modo:** in-project quando `detect-stack.mjs .` reconhece um framework E o usuário pede "no projeto / esse componente / nessa página"; caso contrário standalone. Em dúvida, 1 pergunta.
- **Gate de origem (obrigatório):** print próprio/cliente → reprodução fiel. Print de terceiro → modo **base-de-layout** (estrutura e espaçamento sim; logos, fotos e copy substituídos por placeholders neutros) — declarado no report. Sem resposta, não construa.
- Artefatos em `./pixelsmith/` (`reference/`, `assets/`, `shots/`, `section-map.json`, `report.md`). No modo in-project, fora de `src/` e no `.gitignore` do projeto.

### Fase 1 — Ler o print
Siga `read-the-print-playbook.md`: mapa de seções medido com crops
(`crop-region.mjs`) e perfil de bandas, cores por amostragem, fonte por
specimen, inventário de assets (recortar do arquivo ORIGINAL vs. reproduzir em
CSS), copy verbatim. **Gate:** apresente o `section-map.json` resumido e
confirme com o usuário antes de construir.

### Fase 2 — Construir
- **standalone:** `recreate-playbook.md` → `site/` (HTML + CSS vanilla, sem build, sem CDN, sem motion). Use `impeccable`/`frontend-design` se disponíveis, sem alterar medidas.
- **in-project:** `in-project-playbook.md` → `detect-stack.mjs` → tokens do projeto primeiro → componente no idioma do projeto → rota-harness `pixelsmith-harness`. Framework não reconhecido → cai para standalone com aviso.

### Fase 3 — Validar
Siga `validate-playbook.md`:
```bash
node <skill-dir>/scripts/serve.mjs site/ --port 4321          # standalone
node <skill-dir>/scripts/screenshot-diff.mjs pixelsmith/shots/desk-1.png pixelsmith/reference/desk@1x.png --out pixelsmith/shots/diff-desk-1.png
node <skill-dir>/scripts/band-diff.mjs pixelsmith/shots/desk-1.png pixelsmith/reference/desk@1x.png --band 50
```
Loop drift-first até **≥ 90%** por viewport ou **platô** (3 iterações com ganho < 0,5%). Nunca número fixo de iterações. In-project: remova a rota-harness ao final (salvo pedido).

### Fase 4 — Report
`pixelsmith/report.md`: modo + gate de origem, escala/crop, score por viewport, tabela de iterações, drift por seção (±6px), mapa de editabilidade, arquivos tocados (in-project), **"Não reproduzido"**. **Nunca 100%.**

## Scripts

| Comando | Output |
|---|---|
| `node <skill-dir>/scripts/inspect-image.mjs <png> [--bands 40] [--top 8]` | JSON: `width, height, suggestedScale, scaleReason, palette[], bands[]` |
| `node <skill-dir>/scripts/normalize-image.mjs <in> --out <png> [--scale S] [--crop x,y,w,h]` | PNG @1x (converte JPG/HEIC/WebP via `sips` no macOS; crop antes do downscale) |
| `node <skill-dir>/scripts/crop-region.mjs <png> --box x,y,w,h --out <png>` | recorte exato (px do arquivo de origem) |
| `node <skill-dir>/scripts/band-diff.mjs A.png B.png [--band 50] [--threshold 15]` | JSON: `bands[]`, `firstDriftBand`, `worst[]` |
| `node <skill-dir>/scripts/detect-stack.mjs [dir]` | JSON: `framework, router, typescript, styling[], componentsDir[], tokenFiles[], packageManager, devCommand` |
| `node <skill-dir>/scripts/serve.mjs DIR --port 4321 [--spa]` | servidor estático local |
| `node <skill-dir>/scripts/screenshot-diff.mjs A.png B.png --out diff.png` | JSON `{ scorePct, mismatched, total }` + imagem de diff |

## Uso

```
implementa esse print (imagem anexa) como site
screenshot to code: <imagem>  — desk + mobile
faz esse print virar um componente aqui no projeto
```

## Boundaries
- Não clona URL viva (mirrorsmith) nem lê Figma (figsmith); a entrada é imagem.
- Não gera imagens por IA para assets ocultos: recorta do print ou reproduz em CSS; o que não dá, declara.
- Não aceita vídeo/gravação de tela.
- Não reproduz motion: um print é estático; animação seria invenção.
- Print de terceiro sem confirmação de origem → não constrói; com confirmação → só base de layout.
- Nunca reporta 100%: score medido é o que o diff disse; gap é listado.
```

- [ ] **Step 2: README.md (PT-BR)**

```markdown
# pixelsmith

**Transforma um print de interface em código front-end fiel — com fidelidade medida e relatório honesto de gaps.**

Manda a imagem de uma UI (screenshot, export, foto de tela) e recebe ou um **site estático** (HTML + CSS vanilla) servindo local, ou um **componente escrito dentro do seu projeto** (Next, Vite+React, Vue, Svelte, Astro; Tailwind, CSS Modules ou vanilla) — nos dois casos com um número dizendo o quão fiel ficou e a lista do que não deu para reproduzir.

Terceira irmã da família: [mirrorsmith](https://github.com/eduardodotai/mirrorsmith) parte de uma URL viva, [figsmith](https://github.com/eduardodotai/figsmith) de um arquivo Figma, **pixelsmith** de um pixel.

## Instalação

```bash
git clone https://github.com/eduardodotai/pixelsmith.git ~/projects/pixelsmith-skill
~/projects/pixelsmith-skill/pixelsmith/scripts/install.sh   # npm install + symlink em ~/.claude/skills/pixelsmith
```

Requisitos: Node ≥ 20, Claude Code com o MCP chrome-devtools. Conversão de JPG/HEIC/WebP usa o `sips` do macOS; em outros sistemas, converta para PNG antes.

## Uso

```
implementa esse print como site            → modo standalone (site/ + serve local)
faz esse print virar um componente aqui    → modo in-project (detecta o stack, reaproveita tokens)
screenshot to code: desk + mobile          → dois prints, fit-zoom entre eles
```

Gates com você: escala do print (retina?), origem (seu/cliente ou terceiro → só base de layout), confirmação do mapa de seções medido antes de construir.

## O que sai

- `site/` (standalone) ou `<components>/<Nome>.tsx` + tokens novos no arquivo de tokens do projeto (in-project)
- `pixelsmith/report.md`: score por viewport, tabela de iterações (prova do platô), drift por seção, mapa de editabilidade, **"Não reproduzido"**
- Nunca 100%.

## Arquitetura

Skill única: `SKILL.md` (espinha de 5 fases) + 4 playbooks em `references/` + scripts Node puros em `scripts/` (só `pixelmatch` e `pngjs`; `serve` e `screenshot-diff` vendorados da figsmith). Testes com `node --test` sobre um fixture sintético de verdade conhecida (`tests/`).

```bash
node --test pixelsmith/scripts/*.test.mjs pixelsmith/scripts/lib/*.test.mjs tests/*.test.mjs
```

## Licença

MIT
```

- [ ] **Step 3: Instalar live e verificar registro**

```bash
pixelsmith/scripts/install.sh
ls -la ~/.claude/skills/pixelsmith
node ~/.claude/skills/pixelsmith/scripts/inspect-image.mjs tests/fixtures/synthetic/synthetic-desk.png --bands 4 | head -5
```

Expected: symlink `~/.claude/skills/pixelsmith → /Users/eduardosantos/projects/pixelsmith-skill/pixelsmith`; o CLI via symlink imprime JSON (prova do guard robusto a symlink). Registro na sessão: a skill `pixelsmith` aparece na lista de skills disponíveis (verificar no report da task).

- [ ] **Step 4: Suíte completa + commit**

Run: `node --test pixelsmith/scripts/*.test.mjs pixelsmith/scripts/lib/*.test.mjs tests/*.test.mjs` — Expected: PASS, 0 falhas.

```bash
git add pixelsmith/SKILL.md README.md
git commit -m "docs: SKILL.md (espinha de 5 fases) e README; skill instalada via symlink

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 11: Smoke ponta a ponta com o fixture sintético (controller)

**Files:**
- Create (temporário, fora do repo): `/private/tmp/…/scratchpad/pixelsmith-smoke/` com `site/` e `pixelsmith/`
- Modify: `README.md` (badge de testes + parágrafo "Smoke" com o score real)

**Interfaces:**
- Consumes: skill instalada (Task 10), chrome-devtools MCP.
- Produces: score real do smoke registrado no README e no report da task.

- [ ] **Step 1: Rodar a skill de verdade no fixture**

No diretório de smoke, com `tests/fixtures/synthetic/synthetic-desk@2x.png` como "print": invocar a skill `pixelsmith` ("implementa esse print como site"). O controller responde aos gates: escala 2 (sugerida), origem própria, confirma o mapa. Expectativa: a skill roda `inspect` → `normalize --scale 2` → mapa com 4 seções (header 0/80, hero 80/520, cards 600/640, footer 1240/360) e 1 asset (`hero-photo` 800,160,520,360 @1x) → `site/` → serve → screenshot 1440 → diff.

- [ ] **Step 2: Verificar o score**

Expected: `scorePct ≥ 95` na primeira ou segunda iteração — o fixture é chapado e a verdade é conhecida; abaixo disso é bug de captura/escala/crop, não de design. `band-diff` sem `firstDriftBand` acima de 15%.

- [ ] **Step 3: Registrar no README e commitar**

Adicionar ao README, na seção "O que sai", uma linha: `Smoke no fixture sintético (1440×1600, verdade conhecida): **NN,NN%** em K iterações — qualquer valor abaixo de 95% indica bug de captura, não de design.` com os números reais.

```bash
git add README.md
git commit -m "docs: score real do smoke ponta a ponta no fixture sintético

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 12: Review final + skill-forge-review + Garimpo

**Files:**
- Modify: o que o review apontar; ficha `Repos/screenshot-to-code.md` e INDEX do Garimpo.

- [ ] **Step 1: Review final do diff completo** (superpowers:requesting-code-review, escopo `7e0b5c7..HEAD`). Fix wave única para o que for confirmado.

- [ ] **Step 2: `skill-forge-review` sobre `pixelsmith/`** — registrar o score e aplicar só as recomendações que não contradigam a spec (a spec governa; divergências adjudicadas no report).

- [ ] **Step 3: Checks do controller**
```bash
node --test pixelsmith/scripts/*.test.mjs pixelsmith/scripts/lib/*.test.mjs tests/*.test.mjs
grep -rn "100%" pixelsmith/SKILL.md pixelsmith/references README.md   # só pode aparecer em frases "nunca 100%"
ls -la ~/.claude/skills/pixelsmith
git status --short   # limpo
```

- [ ] **Step 4: Garimpo** — na ficha `Repos/screenshot-to-code.md`: Log `2026-09-XX — virou skill própria pixelsmith (github.com/eduardodotai/pixelsmith), status em-uso`; criar ficha `Skills-Prompts/pixelsmith.md` (tipo skill, status em-uso, conexões com screenshot-to-code, emilkowalski-skills/apple-design e as skills irmãs) e linha no INDEX; commit + push do Garimpo.

- [ ] **Step 5: Push final** `git push` e conferir `git log origin/main --oneline | head -3`.

---

## Self-review (feito ao escrever)

- **Cobertura da spec:** Intake (Task 10 SKILL.md + Task 4/5 scripts) ✓ · Ler o print (Task 9 playbook + Tasks 4/6) ✓ · standalone (Task 9 recreate) ✓ · in-project (Task 8 + Task 9 in-project) ✓ · Validar (Tasks 1/7 + Task 9 validate) ✓ · Report (Task 9 validate §5 + SKILL.md Fase 4) ✓ · Tratamento de erros (conversão fora do macOS Task 5; framework nulo Task 8/9; dev server 60s Task 9 in-project §4; colisão de harness §4; origem sem confirmação SKILL.md) ✓ · Testes + fixture (Tasks 2–8, 3) ✓ · Critérios de sucesso 1–5 (Tasks 10, 11, 12) ✓ · Fora de escopo respeitado (sem motion, sem eval harness, sem README EN) ✓.
- **Placeholders:** nenhum "TBD/TODO"; todo script tem código completo; playbooks completos.
- **Consistência de nomes:** `inspectImage/suggestScale`, `normalizeImage/defaultConvert`, `cropRegion`, `bandDiff`, `detectStack`, `lib/png` (`readPng, writePng, createPng, fillRect, crop, downscaleBox, palette, bandProfile, toHex`), `lib/cli` (`isCliInvocation, getFlag, positionals, parseBox, fail`) — usados com os mesmos nomes em todas as tasks. Flags de CLI (`--out --scale --crop --box --band --threshold --bands --top`) idênticas entre scripts, playbooks e SKILL.md.
