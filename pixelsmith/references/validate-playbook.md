# Playbook — Validate (diff perceptual, drift-first, platô, report)

Ferramentas: `serve.mjs` (standalone) ou o dev server (in-project),
screenshot via chrome-devtools MCP, `screenshot-diff.mjs` (score),
`band-diff.mjs` (onde o drift começa).

## 1. Captura

- Viewport na largura EXATA da referência @1x (`pixelsmith/reference/desk@1x.png`).
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
- In-project: lista de arquivos criados/alterados no projeto; tokens novos; harness
  removido ou mantido.
- **"Não reproduzido"**: cada gap com causa e impacto estimado.

**Nunca declare 100%.** O número é o que o diff mediu; gap é listado, não
maquiado.
