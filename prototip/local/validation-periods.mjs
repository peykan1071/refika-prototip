import ExcelJS from 'exceljs';
import { caseKinds, caseStatuses } from './validation.mjs';

export const outcomeLabels = {
  approved: 'Olumlu sonuçlandı',
  rejected: 'Reddedildi',
  other: 'Diğer sonuç',
};
export const resultReference = (number) =>
  number ? `SON-${String(number).padStart(6, '0')}` : '';
export const periodLabels = [
  'Ocak–Mart',
  'Nisan–Haziran',
  'Temmuz–Eylül',
  'Ekim–Aralık',
];
const localDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Istanbul',
});
export function validationDate(value) {
  return value && Number.isFinite(Date.parse(value))
    ? localDate.format(new Date(value))
    : '';
}
export function validationPeriod(year, quarter = 'all') {
  if (
    !/^20\d{2}$/.test(String(year)) ||
    !['all', '1', '2', '3', '4'].includes(String(quarter))
  )
    throw new Error('Geçerli takvim yılı ve dönem seçin.');
  const q = String(quarter);
  const month = q === 'all' ? 1 : (Number(q) - 1) * 3 + 1;
  return {
    year: Number(year),
    quarter: q,
    from: `${year}-${String(month).padStart(2, '0')}-01`,
    to:
      q === 'all'
        ? `${year}-12-31`
        : new Date(Date.UTC(Number(year), Number(q) * 3, 0))
            .toISOString()
            .slice(0, 10),
    label:
      q === 'all'
        ? `${year} · Yılın tamamı`
        : `${year} · ${q}. Dönem (${periodLabels[Number(q) - 1]})`,
  };
}
const within = (date, period) =>
  date && date >= period.from && date <= period.to;
function identity(snapshot) {
  // Names never identify a person. Prefer the stable ESEP account ID across school changes.
  if (snapshot.accountId?.trim()) return 'account:' + snapshot.accountId.trim();
  if (snapshot.profileId?.trim()) return 'profile:' + snapshot.profileId.trim();
  if (snapshot.profileUrl?.trim()) {
    try {
      const url = new URL(snapshot.profileUrl);
      url.hash = '';
      url.search = '';
      return 'url:' + url.href.replace(/\/$/, '');
    } catch {
      return '';
    }
  }
  return '';
}
function totalFor(results, openings, period) {
  const rows = results.filter((r) => within(r.date, period));
  const people = rows.filter(
    (r) => r.kind === 'person' && r.outcome === 'approved',
  );
  const approved = (kind) =>
    rows.filter((r) => r.kind === kind && r.outcome === 'approved').length;
  return {
    ...period,
    newCases: openings.filter(
      (r) => r.source === 'case' && within(r.date, period),
    ).length,
    newSourceRecords: openings.filter(
      (r) => r.source === 'record' && within(r.date, period),
    ).length,
    results: rows.length,
    validatedPeople: new Set(people.map((r) => r.personKey).filter(Boolean))
      .size,
    personApprovals: people.length,
    unidentifiedPeople: people.filter((r) => !r.personKey).length,
    membershipApprovals: approved('membership'),
    schoolApprovals: approved('school'),
    mergers: approved('merger'),
    support: approved('support'),
    rejected: rows.filter((r) => r.outcome === 'rejected').length,
    other: rows.filter((r) => r.outcome === 'other').length,
  };
}

