// Synthetic competition scenario. No real person or account identifiers.
// Email addresses are masked; no credentials or automatic account decisions.
export const accountCase = {
  id: 'HI-001', name: 'Örnek Öğretmen', checkedAt: '7 Eylül 2026',
  school: 'Örnek Anadolu Lisesi', schoolId: 'DEMO-OKUL-01',
  identityStatus: 'pending',
  accounts: [
    {
      id: 'DEMO-HESAP-01', profileId: 'DEMO-PROFIL-01', label: '2015 hesabı',
      registered: '11.05.2015', validated: 'Tarih görüntülenmedi',
      lastLogin: '05.06.2024', status: 'Dormant',
      email: 'ornek1@example.invalid',
      schoolNote: 'Örnek Anadolu Lisesi · Üye / Doğrulanmış',
      previousSchool: 'Örnek Ortaokulu · Okul üyeliği kaldırılmış',
      url: 'https://example.invalid/demo',
      projects: [
        { title: 'Örnek İngilizce Projesi', role: 'Üye', status: 'Kapalı', date: '23.05.2022', url: 'https://example.invalid/demo' },
        { title: 'Örnek Kültür Projesi', role: 'Yönetici', status: 'Kapalı', date: '09.12.2019', url: 'https://example.invalid/demo' },
        { title: 'Örnek Okul İklimi Projesi', role: 'Üye', status: 'Kapalı', date: '27.12.2019', url: 'https://example.invalid/demo' },
        { title: 'Örnek Şehir Projesi', role: 'Kurucu', status: 'Kapalı', date: 'Tarih görüntülenmedi', url: 'https://example.invalid/demo' },
      ],
    },
    {
      id: 'DEMO-HESAP-02', profileId: 'DEMO-PROFIL-02', label: '2023 hesabı',
      registered: '15.12.2023', validated: '25.12.2023',
      lastLogin: '25.11.2024', status: 'Dormant',
      email: 'ornek2@example.invalid',
      schoolNote: 'Örnek Anadolu Lisesi · Üye / Doğrulanmış', previousSchool: 'Başka okul görüntülenmedi',
      url: 'https://example.invalid/demo',
      projects: [
        { title: 'Örnek İyi Oluş Projesi', role: 'Üye', status: 'Kapalı', date: '13.01.2024', url: 'https://example.invalid/demo' },
      ],
    },
  ],
};
export const identityLabels = { pending: 'Kimlik doğrulaması bekleniyor', same: 'Aynı kişi olduğu teyit edildi', different: 'Farklı kişiler olduğu teyit edildi', sourceError: 'Kaynak eşleştirmesi hatalı' };
export const accessLabels = { unknown: 'Henüz bilinmiyor', old: '2015 hesabına erişebiliyor', newer: '2023 hesabına erişebiliyor', both: 'İki hesaba da erişebiliyor', neither: 'İki hesaba da erişemiyor' };
export const initialAccountReview = () => ({ identity: 'pending', access: 'unknown', evidence: '', applied: null, draft: '' });
export function reviewRecommendation(review) {
  if (review.identity === 'different') return 'Kişi–hesap bağlantılarını ayrı değerlendirin. Bu iki profil için mükerrer hesap işlemi önermeyin.';
  if (review.identity === 'sourceError') return 'Önce kaynak dosyadaki kişi–hesap eşleştirmesini düzeltme taslağı hazırlayın. ESEP hesabında işlem önermeyin.';
  if (review.identity === 'pending') return 'Öğretmenden iki hesabın kendisine ait olup olmadığını ve hangi hesaba erişebildiğini teyit edin. Şimdilik korunacak veya silinecek hesap seçmeyin.';
  return review.access === 'unknown'
    ? 'Aynı kişi teyidinin ardından erişim bilgisini tamamlayın. İki hesapta da proje geçmişi bulunduğu için hesap seçimini NSO rehberliğiyle değerlendirin.'
    : 'Erişim bilgisi ve iki hesabın proje geçmişiyle NSO destek taslağı hazırlayın. Korunacak hesap ve olası işlem, proje/etiket etkileri incelendikten sonra kararlaştırılmalı.';
}
export function applyAccountReview(review) {
  if (!Object.hasOwn(identityLabels, review.identity) || !Object.hasOwn(accessLabels, review.access)) throw new Error('Geçerli bir kimlik ve erişim durumu seçin.');
  if (review.identity !== 'pending' && !review.evidence.trim()) throw new Error('Teyidin veya kaynak düzeltmesinin dayanağını ve tarihini yazın.');
  return { identity: review.identity, access: review.identity === 'same' ? review.access : 'unknown', evidence: review.evidence.trim(), at: new Date().toISOString() };
}
export function accountReviewText(review) {
  const result = review.applied || { identity: 'pending', access: 'unknown', evidence: '' };
  return `REFİKA · ${accountCase.id} · Hesap incelemesi\n${accountCase.name} · ${accountCase.school}\nKaynak kontrolü: ${accountCase.checkedAt} (tarihli gözlem; canlı eşitleme yok)\n\n${accountCase.accounts.map(a => `${a.label}\nESEP ID: ${a.id} · Profil iç kimliği: ${a.profileId}\nKayıt: ${a.registered} · Son giriş: ${a.lastLogin} · Durum: ${a.status}\nE-posta: ${a.email} (maskeli)\nOkul: ${a.schoolNote} · Ortak okul ID: ${accountCase.schoolId}\nProjeler: ${a.projects.map(p => `${p.title} (${p.role}, ${p.status})`).join('; ')}\nKaynak: ${a.url}`).join('\n\n')}\n\nDeğerlendirme: ${identityLabels[result.identity]}\nErişim: ${accessLabels[result.access]}\nDayanak: ${result.evidence || 'Henüz eklenmedi'}\nÖneri: ${reviewRecommendation(result)}\n\nEksik: öğretmen teyidi, hesap erişimi, kalite etiketleri ve olası işlemin proje etkisi.\nBu not bir validasyon kararı veya tamamlanmış hesap işlemi değildir. Mesaj gönderilmedi; hesap silinmedi/birleştirilmedi.\n${review.draft ? '\nGÖNDERİLMEMİŞ TASLAK\n' + review.draft : ''}`;
}
export function accountReviewDraft(review) {
  const result = review.applied || { identity: 'pending', access: 'unknown', evidence: '' };
  if (['different', 'sourceError'].includes(result.identity)) return `İç inceleme notu — ${accountCase.id}\n\n${accountCase.name}\nDeğerlendirme: ${identityLabels[result.identity]}\nDayanak: ${result.evidence}\n\n${reviewRecommendation(result)}\n\nHerhangi bir hesap işlemi yapılmamıştır.`;
  if (result.identity === 'same') return `Konu: İki ESEP hesabı için erişim ve proje geçmişi konusunda rehberlik\nAlıcı: NSO yetkilisi — gönderim öncesi doğrulanmalı\n\nSayın Yetkili,\n\n${accountCase.name} adına DEMO-HESAP-01 ve DEMO-HESAP-02 ID'li iki profil incelenmiştir. İkisinin de Örnek Anadolu Lisesi (okul ID: DEMO-OKUL-01) bağlantısı bulunmaktadır.\n\nDEMO-HESAP-01: dört kapalı proje; kurucu ve yönetici rolleri de var.\nDEMO-HESAP-02: bir kapalı proje; üye rolü var.\n\nKoordinatör teyit notu: ${result.evidence}\nErişim: ${accessLabels[result.access]}\n\nProje ve kalite etiketi geçmişini koruyarak izlenecek yol hakkında rehberlik rica ediyoruz. Kalite etiketleri henüz ayrıca doğrulanmamıştır. Bu taslak bir silme veya birleştirme talebi değildir.\n\nİyi çalışmalar.`;
  return `Konu: ESEP hesap bilgilerinizi teyit etme\nAlıcı: Öğretmenin doğrulanmış iletişim adresi — henüz seçilmedi\n\nSayın Öğretmenimiz,\n\nESEP'te adınız ve Örnek Anadolu Lisesi ile bağlantılı iki profil görünmektedir: DEMO-HESAP-01 (2015) ve DEMO-HESAP-02 (2023).\n\n• Her iki hesap da size mi ait?\n• Hangi hesaba veya hesaplara giriş yapabiliyorsunuz?\n• Güncel olarak kullanmak istediğiniz hesabınız hangisi?\n• Korunmasını istediğiniz proje veya kalite etiketi geçmişiniz var mı?\n\nŞifre veya doğrulama kodu paylaşmanıza gerek yoktur. Bilgileri netleştirdikten sonra uygun destek adımını birlikte belirleyeceğiz.\n\nİyi çalışmalar.\nİl Koordinatörlüğü`;
}
