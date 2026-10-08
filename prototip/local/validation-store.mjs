import { randomUUID } from 'node:crypto';
import {
  cleanCase,
  readyProblems,
  caseDraft,
  ruleVersion,
  safeLink,
  timestamp,
  caseStatuses,
} from './validation.mjs';
import { text, provinces } from './domain.mjs';

const fingerprint = (r) =>
  r
    ? JSON.stringify(
        [
          'accountId',
          'name',
          'schoolId',
          'school',
          'district',
          'email',
          'profileUrl',
          'sourceStatus',
        ].map((k) => r[k] || ''),
      )
    : '';
const fileName = (name) => text(name, 200).replace(/[\\/\r\n]/g, '_');
function validFile(name, bytes) {
  if (
    !/\.(pdf|docx|xlsx|csv|txt|png|jpe?g)$/i.test(name) ||
    !bytes.length ||
    bytes.length > 10 * 1024 * 1024
  )
    throw new Error(
      'En fazla 10 MB PDF, Word, Excel, metin veya görsel kanıtı seçin.',
    );
}

export function migrateValidation(db) {
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version > 2)
    throw new Error('Bu veri tabanı daha yeni bir REFİKA sürümüne ait.');
  db.exec(`BEGIN IMMEDIATE;
    CREATE TABLE IF NOT EXISTS validation_cases(id TEXT PRIMARY KEY, body TEXT NOT NULL, version INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS validation_events(id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES validation_cases(id), body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS validation_files(id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES validation_cases(id), name TEXT NOT NULL, body BLOB NOT NULL, created_at TEXT NOT NULL);
    PRAGMA user_version=2;
    COMMIT;`);
}

