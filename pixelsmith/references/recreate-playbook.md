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
