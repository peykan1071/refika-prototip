# REFİKA 0.3.1 · Yerel uygulama

Her il kendi bilgisayarında çalışır. Merkez, bağlanan illerin özetini ortak ekranda görür. Bu sürümde yerel iş akışı ve merkez aktarım servisi çalışır; canlı merkez, kurum hesabı ve model hizmeti ayrıca kurulacaktır.

Görsel referans mevcut REFİKA demosudur: `app/page.jsx` ve `app/globals.css`. Onaylı `refika-logo-v9.png`, `welcome-agent-v11.png` ve `welcome.png` dosyaları değiştirilmeden kullanılır. Logo oranı ve yerleşimi, lacivert–sarı renkler, açık mavi zemin, yazı tipi ve çalışma masası düzeni korunur. Yeni özellikler bu tasarımın içine eklenir. İlk kurulum ekranı yerel il seçimini açıklar; kurumsal giriş varmış gibi bir parola formu göstermez. Henüz yerel veri bağlantısı olmayan demo bölümleri menüde “Yakında” olarak belirtilir.

## Windows'ta ilk kullanım

1. Dağıtım ZIP'ini bir klasöre çıkarın. `REFIKA.exe` ile yanındaki dosya ve klasörleri birlikte tutun.
2. `REFIKA.exe` dosyasını açın. İl, koordinatör adı ve eğitim yılını seçin. Bu adım bir kurum hesabı veya giriş yetkisi oluşturmaz; bilgisayardaki çalışma alanını tanımlar.
3. **Veri aktar** bölümünden boş şablonu indirin. ESEP/NSO listenizi veya faaliyet planınızı Excel/CSV biçiminde seçin. Kaynak sütunlarını eşleştirin, önizlemeyi kontrol edin, ardından içeri alın.
4. **Kayıt ve Validasyon** tablosunda **İncele** ile ilgili kaydı açın veya **Yeni talep oluştur** ile elle başlayın. Talebe özel kontrolleri ve dayanakları kaydedin. **Listeyi ve e-postayı hazırla → Taslaklar → Onaya sun → Onay Merkezi** adımlarını izleyin; gerçekleşen gönderimden sonra **Sonuç Takibi** bölümünü kullanın.
5. **Faaliyet Planı** bölümünde faaliyeti planlayın. Gerçekleştiğinde tarih, katılım, sonuç ve kanıt notunu doldurun. Kaydettiğiniz faaliyete kanıt dosyası ekleyebilirsiniz.
6. **Raporlar ve Yazışmalar** bölümünde tarih aralığını seçin. Excel/metin çıktısı alın veya yazdırma penceresinden PDF kaydedin.
7. **Ayarlar ve yedek** bölümünden düzenli şifreli yedek indirin. Parolanızı saklayın; unutulan parola kurtarılamaz.

Bir çalışma alanı bu sürümde bir il ve bir eğitim yılı içindir. İl/yıl değiştirme, çok cihazlı düzenleme ve önceki tarayıcı demosundan otomatik veri taşıma yoktur. Örnek kişisel kayıtlar pakete dahil edilmez.

## Aktarım kuralları

- ESEP listesi: il, öğretmen kimliği, öğretmen adı, okul kimliği ve okul adı zorunludur. Aynı öğretmenin farklı okul üyelikleri ayrı kayıtlardır. Aynı kimlik çifti yeniden yüklenince çoğalmaz.
- Faaliyet planı: faaliyet adı, amaç, tür ve tarihler gereklidir. Düzenli tekrar aktarımlarında sabit bir faaliyet kodu kullanın. Kod verilmezse başlık/tarih eşleşmesi kullanılır; başlık veya tarih değişince yeni kayıt oluşabilir.
- Geçersiz tarih, yanlış il, eksik alan ve aynı dosyada yinelenen kimlikler önizlemede ayrılır. Geçerli satırları ayrıca alma seçeneği açıkça onaylanır.
- İncelenmiş bir kaynağın içeriği değişirse kayıt yeniden incelemeye döner. Sonuçlandırılmış kayıtlar aktarım sırasında değiştirilmez. Önizlemeden sonra veri değişmişse yeniden inceleme gerekir.
- Excel/CSV ve Word dosyaları en fazla 5 MB; kanıt dosyaları 10 MB olabilir. Word metni otomatik onay değildir: model önerisi yine önizlemeden geçer. PDF plan okuma bu sürümde yoktur.
- ESEP'e otomatik giriş, veri çekme, hesap/üyelik değişikliği veya resmî gönderim yapılmaz. Çıktılar REFİKA şablonudur; güncel resmî şablona birebir uyum ayrıca doğrulanmalıdır.

