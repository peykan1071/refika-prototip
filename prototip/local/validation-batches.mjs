import { randomUUID } from 'node:crypto';
import { digest, normalize, provinceCode, provinces, text } from './domain.mjs';
import {
  batchFields,
  batchMailDrafts,
  defaultAction,
} from './validation-batch-content.mjs';
export { batchFields } from './validation-batch-content.mjs';
import { readInput, decodeFile, workbookBuffer } from './imports.mjs';
import {
  caseKinds,
  cleanCase,
  ruleVersion,
  safeLink,
  timestamp,
} from './validation.mjs';

const aliases = {
  kind: ['talep türü', 'işlem'],
  name: [
    'kişi',
    'öğretmen adı',
    'isim',
    'name',
    'ad',
    'ad ve soyad',
    'ad soyadı',
  ],
  accountId: [
    'hesap id',
    'kullanıcı id',
    'öğretmen kimliği',
    'etwinner id',
    'user id',
  ],
  school: ['okul', 'kurum adı', 'school name'],
  schoolId: ['okul kimliği', 'kurum id', 'school id'],
  profileUrl: [
    'profil bağlantısı',
    'kişi bağlantısı',
    'öğretmen linki',
    'profile url',
  ],
  schoolUrl: ['okul bağlantısı', 'okul linki', 'school url'],
  email: ['email', 'eposta'],
  reason: ['not', 'talep notu', 'mevcut durum', 'sorun açıklaması'],
  requestedAction: ['istenen işlem'],
};
const identity = (row) =>
  JSON.stringify([row.kind, row.accountId || '', row.schoolId || '']);
