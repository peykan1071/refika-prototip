import { randomUUID } from 'node:crypto';
import {
  digest,
  dateValue,
  provinceCode,
  provinces,
  reportFor,
} from './domain.mjs';
import {
  eventReportFields,
  eventReportProblems,
  reportSchemaVersion,
} from './report-schema.mjs';

export const reportStatuses = {
  imported: 'YEĞİTEK arşivi',
  draft: 'Taslak',
  ready: 'Aktarıma hazır',
  recorded: 'YEĞİTEK kayıt bilgisi eklendi',
};
export const yegitekReportsUrl = 'https://yegitek.eba.gov.tr/etwinning-rapor/';
const today = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(
    new Date(),
  );
function value(input, max, label) {
  if (input == null) return '';
  if (typeof input !== 'string' || input.length > max)
    throw new Error(`${label} geçersiz veya çok uzun.`);
  return input.replace(/\r\n?/g, '\n').trim();
}
function sameName(a, b) {
  return (
    a.normalize('NFKC').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim() ===
    b.normalize('NFKC').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim()
  );
}
export function reportLink(link, required = false) {
  const text = value(link, 2000, 'Rapor bağlantısı');
  if (!text && !required) return '';
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error('YEĞİTEK rapor kayıt bağlantısı gerekli.');
  }
  if (
    url.origin !== 'https://yegitek.eba.gov.tr' ||
    !url.pathname.startsWith('/etwinning-rapor/') ||
    url.pathname === '/etwinning-rapor/' ||
    url.username ||
    url.password ||
    /\/(new|edit)\/?$/.test(url.pathname)
  )
    throw new Error('YEĞİTEK raporunun görüntüleme bağlantısını girin.');
  url.hash = '';
  return url.href;
}
function cleanFields(fields = []) {
  if (!Array.isArray(fields) || fields.length > 150)
    throw new Error('Rapor alanları geçersiz.');
  return fields
    .map((f) => ({
      label: value(f.label, 300, 'Alan başlığı'),
      value: value(f.value, 100000, 'Alan içeriği'),
      links: cleanLinks(f.links),
    }))
    .filter((f) => f.label);
}
function cleanLinks(links = []) {
  if (!Array.isArray(links) || links.length > 30)
    throw new Error('Ek bağlantıları geçersiz.');
  return links.map((link) => {
    const url = new URL(value(link.url, 2000, 'Ek bağlantısı'));
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error('Ek bağlantısı geçersiz.');
    return { title: value(link.title, 300, 'Ek adı'), url: url.href };
  });
}
function content(input) {
  const title = value(input.title, 300, 'Rapor başlığı'),
    period = value(input.period, 150, 'Rapor dönemi'),
    bodyText = value(input.bodyText, 300000, 'Rapor metni'),
    fields = cleanFields(input.fields);
  if (!title || !period || (!bodyText && !fields.some((f) => f.value)))
    throw new Error('Rapor başlığı, dönemi ve içeriği gerekli.');
  const from = dateValue(input.from, false),
    to = dateValue(input.to, false);
  if (!!from !== !!to || (from && to < from))
    throw new Error('Rapor tarih aralığı geçersiz.');
  return {
    title,
    period,
    bodyText,
    fields,
    from,
    to,
    reportType: input.reportType === 'event' ? 'event' : 'summary',
  };
}
export function reportText(report) {
  return [
    report.title,
    `Koordinatör: ${report.coordinator}`,
    `Dönem: ${report.period}`,
    report.from ? `Tarih aralığı: ${report.from} – ${report.to}` : '',
    '',
    report.bodyText,
    ...report.fields.map(
      (f) =>
        `\n${f.label}\n${f.value}${(f.links || []).map((l) => '\n' + l.url).join('')}`,
    ),
  ]
    .filter((v) => v !== undefined)
    .join('\n');
}
export class ReportStore {
  constructor(store) {
    this.store = store;
  }
  list() {
    return this.store.list('reports').map((r) => ({
      id: r.id,
      version: r.version,
      title: r.title,
      period: r.period,
      status: r.status,
      coordinator: r.coordinator,
      sourceUrl: r.sourceUrl,
      from: r.from,
      to: r.to,
      updatedAt: r.updatedAt,
    }));
  }
  get(id) {
    const report = this.store.get('reports', id);
    if (!report) throw new Error('Rapor bulunamadı.');
    return report;
  }
  detail(id) {
    const report = this.get(id);
    return {
      ...report,
      sourceChanged: this.sourceChanged(report),
      history: this.store.db
        .prepare(
          'SELECT version,at,reason FROM report_versions WHERE report_id=? ORDER BY version DESC',
        )
        .all(id),
    };
  }
  sourceChanged(report) {
    return (report.basis || []).some(
      (a) => this.store.get('activities', a.id)?.version !== a.version,
    );
  }
  persist(id, data, version, reason, file) {
    return this.store.transaction(() => {
      const previous = this.store.get('reports', id);
      if (previous)
        this.store.db
          .prepare('INSERT INTO report_versions VALUES (?,?,?,?,?)')
          .run(
            id,
            previous.version,
            new Date().toISOString(),
            reason,
            JSON.stringify(previous),
          );
      const saved = this.store.put(
        'reports',
        id,
        { ...data, updatedAt: new Date().toISOString() },
        version,
      );
      if (file)
        this.store.db
          .prepare('INSERT OR IGNORE INTO report_files VALUES (?,?,?,?)')
          .run(file.id, id, file.name, file.bytes);
      this.store.log(`${saved.title}: ${reason}.`);
      return this.detail(saved.id);
    });
  }
  previewImport(input) {
    const settings = this.store.meta('settings');
    const coordinator = value(input.coordinator, 150, 'Koordinatör');
    if (
      !sameName(coordinator, settings.operator) ||
      provinceCode(input.province) !== settings.province
    )
      throw new Error(
        'Raporun koordinatörü ve ili çalışma alanıyla eşleşmeli.',
      );
    const sourceUrl = reportLink(input.sourceUrl, true),
      source = {
        ...content(input),
        coordinator,
        province: settings.province,
        sourceUrl,
      };
    const sourceHash = digest(source),
      id = 'yegitek-' + digest(sourceUrl).slice(0, 24),
      existing = this.store.get('reports', id);
    const version = existing?.version || 0;
    return {
      report: { ...source, id, sourceHash, status: 'imported', basis: [] },
      version,
      action: existing
        ? existing.sourceHash === sourceHash
          ? 'unchanged'
          : 'update'
        : 'new',
      token: digest([this.store.fingerprint(), id, version, sourceHash]),
    };
  }
  import(input) {
    const p = this.previewImport(input);
    if (p.token !== input.token)
      throw new Error(
        'Rapor veya çalışma alanı değişti. Önizlemeyi yenileyin.',
      );
    if (p.action === 'unchanged') return this.detail(p.report.id);
    return this.persist(
      p.report.id,
      {
        ...p.report,
        attachments: this.store.get('reports', p.report.id)?.attachments || [],
        capturedAt: new Date().toISOString(),
      },
      p.version,
      p.action === 'new'
        ? 'YEĞİTEK kaynak raporu arşivlendi'
        : 'Kaynak raporun yeni sürümü arşivlendi',
    );
  }
  generate(input) {
    if (input.reportType === 'event') {
      const settings = this.store.meta('settings'),
        activity = input.activityId
          ? this.store.get('activities', input.activityId)
          : null;
      if (input.activityId && (!activity || activity.status !== 'completed'))
        throw new Error(
          'Etkinlik raporu için gerçekleşme ve kanıtı kaydedilmiş faaliyet seçin.',
        );
      const initial = {
        'Etkinlik Tarihi': activity?.actualDate || '',
        'Eğitim İçeriği': activity?.result || '',
        'Toplam Katılımcı Sayısı':
          activity?.actualParticipants == null
            ? ''
            : String(activity.actualParticipants),
        'Faaliyeti Gerçekleştirdiğiniz İller':
          provinces[Number(settings.province) - 1],
      };
      return {
        reportType: 'event',
        title: activity?.title || '',
        period: value(input.period, 150, 'Dönem'),
        from: input.from || '',
        to: input.to || '',
        bodyText: '',
        fields: eventReportFields.map((f) => ({
          label: f.label,
          value: initial[f.label] || '',
        })),
        basis: activity ? [{ id: activity.id, version: activity.version }] : [],
        activityId: activity?.id,
        basisHash: activity
          ? digest([[activity.id, activity.version]])
          : undefined,
        schemaVersion: reportSchemaVersion,
      };
    }
    const state = this.store.state(),
      summary = reportFor(state, input.from, input.to);
    return {
      title:
        value(input.title, 300, 'Rapor başlığı') ||
        'İl koordinatörü faaliyet raporu',
      period:
        value(input.period, 150, 'Dönem') || `${summary.from} – ${summary.to}`,
      from: summary.from,
      to: summary.to,
      bodyText: summary.text,
      fields: [],
      basis: summary.completed.map((a) => ({ id: a.id, version: a.version })),
      totals: {
        completed: summary.completed.length,
        participation: summary.total,
      },
      basisHash: digest(summary.completed.map((a) => [a.id, a.version])),
      coordinator: state.settings.operator,
      province: state.settings.province,
    };
  }
  save(input) {
    const existing = input.id ? this.get(input.id) : null;
    if (existing && ['imported', 'recorded'].includes(existing.status))
      throw new Error(
        'Kaynak ve YEĞİTEK kaydı arşivde korunur. Yeni bir taslak oluşturun.',
      );
    if (existing && input.version !== existing.version)
      throw new Error('Rapor değişti. Güncel raporu yeniden açın.');
    const settings = this.store.meta('settings'),
      data = content(input);
    let basis = existing?.basis || [],
      totals = existing?.totals;
    if (!existing && input.basisHash) {
      const generated = this.generate(input);
      if (generated.basisHash !== input.basisHash)
        throw new Error('Faaliyetler değişti. Raporu yeniden hazırlayın.');
      basis = generated.basis;
      totals = generated.totals;
    }
    if (
      existing &&
      (existing.from !== data.from || existing.to !== data.to) &&
      basis.length
    )
      throw new Error(
        'Kaynak faaliyetli raporun tarihlerini değiştirmek için yeni taslak hazırlayın.',
      );
    const originReport =
      existing?.originReport ||
      (input.originReport ? this.get(input.originReport).id : '');
    if (data.reportType === 'event') {
      const eventDate = data.fields.find(
        (f) => f.label === 'Etkinlik Tarihi',
      )?.value;
      if (eventDate) dateValue(eventDate);
      if (
        data.fields.some(
          (f) => f.label === 'Eğitim İçeriği' && f.value.length > 800,
        )
      )
        throw new Error(
          'Eğitim İçeriği en fazla 800 karakter olabilir; metni kısaltın.',
        );
    }
    return this.persist(
      existing?.id || randomUUID(),
      {
        ...data,
        coordinator: settings.operator,
        province: settings.province,
        status: 'draft',
        basis,
        totals,
        originReport,
        schemaVersion: reportSchemaVersion,
        attachments: existing?.attachments || [],
        sourceUrl: '',
        createdAt: existing?.createdAt || new Date().toISOString(),
      },
      existing?.version || 0,
      'Rapor taslağı kaydedildi',
    );
  }
  ready(id, input) {
    const report = this.get(id);
    if (input.version !== report.version)
      throw new Error('Rapor değişti. Güncel raporu yeniden açın.');
    if (report.status !== 'draft' || input.reviewed !== true)
      throw new Error('Taslağın içeriğini kontrol ettiğinizi onaylayın.');
    if (report.reportType !== 'event')
      throw new Error(
        'YEĞİTEK aktarımı için etkinlik raporu hazırlayın; dönem özeti ayrı bir çıktıdır.',
      );
    if (this.sourceChanged(report))
      throw new Error(
        'Kaynak faaliyet değişmiş. Güncel faaliyetlerle yeni taslak hazırlayın.',
      );
    const problems = eventReportProblems(report);
    if (problems.length) throw new Error(problems.join(' '));
    const eventDate = report.fields.find(
      (f) => f.label === 'Etkinlik Tarihi',
    )?.value;
    if (
      report.reportType === 'event' &&
      (eventDate > today() ||
        (report.from && (eventDate < report.from || eventDate > report.to)))
    )
      throw new Error(
        'Etkinlik tarihi gerçekleşmiş olmalı ve rapor döneminin içinde bulunmalı.',
      );
    return this.persist(
      id,
      { ...report, status: 'ready', reviewedAt: new Date().toISOString() },
      report.version,
      'Koordinatör raporu aktarım için kontrol etti',
    );
  }
  recordSubmission(id, input) {
    const report = this.get(id),
      sourceUrl = reportLink(input.sourceUrl, true),
      recordedDate = dateValue(input.recordedDate),
      proof = value(input.proof, 4000, 'Kayıt dayanağı');
    if (input.version !== report.version || report.status !== 'ready')
      throw new Error('Güncel ve aktarıma hazır rapor gerekli.');
    if (!proof || recordedDate > today())
      throw new Error('Gerçek kayıt tarihi ve YEĞİTEK kayıt dayanağı gerekli.');
    if (this.sourceChanged(report))
      throw new Error(
        'Kaynak faaliyet değişmiş. Güncel faaliyetlerle yeni taslak hazırlayın.',
      );
    return this.persist(
      id,
      {
        ...report,
        status: 'recorded',
        sourceUrl,
        submission: { recordedDate, proof, notedAt: new Date().toISOString() },
      },
      report.version,
      'Koordinatör YEĞİTEK kayıt bilgisini ekledi',
    );
  }
  addFile(id, input) {
    const report = this.get(id);
    if (input.version !== report.version)
      throw new Error('Rapor değişti. Güncel raporu yeniden açın.');
    if (report.status === 'recorded')
      throw new Error('Kaydedilmiş rapor korunur. Yeni taslak oluşturun.');
    const name = value(input.name, 200, 'Dosya adı').replace(/[\\/\r\n]/g, '_');
    if (
      !/\.(pdf|docx|xlsx|csv|txt|png|jpe?g|webp)$/i.test(name) ||
      typeof input.data !== 'string' ||
      input.data.length > 14 * 1024 * 1024 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(input.data)
    )
      throw new Error('Desteklenen, en fazla 10 MB rapor eki seçin.');
    const bytes = Buffer.from(input.data, 'base64');
    if (!bytes.length || bytes.length > 10 * 1024 * 1024)
      throw new Error('Ek dosyası boyutu geçersiz.');
    const sourceUrl = input.sourceUrl
      ? cleanLinks([{ title: name, url: input.sourceUrl }])[0].url
      : '';
    const fileId = digest([id, name, digest(bytes)]).slice(0, 32);
    if ((report.attachments || []).some((a) => a.id === fileId))
      return this.detail(id);
    return this.persist(
      id,
      {
        ...report,
        status: report.status === 'ready' ? 'draft' : report.status,
        attachments: [
          ...(report.attachments || []),
          { id: fileId, name, size: bytes.length, sourceUrl },
        ],
      },
      report.version,
      'Rapor eki arşivlendi',
      { id: fileId, name, bytes },
    );
  }
  archive() {
    return {
      reports: this.store.list('reports'),
      versions: this.store.db.prepare('SELECT * FROM report_versions').all(),
      files: this.store.db
        .prepare('SELECT * FROM report_files')
        .all()
        .map((f) => ({ ...f, body: Buffer.from(f.body).toString('base64') })),
    };
  }
  validateArchive(archive, province) {
    if (
      !archive ||
      !Array.isArray(archive.reports) ||
      !Array.isArray(archive.versions) ||
      !Array.isArray(archive.files) ||
      archive.reports.length > 10000 ||
      archive.versions.length > 100000
    )
      throw new Error('Rapor arşivi geçersiz.');
    const ids = new Set();
    const validate = (r) => {
      content(r);
      if (
        !r.id ||
        !Object.hasOwn(reportStatuses, r.status) ||
        r.province !== province ||
        !value(r.coordinator, 150, 'Koordinatör') ||
        !Array.isArray(r.basis) ||
        r.basis.length > 100000 ||
        r.basis.some(
          (a) =>
            typeof a.id !== 'string' ||
            !Number.isInteger(a.version) ||
            a.version < 1,
        )
      )
        throw new Error('Yedekte geçersiz rapor var.');
      reportLink(r.sourceUrl, ['imported', 'recorded'].includes(r.status));
    };
    for (const r of archive.reports) {
      validate(r);
      if (ids.has(r.id)) throw new Error('Yedekte yinelenen rapor var.');
      ids.add(r.id);
    }
    const fileIds = new Map();
    for (const f of archive.files) {
      if (
        !f.id ||
        fileIds.has(f.id) ||
        !ids.has(f.report_id) ||
        typeof f.body !== 'string' ||
        Buffer.byteLength(f.body, 'base64') > 10 * 1024 * 1024 ||
        !value(f.name, 200, 'Dosya adı')
      )
        throw new Error('Rapor ekleri geçersiz.');
      fileIds.set(f.id, f.report_id);
    }
    const checkFiles = (r) => {
      if (
        !Array.isArray(r.attachments) ||
        r.attachments.some((f) => fileIds.get(f.id) !== r.id)
      )
        throw new Error('Rapor eki eksik veya farklı rapora ait.');
    };
    archive.reports.forEach(checkFiles);
    const keys = new Set();
    for (const v of archive.versions) {
      const key = `${v.report_id}/${v.version}`;
      if (
        !ids.has(v.report_id) ||
        !Number.isSafeInteger(v.version) ||
        v.version < 1 ||
        keys.has(key) ||
        typeof v.body !== 'string' ||
        v.body.length > 2000000
      )
        throw new Error('Rapor sürüm geçmişi geçersiz.');
      const row = JSON.parse(v.body);
      validate(row);
      checkFiles(row);
      if (row.id !== v.report_id || row.version !== v.version)
        throw new Error('Rapor sürümü eşleşmiyor.');
      keys.add(key);
    }
  }
  restore(archive, activityVersions = new Map()) {
    const versions = new Map(
      this.store.list('reports').map((r) => [r.id, r.version]),
    );
    this.store.db.exec(
      'DELETE FROM report_files; DELETE FROM report_versions; DELETE FROM reports;',
    );
    for (const r of archive.reports) {
      this.store.put('reports', r.id, {
        ...r,
        basis: r.basis.map((a) => {
          const restored = activityVersions.get(a.id);
          return restored?.previous === a.version
            ? { ...a, version: restored.restored }
            : a;
        }),
      });
      this.store.db
        .prepare('UPDATE reports SET version=? WHERE id=?')
        .run(Math.max(versions.get(r.id) || 0, r.version || 0) + 1, r.id);
    }
    for (const v of archive.versions)
      this.store.db
        .prepare('INSERT INTO report_versions VALUES (?,?,?,?,?)')
        .run(v.report_id, v.version, v.at, v.reason, v.body);
    for (const f of archive.files)
      this.store.db
        .prepare('INSERT INTO report_files VALUES (?,?,?,?)')
        .run(f.id, f.report_id, f.name, Buffer.from(f.body, 'base64'));
  }
}
