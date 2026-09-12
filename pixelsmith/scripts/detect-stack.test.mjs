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

test('diretório inexistente lança', () => {
  assert.throws(() => detectStack('/nao/existe/xyz'), /diretório inexistente/);
});

test('hasRootVars reconhece :root com seletores combinados e sem vars', () => {
  const combo = project({
    'package.json': { dependencies: { next: '15.0.0' } },
    'app/globals.css': ':root, .dark {\n  --bg: #000;\n}',
  });
  assert.deepEqual(detectStack(combo).tokenFiles, [{ path: 'app/globals.css', hasRootVars: true }]);
  const attr = project({
    'package.json': { dependencies: { next: '15.0.0' } },
    'app/globals.css': ':root[data-theme="dark"] { --bg: #000; }',
  });
  assert.equal(detectStack(attr).tokenFiles[0].hasRootVars, true);
  const none = project({
    'package.json': { dependencies: { next: '15.0.0' } },
    'app/globals.css': ':root { color: red; }',
  });
  assert.equal(detectStack(none).tokenFiles[0].hasRootVars, false);
});
