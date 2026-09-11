import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

export function readPng(path) { return PNG.sync.read(readFileSync(path)); }
export function writePng(path, png) { writeFileSync(path, PNG.sync.write(png)); }

export function toHex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

export function createPng(width, height, rgba = [255, 255, 255, 255]) {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) png.data.set(rgba, i * 4);
  return png;
}

export function fillRect(png, x, y, w, h, rgba) {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(png.width, x + w), y1 = Math.min(png.height, y + h);
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) png.data.set(rgba, (png.width * yy + xx) * 4);
  return png;
}

export function crop(png, { x, y, w, h }) {
  if (!(w > 0 && h > 0) || x < 0 || y < 0 || x + w > png.width || y + h > png.height) {
    throw new RangeError(`caixa ${x},${y},${w},${h} fora da imagem ${png.width}×${png.height}`);
  }
  const out = new PNG({ width: w, height: h });
  for (let yy = 0; yy < h; yy++) {
    const src = ((y + yy) * png.width + x) * 4;
    out.data.set(png.data.subarray(src, src + w * 4), yy * w * 4);
  }
  return out;
}

// Box filter: cada pixel de saída é a média de um bloco factor×factor. Blocos parciais são descartados (floor).
export function downscaleBox(png, factor) {
  if (!Number.isInteger(factor) || factor < 1) throw new RangeError(`fator inválido: ${factor}`);
  if (factor === 1) return png;
  const w = Math.floor(png.width / factor), h = Math.floor(png.height / factor);
  const out = new PNG({ width: w, height: h });
  const n = factor * factor;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let dy = 0; dy < factor; dy++) for (let dx = 0; dx < factor; dx++) {
      const s = ((y * factor + dy) * png.width + (x * factor + dx)) * 4;
      r += png.data[s]; g += png.data[s + 1]; b += png.data[s + 2]; a += png.data[s + 3];
    }
    const d = (y * w + x) * 4;
    out.data[d] = Math.round(r / n); out.data[d + 1] = Math.round(g / n);
    out.data[d + 2] = Math.round(b / n); out.data[d + 3] = Math.round(a / n);
  }
  return out;
}

// Quantiza a 5 bits por canal, agrega por bucket, devolve top-N com a cor MÉDIA real do bucket.
export function palette(png, { top = 8, step = 1 } = {}) {
  const buckets = new Map();
  let sampled = 0;
  for (let y = 0; y < png.height; y += step) for (let x = 0; x < png.width; x += step) {
    const i = (y * png.width + x) * 4;
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    const key = ((r & 0xf8) << 16) | ((g & 0xf8) << 8) | (b & 0xf8);
    let e = buckets.get(key);
    if (!e) { e = { n: 0, r: 0, g: 0, b: 0 }; buckets.set(key, e); }
    e.n++; e.r += r; e.g += g; e.b += b; sampled++;
  }
  return [...buckets.values()]
    .sort((p, q) => q.n - p.n)
    .slice(0, top)
    .map((e) => ({ hex: toHex(e.r / e.n, e.g / e.n, e.b / e.n), pct: Math.round((e.n / sampled) * 10000) / 100 }));
}

// Luminância média (Rec.601) e variância por faixa horizontal. Serve para achar fronteiras de seção.
export function bandProfile(png, { bands = 40 } = {}) {
  const size = Math.max(1, Math.floor(png.height / bands));
  const out = [];
  for (let b = 0; b < bands && b * size < png.height; b++) {
    const y0 = b * size;
    const y1 = b === bands - 1 ? png.height : Math.min(png.height, y0 + size);
    let sum = 0, sumSq = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const l = 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
      sum += l; sumSq += l * l; n++;
    }
    const mean = sum / n;
    out.push({ y0, y1, lum: Math.round(mean * 10) / 10, variance: Math.round((sumSq / n - mean * mean) * 10) / 10 });
  }
  return out;
}
