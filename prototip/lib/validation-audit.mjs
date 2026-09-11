// Read-only research snapshot. Counts are requested actions within reviewed messages,
// deduplicated within each year; they do not assert completed validation or full-year coverage.
export const validationAudit = {
  province: 'Erzurum',
  updatedAt: '7 Eylül 2026',
  status: 'Kaynak kapsamındaki sayım tamamlandı',
  sourceScope: 'Gönderilmiş postada validasyonetw alıcısına ait 72 ileti dizisi',
  years: [
    { year: 2024, threads: 14, period: '23 Ekim – 27 Aralık', requests: 106, repeats: 8, approval: 106, correction: 0, merger: 0, deletion: 0, cancellation: 0 },
    { year: 2025, threads: 33, period: '3 Ocak – 26 Aralık', requests: 177, repeats: 7, approval: 177, correction: 0, merger: 0, deletion: 0, cancellation: 0 },
    { year: 2026, threads: 25, period: '2 Ocak – 9 Temmuz', requests: 60, repeats: 10, approval: 47, correction: 2, merger: 2, deletion: 7, cancellation: 2 },
  ],
  spreadsheet: '',
  yegitek: 'https://yegitek.eba.gov.tr/etwinning-rapor/',
  comparison: 'YEĞİTEK’te bu oturumda erişilen 10 faaliyet raporu incelendi: etkinlik yılına göre 2024’te 6, 2025’te 4; 2026 kaydı görünmedi. Bu raporlarda validasyon toplamı yok; katılımcı sayıları talep sayısına eklenmedi.',
};

export function auditText() {
  return [
    'REFİKA — ERZURUM 2024–2026 VALİDASYON İNCELEME ÖZETİ',
    `İnceleme tarihi: ${validationAudit.updatedAt}`,
    `Durum: ${validationAudit.status}`,
    `Kapsam: ${validationAudit.sourceScope}`,
    '',
    ...validationAudit.years.map(y => `${y.year} (${y.period}): ${y.threads} ileti dizisi; ${y.requests} tekrarsız talep; ${y.repeats} tekrar talep geçişi. Onay: ${y.approval}; düzeltme: ${y.correction}; birleştirme: ${y.merger}; silme: ${y.deletion}; onay iptali: ${y.cancellation}.`),
    'Toplam: 72 ileti dizisi; 343 tekrarsız talep. 368 talep geçişinden 25 tekrar ayrıldı. Onay: 330; düzeltme: 2; birleştirme: 2; silme: 7; onay iptali: 2.',
    'Talep sayısı tamamlanmış işlem veya benzersiz öğretmen sayısı değildir. Tekilleştirme her yıl içinde hesap/okul/işlem bazında yapıldı; yıllar arası toplam benzersiz kişi sayısı değildir.',
    '',
    '2024 kapsamı 23 Ekim öncesini içermiyor. 2026 devam eden yıldır. Bunlar aramada bulunan tarih aralıklarıdır; tam yıl kapsamı teyit edilmemiştir.',
    'Sayım yöntemi: gönderim tarihindeki tablo sürümü ve e-posta metni birlikte incelenir. Boş şablon satırları ve önceden onaylanan kayıtlar yeni talep sayılmaz. Tekrar gönderimler ayrıca ayrılır. Birleştirme grubu sayısı ile gruptaki hesap sayısı ayrı tutulur.',
    '2025’te 16, 2026’da 22 önceden Onaylandı satırı yeni talep sayılmadı. Bunlar satır geçişleridir; benzersiz tamamlanan işlem sayısı değildir. 2025’te açıklaması boş 5 kayıt, ilgili e-postalarda açıkça hesap onayı istendiği için onay talebi olarak sınıflandı.',
    '2026 özel e-postaları: bekleyen okul üyeliği için 1 onay; 2 birleştirme grubu (toplam 7 okul hesabı); iki okulun müdür bilgisi için 2 düzeltme. Proje görünürlüğü ve okul adaylığı rehberliği validasyon sayısına eklenmedi.',
    'Aynı hesap/okul/işlemin kapanıp yeniden açıldığına dair ek kanıt gelirse tekrar sınıflaması güncellenebilir.',
    validationAudit.comparison,
    `Tablo: ${validationAudit.spreadsheet}`,
    `YEĞİTEK rapor listesi: ${validationAudit.yegitek}`,
    '',
    'Bu kayıt tarihli bir inceleme özetidir; canlı senkronizasyon veya resmî rapor gönderimi değildir.',
  ].join('\n');
}
