import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import ExcelJS from 'exceljs';
import { Store } from '../store.mjs';
import { startLocal } from '../server.mjs';
import { encryptBackup, decryptBackup } from '../backup.mjs';
import {
  caseGroup,
  checkDefinitions,
  readyProblems,
  timestamp,
} from '../validation.mjs';

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
  const path = await mkdtemp(join(tmpdir(), 'refika-validation-'));
  t.after(async () => {
    if (
      !resolve(path).startsWith(resolve(tmpdir()) + sep + 'refika-validation-')
    )
      throw new Error('Geçersiz test dizini');
    await rm(path, { recursive: true, force: true });
  });
  return path;
}
function form(kind = 'person') {
  return {
    kind,
    title: 'Deneme dosyası',
    name: 'Örnek kişi',
    accountId: 'T-1',
    profileId: 'P-91',
    profileUrl: 'https://example.org/profile/91',
    email: 'test@example.org',
    school: 'Deneme Okulu',
    schoolId: 'S-1',
    schoolProfileId: 'P-92',
    schoolUrl: 'https://example.org/school/92',
    schoolEmail: 'okul@example.org',
    reason: 'Bekleyen talep incelendi.',
    requestedAction: 'İlgili talebin incelenmesi.',
    reviewedOn: '2026-09-01',
    reviewNote: 'Test resmî kaynak kaydı.',
    retainedProfile: 'P-92 https://example.org/school/92',
    relatedProfiles:
      'S-2, P-93; https://example.org/school/93; 2026-08-01; onaysız; proje yok',
    checks: Object.fromEntries(
      checkDefinitions[kind].map(([key]) => [
        key,
        { status: 'pass', note: 'Test kaynağından doğrulandı.' },
      ]),
    ),
    status: 'ready',
  };
}
const send = (row, purpose = 'request') => ({
  version: row.version,
  purpose,
  confirmed: true,
  channel: 'email',
  recipient: 'test@example.org',
  subject: 'TEST / Talep',
  body: 'Test gönderilen metin',
  happenedAt: '2026-09-02T10:00:00Z',
  proof: 'TEST-ILETI-1',
});

test('Düzenlenmiş taslak ve onay aşaması yeniden açılışta ve yedekte korunur; içerik değişince onay düşer', async (t) => {
  const path = join(await folder(t), 'draft.sqlite');
  let store = new Store(path);
  try {
    store.setup({ province: '25', operator: 'Test', year: '2026–2027' });
    let row = store.validation.save(form());
    const edit = {
      version: row.version,
      purpose: 'request',
      edit: true,
      stage: 'approval',
      recipient: 'test@example.org',
      subject: 'Özel konu',
      body: 'Koordinatörün düzenlediği metin.',
    };
    store.validation.draft(row.id, edit);
    assert.throws(
      () => store.validation.draft(row.id, edit),
      /başka bir pencerede/,
    );
    assert.equal(store.validation.get(row.id).status, 'ready');
    assert.equal(
      store.validation.events(row.id).some((e) => e.type === 'sent'),
      false,
    );
    store.close();
    store = new Store(path);
    assert.equal(store.validation.detail(row.id).currentDraft.body, edit.body);
    assert.equal(store.validation.list()[0].draftStage, 'approval');
    const archive = store.exportArchive();
    store.restoreArchive(archive, '25');
    assert.equal(
      store.validation.detail(row.id).currentDraft.subject,
      edit.subject,
    );
    row = store.validation.get(row.id);
    assert.throws(
      () =>
        store.validation.draft(row.id, {
          ...edit,
          version: row.version,
          body: '',
        }),
      /gerekli/,
    );
    store.validation.save({ ...row, requestedAction: 'Güncellenen talep' });
    assert.equal(store.validation.detail(row.id).currentDraft, null);
    assert.equal(store.validation.list()[0].draftStage, '');
    assert.equal(
      store.validation.events(row.id).find((e) => e.type === 'draft').body,
      edit.body,
    );
  } finally {
    store.close();
  }
});

