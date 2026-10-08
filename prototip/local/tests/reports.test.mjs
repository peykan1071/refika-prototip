import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../store.mjs';
import { eventReportProblems, eventReportFields } from '../report-schema.mjs';
import { encryptBackup, decryptBackup } from '../backup.mjs';
import { startLocal } from '../server.mjs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

function workspace(t) {
  const store = new Store(':memory:');
  store.setup({
    province: '25',
    operator: 'Test Koordinatörü',
    year: '2026–2027',
  });
  t.after(() => store.close());
  return store;
}
const archived = {
  title: 'Örnek okul ziyareti',
  period: '2026 / 1. Dönem',
  coordinator: 'TEST KOORDİNATÖRÜ',
  province: '25',
  sourceUrl: 'https://yegitek.eba.gov.tr/etwinning-rapor/9999',
  reportType: 'event',
  fields: [
    { label: 'Eğitim İçeriği', value: 'Kaynakta kayıtlı rehberlik çalışması.' },
    { label: 'Toplam Katılımcı Sayısı', value: '' },
    {
      label: 'Etkinlik Dosyaları',
      value: 'belge.pdf',
      links: [
        {
          title: 'belge.pdf',
          url: 'https://yegitek.eba.gov.tr/uploads/etwinning/belge.pdf',
        },
      ],
    },
  ],
};
function importReport(store, input = archived) {
  const p = store.reports.previewImport(input);
  return store.reports.import({ ...input, token: p.token });
}
function completeDraft(store) {
  const draft = store.reports.generate({
    reportType: 'event',
    period: '2026 / 1. Dönem',
    from: '2026-01-01',
    to: '2026-03-31',
  });
  draft.title = 'Gerçekleşen okul ziyareti';
  const values = {
    İlçeler: 'Örnek ilçe',
    'Etkinlik Seçimi': eventReportFields[1].options[0],
    'Etkinlik Formatı': 'Yüz yüze',
    'Etkinlik Türü': 'Okul ziyareti',
    'Okul Adı': 'Örnek Okul',
    'Etkinlik Tarihi': '2026-02-10',
    'Eğitmen Adı': 'Test eğitmeni',
    'Eğitim İçeriği': 'Gerçekleşen rehberlik oturumu',
    'Toplam Katılımcı Sayısı': '10',
  };
  draft.fields = draft.fields.map((f) => ({
    ...f,
    value: values[f.label] ?? f.value,
  }));
  return draft;
}
test('Rapor aktarımı koordinatör ve ili doğrular; kayıt çoğalmaz, boş katılım sıfıra çevrilmez', (t) => {
  const store = workspace(t);
  assert.throws(
    () =>
      store.reports.previewImport({ ...archived, coordinator: 'Başka kişi' }),
    /eşleşmeli/,
  );
  assert.throws(
    () => store.reports.previewImport({ ...archived, province: '06' }),
    /eşleşmeli/,
  );
  const p = store.reports.previewImport(archived);
  assert.equal(store.reports.list().length, 0);
  store.log('Arada işlem');
  assert.throws(
    () => store.reports.import({ ...archived, token: p.token }),
    /değişti/,
  );
  const report = importReport(store);
  assert.equal(importReport(store).version, report.version);
  assert.equal(store.reports.list().length, 1);
  assert.equal(report.fields[1].value, '');
  assert.equal(store.state().activities.length, 0);
  assert.equal(report.fields[2].links[0].title, 'belge.pdf');
});
test('Kaynak raporun yeni sürümü eski içeriği korur; kaynak doğrudan değiştirilemez', (t) => {
  const store = workspace(t),
    first = importReport(store),
    second = importReport(store, {
      ...archived,
      title: 'Güncel kaynak başlığı',
    });
  assert.equal(second.history.length, 1);
  assert.equal(second.version, first.version + 1);
  const old = JSON.parse(
    store.db
      .prepare('SELECT body FROM report_versions WHERE report_id=?')
      .get(first.id).body,
  );
  assert.equal(old.title, first.title);
  assert.throws(() => store.reports.save(first), /korunur/);
  assert.throws(
    () =>
      store.reports.previewImport({
        ...archived,
        sourceUrl: 'https://example.org/etwinning-rapor/1',
      }),
    /bağlantısını/,
  );
});
test('Taslak, hazır ve YEĞİTEK kayıt bilgisi ayrıdır; düzenleme kontrol durumunu sıfırlar', (t) => {
  const store = workspace(t),
    saved = store.reports.save(completeDraft(store));
  assert.equal(saved.status, 'draft');
  assert.throws(
    () => store.reports.ready(saved.id, { version: saved.version }),
    /onaylayın/,
  );
  const ready = store.reports.ready(saved.id, {
    version: saved.version,
    reviewed: true,
  });
  assert.equal(ready.status, 'ready');
  assert.equal(ready.sourceUrl, '');
  assert.throws(
    () =>
      store.reports.recordSubmission(ready.id, {
        version: ready.version,
        sourceUrl: archived.sourceUrl,
        recordedDate: '2026-02-11',
        proof: '',
      }),
    /dayanağı/,
  );
  const edited = store.reports.save({ ...ready, title: 'Düzenlenmiş başlık' });
  assert.equal(edited.status, 'draft');
  assert.throws(() => store.reports.save(saved), /değişti/);
  const checked = store.reports.ready(edited.id, {
    version: edited.version,
    reviewed: true,
  });
  const recorded = store.reports.recordSubmission(checked.id, {
    version: checked.version,
    sourceUrl: archived.sourceUrl,
    recordedDate: '2026-02-11',
    proof: 'Resmî ekranda kayıt numarası görüldü.',
  });
  assert.equal(recorded.status, 'recorded');
  assert.throws(() => store.reports.save(recorded), /korunur/);
});
test('Gelecek faaliyet, değişen kaynak, eksik alan, 800 karakter ve katılım tutarsızlığı aktarımı engeller', (t) => {
  const store = workspace(t);
  const activity = store.saveActivity({
    title: 'Örnek eğitim',
    purpose: 'Rehberlik',
    kind: 'Eğitim',
    status: 'planned',
    startDate: '2026-02-10',
    endDate: '2026-02-10',
  });
  assert.throws(
    () =>
      store.reports.generate({ reportType: 'event', activityId: activity.id }),
    /gerçekleşme/,
  );
  const completed = store.saveActivity({
    ...activity,
    status: 'completed',
    actualDate: '2026-02-10',
    actualParticipants: 0,
    result: 'Oturum tamamlandı',
    evidence: 'İmza belgesi',
  });
  const draft = store.reports.generate({
    reportType: 'event',
    activityId: completed.id,
    period: '1. Dönem',
    from: '2026-01-01',
    to: '2026-03-31',
  });
  assert.equal(
    draft.fields.find((f) => f.label === 'Toplam Katılımcı Sayısı').value,
    '0',
  );
  assert.equal(
    draft.fields.find((f) => f.label === 'Katılımcı Öğretmen Sayısı').value,
    '',
  );
  const saved = store.reports.save(draft);
  store.saveActivity({ ...completed, result: 'Düzeltilen sonuç' });
  assert.equal(store.reports.detail(saved.id).sourceChanged, true);
  assert.throws(
    () =>
      store.reports.ready(saved.id, { version: saved.version, reviewed: true }),
    /Kaynak faaliyet/,
  );
  const invalid = completeDraft(store);
  invalid.fields.find((f) => f.label === 'Eğitim İçeriği').value = 'x'.repeat(
    801,
  );
  assert.throws(() => store.reports.save(invalid), /800/);
  invalid.fields.find((f) => f.label === 'Eğitim İçeriği').value = 'Kısa metin';
  invalid.fields.find((f) => f.label === 'Katılımcı Öğrenci Sayısı').value =
    '11';
  assert.ok(eventReportProblems(invalid).some((p) => p.includes('uyuşmuyor')));
  const online = completeDraft(store);
  online.fields.find((f) => f.label === 'Etkinlik Türü').value = 'Çevrim içi';
  assert.ok(
    eventReportProblems(online).some((p) => p.includes('Eğitim Aracı')),
  );
  online.fields.find((f) => f.label === 'Eğitim Aracı').value = 'Diğer';
  assert.ok(
    eventReportProblems(online).some((p) => p.includes('adını belirtin')),
  );
  online.fields.find((f) => f.label === 'Eğitim Aracı Belirtiniz').value =
    'Kurumun çevrim içi platformu';
  assert.deepEqual(eventReportProblems(online), []);
});
test('Rapor, sürüm geçmişi ve gerçek ek dosyası şifreli yedekten geri gelir; eski yedek açılır', (t) => {
  const store = workspace(t),
    report = importReport(store),
    bytes = Buffer.from('Sadece test belgesi');
  const withFile = store.reports.addFile(report.id, {
    version: report.version,
    name: 'belge.txt',
    data: bytes.toString('base64'),
  });
  assert.equal(withFile.attachments.length, 1);
  const archive = store.exportArchive();
  assert.equal(archive.version, 4);
  const decrypted = decryptBackup(
    encryptBackup(archive, 'test-parolasi-12345'),
    'test-parolasi-12345',
  );
  store.restoreArchive(decrypted, '25');
  const restored = store.reports.detail(report.id);
  assert.equal(restored.history.length, 1);
  assert.ok(restored.version > withFile.version);
  assert.equal(
    Buffer.from(
      store.db.prepare('SELECT body FROM report_files').get().body,
    ).toString(),
    bytes.toString(),
  );
  const invalid = structuredClone(archive);
  invalid.reports.files = [];
  assert.throws(() => store.restoreArchive(invalid, '25'), /eki eksik/);
  assert.equal(store.reports.list().length, 1);
  store.restoreArchive({ ...archive, version: 3, reports: undefined }, '25');
  assert.equal(store.reports.list().length, 0);
});
test('Yedekten dönüş raporun kaynak faaliyet bağını korur; önceden değişmiş kaynağı güncel saymaz', (t) => {
  const store = workspace(t);
  const activity = store.saveActivity({
    title: 'Örnek eğitim',
    purpose: 'Rehberlik',
    kind: 'Eğitim',
    status: 'completed',
    startDate: '2026-02-10',
    endDate: '2026-02-10',
    actualDate: '2026-02-10',
    actualParticipants: 10,
    result: 'Tamamlandı',
    evidence: 'Oturum kaydı',
  });
  const generated = store.reports.generate({
    reportType: 'event',
    activityId: activity.id,
    period: '2026 / 1. Dönem',
    from: '2026-01-01',
    to: '2026-03-31',
  });
  const draft = store.reports.save({
    ...generated,
    title: 'Örnek eğitim',
    fields: completeDraft(store).fields,
  });
  const ready = store.reports.ready(draft.id, {
    version: draft.version,
    reviewed: true,
  });
  const firstArchive = store.exportArchive();
  store.restoreArchive(firstArchive, '25');
  const current = store.reports.detail(ready.id);
  assert.equal(current.sourceChanged, false);
  assert.equal(current.status, 'ready');
  const restoredActivity = store.get('activities', activity.id);
  store.saveActivity({ ...restoredActivity, result: 'Sonradan değişen sonuç' });
  const staleArchive = store.exportArchive();
  store.restoreArchive(staleArchive, '25');
  assert.equal(store.reports.detail(ready.id).sourceChanged, true);
  assert.throws(() => store.reports.save(current), /değişti/);
});

