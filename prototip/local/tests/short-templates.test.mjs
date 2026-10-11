import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { Store } from '../store.mjs';
import {
  validationBatchTemplate,
  previewValidationBatch,
  commitValidationBatch,
  validationBatches,
} from '../validation-batches.mjs';
import { validationBatchWorkbook } from '../validation-excel.mjs';
import { caseDraft } from '../validation.mjs';

const personUrl =
  'https://school-education.ec.europa.eu/en/etwinning/etwinners/991';
const schoolUrl =
  'https://school-education.ec.europa.eu/en/etwinning/schools/992';
function setup(t) {
  const store = new Store(':memory:');
  t.after(() => store.close());
  store.setup({ province: '25', operator: 'TEST', year: '2026–2027' });
  return store;
}
async function source(book) {
  return {
    name: 'TEST.xlsx',
    data: Buffer.from(await book.xlsx.writeBuffer()).toString('base64'),
  };
}
const linked = (text, hyperlink) => ({ text, hyperlink });

test('Dört kısa şablon türü otomatik tanınır; isim köprüleri ve görünen ID ayrı korunur', async (t) => {
  for (const [kind, values, count] of [
    [
      'person',
      [
        linked('TEST Kişi', personUrl),
        'P1',
        linked('TEST Okul', schoolUrl),
        'S1',
        'TEST açıklama',
      ],
      5,
    ],
    ['school', [linked('TEST Okul', schoolUrl), 'S1', 'TEST açıklama'], 3],
    [
      'membership',
      [
        linked('TEST Kişi', personUrl),
        'P1',
        linked('TEST Okul', schoolUrl),
        'S1',
        'TEST açıklama',
      ],
      5,
    ],
    [
      'merger',
      [
        linked('TEST Okul', schoolUrl),
        'S1',
        linked('TEST İkinci okul', schoolUrl + '3'),
        'S2',
        'TEST açıklama',
      ],
      5,
    ],
  ]) {
    const store = setup(t),
      book = new ExcelJS.Workbook();
    await book.xlsx.load(await validationBatchTemplate(kind));
    const sheet = book.worksheets[0];
    assert.equal(sheet.columnCount, count);
    assert.equal(sheet.rowCount, 1);
    assert.doesNotMatch(
      sheet.columns
        .map((_, index) => sheet.getCell(1, index + 1).text)
        .join('|'),
      /bağlantı|İşlem türü/,
    );
    sheet.addRow(values);
    const input = await source(book),
      preview = await previewValidationBatch(store, input);
    assert.equal(preview.defaultKind, kind);
    assert.equal(preview.counts.new, 1);
    const row = preview.items[0].values;
    assert.equal(row.kind, kind);
    assert.equal(row.schoolUrl, schoolUrl);
    assert.equal(row.schoolId, 'S1');
    assert.equal(
      preview.drafts[0].recipient,
      kind === 'merger' ? 'tretwinning@gmail.com' : 'validasyonetw@gmail.com',
    );
    assert.equal(
      caseDraft(row, 'request', 'TEST', 'TEST').recipient,
      preview.drafts[0].recipient,
    );
    if (kind === 'person' || kind === 'membership') {
      assert.equal(row.profileUrl, personUrl);
      assert.equal(row.accountId, 'P1');
    }
    if (kind === 'merger') {
      assert.equal(row.mergeSchoolId, 'S2');
      assert.equal(row.mergeSchoolUrl, schoolUrl + '3');
    }
    commitValidationBatch(store, preview, {
      ...input,
      token: preview.token,
      confirmed: true,
    });
    const saved = validationBatches(store)[0].rows;
    const exported = await validationBatchWorkbook(saved),
      reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(exported);
    assert.equal(
      reloaded.worksheets[0].getCell(
        kind === 'school' || kind === 'merger' ? 'B2' : 'D2',
      ).value.hyperlink,
      schoolUrl,
    );
    const roundTrip = await previewValidationBatch(store, {
      name: 'TEST.xlsx',
      data: exported.toString('base64'),
    });
    assert.equal(roundTrip.counts.existing, 1);
    assert.equal(roundTrip.counts.new, 0);
  }
});

test('Birleştirme hedefleri ayrı satırdır; aynı ID ve çelişen/güvensiz köprüler reddedilir', async (t) => {
  const store = setup(t),
    book = new ExcelJS.Workbook();
  await book.xlsx.load(await validationBatchTemplate('merger'));
  const sheet = book.worksheets[0];
  sheet.addRow(['TEST ana', 'S1', 'TEST ikinci', 'S2', 'TEST']);
  sheet.addRow(['TEST ana', 'S1', 'TEST üçüncü', 'S3', 'TEST']);
  sheet.addRow(['TEST ana', 'S1', 'TEST ana', 'S1', 'TEST']);
  let preview = await previewValidationBatch(store, await source(book));
  assert.equal(preview.counts.new, 2);
  assert.equal(preview.counts.invalid, 1);
  const bad = new ExcelJS.Workbook(),
    s = bad.addWorksheet('Hesap onayı');
  s.addRow(['Ad soyad', 'Kişi ID', 'Kişi profil bağlantısı']);
  s.addRow([linked('TEST', personUrl), 'P1', personUrl + '2']);
  s.addRow([linked('TEST', 'javascript:alert(1)'), 'P2', '']);
  preview = await previewValidationBatch(store, await source(bad));
  assert.equal(preview.counts.invalid, 2);
  assert.equal(store.validation.list().length, 0);
});

