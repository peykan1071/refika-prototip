import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Store } from '../store.mjs';
import { digest } from '../domain.mjs';
import { workbookBuffer } from '../imports.mjs';
import { GoogleAuth, GoogleVault, googleFileId } from '../google-auth.mjs';
import { GoogleSync, GoogleSheetsClient } from '../google-sheets.mjs';
import { startLocal } from '../server.mjs';
import {
  previewValidationBatch,
  validationBatchTemplate,
  validationBatches,
  updateValidationBatch,
} from '../validation-batches.mjs';

const fileId = 'TEST-REFIKA-ONLY';
const scope = 'https://www.googleapis.com/auth/drive.file';
const installed = {
  client_id: 'TEST.apps.googleusercontent.com',
  client_secret: 'TEST-NOT-A-REAL-SECRET',
};
const headers = [
  'Ad soyad',
  'Kişi ID',
  'Okul adı',
  'Okul ID',
  'Açıklama',
  'Durum',
];
const row = () => [
  'TEST Kişi',
  'TEST-P1',
  'TEST Okul',
  'TEST-S1',
  'TEST gerekçe',
  'Onaylandı',
];
const profile =
  'https://school-education.ec.europa.eu/en/nso-desktop/registrations/etwinners/123';
const json = (value) =>
  new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json' },
  });
const protectedTestBytes = {
  encrypt: async (b) => Buffer.from(b.toString('base64')),
  decrypt: async (b) => Buffer.from(b.toString(), 'base64'),
};
async function authSetup(t, fetcher) {
  const saved = { value: {} };
  const auth = new GoogleAuth(
    {
      load: async () => saved.value,
      save: async (value) => {
        saved.value = structuredClone(value);
      },
    },
    fetcher ||
      (async () =>
        json({
          access_token: 'TEST-ACCESS',
          refresh_token: 'TEST-REFRESH',
          expires_in: 3600,
          scope,
        })),
  );
  await auth.init();
  await auth.configure({ installed });
  t.after(() => auth.cancel());
  return { auth, saved };
}
function setup(t) {
  const store = new Store(':memory:');
  store.setup({ province: '25', operator: 'TEST', year: '2026–2027' });
  store.saveContacts({
    email: 'test@example.org',
    sheetUrl: `https://docs.google.com/spreadsheets/d/${fileId}/edit`,
    revision: store.meta('revision'),
  });
  t.after(() => store.close());
  const client = {
    rows: [row()],
    output: [],
    outputRows: [],
    writes: 0,
    async read() {
      return {
        sheet: { sheetId: 7, title: 'Gönderilecek Talepler' },
        hash: digest(this.rows),
        input: {
          name: 'TEST.xlsx',
          data: (await workbookBuffer(headers, this.rows)).toString('base64'),
        },
      };
    },
    async metadata() {
      return {
        sheets: [
          { properties: { sheetId: 7, title: 'Gönderilecek Talepler' } },
          ...this.output.map((properties) => ({ properties })),
        ],
      };
    },
    async createResultSheet(_id, title) {
      const p = { sheetId: 8, title };
      this.output.push(p);
      return p;
    },
    async readResultRows() {
      return structuredClone(this.outputRows);
    },
    async appendResults(id, title, rows) {
      assert.equal(id, fileId);
      assert.ok(title.startsWith('REFIKA Sonuçları '));
      this.writes++;
      this.outputRows.push(...structuredClone(rows));
    },
  };
  const sync = new GoogleSync(store, client);
  async function start() {
    const p = await sync.inspect(7, 'person');
    return sync.start({
      sheetId: 7,
      defaultKind: 'person',
      token: p.token,
      confirmed: true,
    });
  }
  return { store, client, sync, start };
}
const select = (rows) => rows.map(({ id, version }) => ({ id, version }));
function sent(store) {
  const batch = validationBatches(store)[0];
  return updateValidationBatch(store, batch.id, 'sent', {
    rows: select(batch.rows),
    happenedAt: '2026-09-01T09:00:00+03:00',
    note: 'TEST gerçek gönderim',
    evidenceUrl: 'https://example.org/sent',
    confirmed: true,
  });
}

