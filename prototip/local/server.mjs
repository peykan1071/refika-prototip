import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Store } from './store.mjs';
import { aiStatus, extractPlan } from './ai.mjs';
import { fields, provinces, reportFor, digest, text } from './domain.mjs';
import {
  previewImport,
  previewRows,
  commitPreview,
  workbookBuffer,
} from './imports.mjs';
import { body, json, download, staticFile } from './http.mjs';
import { encryptBackup, decryptBackup } from './backup.mjs';
import { syncSummary, syncStatus } from './sync.mjs';

export async function startLocal({
  dataDir,
  staticDir,
  port = 0,
  env = process.env,
} = {}) {
  const store = new Store(resolve(dataDir, 'refika.sqlite')),
    session = randomBytes(32).toString('hex'),
    aiPreviews = new Map();
  let origin,
    syncing = false;
  const server = createServer(async (req, res) => {
    try {
      if (req.headers.host !== new URL(origin).host)
        return json(res, 403, { error: 'Yerel bağlantı gerekli.' });
      if (req.headers.origin && req.headers.origin !== origin)
        return json(res, 403, { error: 'Bu kaynaktan erişim kabul edilmedi.' });
      if (req.headers['sec-fetch-site'] === 'cross-site')
        return json(res, 403, { error: 'Farklı siteden erişim engellendi.' });
      const url = new URL(req.url, origin),
        path = url.pathname;
      if (!path.startsWith('/api/')) {
        if (req.method !== 'GET')
          return json(res, 405, { error: 'Geçersiz yöntem.' });
        return staticFile(
          res,
          staticDir,
          path,
          path === '/'
            ? {
                'Set-Cookie': `refika_session=${session}; HttpOnly; SameSite=Strict; Path=/`,
              }
            : {},
        );
      }
      const cookies = String(req.headers.cookie || '')
        .split(';')
        .map((v) => v.trim());
      if (!cookies.includes(`refika_session=${session}`))
        return json(res, 401, { error: 'REFİKA penceresini yeniden açın.' });
      if (
        req.method === 'POST' &&
        (!String(req.headers['content-type']).startsWith('application/json') ||
          req.headers.origin !== origin)
      )
        return json(res, 403, { error: 'Geçersiz işlem kaynağı.' });
      if (path === '/api/state' && req.method === 'GET')
        return json(res, 200, {
          ...store.state(),
          provinces,
          ai: aiStatus(env),
          center: syncStatus(env),
          shareSummary: store.meta('shareSummary') === true,
        });
      if (path === '/api/setup' && req.method === 'POST') {
        store.setup(await body(req));
        return json(res, 200, { ok: true });
      }
      if (!store.meta('settings'))
        return json(res, 409, { error: 'Önce il çalışma alanını kurun.' });
      if (path === '/api/import/preview' && req.method === 'POST') {
        const result = await previewImport(store, await body(req));
        return json(res, 200, result);
      }
      if (path === '/api/import/commit' && req.method === 'POST') {
        const input = await body(req);
        let preview;
        if (input.aiSession) {
          const cached = aiPreviews.get(input.aiSession);
          if (!cached || cached.expires < Date.now())
            throw new Error('AI önizlemesinin süresi doldu.');
          preview = previewRows(store, cached.input);
        } else preview = await previewImport(store, input);
        const result = commitPreview(store, preview, input);
        if (input.aiSession) aiPreviews.delete(input.aiSession);
        return json(res, 200, result);
      }
      if (path === '/api/ai/plan' && req.method === 'POST') {
        const input = await body(req),
          activities = await extractPlan(input, env);
        const headers = fields.plan.map(([key]) => key),
          rows = activities.map((a) => headers.map((k) => a[k])),
          mapping = Object.fromEntries(headers.map((k, i) => [k, i]));
        const source = {
          kind: 'plan',
          headers,
          rows,
          mapping,
          name: 'AI plan taslağı',
          sourceHash: digest(text(input.document, 30000)),
        };
        const aiSession = randomBytes(24).toString('hex');
        for (const [key, value] of aiPreviews)
          if (value.expires < Date.now()) aiPreviews.delete(key);
        if (aiPreviews.size >= 10)
          aiPreviews.delete(aiPreviews.keys().next().value);
        aiPreviews.set(aiSession, {
          input: source,
          expires: Date.now() + 30 * 60000,
        });
        return json(res, 200, {
          ...previewRows(store, source),
          aiSession,
          quotes: activities.map((a) => a.sourceQuote),
        });
      }
      if (path === '/api/activities' && req.method === 'POST')
        return json(res, 200, store.saveActivity(await body(req)));
      if (path.startsWith('/api/records/') && req.method === 'POST')
        return json(
          res,
          200,
          store.reviewRecord(path.split('/').pop(), await body(req)),
        );
      if (path === '/api/files' && req.method === 'POST') {
        const input = await body(req, 15 * 1024 * 1024);
        if (typeof input.data !== 'string') throw new Error('Dosya okunamadı.');
        return json(
          res,
          200,
          store.addFile(
            input.activityId,
            input.name,
            Buffer.from(input.data, 'base64'),
          ),
        );
      }
      if (path.startsWith('/api/files/') && req.method === 'GET') {
        const file = store.file(path.split('/').pop());
        if (!file) return json(res, 404, { error: 'Dosya bulunamadı.' });
        return download(res, file.name, Buffer.from(file.body));
      }
      if (path === '/api/template' && req.method === 'GET') {
        const kind = url.searchParams.get('kind');
        if (!fields[kind]) throw new Error('Şablon türünü seçin.');
        return download(
          res,
          `REFIKA-${kind}-sablon.xlsx`,
          await workbookBuffer(
            fields[kind].map(([, label]) => label),
            [],
          ),
        );
      }
      if (path === '/api/export/records' && req.method === 'GET') {
        const records = store
          .list('records')
          .filter((r) => r.status === 'ready');
        return download(
          res,
          'REFIKA-incelenen-kayitlar.xlsx',
          await workbookBuffer(
            [...fields.records.map(([, label]) => label), 'İnceleme notu'],
            records.map((r) => [
              ...fields.records.map(([key]) =>
                key === 'province' ? provinces[Number(r[key]) - 1] : r[key],
              ),
              r.note,
            ]),
          ),
        );
      }
      if (path === '/api/report' && req.method === 'GET') {
        const report = reportFor(
          store.state(),
          url.searchParams.get('from'),
          url.searchParams.get('to'),
        );
        if (url.searchParams.get('format') === 'xlsx')
          return download(
            res,
            'REFIKA-faaliyet-raporu.xlsx',
            await workbookBuffer(
              [
                'Faaliyet',
                'Tür',
                'Gerçekleşme tarihi',
                'Katılım',
                'Sonuç',
                'Kanıt',
              ],
              report.completed.map((a) => [
                a.title,
                a.kind,
                a.actualDate,
                a.actualParticipants,
                a.result,
                a.evidence,
              ]),
            ),
          );
        if (url.searchParams.get('format') === 'txt')
          return download(
            res,
            'REFIKA-faaliyet-raporu.txt',
            Buffer.from('\uFEFF' + report.text),
            'text/plain; charset=utf-8',
          );
        return json(res, 200, report);
      }
      if (path === '/api/backup' && req.method === 'POST') {
        const input = await body(req);
        return download(
          res,
          `REFIKA-${new Date().toISOString().slice(0, 10)}.refika`,
          encryptBackup(store.exportArchive(), input.password),
        );
      }
      if (path === '/api/restore' && req.method === 'POST') {
        const input = await body(req, 80 * 1024 * 1024);
        if (input.replace !== true || typeof input.data !== 'string')
          throw new Error('Mevcut kayıtların değiştirileceğini onaylayın.');
        store.restoreArchive(
          decryptBackup(Buffer.from(input.data, 'base64'), input.password),
          input.province,
        );
        return json(res, 200, { ok: true });
      }
      if (path === '/api/sharing' && req.method === 'POST') {
        const input = await body(req);
        store.setMeta('shareSummary', input.enabled === true);
        return json(res, 200, { ok: true });
      }
      if (path === '/api/sync' && req.method === 'POST') {
        if (syncing) return json(res, 409, { error: 'Aktarım sürüyor.' });
        syncing = true;
        try {
          return json(res, 200, await syncSummary(store, env));
        } finally {
          syncing = false;
        }
      }
      return json(res, 404, { error: 'İşlem bulunamadı.' });
    } catch (error) {
      if (!res.headersSent)
        json(res, 400, { error: error.message || 'İşlem tamamlanamadı.' });
      else res.end();
    }
  });
  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', accept);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  const timer = setInterval(async () => {
    if (
      syncing ||
      !syncStatus(env).configured ||
      !store.meta('settings') ||
      !store.meta('shareSummary') ||
      store.meta('sync')?.revision === (store.meta('revision') || 0)
    )
      return;
    syncing = true;
    try {
      await syncSummary(store, env);
    } catch (e) {
      store.setMeta('sync', { ...store.meta('sync'), error: e.message });
    } finally {
      syncing = false;
    }
  }, 60000);
  timer.unref();
  return {
    url: origin,
    store,
    close: () =>
      new Promise((accept) => {
        clearInterval(timer);
        server.close(() => {
          store.close();
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
  const service = await startLocal({
    dataDir: process.env.REFIKA_DATA_DIR || resolve('.local-data'),
    staticDir: resolve('local-dist'),
    port: Number(process.env.PORT) || 4317,
  });
  console.log(`REFIKA_LOCAL_URL=${service.url}`);
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, async () => {
      await service.close();
      process.exit(0);
    });
}
