# REFİKA yarışma demosu

## Gösterim akışı

1. Hazır örnek bilgilerle giriş yapın.
2. Kayıt ve Validasyon ekranında eksik kayıtları inceleyip okul bilgisini ve kontrol onayını tamamlayın.
3. Liste ve e-posta hazırlayın; taslağı onaya sunun. Paketi inceleyerek gönderimi simüle edin.
4. Yeni talep oluşturun: Öğretmen, Okul bağlantısını kaldırma; temsili hesap kimliği, okul kimliği ve gerekçe girin.
5. Yeni talep hazırlanırken Sonuç Takibine dönün. Önceki paketin bir talebine sonuç girin; diğerleri beklemeye devam eder.
6. Sayfayı yenileyip tekrar giriş yapın. Paket, sonuç ve yeni talep korunur.
7. Raporlar ve Yazışmalardan faaliyet özetini indirin. Benzersiz talepler ile gönderimlerdeki toplam talep sayısı ayrı gösterilir.
8. Gösterim sonunda İşlem Geçmişinden Örnek akışı sıfırla seçeneğini kullanın.

## Kapsam

Koordinatör onayı zorunludur. Tekrar gönderim aynı talep numarasını korur ve yeni paket oluşturur. Her paketin talepleri ayrı sonuç alır. Okul üyeliği onayı ve okul bağlantısını kaldırma, hesap silmeden ayrı işlemlerdir.

Tarayıcı kaydı cihaz ve tarayıcı profiline özeldir; bulut yedekleme ve çok kullanıcılı çalışma yoktur. Aynı anda bir sekmede kullanın. Depolama hatası ekranda bildirilir. Hesap incelemesindeki kişi ve kimlikler temsilidir. Gerçek veri ve şifre girmeyin.

2024–2026 inceleme özeti tarihli saha bulgularıdır; canlı eşitleme veya tamamlanmış işlem sayısı değildir. Yapay zekâ, gerçek oturum açma ve e-posta gönderimi etkin değildir. Komut kutusu ilgili ekranı açar. Ziyaret, eğitim ve mentörlük gibi diğer alanlar hazırlık ekranlarıdır.

## Doğrulama

```sh
node --test lib/workflow.test.mjs lib/account-review.test.mjs lib/demo-regression.test.mjs
npx oxlint app lib components/account-review.jsx components/result-tracker.jsx
npm run build
```

Mevcut Sites kimliği ve lacivert–sarı marka görünümü korunur. GitHub'a kaynak aktarımı Sites'taki yayını otomatik güncellemez.