test('Ortak E-Tablo başlıkları ve gönderilecek sekmesi tanınır; sonuç hücresi onay vermez', async (t) => {
  const store = setup(t),
    book = new ExcelJS.Workbook();
  book.addWorksheet('Arşiv - Eski Taslak').state = 'hidden';
  const sheet = book.addWorksheet('Gönderilecek Talepler');
  sheet.addRow([
    'İL',
    'Öğretmen ID',
    'Ad-Soyad',
    'Okul ID',
    'Doğrulanacak Okulun Adı',
    'Talep edilen işlem',
    'Talep türü',
    'Mevcut durum',
    'Kontrol sonucu / gerekçe',
    'Sonuç',
  ]);
  sheet.addRow([
    'Erzurum',
    'P1',
    linked('TEST Kişi', personUrl),
    'S1',
    linked('TEST Okul', schoolUrl),
    'TEST üyelik onayı',
    'Organizasyon değişikliği',
    'Bekliyor',
    'TEST ayrıntılı gerekçe',
    'Onaylandı',
  ]);
  const input = await source(book),
    preview = await previewValidationBatch(store, input);
  assert.equal(preview.sheet, 'Gönderilecek Talepler');
  assert.equal(preview.counts.new, 1);
  const row = preview.items[0].values;
  assert.equal(row.reason, 'TEST ayrıntılı gerekçe');
  assert.equal(row.kind, 'membership');
  assert.equal(row.profileUrl, personUrl);
  commitValidationBatch(store, preview, {
    ...input,
    token: preview.token,
    confirmed: true,
  });
  assert.equal(store.validation.list()[0].status, 'review');
  assert.equal((await previewValidationBatch(store, input)).counts.existing, 1);
});

test('Ortak iletişim bilgileri il kimliğini değiştirmez; sürüm, bağlantı ve yedek doğrulanır', (t) => {
  const store = setup(t),
    contacts = {
      email: 'test@example.org',
      sheetUrl:
        'https://docs.google.com/spreadsheets/d/TEST/edit?gid=123#gid=123',
    };
  const revision = store.state().revision;
  store.saveContacts({
    ...contacts,
    revision,
    province: '06',
    operator: 'OTHER',
  });
  assert.deepEqual(store.meta('settings').contacts, contacts);
  assert.equal(store.meta('settings').province, '25');
  assert.equal(store.meta('settings').operator, 'TEST');
  assert.throws(() => store.saveContacts({ ...contacts, revision }), /değişti/);
  for (const sheetUrl of [
    'javascript:alert(1)',
    'https://docs.google.com.evil.org/spreadsheets/d/TEST/edit',
    'https://user:pass@docs.google.com/spreadsheets/d/TEST/edit',
    'https://docs.google.com/forms/d/TEST/edit',
  ])
    assert.throws(
      () =>
        store.saveContacts({
          ...contacts,
          sheetUrl,
          revision: store.state().revision,
        }),
      /E-Tablo/,
    );
  const archive = store.exportArchive();
  store.restoreArchive(archive, '25');
  assert.deepEqual(store.meta('settings').contacts, contacts);
  assert.throws(
    () =>
      store.restoreArchive(
        {
          ...archive,
          settings: {
            ...archive.settings,
            contacts: { ...contacts, sheetUrl: 'https://evil.org' },
          },
        },
        '25',
      ),
    /E-Tablo/,
  );
});

test('Google E-Tablo HYPERLINK sabit metinleri okunur; hesaplanan formül çalıştırılmaz', async (t) => {
  const store = setup(t),
    book = new ExcelJS.Workbook(),
    sheet = book.addWorksheet('Hesap onayı');
  sheet.addRow(['Ad soyad', 'Kişi ID', 'Okul adı', 'Okul ID', 'Açıklama']);
  sheet.addRow([
    { formula: `HYPERLINK("${personUrl}","TEST ""Ad""")` },
    'P1',
    { formula: `HYPERLINK("${schoolUrl}";"TEST Okul")` },
    'S1',
    'TEST',
  ]);
  sheet.addRow([
    { formula: 'HYPERLINK(A1,"TEST hesaplanan")', result: 'TEST hesaplanan' },
    'P2',
    'TEST okul',
    'S1',
    'TEST',
  ]);
  const preview = await previewValidationBatch(store, await source(book));
  assert.equal(preview.counts.new, 2);
  assert.equal(preview.items[0].values.name, 'TEST "Ad"');
  assert.equal(preview.items[0].values.profileUrl, personUrl);
  assert.equal(preview.items[0].values.schoolUrl, schoolUrl);
  assert.equal(preview.items[1].values.profileUrl, '');
});
