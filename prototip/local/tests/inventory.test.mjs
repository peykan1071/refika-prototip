import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { startLocal } from '../server.mjs';
import { Store } from '../store.mjs';
import { workbookBuffer } from '../imports.mjs';
import {
  previewInventory,
  commitInventory,
  inventoryWorkbook,
} from '../inventory.mjs';
import { threeMonthsAfter } from '../inventory-fields.mjs';
import {
  previewValidationBatch,
  commitValidationBatch,
  updateValidationBatch,
  validationBatches,
} from '../validation-batches.mjs';

const url =
  'https://school-education.ec.europa.eu/en/nso-desktop/registrations/';
const headers = [
  'ESEP ID',
  'İsim',
  'İl',
  'Status',
  'Membership status',
  'Validation',
  'İl ilişkisi',
  'Okul ID',
  'Okul adı',
  'Email',
  'Telefon',
];
const person = (id, name, activity = 'Dormant', school = 'S1') => [
  id,
  name,
  'ERZURUM',
  'eTwinning validated',
  activity,
  'Validated',
  'Güncel',
  school,
  'TEST Okul',
  'PRIVATE@example.org',
  'PRIVATE-TELEFON',
];
function setup(t) {
  const store = new Store(':memory:');
  store.setup({ province: '25', operator: 'TEST', year: '2026–2027' });
  t.after(() => store.close());
  return store;
}
async function input(rows, extra = {}) {
  return {
    kind: 'person',
    province: '25',
    observedOn: '2026-01-31',
    name: 'TEST-envanter.xlsx',
    data: (await workbookBuffer(headers, rows)).toString('base64'),
    ...extra,
  };
}
async function save(store, source, confirmMissing = false) {
  const p = await previewInventory(store, source);
  commitInventory(store, p, { ...source, token: p.token, confirmMissing });
  return p;
}
test('Envanter ID ile tekilleşir, çoklu okulları birleştirir; telefon/e-posta alınmaz ve aktif/onay birbirine karışmaz', async (t) => {
  const store = setup(t);
  const source = await input([
    person('P1', 'TEST Kişi'),
    person('P1', 'TEST Kişi', 'Dormant', 'S2'),
  ]);
  const p = await save(store, source);
  assert.equal(p.rows.length, 1);
  let view = store.inventory.view();
  assert.equal(view.rows.length, 1);
  assert.equal(view.rows[0].schools.length, 2);
  assert.equal(view.statistics.person.activity.dormant, 1);
  assert.equal(view.statistics.person.activity.active, 0);
  assert.equal(view.statistics.person.validation.validated, 1);
  assert.doesNotMatch(
    JSON.stringify(store.inventory.archive()),
    /PRIVATE|Email|Telefon/,
  );
  assert.equal(store.validation.list().length, 0);
  assert.equal((await previewInventory(store, source)).duplicate, true);
  const noActivity = person('P2', 'TEST Onay');
  noActivity[4] = '';
  await save(store, await input([noActivity]));
  view = store.inventory.view();
  assert.equal(view.rows.find((r) => r.recordId === 'P2').activity, 'unknown');
});
test('Okul adı aynı ID ile güncellenir, kişi görünümüne yansır; hyperlink ID görünen ESEP ID yerine geçmez', async (t) => {
  const store = setup(t);
  const book = new ExcelJS.Workbook(),
    sheet = book.addWorksheet('Okullar');
  sheet.addRow(['ID', 'Name', 'Region', 'Status']);
  sheet.addRow([
    'S1',
    { text: 'TEST Eski Okul', hyperlink: url + 'schools/999' },
    'Erzurum',
    'Not validated',
  ]);
  const source = {
    kind: 'school',
    province: '25',
    observedOn: '2026-02-01',
    name: 'TEST.xlsx',
    data: Buffer.from(await book.xlsx.writeBuffer()).toString('base64'),
  };
  await save(store, source);
  await save(store, await input([person('P1', 'TEST Kişi')]));
  sheet.getCell('B2').value = {
    text: 'TEST Yeni Okul',
    hyperlink: url + 'schools/999',
  };
  await save(store, {
    ...source,
    observedOn: '2026-02-02',
    data: Buffer.from(await book.xlsx.writeBuffer()).toString('base64'),
  });
  const view = store.inventory.view();
  assert.equal(view.rows.filter((r) => r.kind === 'school').length, 1);
  const school = view.rows.find((r) => r.kind === 'school');
  assert.equal(school.recordId, 'S1');
  assert.equal(school.profileUrl, url + 'schools/999');
  assert.equal(school.changes[0].before.name, 'TEST Eski Okul');
  assert.equal(
    view.rows.find((r) => r.kind === 'person').schools[0].name,
    'TEST Yeni Okul',
  );
});
test('Kısmi liste kayıt eksiltmez; tam liste yokları işaretler, açık onay ister; eski kaynak ve stale önizleme reddedilir', async (t) => {
  const store = setup(t);
  await save(
    store,
    await input([person('P1', 'TEST A'), person('P2', 'TEST B')], {
      complete: true,
      expectedCount: 2,
    }),
  );
  await save(
    store,
    await input([person('P1', 'TEST A')], { observedOn: '2026-02-01' }),
  );
  assert.equal(store.inventory.view().statistics.person.missing, 0);
  let source = await input([person('P1', 'TEST A')], {
    observedOn: '2026-02-02',
    complete: true,
    expectedCount: 1,
  });
  let preview = await previewInventory(store, source);
  assert.equal(preview.missing.length, 1);
  assert.throws(
    () => commitInventory(store, preview, { token: preview.token }),
    /inceleyip/,
  );
  commitInventory(store, preview, {
    token: preview.token,
    confirmMissing: true,
  });
  const view = store.inventory.view();
  assert.equal(view.statistics.person.imported, 1);
  assert.equal(view.statistics.person.missing, 1);
  assert.equal(view.rows.find((r) => r.recordId === 'P2').activity, 'dormant');
  await assert.rejects(
    () => previewInventory(store, { ...source, observedOn: '2025-01-01' }),
    /eski/,
  );
  source = await input([person('P2', 'TEST B')], { observedOn: '2026-02-03' });
  preview = await previewInventory(store, source);
  store.log('TEST başka pencerede değişiklik');
  const updated = await previewInventory(store, source);
  assert.throws(
    () => commitInventory(store, updated, { token: preview.token }),
    /Önizleme değişti/,
  );
  await save(store, source);
  assert.equal(store.inventory.view().statistics.person.missing, 0);
});
test('İl, tarih, toplam, çelişen ID ve kötü bağlantı hataları hiçbir satırı kaydetmez', async (t) => {
  const store = setup(t);
  for (const extra of [
    { province: '06' },
    { observedOn: '2099-01-01' },
    { observedOn: '2026-02-30' },
  ]) {
    const source = await input([person('P1', 'TEST')], extra);
    await assert.rejects(() => previewInventory(store, source));
  }
  for (const [rows, extra] of [
    [[person('P1', 'TEST A'), person('P1', 'TEST B')], {}],
    [[person('P1', 'TEST')], { complete: true, expectedCount: 999 }],
    [[['P1', 'TEST', 'Ankara']], {}],
  ]) {
    const source = await input(rows, extra),
      p = await previewInventory(store, source);
    assert.throws(() => commitInventory(store, p, { token: p.token }));
  }
  const book = new ExcelJS.Workbook(),
    sheet = book.addWorksheet('Test');
  sheet.addRow(['ID', 'Name']);
  sheet.addRow(['P1', { text: 'TEST', hyperlink: 'https://evil.example/1' }]);
  const source = await input([], {
    data: Buffer.from(await book.xlsx.writeBuffer()).toString('base64'),
  });
  const p = await previewInventory(store, source);
  assert.match(p.items[0].error, /resmi ESEP/);
  assert.equal(store.inventory.view().rows.length, 0);
});
test('Üç aylık hatırlatma tam kaynak tarihinden hesaplanır; eski yedekler ve envanterli yedek güvenle geri yüklenir', async (t) => {
  const store = setup(t);
  assert.equal(threeMonthsAfter('2026-01-31'), '2026-04-30');
  assert.equal(threeMonthsAfter('2023-11-30'), '2024-02-29');
  assert.equal(threeMonthsAfter('2026-12-31'), '2027-03-31');
  await save(
    store,
    await input([person('P1', 'TEST')], { complete: true, expectedCount: 1 }),
  );
  await save(
    store,
    await input([person('P1', 'TEST')], { observedOn: '2026-03-01' }),
  );
  assert.equal(
    store.inventory.reminders(new Date('2026-04-30T12:00:00Z'))[0].due,
    true,
  );
  assert.equal(store.inventory.reminders()[0].dueOn, '2026-04-30');
  const archive = store.exportArchive();
  assert.equal(archive.version, 5);
  store.restoreArchive(archive, '25');
  assert.equal(store.inventory.view().rows.length, 1);
  const broken = structuredClone(archive);
  broken.inventory.imports[0].rows[0].name = 'TAMPERED';
  assert.throws(() => store.restoreArchive(broken, '25'), /bütünlük/);
  assert.equal(store.inventory.view().rows[0].name, 'TEST');
  store.restoreArchive({ ...archive, version: 4, inventory: undefined }, '25');
  assert.equal(store.inventory.view().rows.length, 0);
  assert.ok(store.inventory.reminders().every((r) => r.due && !r.lastOn));
});
test('Onay maili envantere otomatik bağlanır; ESEP dormant bilgisi ve dönem sonuçları korunur', async (t) => {
  const store = setup(t);
  const source = {
    name: 'TEST.xlsx',
    data: (
      await workbookBuffer(
        ['İşlem türü', 'Ad soyad', 'Kişi ID', 'Okul adı', 'Okul ID', 'İl'],
        [
          ['Kişi', 'TEST A', 'P1', 'TEST Okul', 'S1', 'Erzurum'],
          ['Okul', '', '', 'TEST Okul', 'S1', 'Erzurum'],
          ['Üyelik', 'TEST B', 'P2', 'TEST Okul B', 'S2', 'Erzurum'],
        ],
      )
    ).toString('base64'),
  };
  const p = await previewValidationBatch(store, source);
  commitValidationBatch(store, p, {
    ...source,
    token: p.token,
    confirmed: true,
  });
  const evidence = {
    happenedAt: '2026-02-01T09:00:00+03:00',
    note: 'TEST gönderim',
    evidenceUrl: 'https://example.org/sent',
    confirmed: true,
  };
  let batch = validationBatches(store)[0];
  const selections = (b) => b.rows.map(({ id, version }) => ({ id, version }));
  updateValidationBatch(store, batch.id, 'sent', {
    ...evidence,
    rows: selections(batch),
  });
  batch = validationBatches(store)[0];
  updateValidationBatch(store, batch.id, 'result', {
    ...evidence,
    rows: selections(batch),
    outcome: 'approved',
    happenedAt: '2026-02-02T09:00:00+03:00',
  });
  assert.equal(store.inventory.view().rows.length, 2);
  assert.equal(store.inventory.view().membershipApprovals, 1);
  assert.equal(store.inventory.view().statistics.person.validationOnly, 1);
  const before = JSON.stringify(store.validation.archive());
  await save(
    store,
    await input([person('P1', 'TEST A')], { observedOn: '2026-02-03' }),
  );
  const view = store.inventory.view();
  assert.equal(view.rows.length, 2);
  assert.equal(view.statistics.person.validationOnly, 0);
  assert.equal(view.rows.find((r) => r.kind === 'person').activity, 'dormant');
  assert.ok(view.rows.find((r) => r.kind === 'person').approval.resultNumber);
  assert.equal(JSON.stringify(store.validation.archive()), before);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await inventoryWorkbook(store, 'person'));
  assert.equal(book.worksheets[0].getCell('A2').text, 'P1');
  assert.doesNotMatch(JSON.stringify(book.model), /PRIVATE/);
});

