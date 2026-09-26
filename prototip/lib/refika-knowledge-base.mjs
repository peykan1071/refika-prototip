// Bu katalog yalnızca rehberlik için seçilmiş, kişisel veri içermeyen kaynak özetlerini taşır.
// Ham katılımcı listeleri, mesaj dökümleri ve doğrulama kayıtları kamuya açık arayüze alınmaz.
export const knowledgeDomains = [
  {
    id: 'orientation',
    title: 'Başlangıç ve platform okuryazarlığı',
    areas: ['Rehberlik ve Mentörlük', 'Eğitim ve Etkinlikler'],
    use: 'Yeni öğretmenler için kayıt, profil, proje alanı, güvenlik ve telif adımlarını açıklar.',
    sources: ['eTwinning Nedir? Neden eTwinning?', 'Kayıt kılavuzu', 'Güvenlik ve Telif Hakları eğitimi'],
  },
  {
    id: 'projects',
    title: 'Proje tasarımı ve ortaklık',
    areas: ['Projeler ve TwinSpace', 'Rehberlik ve Mentörlük'],
    use: 'Tema seçimi, ortak bulma, görev paylaşımı, öğrenci katılımı ve proje kanıtlarını yapılandırır.',
    sources: ['Proje süreci rehberi', 'Ortak bulma ve iş birliği geliştirme sunumu', 'Düzeylere göre proje örnekleri'],
  },
  {
    id: 'quality',
    title: 'Kalite etiketi ve özel ödül hazırlığı',
    areas: ['Kalite Etiketleri', 'Projeler ve TwinSpace'],
    use: 'Başvuru ölçütleri, kanıt düzeni, proje sayfası, öğrenci katkısı ve görünürlük çalışmalarını kontrol eder.',
    sources: ['2026 Kalite Etiketi Başvuru Süreci', 'Kanıt rehberi', 'Örnek kalite etiketi başvuruları', 'Türkiye ve Avrupa özel ödül örnekleri'],
  },
  {
    id: 'schools',
    title: 'eTwinning Okulu etiketi',
    areas: ['Kalite Etiketleri', 'Okul Ziyaretleri'],
    use: 'Aday okul hazırlığı, ortak vizyon, liderlik, e-güvenlik, eylem planı ve kanıt paketi hazırlığını destekler.',
    sources: ['2026–2027 eTwinning Okulu başvuru şartları ve takvimi', 'Başvuru kılavuzu', 'Kültür Kurumu İlkokulu kanıt paketleri'],
  },
  {
    id: 'mentors',
    title: 'Mentörlük ve okul rehberliği',
    areas: ['Rehberlik ve Mentörlük', 'Okul Ziyaretleri', 'Destek Köprüsü'],
    use: 'Aktif ve deneyimli öğretmenlerden ilçe bazlı gönüllü mentör ekibi kurma; okul, çevrim içi ve yüz yüze rehberliği planlama.',
    sources: ['Koordinasyon toplantısı gündemi', 'Destek Köprüsü toplantı notları', 'Okul ziyareti ve webinar örnekleri'],
  },
  {
    id: 'training',
    title: 'Eğitim, webinar ve ITE çalışmaları',
    areas: ['Eğitim ve Etkinlikler', 'Faaliyet Planı'],
    use: 'Hizmet içi eğitim, webinar serisi, ITE iş birliği, katılımcı listesi ve çıktı kaydını planlar.',
    sources: ['Eğitim içerikleri', 'Eğitim sunumları', 'ITE bilgilendirme ve kılavuzları', 'Kurs ve seminer planları'],
  },
  {
    id: 'reporting',
    title: 'Faaliyet planı, haber ve raporlama',
    areas: ['Faaliyet Planı', 'Raporlar ve Yazışmalar'],
    use: 'Haftalık plan, aylık faaliyet kaydı, dönem sonu raporu, görsel seçimi ve haber metni taslağı üretir.',
    sources: ['2025–2026 faaliyet planı örnekleri', 'YEĞİTEK rapor alanları', 'Erzurum brifing ve ihtiyaç analizi belgeleri'],
  },
  {
    id: 'records',
    title: 'Kayıt inceleme ve kurum talepleri',
    areas: ['Kayıt ve Validasyon', 'Onay Merkezi'],
    use: 'Kurum ve kullanıcı kayıtlarındaki eksik bilgileri sınıflar; gerekli kanıtı ve resmî başvuru taslağını hazırlar.',
    sources: ['Validasyon şablonları', 'İnceleme akış şeması', 'Tarihli durum tespiti ve brifing belgeleri'],
  },
  {
    id: 'showcase',
    title: 'Tören, sergi, dergi ve yaygınlaştırma',
    areas: ['Kalite Etiketleri', 'Eğitim ve Etkinlikler', 'Raporlar ve Yazışmalar'],
    use: 'Etiket takdim töreni, proje sergisi, yıllık dergi ve sosyal medya duyurularını takvim ve görev dağılımıyla hazırlar.',
    sources: ['Ödül töreni sunum akışı', 'Takdim kurgusu', 'Dergi ve görünürlük örnekleri'],
  },
];

export const knowledgeRules = [
  'Yanıtlar kaynak havuzundaki güncel ve onaylı belgelere dayanır; değişebilecek kurallar için resmî sayfa kontrolü istenir.',
  'Yapay zekâ yalnızca taslak, kontrol listesi, sınıflandırma ve özet üretir; resmî karar veya gönderim yapmaz.',
  'Katılımcı listeleri, iletişim bilgileri, mesaj dökümleri ve inceleme kayıtları kaynak havuzuna yalnızca yetkilendirilmiş kapalı alan eklendiğinde kullanılabilir.',
];
