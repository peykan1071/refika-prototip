import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { Store } from '../store.mjs';
import { startLocal } from '../server.mjs';
import { workbookBuffer } from '../imports.mjs';
import {
  previewValidationBatch,
  commitValidationBatch,
  validationBatches,
  updateValidationBatch,
  approvedAccounts,
  validationBatchTemplate,
  saveBatchDraft,
} from '../validation-batches.mjs';
import { validationPeriodSummary } from '../validation-periods.mjs';

const url =
  'https://school-education.ec.europa.eu/en/nso-desktop/registrations/';
function setup(t) {
  const store = new Store(':memory:');
  store.setup({ province: '25', operator: 'TEST', year: '2026–2027' });
  t.after(() => store.close());
  return store;
}
const headers = [
  'İşlem türü',
  'Ad soyad',
  'Kişi ID',
  'Okul adı',
  'Okul ID',
  'Kişi profil bağlantısı',
  'Okul profil bağlantısı',
  'İl',
  'Durum',
];
const data = [
  [
    'Kişi',
    'TEST Kişi A',
    'P1',
    'TEST Okul A',
    'S1',
    url + 'etwinners/91',
    url + 'schools/92',
    'Erzurum',
    'Onaylandı',
  ],
  ['Kişi', 'TEST Kişi B', 'P2', 'TEST Okul A', 'S1', '', '', '25', 'Onaylandı'],
  ['Okul', '', '', 'TEST Okul A', 'S1', '', url + 'schools/92', '', ''],
  ['Üyelik', 'TEST Kişi A', 'P1', 'TEST Okul B', 'S2', '', '', '', ''],
];
async function source(rows = data) {
  return {
    name: 'TEST validasyon.xlsx',
    data: (await workbookBuffer(headers, rows)).toString('base64'),
  };
}
const selections = (rows) => rows.map(({ id, version }) => ({ id, version }));
const evidence = {
  happenedAt: '2026-09-01T09:00:00+03:00',
  note: 'TEST: Liste bu maille gönderildi.',
  evidenceUrl: 'https://example.org/sent',
  confirmed: true,
};

