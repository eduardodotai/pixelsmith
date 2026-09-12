# Playbook — Ler o print (sem se enganar)

Um print não tem árvore. Tudo que a figsmith lê do `figma-tree.json` aqui
precisa ser MEDIDO na imagem. Regra de ouro: **nunca estime de olho o que dá
para medir com um crop.**

## 1. Escala primeiro, sempre

`inspect-image.mjs` sugere a escala (`suggestedScale` + `scaleReason`). Confirme
com o usuário em 1 pergunta ("esse print é de tela retina? sugestão: 2x"). Toda
medida abaixo é em **px @1x** — a referência de validação é
`pixelsmith/reference/desk@1x.png` gerada por `normalize-image.mjs --scale S`.

Sinais de retina que o script não vê: texto muito nítido em fonte pequena,
ícones de 32px+ que "parecem" 16px, largura 2560+ com layout que claramente é
1280.

**Regra de unidade para crops:** todo crop de MEDIÇÃO (fronteiras de seção, colunas, cores, glifos) usa `pixelsmith/reference/desk@1x.png` como entrada do `crop-region.mjs` — as caixas ficam em @1x sem conversão. Só a EXTRAÇÃO DE ASSETS (seção 6) usa o arquivo ORIGINAL, com a caixa @1x multiplicada por S (`boxFile = box1x × S`), para manter a resolução.

## 2. Tire o que não é interface

Chrome do browser (barra de URL, abas), barra de status do celular, dock,
cursor, scrollbar, notificações. Meça a altura da faixa no arquivo ORIGINAL e
recorte no `normalize-image.mjs --crop x,y,w,h` (crop é em px do arquivo, antes
do downscale). Sem isso o score de validação compara UI com chrome e o drift
começa no pixel 0.

## 3. Mapa de seções — o "absoluteBoundingBox" do print

1. `inspect-image.mjs --bands 40`: o perfil `bands[].lum/variance` mostra onde
   o fundo muda (salto de luminância) e onde há conteúdo denso (variância alta).
   Para a fronteira EXATA, rode de novo sobre a referência @1x com `--bands <altura da imagem>` (1 px por banda) e filtre as linhas onde `lum` ou `variance` mudam — isso dá o y exato sem ler a olho e cabe na tolerância de ±4px.
2. Para cada fronteira candidata, `crop-region.mjs` (sobre `pixelsmith/reference/desk@1x.png`) de uma faixa de 60px em
   torno dela e olhe a imagem só para CONFIRMAR visualmente a fronteira que o perfil de 1px apontou — o y vem do perfil, não do olho.
3. Escreva `pixelsmith/section-map.json`:
   ```json
   { "scale": 2, "width": 1440,
     "sections": [ { "name": "hero", "top": 80, "height": 520, "bg": "#f3f4f6",
       "columns": { "count": 2, "gutter": 40, "contentLeft": 120, "contentRight": 1320 } } ],
     "font": { "family": "Inter", "evidence": "specimen 2026-09-11", "fallback": true },
     "assets": [ { "name": "hero-photo", "box1x": [800,160,520,360], "boxFile": [1600,320,1040,720] } ] }
   ```
4. Colunas, gutters e caixas de elementos (eixo x): não leia a olho. Padrão que fecha em ±0px só com os scripts existentes: `crop-region.mjs` na caixa candidata (sobre a referência @1x) → `inspect-image.mjs --top 3`. A caixa está certa quando o recorte ENCOLHIDO em 1px devolve paleta 100% monocromática (ou só as cores internas esperadas) e o recorte EXPANDIDO em 2px traz a cor do fundo junto. Ajuste x/w até satisfazer os dois; registre a caixa.

Tolerância de medida: ±4px @1x. Anote a medida, não o "aproximadamente".

## 4. Cores por amostragem, nunca por memória

- `palette` do inspect dá os fundos e as cores dominantes.
- Para cor de texto, acento, borda: crop (sobre a referência @1x) de 8×8px numa área CHAPADA do
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

Desempate por PAPEL no layout, não por conteúdo de pixel: se a caixa é o lugar de uma imagem (foto, ilustração, avatar, logo), recorte-a mesmo que o print mostre um placeholder chapado — é o que estará certo quando a imagem real entrar.

Nunca recorte o print inteiro e embede como imagem: o objetivo é código.

## 7. Copy verbatim

Transcreva exatamente, com maiúsculas, pontuação e quebras de linha do print.
Ênfases (negrito, cor, sublinhado) viram `<span>`/`<strong>`. Texto ilegível
por resolução → marque `[ilegível]` e pergunte ao usuário em vez de inventar.
Modo base-de-layout (print de terceiro): copy substituída por texto neutro de
comprimento equivalente (mesmo número de linhas), declarado no report.

## 8. Gate de saída

Apresente o `pixelsmith/section-map.json` resumido em 1 mensagem (seções + medidas +
fonte + assets) e peça confirmação. Só então construa.
