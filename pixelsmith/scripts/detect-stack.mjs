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
