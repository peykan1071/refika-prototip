import { caseKinds, readyProblems } from './validation.mjs';

export const batchFields = [
  ['kind', 'İşlem türü'],
  ['name', 'Ad soyad'],
  ['accountId', 'Kişi ID'],
  ['school', 'Okul adı'],
  ['schoolId', 'Okul ID'],
  ['profileUrl', 'Kişi profil bağlantısı'],
  ['schoolUrl', 'Okul profil bağlantısı'],
  ['district', 'İlçe'],
  ['email', 'E-posta'],
  ['reason', 'Açıklama'],
  ['requestedAction', 'Talep edilen işlem'],
  ['province', 'İl'],
  ['retainedProfile', 'Korunacak profil'],
  ['relatedProfiles', 'Birleştirilecek profiller'],
  ['mergeSchool', 'Birleştirilecek okul'],
  ['mergeSchoolId', 'Birleştirilecek okul ID'],
  ['mergeSchoolUrl', 'Birleştirilecek okul bağlantısı'],
  ['evidenceUrl', 'Kanıt bağlantısı'],
  ['holdReason', 'Bekleme gerekçesi'],
];
export const validationTemplates = {
  person: {
    label: 'Hesap onayı',
    sheet: 'Hesap onayı',
    file: 'hesap-onayi',
    fields: ['name', 'accountId', 'school', 'schoolId', 'reason'],
  },
  school: {
    label: 'Okul hesabı onayı',
    sheet: 'Okul hesabı onayı',
    file: 'okul-hesabi-onayi',
    fields: ['school', 'schoolId', 'reason'],
  },
  merger: {
    label: 'Okul birleştirme',
    sheet: 'Okul birleştirme',
    file: 'okul-birlestirme',
    fields: ['school', 'schoolId', 'mergeSchool', 'mergeSchoolId', 'reason'],
  },
  membership: {
    label: 'Organizasyon değişikliği',
    sheet: 'Organizasyon değişikliği',
    file: 'organizasyon-degisikligi',
    fields: ['name', 'accountId', 'school', 'schoolId', 'reason'],
  },
};
export function templateFields(kind) {
  const keys = validationTemplates[kind]?.fields;
  if (!keys) throw new Error('Excel şablon türünü seçin.');
  return keys.map((key) => [
    key,
    kind === 'merger' && key === 'school'
      ? 'Korunacak okul'
      : kind === 'merger' && key === 'schoolId'
        ? 'Korunacak okul ID'
        : batchFields.find(([field]) => field === key)[1],
  ]);
}
export const mailGroups = {
  accounts: ['Hesap Onay Validasyonları', 'validasyonetw@gmail.com'],
  merger: ['Okul Hesabı Birleştirme Talepleri', 'tretwinning@gmail.com'],
  support: ['eTwinningTR Genel Destek Talepleri', 'tretwinning@gmail.com'],
};
export function mailGroup(row) {
  return row.kind === 'merger'
    ? 'merger'
    : row.kind === 'support'
      ? 'support'
      : 'accounts';
}
export function defaultAction(row) {
  return {
    person: 'Kişinin eTwinning katılım başvurusunun incelenerek onaylanması.',
    school: 'Yeni okul hesabının incelenerek onaylanması.',
    membership:
      'Kişinin belirtilen okuldaki bekleyen organizasyon üyeliğinin onaylanması.',
    merger:
      row.retainedProfile && row.relatedProfiles
        ? `${row.relatedProfiles} profillerinin ${row.retainedProfile} ana profili altında birleştirilmesi.`
        : 'Mükerrer okul profillerinin birleştirilmesi; korunacak ana profil ve birleştirilecek profiller belirtilmeli.',
    support:
      'Açıklamadaki sorunun incelenmesi ve çözümü hakkında bilgi verilmesi.',
  }[row.kind];
}
export function batchMailDrafts(
  rows,
  { provinceName, operator, date, sender = '' },
) {
  return Object.entries(mailGroups).flatMap(([group, [label, recipient]]) => {
    const candidates = rows.filter((r) => mailGroup(r) === group);
    if (!candidates.length) return [];
    const included = candidates.filter(
      (r) =>
        !r.holdReason &&
        !Object.values(r.checks || {}).some((c) => c.status === 'fail'),
    );
    const excluded = candidates.length - included.length;
    const unverified = included.filter((r) => readyProblems(r).length).length;
    const details = included
      .slice(0, 30)
      .map((r, i) =>
        [
          `${i + 1}. ${caseKinds[r.kind]} — ${r.name || r.school}`,
          r.accountId && `Kişi ID: ${r.accountId}`,
          r.school && `Okul: ${r.school} · ID: ${r.schoolId || 'Belirtilmedi'}`,
          `Açıklama: ${r.reason}`,
          `Talep edilen işlem: ${r.requestedAction}`,
          r.profileUrl && `Kişi profili: ${r.profileUrl}`,
          r.schoolUrl && `Okul profili: ${r.schoolUrl}`,
          r.retainedProfile && `Korunacak profil: ${r.retainedProfile}`,
          r.relatedProfiles &&
            `Birleştirilecek profiller: ${r.relatedProfiles}`,
          r.evidenceUrl && `Kanıt: ${r.evidenceUrl}`,
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .join('\n\n');
    return [
      {
        group,
        label,
        recipient,
        sender,
        count: included.length,
        excluded,
        unverified,
        subject: `${provinceName.toLocaleUpperCase('tr-TR')} / ${label} / ${date}`,
        body: `Sayın Yetkili,\n\n${provinceName} iline ait ${included.length} talep, açıklamaları ve talep edilen işlemlerle birlikte ekli ${label} Excel listesinde sunulmuştur.\n\n${details}${included.length > 30 ? '\n\nDiğer kayıtların açıklamaları ve işlemleri ekli Excel listesindedir.' : ''}\n\nİlgili işlemlerin incelenmesini ve sonuç hakkında bilgi verilmesini rica ederim.\n\n${operator}\n${provinceName} eTwinning İl Koordinatörlüğü`,
      },
    ];
  });
}