test('Envanter API oturum, önizleme, kalıcı kaydetme ve Excel indirmeyi uygular', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'refika-inventory-api-'));
  await writeFile(join(dir, 'index.html'), '<html>TEST</html>');
  const service = await startLocal({ dataDir: dir, staticDir: dir, env: {} });
  t.after(async () => {
    await service.close();
    if (
      !resolve(dir).startsWith(
        resolve(tmpdir()) + sep + 'refika-inventory-api-',
      )
    )
      throw new Error('Test yolu geçersiz.');
    await rm(dir, { recursive: true, force: true });
  });
  service.store.setup({ province: '25', operator: 'TEST', year: '2026–2027' });
  const cookie = (await fetch(service.url)).headers
    .get('set-cookie')
    .split(';')[0];
  const request = (path, data) =>
    fetch(service.url + '/api' + path, {
      headers: {
        Cookie: cookie,
        Origin: service.url,
        'Content-Type': 'application/json',
      },
      ...(data ? { method: 'POST', body: JSON.stringify(data) } : {}),
    });
  assert.equal((await fetch(service.url + '/api/inventory')).status, 401);
  const source = await input([person('P1', 'TEST')], {
    complete: true,
    expectedCount: 1,
  });
  const previewResponse = await request('/inventory/preview', source);
  assert.equal(previewResponse.status, 200);
  const p = await previewResponse.json();
  const bad = await request('/inventory/commit', { ...source, token: 'wrong' });
  assert.equal(bad.status, 400);
  const result = await request('/inventory/commit', {
    ...source,
    token: p.token,
  });
  assert.equal(result.status, 200);
  assert.equal((await result.json()).count, 1);
  const view = await (await request('/inventory')).json();
  assert.equal(view.rows.length, 1);
  assert.equal(view.reminders[0].dueOn, '2026-04-30');
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(
    Buffer.from(
      await (await request('/inventory/export?kind=person')).arrayBuffer(),
    ),
  );
  assert.equal(book.worksheets[0].getCell('A2').text, 'P1');
});

test('Aynı gün düzeltilip önceki değere dönen kayıt tekrar sanılıp atlanmaz', async (t) => {
  const store = setup(t),
    original = await input([person('P1', 'TEST İlk Ad')]);
  await save(store, original);
  await save(store, await input([person('P1', 'TEST Düzeltilen Ad')]));
  assert.equal((await previewInventory(store, original)).duplicate, false);
  await save(store, original);
  assert.equal(store.inventory.view().rows[0].name, 'TEST İlk Ad');
  assert.equal(store.inventory.view().rows[0].changes.length, 2);
  const archive = store.exportArchive();
  store.restoreArchive(archive, '25');
  assert.equal(store.inventory.view().rows[0].name, 'TEST İlk Ad');
});