export function validationPeriodText(data) {
  const t = data.totals;
  return (
    `${data.period.label} validasyon özeti (${data.period.from} – ${data.period.to}), REFİKA kayıtlarına göre: ` +
    `${t.validatedPeople} kişi hesabı olumlu sonuçlandı (benzersiz ESEP hesabı); ${t.personApprovals} kişi hesabı onay işlemi kaydedildi. ` +
    `Organizasyon değişikliği: ${t.membershipApprovals}; yeni okul hesabı: ${t.schoolApprovals}; okul birleştirme: ${t.mergers}; genel destek: ${t.support} olumlu sonuç. ` +
    `Reddedilen: ${t.rejected}; diğer sonuç: ${t.other}. Toplam ${t.results} sonuç kaydı. ` +
    `${data.pendingCount} dosyanın güncel durumu çözüm bekliyor. ` +
    `Sayımlar sonuç tarihine göredir; gerçekleşme tarihi bilinmiyorsa onay bildirimi tarihi kullanılır. İnceleme ve gönderim onay sayılmaz.` +
    (t.unidentifiedPeople
      ? ` Kimliği eksik ${t.unidentifiedPeople} kişi hesabı sonucu benzersiz hesap sayısına dahil edilmedi.`
      : '') +
    (data.period.quarter === 'all'
      ? ' Yıllık kişi sayısı dört dönemin toplamı değil, yıl genelindeki benzersiz hesap sayısıdır.'
      : '') +
    (data.coverage === 'ongoing'
      ? ' Seçilen dönem henüz tamamlanmadı.'
      : data.coverage === 'future'
        ? ' Seçilen dönem henüz başlamadı.'
        : '')
  );
}

export function validationPeriodSummary(store, year, quarter = 'all') {
  const period = validationPeriod(year, quarter);
  const cases = store.validation.list();
  const records = store.list('records');
  const caseMap = new Map(cases.map((r) => [r.id, r]));
  const latestSnapshot = new Map();
  const latestReply = new Map();
  const results = [];
  const requests = [];
  // Insertion order retains the identity at the operation, even if a reopened case changes later.
  for (const raw of store.db
    .prepare('SELECT case_id,body FROM validation_events ORDER BY rowid')
    .all()) {
    const event = JSON.parse(raw.body);
    if (
      event.type === 'reply' &&
      (!latestReply.has(raw.case_id) ||
        event.happenedAt > latestReply.get(raw.case_id).happenedAt)
    )
      latestReply.set(raw.case_id, event);
    if (event.snapshot) latestSnapshot.set(raw.case_id, event.snapshot);
    if (
      event.type === 'sent' &&
      ['request', 'precheck'].includes(event.purpose)
    ) {
      const current = caseMap.get(raw.case_id);
      const snapshot = event.snapshot || latestSnapshot.get(raw.case_id) || {};
      if (current && validationDate(event.happenedAt))
        requests.push({
          id: event.id,
          caseId: raw.case_id,
          date: validationDate(event.happenedAt),
          happenedAt: event.happenedAt,
          recordedAt: event.at,
          name: snapshot.name,
          title: snapshot.title || current.title,
          accountId: snapshot.accountId,
          school: snapshot.school,
          kind: snapshot.kind,
          messageUrl: event.messageUrl || '',
          note: event.proof || '',
          currentStatus: current.status,
          historical: Boolean(event.historical),
          purpose: event.purpose,
          currentOutcome: current.outcome || '',
        });
    }
    if (event.type !== 'result' || !Object.hasOwn(outcomeLabels, event.outcome))
      continue;
    const snapshot = event.snapshot || latestSnapshot.get(raw.case_id);
    const current = caseMap.get(raw.case_id);
    const date = validationDate(event.happenedAt);
    if (!date || !current) continue;
    const row = snapshot || {};
    results.push({
      id: event.id,
      resultNumber: event.resultNumber,
      reference: resultReference(event.resultNumber),
      caseId: raw.case_id,
      date,
      happenedAt: event.happenedAt,
      recordedAt: event.at,
      recordedDate: validationDate(event.at),
      title: row.title || current.title,
      name: row.name || '',
      accountId: row.accountId || '',
      profileId: row.profileId || '',
      profileUrl: row.profileUrl || '',
      school: row.school || '',
      schoolId: row.schoolId || '',
      district: row.district || '',
      kind: row.kind || 'unknown',
      outcome: event.outcome,
      note: event.note || '',
      evidenceUrl: event.evidenceUrl || '',
      dateBasis: event.dateBasis === 'notification' ? 'notification' : 'actual',
      operator: event.operator || '',
      personKey: snapshot ? identity(snapshot) : '',
      identityRecorded: Boolean(snapshot),
      currentStatus: current.status,
    });
  }
  const openings = [
    ...cases.map((r) => ({
      id: r.id,
      caseId: r.id,
      source: 'case',
      date: validationDate(r.createdAt),
      name: r.name,
      title: r.title,
      accountId: r.accountId,
      school: r.school,
      district: r.district,
      kind: r.kind,
      currentStatus: r.status,
    })),
    ...records.map((r) => ({
      id: r.id,
      source: 'record',
      date: validationDate(r.createdAt),
      name: r.name,
      title: r.name,
      accountId: r.accountId,
      school: r.school,
      district: r.district,
      kind: 'source',
      currentStatus: r.status,
    })),
  ];
  const annual = validationPeriod(year);
  for (const request of requests) {
    const reply = latestReply.get(request.caseId);
    request.lastReply = reply
      ? {
          date: validationDate(reply.happenedAt),
          note: reply.note || '',
          messageUrl: reply.messageUrl || reply.evidenceUrl || '',
        }
      : null;
  }
  const selectedRequests = requests.filter((r) => within(r.date, period));
  const totals = totalFor(results, openings, period);
  const asOf = validationDate(new Date().toISOString());
  const data = {
    period,
    totals,
    asOf,
    generatedAt: new Date().toISOString(),
    pendingCount: new Set(
      selectedRequests
        .filter((r) => r.currentStatus !== 'completed')
        .map((r) => r.caseId),
    ).size,
    coverage:
      period.from > asOf ? 'future' : period.to >= asOf ? 'ongoing' : 'ended',
    quarters: [1, 2, 3, 4].map((q) =>
      totalFor(results, openings, validationPeriod(year, q)),
    ),
    annual: totalFor(results, openings, annual),
    results: results
      .filter((r) => within(r.date, period))
      .sort(
        (a, b) =>
          b.happenedAt.localeCompare(a.happenedAt) || a.id.localeCompare(b.id),
      ),
    openings: openings
      .filter((r) => within(r.date, period))
      .sort((a, b) => b.date.localeCompare(a.date)),
    requests: requests
      .filter((r) => within(r.date, period))
      .sort((a, b) => b.happenedAt.localeCompare(a.happenedAt)),
    unknownDateRecords: openings.filter((r) => !r.date).length,
  };
  data.text = validationPeriodText(data);
  return data;
}