void test('Excel kişi, okul ve üyelik dosyalarını ayrı oluşturur; durum sütunu onay vermez; kısmi mail sonucu hesap listesine yansır', async (t) => {
  const store = setup(t),
    input = await source(),
    preview = await previewValidationBatch(store, input);
  assert.equal(preview.counts.new, 4);
  const result = commitValidationBatch(store, preview, {
    ...input,
    token: preview.token,
    confirmed: true,
  });
  let batch = validationBatches(store)[0];
  assert.equal(batch.id, result.batchId);
  assert.equal(batch.prepared, 4);
  assert.equal(store.validation.files().length, 1);
  assert.equal(approvedAccounts(store).length, 0);
  assert.ok(
    batch.rows.every(
      (r) =>
        r.status === 'review' &&
        Object.values(r.checks).every((c) => c.status === 'unknown'),
    ),
  );
  assert.throws(
    () =>
      updateValidationBatch(store, batch.id, 'result', {
        ...evidence,
        rows: selections(batch.rows),
      }),
    /gönderilmiş/,
  );
  updateValidationBatch(store, batch.id, 'sent', {
    ...evidence,
    rows: selections(batch.rows),
  });
  batch = validationBatches(store)[0];
  updateValidationBatch(store, batch.id, 'result', {
    ...evidence,
    happenedAt: '2026-09-02T09:00:00+03:00',
    note: 'TEST: Kişi A, okul A ve üyelik onaylandı; kişi B istisnadır.',
    outcome: 'approved',
    rows: selections(batch.rows.filter((r) => r.accountId !== 'P2')),
  });
  assert.equal(validationBatches(store)[0].waiting, 1);
  const registry = approvedAccounts(store);
  assert.equal(registry.length, 3);
  assert.deepEqual(
    registry.map((r) => r.kind).sort((a, b) => a.localeCompare(b)),
    ['membership', 'person', 'school'],
  );
  const summary = validationPeriodSummary(store, 2026);
  assert.equal(summary.annual.validatedPeople, 1);
  assert.equal(summary.annual.membershipApprovals, 1);
  assert.equal(summary.annual.schoolApprovals, 1);
  assert.ok(summary.results.every((r) => r.dateBasis === 'notification'));
  assert.equal(new Set(summary.results.map((r) => r.reference)).size, 3);
  store.restoreArchive(store.exportArchive(), '25');
  assert.equal(validationBatches(store)[0].rows.length, 4);
  assert.equal(approvedAccounts(store).length, 3);
  assert.equal(store.validation.files().length, 1);
  assert.deepEqual(
    Buffer.from(
      store.db.prepare('SELECT body FROM validation_files').get().body,
    ),
    Buffer.from(input.data, 'base64'),
  );
});
void test('Tekrar dosya, satır tekrarı ve hatalı il ayrılır; eski önizleme kayıt ezemez', async (t) => {
  const store = setup(t),
    input = await source([
      ...data,
      data[0],
      [...data[1].slice(0, 7), 'Ankara', ''],
    ]);
  let preview = await previewValidationBatch(store, input);
  assert.deepEqual(preview.counts, {
    new: 4,
    existing: 0,
    duplicate: 1,
    invalid: 1,
  });
  assert.throws(
    () =>
      commitValidationBatch(store, preview, {
        ...input,
        token: preview.token,
        confirmed: true,
      }),
    /Hatalı/,
  );
  store.log('TEST değişiklik');
  const refreshed = await previewValidationBatch(store, input);
  assert.throws(
    () =>
      commitValidationBatch(store, refreshed, {
        ...input,
        token: preview.token,
        confirmed: true,
        skipInvalid: true,
      }),
    /Önizleme/,
  );
  commitValidationBatch(store, refreshed, {
    ...input,
    token: refreshed.token,
    confirmed: true,
    skipInvalid: true,
  });
  preview = await previewValidationBatch(store, {
    ...input,
    name: 'Başka ad.xlsx',
  });
  assert.equal(preview.counts.new, 0);
  assert.equal(preview.counts.existing, 4);
  assert.throws(
    () =>
      commitValidationBatch(store, preview, {
        ...input,
        token: preview.token,
        confirmed: true,
        skipInvalid: true,
      }),
    /yeni kayıt yok/,
  );
  assert.equal(store.validation.list().length, 4);
});
void test('Toplu sonuçta sürüm, liste üyeliği, tarih ve mail dayanağı tüm seçimler için birlikte doğrulanır', async (t) => {
  const store = setup(t),
    input = await source(),
    preview = await previewValidationBatch(store, input);
  commitValidationBatch(store, preview, {
    ...input,
    token: preview.token,
    confirmed: true,
  });
  let batch = validationBatches(store)[0];
  assert.throws(
    () =>
      updateValidationBatch(store, batch.id, 'sent', {
        ...evidence,
        note: '',
        evidenceUrl: '',
        rows: selections(batch.rows),
      }),
    /mail/,
  );
  assert.throws(
    () =>
      updateValidationBatch(store, 'batch-' + 'a'.repeat(64), 'sent', {
        ...evidence,
        rows: selections(batch.rows),
      }),
    /ait değil/,
  );
  const stale = selections(batch.rows);
  stale[1].version = 0;
  assert.throws(
    () =>
      updateValidationBatch(store, batch.id, 'sent', {
        ...evidence,
        rows: stale,
      }),
    /başka bir pencerede/,
  );
  assert.equal(validationBatches(store)[0].prepared, 4);
  updateValidationBatch(store, batch.id, 'sent', {
    ...evidence,
    rows: selections(batch.rows),
  });
  batch = validationBatches(store)[0];
  assert.throws(
    () =>
      updateValidationBatch(store, batch.id, 'result', {
        ...evidence,
        happenedAt: '2026-08-01T00:00:00Z',
        rows: selections(batch.rows),
      }),
    /önce/,
  );
  assert.throws(
    () =>
      updateValidationBatch(store, batch.id, 'result', {
        ...evidence,
        confirmed: false,
        rows: selections(batch.rows),
      }),
    /teyit/,
  );
  assert.equal(store.meta('validationResultSequence'), 0);
  updateValidationBatch(store, batch.id, 'result', {
    ...evidence,
    happenedAt: '2026-09-02T00:00:00Z',
    outcome: 'rejected',
    rows: selections(batch.rows),
  });
  assert.equal(approvedAccounts(store).length, 0);
  assert.equal(validationPeriodSummary(store, 2026).annual.rejected, 4);
});
void test('Excel gerçek köprü adresini okur, profil URL’sini ID’den uydurmaz; şablon boş indirilebilir', async (t) => {
  const store = setup(t),
    book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Liste');
  sheet.addRow(headers);
  sheet.addRow(data[0]);
  sheet.getCell('F2').value = {
    text: 'Kişi profili',
    hyperlink: url + 'etwinners/91',
  };
  const input = {
    name: 'Köprülü.xlsx',
    data: Buffer.from(await book.xlsx.writeBuffer()).toString('base64'),
  };
  const preview = await previewValidationBatch(store, input);
  assert.equal(preview.items[0].values.profileUrl, url + 'etwinners/91');
  const blank = await previewValidationBatch(store, await source([data[1]]));
  assert.equal(blank.items[0].values.profileUrl, '');
  const template = new ExcelJS.Workbook();
  await template.xlsx.load(await validationBatchTemplate());
  assert.equal(template.worksheets[0].rowCount, 1);
  assert.equal(template.worksheets[0].getCell('B1').text, 'Kişi ID');
});
void test('Excel liste API’si oturum, önizleme ve toplu işlemleri uygular', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'refika-batch-'));
  await writeFile(join(dir, 'index.html'), '<html>Test</html>');
  const service = await startLocal({ dataDir: dir, staticDir: dir, env: {} });
  t.after(async () => {
    await service.close();
    if (!resolve(dir).startsWith(resolve(tmpdir()) + sep + 'refika-batch-'))
      throw new Error('Geçersiz test dizini');
    await rm(dir, { recursive: true, force: true });
  });
  const cookie = (await fetch(service.url)).headers
    .get('set-cookie')
    .split(';')[0];
  const request = (path, body) =>
    fetch(service.url + '/api' + path, {
      headers: {
        Cookie: cookie,
        Origin: service.url,
        'Content-Type': 'application/json',
      },
      ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
    });
  await request('/setup', {
    province: '25',
    operator: 'TEST',
    year: '2026–2027',
  });
  const settingsState = await (await request('/state')).json();
  assert.equal(
    (
      await request('/settings/contacts', {
        email: 'test@example.org',
        sheetUrl: 'https://docs.google.com/spreadsheets/d/TEST/edit#gid=123',
        revision: settingsState.revision,
      })
    ).status,
    200,
  );
  assert.equal(
    (await (await request('/state')).json()).settings.contacts.email,
    'test@example.org',
  );
  assert.equal(
    (await fetch(service.url + '/api/validation-batches')).status,
    401,
  );
  assert.equal(
    (
      await fetch(service.url + '/api/validation-batches/commit', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: 'https://example.org',
          'Content-Type': 'application/json',
        },
        body: '{}',
      })
    ).status,
    403,
  );
  const input = await source(),
    preview = await (
      await request('/validation-batches/preview', input)
    ).json();
  const before = (await (await request('/validation-batches')).json()).length;
  assert.equal(preview.drafts[0].sender, 'test@example.org');
  const exported = await (
    await request('/validation-batches/preview-export', {
      ...input,
      token: preview.token,
    })
  ).json();
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(Buffer.from(exported.data, 'base64'));
  assert.equal(book.worksheets[0].getCell('F1').text, 'Açıklama');
  assert.equal(book.worksheets[0].getCell('G1').text, 'Talep edilen işlem');
  assert.ok(
    book.worksheets[0].getCell('F2').text.includes('Açıklama belirtilmedi'),
  );
  assert.ok(book.worksheets[0].getCell('G2').text.includes('eTwinning'));
  assert.equal(
    (await (await request('/validation-batches')).json()).length,
    before,
  );
  const committed = await request('/validation-batches/commit', {
    ...input,
    token: preview.token,
    confirmed: true,
  });
  assert.equal(committed.status, 200);
  const batch = (await (await request('/validation-batches')).json())[0];
  assert.equal(batch.drafts.length, 1);
  const edited = {
    ...batch.drafts[0],
    subject: 'TEST düzenlenmiş mail konusu',
  };
  assert.equal(
    (await request('/validation-batches/' + batch.id + '/draft', edited))
      .status,
    200,
  );
  assert.equal(
    (await request('/validation-batches/' + batch.id + '/export?group=invalid'))
      .status,
    400,
  );
  assert.equal(
    (await request('/validation-batches/' + batch.id + '/export')).status,
    200,
  );
  assert.equal((await request('/files/' + batch.sourceFile.id)).status, 200);
  assert.equal(
    (
      await request('/validation-batches/' + batch.id + '/sent', {
        ...evidence,
        rows: selections(batch.rows),
      })
    ).status,
    200,
  );
  const sent = (await (await request('/validation-batches')).json())[0];
  assert.equal(
    (
      await request('/validation-batches/' + sent.id + '/result', {
        ...evidence,
        happenedAt: '2026-09-02T00:00:00Z',
        rows: selections(sent.rows),
      })
    ).status,
    200,
  );
  assert.equal(
    (await (await request('/validation-accounts')).json()).length,
    4,
  );
});
void test('Açıklamalar ve somut işlemler ayrı grup maillerine taşınır; taslak değişiklikleri yedekle korunur', async (t) => {
  const store = setup(t);
  const input = {
    name: 'TEST-karma.xlsx',
    data: (
      await workbookBuffer(
        [
          ...headers,
          'Açıklama',
          'Talep edilen işlem',
          'Korunacak profil',
          'Birleştirilecek profiller',
          'Bekleme gerekçesi',
        ],
        [
          [
            ...data[0],
            'TEST: Katılım talebi bekliyor.',
            'TEST: Başvuru onayını rica ederim.',
            '',
            '',
            '',
          ],
          [
            'Birleştirme',
            '',
            '',
            'TEST Okul B',
            'S2',
            '',
            url + 'schools/93',
            '',
            '',
            'TEST: Aynı okula ait iki profil.',
            '',
            'S2 ana profil',
            'S3 ikinci profil',
            '',
          ],
          [
            'Destek',
            'TEST Destek',
            'P9',
            '',
            '',
            '',
            '',
            '',
            '',
            'TEST: Okul adı yanlış.',
            'TEST: Okul adı düzeltilecek.',
            '',
            '',
            '',
          ],
          [
            ...data[1],
            'TEST: Ad-soyad eksik.',
            'TEST: İsim düzeltmesi.',
            '',
            '',
            'Ad-soyad doğrulanamadı',
          ],
        ],
      )
    ).toString('base64'),
  };
  const preview = await previewValidationBatch(store, input);
  assert.equal(preview.counts.new, 4);
  assert.equal(preview.drafts.length, 3);
  const accounts = preview.drafts.find((d) => d.group === 'accounts');
  assert.equal(accounts.recipient, 'validasyonetw@gmail.com');
  assert.equal(accounts.count, 1);
  assert.equal(accounts.excluded, 1);
  assert.match(accounts.body, /TEST: Katılım talebi bekliyor/);
  assert.match(accounts.body, /TEST: Başvuru onayını rica ederim/);
  assert.doesNotMatch(
    accounts.body,
    /TEST Kişi B|S3 ikinci|kontrolleri tamamlanan/,
  );
  assert.match(
    preview.drafts.find((d) => d.group === 'merger').body,
    /S3 ikinci profil profillerinin S2 ana profil/,
  );
  assert.equal(
    preview.drafts.find((d) => d.group === 'support').recipient,
    'tretwinning@gmail.com',
  );
  commitValidationBatch(store, preview, {
    ...input,
    token: preview.token,
    confirmed: true,
  });
  let batch = validationBatches(store)[0];
  const draft = batch.drafts[0];
  saveBatchDraft(store, batch.id, {
    ...draft,
    body: 'TEST kullanıcı tarafından düzenlenen taslak',
  });
  assert.throws(() => saveBatchDraft(store, batch.id, draft), /değişti/);
  assert.equal(
    validationBatches(store)[0].drafts[0].body,
    'TEST kullanıcı tarafından düzenlenen taslak',
  );
  assert.equal(approvedAccounts(store).length, 0);
  store.restoreArchive(store.exportArchive(), '25');
  batch = validationBatches(store)[0];
  assert.equal(
    batch.drafts[0].body,
    'TEST kullanıcı tarafından düzenlenen taslak',
  );
  const row = batch.rows[0];
  store.validation.put({ ...row, reason: 'TEST: Düzeltilmiş açıklama.' });
  const refreshed = validationBatches(store)[0].drafts[0];
  assert.equal(refreshed.regenerated, true);
  assert.match(refreshed.body, /Düzeltilmiş açıklama/);
});
