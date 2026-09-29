import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { Store } from '../store.mjs';
import { parseDelimited, dateValue, reportFor, csv } from '../domain.mjs';
import { previewImport, commitPreview, workbookBuffer } from '../imports.mjs';
import { encryptBackup, decryptBackup } from '../backup.mjs';
import { startLocal } from '../server.mjs';
import { startHub } from '../hub.mjs';
import { syncSummary } from '../sync.mjs';
import { extractPlan } from '../ai.mjs';

const headers = [
  'İl',
  'Öğretmen ID',
  'Öğretmen Ad Soyad',
  'Okul ID',
  'Doğrulanacak Okul Adı',
];
const record = ['Erzurum', 'TEST-1', 'Deneme Öğretmeni', 'S-1', 'Deneme Okulu'];
const inputFor = (rows = [record]) => ({
  kind: 'records',
  name: 'deneme.csv',
  data: Buffer.from(csv([headers, ...rows])).toString('base64'),
});
function storeFor(t) {
  const store = new Store(':memory:');
  store.setup({
    province: '25',
    operator: 'Test koordinatörü',
    year: '2026–2027',
  });
  t.after(() => store.close());
  return store;
}
async function folder(t) {
  const path = await mkdtemp(join(tmpdir(), 'refika-test-'));
  t.after(async () => {
    if (!resolve(path).startsWith(resolve(tmpdir()) + sep + 'refika-test-'))
      throw new Error('Geçersiz test temizleme yolu.');
    await rm(path, { recursive: true, force: true });
  });
  return path;
}
const activity = {
  title: 'Test eğitimi',
  purpose: 'Örnek amaç',
  kind: 'Eğitim',
  startDate: '2026-09-01',
  endDate: '2026-09-02',
  plannedParticipants: 20,
  status: 'planned',
};

