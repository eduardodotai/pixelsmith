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
- Nunca arredonda: o score é o que o diff mediu, e o gap é sempre listado.
- Smoke no fixture sintético (1440×1600, verdade conhecida): **100,00%** em 1 iteração — qualquer valor abaixo de 95% indica bug de captura, não de design (fixture chapado, sem texto: mede o pipeline de captura e diff, não o design).

## Arquitetura

Skill única: `SKILL.md` (espinha de 5 fases) + 4 playbooks em `references/` + scripts Node puros em `scripts/` (só `pixelmatch` e `pngjs`; `serve` e `screenshot-diff` vendorados da figsmith). Testes com `node --test` sobre um fixture sintético de verdade conhecida (`tests/`).

```bash
node --test pixelsmith/scripts/*.test.mjs pixelsmith/scripts/lib/*.test.mjs tests/*.test.mjs
```

## Licença

MIT
