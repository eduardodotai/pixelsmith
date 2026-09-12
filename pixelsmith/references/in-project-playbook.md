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

Para cada cor do `pixelsmith/section-map.json`:
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