export class ValidationStore {
  constructor(store) {
    this.store = store;
    this.db = store.db;
  }
  get(id) {
    const row = this.db
      .prepare('SELECT * FROM validation_cases WHERE id=?')
      .get(id);
    return row
      ? { ...JSON.parse(row.body), id: row.id, version: row.version }
      : null;
  }
  list() {
    return this.db
      .prepare('SELECT * FROM validation_cases ORDER BY rowid DESC')
      .all()
      .map((row) => {
        const item = {
          ...JSON.parse(row.body),
          id: row.id,
          version: row.version,
        };
        return { ...item, sourceChanged: this.sourceChanged(item) };
      });
  }
  sourceChanged(row) {
    return Boolean(
      row.sourceRecordId &&
      fingerprint(this.store.get('records', row.sourceRecordId)) !==
        row.sourceFingerprint,
    );
  }
  events(id) {
    return this.db
      .prepare(
        'SELECT * FROM validation_events WHERE case_id=? ORDER BY rowid DESC',
      )
      .all(id)
      .map((r) => ({ ...JSON.parse(r.body), id: r.id, caseId: r.case_id }));
  }
  files() {
    return this.db
      .prepare(
        'SELECT id,case_id AS caseId,name,length(body) AS size,created_at AS createdAt FROM validation_files',
      )
      .all();
  }
  detail(id) {
    const row = this.get(id);
    if (!row) throw new Error('Dosya bulunamadı.');
    return {
      ...row,
      sourceChanged: this.sourceChanged(row),
      events: this.events(id),
      files: this.files().filter((f) => f.caseId === id),
    };
  }
  current(id, version) {
    const row = this.get(id);
    if (!row) throw new Error('Dosya bulunamadı.');
    if (row.version !== version)
      throw new Error(
        'Dosya başka bir pencerede değişti. Güncel dosyayı yeniden açın.',
      );
    return row;
  }
  put(row, version = row.version || 0) {
    const body = { ...row };
    delete body.version;
    delete body.sourceChanged;
    this.db
      .prepare(
        'INSERT INTO validation_cases VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body,version=excluded.version',
      )
      .run(row.id, JSON.stringify(body), version + 1);
    return { ...body, version: version + 1 };
  }
  append(id, type, data) {
    const event = {
      id: randomUUID(),
      type,
      at: new Date().toISOString(),
      operator: this.store.meta('settings').operator,
      ...data,
    };
    this.db
      .prepare('INSERT INTO validation_events VALUES (?,?,?)')
      .run(event.id, id, JSON.stringify(event));
    return event;
  }
  assertReady(row) {
    if (this.sourceChanged(row))
      throw new Error(
        'Kaynak kayıt değişti. Dosyayı incelemeye kaydedip kontrolleri yenileyin.',
      );
    const issues = readyProblems(row);
    if (issues.length) throw new Error(issues.join(' '));
  }
  save(input) {
    const settings = this.store.meta('settings');
    if (!settings) throw new Error('Önce il çalışma alanını oluşturun.');
    const old = input.id ? this.current(input.id, input.version) : null;
    if (old && ['waiting', 'completed'].includes(old.status))
      throw new Error(
        'Gönderilmiş veya sonuçlanmış dosyayı değiştirmek için gerekçeyle yeniden incelemeye alın.',
      );
    const values = cleanCase(input);
    if (old && old.sourceRecordId !== values.sourceRecordId)
      throw new Error('Dosyanın kaynak kaydı değiştirilemez.');
    const source = values.sourceRecordId
      ? this.store.get('records', values.sourceRecordId)
      : null;
    if (values.sourceRecordId && !source)
      throw new Error('Kaynak kayıt bulunamadı.');
    if (
      values.sourceRecordId &&
      this.list().some(
        (r) =>
          r.id !== old?.id &&
          r.sourceRecordId === values.sourceRecordId &&
          r.kind === values.kind &&
          r.status !== 'completed',
      )
    )
      throw new Error('Bu kaynak ve talep türü için açık bir dosya zaten var.');
    const sourceChanged = old && this.sourceChanged(old);
    if (sourceChanged && input.status === 'ready')
      throw new Error(
        'Kaynak değişti; önce incelemeye kaydedin, sonra kontrolleri yenileyin.',
      );
    if (sourceChanged)
      for (const key of Object.keys(values.checks))
        values.checks[key] = { status: 'unknown', note: '' };
    if (!['review', 'ready'].includes(input.status))
      throw new Error(
        'Dosyayı incelemeye veya gönderime hazır olarak kaydedin.',
      );
    const at = new Date().toISOString();
    const row = {
      ...values,
      id: old?.id || randomUUID(),
      province: settings.province,
      year: settings.year,
      status: input.status,
      ruleVersion,
      sourceFingerprint: fingerprint(source),
      createdAt: old?.createdAt || at,
      updatedAt: at,
      result: old?.result || '',
      resolvedAt: old?.resolvedAt || '',
    };
    if (row.status === 'ready') this.assertReady(row);
    return this.store.transaction(() => {
      const saved = this.put(row, old?.version || 0);
      this.append(row.id, 'review', {
        note: row.reviewNote || row.reason,
        status: row.status,
        ruleVersion,
        snapshot: row,
      });
      this.store.log(
        `${row.title}: validasyon dosyası ${old ? 'güncellendi' : 'oluşturuldu'}.`,
      );
      return saved;
    });
  }
  draft(id, input) {
    const row = this.current(id, input.version),
      settings = this.store.meta('settings');
    if (!['request', 'information'].includes(input.purpose))
      throw new Error('Yazışma amacını seçin.');
    if (input.purpose === 'request') {
      if (row.status !== 'ready')
        throw new Error('Merkez talebi için dosya gönderime hazır olmalı.');
      this.assertReady(row);
    }
    const message = caseDraft(
      row,
      input.purpose,
      provinces[Number(settings.province) - 1],
      settings.operator,
    );
    return this.store.transaction(() => {
      const event = this.append(id, 'draft', {
        ...message,
        purpose: input.purpose,
        snapshot: row,
      });
      this.put({ ...row, updatedAt: event.at });
      this.store.log(`${row.title}: gönderilmemiş yazışma taslağı kaydedildi.`);
      return event;
    });
  }
  communicate(id, input) {
    const row = this.current(id, input.version);
    if (!['request', 'information'].includes(input.purpose))
      throw new Error('Yazışma amacını seçin.');
    if (input.confirmed !== true)
      throw new Error('İletiyi gerçekten gönderdiğinizi doğrulayın.');
    if (!['email', 'whatsapp', 'other'].includes(input.channel))
      throw new Error('Gönderim kanalını seçin.');
    const data = {
      purpose: input.purpose,
      channel: input.channel,
      recipient: text(input.recipient, 300),
      subject: text(input.subject, 500),
      body: text(input.body, 16000),
      happenedAt: timestamp(input.happenedAt),
      proof: text(input.proof, 4000),
      messageUrl: safeLink(input.messageUrl),
    };
    if (
      !data.recipient ||
      !data.subject ||
      !data.body ||
      (!data.proof && !data.messageUrl)
    )
      throw new Error(
        'Alıcı, konu, gönderilen metin ve gönderim dayanağı gerekli.',
      );
    if (
      data.channel === 'email' &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.recipient)
    )
      throw new Error('Alıcı e-posta adresini kontrol edin.');
    if (data.purpose === 'request') {
      if (row.status !== 'ready')
        throw new Error(
          'Talep gönderimini kaydetmeden önce dosyayı gönderime hazır yapın.',
        );
      this.assertReady(row);
    }
    if (
      this.events(id).some(
        (e) =>
          e.type === 'sent' &&
          e.purpose === data.purpose &&
          e.happenedAt === data.happenedAt &&
          e.recipient === data.recipient &&
          e.body === data.body,
      )
    )
      throw new Error('Bu gönderim daha önce kaydedildi.');
    return this.store.transaction(() => {
      const event = this.append(id, 'sent', { ...data, snapshot: row });
      this.put({
        ...row,
        status: data.purpose === 'request' ? 'waiting' : row.status,
        updatedAt: event.at,
      });
      this.store.log(
        `${row.title}: gerçek gönderim kullanıcı teyidiyle kaydedildi; otomatik ileti gönderilmedi.`,
      );
      return event;
    });
  }
  progress(id, input) {
    const row = this.current(id, input.version);
    if (!['reply', 'result', 'reopen'].includes(input.type))
      throw new Error('Takip işlemini seçin.');
    const note = text(input.note, 6000),
      evidenceUrl = safeLink(input.evidenceUrl),
      happenedAt = timestamp(input.happenedAt);
    if (!note)
      throw new Error('Yanıt, sonuç veya yeniden inceleme gerekçesini yazın.');
    if (
      input.type === 'result' &&
      (row.status !== 'waiting' || input.confirmed !== true)
    )
      throw new Error(
        'Gerçek talep gönderimi beklenen dosyada sonuç teyidi gerekli.',
      );
    if (
      input.type === 'result' &&
      !['approved', 'rejected', 'other'].includes(input.outcome)
    )
      throw new Error('Sonuç türünü seçin.');
    if (input.type === 'result') {
      const sent = this.events(id).find(
        (e) => e.type === 'sent' && e.purpose === 'request',
      );
      if (!sent || Date.parse(happenedAt) < Date.parse(sent.happenedAt))
        throw new Error('Sonuç zamanı talep gönderiminden önce olamaz.');
    }
    if (
      input.type === 'reopen' &&
      !['waiting', 'completed', 'ready'].includes(row.status)
    )
      throw new Error('Dosya zaten incelemede.');
    if (
      input.type === 'reopen' &&
      row.sourceRecordId &&
      this.list().some(
        (other) =>
          other.id !== id &&
          other.sourceRecordId === row.sourceRecordId &&
          other.kind === row.kind &&
          other.status !== 'completed',
      )
    )
      throw new Error(
        'Bu kaynak ve talep türü için başka açık dosya var; önce onu inceleyin.',
      );
    return this.store.transaction(() => {
      const event = this.append(id, input.type, {
        note,
        evidenceUrl,
        happenedAt,
        outcome: input.type === 'result' ? input.outcome : '',
      });
      const next = { ...row, updatedAt: event.at };
      if (input.type === 'result')
        Object.assign(next, {
          status: 'completed',
          result: note,
          outcome: input.outcome,
          resolvedAt: happenedAt,
        });
      if (input.type === 'reopen') {
        Object.assign(next, {
          status: 'review',
          result: '',
          outcome: '',
          resolvedAt: '',
          holdReason: note,
        });
        for (const key of Object.keys(next.checks))
          next.checks[key] = { status: 'unknown', note: '' };
      }
      this.put(next);
      this.store.log(
        `${row.title}: ${input.type === 'result' ? 'resmî sonuç kaydedildi' : input.type === 'reopen' ? 'yeniden incelemeye alındı' : 'yanıt / takip notu kaydedildi'}.`,
      );
      return event;
    });
  }
  addFile(id, input, bytes) {
    const row = this.current(id, input.version),
      name = fileName(input.name);
    validFile(name, bytes);
    return this.store.transaction(() => {
      const fileId = randomUUID(),
        at = new Date().toISOString();
      this.db
        .prepare('INSERT INTO validation_files VALUES (?,?,?,?,?)')
        .run(fileId, id, name, bytes, at);
      this.append(id, 'file', { fileId, name });
      this.put({ ...row, updatedAt: at });
      this.store.log(`${row.title}: kanıt dosyası eklendi.`);
      return { id: fileId };
    });
  }
  archive() {
    return {
      cases: this.list().map(({ sourceChanged: _changed, ...row }) => row),
      events: this.db
        .prepare('SELECT * FROM validation_events ORDER BY rowid')
        .all(),
      files: this.db
        .prepare('SELECT * FROM validation_files')
        .all()
        .map((f) => ({ ...f, body: Buffer.from(f.body).toString('base64') })),
    };
  }
  validateArchive(data, settings, recordIds) {
    if (
      !data ||
      !Array.isArray(data.cases) ||
      !Array.isArray(data.events) ||
      !Array.isArray(data.files) ||
      data.cases.length > 100000 ||
      data.events.length > 500000 ||
      data.files.length > 100000
    )
      throw new Error('Validasyon yedeği geçersiz.');
    const ids = new Set(),
      eventIds = new Set(),
      fileIds = new Set();
    for (const row of data.cases) {
      cleanCase(row);
      if (
        !Number.isSafeInteger(row.version) ||
        row.version < 1 ||
        typeof row.sourceFingerprint !== 'string' ||
        typeof row.ruleVersion !== 'string'
      )
        throw new Error('Validasyon sürüm bilgileri geçersiz.');
      timestamp(row.createdAt);
      timestamp(row.updatedAt);
      if (row.resolvedAt) timestamp(row.resolvedAt);
      if (typeof row.result !== 'string')
        throw new Error('Sonuç metni geçersiz.');
      if (
        typeof row.id !== 'string' ||
        !row.id ||
        ids.has(row.id) ||
        row.province !== settings.province ||
        row.year !== settings.year ||
        !Object.hasOwn(caseStatuses, row.status) ||
        (row.sourceRecordId && !recordIds.has(row.sourceRecordId))
      )
        throw new Error('Yedekte geçersiz validasyon dosyası var.');
      ids.add(row.id);
    }
    for (const e of data.events) {
      if (
        !e.id ||
        eventIds.has(e.id) ||
        !ids.has(e.case_id) ||
        typeof e.body !== 'string'
      )
        throw new Error('Yazışma geçmişi geçersiz.');
      const body = JSON.parse(e.body);
      if (!body || body.id !== e.id || typeof body.operator !== 'string')
        throw new Error('Geçmiş kimliği geçersiz.');
      timestamp(body.at);
      if (body.happenedAt) timestamp(body.happenedAt);
      safeLink(body.messageUrl);
      safeLink(body.evidenceUrl);
      if (body.snapshot) cleanCase(body.snapshot);
      for (const key of [
        'body',
        'note',
        'proof',
        'recipient',
        'subject',
        'name',
      ])
        if (body[key] !== undefined && typeof body[key] !== 'string')
          throw new Error('Geçmiş metni geçersiz.');
      if (
        ![
          'review',
          'draft',
          'sent',
          'reply',
          'result',
          'reopen',
          'file',
        ].includes(body.type)
      )
        throw new Error('Geçmiş işlem türü geçersiz.');
      eventIds.add(e.id);
    }
    for (const f of data.files) {
      if (
        !f.id ||
        fileIds.has(f.id) ||
        !ids.has(f.case_id) ||
        typeof f.body !== 'string'
      )
        throw new Error('Validasyon kanıtı geçersiz.');
      validFile(fileName(f.name), Buffer.from(f.body, 'base64'));
      timestamp(f.created_at);
      fileIds.add(f.id);
    }
  }
  restore(data) {
    const versions = new Map(this.list().map((r) => [r.id, r.version]));
    this.db.exec(
      'DELETE FROM validation_files; DELETE FROM validation_events; DELETE FROM validation_cases;',
    );
    for (const row of data.cases)
      this.put(
        row,
        Math.max(
          versions.get(row.id) || 0,
          Number.isSafeInteger(row.version) ? row.version : 0,
        ),
      );
    for (const e of data.events)
      this.db
        .prepare('INSERT INTO validation_events VALUES (?,?,?)')
        .run(e.id, e.case_id, e.body);
    for (const f of data.files)
      this.db
        .prepare('INSERT INTO validation_files VALUES (?,?,?,?,?)')
        .run(
          f.id,
          f.case_id,
          fileName(f.name),
          Buffer.from(f.body, 'base64'),
          f.created_at,
        );
  }
}