## Validasyon ve yazışma akışı

- Talep türleri: yeni kişi hesabı, organizasyon değişikliği, yeni okul hesabı, okul hesabı birleştirme, genel destek. Kişi hesabı birleştirme işlemi tanımlanmaz.
- İlk tanıtılan demodaki kayıt tablosu ve beş adımlı şerit kullanılır; kayıt incelemesi ayrı pencerede açılır. Dört çalışma listesi tablonun filtresidir. İncelemedeki bütün türler **İnceleme Bekleyenler** listesinde yer alır; diğer dosyalar türlerine ait listede görünür. **Taslaklar** hazır talepleri, **Onay Merkezi** kontrole sunulan taslakları, **Sonuç Takibi** gönderilmiş ve sonuçlanmış talepleri gösterir. Excel çıktısı seçili ekran ve çalışma listesinin tamamını içerir; metin araması dışa aktarıma uygulanmaz.
- **İncelemeye kaydet:** Eksik kayıt saklanabilir. **Gönderime hazır kaydet:** Talebe özel bütün kontrollerin doğrulanması, her kontrol için dayanak, inceleme tarihi ve gerekli kimlik/bağlantılar şarttır. Görünen ID ile profil ID ayrı alanlardır; bağlantı ID'den tahmin edilmez. Ad-soyad ve görev yeri doğrulaması koordinatöre aittir.
- Kontroller 7 Ekim 2026 tarihli koordinatör işleyiş notlarının 1.3 sürümünden uyarlanmıştır. Bunlar resmî platform onayı veya otomatik uygunluk kararı değildir. Hesap hareketsizliği/silinme süresi için doğrulanmamış bir kural uygulanmaz.
- **Taslak hazırla:** Kural tabanlı, düzenlenebilir metin üretir ve gönderilmemiş taslak olarak saklar; AI kullanmaz. Önerilen alıcı güncel işleyişe göre kullanıcı tarafından kontrol edilmelidir. E-posta/WhatsApp gönderimi bu sürümde REFİKA içinden yapılmaz.
- **Taslağı kaydet / Onaya sun:** Düzenlenen alıcı, konu ve metin yeniden açıldığında korunur. Onaya sunulan talep **Onay Merkezi** listesine geçer; gönderilmiş sayılmaz. Talep içeriği veya kaynak kayıt değişirse güncel taslak/onay işareti düşer, eski metin geçmişte kalır. Merkez listesi toplu Excel olarak alınır; her talebin e-posta taslağı ayrı hazırlanır. Önceki demodaki çok talepli gönderim paketi henüz yerel veriyle bağlı değildir.
- **Gönderimi kaydet:** Koordinatör gerçek gönderimi alıcı, zaman, metin, kanal ve dayanakla teyit eder. Merkez talebi “Gönderildi · sonuç bekleniyor” durumuna geçirir. İlgili kişiye düzeltme/bilgilendirme dosyanın durumunu değiştirmez. Bu kayıt e-posta sağlayıcısından teslimat doğrulaması değildir.
- **Gerçek sonucu kaydet:** Gönderilmiş talep için yanıt/sonuç notu, gerçekleşme zamanı, sonuç türü ve kullanıcı teyidi gerekir. Sonuç zamanı gönderimden önce olamaz. **Yeniden incelemeye al** gerekçeyi geçmişe ekler ve kontrolleri sıfırlar; eski gönderim ve sonuç metinleri korunur.
- Aynı kaynak ve talep türü için ikinci açık dosya engellenir. Kaynak ESEP satırı değiştiğinde dosyanın gönderimi durdurulur; önce incelemeye kaydedip kontrolleri yenilemek gerekir. Kaynak ile güncel form karşılaştırılabilir. Kaynak kayıt ve ona bağlı dosya özetlerde iki kez sayılmaz; aynı kaydın farklı talep türleri ayrı işlerdir. Önceki sürümden kalan kayıtlarda eski durum ve notlar korunur; “incelendi” otomatik olarak “gönderildi” sayılmaz.
- **Kanıt ve geçmiş:** Dosya ekleri, inceleme anındaki içerik, taslak, gönderilen metin, yanıt ve sonuç geçmişi saklanır. Liste ve yazışma geçmişi Excel olarak indirilebilir. Merkeze yalnız sayılar gider; metin, alıcı ve ekler paylaşılmaz. Merkezde bekleyen gönderimler için ilave sütun vardır; eski merkez servisinin de güncellenmesi gerekir.

