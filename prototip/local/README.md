# REFİKA 0.2.0 · Yerel uygulama

Her il kendi bilgisayarında çalışır. Merkez, bağlanan illerin özetini ortak ekranda görür. Bu sürümde yerel iş akışı ve merkez aktarım servisi çalışır; canlı merkez, kurum hesabı ve model hizmeti ayrıca kurulacaktır.

Görsel referans mevcut REFİKA demosudur: `app/page.jsx` ve `app/globals.css`. Onaylı `refika-logo-v9.png`, `welcome-agent-v11.png` ve `welcome.png` dosyaları değiştirilmeden kullanılır. Logo oranı ve yerleşimi, lacivert–sarı renkler, açık mavi zemin, yazı tipi ve çalışma masası düzeni korunur. Yeni özellikler bu tasarımın içine eklenir. İlk kurulum ekranı yerel il seçimini açıklar; kurumsal giriş varmış gibi bir parola formu göstermez. Henüz yerel veri bağlantısı olmayan demo bölümleri menüde “Yakında” olarak belirtilir.

## Windows'ta ilk kullanım

1. Dağıtım ZIP'ini bir klasöre çıkarın. `REFIKA.exe` ile yanındaki dosya ve klasörleri birlikte tutun.
2. `REFIKA.exe` dosyasını açın. İl, koordinatör adı ve eğitim yılını seçin. Bu adım bir kurum hesabı veya giriş yetkisi oluşturmaz; bilgisayardaki çalışma alanını tanımlar.
3. **Veri aktar** bölümünden boş şablonu indirin. ESEP/NSO listenizi veya faaliyet planınızı Excel/CSV biçiminde seçin. Kaynak sütunlarını eşleştirin, önizlemeyi kontrol edin, ardından içeri alın.
4. **Kayıt ve Validasyon** bölümünde öğretmen ve okul üyeliklerini kontrol edip dayanak notuyla durum kaydedin. Resmî sonucu yalnız ilgili işlem gerçekten sonuçlandığında girin.
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

## Yerel veri ve yedek

Masaüstü uygulaması veriyi varsayılan olarak Windows kullanıcı profilinde `%APPDATA%\REFIKA\workspace\refika.sqlite` dosyasında tutar. `REFIKA_USER_DATA_DIR` veya `REFIKA_DATA_DIR` verilirse konum değişir. Paket klasörünü güncellemek kayıtları silmez.

Kanıtların dosya içeriği SQLite içinde tutulur ve yedeğe dahildir. İndirilen `.refika` yedeği scrypt ve AES-256-GCM ile şifrelenir; yerel SQLite dosyası şifreli değildir. Windows hesabı ve disk koruması ayrı sorumluluktur. Tek yedeğin açılmış veri sınırı 40 MB'dir; büyük arşivler için parçalara ayırma sonraki geliştirmedir.

Geri yükleme aynı il onayı ister ve mevcut kayıtların yerini alır. Önce mevcut çalışma alanınızın yedeğini alın. İşlem başarısız olursa kayıtlar birlikte geri alınır. Yedekler bağlantı anahtarlarını taşımaz.

## Kaynaktan çalıştırma

Node.js 22.13+ gereklidir; Windows paketi kendi çalışma ortamını içerir.

```sh
cd prototip
npm ci
npm run local:build
npm run local:start
```

Tarayıcı: `http://127.0.0.1:4317`. Bu kullanım veriyi `prototip/.local-data` klasöründe tutar. Sunucu yalnız bu bilgisayardan erişilebilir. `PORT` ve `REFIKA_DATA_DIR` ile test ortamı ayrılabilir.

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

Testler gerçek geçici SQLite dosyaları, Excel/CSV örnekleri, şifreli yedek, yerel HTTP ve merkez sunucusunu kullanır. Tarayıcı arayüzünde kayıt oluşturma ve yenileme doğrulanmıştır. Son Windows paketinin açılış denemesi bu bilgisayarın Uygulama Denetimi tarafından engellenmiştir; güncel paket için başarılı açılış doğrulaması beklemektedir. Canlı ESEP, dış AI modeli ve 81 cihazlık saha kullanımı test edilmemiştir.

Bu sürüm kişisel bilgisayarda tek koordinatörün pilot kullanımı içindir. Kurum geneli dağıtım öncesinde gerçek veriyle aktarım eşleştirmesi, resmî çıktı şablonu, yıl geçişi, cihaz değişimi, kullanıcı yetkileri, imzalı dağıtım ve destek süreci tamamlanmalıdır. Eski web demosunun bağımlılık denetiminde kalan bulgular ayrıca ele alınmalıdır; bu masaüstü paketi o web sunucusunu içermez.