void test('Boş kısa şablon önizlenir ve diğer çalışma sayfaları seçilebilir', async (t) => {
  const { store } = setup(t);
  const preview = await previewValidationBatch(store, {
    name: 'TEST.xlsx',
    data: (await validationBatchTemplate('person')).toString('base64'),
  });
  assert.equal(preview.empty, true);
  assert.equal(preview.counts.new, 0);
  assert.ok(preview.headers.length);
  assert.ok(preview.sheets.length);
  assert.equal(store.validation.list().length, 0);
});
void test('OAuth PKCE, yalnız seçilen dosya izni, state kontrolü ve tek kullanımlı callback', async (t) => {
  let tokenBody;
  const { auth } = await authSetup(t, async (url, options) => {
    assert.equal(url, 'https://oauth2.googleapis.com/token');
    tokenBody = options.body;
    return json({
      access_token: 'TEST-ACCESS',
      refresh_token: 'TEST-REFRESH',
      expires_in: 3600,
      scope,
    });
  });
  const result = await auth.authorize(fileId),
    url = new URL(result.url),
    p = auth.pending;
  assert.equal(url.searchParams.get('scope'), scope);
  assert.equal(url.searchParams.get('trigger_onepick'), 'true');
  assert.equal(url.searchParams.get('file_ids'), fileId);
  assert.equal(
    url.searchParams.get('code_challenge'),
    createHash('sha256').update(p.verifier).digest('base64url'),
  );
  await assert.rejects(
    auth.complete(
      new URLSearchParams({
        state: 'WRONG',
        code: 'TEST-CODE',
        picked_file_ids: fileId,
      }),
    ),
    /geçersiz/,
  );
  assert.equal(p.used, undefined);
  const callback = new URL(p.redirect);
  callback.search = new URLSearchParams({
    state: p.state,
    code: 'TEST-CODE',
    picked_file_ids: fileId,
  });
  const response = await fetch(callback);
  assert.equal(response.status, 200);
  assert.equal(auth.status().connected, true);
  assert.equal(tokenBody.get('code_verifier'), p.verifier);
  assert.equal(auth.pending, null);
  assert.equal(JSON.stringify(auth.status()).includes('TEST-ACCESS'), false);
  await assert.rejects(auth.complete(callback.searchParams, p), /geçersiz/);
  await assert.rejects(auth.accessToken('ANOTHER-FILE'), /E-Tablo/);
});
void test('Yanlış dosya seçimi token almaz; token yenileme eşzamanlı tek çağrı yapar', async (t) => {
  let calls = 0;
  const { auth } = await authSetup(t, async () => {
    calls++;
    return json({ access_token: 'TEST-NEW', expires_in: 3600 });
  });
  await auth.authorize(fileId);
  await assert.rejects(
    auth.complete(
      new URLSearchParams({
        state: auth.pending.state,
        code: 'TEST',
        picked_file_ids: 'OTHER',
      }),
    ),
    /seçilmedi/,
  );
  assert.equal(calls, 0);
  auth.data = {
    client: installed,
    fileId,
    tokens: {
      access_token: 'OLD',
      refresh_token: 'TEST-REFRESH',
      expiresAt: 0,
    },
  };
  assert.deepEqual(
    await Promise.all([auth.accessToken(fileId), auth.accessToken(fileId)]),
    ['TEST-NEW', 'TEST-NEW'],
  );
  assert.equal(calls, 1);
  await auth.disconnect();
  assert.equal(auth.status().connected, false);
  assert.equal(auth.status().configured, true);
});
void test('İstemci biçimi ve güvenli saklama hatası bağlantı durumunu yanıltmaz', async (t) => {
  const { auth } = await authSetup(t);
  await assert.rejects(auth.configure({ web: installed }), /Masaüstü/);
  auth.vault.save = async () => {
    throw new Error('disk');
  };
  await assert.rejects(
    auth.configure({
      installed: { ...installed, client_id: 'NEW.apps.googleusercontent.com' },
    }),
    /kaydedilemedi/,
  );
  assert.equal(auth.data.client.client_id, installed.client_id);
  assert.equal(
    googleFileId('https://docs.google.com.evil.test/spreadsheets/d/x/edit'),
    '',
  );
  assert.equal(
    googleFileId('https://user@docs.google.com/spreadsheets/d/x/edit'),
    '',
  );
});
void test(
  'Windows anahtar kasası diske düz metin yazmaz ve yeniden açılır',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'refika-google-vault-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const vault = new GoogleVault(dir);
    await vault.save({ test: 'TEST-SECRET-NOT-LIVE' });
    assert.equal(
      (await readFile(vault.path)).includes(
        Buffer.from('TEST-SECRET-NOT-LIVE'),
      ),
      false,
    );
    assert.deepEqual(await new GoogleVault(dir).load(), {
      test: 'TEST-SECRET-NOT-LIVE',
    });
  },
);
void test('Yeni satırlar bir kez alınır; onay hücresi onay sayılmaz; satır silinmesi geçmişi silmez', async (t) => {
  const { store, client, sync, start } = setup(t);
  await start();
  await sync.synchronize();
  assert.equal(store.validation.list().length, 1);
  assert.equal(store.validation.list()[0].status, 'review');
  assert.equal(
    store.validation
      .events(store.validation.list()[0].id)
      .filter((e) => e.type === 'result').length,
    0,
  );
  client.rows = [];
  await sync.synchronize();
  assert.equal(store.validation.list().length, 1);
  assert.equal(
    JSON.stringify(store.exportArchive()).includes('googleSync'),
    false,
  );
});
void test('Kaynak değişince önizleme yenilenmeden eşitleme başlamaz; hatalı ve mükerrer ilk yükleme reddedilir', async (t) => {
  const { store, client, sync, start } = setup(t);
  const p = await sync.inspect(7, 'person');
  client.rows[0][4] = 'TEST yeni';
  await assert.rejects(
    sync.start({
      sheetId: 7,
      defaultKind: 'person',
      token: p.token,
      confirmed: true,
    }),
    /değişti/,
  );
  client.rows.push(row());
  await assert.rejects(start(), /tekrarlanan/);
  assert.equal(store.validation.list().length, 0);
});
void test('Uzaktaki tek alan değişikliği alınır; farklı yerel alan korunur; aynı alanda çakışma incelemeye düşer', async (t) => {
  const { store, client, sync, start } = setup(t);
  await start();
  let r = store.validation.list()[0];
  store.validation.save({ ...r, email: 'test-local@example.org' });
  client.rows[0][4] = 'TEST uzak açıklama';
  await sync.synchronize();
  r = store.validation.list()[0];
  assert.equal(r.reason, 'TEST uzak açıklama');
  assert.equal(r.email, 'test-local@example.org');
  assert.equal(sync.status().pending.length, 0);
  store.validation.save({ ...r, reason: 'TEST yerel açıklama' });
  client.rows[0][4] = 'TEST ikinci uzak';
  await sync.synchronize();
  let issue = sync.status().pending[0];
  assert.ok(issue);
  assert.equal(store.validation.list()[0].reason, 'TEST yerel açıklama');
  assert.throws(
    () => sync.resolve({ ...issue, version: 0, choice: 'remote' }),
    /yenilendi/,
  );
  sync.resolve({ ...issue, choice: 'local' });
  await sync.synchronize();
  assert.equal(sync.status().pending.length, 0);
  client.rows[0][4] = 'TEST üçüncü uzak';
  await sync.synchronize();
  issue = sync.status().pending[0];
  sync.resolve({ ...issue, choice: 'remote' });
  assert.equal(store.validation.list()[0].reason, 'TEST üçüncü uzak');
});
void test('İlk mevcut kayıt eşleştirmesi sessizce ezmez ve sonuçlanmış kayıtta uzaktaki içerik kabul edilemez', async (t) => {
  const { store, client, sync, start } = setup(t);
  store.validation.save({
    kind: 'person',
    title: 'TEST mevcut',
    status: 'review',
    name: 'TEST Kişi',
    accountId: 'TEST-P1',
    school: 'TEST Okul',
    schoolId: 'TEST-S1',
    reason: 'TEST eski',
    requestedAction: 'TEST incele',
  });
  await start();
  assert.equal(store.validation.list().length, 1);
  assert.equal(sync.status().pending.length, 1);
  sync.resolve({ ...sync.status().pending[0], choice: 'remote' });
  const r = store.validation.list()[0];
  store.validation.put({ ...r, status: 'completed' });
  client.rows[0][4] = 'TEST korunmalı';
  await sync.synchronize();
  const issue = sync.status().pending[0];
  assert.equal(issue.protected, true);
  assert.throws(
    () => sync.resolve({ ...issue, choice: 'remote' }),
    /sonuçlanmış/,
  );
  assert.equal(store.validation.list()[0].reason, 'TEST gerekçe');
});
void test('Duraklatma devam eden okumayı kayda dönüştürmez; eski yedek dönüşü eşitlemeyi durdurur', async (t) => {
  const { store, client, sync, start } = setup(t);
  await start();
  const archive = store.exportArchive();
  const read = client.read.bind(client);
  let release;
  client.read = async () => {
    await new Promise((resolve) => {
      release = resolve;
    });
    return read();
  };
  const flight = sync.synchronize();
  await Promise.resolve();
  sync.pause();
  release();
  await assert.rejects(flight, /duraklatıldı/);
  assert.equal(sync.status().enabled, false);
  assert.equal(store.validation.list().length, 1);
  store.setMeta('googleSync', { ...store.meta('googleSync'), enabled: true });
  store.restoreArchive(archive, '25');
  assert.equal(sync.status().enabled, false);
});
void test('Sonuç aktarımı yalnız bağlı kayıtları kendi sekmesine yazar, tekrar ve başarısız yanıt mükerrer oluşturmaz', async (t) => {
  const { store, client, sync, start } = setup(t);
  await start();
  sent(store);
  const batch = validationBatches(store)[0];
  updateValidationBatch(store, batch.id, 'result', {
    rows: select(batch.rows),
    happenedAt: '2026-09-02T09:00:00+03:00',
    outcome: 'approved',
    note: 'TEST onay maili',
    evidenceUrl: 'https://example.org/result',
    confirmed: true,
  });
  const unrelated = store.validation.save({
    kind: 'person',
    title: 'TEST ilgisiz',
    status: 'review',
    name: 'TEST ilgisiz',
    accountId: 'TEST-P2',
    school: 'TEST okul',
    schoolId: 'TEST-S2',
    reason: 'TEST gerekçe',
    requestedAction: 'TEST incele',
  });
  store.validation.append(unrelated.id, 'result', {
    outcome: 'approved',
    note: 'TEST aktarılmamalı',
  });
  const append = client.appendResults.bind(client);
  let fail = true;
  client.appendResults = async (...args) => {
    await append(...args);
    if (fail) {
      fail = false;
      throw new Error('TEST yanıt kayboldu');
    }
  };
  await assert.rejects(
    sync.enablePush({ fileId, confirmed: true }),
    /kayboldu/,
  );
  assert.ok(sync.status().error);
  await sync.synchronize();
  assert.equal(client.outputRows.length, 3);
  assert.equal(client.writes, 1);
  assert.equal(client.output.length, 1);
  assert.equal(client.outputRows.flat().includes('TEST ilgisiz'), false);
  assert.ok(client.outputRows.some((r) => r[8] === 'SON-000001'));
  assert.ok(client.outputRows.some((r) => r[9].includes('Olumlu sonuçlandı')));
  client.outputRows[0][0] = 'Değişmiş başlık';
  await assert.rejects(sync.synchronize(), /başlıkları/);
  assert.equal(client.writes, 1);
});
void test('Google API hücre köprülerini okur; kullanıcı formülleri çalıştırılmaz ve çoklu bağlantı reddedilir', async (t) => {
  const { store } = setup(t);
  const rows = [
    headers.map((s) => ({ formattedValue: s })),
    row().map((s) => ({ formattedValue: s })),
  ];
  rows[1][0].hyperlink = profile;
  const client = new GoogleSheetsClient(
    { accessToken: async () => 'TEST' },
    async (url, options) => {
      assert.equal(new URL(url).hostname, 'sheets.googleapis.com');
      assert.equal(options.redirect, 'error');
      return url.includes('includeGridData')
        ? json({
            sheets: [
              { data: [{ rowData: rows.map((values) => ({ values })) }] },
            ],
          })
        : json({
            sheets: [
              {
                properties: {
                  sheetId: 7,
                  title: 'Gönderilecek Talepler',
                  sheetType: 'GRID',
                  gridProperties: { rowCount: 1000, columnCount: 26 },
                },
              },
            ],
          });
    },
  );
  const result = await client.read(fileId, 7);
  const p = await previewValidationBatch(store, {
    ...result.input,
    defaultKind: 'person',
  });
  assert.equal(p.items[0].values.profileUrl, profile);
  rows[1][0].textFormatRuns = [{ format: { link: { uri: profile + '4' } } }];
  await assert.rejects(client.read(fileId, 7), /birden fazla/);
});
void test('Google HTTP uçları oturum ve aynı kaynak ister; istemci sırları durum ve yedekte görünmez', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'refika-google-api-'));
  await writeFile(join(dir, 'index.html'), '<html>TEST</html>');
  const server = await startLocal({
    dataDir: dir,
    staticDir: dir,
    env: {},
    googleProtection: protectedTestBytes,
  });
  t.after(async () => {
    await server.close();
    await rm(dir, { recursive: true, force: true });
  });
  assert.equal((await fetch(server.url + '/api/google/status')).status, 401);
  const root = await fetch(server.url);
  const cookie = root.headers.get('set-cookie').split(';')[0];
  const request = (path, body, origin = server.url) =>
    fetch(server.url + '/api' + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        Cookie: cookie,
        Origin: origin,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  await request('/setup', {
    province: '25',
    operator: 'TEST',
    year: '2026–2027',
  });
  assert.equal(
    (await request('/google/configure', { installed }, 'https://example.org'))
      .status,
    403,
  );
  assert.equal((await request('/google/configure', { installed })).status, 200);
  const status = await (await request('/state')).text();
  assert.equal(status.includes(installed.client_secret), false);
  assert.equal(status.includes(installed.client_id), false);
  assert.equal(
    JSON.stringify(server.store.exportArchive()).includes(
      installed.client_secret,
    ),
    false,
  );
});
