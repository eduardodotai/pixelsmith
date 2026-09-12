# Skill `pixelsmith` — Design

**Data:** 2026-09-11
**Status:** aprovado em brainstorming
**Repo:** https://github.com/eduardodotai/pixelsmith (público; fixtures são sintéticos, sem material de cliente)
**Pasta local:** `/Users/eduardosantos/projects/pixelsmith-skill`
**Origem:** ficha `Repos/screenshot-to-code.md` do Garimpo (reel @nick_saraev, 04/09/2026) — decisão de 11/09: skill própria em vez de rodar o app `abi/screenshot-to-code`.

## Objetivo

Transformar **um print (imagem) de interface** em código front-end fiel, com
fidelidade perceptual **medida** e report honesto — o terceiro input da família:
`mirrorsmith` parte de uma URL viva, `figsmith` de um arquivo Figma, `pixelsmith`
de um **pixel** (screenshot, foto de tela, export de referência), quando não há
acesso nem ao site nem ao design.

Dois modos de saída:

- **standalone** — site/seção estático (HTML + CSS vanilla) servido localmente,
  mesma estrutura de saída da figsmith.
- **in-project** — componente escrito no idioma do projeto atual (Next, Vite+React,
  Vue, Svelte, Astro; Tailwind, CSS Modules ou vanilla), reaproveitando os tokens
  que o projeto já tem, validado numa rota-harness temporária.

O que vale roubar do app original (`abi/screenshot-to-code`): o loop
*criar → fotografar o resultado → editar até bater com o print* e a ideia de
**extrair assets reais do print** (recorte) em vez de gerar placeholders.
O que NÃO se copia: backend, chat UI, geração de imagem por IA.

## Decisões tomadas (brainstorming)

| Decisão | Escolha | Racional |
|---|---|---|
| Nome | **pixelsmith** | Família figsmith/mirrorsmith (input: Figma / URL / pixel). Gatilhos "screenshot to code", "implementa esse print" vivem na description. |
| Escopo v1 | **standalone + in-project** | "Implementar print no front" quase sempre significa *dentro de um projeto existente*; o standalone é o caso puro e o fallback do in-project. |
| Stack standalone | **HTML + CSS vanilla**, sem build, sem CDN | Roda offline, diff determinístico, mesma estrutura editável da figsmith (tokens.css / sections.css / responsive.css). |
| Motion | **Fora da v1** | Um print é estático; motion seria invenção. Sem GSAP. |
| Arquitetura | **Skill única** (`pixelsmith/` = SKILL.md + scripts/ + references/) | Dois modos, mas mesma espinha (Intake → Ler → Construir → Validar → Report); só a fase Construir tem branch. Sub-skills seriam burocracia. |
| serve / screenshot-diff | **Vendorados** da figsmith (que já os vendorou da mirrorsmith), API mantida | Repo standalone; quem instala não precisa das irmãs. |
| Processamento de imagem | **Só pngjs + pixelmatch** (deps já da família) + `sips` do macOS para converter JPG/HEIC/WebP → PNG | Zero dependência nativa nova (sem sharp/canvas). Fora do macOS a conversão falha com instrução clara; PNG passa sempre. |
| Assets do print | **Recorte do próprio print** (`crop-region.mjs`) para fotos/ilustrações/logos; o que é reproduzível em CSS (gradientes, sombras, ícones simples) é reproduzido | Fidelidade sem depender de geração de imagem. |
| Eval harness | **Fora da v1**; fixture sintético só para testes unitários | YAGNI: ainda não há eval-set real. O fixture sintético já dá verdade conhecida aos scripts. |
| Gate de origem | Print próprio/cliente → reprodução fiel. Print de terceiro → **base de layout**: estrutura, grid e espaçamento sim; logos, fotos e copy não | Mesma ética das irmãs, adaptada ao caso "referência de concorrente" que motivou a captura. |

## Estrutura do repo

