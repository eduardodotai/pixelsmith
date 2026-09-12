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
- `references/in-project-playbook.md` — stack, tokens do projeto primeiro, idioma do componente, rota-harness `_pixelsmith`, limpeza. A Fase 2 in-project segue ele.
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
- **in-project:** `in-project-playbook.md` → `detect-stack.mjs` → tokens do projeto primeiro → componente no idioma do projeto → rota-harness `_pixelsmith`. Framework não reconhecido → cai para standalone com aviso.

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
