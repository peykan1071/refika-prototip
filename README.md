# REFİKA

Rehber eTwinning Faaliyetleri İl Koordinatörü Ajanı.

## Çalışan yerel pilot · 0.2.0

Windows uygulaması her ilin kayıtlarını ve kanıt dosyalarını kendi bilgisayarındaki SQLite veri tabanında tutar. Excel/CSV aktarımı, sütun eşleştirme, tekrar ve il kontrolü, kayıt inceleme, faaliyet planı, gerçekleşen sonuç, rapor ve şifreli yedek çalışır. İlk açılış boş bir il çalışma alanı oluşturur.

81 il için ortak merkez servisi, kişisel bilgiler yerine durum sayılarını toplar. Servis kodu ve il bazında anahtarlı aktarım hazırdır; canlı sunucu kurulmuş değildir. Word planını alanlara ayıran isteğe bağlı AI bağlantısı için ayrıca Ollama uyumlu bir model hizmeti gerekir.

Windows x64 paketini kaynak koddan üretmek için Node.js 22.13+ ile:

```sh
cd prototip
npm ci
npm run desktop:package
```

Çıktı: `prototip/release/REFIKA-win32-x64/REFIKA.exe`. Dağıtımda bütün klasör birlikte verilir; kullanıcıya Node.js kurulumu gerekmez. Bu sürüm imzalanmamış bir pilot pakettir.

[Pilot kullanımı, kurulum ve bağlantılar](prototip/local/README.md)

## Yarışma demosu

Önceki tarayıcı demosu `cd prototip` ardından `npm run dev` ile açılır. Demo kayıtları tarayıcıda saklanır; gerçek kimlik doğrulaması, sunucu veritabanı, yapay zekâ ve dış gönderim yoktur. Yerel pilotun SQLite kayıtlarından ayrıdır.

[Yarışma senaryosu ve doğrulama](prototip/README.md)

Kişisel saha dosyaları, çalışma arşivleri, bağımlılıklar ve üretilen derlemeler depoya dahil edilmez.