```
pixelsmith/                        # a skill (instalável em ~/.claude/skills/pixelsmith)
  SKILL.md                         # espinha: fases 0-4 + gates + tabela de scripts
  package.json                     # {"type":"module", deps: pixelmatch ^6, pngjs ^7}
  scripts/
    lib/png.mjs (+ .test.mjs)      # ler/escrever PNG, crop, downscale (box filter), paleta, perfil por faixa — núcleo compartilhado
    inspect-image.mjs (+ .test)    # dimensões, escala sugerida, paleta dominante, perfil de luminância por faixa de y
    normalize-image.mjs (+ .test)  # JPG/HEIC/WebP → PNG (sips), crop opcional (tira chrome do browser), downscale @2x/@3x → @1x
    crop-region.mjs (+ .test)      # recorta assets do print por caixa x,y,w,h (px do arquivo de origem)
    band-diff.mjs (+ .test)        # mismatch por faixa de y entre duas PNGs — motor do loop drift-first
    detect-stack.mjs (+ .test)     # framework, router, estilização, pasta de componentes, arquivos de tokens, gerenciador de pacotes, comando dev
    serve.mjs (+ .test)            # vendorado (figsmith ← mirrorsmith)
    screenshot-diff.mjs (+ .test)  # vendorado (figsmith ← mirrorsmith) — penalidade de dimensão
    install.sh                     # npm install --omit=dev + symlink em ~/.claude/skills/pixelsmith
  references/
    read-the-print-playbook.md     # como ler um print sem se enganar (ver abaixo)
    recreate-playbook.md           # saída standalone: estrutura, layout, copy, assets, fontes
    in-project-playbook.md         # detecção de stack, reaproveitamento de tokens, idioma do componente, rota-harness, limpeza
    validate-playbook.md           # diff @1x, band-diff, loop drift-first, platô, ruídos típicos de print, report
tests/
  fixtures/synthetic/              # gerado por make-fixture.mjs: print sintético + ground-truth.json (caixas e cores conhecidas)
  make-fixture.mjs                 # desenha o "print" com pngjs (header, hero, 3 cards) — determinístico, sem browser
docs/
  specs/2026-09-11-pixelsmith-skill-design.md   # este documento
  plans/                           # plano de implementação (writing-plans)
README.md                          # PT-BR: o que é, instalação, uso, exemplo de report
LICENSE                            # MIT
```

## SKILL.md — conteúdo (espinha)

**Frontmatter `description`** com gatilhos: "screenshot to code", "implementa esse print", "transforma essa imagem em código/site/componente", "faz igual a esse print", "pixelsmith", qualquer imagem de UI anexada com intenção de construir. Fronteiras: não clona URL viva (mirrorsmith), não lê Figma (figsmith), não extrai só tokens (site-identity-snapshot), não gera imagens por IA, não aceita vídeo. Requer chrome-devtools MCP.

### Fase 0 — Intake
- Coleta as imagens: 1 print obrigatório (desk OU componente), print mobile opcional. Aceita PNG/JPG/HEIC/WebP; converte para PNG via `normalize-image.mjs`.
- `inspect-image.mjs` em cada print → dimensões, `suggestedScale` (1/2/3) com a razão. **Confirmar a escala com o usuário** (retina vs. não): todo o pipeline mede em px @1x.
- Se o print inclui chrome do browser, barra de status do celular, cursor ou scrollbar, recortar via `--crop` no normalize (o playbook de leitura diz como identificar).
- **Modo:** in-project quando o cwd tem `package.json` com framework front reconhecido pelo `detect-stack.mjs` E o usuário pede "no projeto / esse componente / nessa página"; caso contrário standalone. Em dúvida, perguntar (1 pergunta).
- **Gate de origem (obrigatório):** print próprio/cliente ou de terceiro? Terceiro → modo base-de-layout (declarado no report: assets e copy substituídos por placeholders neutros, sem logos).
- Cria o diretório de artefatos: `pixelsmith/` no projeto de saída (`reference/`, `assets/`, `shots/`, `report.md`). No modo in-project esse diretório fica fora de `src/` e entra no `.gitignore` do projeto, a não ser que o usuário peça para versionar.

### Fase 1 — Ler o print (`read-the-print-playbook.md`)
- **Mapa de seções com medidas**: `inspect-image.mjs --bands` dá o perfil de luminância/variância por faixa de y; junto com crops (`crop-region.mjs`) o modelo delimita cada seção e anota `top / height / colunas / gutters` em px @1x. Esse mapa é o equivalente do `absoluteBoundingBox` da figsmith e vira comentário no CSS.
- **Cores por amostragem**, nunca por memória: paleta do `inspect-image` + crops de regiões específicas para ler o hex real de fundo/texto/acento.
- **Fonte por evidência de glifo** (mesma técnica da figsmith): crop dos textos, specimen HTML com candidatas nos mesmos tamanhos, comparação servida via HTTP. Fonte não identificada → substituta declarada no report.
- **Inventário de assets**: cada região que é foto/ilustração/logo recebe caixa e vira `assets/<nome>.png` via `crop-region.mjs` (escala aplicada: recorta no arquivo original @2x e mantém a resolução — melhor asset — mas registra a caixa @1x). Ícones simples/gradientes/sombras → CSS.
- **Copy verbatim** transcrita do print; ênfases (negrito, cor) preservadas em `<span>`.
- Gate de saída: `section-map.json` (seções + caixas + cores + fonte escolhida + assets) revisado com o usuário em 1 mensagem curta antes de construir.

