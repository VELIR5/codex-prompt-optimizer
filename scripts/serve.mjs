import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../src/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

/**
 * Map a request URL to a file inside rootDir, or null when the path is malformed
 * or escapes the root (e.g. `/..%5Cpackage.json` or `/%2e%2e%2fpackage.json`).
 */
export function resolveRequestPath(url, rootDir = ROOT) {
  const base = resolve(rootDir);
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(url ?? '/', 'http://localhost').pathname);
  } catch {
    return null;
  }
  if (pathname.includes('\0')) return null;
  const relative = pathname === '/' ? 'panel.html' : pathname.replace(/^[/\\]+/, '');
  const file = resolve(base, relative);
  return file.startsWith(base + sep) ? file : null;
}

export function startServer(port = Number(process.env.PORT ?? 4173)) {
  return createServer(async (request, response) => {
    const file = resolveRequestPath(request.url);
    if (!file) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  }).listen(port, '127.0.0.1', () => console.log(`Prompt Lens listening on http://127.0.0.1:${port}`));
}

const isMain = process.argv[1]
  && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isMain) startServer();
