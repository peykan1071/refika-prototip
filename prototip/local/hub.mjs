import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { timingSafeEqual, createHash } from 'node:crypto';
import { provinces, digest, provinceCode } from './domain.mjs';
import { body, json } from './http.mjs';
const sameKey = (a, b) =>
  typeof a === 'string' &&
  typeof b === 'string' &&
  timingSafeEqual(
    createHash('sha256').update(a).digest(),
    createHash('sha256').update(b).digest(),
  );
export async function startHub({
  database,
  port = 0,
  host = '127.0.0.1',
  adminKey,
  clients,
  uiPath,
} = {}) {
  if (
    typeof adminKey !== 'string' ||
    adminKey.length < 32 ||
    !clients ||
    !Object.keys(clients).length ||
    Object.entries(clients).some(
      ([key, province]) => key.length < 32 || !provinceCode(province),
    )
  )
    throw new Error(
      'Merkez için güçlü yönetici anahtarı ve illere atanmış ayrı bağlantı anahtarları gerekli.',
    );
  if (database !== ':memory:')
    mkdirSync(dirname(database), { recursive: true });
  const db = new DatabaseSync(database);
  db.exec(
    'PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS snapshots(province TEXT,year TEXT,version INTEGER,hash TEXT,body TEXT,received_at TEXT,PRIMARY KEY(province,year));',
  );
  const html = readFileSync(
    uiPath || fileURLToPath(new URL('./hub.html', import.meta.url)),
  );
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://hub'),
        token = req.headers.authorization?.replace(/^Bearer /, '');
      if (req.headers.origin)
        return json(res, 403, {
          error: 'Tarayıcıdan farklı kaynağa erişim kapalı.',
        });
      if (url.pathname === '/' && req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
          'Content-Security-Policy':
            "default-src 'none'; script-src 'sha256-PLACEHOLDER'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'".replace(
              'sha256-PLACEHOLDER',
              'sha256-' +
                createHash('sha256')
                  .update(
                    html.toString().match(/<script>([\s\S]*?)<\/script>/)[1],
                  )
                  .digest('base64'),
            ),
        });
        return res.end(html);
      }
      if (url.pathname === '/api/overview' && req.method === 'GET') {
        if (!sameKey(token, adminKey))
          return json(res, 401, {
            error: 'Merkez yönetici anahtarı geçersiz.',
          });
        const rows = db
          .prepare('SELECT * FROM snapshots ORDER BY province,year DESC')
          .all()
          .map((r) => ({
            ...JSON.parse(r.body),
            version: r.version,
            receivedAt: r.received_at,
          }));
        return json(res, 200, { provinces, rows });
      }
      if (url.pathname === '/api/snapshots' && req.method === 'POST') {
        const client = Object.entries(clients).find(([key]) =>
          sameKey(token, key),
        );
        if (!client)
          return json(res, 401, { error: 'İl bağlantı anahtarı geçersiz.' });
        const { snapshot, baseVersion } = await body(req, 16000),
          province = provinceCode(client[1]);
        if (!snapshot || snapshot.province !== province)
          return json(res, 403, { error: 'Anahtar bu ile ait değil.' });
        const fields = [
          'revision',
          'planned',
          'completed',
          'participations',
          'review',
          'ready',
          'resolved',
        ];
        if (
          !/^20\d{2}–20\d{2}$/.test(snapshot.year) ||
          !Number.isSafeInteger(baseVersion) ||
          baseVersion < 0 ||
          fields.some(
            (f) => !Number.isSafeInteger(snapshot[f]) || snapshot[f] < 0,
          )
        )
          return json(res, 400, { error: 'Özet alanları geçersiz.' });
        const clean = {
          province,
          year: snapshot.year,
          ...Object.fromEntries(fields.map((f) => [f, snapshot[f]])),
        };
        const old = db
            .prepare('SELECT * FROM snapshots WHERE province=? AND year=?')
            .get(province, clean.year),
          hash = digest(clean);
        if (old?.hash === hash)
          return json(res, 200, {
            version: old.version,
            receivedAt: old.received_at,
          });
        if ((old?.version || 0) !== baseVersion)
          return json(res, 409, { error: 'Sürüm çakışması.' });
        const version = (old?.version || 0) + 1,
          receivedAt = new Date().toISOString();
        db.prepare(
          'INSERT INTO snapshots VALUES (?,?,?,?,?,?) ON CONFLICT(province,year) DO UPDATE SET version=excluded.version,hash=excluded.hash,body=excluded.body,received_at=excluded.received_at',
        ).run(
          province,
          clean.year,
          version,
          hash,
          JSON.stringify(clean),
          receivedAt,
        );
        return json(res, 200, { version, receivedAt });
      }
      json(res, 404, { error: 'Bulunamadı.' });
    } catch (e) {
      json(res, 400, { error: e.message });
    }
  });
  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(port, host, accept);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((accept) => {
        server.close(() => {
          db.close();
          accept();
        });
        server.closeIdleConnections();
      }),
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const service = await startHub({
    database: resolve(
      process.env.REFIKA_HUB_DATA_DIR || '.hub-data',
      'center.sqlite',
    ),
    port: Number(process.env.PORT) || 4320,
    host: process.env.REFIKA_HUB_HOST || '127.0.0.1',
    adminKey: process.env.REFIKA_HUB_ADMIN_KEY,
    clients: JSON.parse(process.env.REFIKA_HUB_CLIENTS || '{}'),
  });
  console.log(`REFIKA_HUB_URL=${service.url}`);
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, async () => {
      await service.close();
      process.exit(0);
    });
}