function kindValue(value, fallback) {
  if (!value) return fallback;
  const n = normalize(value);
  const match = Object.entries(caseKinds).find(([key, label]) =>
    [key, label].some((v) => normalize(v) === n),
  );
  if (match) return match[0];
  return (
    {
      kisi: 'person',
      kisionayi: 'person',
      okul: 'school',
      okulonayi: 'school',
      uyelik: 'membership',
      organizasyon: 'membership',
      birlestirme: 'merger',
      destek: 'support',
    }[n] || ''
  );
}
function enrichLinks(values, cases) {
  for (const [id, link] of [
    ['accountId', 'profileUrl'],
    ['schoolId', 'schoolUrl'],
  ]) {
    if (values[link] || !values[id]) continue;
    const known = [
      ...new Set(
        cases
          .filter((r) => r[id] === values[id] && r[link])
          .map((r) => r[link]),
      ),
    ];
    if (known.length === 1) values[link] = known[0];
  }
  return values;
}
export function validateBatchMetadata(batch) {
  if (
    !batch ||
    !/^batch-[a-f0-9]{64}$/.test(batch.id) ||
    !batch.title ||
    !batch.sourceName ||
    !/^[a-f0-9]{64}$/.test(batch.sourceHash) ||
    !Number.isInteger(batch.line) ||
    batch.line < 2
  )
    throw new Error('Excel liste kaynak bilgisi geçersiz.');
  text(batch.title, 200);
  text(batch.sourceName, 200);
  timestamp(batch.createdAt);
}
export async function previewValidationBatch(store, input) {
  const settings = store.meta('settings');
  if (!settings) throw new Error('Önce il çalışma alanını oluşturun.');
  if (!/\.(xlsx|csv|tsv)$/i.test(input.name || ''))
    throw new Error('Validasyon için Excel (.xlsx) veya CSV/TSV seçin.');
  const parsed = await readInput(input);
  if (
    !parsed.headers?.length ||
    !parsed.rows?.length ||
    parsed.rows.length > 10000 ||
    parsed.headers.length > 100
  )
    throw new Error('Başlık ve en fazla 10.000 veri satırı gerekli.');
  const defaultKind = input.defaultKind || 'person';
  if (!Object.hasOwn(caseKinds, defaultKind))
    throw new Error('Listenin işlem türünü seçin.');
  const mapping =
    input.mapping ||
    Object.fromEntries(
      batchFields.map(([key, label]) => [
        key,
        parsed.headers.findIndex((h) =>
          [key, label, ...(aliases[key] || [])].some(
            (v) => normalize(v) === normalize(h),
          ),
        ),
      ]),
    );
  for (const [key] of batchFields)
    if (
      mapping[key] !== undefined &&
      (!Number.isInteger(mapping[key]) ||
        mapping[key] < -1 ||
        mapping[key] >= parsed.headers.length)
    )
      throw new Error('Sütun eşleştirmesi geçersiz.');
  const mappedColumns = Object.values(mapping).filter((i) => i >= 0);
  if (new Set(mappedColumns).size !== mappedColumns.length)
    throw new Error('Bir sütunu birden fazla alanla eşleştirmeyin.');
  const cases = store.validation.list(),
    existing = new Map();
  for (const row of cases)
    if (!existing.has(identity(row))) existing.set(identity(row), row);
  const sourceHash = digest(decodeFile(input).buffer.toString('base64'));
  const title = text(input.title || input.name.replace(/\.[^.]+$/, ''), 200);
  const seen = new Set();
  const items = parsed.rows.map((cells, index) => {
    const line = index + 2;
    try {
      const mapped = Object.fromEntries(
        batchFields.map(([key]) => [
          key,
          mapping[key] >= 0 ? text(cells[mapping[key]], 6000) : '',
        ]),
      );
      const kind = kindValue(mapped.kind, defaultKind);
      for (const key of ['profileUrl', 'schoolUrl']) {
        const link = parsed.hyperlinks?.[index]?.[mapping[key]];
        if (link) mapped[key] = link;
      }
      if (!kind) throw new Error('İşlem türü tanınmadı.');
      if (
        mapped.province &&
        provinceCode(mapped.province) !== settings.province
      )
        throw new Error('Bu satır çalışma alanındaki ile ait değil.');
      if (
        ['person', 'membership'].includes(kind) &&
        (!mapped.name || !mapped.accountId)
      )
        throw new Error('Kişi için ad soyad ve görünen kişi ID gerekli.');
      if (
        ['school', 'merger', 'membership'].includes(kind) &&
        (!mapped.school || !mapped.schoolId)
      )
        throw new Error(
          'Okul işlemi için okul adı ve görünen okul ID gerekli.',
        );
      if (kind === 'support' && !mapped.accountId && !mapped.schoolId)
        throw new Error('Destek kaydı için kişi veya okul ID gerekli.');
      const values = cleanCase(
        enrichLinks(
          {
            ...mapped,
            kind,
            title: (mapped.name || mapped.school) + ' / ' + caseKinds[kind],
            reason:
              mapped.reason ||
              'Açıklama belirtilmedi; gönderimden önce tamamlanmalı.',
            requestedAction:
              mapped.requestedAction || defaultAction({ ...mapped, kind }),
            checks: {},
          },
          cases,
        ),
      );
      const key = identity(values);
      if (seen.has(key))
        return {
          line,
          values,
          action: 'duplicate',
          message: 'Aynı kişi/okul ve işlem bu dosyada tekrar ediyor.',
        };
      seen.add(key);
      const old = existing.get(key);
      if (old)
        return {
          line,
          values,
          action: 'existing',
          caseId: old.id,
          message: 'REFİKA’da mevcut; yeniden oluşturulmayacak.',
        };
      return {
        line,
        values,
        action: 'new',
        message:
          (!values.profileUrl && values.accountId) ||
          (!values.schoolUrl && values.schoolId)
            ? 'Profil bağlantısı eksik; kayıt oluşturulabilir.'
            : 'Kayıt oluşturulacak.',
      };
    } catch (e) {
      return { line, action: 'invalid', message: e.message };
    }
  });
  const batchId =
    'batch-' +
    digest([
      settings.province,
      settings.year,
      sourceHash,
      parsed.sheet || '',
      defaultKind,
      mapping,
    ]);
  const counts = Object.fromEntries(
    ['new', 'existing', 'duplicate', 'invalid'].map((key) => [
      key,
      items.filter((r) => r.action === key).length,
    ]),
  );
  const token = digest([batchId, title, items, store.meta('revision')]);
  return {
    batchId,
    title,
    sourceName: text(input.name, 200),
    sourceHash,
    mapping,
    headers: parsed.headers,
    sheets: parsed.sheets,
    sheet: parsed.sheet,
    items,
    counts,
    token,
    drafts: automaticDrafts(
      store,
      items.filter((r) => r.action === 'new').map((r) => r.values),
    ),
  };
}
function automaticDrafts(store, rows, at = new Date().toISOString()) {
  const settings = store.meta('settings');
  return batchMailDrafts(rows, {
    provinceName: provinces[Number(settings.province) - 1],
    operator: settings.operator,
    date: new Date(at).toLocaleDateString('tr-TR', {
      timeZone: 'Europe/Istanbul',
    }),
  });
}
const draftRowsKey = (rows) => digest(rows.map((r) => cleanCase(r)));
function draftsForBatch(store, batch) {
  const rowsKey = draftRowsKey(batch.rows);
  const events = store.validation.events(batch.rows[0].id);
  return automaticDrafts(store, batch.rows, batch.createdAt).map((draft) => {
    const saved = events.find(
      (e) =>
        e.type === 'draft' && e.purpose === 'batch' && e.group === draft.group,
    );
    const content =
      saved?.rowsKey === rowsKey
        ? {
            recipient: saved.recipient,
            subject: saved.subject,
            body: saved.body,
          }
        : {};
    return {
      ...draft,
      ...content,
      token: digest([rowsKey, saved?.id || '', draft.group]),
      regenerated: Boolean(saved && saved.rowsKey !== rowsKey),
    };
  });
}
export function saveBatchDraft(store, batchId, input) {
  const batch = validationBatches(store).find((b) => b.id === batchId);
  const draft = batch?.drafts.find((d) => d.group === input.group);
  if (!draft || input.token !== draft.token)
    throw new Error('Liste veya taslak değişti; listeyi yeniden açın.');
  const recipient = text(input.recipient, 300),
    subject = text(input.subject, 500),
    body = text(input.body, 250000);
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) ||
    /[\r\n]/.test(subject) ||
    !subject ||
    !body
  )
    throw new Error('Alıcı, konu ve e-posta metnini kontrol edin.');
  return store.transaction(() => {
    const event = store.validation.append(batch.rows[0].id, 'draft', {
      purpose: 'batch',
      batchId,
      group: input.group,
      rowsKey: draftRowsKey(batch.rows),
      recipient,
      subject,
      body,
    });
    store.log(
      `${batch.title}: ${draft.label} toplu e-posta taslağı kaydedildi.`,
    );
    return { id: event.id };
  });
}
export function commitValidationBatch(store, preview, input) {
  if (input.token !== preview.token)
    throw new Error('Önizleme değişti. Excel listesini yeniden önizleyin.');
  if (input.confirmed !== true)
    throw new Error('Excel önizlemesini teyit edin.');
  if (preview.counts.invalid && input.skipInvalid !== true)
    throw new Error(
      'Hatalı satırları düzeltin veya yalnız geçerli satırları seçin.',
    );
  const items = preview.items.filter((r) => r.action === 'new');
  if (!items.length)
    throw new Error(
      'Oluşturulacak yeni kayıt yok; mevcut kayıtlar tekrar eklenmedi.',
    );
  const bytes = decodeFile(input).buffer,
    at = new Date().toISOString();
  return store.transaction(() => {
    const created = [];
    for (const item of items) {
      const row = {
        ...item.values,
        id: randomUUID(),
        province: store.meta('settings').province,
        year: store.meta('settings').year,
        status: 'review',
        ruleVersion,
        sourceFingerprint: '',
        createdAt: at,
        updatedAt: at,
        result: '',
        outcome: '',
        resolvedAt: '',
        batch: {
          id: preview.batchId,
          title: preview.title,
          sourceName: preview.sourceName,
          sourceHash: preview.sourceHash,
          line: item.line,
          createdAt: at,
        },
      };
      const saved = store.validation.put(row, 0);
      created.push(saved);
      store.validation.append(row.id, 'review', {
        note: `${preview.sourceName} · satır ${item.line}. Excel’den oluşturuldu; gönderim ve onay henüz kaydedilmedi.`,
        snapshot: row,
      });
    }
    const fileId = randomUUID(),
      fileName = preview.sourceName.replace(/[\\/\r\n]/g, '_');
    store.db
      .prepare('INSERT INTO validation_files VALUES (?,?,?,?,?)')
      .run(fileId, created[0].id, fileName, bytes, at);
    store.validation.append(created[0].id, 'file', { name: fileName, fileId });
    for (const draft of automaticDrafts(store, created, at))
      store.validation.append(created[0].id, 'draft', {
        purpose: 'batch',
        batchId: preview.batchId,
        group: draft.group,
        rowsKey: draftRowsKey(created),
        recipient: draft.recipient,
        subject: draft.subject,
        body: draft.body,
      });
    store.log(
      `${preview.title}: Excel’den ${created.length} talep oluşturuldu; onay olarak sayılmadı.`,
    );
    return {
      batchId: preview.batchId,
      created: created.length,
      skipped:
        preview.counts.existing +
        preview.counts.duplicate +
        preview.counts.invalid,
    };
  });
}
export function validationBatches(store) {
  const groups = new Map();
  for (const row of store.validation.list())
    if (row.batch) {
      if (!groups.has(row.batch.id))
        groups.set(row.batch.id, {
          id: row.batch.id,
          title: row.batch.title,
          sourceName: row.batch.sourceName,
          createdAt: row.batch.createdAt,
          rows: [],
          sourceFile: null,
        });
      groups.get(row.batch.id).rows.push(row);
    }
  const files = store.validation.files();
  for (const batch of groups.values()) {
    batch.rows.sort((a, b) => a.batch.line - b.batch.line);
    batch.sourceFile =
      files.find(
        (f) =>
          batch.rows.some((r) => r.id === f.caseId) &&
          f.name === batch.sourceName,
      ) || null;
    batch.prepared = batch.rows.filter((r) =>
      ['review', 'ready'].includes(r.status),
    ).length;
    batch.waiting = batch.rows.filter((r) => r.status === 'waiting').length;
    batch.completed = batch.rows.filter((r) => r.status === 'completed').length;
    batch.drafts = draftsForBatch(store, batch);
  }
  return [...groups.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}
export function updateValidationBatch(store, batchId, action, input) {
  if (!['sent', 'result'].includes(action))
    throw new Error('Liste işlemi geçersiz.');
  if (input.confirmed !== true)
    throw new Error('Seçili kayıtlar ve e-posta dayanağını teyit edin.');
  if (
    !Array.isArray(input.rows) ||
    !input.rows.length ||
    input.rows.length > 10000 ||
    new Set(input.rows.map((r) => r.id)).size !== input.rows.length
  )
    throw new Error('İşlenecek kayıtları seçin.');
  const happenedAt = timestamp(input.happenedAt),
    note = text(input.note, 6000),
    evidenceUrl = safeLink(input.evidenceUrl);
  if (!note && !evidenceUrl)
    throw new Error(
      'Gönderim / onay mailinin metnini veya bağlantısını ekleyin.',
    );
  const outcome = input.outcome || 'approved';
  if (
    action === 'result' &&
    !['approved', 'rejected', 'other'].includes(outcome)
  )
    throw new Error('Sonuç türü geçersiz.');
  const rows = input.rows.map((selected) => {
    const row = store.validation.current(selected.id, selected.version);
    if (row.batch?.id !== batchId)
      throw new Error('Seçilen kayıt bu Excel listesine ait değil.');
    if (action === 'sent' && !['review', 'ready'].includes(row.status))
      throw new Error('Yalnız henüz gönderilmemiş kayıtları seçin.');
    if (action === 'result') {
      if (row.status !== 'waiting')
        throw new Error('Sonuç için gönderilmiş ve bekleyen kayıtları seçin.');
      const sent = store.validation
        .events(row.id)
        .find((e) => e.type === 'sent' && e.purpose === 'request');
      if (!sent || happenedAt < sent.happenedAt)
        throw new Error('Onay mailinin tarihi gönderimden önce olamaz.');
    }
    return row;
  });
  return store.transaction(() => {
    for (const row of rows) {
      const at = new Date().toISOString();
      if (action === 'sent') {
        store.validation.append(row.id, 'sent', {
          purpose: 'request',
          channel: 'email',
          happenedAt,
          proof: note,
          messageUrl: evidenceUrl,
          subject: row.batch.title,
          body: note,
          recipient: '',
          snapshot: row,
          batchId,
        });
        store.validation.put({ ...row, status: 'waiting', updatedAt: at });
      } else {
        store.validation.append(row.id, 'result', {
          happenedAt,
          note: note || 'Onay / sonuç maili bağlantısı kaydedildi.',
          evidenceUrl,
          outcome,
          dateBasis: 'notification',
          snapshot: row,
          batchId,
        });
        store.validation.put({
          ...row,
          status: 'completed',
          result: note || 'Onay / sonuç maili bağlantısı kaydedildi.',
          outcome,
          resolvedAt: happenedAt,
          updatedAt: at,
        });
      }
    }
    store.log(
      `${rows[0].batch.title}: ${rows.length} kayıt için ${action === 'sent' ? 'gönderim' : 'e-posta sonucu'} topluca kaydedildi.`,
    );
    return { updated: rows.length };
  });
}
export function approvedAccounts(store) {
  const cases = new Map(store.validation.list().map((row) => [row.id, row])),
    latest = new Map(),
    snapshots = new Map();
  for (const raw of store.db
    .prepare('SELECT case_id,body FROM validation_events ORDER BY rowid')
    .all()) {
    const event = JSON.parse(raw.body);
    if (event.snapshot) snapshots.set(raw.case_id, event.snapshot);
    if (event.type !== 'result') continue;
    const row = event.snapshot || snapshots.get(raw.case_id),
      current = cases.get(raw.case_id);
    if (
      !row ||
      !current ||
      !['person', 'school', 'membership'].includes(row.kind)
    )
      continue;
    const id =
      row.kind === 'person'
        ? row.accountId
        : row.kind === 'school'
          ? row.schoolId
          : row.accountId && row.schoolId
            ? row.accountId + ':' + row.schoolId
            : '';
    if (!id) continue;
    const key = row.kind + ':' + id,
      old = latest.get(key);
    if (
      old &&
      (old.approvedAt > event.happenedAt ||
        (old.approvedAt === event.happenedAt &&
          old.resultNumber > event.resultNumber))
    )
      continue;
    latest.set(key, {
      ...row,
      id: key,
      caseId: raw.case_id,
      recordedAt: event.at,
      approvedAt: event.happenedAt,
      resultNumber: event.resultNumber,
      outcome: event.outcome,
      evidenceUrl: event.evidenceUrl || '',
      resultNote: event.note || '',
      currentStatus: current.status,
      profileUrl:
        row.accountId === current.accountId
          ? current.profileUrl
          : row.profileUrl,
      schoolUrl:
        row.schoolId === current.schoolId ? current.schoolUrl : row.schoolUrl,
      esepCheck:
        row.accountId === current.accountId && row.schoolId === current.schoolId
          ? current.esepCheck
          : undefined,
    });
  }
  return [...latest.values()]
    .filter((r) => r.outcome === 'approved')
    .sort((a, b) => b.approvedAt.localeCompare(a.approvedAt));
}
export function validationBatchTemplate() {
  return workbookBuffer(
    batchFields.map(([, label]) => label),
    [],
  );
}
