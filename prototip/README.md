# REFİKA yarışma demosu

## Gösterim akışı

1. Hazır örnek bilgilerle giriş yapın.
2. Kayıt ve Validasyon ekranında eksik kayıtları inceleyip okul bilgisini ve kontrol onayını tamamlayın.
3. Liste ve e-posta taslağını hazırlayın; gönderim öncesi kontrolden geçirerek gönderimi simüle edin.
4. Yeni talep oluşturun: Öğretmen, Okul bağlantısını kaldırma; temsili hesap kimliği, okul kimliği ve gerekçe girin.
5. Yeni talep hazırlanırken Sonuç Takibine dönün. Önceki paketin bir talebine sonuç girin; diğerleri beklemeye devam eder.
6. Sayfayı yenileyip tekrar giriş yapın. Paket, sonuç ve yeni talep korunur.
7. Raporlar ve Yazışmalardan faaliyet özetini indirin. Benzersiz talepler ile gönderimlerdeki toplam talep sayısı ayrı gösterilir.
8. Gösterim sonunda İşlem Geçmişinden Örnek akışı sıfırla seçeneğini kullanın.

## Kapsam

Koordinatör onayı zorunludur. Tekrar gönderim aynı talep numarasını korur ve yeni bir gönderim kaydı oluşturur. Her gönderimdeki talepler ayrı sonuç alır. Okul üyeliği onayı ve okul bağlantısını kaldırma, hesap silmeden ayrı işlemlerdir.

Tarayıcı kaydı cihaz ve tarayıcı profiline özeldir; bulut yedekleme ve çok kullanıcılı çalışma yoktur. Aynı anda bir sekmede kullanın. Depolama hatası ekranda bildirilir. Hesap incelemesindeki kişi ve kimlikler temsilidir. Gerçek veri ve şifre girmeyin.

2024–2026 inceleme özeti tarihli saha bulgularıdır; canlı eşitleme veya tamamlanmış işlem sayısı değildir. Yapay zekâ, gerçek oturum açma ve e-posta gönderimi etkin değildir. Komut kutusu ilgili ekranı açar. Okul ziyaretleri ile eğitim ve etkinlikler için plan, sonuç, çalışma masası, takvim ve ayrı faaliyet özeti çalışır. Mentörlük gibi diğer alanlar hazırlık ekranlarıdır.

## Doğrulama

```sh
node --test lib/workflow.test.mjs lib/account-review.test.mjs lib/demo-regression.test.mjs lib/tasks.test.mjs lib/events.test.mjs lib/dashboard.test.mjs
npx oxlint app lib components/account-review.jsx components/result-tracker.jsx components/visit-workspace.jsx components/event-workspace.jsx components/coordinator-dashboard.jsx
npm run build
```

Mevcut Sites kimliği ve lacivert–sarı marka görünümü korunur. GitHub'a kaynak aktarımı Sites'taki yayını otomatik güncellemez.

## Okul ziyareti akışı

Okul Ziyaretleri alanında temsili okul, başlık, amaç ve tarih girip planı kaydedin. Plan çalışma masasında ve Takvimim alanında görünür. Düzenle / sonuç gir ile sonuç yazıp Tamamlandı seçin. Raporlar ve Yazışmalar alanından ziyaret özetini indirin. Yenilemede kayıtlar korunur; örnek akışı sıfırlamak ziyaretleri de temizler.

PostgreSQL başlangıç şeması `database/001_tasks.sql` dosyasındadır; henüz kurulmuş veya uygulamaya bağlanmış bir veri tabanı değildir.

## Eğitim ve etkinlik akışı

Eğitim ve Etkinlikler alanında çalıştay, eğitim, webinar veya toplantı planlayın. Uygulama biçimini, hedef kitleyi, tarihi ve planlanan katılımı kaydedin. Etkinlik tamamlandığında gerçekleşen katılımı, sonucu ve kanıt notunu aynı kayda girin. Kayıt çalışma masasına ve Takvimim alanına yansır; Raporlar ve Yazışmalar bölümünden ayrı etkinlik özeti indirilebilir.

Sunucu veri modeli için `database/001_tasks.sql` sonrasında `database/002_event_details.sql` taslağı bulunur. Bu şemalar henüz kurulmuş veya uygulamaya bağlanmış değildir.

## Koordinatör çalışma masası

Ana ekran, ziyaret ve validasyon kayıtlarından türetilen güncel sayıları gösterir: bugünkü ve planlanan ziyaretler, incelenecek validasyon kayıtları, gönderim öncesi kontrol, sonucu açık talepler ve tamamlanan faaliyetler. Öncelikli işler kullanıcıyı doğrudan ilgili çalışma alanına götürür. Sayılar ayrı bir kopyada tutulmaz; kayıtların mevcut durumundan hesaplanır.
