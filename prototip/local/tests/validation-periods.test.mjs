import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { startLocal } from '../server.mjs';
import { Store } from '../store.mjs';
import {
  validationPeriod,
  validationPeriodSummary,
  validationPeriodWorkbook,
} from '../validation-periods.mjs';

function setup(t) {
  const store = new Store(':memory:');
  store.setup({ province: '25', operator: 'Test', year: '2026–2027' });
  t.after(() => store.close());
  return store;
}
function history(patch = {}) {
  return {
    kind: 'person',
    title: 'Test tarihli talep',
    name: 'Örnek Kişi',
    accountId: 'TEST-42',
    school: 'Örnek okul',
    schoolId: 'TEST-S',
    reason: 'Kaynak eşleşmesi',
    requestedAction: 'Hesap onayı talebi',
    happenedAt: '2026-01-05T09:00:00+03:00',
    messageUrl: 'https://example.org/mail/request-1',
    note: 'Gönderilmiş kaynaktaki ID ve okul eşleştirildi.',
    confirmed: true,
    result: {
      outcome: 'approved',
      happenedAt: '2026-01-06T10:00:00+03:00',
      evidenceUrl: 'https://example.org/mail/result-1',
      note: 'Bu hesaba ait onay bildirimi.',
      dateBasis: 'notification',
    },
    ...patch,
  };
}
void test('Dört dönem sonuç tarihine göre ayrılır; yıllık kişi hesabı tekrarlanmaz', (t) => {
  const s = setup(t);
  s.validation.importHistory(history());
  s.validation.importHistory(
    history({
      messageUrl: 'https://example.org/mail/request-2',
      happenedAt: '2026-03-31T17:00:00Z',
      result: { ...history().result, happenedAt: '2026-03-31T21:05:00Z' },
    }),
  );
  s.validation.importHistory(
    history({
      kind: 'membership',
      messageUrl: 'https://example.org/mail/membership',
    }),
  );
  s.validation.importHistory(
    history({ accountId: 'TEST-PENDING', result: undefined }),
  );
  const data = validationPeriodSummary(s, 2026);
  assert.equal(data.annual.validatedPeople, 1);
  assert.equal(data.annual.personApprovals, 2);
  assert.equal(data.quarters[0].validatedPeople, 1);
  assert.equal(data.quarters[1].validatedPeople, 1);
  assert.equal(data.quarters[2].validatedPeople, 0);
  assert.equal(data.annual.membershipApprovals, 1);
  assert.equal(data.requests.length, 4);
  assert.equal(
    data.results.find((r) => r.date === '2026-04-01').dateBasis,
    'notification',
  );
  assert.equal(validationPeriodSummary(s, 2026, 2).results.length, 1);
  assert.equal(validationPeriod(2024, 1).to, '2024-03-31');
  assert.throws(() => validationPeriod(2026, 5), /Geçerli/);
});
void test('Geçmiş kayıt tekrar aktarılmaz; onay ve kaynak zorunlu, kontroller uydurulmaz', (t) => {
  const s = setup(t);
  assert.throws(
    () => s.validation.importHistory(history({ confirmed: false })),
    /teyidi/,
  );
  assert.throws(
    () => s.validation.importHistory(history({ messageUrl: '' })),
    /bağlantısı/,
  );
  assert.throws(
    () => s.validation.importHistory(history({ accountId: '' })),
    /hesap ID/,
  );
  assert.throws(
    () =>
      s.validation.importHistory(
        history({ result: { ...history().result, evidenceUrl: '' } }),
      ),
    /kaynağı/,
  );
  assert.throws(
    () =>
      s.validation.importHistory(
        history({
          result: { ...history().result, happenedAt: '2025-01-01T00:00:00Z' },
        }),
      ),
    /önce/,
  );
  const first = s.validation.importHistory(history());
  const second = s.validation.importHistory(history());
  assert.equal(first.id, second.id);
  assert.equal(second.alreadyImported, true);
  assert.equal(s.validation.events(first.id).length, 2);
  assert.ok(Object.values(first.checks).every((r) => r.status === 'unknown'));
  assert.throws(
    () => s.validation.save({ ...first, status: 'ready' }),
    /yeniden incelemeye/,
  );
});
void test('Eski sonuç kimliği yeniden açılan dosya değişse de korunur; yeni sonuç tarihi eklenir', (t) => {
  const s = setup(t);
  let row = s.validation.importHistory(history());
  s.validation.progress(row.id, {
    version: row.version,
    type: 'reopen',
    happenedAt: '2026-02-01T00:00:00Z',
    note: 'Yeni inceleme',
  });
  row = s.validation.get(row.id);
  s.validation.save({
    ...row,
    name: 'Yeni kişi',
    accountId: 'DIFFERENT',
    status: 'review',
  });
  const old = validationPeriodSummary(s, 2026).results[0];
  assert.equal(old.accountId, 'TEST-42');
  assert.equal(old.name, 'Örnek Kişi');
  assert.equal(old.currentStatus, 'review');
});
void test('Bekleyen geçmiş talebe normal sonuç eklenir ve mükerrer sonuç engellenir', (t) => {
  const s = setup(t);
  const row = s.validation.importHistory(history({ result: undefined }));
  s.validation.progress(row.id, {
    version: row.version,
    type: 'result',
    happenedAt: '2026-02-02T00:00:00Z',
    outcome: 'approved',
    note: 'Yeni yanıt doğrulandı.',
    confirmed: true,
    dateBasis: 'notification',
  });
  const result = validationPeriodSummary(s, 2026).results[0];
  assert.equal(result.date, '2026-02-02');
  assert.equal(result.accountId, row.accountId);
  assert.equal(result.dateBasis, 'notification');
  assert.throws(
    () =>
      s.validation.progress(row.id, {
        version: s.validation.get(row.id).version,
        type: 'result',
        happenedAt: '2026-02-03T00:00:00Z',
        outcome: 'approved',
        note: 'Tekrar',
        confirmed: true,
      }),
    /teyidi/,
  );
});
void test('Tarihli kayıtlar yedekten döner; Excel ayrı sonuç ve gönderim sayfalarını içerir', async (t) => {
  const s = setup(t);
  s.validation.importHistory(history());
  const before = validationPeriodSummary(s, 2026);
  const restored = setup(t);
  restored.restoreArchive(s.exportArchive(), '25');
  const after = validationPeriodSummary(restored, 2026);
  assert.deepEqual(after.results, before.results);
  assert.deepEqual(after.requests, before.requests);
  assert.equal(
    restored.validation.importHistory(history()).alreadyImported,
    true,
  );
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await validationPeriodWorkbook(after));
  assert.equal(book.getWorksheet('Tarihli sonuçlar').rowCount, 2);
  assert.equal(book.getWorksheet('Tarihli gönderimler').rowCount, 2);
  assert.equal(
    book.getWorksheet('Tarihli sonuçlar').getCell('G2').value,
    'TEST-42',
  );
  assert.match(
    book.getWorksheet('Rapor metni ve açıklama').getCell('A2').value,
    /1 kişi hesabı/,
  );
});

