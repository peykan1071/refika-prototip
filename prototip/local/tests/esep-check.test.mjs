import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../store.mjs';
import { cleanEsepCheck } from '../esep-check.mjs';
import {
  validationPeriodSummary,
  validationPeriodWorkbook,
} from '../validation-periods.mjs';
import ExcelJS from 'exceljs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { startLocal } from '../server.mjs';

const base =
  'https://school-education.ec.europa.eu/en/nso-desktop/registrations/';
function check(at = '2026-09-05T09:00:00Z') {
  return {
    checkedAt: at,
    note: 'ESEP ekranında okundu.',
    person: {
      id: '42',
      status: 'validated',
      checkedAt: at,
      sourceUrl: base + 'etwinners?keywords=42',
      profileUrl: base + 'etwinners/9042',
      sourceLabel: 'eTwinning validated',
    },
    school: {
      id: '51',
      status: 'validated',
      checkedAt: at,
      sourceUrl: base + 'schools?keyword=51',
      profileUrl: base + 'schools/9051',
      sourceLabel: 'eTwinning validated',
    },
    membership: {
      id: '51',
      status: 'pending',
      checkedAt: at,
      sourceUrl: base + 'etwinners/9042',
      sourceLabel: 'Örnek okul / Member / Pending',
    },
  };
}
function setup(t, completed = true) {
  const store = new Store(':memory:');
  store.setup({ province: '25', operator: 'Test', year: '2026–2027' });
  t.after(() => store.close());
  const row = store.validation.importHistory({
    kind: 'person',
    title: 'Örnek talep',
    name: 'Örnek Kişi',
    accountId: '42',
    school: 'Örnek okul',
    schoolId: '51',
    reason: 'Arşiv',
    requestedAction: 'Hesap onayı',
    happenedAt: '2026-01-05T09:00:00Z',
    messageUrl: 'https://example.org/request',
    note: 'Kaynak kaydı',
    confirmed: true,
    ...(completed
      ? {
          result: {
            outcome: 'approved',
            happenedAt: '2026-01-06T09:00:00Z',
            evidenceUrl: 'https://example.org/result',
            note: 'Onay bildirimi',
            dateBasis: 'notification',
          },
        }
      : {}),
  });
  return { store, row };
}
void test('Canlı ESEP kontrolü geçmiş sonucu, tarihini ve numarasını korur; gerçek profil ID farklı olabilir', async (t) => {
  const { store, row } = setup(t);
  const before = validationPeriodSummary(store, 2026);
  const updated = store.validation.recordEsepCheck(row.id, {
    version: row.version,
    confirmed: true,
    check: check(),
  });
  assert.equal(updated.status, row.status);
  assert.equal(updated.resolvedAt, row.resolvedAt);
  assert.equal(updated.profileUrl, base + 'etwinners/9042');
  assert.equal(updated.accountId, '42');
  const after = validationPeriodSummary(store, 2026);
  assert.deepEqual(after.annual, before.annual);
  assert.equal(after.results[0].reference, before.results[0].reference);
  assert.equal(after.results[0].esepCheck.membership.status, 'pending');
  assert.equal(after.requests[0].schoolUrl, updated.schoolUrl);
  const count = store.validation.events(row.id).length;
  store.validation.recordEsepCheck(row.id, {
    version: updated.version,
    confirmed: true,
    check: check(),
  });
  assert.equal(store.validation.events(row.id).length, count);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await validationPeriodWorkbook(after));
  const sheet = wb.getWorksheet('Tarihli sonuçlar');
  const header = sheet.getRow(1).values;
  assert.equal(
    sheet.getRow(2).getCell(header.indexOf('Okul profil bağlantısı')).value,
    updated.schoolUrl,
  );
  const archive = store.exportArchive();
  store.restoreArchive(archive, '25');
  assert.deepEqual(store.validation.get(row.id).esepCheck, updated.esepCheck);
  assert.equal(
    store.validation.events(row.id).filter((e) => e.type === 'esep-check')
      .length,
    1,
  );
});
void test('Bekleyen dosyada güncel onay görülmesi geçmişe onay tarihi üretmez', (t) => {
  const { store, row } = setup(t, false);
  const updated = store.validation.recordEsepCheck(row.id, {
    version: row.version,
    confirmed: true,
    check: check(),
  });
  assert.equal(updated.status, 'waiting');
  assert.equal(updated.resolvedAt, '');
  assert.equal(validationPeriodSummary(store, 2026).annual.validatedPeople, 0);
});
void test('Yanlış ID, kaynak, durum, tarih ve sürüm kontrol kayıtlarına giremez', (t) => {
  const { store, row } = setup(t);
  const write = (data) =>
    store.validation.recordEsepCheck(row.id, {
      version: row.version,
      confirmed: true,
      check: data,
    });
  for (const patch of [
    { id: '99' },
    { status: 'invented' },
    { sourceUrl: 'https://example.org/' },
    { sourceUrl: '' },
    { profileUrl: '' },
    { profileUrl: 'javascript:alert(1)' },
    { sourceLabel: '' },
    { checkedAt: '2026-09-06T09:00:00Z' },
  ])
    assert.throws(() =>
      write({ ...check(), person: { ...check().person, ...patch } }),
    );
  assert.throws(
    () => cleanEsepCheck(check('2099-01-01T00:00:00Z'), row),
    /ileri/,
  );
  assert.throws(
    () =>
      store.validation.recordEsepCheck(row.id, {
        version: row.version,
        confirmed: false,
        check: check(),
      }),
    /teyidi/,
  );
  const saved = write(check());
  assert.throws(() => write(check()), /başka bir pencerede/);
  assert.throws(
    () =>
      store.validation.recordEsepCheck(row.id, {
        version: saved.version,
        confirmed: true,
        check: check('2026-09-04T00:00:00Z'),
      }),
    /eski/,
  );
});
void test('Kimlik değişince güncel kontrol ayrılır; eski kaynak ve gözlem geçmişte kalır', (t) => {
  const { store, row } = setup(t);
  store.validation.recordEsepCheck(row.id, {
    version: row.version,
    confirmed: true,
    check: check(),
  });
  store.validation.progress(row.id, {
    version: store.validation.get(row.id).version,
    type: 'reopen',
    happenedAt: '2026-09-06T09:00:00Z',
    note: 'Yeni inceleme',
  });
  store.validation.save({
    ...store.validation.get(row.id),
    accountId: '99',
    status: 'review',
  });
  assert.equal(store.validation.get(row.id).esepCheck, undefined);
  assert.equal(
    validationPeriodSummary(store, 2026).results[0].esepCheck,
    undefined,
  );
  assert.equal(
    store.validation.events(row.id).find((e) => e.type === 'esep-check')
      .esepCheck.person.id,
    '42',
  );
});
void test('ESEP kontrol API’si oturum ve kaynak denetimi uygular; kapalı talebi tekrar açmaz', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'refika-esep-'));
  await writeFile(join(dir, 'index.html'), '<html>Test</html>');
  const service = await startLocal({ dataDir: dir, staticDir: dir, env: {} });
  t.after(async () => {
    await service.close();
    if (!resolve(dir).startsWith(resolve(tmpdir()) + sep + 'refika-esep-'))
      throw new Error('Geçersiz test dizini');
    await rm(dir, { recursive: true, force: true });
  });
  const { store, row } = setup(t);
  service.store.restoreArchive(store.exportArchive(), '25');
  const current = service.store.validation.get(row.id);
  const cookie = (await fetch(service.url)).headers
    .get('set-cookie')
    .split(';')[0];
  const url = service.url + '/api/validation/' + row.id + '/esep-check';
  const body = JSON.stringify({
    version: current.version,
    confirmed: true,
    check: check(),
  });
  assert.equal(
    (
      await fetch(url, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json', Origin: service.url },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(url, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
          Origin: 'https://example.org',
        },
      })
    ).status,
    403,
  );
  const response = await fetch(url, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: service.url,
    },
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).esepCheck.person.status, 'validated');
  assert.equal(service.store.validation.get(row.id).status, 'completed');
});