test('Rapor API arşivleme, ek, indirme ve durum değişimini oturumla uygular', async (t) => {
  const path = await mkdtemp(join(tmpdir(), 'refika-reports-')),
    ui = join(path, 'ui');
  await mkdir(ui);
  await writeFile(join(ui, 'index.html'), '<html>TEST</html>');
  const service = await startLocal({ dataDir: path, staticDir: ui, env: {} });
  t.after(async () => {
    await service.close();
    if (!resolve(path).startsWith(resolve(tmpdir()) + sep + 'refika-reports-'))
      throw new Error('Geçersiz test yolu');
    await rm(path, { recursive: true, force: true });
  });
  const root = await fetch(service.url),
    cookie = root.headers.get('set-cookie').split(';')[0];
  const post = (p, b) =>
    fetch(service.url + '/api/' + p, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        Origin: service.url,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(b),
    });
  const get = (p) =>
    fetch(service.url + '/api/' + p, { headers: { Cookie: cookie } });
  await post('setup', {
    province: '25',
    operator: 'Test Koordinatörü',
    year: '2026–2027',
  });
  const preview = await (await post('reports/import-preview', archived)).json();
  const saved = await (
    await post('reports/import', { ...archived, token: preview.token })
  ).json();
  assert.equal(saved.status, 'imported');
  const file = await (
    await post(`reports/${saved.id}/files`, {
      version: saved.version,
      name: 'ek.txt',
      data: Buffer.from('kanıt').toString('base64'),
    })
  ).json();
  assert.equal(
    await (await get('report-files/' + file.attachments[0].id)).text(),
    'kanıt',
  );
  assert.match(
    await (await get(`reports/${saved.id}/export`)).text(),
    /Örnek okul ziyareti/,
  );
  assert.equal((await (await get('state')).json()).reports.length, 1);
  assert.equal(
    (await fetch(service.url + '/api/reports/' + saved.id)).status,
    401,
  );
});
