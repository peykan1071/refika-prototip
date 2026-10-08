import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { migrateValidation, ValidationStore } from './validation-store.mjs';
import { validationWorkItems } from './validation.mjs';
import {
  digest,
  provinceCode,
  text,
  validateActivity,
  validateRecord,
} from './domain.mjs';

export class Store {
  constructor(path) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db
      .exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,body TEXT NOT NULL,version INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS activities(id TEXT PRIMARY KEY,body TEXT NOT NULL,version INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,activity_id TEXT NOT NULL REFERENCES activities(id),name TEXT NOT NULL,body BLOB NOT NULL,created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS history(id INTEGER PRIMARY KEY AUTOINCREMENT,at TEXT NOT NULL,message TEXT NOT NULL);
      `);
    try {
      migrateValidation(this.db);
    } catch (error) {
      this.db.close();
      throw error;
    }
    this.validation = new ValidationStore(this);
    if (!this.meta('installationId'))
      this.setMeta('installationId', randomUUID());
  }
  close() {
    this.db.close();
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const value = fn();
      this.db.exec('COMMIT');
      return value;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  meta(key) {
    const row = this.db.prepare('SELECT value FROM meta WHERE key=?').get(key);
    return row ? JSON.parse(row.value) : null;
  }
  setMeta(key, value) {
    this.db
      .prepare(
        'INSERT INTO meta VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      )
      .run(key, JSON.stringify(value));
  }
  log(message) {
    this.db
      .prepare('INSERT INTO history(at,message) VALUES (?,?)')
      .run(new Date().toISOString(), message);
    this.setMeta('revision', (this.meta('revision') || 0) + 1);
  }
  list(table) {
    if (!['records', 'activities'].includes(table))
      throw new Error('Geçersiz tablo.');
    return this.db
      .prepare(`SELECT id,body,version FROM ${table} ORDER BY rowid DESC`)
      .all()
      .map((row) => ({
        ...JSON.parse(row.body),
        id: row.id,
        version: row.version,
      }));
  }
  get(table, id) {
    if (!['records', 'activities'].includes(table))
      throw new Error('Geçersiz tablo.');
    const row = this.db
      .prepare(`SELECT body,version FROM ${table} WHERE id=?`)
      .get(id);
    return row
      ? { ...JSON.parse(row.body), id, version: row.version }
      : undefined;
  }
  put(table, id, body, expectedVersion) {
    if (!['records', 'activities'].includes(table))
      throw new Error('Geçersiz tablo.');
    const existing = this.db
      .prepare(`SELECT version FROM ${table} WHERE id=?`)
      .get(id);
    if (
      expectedVersion !== undefined &&
      (existing?.version || 0) !== expectedVersion
    )
      throw new Error(
        'Kayıt başka bir pencerede değişti. Güncel kaydı açıp tekrar deneyin.',
      );
    const version = (existing?.version || 0) + 1;
    const cleaned = { ...body };
    delete cleaned.id;
    delete cleaned.version;
    this.db
      .prepare(
        `INSERT INTO ${table} VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body,version=excluded.version`,
      )
      .run(id, JSON.stringify(cleaned), version);
    return { ...cleaned, id, version };
  }
  setup(input) {
    if (this.meta('settings'))
      throw new Error(
        'Çalışma alanı zaten kuruldu. İl verilerini karıştırmamak için il değiştirilemez.',
      );
    const province = provinceCode(input.province),
      operator = text(input.operator, 150),
      year = text(input.year, 20);
    if (
      !province ||
      !operator ||
      !/^20\d{2}–20\d{2}$/.test(year) ||
      Number(year.slice(5)) !== Number(year.slice(0, 4)) + 1
    )
      throw new Error('İl, koordinatör adı ve ardışık eğitim yılı gerekli.');
    this.transaction(() => {
      this.setMeta('settings', { province, operator, year });
      this.log('İl çalışma alanı oluşturuldu.');
    });
  }
  state() {
    return {
      settings: this.meta('settings'),
      records: this.list('records'),
      validationCases: this.validation.list(),
      activities: this.list('activities'),
      files: this.db
        .prepare(
          'SELECT id,activity_id AS activityId,name,length(body) AS size,created_at AS createdAt FROM files',
        )
        .all(),
      history: this.db
        .prepare('SELECT * FROM history ORDER BY id DESC LIMIT 100')
        .all(),
      revision: this.meta('revision') || 0,
      sync: this.meta('sync'),
    };
  }
  saveActivity(input) {
    if (!this.meta('settings'))
      throw new Error('Önce çalışma alanını oluşturun.');
    const values = validateActivity(input),
      id = input.id || randomUUID(),
      existing = this.get('activities', id);
    if (input.id && !existing) throw new Error('Faaliyet bulunamadı.');
    if (existing && input.version === undefined)
      throw new Error('Güncel kayıt sürümü gerekli.');
    return this.transaction(() => {
      const saved = this.put(
        'activities',
        id,
        {
          ...values,
          source: existing?.source,
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        existing ? input.version : 0,
      );
      this.log(
        `${values.title}: ${values.status === 'completed' ? 'sonuç kaydedildi' : 'plan kaydedildi'}.`,
      );
      return saved;
    });
  }
  reviewRecord(id, input) {
    const existing = this.get('records', id);
    if (!existing) throw new Error('Kayıt bulunamadı.');
    const note = text(input.note),
      status = input.status;
    if (!['review', 'ready', 'completed'].includes(status) || !note)
      throw new Error('Durum ve inceleme/sonuç notu gerekli.');
    if (status === 'completed' && existing.status !== 'ready')
      throw new Error('Önce kaydı inceleyip hazır duruma alın.');
    if (input.version === undefined)
      throw new Error('Güncel kayıt sürümü gerekli.');
    return this.transaction(() => {
      const saved = this.put(
        'records',
        id,
        { ...existing, status, note, updatedAt: new Date().toISOString() },
        input.version,
      );
      this.log(
        `${existing.accountId}: kayıt durumu güncellendi; platformda otomatik işlem yapılmadı.`,
      );
      return saved;
    });
  }
  addFile(activityId, name, bytes) {
    if (!this.get('activities', activityId))
      throw new Error('Önce faaliyeti kaydedin.');
    name = text(name, 200).replace(/[\\/\r\n]/g, '_');
    if (
      !/\.(pdf|docx|xlsx|csv|txt|png|jpe?g)$/i.test(name) ||
      bytes.length > 10 * 1024 * 1024 ||
      !bytes.length
    )
      throw new Error('Desteklenen, en fazla 10 MB bir kanıt dosyası seçin.');
    const id = randomUUID();
    this.transaction(() => {
      this.db
        .prepare('INSERT INTO files VALUES (?,?,?,?,?)')
        .run(id, activityId, name, bytes, new Date().toISOString());
      this.log('Faaliyete kanıt dosyası eklendi.');
    });
    return { id };
  }
  file(id) {
    return (
      this.db.prepare('SELECT name,body FROM files WHERE id=?').get(id) ||
      this.db
        .prepare('SELECT name,body FROM validation_files WHERE id=?')
        .get(id)
    );
  }
  summary() {
    const state = this.state(),
      completed = state.activities.filter((a) => a.status === 'completed'),
      items = validationWorkItems(state);
    return {
      province: state.settings.province,
      year: state.settings.year,
      revision: state.revision,
      planned: state.activities.length - completed.length,
      completed: completed.length,
      participations: completed.reduce((n, a) => n + a.actualParticipants, 0),
      review: items.filter((r) => r.status === 'review').length,
      ready: items.filter((r) => r.status === 'ready').length,
      waiting: items.filter((r) => r.status === 'waiting').length,
      resolved: items.filter((r) => r.status === 'completed').length,
    };
  }
  exportArchive() {
    return {
      format: 'refika-backup',
      version: 2,
      validation: this.validation.archive(),
      history: this.db
        .prepare('SELECT at,message FROM history ORDER BY id')
        .all(),
      settings: this.meta('settings'),
      records: this.list('records'),
      activities: this.list('activities'),
      files: this.db
        .prepare('SELECT * FROM files')
        .all()
        .map((f) => ({ ...f, body: Buffer.from(f.body).toString('base64') })),
    };
  }
  restoreArchive(data, confirmedProvince) {
    if (
      data?.format !== 'refika-backup' ||
      ![1, 2].includes(data.version) ||
      !provinceCode(data.settings?.province) ||
      confirmedProvince !== data.settings.province
    )
      throw new Error('Yedek biçimi veya il onayı geçersiz.');
    if (
      !text(data.settings.operator, 150) ||
      !/^20\d{2}–20\d{2}$/.test(data.settings.year) ||
      Number(data.settings.year.slice(5)) !==
        Number(data.settings.year.slice(0, 4)) + 1
    )
      throw new Error('Yedekte çalışma alanı bilgileri geçersiz.');
    if (
      this.meta('settings')?.province &&
      this.meta('settings').province !== confirmedProvince
    )
      throw new Error('Başka ilin yedeği bu çalışma alanına yüklenemez.');
    if (
      !Array.isArray(data.records) ||
      !Array.isArray(data.activities) ||
      !Array.isArray(data.files) ||
      data.records.length > 100000 ||
      data.activities.length > 100000
    )
      throw new Error('Yedek içeriği geçersiz.');
    const ids = new Set();
    for (const a of data.activities) {
      validateActivity(a);
      if (!a.id || ids.has(a.id))
        throw new Error('Yedekte yinelenen faaliyet var.');
      ids.add(a.id);
    }
    const records = new Set();
    for (const r of data.records) {
      validateRecord(r, confirmedProvince);
      if (
        !r.id ||
        records.has(r.id) ||
        r.province !== confirmedProvince ||
        !['review', 'ready', 'completed'].includes(r.status)
      )
        throw new Error('Yedekte geçersiz kayıt var.');
      records.add(r.id);
    }
    if (
      data.files.some(
        (f) =>
          !ids.has(f.activity_id) ||
          !f.id ||
          typeof f.body !== 'string' ||
          Buffer.byteLength(f.body, 'base64') > 10 * 1024 * 1024,
      )
    )
      throw new Error('Yedekte geçersiz kanıt var.');
    const versions = Object.fromEntries(
      ['records', 'activities'].map((table) => [
        table,
        new Map(this.list(table).map((row) => [row.id, row.version])),
      ]),
    );
    const validation =
      data.version === 2
        ? data.validation
        : { cases: [], events: [], files: [] };
    this.validation.validateArchive(validation, data.settings, records);
    const history = data.version === 2 ? data.history : [];
    if (
      !Array.isArray(history) ||
      history.length > 500000 ||
      history.some(
        (h) =>
          !h ||
          typeof h.message !== 'string' ||
          h.message.length > 10000 ||
          !Number.isFinite(Date.parse(h.at)),
      )
    )
      throw new Error('İşlem geçmişi geçersiz.');
    const restoreRow = (table, row) => {
      this.put(table, row.id, row);
      this.db
        .prepare(`UPDATE ${table} SET version=? WHERE id=?`)
        .run(
          Math.max(
            versions[table].get(row.id) || 0,
            Number.isSafeInteger(row.version) ? row.version : 0,
          ) + 1,
          row.id,
        );
    };
    this.transaction(() => {
      this.validation.restore(validation);
      this.db.exec(
        'DELETE FROM files; DELETE FROM records; DELETE FROM activities;',
      );
      for (const r of data.records) restoreRow('records', r);
      for (const a of data.activities) restoreRow('activities', a);
      for (const f of data.files)
        this.db
          .prepare('INSERT INTO files VALUES (?,?,?,?,?)')
          .run(
            f.id,
            f.activity_id,
            text(f.name, 200),
            Buffer.from(f.body, 'base64'),
            f.created_at,
          );
      this.setMeta('settings', data.settings);
      this.db.exec('DELETE FROM history');
      for (const h of history)
        this.db
          .prepare('INSERT INTO history(at,message) VALUES (?,?)')
          .run(h.at, h.message);
      this.log('Şifreli yedekten çalışma alanı geri yüklendi.');
    });
  }
  fingerprint() {
    return digest({
      revision: this.meta('revision') || 0,
      settings: this.meta('settings'),
    });
  }
}