## Yerel veri ve yedek

Masaüstü uygulaması veriyi varsayılan olarak Windows kullanıcı profilinde `%APPDATA%\REFIKA\workspace\refika.sqlite` dosyasında tutar. `REFIKA_USER_DATA_DIR` veya `REFIKA_DATA_DIR` verilirse konum değişir. Paket klasörünü güncellemek kayıtları silmez.

Kanıtların dosya içeriği SQLite içinde tutulur ve yedeğe dahildir. İndirilen `.refika` yedeği scrypt ve AES-256-GCM ile şifrelenir; yerel SQLite dosyası şifreli değildir. Windows hesabı ve disk koruması ayrı sorumluluktur. Tek yedeğin açılmış veri sınırı 40 MB'dir; büyük arşivler için parçalara ayırma sonraki geliştirmedir.

Geri yükleme aynı il onayı ister ve mevcut kayıtların yerini alır. Önce mevcut çalışma alanınızın yedeğini alın. İşlem başarısız olursa kayıtlar birlikte geri alınır. Yedekler bağlantı anahtarlarını taşımaz. 0.3.0 yedeği validasyon dosyaları, yazışma geçmişi, kanıtlar ve işlem geçmişini içerir. Eski biçim 1 yedeği açılabilir; bu birleştirme değil tam geri yüklemedir ve yeni dosyalar eski yedekte bulunmaz. Yeni biçim 2 yedeği eski uygulamada açılmaz. Veri tabanı ilk açılışta mevcut kayıtlara dokunmadan ek tablolarla yükseltilir; geri yükleme açık formların eski sürümle kayıt ezmesini engeller.

## Kaynaktan çalıştırma

Node.js 22.13+ gereklidir; Windows paketi kendi çalışma ortamını içerir.

```sh
cd prototip
npm ci
npm run local:build
npm run local:start
```

Tarayıcı: `http://127.0.0.1:4317`. Bu kullanım veriyi `prototip/.local-data` klasöründe tutar. Sunucu yalnız bu bilgisayardan erişilebilir. `PORT` ve `REFIKA_DATA_DIR` ile test ortamı ayrılabilir.

Windows'ta kaynak kurulumundan günlük kullanım için `prototip/REFIKA-Baslat.cmd` dosyasına çift tıklayın. Başlatıcı, sunucu kapalıysa arka planda açar; zaten çalışıyorsa ikinci sunucu başlatmaz. Çalışma alanının yanıt verdiğini kontrol ettikten sonra tarayıcıyı açar. Başlatma penceresinin veya sohbetin kapanması sunucuyu durdurmaz; bilgisayar yeniden başlatıldığında dosyayı tekrar açın. Node.js ve yukarıdaki ilk kurulum gerekir; bu, Windows dağıtım paketinden ayrı bir başlatıcıdır. Sunucu kaydı `.local-data/server.log` dosyasındadır. Komut satırında `npm run local:open` aynı sunucuyu başlatır, tarayıcı açmaz. `npm run local:start` ise ön planda çalışır ve terminal kapanınca durur.

```sh
npm run desktop
npm run desktop:package
```

Son komut Windows x64 dağıtım klasörünü `release/REFIKA-win32-x64` altında üretir. Bu klasörün tamamı ZIP olarak dağıtılır. Derleme yalnız yerel uygulamayı paketler; eski Sites/vinext sunucusunu çalıştırmaz. Kod imzalama, otomatik güncelleme ve kurulum sihirbazı henüz yoktur.

## İsteğe bağlı AI

Bağlantı Ollama `/api/chat` ve yapılandırılmış JSON yanıtını destekler. Model kurulmaz veya otomatik indirilmez. Uygulamayı başlatan ortamda:

| Değişken          | Açıklama                                                            |
| ----------------- | ------------------------------------------------------------------- |
| `REFIKA_AI_URL`   | Yerel Ollama için `http://127.0.0.1:11434`; dış hizmet HTTPS olmalı |
| `REFIKA_AI_MODEL` | Hizmette kurulu modelin tam adı                                     |
| `REFIKA_AI_KEY`   | Gerekliyse hizmetin erişim anahtarı; isteğe bağlı                   |

