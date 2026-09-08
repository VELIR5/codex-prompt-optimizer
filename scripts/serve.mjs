import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const root = new URL('../src/', import.meta.url);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
createServer(async (request, response) => {
  const path = normalize(request.url === '/' ? 'panel.html' : request.url).replace(/^[/\\]+/, '');
  try { const body = await readFile(new URL(path, root)); response.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream' }); response.end(body); }
  catch { response.writeHead(404); response.end('Not found'); }
}).listen(Number(process.env.PORT ?? 4173), '127.0.0.1', () => console.log('Prompt Lens listening on http://127.0.0.1:4173'));
