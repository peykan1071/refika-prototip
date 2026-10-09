// Shared, deterministic workflow rules. These describe coordinator review, not ESEP approval.
export const ruleVersion = '2026-10-07 / 1.3';
export const caseKinds = {
  person: 'Yeni kişi hesabı',
  membership: 'Organizasyon değişikliği',
  school: 'Yeni okul hesabı',
  merger: 'Okul hesabı birleştirme',
  support: 'Genel destek',
};
export const caseStatuses = {
  review: 'İnceleme bekliyor',
  ready: 'Gönderime hazır',
  waiting: 'Gönderildi · sonuç bekleniyor',
  completed: 'Sonuçlandı',
};
export const caseGroups = {
  approval: 'Hesap Onay Validasyonları',
  review: 'İnceleme Bekleyenler',
  merger: 'Okul Birleştirme',
  support: 'Genel Destek',
};
export const checkDefinitions = {
  person: [
    [
      'participation',
      'Light hesap / eTwinning katılım talebi ayrımı kontrol edildi',
    ],
    ['identity', 'Gerçek ad-soyad koordinatör tarafından doğrulandı'],
    ['duplicate', 'Aynı ilde olası mükerrer kişi hesapları incelendi'],
    [
      'school',
      'Okul adı, il, resmî kurum e-postası, ID ve profil birlikte doğrulandı',
    ],
    ['staff', 'Görev yeri resmî kurum kadrosu veya belgeli teyitle doğrulandı'],
  ],
  membership: [
    ['pending', 'Talebe konu bekleyen okul üyeliği doğrulandı'],
    ['approvedSchool', 'Talep edilen okulun eTwinning onayı kontrol edildi'],
    [
      'previous',
      'Önceki okul üyelikleri / varsa belgeli çoklu görev durumu incelendi',
    ],
    ['identity', 'Kişi ve talep edilen okulun eşleşmesi doğrulandı'],
  ],
  school: [
    ['duplicate', 'İlde aynı kuruma ait mükerrer okul kaydı araştırıldı'],
    ['management', 'Okul idaresi bilgileri resmî kurum kaynağından doğrulandı'],
    ['school', 'Okul kimliği, il ve profil bilgileri birlikte doğrulandı'],
  ],
  merger: [
    ['sameSchool', 'Profillerin aynı okula ait olduğu kanıtlarla doğrulandı'],
    [
      'profiles',
      'Her profilin görünen ID, profil ID, bağlantı, tarih, onay ve proje bilgileri incelendi',
    ],
    [
      'retained',
      'Korunacak ana profil ve birleştirilecek profiller açıkça belirlendi',
    ],
  ],
  support: [
    [
      'scope',
      'Sorun ve talep edilen işlem açıklandı; uygun destek kanalı kontrol edildi',
    ],
    [
      'evidence',
      'İlgili hesap / okul / proje bağlantıları ve dayanaklar kontrol edildi',
    ],
  ],
};
export function caseGroup(row) {
  return row.status === 'review'
    ? 'review'
    : row.kind === 'merger'
      ? 'merger'
      : row.kind === 'support'
        ? 'support'
        : 'approval';
}
// A linked source row is represented by its case(s), never counted twice.
export function validationWorkItems(state) {
  const cases = state.validationCases || [];
  const linked = new Set(cases.map((r) => r.sourceRecordId).filter(Boolean));
  return [...cases, ...state.records.filter((r) => !linked.has(r.id))];
}
function value(input, max = 4000) {
  if (input != null && !['string', 'number'].includes(typeof input))
    throw new Error('Alan metin olmalı.');
  const result = String(input ?? '').trim();
  if (result.length > max)
    throw new Error(`Alan en fazla ${max} karakter olabilir.`);
  return result;
}
export function safeLink(input) {
  const result = value(input, 2000);
  if (!result) return '';
  let url;
  try {
    url = new URL(result);
  } catch {
    throw new Error('Tam bir https bağlantısı girin.');
  }
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('Bağlantı https olmalı ve parola içermemeli.');
  return result;
}
export function timestamp(input) {
  const result = value(input, 80);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      result,
    ) ||
    !Number.isFinite(Date.parse(result))
  )
    throw new Error('Geçerli işlem tarihi ve saati gerekli.');
  const date = result.slice(0, 10);
  if (new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date)
    throw new Error('Geçerli işlem tarihi gerekli.');
  if (Date.parse(result) > Date.now() + 300000)
    throw new Error('Gerçekleşen işlem ileri tarihli olamaz.');
  return new Date(result).toISOString();
}
export function cleanCase(input) {
  if (!Object.hasOwn(caseKinds, input.kind))
    throw new Error('Talep türünü seçin.');
  const row = { kind: input.kind };
  for (const key of [
    'title',
    'name',
    'accountId',
    'profileId',
    'school',
    'schoolId',
    'schoolProfileId',
    'district',
    'email',
    'schoolEmail',
    'reason',
    'requestedAction',
    'reviewNote',
    'holdReason',
    'retainedProfile',
    'relatedProfiles',
    'sourceRecordId',
  ])
    row[key] = value(
      input[key],
      [
        'reason',
        'requestedAction',
        'reviewNote',
        'holdReason',
        'relatedProfiles',
      ].includes(key)
        ? 6000
        : 300,
    );
  for (const key of ['profileUrl', 'schoolUrl', 'evidenceUrl'])
    row[key] = safeLink(input[key]);
  for (const key of ['email', 'schoolEmail'])
    if (row[key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row[key]))
      throw new Error('E-posta biçimini kontrol edin.');
  if (!row.title || !row.reason || !row.requestedAction)
    throw new Error(
      'Dosya başlığı, mevcut durum ve talep edilen işlem gerekli.',
    );
  row.reviewedOn = value(input.reviewedOn, 10);
  if (
    row.reviewedOn &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(row.reviewedOn) ||
      !Number.isFinite(Date.parse(row.reviewedOn)) ||
      new Date(row.reviewedOn).toISOString().slice(0, 10) !== row.reviewedOn)
  )
    throw new Error('İnceleme tarihi geçersiz.');
  row.checks = Object.fromEntries(
    checkDefinitions[row.kind].map(([key]) => {
      const check = input.checks?.[key] || {};
      if (check.status && !['unknown', 'pass', 'fail'].includes(check.status))
        throw new Error('Kontrol sonucu geçersiz.');
      return [
        key,
        { status: check.status || 'unknown', note: value(check.note, 3000) },
      ];
    }),
  );
  return row;
}
export function readyProblems(row) {
  const problems = checkDefinitions[row.kind]
    .filter(
      ([key]) => row.checks[key]?.status !== 'pass' || !row.checks[key]?.note,
    )
    .map(([, label]) => label + ': doğrulama ve dayanak gerekli.');
  if (!row.reviewedOn || !row.reviewNote)
    problems.push('İnceleme tarihi ve genel dayanak notu gerekli.');
  if (
    row.reviewedOn >
    new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
  )
    problems.push('İnceleme tarihi gelecekte olamaz.');
  if (
    ['person', 'membership'].includes(row.kind) &&
    (!row.name || !row.accountId || !row.profileUrl)
  )
    problems.push('Kişi adı, hesap ID ve profil bağlantısı gerekli.');
  if (
    row.kind !== 'support' &&
    (!row.school || !row.schoolId || !row.schoolUrl)
  )
    problems.push('Okul adı, ID ve profil bağlantısı gerekli.');
  if (row.kind === 'person' && !row.schoolEmail)
    problems.push('Resmî kurum e-postası gerekli.');
  if (row.kind === 'merger' && (!row.retainedProfile || !row.relatedProfiles))
    problems.push(
      'Korunacak profil ve birleştirilecek profillerin ayrıntıları gerekli.',
    );
  return problems;
}
export function caseDraft(row, purpose, provinceName, operator) {
  const information = purpose === 'information';
  const reason = row.holdReason || row.reviewNote || row.reason;
  return {
    recipient: information
      ? row.email
      : row.kind === 'support'
        ? 'tretwinning@gmail.com'
        : 'validasyonetw@gmail.com',
    subject: information
      ? `ESEP/eTwinning kaydınız hakkında / ${row.title}`
      : `${provinceName.toLocaleUpperCase('tr-TR')} / ${caseKinds[row.kind]} / ${row.title}`,
    body: information
      ? `Sayın ${row.name || 'ilgili'},\n\n${row.title} için inceleme notumuz:\n${reason}\n\nBeklenen düzeltme / işlem:\n${row.requestedAction}\n\n${row.profileUrl || row.schoolUrl}\n\nDüzeltme tamamlandığında bilgi vererek yeniden inceleme isteyebilirsiniz.\n\n${operator}\n${provinceName} eTwinning İl Koordinatörlüğü`
      : `Sayın Yetkili,\n\n${row.reason}\n\nTalep edilen işlem: ${row.requestedAction}\n\nKişi: ${row.name || '—'} · ID: ${row.accountId || '—'}\nKişi profili: ${row.profileUrl || '—'}\nOkul: ${row.school || '—'} · ID: ${row.schoolId || '—'}\nOkul profili: ${row.schoolUrl || '—'}\n${row.kind === 'merger' ? `Korunacak profil: ${row.retainedProfile}\nBirleştirilecek profiller:\n${row.relatedProfiles}\n` : ''}İnceleme: ${row.reviewedOn}\nDayanak: ${row.reviewNote}\nKanıt bağlantısı: ${row.evidenceUrl || 'Bağlantı belirtilmedi'}\n\nİlgili işlemin incelenmesini ve sonucu hakkında bilgi verilmesini rica ederim.\n\n${operator}\n${provinceName} eTwinning İl Koordinatörlüğü`,
  };
}
export const caseExportHeaders = [
  'Dosya no',
  'Çalışma listesi',
  'Talep türü',
  'Başlık',
  'Kişi',
  'Hesap ID',
  'Kişi profil ID',
  'Kişi bağlantısı',
  'Okul',
  'Okul ID',
  'Okul profil ID',
  'Okul bağlantısı',
  'İlçe',
  'E-posta',
  'Kurum e-postası',
  'Mevcut durum',
  'Talep edilen işlem',
  'İnceleme tarihi',
  'Dayanak',
  'Bekleme gerekçesi',
  'Korunacak profil',
  'Birleştirilecek profiller',
  'Kanıt bağlantısı',
  'Durum',
  'Sonuç',
  'Kural sürümü',
  'ESEP kontrol zamanı (UTC)',
  'ESEP kişi durumu (kaynak metni)',
  'ESEP okul durumu (kaynak metni)',
  'ESEP üyelik durumu (kaynak metni)',
  'İlişkili ESEP okul profilleri',
];
export function caseExportRow(row) {
  return [
    row.id,
    caseGroups[caseGroup(row)],
    caseKinds[row.kind],
    row.title,
    row.name,
    row.accountId,
    row.profileId,
    row.profileUrl,
    row.school,
    row.schoolId,
    row.schoolProfileId,
    row.schoolUrl,
    row.district,
    row.email,
    row.schoolEmail,
    row.reason,
    row.requestedAction,
    row.reviewedOn,
    row.reviewNote,
    row.holdReason,
    row.retainedProfile,
    row.relatedProfiles,
    row.evidenceUrl,
    caseStatuses[row.status],
    row.result || '',
    row.ruleVersion,
    row.esepCheck?.checkedAt || '',
    row.esepCheck?.person.sourceLabel || '',
    row.esepCheck?.school.sourceLabel || '',
    row.esepCheck?.membership.sourceLabel || '',
    row.esepCheck?.school.relatedProfiles
      ?.map((p) => p.id + ' · ' + p.title + ' · ' + p.profileUrl)
      .join('\n') || '',
  ];
}
