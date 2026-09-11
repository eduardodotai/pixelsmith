import { pathToFileURL } from 'node:url';
// Vendored from figsmith (github.com/eduardodotai/figsmith, itself vendored from mirrorsmith) on 2026-09-11; keep API stable.
import http from 'node:http';
import { createReadStream, statSync, realpathSync } from 'node:fs';
import { join, normalize, extname, resolve } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm',
  '.bin': 'application/octet-stream',
};

function safeJoin(rootDir, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const p = normalize(join(rootDir, decoded));
  if (!p.startsWith(resolve(rootDir))) return null; // traversal guard
  return p;
}

export function createServer(rootDir, { spa = false } = {}) {
  const root = resolve(rootDir);
  return http.createServer((req, res) => {
    let filePath = safeJoin(root, req.url === '/' ? '/index.html' : req.url);
    if (!filePath) { res.writeHead(403); return res.end('forbidden'); }
    let st;
    try {
      st = statSync(filePath);
      if (st.isDirectory()) { filePath = join(filePath, 'index.html'); st = statSync(filePath); }
    } catch {
      if (spa) {
        filePath = join(root, 'index.html');
        try { st = statSync(filePath); } catch { res.writeHead(404); return res.end('not found'); }
      } else { res.writeHead(404); return res.end('not found'); }
    }
    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d+)-(\d*)/.exec(range);
      const start = Number(m[1]);
      const end = m[2] ? Number(m[2]) : st.size - 1;
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${st.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
      });
      return createReadStream(filePath, { start, end }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
    createReadStream(filePath).pipe(res);
  });
}

export function startServer(rootDir, { port = 4321, spa = false } = {}) {
  const server = createServer(rootDir, { spa });
  return new Promise((res) =>
    server.listen(port, () =>
      res({ server, port: server.address().port, url: `http://localhost:${server.address().port}` })
    )
  );
}

// CLI

// Guard de CLI robusto a symlinks: import.meta.url é o realpath do módulo,
// mas argv[1] mantém o caminho simbólico (ex.: ~/.claude/skills/figsmith) —
// comparar sem resolver fazia o bloco CLI nunca rodar (exit 0 silencioso).
function isCliInvocation(moduleUrl) {
  if (!process.argv[1]) return false;
  try { return moduleUrl === pathToFileURL(realpathSync(process.argv[1])).href; }
  catch { return false; }
}

if (isCliInvocation(import.meta.url)) {
  const dir = process.argv[2] || '.';
  const spa = process.argv.includes('--spa');
  const portArg = process.argv.indexOf('--port');
  const port = portArg > -1 ? Number(process.argv[portArg + 1]) : 4321;
  startServer(dir, { port, spa }).then(({ url }) => console.log(`serving ${dir} at ${url} (spa=${spa})`));
}
