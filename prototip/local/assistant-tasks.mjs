export const assistantPages = {
  home: {
    title: 'Gününü REFİKA ile planla',
    description: 'Kayıtlı işlerin özetini çıkar, sonraki adımı belirle.',
    tasks: ['daily'],
  },
  activities: {
    title: 'Planını REFİKA ile geliştir',
    description:
      'Bir plan maddesi seç; uygulanabilir bir faaliyet ve hazırlık listesi oluştur.',
    tasks: ['activity', 'preparation'],
  },
  records: {
    title: 'Dosyanı REFİKA ile değerlendir',
    description:
      'Öğretmenin sorusunu yapıştır veya ilgili dosyadan bir yazışma hazırla.',
    tasks: ['reply', 'case_summary', 'correspondence'],
  },
  visits: {
    title: 'Ziyaretini REFİKA ile hazırla',
    description:
      'Okul ziyaretinin gündemini oluştur, görüşme notlarını düzenle.',
    tasks: ['visit_agenda', 'visit_notes'],
  },
  events: {
    title: 'Eğitimini REFİKA ile tasarla',
    description: 'Hedef kitleye uygun akış, değerlendirme ve duyuru hazırla.',
    tasks: ['training', 'assessment', 'announcement'],
  },
  reports: {
    title: 'Metnini REFİKA ile hazırla',
    description:
      'Kayıtlı faaliyetten rapor, web haberi veya Instagram paylaşımı oluştur.',
    tasks: ['report', 'web', 'instagram'],
  },
};

export const assistantTasks = {
  daily: {
    label: 'Günün işlerini özetle',
    tone: 'Kısa ve yönlendirici',
    instruction:
      'Hazır hesaplanmış sayıları aynen kullan. Yaklaşan kayıtlı işleri özetle; en fazla üç öncelik öner. Sonuç bekleyen dosyalar için yeni sonuç uydurma.',
  },
  activity: {
    label: 'Faaliyet tasarla',
    tone: 'Planlı ve uygulanabilir',
    instruction:
      'Amaç, hedef kitle, önerilen uygulama akışı, materyal ve beklenen çıktı başlıklarında faaliyet taslağı hazırla. Önerileri kaynakta kesinleşen bilgilerden açıkça ayır.',
  },
  preparation: {
    label: 'Hazırlık adımlarını çıkar',
    tone: 'Somut ve düzenli',
    instruction:
      'Seçilen çalışma için sıralı hazırlık listesi oluştur. Kaynakta yoksa kesin tarih, görevli, bütçe veya katılımcı sayısı belirleme.',
  },
  reply: {
    label: 'Öğretmen sorusunu yanıtla',
    tone: 'Nazik, anlaşılır ve destekleyici',
    instruction:
      'Soruyu yanıtlayan, öğretmene hitap eden bir taslak oluştur. Yetersiz bilgide açıklayıcı soru sor. Kişi hesabı, okul kaydı ve okul üyeliğini ayır. Kanıt olmadan hesabın onaylandığını, aktifleştiğini veya çözüldüğünü söyleme. Şifre veya doğrulama kodu isteme.',
  },
  case_summary: {
    label: 'Dosyayı özetle',
    tone: 'Açık ve dikkatli',
    required: true,
    instruction:
      'Talep, tarihli mevcut gözlemler, geçmiş sonuç ve beklenen sonraki adımı ayrı özetle. Tarihli ESEP gözlemini geçmiş onay tarihiyle karıştırma. Farklı hesapların aynı kişiye ait olduğunu varsayma.',
  },
  correspondence: {
    label: 'Yazışma hazırla',
    tone: 'Kurumsal ve açık',
    required: true,
    instruction:
      'Seçilen talebin gerekçesine uygun konu ve e-posta gövdesi hazırla. Kaynakta olmayan alıcı veya onay bilgisi uydurma. Bu çıktı gönderilmemiş taslaktır.',
  },
  visit_agenda: {
    label: 'Ziyaret gündemi hazırla',
    tone: 'Yapıcı ve rehberlik odaklı',
    instruction:
      'Amaç, görüşülecek konular, sorular ve takip adımlarından oluşan ziyaret gündemi öner. Ziyaretin gerçekleştiğini varsayma.',
  },
  visit_notes: {
    label: 'Görüşme notlarını düzenle',
    tone: 'Tarafsız ve yapıcı',
    instruction:
      'Yazılan görüşme notlarını görüşülen konular, ifade edilen ihtiyaçlar ve önerilen takip adımları olarak düzenle. Söylenmeyen ifadeleri kişilere atfetme.',
  },
  training: {
    label: 'Eğitim akışı hazırla',
    tone: 'Öğretici ve katılımcı',
    instruction:
      'Hedef kitle ve amaca uygun oturum akışı, uygulama ve materyal öner. Kaynakta olmayan süreyi öneri olarak işaretle; eğitmen veya kesin tarih uydurma.',
  },
  assessment: {
    label: 'Değerlendirme soruları hazırla',
    tone: 'Anlaşılır ve teşvik edici',
    instruction:
      'Eğitimin amacıyla ilişkili kısa değerlendirme soruları ve geribildirim maddeleri öner. Gereksiz kişisel bilgi sorma.',
  },
  announcement: {
    label: 'Duyuru hazırla',
    tone: 'Sıcak ve katılıma davet eden',
    required: true,
    instruction:
      'Planlanan faaliyet için duyuru hazırla. Yalnız kayıtlı kesin tarih ve başvuru bilgilerini kullan; eksiklerini ayrı listele. Gerçekleşmiş gibi yazma.',
  },
  report: {
    label: 'Rapor taslağı hazırla',
    tone: 'Kurumsal ve kanıta dayalı',
    required: true,
    completed: true,
    instruction:
      'Gerçekleşen çalışmanın amacı, uygulaması ve sonucunu raporlaştır. Yalnız kayıtlı gerçekleşme tarihi ve gerçek katılımı kullan. YEĞİTEK eğitim içeriği için 800 karakteri aşmayan ayrı bir kısa özet de öner. Resmî sisteme kaydedildiğini iddia etme.',
  },
  web: {
    label: 'Web haberi hazırla',
    tone: 'Kurumsal ve akıcı',
    required: true,
    completed: true,
    instruction:
      'Başlık, kısa özet ve haber gövdesi hazırla. Yalnız gerçekleşen kayıtlı faaliyeti anlat. Katılımcı sayısı, makam, konuşmacı sözü ve başarı uydurma. Kişisel iletişim bilgisi yayımlama.',
  },
  instagram: {
    label: 'Instagram metni hazırla',
    tone: 'Sıcak, kısa ve kapsayıcı',
    required: true,
    instruction:
      'Faaliyet planlıysa gelecek zamanlı duyuru; tamamlandıysa gerçekleşen çalışmanın kısa paylaşımını hazırla. Uygun az sayıda etiket öner. Kaynakta olmayan hesap etiketi, bağlantı veya kişi adı ekleme. Kişisel iletişim bilgisi yayımlama.',
  },
};

export function assistantPage(page) {
  return ['drafts', 'approval', 'results'].includes(page) ? 'records' : page;
}
