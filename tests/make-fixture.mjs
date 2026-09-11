import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createPng, fillRect, writePng } from '../pixelsmith/scripts/lib/png.mjs';
import { isCliInvocation } from '../pixelsmith/scripts/lib/cli.mjs';

// Verdade conhecida do "print" sintético. Tudo em px @1x.
export const TRUTH = {
  width: 1440,
  height: 1600,
  chromeHeight: 90,
  colors: {
    bg: '#ffffff', header: '#111827', hero: '#f3f4f6', photo: '#2563eb', accent: '#f59e0b',
    card: '#e5e7eb', cardTitle: '#374151', footer: '#1f2937', chrome: '#d1d5db',
  },
  sections: [
    { name: 'header', y: 0, h: 80 },
    { name: 'hero', y: 80, h: 520 },
    { name: 'cards', y: 600, h: 640 },
    { name: 'footer', y: 1240, h: 360 },
  ],
  assets: [{ name: 'hero-photo', x: 800, y: 160, w: 520, h: 360 }],
  elements: {
    heroTitleBar: { x: 120, y: 200, w: 520, h: 48 },
    heroCta: { x: 120, y: 420, w: 200, h: 56 },
    cards: [
      { x: 120, y: 680, w: 360, h: 480 }, { x: 540, y: 680, w: 360, h: 480 }, { x: 960, y: 680, w: 360, h: 480 },
    ],
    cardTitleBar: { dx: 24, dy: 24, w: 200, h: 24 },
  },
};

const rgb = (hex) => [...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)), 255];

export function drawFixture(scale = 1) {
  const T = TRUTH, C = T.colors, s = scale;
  const png = createPng(T.width * s, T.height * s, rgb(C.bg));
  const rect = (x, y, w, h, hex) => fillRect(png, x * s, y * s, w * s, h * s, rgb(hex));
  for (const sec of T.sections) {
    const color = { header: C.header, hero: C.hero, cards: C.bg, footer: C.footer }[sec.name];
    rect(0, sec.y, T.width, sec.h, color);
  }
  const E = T.elements;
  rect(E.heroTitleBar.x, E.heroTitleBar.y, E.heroTitleBar.w, E.heroTitleBar.h, C.header);
  rect(E.heroCta.x, E.heroCta.y, E.heroCta.w, E.heroCta.h, C.accent);
  const a = T.assets[0];
  rect(a.x, a.y, a.w, a.h, C.photo);
  for (const c of E.cards) {
    rect(c.x, c.y, c.w, c.h, C.card);
    rect(c.x + E.cardTitleBar.dx, c.y + E.cardTitleBar.dy, E.cardTitleBar.w, E.cardTitleBar.h, C.cardTitle);
  }
  return png;
}

export function drawWithChrome() {
  const T = TRUTH;
  const base = drawFixture(1);
  const png = createPng(T.width, T.height + T.chromeHeight, rgb(T.colors.chrome));
  png.data.set(base.data, T.chromeHeight * T.width * 4);
  return png;
}

export function writeFixtures(dir) {
  mkdirSync(dir, { recursive: true });
  writePng(join(dir, 'synthetic-desk.png'), drawFixture(1));
  writePng(join(dir, 'synthetic-desk@2x.png'), drawFixture(2));
  writePng(join(dir, 'synthetic-desk-chrome.png'), drawWithChrome());
  writeFileSync(join(dir, 'ground-truth.json'), JSON.stringify(TRUTH, null, 2) + '\n');
}

if (isCliInvocation(import.meta.url)) {
  const dir = process.argv[2] || 'tests/fixtures/synthetic';
  writeFixtures(dir);
  console.log(`fixtures escritos em ${dir}`);
}
