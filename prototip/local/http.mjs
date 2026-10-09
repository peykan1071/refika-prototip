import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
export async function body(req, max = 12 * 1024 * 1024) {
  if (Number(req.headers['content-length']) > max)
    throw new Error('İstek boyutu sınırı aşıyor.');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw new Error('İstek boyutu sınırı aşıyor.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('İstek okunamadı.');
  }
}
export function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(data));
}
export function download(
  res,
  filename,
  buffer,
  type = 'application/octet-stream',
) {
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(buffer);
}
export async function staticFile(res, root, pathname, headers = {}) {
  const path = resolve(
    root,
    '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname),
  );
  if (path !== resolve(root) && !path.startsWith(resolve(root) + sep)) {
    json(res, 404, { error: 'Bulunamadı.' });
    return;
  }
  try {
    const buffer = await readFile(path);
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
    };
    res.writeHead(200, {
      'Content-Type': types[extname(path)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'",
      ...headers,
    });
    res.end(buffer);
  } catch {
    json(res, 404, { error: 'Arayüz bulunamadı. Önce yerel sürümü derleyin.' });
  }
}