### Fase 2 — Construir
**standalone** (`recreate-playbook.md`): `site/index.html` + `css/tokens.css` (paleta do inspect com nomes semânticos) + `css/base.css` + `css/sections.css` (comentário com a medida de cada seção) + `css/responsive.css` (só se houver print mobile) + `assets/`. Flex/grid; absoluto só para decoração. Sem JS, exceto o fit-zoom da figsmith quando há dois prints. Usa `impeccable`/`frontend-design` se disponíveis, sem violar as medidas (fidelidade ganha de estética).

**in-project** (`in-project-playbook.md`):
1. `detect-stack.mjs` → `stack.json`. Framework não suportado → cai para standalone e entrega o CSS como referência, dizendo isso no report.
2. **Tokens do projeto primeiro**: cores/tipografia/espaçamento existentes (tailwind.config, `:root` do globals.css, theme.ts) são mapeados às cores lidas do print; só cria token novo quando não há equivalente próximo (ΔE alto — o playbook define a tolerância), e declara os novos no report.
3. Componente no idioma do projeto: TSX se o projeto é TS, classes Tailwind se é Tailwind, CSS Module se é CSS Module; props para o que é conteúdo (copy, imagens); assets copiados para a pasta pública/assets convencional do projeto.
4. **Rota-harness** temporária que renderiza o componente na largura exata do print, sem layout global (sem header/sidebar do app): receitas por framework no playbook (Next app router `app/pixelsmith-harness/<slug>/page.tsx`, pages router `pages/pixelsmith-harness-<slug>.tsx`, Vite `pixelsmith-harness.html` + entry, Astro `src/pages/pixelsmith-harness-<slug>.astro`, SvelteKit `src/routes/pixelsmith-harness-<slug>/+page.svelte`, Nuxt `pages/pixelsmith-harness-<slug>.vue`). Se o dev server não está rodando, sobe com o `devCommand` detectado (em background) e avisa.
5. Ao final: remove a rota-harness (a menos que o usuário peça para manter) e lista no report cada arquivo criado/alterado no projeto.

### Fase 3 — Validar (`validate-playbook.md`)
- Serve (`serve.mjs` no standalone; dev server no in-project). Screenshot via chrome-devtools na largura exata do print @1x, full-page no standalone, do container do componente no harness.
- `screenshot-diff.mjs shot.png reference/desk@1x.png` → score. `band-diff.mjs` → onde o drift **começa**. Loop drift-first: corrige a primeira faixa que diverge, re-mede. Para em **≥ 90%** por viewport ou **platô** (3 iterações seguidas com ganho < 0,5%). Nunca número fixo de iterações.
- Ruídos específicos de print, declarados e não "consertados": artefatos JPEG, antialiasing de fonte, fonte substituta, conteúdo dinâmico (relógio, badge, avatar), leve blur de foto de tela, assets recortados com bordas do contexto.

### Fase 4 — Report (`report.md`)
Score final por viewport, tabela de iterações (prova do platô), tabela de drift por seção (tolerância ±6px), modo usado, gate de origem aplicado, **mapa de editabilidade** (onde trocar copy, cores, imagens), arquivos tocados (in-project), seção **"Não reproduzido"**. **Nunca 100%.**

## Contratos dos scripts

Convenções da família: ESM, dual-mode (função exportada + bloco CLI guardado por `isCliInvocation` robusto a symlink, como no figsmith após o fix d7009b5), saída JSON no stdout, `process.exitCode = 1` em falha com mensagem clara, nunca silencioso. Rodar **do diretório do projeto de saída** (`node <skill-dir>/scripts/...`).

| Script | Entrada | Saída |
|---|---|---|
| `inspect-image.mjs <png> [--bands N]` | PNG | `{ width, height, suggestedScale, scaleReason, palette:[{hex,pct}], bands:[{y0,y1,lum,variance}] }`. Escala: tabela de larguras conhecidas de dispositivos (iPhone @3x 1170/1179/1290, MacBook @2x 2560/2880/3024/3456…) + regra geral (width ≥ 2400 → 2; retrato com width ≥ 1000 → 3); fora disso → 1. Sempre "sugestão", confirmada no intake. |
| `normalize-image.mjs <in> --out <png> [--scale S] [--crop x,y,w,h]` | PNG/JPG/HEIC/WebP | PNG @1x. Conversão via `sips` (darwin); em outra plataforma, não-PNG → erro instrutivo. Downscale por fator inteiro com box filter (média de S×S). Crop aplicado ANTES do downscale, em px do arquivo original. stdout: `{ out, width, height, scale, cropped }`. |
| `crop-region.mjs <png> --box x,y,w,h --out <png>` | PNG | Recorte exato; caixa fora dos limites → erro. stdout `{ out, width, height }`. |
| `band-diff.mjs <a.png> <b.png> [--band 50] [--threshold 15]` | 2 PNGs | `{ band, bands:[{y0,y1,mismatchPct}], firstDriftBand, worst:[top 5] }`. Bandas comparadas na largura sobreposta; altura extra de uma das imagens conta como mismatch total (mesma honestidade do screenshot-diff). `firstDriftBand` = primeira faixa com mismatch > threshold. |
| `detect-stack.mjs [dir]` | diretório | `{ framework: next\|astro\|sveltekit\|svelte\|nuxt\|vue\|vite-react\|null, router: app\|pages\|null, typescript, styling:[tailwind@3\|tailwind@4\|css-modules\|styled-components\|vanilla], componentsDir:[candidatos], tokenFiles:[...], packageManager, devCommand }`. Só leitura de fs (package.json, configs, existência de pastas). Nada instalado, nada executado. |
| `serve.mjs DIR --port P [--spa]` | pasta | servidor estático (vendorado). |
| `screenshot-diff.mjs A.png B.png --out diff.png` | 2 PNGs | `{ scorePct, mismatched, total, width, height }` (vendorado). |