void test('Dönem API ve geçmiş aktarım yetki, tarih ve Excel çıktısını denetler', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'refika-periods-'));
  let service;
  try {
    const ui = join(dir, 'ui');
    await mkdir(ui);
    await writeFile(join(ui, 'index.html'), '<html>TEST</html>');
    service = await startLocal({ dataDir: dir, staticDir: ui, env: {} });
    const cookie = (await fetch(service.url)).headers
      .get('set-cookie')
      .split(';')[0];
    const req = (path, body) =>
      fetch(service.url + '/api' + path, {
        headers: {
          Cookie: cookie,
          Origin: service.url,
          'Content-Type': 'application/json',
        },
        ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
      });
    assert.equal(
      (await fetch(service.url + '/api/validation-periods?year=2026')).status,
      401,
    );
    await req('/setup', {
      province: '25',
      operator: 'Test',
      year: '2026–2027',
    });
    assert.equal((await req('/validation-history', history())).status, 200);
    assert.equal(
      (await req('/validation-periods?year=2026&quarter=9')).status,
      400,
    );
    const summary = await (
      await req('/validation-periods?year=2026&quarter=1')
    ).json();
    assert.equal(summary.totals.validatedPeople, 1);
    assert.equal(summary.results[0].dateBasis, 'notification');
    const workbook = new ExcelJS.Workbook();
    const response = await req(
      '/validation-periods?year=2026&quarter=1&format=xlsx',
    );
    assert.equal(response.status, 200);
    await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
    assert.equal(workbook.getWorksheet('Tarihli gönderimler').rowCount, 2);
    assert.match(
      await (await req('/validation-periods?year=2026&format=txt')).text(),
      /benzersiz/,
    );
  } finally {
    if (service) await service.close();
    assert.ok(
      resolve(dir).startsWith(resolve(tmpdir()) + sep + 'refika-periods-'),
      'Geçersiz test dizini',
    );
    await rm(dir, { recursive: true, force: true });
  }
});