export async function validationPeriodWorkbook(data) {
  const book = new ExcelJS.Workbook();
  book.creator = 'REFİKA';
  function sheet(name, headers, rows) {
    const page = book.addWorksheet(name);
    page.addRow(headers);
    for (const row of rows) page.addRow(row.map((v) => v ?? ''));
    page.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    page.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF182A49' },
    };
    page.columns.forEach((c) => {
      c.width = 25;
      c.alignment = { vertical: 'top', wrapText: true };
    });
    page.views = [{ state: 'frozen', ySplit: 1 }];
    page.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, rows.length + 1), column: headers.length },
    };
    return page;
  }
  const summaryRows = [data.totals, ...data.quarters, data.annual];
  sheet(
    'Dönem özeti',
    [
      'Kapsam',
      'Başlangıç',
      'Bitiş',
      'Valide edilen kişi (benzersiz hesap)',
      'Kişi hesabı onay işlemi',
      'Organizasyon değişikliği',
      'Yeni okul hesabı',
      'Okul birleştirme',
      'Genel destek',
      'Reddedilen',
      'Diğer sonuç',
      'Toplam sonuç',
      'Açılan talep',
      'Alınan ESEP satırı',
      'Kimliği eksik kişi sonucu',
    ],
    summaryRows.map((r) => [
      r.label,
      r.from,
      r.to,
      r.validatedPeople,
      r.personApprovals,
      r.membershipApprovals,
      r.schoolApprovals,
      r.mergers,
      r.support,
      r.rejected,
      r.other,
      r.results,
      r.newCases,
      r.newSourceRecords,
      r.unidentifiedPeople,
    ]),
  );
  sheet(
    'Tarihli sonuçlar',
    [
      'Sonuç no',
      'Dosya no',
      'Sonuç tarihi (Türkiye)',
      'Sonuç zamanı (UTC)',
      'REFİKA kayıt zamanı (UTC)',
      'Kişi',
      'Hesap ID',
      'Profil ID',
      'Profil bağlantısı',
      'Okul',
      'Okul ID',
      'İlçe',
      'İşlem türü',
      'Sonuç',
      'Sonuç / dayanak notu',
      'Kanıt bağlantısı',
      'Kaydeden',
      'Dosyanın güncel durumu',
      'Tarih dayanağı',
    ],
    data.results.map((r) => [
      r.reference,
      r.caseId,
      r.date,
      r.happenedAt,
      r.recordedAt,
      r.name,
      r.accountId,
      r.profileId,
      r.profileUrl,
      r.school,
      r.schoolId,
      r.district,
      caseKinds[r.kind] || 'Kimlik geçmişi eksik',
      outcomeLabels[r.outcome],
      r.note,
      r.evidenceUrl,
      r.operator,
      caseStatuses[r.currentStatus],
      r.dateBasis === 'notification' ? 'Onay / sonuç bildirimi' : 'Gerçekleşme',
    ]),
  );
  sheet(
    'Tarihli gönderimler',
    [
      'Dosya no',
      'Gönderim tarihi (Türkiye)',
      'Kişi / başlık',
      'Hesap ID',
      'Okul',
      'İşlem türü',
      'Güncel durum',
      'Kaynak',
      'Dayanak',
      'Güncel sonuç',
      'Son yanıt tarihi',
      'Son yanıt',
    ],
    data.requests.map((r) => [
      r.caseId,
      r.date,
      r.name || r.title,
      r.accountId,
      r.school,
      caseKinds[r.kind],
      caseStatuses[r.currentStatus],
      r.messageUrl,
      r.note,
      outcomeLabels[r.currentOutcome] || '',
      r.lastReply?.date || '',
      r.lastReply?.note || '',
    ]),
  );
  sheet(
    'Dönemde açılanlar',
    [
      'Kayıt no',
      'Kaynak',
      'REFİKA açılış tarihi (Türkiye)',
      'Kişi / başlık',
      'Hesap ID',
      'Okul',
      'İlçe',
      'Talep türü',
      'Güncel durum',
    ],
    data.openings.map((r) => [
      r.id,
      r.source === 'case' ? 'Validasyon talebi' : 'ESEP kaynak satırı',
      r.date,
      r.name || r.title,
      r.accountId,
      r.school,
      r.district,
      caseKinds[r.kind] || 'ESEP kaynak kaydı',
      caseStatuses[r.currentStatus] || r.currentStatus,
    ]),
  );
  sheet(
    'Rapor metni ve açıklama',
    ['Açıklama'],
    [
      [data.text],
      [
        `Hesaplama zamanı: ${data.generatedAt}. Yalnız bu çalışma alanında kayıtlı işlemler kapsanır.`,
      ],
      [
        'Yıl, YEĞİTEK takvim yılıdır. Sonuçlar Europe/Istanbul tarihine göre dönemlere ayrılır. Gerçekleşme tarihi bilinmiyorsa kaynakta görülen sonuç bildirimi tarihi kullanılır ve ayrıca işaretlenir. REFİKA kaydetme tarihi ayrı tutulur.',
      ],
      [
        'Kişi hesabının olumlu sonucu validasyon sayılır. Organizasyon değişikliği, okul ve destek sonuçları ayrı gösterilir. Kişi sayısı ESEP hesap kimliğiyle tekilleştirilir; ad-soyad ile birleştirme yapılmaz.',
      ],
      [
        'Yıllık benzersiz hesap sayısı dönem sayılarının toplamı değildir. Aynı dosya tekrar açılıp sonuçlanırsa her sonuç tarihli işlem olarak korunur. Önceki onay, hesabın bugün hâlâ onaylı olduğunu göstermez.',
      ],
      [
        'ESEP kaynak satırları ile validasyon talepleri ayrı kayıt türleridir; açılış sayıları birbirine eklenerek kişi sayısı hesaplanmaz. Güncel durum sütunu dönem sonu durumunu temsil etmez.',
      ],
    ],
  );
  return Buffer.from(await book.xlsx.writeBuffer());
}