`lib/png.mjs` concentra: `readPng`, `writePng`, `crop`, `downscaleBox`, `palette` (quantização a 5 bits por canal + agregação, top-N por frequência), `bandProfile` (luminância média e variância por faixa). Tudo puro, testável sem browser.

## Tratamento de erros

- Imagem não-PNG fora do macOS → erro com instrução ("converta para PNG e rode de novo").
- Escala confirmada diferente da sugerida → o intake prevalece; o `scaleReason` vai para o report.
- `detect-stack` sem framework reconhecido → in-project vira standalone com aviso explícito, nunca "inventa" um framework.
- Dev server que não sobe em 60s → parar a validação in-project, reportar, entregar o componente sem score (dizendo que não foi medido).
- Harness que altera rotas públicas (ex.: colisão de slug) → abortar antes de escrever; slug sempre com prefixo `pixelsmith-harness` (nunca `_`: pastas com `_` são privadas no Next app router e ignoradas no Astro).
- Print de terceiro sem confirmação de origem → não construir.

## Testes

- `node --test pixelsmith/scripts/*.test.mjs` (glob explícito — `node --test <dir>` falha neste ambiente, nota herdada da figsmith).
- Fixture sintético (`tests/make-fixture.mjs`): desenha `synthetic-desk.png` (1440×~1600: header 80px, hero 520px com bloco "foto" colorido, faixa de 3 cards, footer) e `synthetic-desk@2x.png` (o mesmo em 2880), mais `ground-truth.json` com caixas e hexes. Testes cobrem: `inspect` (paleta contém os hexes, bandas detectam as fronteiras de seção ±1 banda, escala 2 para o @2x), `normalize` (@2x → dims exatas do @1x; crop remove a faixa do "chrome"), `crop-region` (bytes do recorte == região do original; caixa inválida → erro), `band-diff` (imagem deslocada 40px para baixo → `firstDriftBand` na faixa do deslocamento), `detect-stack` (fixtures de `package.json` + configs em tmpdir para next/app, next/pages, vite-react+tailwind@4, vue, astro, svelte, sem framework).
- `sips` NÃO é chamado nos testes (conversão testada por injeção de `convertImpl`).
- Ponta a ponta com browser fica como **smoke manual pós-instalação**: o próprio fixture sintético é reproduzido em HTML pela skill e diffado — a verdade é conhecida, então o score esperado é alto (≥ 95%) e qualquer valor abaixo indica bug de captura/escala, não de design.

## Critérios de sucesso

1. Skill instalada (symlink) dispara nos gatilhos e completa as 5 fases num print real com intervenção humana só nos gates (escala, origem, mapa de seções).
2. Modo in-project funciona num projeto Next + Tailwind real (ex.: `omni-core`): componente no idioma do projeto, tokens reaproveitados, harness criado e removido, score medido.
3. Todos os scripts com testes passando; zero dependência nativa além de pixelmatch/pngjs; `sips` só em runtime no macOS.
4. Report nunca declara 100% e lista os ruídos de print como gaps, não como falhas.
5. Repo standalone com README PT-BR de instalação e uso.

## Fora de escopo (v1)

Motion/animação; vídeo ou gravação de tela como entrada; geração de imagens por IA para assets ocultos; múltiplas páginas/rotas; eval harness com benchmark (como `figsmith-eval`); README em inglês; porte para Codex/Gemini (`skill-forge-convert`); frameworks fora da lista (Angular, Solid, Qwik) — caem no fallback standalone.

## Revisões

- 2026-09-12 — harness `pixelsmith-harness` (o prefixo `_` era inroteável); paleta 5-bit; enum de frameworks com sveltekit/nuxt (review final).