test('Talep türüne özel eksikler gönderimi engeller; listeler talep türlerini ayırır', (t) => {
  const store = storeFor(t),
    v = store.validation;
  for (const kind of Object.keys(checkDefinitions)) {
    const values = form(kind),
      first = Object.keys(values.checks)[0];
    assert.throws(() => v.save({ ...values, checks: {} }), /doğrulama/);
    assert.throws(
      () =>
        v.save({
          ...values,
          checks: { ...values.checks, [first]: { status: 'pass', note: '' } },
        }),
      /dayanak/,
    );
    const saved = v.save(values);
    assert.equal(
      caseGroup(saved),
      kind === 'merger'
        ? 'merger'
        : kind === 'support'
          ? 'support'
          : 'approval',
    );
    assert.equal(caseGroup({ ...saved, status: 'review' }), 'review');
  }
  assert.ok(readyProblems({ ...form(), schoolEmail: '' }).length);
  assert.throws(() => timestamp('2026-02-30T10:00:00Z'), /tarih/);
  assert.throws(() => timestamp('2099-01-01T10:00:00Z'), /ileri/);
  assert.throws(
    () => v.save({ ...form(), profileUrl: 'javascript:alert(1)' }),
    /https/,
  );
});
test('Taslak ve bilgilendirme talep gönderimi sayılmaz; gerçek gönderimden sonra sonuç kaydedilir', (t) => {
  const store = storeFor(t),
    v = store.validation;
  let row = v.save(form());
  const draft = v.draft(row.id, { version: row.version, purpose: 'request' });
  assert.equal(draft.type, 'draft');
  row = v.get(row.id);
  assert.equal(row.status, 'ready');
  v.communicate(row.id, send(row, 'information'));
  row = v.get(row.id);
  assert.equal(row.status, 'ready');
  assert.throws(
    () => v.communicate(row.id, send(row, 'information')),
    /daha önce/,
  );
  assert.throws(
    () =>
      v.progress(row.id, {
        version: row.version,
        type: 'result',
        note: 'Sonuç',
        happenedAt: '2026-09-03T10:00:00Z',
        confirmed: true,
        outcome: 'approved',
      }),
    /teyidi/,
  );
  assert.throws(
    () => v.communicate(row.id, { ...send(row), confirmed: false }),
    /doğrulayın/,
  );
  assert.throws(
    () => v.communicate(row.id, { ...send(row), proof: '' }),
    /dayanağı/,
  );
  const sent = v.communicate(row.id, send(row));
  row = v.get(row.id);
  assert.equal(row.status, 'waiting');
  assert.equal(store.summary().waiting, 1);
  assert.throws(
    () => v.save({ ...row, title: 'Sessiz değişiklik' }),
    /yeniden incelemeye/,
  );
  assert.throws(() => v.communicate(row.id, send(row)), /gönderime hazır/);
  const result = {
    version: row.version,
    type: 'result',
    note: 'Resmî yanıt doğrulandı.',
    happenedAt: '2026-09-03T10:00:00Z',
    confirmed: true,
    outcome: 'approved',
  };
  assert.throws(
    () => v.progress(row.id, { ...result, happenedAt: '2026-09-01T10:00:00Z' }),
    /önce olamaz/,
  );
  v.progress(row.id, result);
  row = v.get(row.id);
  assert.equal(row.status, 'completed');
  v.progress(row.id, {
    version: row.version,
    type: 'reopen',
    note: 'Yeni bilgi geldi.',
    happenedAt: '2026-09-04T10:00:00Z',
  });
  row = v.get(row.id);
  assert.equal(row.status, 'review');
  assert.ok(Object.values(row.checks).every((c) => c.status === 'unknown'));
  assert.deepEqual(
    v.events(row.id).find((e) => e.id === sent.id).snapshot,
    sent.snapshot,
  );
  assert.equal(v.events(row.id).filter((e) => e.type === 'result').length, 1);
});
test('Eksik dosyaya bilgilendirme gönderilebilir; incelemede kalır', (t) => {
  const v = storeFor(t).validation;
  let row = v.save({
    ...form(),
    status: 'review',
    checks: {},
    holdReason: 'Görev yeri teyidi eksik.',
  });
  assert.throws(
    () => v.draft(row.id, { version: row.version, purpose: 'request' }),
    /hazır/,
  );
  const draft = v.draft(row.id, {
    version: row.version,
    purpose: 'information',
  });
  assert.match(draft.body, /Görev yeri teyidi eksik/);
  row = v.get(row.id);
  v.communicate(row.id, send(row, 'information'));
  assert.equal(v.get(row.id).status, 'review');
});
test('Kaynak değişikliği gönderimi engeller; aynı kaynağın iki açık aynı tür talebi olmaz', (t) => {
  const store = storeFor(t),
    v = store.validation;
  const source = store.put(
    'records',
    'SOURCE-1',
    {
      province: '25',
      accountId: 'T-1',
      name: 'Örnek kişi',
      schoolId: 'S-1',
      school: 'Deneme Okulu',
      status: 'review',
    },
    0,
  );
  let row = v.save({ ...form(), sourceRecordId: source.id });
  v.draft(row.id, {
    version: row.version,
    purpose: 'request',
    stage: 'approval',
  });
  row = v.get(row.id);
  assert.equal(store.summary().review, 0);
  assert.equal(store.summary().ready, 1);
  assert.throws(
    () => v.save({ ...form(), sourceRecordId: source.id }),
    /açık bir dosya/,
  );
  store.put(
    'records',
    source.id,
    { ...source, name: 'Yeni kaynak adı' },
    source.version,
  );
  assert.equal(v.detail(row.id).sourceChanged, true);
  assert.equal(v.detail(row.id).currentDraft, null);
  assert.equal(v.list()[0].draftStage, '');
  assert.throws(() => v.communicate(row.id, send(row)), /Kaynak kayıt değişti/);
  assert.throws(() => v.save({ ...row, status: 'ready' }), /Kaynak değişti/);
  row = v.save({ ...row, status: 'review' });
  assert.ok(Object.values(row.checks).every((c) => c.status === 'unknown'));
  assert.throws(() => v.save({ ...row, status: 'ready' }), /doğrulama/);
  row = v.save({
    ...row,
    name: 'Yeni kaynak adı',
    checks: form().checks,
    status: 'ready',
  });
  assert.equal(v.detail(row.id).sourceChanged, false);
  v.communicate(row.id, send(row));
});
test('Yeni dosyalar, gerçek gönderimler ve kanıtlar şifreli yedekte korunur; bozuk yedek atomik reddedilir', (t) => {
  const store = storeFor(t),
    v = store.validation;
  let row = v.save(form('merger'));
  const file = v.addFile(
    row.id,
    { version: row.version, name: 'kanıt.txt' },
    Buffer.from('Kalıcı test kanıtı'),
  );
  row = v.get(row.id);
  v.communicate(row.id, send(row));
  const archive = decryptBackup(
    encryptBackup(store.exportArchive(), 'Test-parolası-2026'),
    'Test-parolası-2026',
  );
  assert.equal(archive.version, 3);
  const events = v.events(row.id);
  store.restoreArchive(archive, '25');
  assert.equal(v.get(row.id).status, 'waiting');
  assert.deepEqual(v.events(row.id), events);
  assert.equal(
    Buffer.from(store.file(file.id).body).toString(),
    'Kalıcı test kanıtı',
  );
  assert.throws(
    () =>
      v.progress(row.id, {
        version: row.version,
        type: 'reply',
        note: 'Eski form',
        happenedAt: '2026-09-03T10:00:00Z',
      }),
    /başka bir pencerede/,
  );
  const before = store.exportArchive();
  for (const damage of [
    (a) => {
      a.validation.events[0].case_id = 'missing';
    },
    (a) => {
      a.validation.files[0].body = '';
    },
    (a) => {
      const e = JSON.parse(a.validation.events[0].body);
      e.messageUrl = 'javascript:alert(1)';
      a.validation.events[0].body = JSON.stringify(e);
    },
    (a) => {
      a.history = null;
    },
  ]) {
    const broken = structuredClone(archive);
    damage(broken);
    assert.throws(() => store.restoreArchive(broken, '25'));
    assert.deepEqual(store.exportArchive(), before);
  }
});
test('Eski sürüm yedeği desteklenir; yeni dosyalar eski yedeğe karıştırılmaz', (t) => {
  const store = storeFor(t),
    archive = store.exportArchive();
  archive.version = 1;
  delete archive.validation;
  delete archive.history;
  store.validation.save(form());
  store.restoreArchive(archive, '25');
  assert.equal(store.validation.list().length, 0);
  assert.equal(store.meta('settings').province, '25');
});
test('Sürüm 1 veri tabanı kayıpsız yükselir, yeniden açılır; gelecek sürüm reddedilir', async (t) => {
  const path = join(await folder(t), 'data.sqlite');
  let store = new Store(path);
  store.setup({ province: '25', operator: 'Test', year: '2026–2027' });
  store.put(
    'records',
    'SOURCE',
    { name: 'Korunan kayıt', status: 'review' },
    0,
  );
  store.db.exec(
    'DROP TABLE validation_files; DROP TABLE validation_events; DROP TABLE validation_cases; PRAGMA user_version=1;',
  );
  store.close();
  store = new Store(path);
  const row = store.validation.save(form());
  store.close();
  store = new Store(path);
  assert.equal(store.get('records', 'SOURCE').name, 'Korunan kayıt');
  assert.equal(store.validation.get(row.id).title, row.title);
  store.db.exec('PRAGMA user_version=4');
  store.close();
  assert.throws(() => new Store(path), /daha yeni/);
  // Explicitly close the rejected database in the Store constructor.
  const db = new DatabaseSync(path);
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, 4);
  db.close();
});
test('Validasyon API: oturum, işlem kaynağı, dosya indirme, filtreli Excel ve gönderim ayrımı', async (t) => {
  const path = await folder(t),
    ui = join(path, 'ui');
  await mkdir(ui);
  await writeFile(join(ui, 'index.html'), '<html>TEST</html>');
  const service = await startLocal({ dataDir: path, staticDir: ui, env: {} });
  try {
    const cookie = (await fetch(service.url)).headers
      .get('set-cookie')
      .split(';')[0];
    const request = (route, data) =>
      fetch(service.url + '/api' + route, {
        headers: {
          Cookie: cookie,
          Origin: service.url,
          'Content-Type': 'application/json',
        },
        ...(data === undefined
          ? {}
          : { method: 'POST', body: JSON.stringify(data) }),
      });
    await request('/setup', {
      province: '25',
      operator: 'Test',
      year: '2026–2027',
    });
    assert.equal(
      (await fetch(service.url + '/api/validation-export')).status,
      401,
    );
    assert.equal(
      (
        await fetch(service.url + '/api/validation', {
          method: 'POST',
          headers: {
            Cookie: cookie,
            Origin: 'https://example.org',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form()),
        })
      ).status,
      403,
    );
    let response = await request('/validation', form('merger'));
    assert.equal(response.status, 200);
    let row = await response.json();
    const fileResponse = await request(`/validation/${row.id}/files`, {
      version: row.version,
      name: 'test.txt',
      data: Buffer.from('API test kanıtı').toString('base64'),
    });
    assert.equal(fileResponse.status, 200);
    const file = await fileResponse.json();
    assert.equal(
      await (await request('/files/' + file.id)).text(),
      'API test kanıtı',
    );
    row = await (await request('/validation/' + row.id)).json();
    assert.equal(
      (await request(`/validation/${row.id}/sent`, send(row))).status,
      200,
    );
    const workbook = new ExcelJS.Workbook();
    response = await request('/validation-export?group=merger&status=waiting');
    assert.equal(response.status, 200);
    await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
    assert.equal(workbook.worksheets[0].rowCount, 2);
    assert.equal(
      workbook.worksheets[0].getRow(2).getCell(3).value,
      'Okul hesabı birleştirme',
    );
    response = await request('/validation-export?group=approval');
    const other = new ExcelJS.Workbook();
    await other.xlsx.load(Buffer.from(await response.arrayBuffer()));
    assert.equal(other.worksheets[0].rowCount, 1);
    assert.equal(
      (await request(`/validation/${row.id}/history-export`)).status,
      200,
    );
    const detail = await (await request('/validation/' + row.id)).json();
    assert.equal(detail.status, 'waiting');
    assert.equal(detail.events.filter((e) => e.type === 'sent').length, 1);
    const ready = await (await request('/validation', form('support'))).json();
    const another = await (await request('/validation', form('school'))).json();
    response = await request(`/validation/${ready.id}/draft`, {
      version: ready.version,
      purpose: 'request',
      stage: 'approval',
      edit: true,
      recipient: 'test@example.org',
      subject: 'Kontrol edilecek',
      body: 'Özel metin',
    });
    assert.equal(response.status, 200);
    assert.equal(
      (await (await request('/validation/' + ready.id)).json()).currentDraft
        .body,
      'Özel metin',
    );
    for (const [stage, count] of [
      ['drafts', 3],
      ['approval', 2],
      ['results', 2],
    ]) {
      const file = await request('/validation-export?stage=' + stage);
      assert.equal(file.status, 200);
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(Buffer.from(await file.arrayBuffer()));
      assert.equal(wb.worksheets[0].rowCount, count, stage);
    }
    assert.equal(
      (
        await request(`/validation/${another.id}/draft`, {
          version: another.version,
          purpose: 'request',
          stage: 'sent',
        })
      ).status,
      400,
    );
  } finally {
    await service.close();
  }
});