test('CSV, Türkçe, ayraç, kaçış ve satır içi yeni satırları korur', () => {
  const result = parseDelimited(
    '\uFEFFAd;Not\r\n"İlknur";"bir; iki\nüç ""dört"""',
  );
  assert.deepEqual(result.rows, [['İlknur', 'bir; iki\nüç "dört"']]);
  assert.throws(() => parseDelimited('a;b\n"eksik;alıntı'));
  assert.match(csv([['=HYPERLINK("x")']]), /"'=HYPERLINK/);
});
test('Geçersiz takvim tarihini reddeder', () => {
  assert.throws(() => dateValue('2026-02-30'));
  assert.equal(dateValue('3.9.2026'), '2026-09-03');
});
test('İl alanı ve eğitim yılı doğrulanır, il sonradan değişmez', (t) => {
  const store = storeFor(t);
  assert.throws(() =>
    store.setup({ province: '06', operator: 'Test', year: '2026–2027' }),
  );
});
test('Aynı liste yeniden alındığında çoğalmaz; sürüm ve kaynak satırı saklanır', async (t) => {
  const store = storeFor(t),
    input = inputFor();
  let preview = await previewImport(store, input);
  assert.equal(preview.counts.new, 1);
  commitPreview(store, preview, { token: preview.token });
  preview = await previewImport(store, input);
  assert.equal(preview.counts.unchanged, 1);
  commitPreview(store, preview, { token: preview.token });
  assert.equal(store.list('records').length, 1);
  assert.equal(store.list('records')[0].source.line, 2);
});
test('Excel çıktısı tekrar okunabilir; hücreler formül değil metindir', async (t) => {
  const store = storeFor(t);
  const buffer = await workbookBuffer(headers, [record]);
  const preview = await previewImport(store, {
    kind: 'records',
    name: 'test.xlsx',
    data: buffer.toString('base64'),
  });
  assert.equal(preview.counts.new, 1);
  assert.equal(preview.items[0].values.accountId, 'TEST-1');
});
test('Başka il ve aynı kimlikte birden fazla satır ayrı tutulur', async (t) => {
  const store = storeFor(t),
    preview = await previewImport(
      store,
      inputFor([record, record, ['Ankara', 'TEST-2', 'Test', 'S-2', 'Okul']]),
    );
  assert.equal(preview.counts.invalid, 3);
  assert.equal(preview.counts.new, 0);
  assert.throws(() => commitPreview(store, preview, { token: preview.token }));
});
test('Eksik ve bozuk dosya aktarımı kayıt değiştirmez', async (t) => {
  const store = storeFor(t);
  await assert.rejects(
    previewImport(store, {
      kind: 'records',
      name: 'test.xlsx',
      data: Buffer.from('bozuk').toString('base64'),
    }),
  );
  assert.equal(store.list('records').length, 0);
});
test('Önizlemeden sonra veri değişirse eski onay reddedilir', async (t) => {
  const store = storeFor(t),
    input = inputFor(),
    old = await previewImport(store, input);
  store.saveActivity(activity);
  const current = await previewImport(store, input);
  assert.throws(
    () => commitPreview(store, current, { token: old.token }),
    /Önizleme/,
  );
});
test('Kaynakta değişiklik incelenmiş kaydı tekrar incelemeye alır', async (t) => {
  const store = storeFor(t),
    first = await previewImport(store, inputFor());
  commitPreview(store, first, { token: first.token });
  let row = store.list('records')[0];
  store.reviewRecord(row.id, {
    version: row.version,
    status: 'ready',
    note: 'Kontrol edildi',
  });
  const changed = await previewImport(
    store,
    inputFor([['Erzurum', 'TEST-1', 'Düzeltilmiş Ad', 'S-1', 'Deneme Okulu']]),
  );
  assert.equal(changed.counts.update, 1);
  commitPreview(store, changed, { token: changed.token });
  assert.equal(store.list('records')[0].status, 'review');
});
test('Sonuçlandırılmış kayıt gelen listeyle sessizce değişmez', async (t) => {
  const store = storeFor(t),
    preview = await previewImport(store, inputFor());
  commitPreview(store, preview, { token: preview.token });
  let row = store.list('records')[0];
  row = store.reviewRecord(row.id, {
    version: row.version,
    status: 'ready',
    note: 'İncelendi',
  });
  store.reviewRecord(row.id, {
    version: row.version,
    status: 'completed',
    note: 'Resmî sonuç teyit edildi',
  });
  const changed = await previewImport(
    store,
    inputFor([['Erzurum', 'TEST-1', 'Yeni ad', 'S-1', 'Deneme Okulu']]),
  );
  assert.equal(changed.counts.locked, 1);
});
test('Faaliyet planı aktarılır, aynı kod tekrarında çoğalmaz', async (t) => {
  const store = storeFor(t),
    input = {
      kind: 'plan',
      name: 'plan.csv',
      data: Buffer.from(
        csv([
          [
            'Faaliyet kodu',
            'Faaliyet adı',
            'Amaç',
            'Tür',
            'Başlangıç',
            'Bitiş',
          ],
          [
            'P1',
            'Eğitim',
            'Bilgilendirme',
            'Eğitim',
            '2026-09-01',
            '2026-09-02',
          ],
        ]),
      ).toString('base64'),
    };
  const p = await previewImport(store, input);
  assert.equal(p.counts.new, 1);
  commitPreview(store, p, { token: p.token });
  assert.equal((await previewImport(store, input)).counts.unchanged, 1);
  assert.equal(store.list('activities')[0].status, 'planned');
});
test('Gerçekleşme, kanıt ve katılım olmadan tamamlanamaz; eski sürümle üzerine yazılmaz', (t) => {
  const store = storeFor(t),
    saved = store.saveActivity(activity);
  assert.throws(() => store.saveActivity({ ...saved, status: 'completed' }));
  store.saveActivity({ ...saved, title: 'Yeni başlık' });
  assert.throws(
    () => store.saveActivity({ ...saved, title: 'Eski pencere' }),
    /başka bir pencerede/,
  );
});
test('Rapor planlanan tarihe değil gerçekleşme tarihine göre sayar, gerçek sıfır korunur', (t) => {
  const store = storeFor(t);
  store.saveActivity({
    ...activity,
    status: 'completed',
    actualDate: '2026-10-03',
    actualParticipants: 0,
    result: 'Tamamlandı',
    evidence: 'Belge kaydı',
  });
  store.saveActivity({ ...activity, title: 'Planlanan' });
  const september = reportFor(store.state(), '2026-09-01', '2026-09-30'),
    october = reportFor(store.state(), '2026-10-01', '2026-10-31');
  assert.equal(september.completed.length, 0);
  assert.equal(october.completed.length, 1);
  assert.equal(october.total, 0);
  assert.equal(september.planned.length, 1);
});
test('Kanıtın gerçek içeriği ve kayıtlar SQLite yeniden açıldıktan sonra durur', async (t) => {
  const path = join(await folder(t), 'data.sqlite');
  let store = new Store(path);
  store.setup({ province: '25', operator: 'Test', year: '2026–2027' });
  const a = store.saveActivity(activity),
    f = store.addFile(a.id, 'kanıt.txt', Buffer.from('kalıcı kanıt'));
  store.close();
  store = new Store(path);
  assert.equal(store.list('activities').length, 1);
  assert.equal(Buffer.from(store.file(f.id).body).toString(), 'kalıcı kanıt');
  store.close();
});
test('Şifreli yedek yanlış parola ve değişikliği reddeder; geri yükleme kanıtları korur', (t) => {
  const store = storeFor(t),
    a = store.saveActivity(activity),
    file = store.addFile(a.id, 'kanıt.txt', Buffer.from('test'));
  const bytes = encryptBackup(store.exportArchive(), 'uzun-test-parolası');
  assert.ok(!bytes.toString().includes('Test eğitimi'));
  assert.throws(() => decryptBackup(bytes, 'yanlış-parola-123'));
  const archive = decryptBackup(bytes, 'uzun-test-parolası');
  assert.throws(() => store.restoreArchive(archive, '06'));
  store.restoreArchive(archive, '25');
  assert.equal(Buffer.from(store.file(file.id).body).toString(), 'test');
  const corrupt = structuredClone(archive);
  corrupt.files[0].activity_id = 'yok';
  assert.throws(() => store.restoreArchive(corrupt, '25'));
  assert.equal(store.list('activities').length, 1);
});
test('AI kapalıyken uydurma sonuç dönmez; hizmet açık onay gerektirir', async () => {
  await assert.rejects(
    extractPlan({ document: 'Test' }, {}),
    /bağlantısı kurulmadı/,
  );
  await assert.rejects(
    extractPlan(
      { document: 'Test' },
      { REFIKA_AI_URL: 'http://127.0.0.1:9999', REFIKA_AI_MODEL: 'test' },
    ),
    /onaylayın/,
  );
});
test('Yedekten dönüş eski açık formun değişikliği ezmesine izin vermez', (t) => {
  const store = storeFor(t),
    saved = store.saveActivity(activity),
    archive = store.exportArchive();
  store.restoreArchive(archive, '25');
  assert.throws(
    () => store.saveActivity({ ...saved, title: 'Eski form' }),
    /başka bir pencerede/,
  );
  const invalid = structuredClone(archive);
  invalid.settings.year = '2026–2029';
  assert.throws(
    () => store.restoreArchive(invalid, '25'),
    /bilgileri geçersiz/,
  );
  assert.equal(store.get('activities', saved.id).title, activity.title);
});
test('Yerel API oturum ve kaynak doğrular, yeniden başlatmada durum kalıcıdır', async (t) => {
  const path = await folder(t),
    ui = join(path, 'ui');
  await mkdir(ui);
  await writeFile(join(ui, 'index.html'), '<html>REFIKA</html>');
  const service = await startLocal({ dataDir: path, staticDir: ui, env: {} });
  try {
    assert.equal((await fetch(service.url + '/api/state')).status, 401);
    const response = await fetch(service.url),
      cookie = response.headers.get('set-cookie').split(';')[0];
    assert.equal(
      (
        await fetch(service.url + '/api/setup', {
          method: 'POST',
          headers: {
            Cookie: cookie,
            Origin: 'https://invalid.example',
            'Content-Type': 'application/json',
          },
          body: '{}',
        })
      ).status,
      403,
    );
    const setup = await fetch(service.url + '/api/setup', {
      method: 'POST',
      headers: {
        Cookie: cookie,
        Origin: service.url,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        province: '25',
        operator: 'Test',
        year: '2026–2027',
      }),
    });
    assert.equal(setup.status, 200);
    const state = await (
      await fetch(service.url + '/api/state', { headers: { Cookie: cookie } })
    ).json();
    assert.equal(state.settings.province, '25');
    assert.equal(state.records.length, 0);
    assert.equal(state.ai.configured, false);
  } finally {
    await service.close();
  }
});
test('Merkez il yetkisini uygular, tekrarları saymaz, sürüm çatışmasını reddeder', async (t) => {
  const adminKey = 'TEST-ADMIN-'.padEnd(40, 'a'),
    clientKey = 'TEST-25-'.padEnd(40, 'b'),
    hub = await startHub({
      database: ':memory:',
      adminKey,
      clients: { [clientKey]: '25' },
    });
  t.after(() => hub.close());
  const store = storeFor(t);
  store.setMeta('shareSummary', true);
  store.saveActivity(activity);
  const env = { REFIKA_HUB_URL: hub.url, REFIKA_HUB_TOKEN: clientKey };
  await syncSummary(store, env);
  await syncSummary(store, env);
  const post = (snapshot) =>
    fetch(hub.url + '/api/snapshots', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + clientKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ snapshot, baseVersion: 0 }),
    });
  assert.equal(
    (await post({ ...store.summary(), province: '06' })).status,
    403,
  );
  assert.equal((await post({ ...store.summary(), completed: 99 })).status, 409);
  assert.equal(
    (
      await fetch(hub.url + '/api/overview', {
        headers: { Authorization: 'Bearer ' + clientKey },
      })
    ).status,
    401,
  );
  const overview = await (
    await fetch(hub.url + '/api/overview', {
      headers: { Authorization: 'Bearer ' + adminKey },
    })
  ).json();
  assert.equal(overview.rows.length, 1);
  assert.equal(overview.rows[0].version, 1);
  assert.equal(overview.rows[0].planned, 1);
  assert.ok(!JSON.stringify(overview).includes('Test koordinatörü'));
});