Word planının çıkarılan metni kullanıcıya gösterilir. Metin, açık onaydan sonra model hizmetine gönderilir. Belgelerin içindeki talimatlar güvenilmeyen veri olarak ele alınır. Modelin dayanak alıntısı kaynakta aranır, alanlar normal aktarım kontrollerinden geçer ve kayıt öncesi kullanıcı incelemesi istenir. Bu kontroller içerik doğruluğunu garanti etmez. Eksik tarih veya alanı kullanıcı kaynakta düzeltmelidir.

Model hizmeti canlı bağlanıp denenmiş değildir. Bağlantı yoksa arayüz bunu gösterir; şablon, kayıt ve rapor işlemleri çalışır.

## Ortak merkez pilotu

Merkez sunucusunun değişkenleri:

| Değişken               | Açıklama                                                         |
| ---------------------- | ---------------------------------------------------------------- |
| `REFIKA_HUB_ADMIN_KEY` | En az 32 karakterlik rastgele yönetici anahtarı                  |
| `REFIKA_HUB_CLIENTS`   | JSON nesnesi: her ile ayrı rastgele anahtar → iki haneli il kodu |
| `REFIKA_HUB_DATA_DIR`  | Merkez SQLite klasörü; varsayılan `.hub-data`                    |
| `PORT`                 | Varsayılan 4320                                                  |
| `REFIKA_HUB_HOST`      | Varsayılan `127.0.0.1`; merkez dış erişimi ayrıca yapılandırılır |

`npm run hub:start` merkez API'sini ve 81 il ekranını açar. Yönetici anahtarı ekranda girilir; tarayıcı depolamasına yazılmaz. Örnek anahtar kullanmayın, anahtarları Git'e eklemeyin. Merkez kurulumunda HTTPS, kurumsal kimlik doğrulama, anahtar dağıtımı/yenileme, yedekleme ve izleme tamamlanmalıdır. Bu pilot internete yayımlanmış değildir.

İl uygulamasını başlatan ortamda `REFIKA_HUB_URL` ve yalnız o ile atanmış `REFIKA_HUB_TOKEN` tanımlanır. Koordinatör ayarlardan özet paylaşımını açar. Uygulama açıkken değişiklikler her dakika kontrol edilir; ayrıca **Şimdi eşitle** düğmesi vardır. Bağlantı yokken yerel çalışma devam eder.

Merkeze il, eğitim yılı, planlanan/tamamlanan faaliyet sayıları, toplam katılım ve kayıt durum sayıları gönderilir. Öğretmen adı, e-posta, faaliyet metni ve kanıt dosyaları gönderilmez. Katılım sayısı benzersiz kişi sayısı değildir. İl anahtarı başka il adına yazamaz; yinelenen aktarım sayıları artırmaz. İki cihaz veya eski yedek sürümü çakışırsa üzerine yazılmaz; bu pilotta merkez yöneticisinin incelemesi gerekir.

## Doğrulama ve sınırlar

```sh
npm run local:test
npx oxlint -c local/oxlint.json local scripts/build-local.mjs scripts/package-local.mjs
```

Testler gerçek geçici SQLite dosyaları, Excel/CSV örnekleri, şifreli yedek, yerel HTTP ve merkez sunucusunu kullanır. Tarayıcı arayüzünde kayıt oluşturma ve yenileme doğrulanmıştır. Önceki Windows paketinin açılış denemesi bu bilgisayarın Uygulama Denetimi tarafından engellenmiştir; güncel paket için başarılı açılış doğrulaması beklemektedir. Canlı ESEP, dış AI modeli ve 81 cihazlık saha kullanımı test edilmemiştir.

Bu sürüm kişisel bilgisayarda tek koordinatörün pilot kullanımı içindir. Kurum geneli dağıtım öncesinde gerçek veriyle aktarım eşleştirmesi, resmî çıktı şablonu, yıl geçişi, cihaz değişimi, kullanıcı yetkileri, imzalı dağıtım ve destek süreci tamamlanmalıdır. Eski web demosunun bağımlılık denetiminde kalan bulgular ayrıca ele alınmalıdır; bu masaüstü paketi o web sunucusunu içermez.
