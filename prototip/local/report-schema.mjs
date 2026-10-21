// Labels/options checked against the visible YEĞİTEK report form on 2026-10-09.
export const reportSchemaVersion = 'YEĞİTEK / 2026-10-09';
export const eventReportFields = [
  { label: 'İlçeler', type: 'text' },
  {
    label: 'Etkinlik Seçimi',
    options: [
      'eTwinning faaliyeti kapsamında gerçekleştirilen etkinlik/eğitim',
      'eTwinning faaliyeti kapsamı dışında gerçekleştirilen etkinlik/eğitim (TÜBİTAK, Teknofest, Erasmus vb',
    ],
  },
  {
    label: 'Etkinlik Formatı',
    options: [
      'Yüz yüze',
      'Çevrim İçi',
      'Çevrim içi (Birden fazla İl Koordinatörü ile iş birliği içerisinde açılan etkinlik)',
    ],
  },
  {
    label: 'Etkinlik Türü',
    options: [
      'Okul ziyareti',
      'Bilgilendirme Toplantısı',
      'Hizmet İçi Eğitim / Sistematik Eğitim',
      'Yüz yüze görüşmeler (Yardım masası)',
      'Çevrim içi',
      'Sergi',
      'Ödül Töreni',
      'Basım/Yayım',
    ],
  },
  {
    label: 'Eğitim Aracı',
    options: ['Yüz yüze', 'Microsoft Teams', 'Zoom', 'Adobe Connect', 'Diğer'],
  },
  { label: 'Eğitim Aracı Belirtiniz', type: 'text' },
  { label: 'Okul Adı', type: 'text' },
  { label: 'Etkinlik Tarihi', type: 'date' },
  { label: 'Eğitmen Adı', type: 'text' },
  { label: 'Eğitim İçeriği', type: 'textarea', maxLength: 800 },
  { label: 'Faaliyeti Gerçekleştirdiğiniz İller', type: 'text' },
  ...[
    'Katılımcı Öğrenci Sayısı',
    'Katılımcı Öğretmen Sayısı',
    'Katılımcı Müdür / Yardımcısı Sayısı',
    'Katılımcı Yönetici Sayısı',
    'Katılımcı Akademisyen Sayısı',
    'Katılımcı Aday Öğretmen Sayısı',
    'Toplam Katılımcı Sayısı',
  ].map((label) => ({ label, type: 'number' })),
  ...[1, 2, 3, 4, 5].map((n) => ({ label: `Haber Linki ${n}`, type: 'url' })),
];
export function eventReportProblems(report) {
  if (report.reportType !== 'event') return [];
  const values = Object.fromEntries(
    report.fields.map((f) => [f.label, f.value]),
  );
  const problems = [];
  if (values['Etkinlik Türü'] === 'Okul ziyareti' && !values['Okul Adı'])
    problems.push('Okul ziyareti için Okul Adı gerekli.');
  if (values['Etkinlik Türü'] === 'Çevrim içi' && !values['Eğitim Aracı'])
    problems.push('Çevrim içi etkinlik için Eğitim Aracı gerekli.');
  if (values['Eğitim Aracı'] === 'Diğer' && !values['Eğitim Aracı Belirtiniz'])
    problems.push('Diğer eğitim aracının adını belirtin.');
  for (const label of [
    'İlçeler',
    'Etkinlik Seçimi',
    'Etkinlik Formatı',
    'Etkinlik Türü',
    'Etkinlik Tarihi',
    'Eğitmen Adı',
    'Eğitim İçeriği',
  ])
    if (!values[label]) problems.push(`${label} eksik.`);
  for (const field of eventReportFields) {
    const v = values[field.label] || '';
    if (field.options && v && !field.options.includes(v))
      problems.push(`${field.label} seçeneğini güncelleyin.`);
    if (field.maxLength && v.length > field.maxLength)
      problems.push(
        `${field.label} en fazla ${field.maxLength} karakter olabilir.`,
      );
    if (
      field.type === 'number' &&
      v &&
      (!/^\d+$/.test(v) || Number(v) > 100000)
    )
      problems.push(`${field.label} geçersiz.`);
    if (field.type === 'url' && v && !/^https?:\/\/[^\s]+$/i.test(v))
      problems.push(`${field.label} bağlantısı geçersiz.`);
  }
  const counts = eventReportFields
    .filter((f) => f.type === 'number' && f.label !== 'Toplam Katılımcı Sayısı')
    .map((f) => values[f.label] || '');
  const total = values['Toplam Katılımcı Sayısı'];
  const sum = counts.reduce((n, v) => n + Number(v || 0), 0);
  if (
    total &&
    (sum > Number(total) ||
      (counts.every((v) => v !== '') && sum !== Number(total)))
  )
    problems.push('Katılımcı dağılımı toplam katılımcı sayısıyla uyuşmuyor.');
  return problems;
}
