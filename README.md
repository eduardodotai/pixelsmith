<div align="center">

**🇧🇷 Português** · [🇺🇸 English](README.en.md)

![pixelsmith](assets/cover.png)

# pixelsmith

**Transforma um print de interface em código front-end fiel — com fidelidade medida e relatório honesto de gaps.**

Manda a imagem de uma UI (screenshot, export de ferramenta de design, foto de tela) e recebe ou um **site estático** (HTML + CSS vanilla) servindo local, ou um **componente escrito dentro do seu projeto** (Next, Vite+React, Vue, Svelte, Astro, Nuxt; Tailwind, CSS Modules ou vanilla) — nos dois casos com um **score perceptual de fidelidade** + a lista honesta do que _não_ deu pra reproduzir. Terceira irmã da família: [mirrorsmith](https://github.com/eduardodotai/mirrorsmith) parte de uma URL viva, [figsmith](https://github.com/eduardodotai/figsmith) de um arquivo Figma, **pixelsmith** de um pixel.

[![License: MIT](https://img.shields.io/badge/license-MIT-amber.svg)](./LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-skill-orange.svg)](https://docs.claude.com/en/docs/claude-code/skills)
[![Chrome DevTools MCP](https://img.shields.io/badge/requires-Chrome%20DevTools%20MCP-teal.svg)](https://github.com/anthropics/claude-code/blob/main/docs/mcp.md)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933.svg)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/tests-52%2F52-brightgreen.svg)](#-arquitetura)
[![PT-BR](https://img.shields.io/badge/docs-PT--BR-green.svg)](#)

</div>

---

## ⚡ O que faz

Você tem uma interface que só existe como **imagem** — print de referência, export de um design perdido, foto da tela de um cliente — e precisa dela **funcionando como código**, não como figura. Manda:

```
implementa esse print como site            (imagem anexa)
faz esse print virar um componente aqui no projeto
```

E recebe código servindo local (ou um componente no idioma do seu projeto), com um número dizendo o quão fiel ele é:

> _"Print de 2880×3200 — sugeri escala 2x e você confirmou; referência normalizada para 1440×1600. Mapa de seções medido com perfil de 1px: header 0/80, hero 80/520, cards 600/640, footer 1240/360; 8 cores por amostragem; 1 asset recortado do arquivo original. Construí `site/` com tokens, seções comentadas com as medidas e o asset. Fidelidade medida: **100,00%** em 1 iteração — caso degenerado (fixture chapado, sem texto), então o número mede o pipeline, não o design. Não exercitado: specimen de fonte, ruído JPEG, mobile."_

Não é "IA que chuta um layout". É **ler o print medindo → construir → validar com diff → relatório honesto**. Nunca arredonda o score nem declara fidelidade total.

## 🎭 Dois modos

| Modo | Quando | Saída |
|------|--------|-------|
| **standalone** | Não há projeto, ou você quer um site/seção isolado | `site/` — `index.html` + `css/tokens.css` + `css/sections.css` (medidas em comentário) + `assets/`, sem build, sem CDN, sem motion |
| **in-project** | O cwd tem um framework reconhecido e você pede "no projeto / esse componente" | Componente no idioma do projeto (TSX, SFC, `.astro`, `.svelte`), **tokens do projeto primeiro**, rota-harness temporária `pixelsmith-harness` para medir, removida ao final |

Framework fora da lista → cai para standalone com aviso e entrega o CSS como referência para portar.

## 🎯 Por que vale a pena

Transformar print em código costuma cair em dois extremos:

❌ **"Screenshot to code" genérico** — cospe Tailwind a olho, cores chutadas, nenhuma medida; ninguém sabe o quão longe ficou  
❌ **Recriar no olho** — cada altura, gutter e hex vira interpretação, e o resultado "parece igual" até você sobrepor

**Aqui é diferente** — o diferencial é **medir em vez de olhar + honestidade medida**:

- 📏 **Tudo é medido, nada é estimado** — escala retina detectada e confirmada; fronteiras de seção por perfil de luminância de **1 px por banda**; caixas no eixo x verificadas por crop + paleta (encolhe 1px → monocromático; expande 2px → o fundo aparece); cores por amostragem de pixel, nunca de memória
- ✂️ **Assets vêm do próprio print** — fotos, ilustrações e logos são **recortados do arquivo original** (resolução máxima); gradientes, sombras e ícones simples são reproduzidos em CSS; nada de gerar imagem por IA
- 📊 **Fidelidade é um número, não uma alegação** — screenshot do resultado vs. referência @1x, diff perceptual (`pixelmatch`) → **% por viewport** + heatmap; área não sobreposta conta como mismatch total
- 📉 **Loop drift-first** — `band-diff` acha a faixa de y onde a divergência *começa*; corrige a causa, re-mede; para em ≥90% ou platô objetivo (3 iterações <0,5%)
- 🧩 **Tokens do projeto primeiro** (in-project) — cada cor do print procura um token existente (ΔRGB ≤ 24) antes de criar um novo; e como o diff não enxerga Δ dessa ordem, toda substituição vai numa **tabela de desvios invisíveis ao diff** no report
- 🔊 **Nunca silencioso** — flag inválida, fator maior que a imagem, `sips` que não converte, diretório inexistente: tudo falha alto com mensagem em PT-BR e exit 1

## 🛠 Como funciona (o pipeline)

```
print ──► 0 Intake ──► 1 Ler o print ──► 2 Construir ──► 3 Validar ──► 4 Report
           escala        mapa medido       standalone      diff % por      fidelidade +
           origem        cores/assets      ou in-project   viewport        gaps honestos
```

| # | Fase | O que faz | Ferramenta |
|---|------|-----------|------------|
| 0 | **Intake** | Dimensões + escala sugerida (você confirma); crop de chrome/status bar; modo; **gate de origem** | `inspect-image` · `normalize-image` |
| 1 | **Ler o print** | Mapa de seções com medidas (perfil de bandas + crops), cores por amostragem, fonte por specimen de glifos, inventário de assets, copy verbatim. **Você confirma o mapa** antes de construir | `inspect-image` · `crop-region` |
| 2 | **Construir** | standalone: `site/` com tokens e seções comentadas · in-project: `detect-stack` → tokens do projeto → componente no idioma do projeto → rota-harness | `detect-stack` · playbooks |
| 3 | **Validar** | Screenshot na largura exata (preflight de `scrollWidth`/dpr), diff vs. referência @1x, drift-first até ≥90% ou platô; harness removida | `serve` · `screenshot-diff` · `band-diff` |
| 4 | **Report** | Score por viewport, iterações, drift por seção, **desvios de cor invisíveis ao diff**, mapa de editabilidade, arquivos tocados, **"Não reproduzido"** | — |

## 📊 Prova — smokes ponta a ponta

A skill foi exercitada de verdade, pela própria skill instalada, num **fixture sintético de verdade conhecida** (1440×1600 desenhado por script, @1x e @2x, com `ground-truth.json` de caixas e cores):

| Smoke | Resultado |
|-------|-----------|
| **standalone** (print @2x) | Escala 2 detectada; mapa inferido às cegas bateu o ground truth em 8/8 cores, 4/4 seções, 8/8 caixas, 1/1 asset (±0px); **100,00%** em 1 iteração, screenshot byte-idêntico à referência; controle negativo: 98,61% com 4px de shift, 3,75% com imagem errada |
| **in-project** (worktree de um projeto Next 16 app router + TS + CSS vanilla) | `detect-stack` → `next/app`; 4 tokens do projeto reaproveitados (Δ0–24) + 4 novos declarados; componente TSX; harness criada, medida e removida; **100,00%** em 1 iteração |

O fixture é chapado e sem texto: **100% aqui mede o pipeline de captura e diff, não o design.** Qualquer valor abaixo de 95% nele indica bug de captura. Num print real com tipografia, fotos e JPEG, o score cai e os gaps aparecem no relatório — é para isso que ele existe. Cada armadilha desses smokes virou instrução operacional nos playbooks (16 achados incorporados).

## 🧱 Arquitetura

Skill única (mesma espinha para os dois modos; só a fase Construir tem branch). Scripts **puros e testados** (`node --test` → 52/52) sobre um núcleo `lib/png.mjs` (pngjs) — zero dependência nativa.

```
pixelsmith/               SKILL.md (espinha fases 0-4) + scripts/ + references/
tests/                    make-fixture.mjs + fixtures/synthetic/ (verdade conhecida)
docs/                     spec e plano (spec → plano → TDD → review por task → review final)
```

| Script | Papel |
|--------|-------|
| `lib/png.mjs` | ler/escrever PNG (cria pastas), crop, downscale box, paleta (5 bits, média real do bucket), perfil de luminância por faixa |
| `lib/cli.mjs` | guard de CLI robusto a symlink, flags, `getNumber` (nunca NaN silencioso), `parseBox`, `fail` |
| `inspect-image.mjs` | dimensões, **escala sugerida** (tabela de larguras de dispositivos + heurística), paleta dominante, perfil por bandas (até 1 px) |
| `normalize-image.mjs` | JPG/HEIC/WebP → PNG via `sips` (macOS), crop de chrome, downscale @2x/@3x → @1x |
| `crop-region.mjs` | recorte exato de assets do arquivo original |
| `band-diff.mjs` | mismatch por faixa de y + `firstDriftBand` — o motor do loop drift-first |
| `detect-stack.mjs` | framework, router, TS, estilização, pastas de componentes (inclui `componentes/`), arquivos de tokens, gerenciador de pacotes, comando dev — só leitura de fs |
| `serve.mjs` · `screenshot-diff.mjs` | Server local + diff perceptual com penalidade honesta de dimensão _(vendorados da figsmith ← mirrorsmith)_ |

| Playbook | Cobre |
|----------|-------|
| `read-the-print-playbook` | Escala e crops, mapa de seções por perfil de 1 px, eixo x por crop + paleta, cores por amostragem, fonte por glifo, recortar vs. reproduzir, copy verbatim |
| `recreate-playbook` | Estrutura do `site/`, layout sem altura fixa em conteúdo, assets, fit-zoom entre dois prints |
| `in-project-playbook` | Stack, tokens do projeto primeiro, idioma do componente, harness por framework (com `role="region"`), middleware, limpeza |
| `validate-playbook` | Preflight de captura (`emulate`, `scrollWidth`, dpr, overlay do `next dev`), diff @1x, drift-first, platô, ruídos de print, report |

## 🚀 Como instalar

```bash
git clone https://github.com/eduardodotai/pixelsmith.git
cd pixelsmith
bash pixelsmith/scripts/install.sh    # npm install + symlink → ~/.claude/skills/pixelsmith
```

Reinicia o Claude Code. Pronto — anexa um print e manda `implementa esse print`.

> O install usa **symlink**, então o clone precisa ficar onde está (atualizar = `git pull`, sem reinstalar). Alvo alternativo: `bash pixelsmith/scripts/install.sh /caminho/custom`. Os testes (`tests/`) vivem no repo, não no symlink.

## 📋 Requisitos

- [Claude Code](https://claude.ai/code) CLI ou extensão IDE
- [Chrome DevTools MCP](https://github.com/anthropics/claude-code/blob/main/docs/mcp.md) — **obrigatório** (screenshots da validação)
- **Node ≥ 20** e **npm** (scripts em ESM; testes via `node --test`)
- **macOS** para converter JPG/HEIC/WebP automaticamente (`sips`); em outros sistemas, converta para PNG antes

## 🎮 Como usar

```bash
# Site estático a partir de um print (anexe a imagem)
implementa esse print como site

# Componente dentro do projeto atual (Next, Vite+React, Vue, Svelte, Astro, Nuxt)
faz esse print virar um componente aqui no projeto

# Dois prints (desk + mobile) → fit-zoom entre as larguras
screenshot to code: desk + mobile
```

**Gates com você:** escala do print (retina?) · origem (seu/cliente → reprodução fiel; de terceiro → só base de layout, sem logos, fotos e copy) · confirmação do mapa de seções medido.

**Auto-dispara** em: _"screenshot to code"_, _"implementa esse print"_, _"transforma essa imagem em código/site/componente"_, _"faz igual a esse print"_, ou uma imagem de UI anexada com intenção de construir.

**Fronteiras** (o que ela _não_ é): clonar site vivo → [mirrorsmith](https://github.com/eduardodotai/mirrorsmith) · ler Figma → [figsmith](https://github.com/eduardodotai/figsmith) · extrair só tokens → [site-identity-snapshot](https://github.com/eduardodotai/site-identity-snapshot) · vídeo, geração de imagem por IA, motion → fora de escopo (declarado).

## 🔬 Como a fidelidade é medida

1. **Referência**: o print normalizado para **@1x** (`normalize-image --scale S`, crop de chrome antes do downscale) — toda medida do pipeline é em px @1x.
2. **Captura**: viewport na largura exata via `emulate` (dpr 1), preflight de `scrollWidth`/`devicePixelRatio`, overlay do `next dev` removido; standalone full-page, in-project o `div` do harness.
3. **Diff perceptual** com `pixelmatch` → `%` por viewport + heatmap; área não sobreposta conta como mismatch total (**penalidade honesta de dimensão**).
4. **Loop drift-first**: `band-diff` aponta a faixa onde o desvio *começa*; corrige a causa, não o sintoma. Para em **≥90%** ou platô (3 iterações <0,5%).
5. **O que o diff não vê é declarado**: threshold 0.1 é cego a Δ pequenos de cor — substituições por token e arredondamentos vão numa tabela própria do report, com ΔRGB e área.
6. **Regra de honestidade (dura):** nunca arredonda nem declara fidelidade total; um 100% só aparece com a explicação do caso degenerado e a lista do que não foi exercitado.

## 🧪 O que reproduz vs. reporta como gap

**Reproduz medindo:** estrutura e ordem por fronteiras medidas, colunas e caixas verificadas por crop, cores amostradas, copy verbatim com ênfases, assets recortados do original, tokens do projeto reaproveitados (in-project).

**Reporta como gap honesto:** fonte não identificada (substituta por evidência de glifo, gap declarado), artefatos JPEG e antialiasing de fonte, conteúdo dinâmico (relógio, badge, avatar), foto de tela com blur/moiré (score indicativo), assets com borda de contexto, print de terceiro em modo base-de-layout (o score mede layout, não conteúdo).

## ⚖️ Ética & licença

Use só com prints que você tem direito de implementar. A skill tem **gate de origem** na Fase 0: material seu ou de cliente é reproduzido fielmente; referência de terceiro vira **base de layout** — estrutura e espaçamento sim, logos, fotos e copy substituídos por placeholders neutros e declarados no report. Sem confirmação de origem, não constrói. Código sob [MIT](./LICENSE); os fixtures são sintéticos, sem material de cliente.

## 🗺 Status & roadmap

- ✅ Pipeline completo (fases 0-4), dois modos — **7 scripts, 52/52 testes**, zero dependência nativa
- ✅ **Smokes reais pela skill instalada** — standalone e in-project (Next 16) a 100,00% no fixture sintético, com controle negativo
- ✅ **16 achados dos smokes** incorporados aos playbooks (escala, prefixo de harness roteável, harness acessível, preflight de captura, desvios de cor invisíveis ao diff)
- ✅ Review final + `skill-forge-review` 96/100
- 🔭 Próximo: **1º print real** com tipografia e fotos (specimen de fonte, JPEG, mobile) · `compatibility` no frontmatter · gate "MCP indisponível" · `inspect-image --axis x` · port pro Codex (via `skill-forge-convert`)

## 🔗 Skills relacionadas

- 🪞 [**mirrorsmith**](https://github.com/eduardodotai/mirrorsmith) — espelha/recria **sites vivos** a partir da URL, com a mesma filosofia de fidelidade medida
- 🎨 [**figsmith**](https://github.com/eduardodotai/figsmith) — recria a partir do **arquivo Figma**; a pixelsmith vendoriza o `serve` e o `screenshot-diff` dela
- 🎨 [**site-identity-snapshot**](https://github.com/eduardodotai/site-identity-snapshot) — captura a identidade visual de um site (tokens, guia, assets)
- 🧩 [**patterns-audit**](https://github.com/eduardodotai/patterns-audit) — audit multi-agent de SOLID/DRY/GoF/code smells

---

<div align="center">

_Construído com disciplina: spec → plano → TDD → review por task → smokes reais → review final._ · **Measure, don't eyeball. Report honestly.**

</div>
