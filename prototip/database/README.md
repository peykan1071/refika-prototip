# Sunucu veri tabanı hazırlığı

`001_tasks.sql` PostgreSQL için başlangıç şemasıdır. `002_event_details.sql`, eğitim ve etkinlik türü, uygulama biçimi, hedef kitle ile planlanan ve gerçekleşen katılım alanlarını ekler. İki dosya da henüz bir sunucuya uygulanmadı. Tarayıcı demosu bu şemaya bağlanmaz; `tasks.mjs` ve `events.mjs` modelleri temsili kayıtları mevcut demo saklama alanında tutar.

Şema kurum çalışma alanını, üyelikleri, görevleri ve göreve atamaları ayırır. Bir atama başka çalışma alanındaki göreve veya kullanıcıya bağlanamaz. Satır erişimi etkin ve zorunludur; henüz hiçbir erişim politikası verilmediği için normal uygulama rolü erişemez. Superuser/BYPASSRLS roller uygulamaya verilmemelidir.

Bağlantıdan önce: kurum altyapısı ve kimlik sağlayıcısı seçilmeli; kullanıcı doğrulaması sunucuda uygulanmalı; aktif üyelik/atama politikaları yazılmalı; rol yükseltme, il sınırı, dosya, dışa aktarma ve yedekleme testleri gerçek PostgreSQL ortamında çalıştırılmalı. Şema sahibi uygulama bağlantısı için kullanılmamalı. SQL henüz PostgreSQL üzerinde çalıştırılıp doğrulanmadı.

Şema gerçek hesap/öğretmen verilerini içermiyor. Kişisel veri aktarımı ve dış hizmet bağlantısı yapılmadı.
