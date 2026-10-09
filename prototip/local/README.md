# REFİKA 0.6.8 · Yerel uygulama

Her il kendi bilgisayarında çalışır. Merkez, bağlanan illerin özetini ortak ekranda görür. Bu sürümde yerel iş akışı ve merkez aktarım servisi çalışır; canlı merkez, kurum hesabı ve model hizmeti ayrıca kurulacaktır.

Görsel referans mevcut REFİKA demosudur: `app/page.jsx` ve `app/globals.css`. Onaylı `refika-logo-v9.png`, `welcome-agent-v11.png` ve `welcome.png` dosyaları değiştirilmeden kullanılır. Logo oranı ve yerleşimi, lacivert–sarı renkler, açık mavi zemin, yazı tipi ve çalışma masası düzeni korunur. Yeni özellikler bu tasarımın içine eklenir. İlk kurulum ekranı yerel il seçimini açıklar; kurumsal giriş varmış gibi bir parola formu göstermez. Henüz yerel veri bağlantısı olmayan demo bölümleri menüde “Yakında” olarak belirtilir.

## Windows'ta ilk kullanım

1. Dağıtım ZIP'ini bir klasöre çıkarın. `REFIKA.exe` ile yanındaki dosya ve klasörleri birlikte tutun.
2. `REFIKA.exe` dosyasını açın. İl, koordinatör adı ve eğitim yılını seçin. Bu adım bir kurum hesabı veya giriş yetkisi oluşturmaz; bilgisayardaki çalışma alanını tanımlar.
3. **Veri aktar** bölümünden boş şablonu indirin. ESEP/NSO listenizi veya faaliyet planınızı Excel/CSV biçiminde seçin. Kaynak sütunlarını eşleştirin, önizlemeyi kontrol edin, ardından içeri alın.
4. **Kayıt ve Validasyon → Excel’den yeni kayıt** ile validasyon listenizi yükleyin. Açıklamaları, işlemleri ve otomatik mail taslaklarını önizleyip kayıtları topluca oluşturun. Gerçek gönderimi ve gelen onay mailinin kapsadığı kayıtları aynı listede seçerek topluca işleyin. Özel durumlar için ayrıntılı tekil kayıt formu da bulunur.
5. **Faaliyet Planı → Plan ekle** ile aylık planınızı alın. Bir maddedeki **Faaliyet kaydı oluştur** düğmesiyle somut çalışmayı planlayın. Gerçekleştiğinde tarih, katılım, sonuç ve kanıt notunu doldurun. Kaydettiğiniz faaliyete kanıt dosyası ekleyebilirsiniz.
6. **Raporlar ve Yazışmalar** bölümünde arşivi açın veya **Yeni etkinlik raporu** hazırlayın. Toplu Excel/metin çıktısı ve yazdırma için **Dönem faaliyet özeti** sekmesini kullanın.
7. **Ayarlar ve yedek** bölümünden düzenli şifreli yedek indirin. Parolanızı saklayın; unutulan parola kurtarılamaz.

Bir çalışma alanı bu sürümde bir il ve bir eğitim yılı içindir. İl/yıl değiştirme, çok cihazlı düzenleme ve önceki tarayıcı demosundan otomatik veri taşıma yoktur. Örnek kişisel kayıtlar pakete dahil edilmez.

## Excel listesi, merkez açıklamaları ve toplu mail

1. **Excel’den yeni kayıt** bölümünde **Hesap onayı (5 sütun)**, **Okul hesabı onayı (3 sütun)**, **Okul birleştirme (5 sütun)** veya **Organizasyon değişikliği (5 sütun)** şablonunu seçin. Her şablonda açıklama bulunur. Kişi ve okul adlarını ESEP’ten bağlantılarıyla yapıştırın; ayrı bağlantı sütunu gerekmez. Yerleşik köprüler ve Google E-Tablodan gelen iki sabit metinli `HYPERLINK` formülleri okunur; hesaplanan formüller çalıştırılmaz. `.xlsx` bağlantıları korur, CSV taşımaz. Görünen ID ile profil adresi ayrı tutulur; bağlantı ID’den uydurulmaz. Eski uzun dosyalar ve elle sütun eşleştirme desteklenir. Karma çıktıda talep türleri ayrı çalışma sayfalarına ayrılır.
2. Dolu dosyayı seçip **İleri → Önizlemeyi aç** düğmesine basın. Yeni, mevcut, tekrarlanan ve hatalı satırlar ayrılır. Boş şablonda başlıkların altını doldurup Excel’de kaydetmeniz istenir; çok sekmeli dosyada doğru çalışma sayfası seçilebilir. Dosya hatası yükleme alanında gösterilir. Eksik açıklama açıkça belirtilir; belirtilmeyen işlem türüne göre taslak ifade hazırlanır. **Kaydetmeden Excel önizlemesini indir** yalnız dosya üretir. Önizlemeyi kontrol edip **Kayıtları oluştur → Mail taslağına geç** düğmesine basınca yeni kayıtlar ve kaynak Excel saklanır. Bu işlem kontrol yapılmış veya onay gelmiş saymaz. Mevcut satırlar için **Mevcut kaydı aç** kullanılabilir.
3. **Taslaklar → Excel listesi ve toplu e-posta** bölümünde listenizi açın. Hesap onayı, okul birleştirme ve genel destek için ayrı alıcı, konu, metin ve Excel eki hazırlanır. Her satırın açıklaması ve talep edilen işlemi Excel’de bulunur; mailde ilk 30 satır ayrıntılı verilir, devamı eke yönlendirilir. Bekleme gerekçesi veya başarısız kontrolü bulunan satırlar mailden ve grup ekinden çıkarılır. Eksik kontroller gönderimden önce tamamlanmalıdır. Mail düzenlenip saklanabilir; satırlar değişirse taslak yeniden oluşturulur. Metni indirmek göndermek değildir.
4. Excel ve maili gerçekten gönderdikten sonra ilgili satırları seçin; tarih ve mail metni/bağlantısıyla **Gönderimi kaydet** işlemini yapın. Bu işlem gerçekleşen gönderimin kaydıdır; teknik kontrolleri otomatik olumluya çevirmez.
5. Yanıt geldiğinde **Onay / sonuç mailini işle** ile yalnız mailin kapsadığı satırları seçin, sonucu ve tarihi kaydedin. İstisna tutulanlar bekler. Onaylanan kişi, okul ve üyelikler **Validasyonla onaylanan hesaplar** sekmesine yansır; kalıcı sonuç numaraları ve dört dönem sayıları güncellenir. Excel’de yazan “Onaylandı” tek başına sonuç oluşturmaz.

### İl ESEP envanteri

**Kayıt ve Validasyon → İl ESEP envanteri** ildeki kişi ve okul listelerini ayrı tutar. Excel/CSV dosyası seçilir, kaynak tarihi ve il doğrulanır, sütunlar önizlenir ve **Envanteri güncelle** ile alınır. İsim hücresindeki ESEP köprüsü okunur; görünen ESEP ID ile profil adresinin içindeki teknik ID birbirinin yerine kullanılmaz. Aynı kişi birden fazla okul satırında yer alıyorsa tek kişi altında birleşir; çelişen ad/durumlar düzeltilmeden aktarılmaz. Telefon, e-posta ve eşleştirilmeyen sütunlar alınmaz; ham dosya saklanmaz.

Aktif/dormant durumu, onay durumu ve güncel/geçmiş il ilişkisi ayrıdır. Bir bilgi kaynakta yoksa “belirtilmemiş / kontrol edilmeli” kalır. ESEP il filtresi geçmiş okul ilişkilerini de kapsayabildiğinden il filtresindeki toplam, halen o ilde görevli kişi sayısı olarak kullanılmaz. Okul adı aynı ESEP ID ile değişirse eski/yeni ad geçmişte korunur ve kişi listesindeki okul adı güncellenir. Listeye girmeyen okul ID’leri bağlantı URL’sinden uydurulmaz.

Varsayılan aktarım **kısmi liste**dir. Tam il güncellemesinde tüm sayfalar ve hesap durumları bulunmalı, ESEP toplamı dosyadaki benzersiz ID sayısıyla eşleşmelidir. Tam listede bulunmayan kayıtlar ayrıca incelenir; silinmez ve dormant sayılmaz. Eski tarihli dosya güncel verinin üzerine yazamaz. Her başarılı tam liste, kaynak tarihinden **üç takvim ayı** sonrası için uygulama içi hatırlatma üretir. Kişi ve okul yenileme tarihleri ayrıdır. Kısmi yükleme bu tarihi ertelemez. REFİKA kapalıyken işletim sistemi bildirimi gönderilmez.

Onay mailiyle sonuçlandırılan kişi/okul validasyonları aynı ID ile envantere otomatik bağlanır. ESEP dosyasında henüz görülmeyenler “validasyondan geldi; ESEP listesi bekliyor” sayısında kalır; bu kayıtlar ESEP toplamını veya aktif hesap sayısını şişirmez. Üyelik onayı kişi/okul onayı yerine geçmez. Tarihsel sonuç numaraları ve dönemlik validasyon istatistikleri korunur.

Bu sürüm ESEP oturumuna otomatik bağlanmaz. Hesapta toplu dışa aktarma seçeneği yoksa yetkili birimden il dosyası alınabilir veya tablo satırları Excel’e kopyalanıp **kısmi liste** olarak yüklenebilir. Tek sayfa, tam il listesi değildir. Şifreli yedek sürüm 5 envanter geçmişini kapsar; eski yedekler de okunur. Envanter kişi/okul verileri AI veya merkez hizmetine gönderilmez.

Aynı işlem türü ve kişi/okul ID çifti yeniden yüklenirse ikinci dosya oluşturulmaz. Yeni bir işlem döngüsü gerekiyorsa mevcut kaydı inceleyip yeniden açın. Mail okuma veya gönderme otomatik değildir. Liste, kaynak dosya, taslak düzenlemeleri ve sonuç geçmişi yedeğe dahildir.

**Alıcı ayrımı:** Kişi hesabı, yeni okul hesabı ve öğretmenin yeni okuldaki üyelik onayı `validasyonetw@gmail.com`; okul hesabı birleştirme ve genel destek `tretwinning@gmail.com` adresine yönlendirilir. Okul adı/türü veya müdür bilgisi düzeltmesi, öğretmenin organizasyon üyeliği değişikliğinden farklı bir destek talebidir. Bu ayrım 9 Ekim 2026’da koordinatörün gönderilmiş yazışmalarından kontrol edilmiştir. Tarihsel gönderilmiş mailler değiştirilmez; taslakların alıcısı gönderim öncesinde görülebilir ve düzenlenebilir.

## Ortak e-posta ve Google E-Tablo

**Ayarlar ve yedek → İl koordinatörlüğü iletişim bilgileri** alanında ilin ortak e-postasını ve Google E-Tablo bağlantısını kaydedin. Bunlar okulun resmî kurum e-postasından ayrı koordinatörlük bilgileridir. Ortak adres toplu mail ekranında gönderen adres olarak gösterilir; posta hesabında oturum açmaz ve mail göndermez.

**Ortak E-Tabloyu aç / düzenle** aynı Google dosyasını açar. Google bağlantısı kurulmadan da **Dosya → İndir → Microsoft Excel (.xlsx)** ile güncel kopyayı REFİKA’ya yükleyebilirsiniz. Varsa **Gönderilecek Talepler** sekmesi önce seçilir; arşiv ve diğer sekmeler ayrıca seçilebilir. Dosya yüklemek mevcut kayıtların açıklamasını veya sonucunu ezmez. Bağlantı ve ortak e-posta yerel şifreli yedeğe dahildir; merkez özetine dahil edilmez.

### Otomatik E-Tablo eşitlemesi

**Ayarlar ve yedek → Google E-Tablo eşitlemesi** veya Excel yükleme ekranındaki **Dosya indirmeden otomatik E-Tablo eşitlemesi** alanını açın.

1. İlk kurulumda uygulama sorumlusu Google Cloud projesinde **Google Sheets API** ve **Google Picker API** hizmetlerini açar. Google Auth Platform’da onay ekranını ve **Masaüstü uygulaması** türünde OAuth istemcisini oluşturur. İndirilen istemci JSON dosyası REFİKA’da **İlk bağlantı kurulumu** alanına seçilir. Bu kurulum Google hesabı şifresi istemez. Pilot test hesabı Google Auth Platform test kullanıcılarına eklenmelidir. Test modundaki bağlantılar yeniden giriş isteyebilir; 81 il dağıtımı öncesinde Google yayın ve izin gereklilikleri tamamlanmalıdır.
2. **Google hesabını bağla → Google izin ekranını aç** ile dış tarayıcıda kurum hesabını ve kayıtlı E-Tabloyu seçin. Yalnız `drive.file` kapsamı istenir; REFİKA ayrıca kayıtlı dosya ID’si dışındaki dosyalara API çağrısı yapmaz. OAuth kodu PKCE ve tek kullanımlı state ile yerel callback’e döner. Windows kaynak kullanımında DPAPI, Electron paketinde `safeStorage` bağlantı anahtarlarını korur. Anahtarlar API durum çıktısına, Git’e veya REFİKA yedeğine yazılmaz. Başka cihazda yeniden bağlanmak gerekir.
3. **E-Tablonun sekmelerini getir** ile çalışma sayfasını seçin; **Gönderilecek Talepler** önerilir. **İleri → E-Tabloyu önizle** ile satırları kontrol edin. İlk bağlantıda hatalı/tekrarlanan satırları düzeltin, onay kutusuyla **Eşitlemeyi başlat** deyin. Bu pilotta tek aktif sekme, ilk 100 sütun ve başlık dahil 2.001 satır sınırı vardır. Arşivleri ayrı sekmede tutun.
4. REFİKA açıkken iki dakikada bir kontrol yapılır. Yeni satırlar kayıt ve toplu mail listesi oluşturur. Mevcut kaydın ilk eşleştirmedeki farklılıkları ve aynı alanın iki tarafta değişmesi incelemeye düşer. Sonraki tek taraflı değişiklikler inceleme durumuna alınarak uygulanır; kontroller yeniden yapılır. Gönderilmiş/sonuçlanmış dosyalar otomatik değiştirilmez. Satır silinirse yerel kayıt silinmez. Eşleştirme talep türü ve kişi/okul ID’sine dayanır; kimlik değişikliği yeni kayıt sayılabilir. Bu değişiklikleri incelemek gerekir. E-Tablodaki durum yazısı onay sonucu üretmez. Listeye yeniden geçmek veya **Şimdi eşitle** ekranı günceller.
5. **Sonuç aktarımını aç** ayrıca seçilirse yalnız bağlı sekmeyle eşleşen kayıtların gerçek gönderim ve sonuç olayları aynı dosyada **REFIKA Sonuçları …** adlı ayrı sekmeye eklenir. Tarih, `SON-…` numarası, açıklama ve dayanak bağlantısı taşınır; girdi sekmesi değiştirilmez. Sabit olay anahtarı, yanıt kaybolduğunda tekrar gönderimi ayırt eder. Sonuç sekmesinin başlıkları değişirse yazma durur. Bu, her hücrenin karşılıklı kopyalandığı tam çift yönlü düzenleme değildir.
6. **Eşitlemeyi duraklat** okuma/yazmayı durdurur. Google bağlantısını kaldırmak yerel bağlantı anahtarını siler; Google hesabındaki üçüncü taraf uygulama erişimini ayrıca Google hesap ayarlarından kaldırabilirsiniz. E-Tablo URL’si değişince veya yedek geri yüklenince otomatik eşitleme durur ve yeniden önizleme gerekir.

Google API akışları sahte servis yanıtlarıyla ve geçici kayıtlarla; Windows anahtar koruması gerçek DPAPI ile test edilmiştir. **Canlı Google OAuth kurulumu ve gerçek dosyada eşitleme henüz doğrulanmamıştır.** Google Cloud ilk kullanım sözleşmesi hesap sahibinin onayını beklemektedir. Bağlantı kurulmadan arayüz otomatik eşitlemeyi açık göstermez.

Teknik kaynaklar: [Masaüstü Google Picker ve dosya izni](https://developers.google.com/workspace/drive/picker/guides/desktop-mobile-picker), [Masaüstü OAuth ve PKCE](https://developers.google.com/identity/protocols/oauth2/native-app), [Sheets API](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/get).

## YEĞİTEK düzeninde aylık plan

1. **Faaliyet Planı → Plan ekle** bölümünde başlık ve plan yılını girin. YEĞİTEK bağlantısını kaynak olarak ekleyebilirsiniz; bağlantıdan otomatik giriş veya canlı eşitleme yapılmaz.
2. YEĞİTEK’teki **Faaliyet Planı** alanının tamamını kopyalayıp plan metni alanına yapıştırın. Alternatif olarak Word (.docx), HTML veya metin (.txt) dosyanızı seçin. Dosya sınırı 5 MB’dir. **İlerleme Durumu** metnini ayrı alana yapıştırın.
3. **Planı önizle** ile aylık maddeleri inceleyin. Ay/yıl başlığı altındaki **Çalışma günleri | Ana faaliyet / uygulama | Beklenen çıktı | Validasyon / uygulama notu** tabloları ayrılır. Takvim hücreleri faaliyet sayılmaz. Farklı biçimler tam metin olarak korunur; **Aylık maddeleri incele / düzenle** alanından ay, tarih ifadesi ve çalışma bilgilerini elle ekleyebilirsiniz.
4. **Kontrol ettim, planı kaydet** ile yerel veri tabanına alın. Her kaynak yılı için bir plan tutulur; aynı yılın aktarımı mevcut planı günceller, aynı içerik ikinci kopya oluşturmaz. Başlıklar, aylık maddeler ve ilerleme notları **Planı güncelle** ile düzenlenebilir.
5. Aylık kartlardan **Faaliyet kaydı oluştur** seçin. Bir madde birden fazla çalışmayı kapsayabilir; her somut çalışma için ayrı kayıt açın. Kaynak gün ifadesi korunur; kesin başlangıç/bitiş ve türü koordinatör belirler. Planın güncellenmesi daha önce açılmış faaliyetlerin tarihini, sonucunu veya kanıtını değiştirmez.

Plan maddeleri gerçekleşmiş faaliyet veya katılımcı sayılmaz. Kaynak ilerleme notu otomatik tamamlama değildir. Genel esaslar ve tam plan metni kaynak bölümünde korunur. Aylık planı almak için model hizmeti gerekmez; gelecekte etkinlik hazırlığında kullanılmak üzere kaynak metin, ilerleme ve yapılandırılmış maddeler ayrı saklanır. **Plan verisini indir** bu alanları JSON dosyası olarak verir; bu dosya şifreli yedeğin yerine geçmez.

Şifreli yedek biçimi 4, aylık planları, faaliyet bağlantılarını, raporları, sürüm geçmişini ve yerel rapor eklerini kapsar. Önceki biçim 1, 2 ve 3 yedekleri okunur; yeni yedekler eski uygulama sürümünde açılmaz. Kişisel plan ve rapor içerikleri dağıtım paketine veya GitHub'a eklenmez.

## Rapor arşivi ve YEĞİTEK’e aktarım

- **Rapor arşivi:** İçe alınmış raporlar döneme ve başlığa göre bulunur. Kaynak alanları ve haber/ek bağlantıları korunur. Boş katılımcı alanları sıfır sayılmaz. “Bu bilgisayarda” işaretli eklerin dosya içeriği yerel veri tabanında ve şifreli yedekte bulunur; kaynak bağlantıları ayrıca saklanır. Arşivlenen raporlar faaliyet istatistiklerine tekrar eklenmez.
- Kaynak aktarım API’si koordinatör ve il eşleşmesini kontrol eder; önizleme belirteci olmadan kaydetmez. Aynı kaynak bağlantısı ve içerik ikinci kayıt oluşturmaz; değişen kaynak önceki sürümü korur. Bu sürümde geçmiş raporlar oturum açılmış YEĞİTEK ekranından kontrollü aktarılmıştır; uygulama giriş bilgisi saklamaz ve arka planda otomatik çekmez.
- **Yeni etkinlik raporu:** Takvim yılını ve üç aylık dönemi seçin. Tamamlanmış bir faaliyetten başlayabilir veya boş form açabilirsiniz. Başlık, gerçekleşme tarihi, sonuç ve toplam katılım seçilen faaliyetten gelir. İlçe, etkinlik seçimi/formatı/türü, eğitmen, katılımcı dağılımı ve haber bağlantıları koordinatör tarafından tamamlanır. Alanlar 9 Ekim 2026’da görülen YEĞİTEK rapor formuna dayanır; eğitim içeriği en fazla 800 karakterdir. Kaynaktaki uzun metin otomatik kesilmez.
- **Taslağı kaydet → Aktarıma hazırla:** Eksik taslak saklanabilir. Aktarıma hazırlarken içerik kontrolü, gerçek ve dönem içindeki etkinlik tarihi, alan seçenekleri ve katılımcı toplam tutarlılığı denetlenir. Boş kategori bilinmiyor olarak kalır. Raporda veya ekte değişiklik yapılınca yeniden inceleme gerekir. Kaynak faaliyet sonradan değişirse güncel faaliyetten yeni taslak hazırlanır; önceki rapor korunur.
- **YEĞİTEK’e aktarım:** Hazır alanları kopyalayın, resmî rapor formunu açın ve ekleri seçerek orada kaydedin. Sonrasında gerçek kayıt tarihi, görüntüleme bağlantısı ve kayıt dayanağını REFİKA’da saklayın. Bu bilgi koordinatör beyanıdır; otomatik gönderim, resmî kabul veya teslimat doğrulaması değildir. Doğrudan API/eşitleme bağlantısı henüz uygulanmamıştır.
- **Sürüm geçmişi:** Taslak değişiklikleri ve durum geçişleri eski içerikleri korur. **Rapor metnini indir** ve **Rapor verisini indir** kaydedilmiş sürümü dışa verir; kaydedilmemiş düzenlemeler çıktıya girmez. Ek dosyalar ayrı indirilir. Geçmiş kaynak raporu ve kayıt bilgisi eklenmiş rapor doğrudan düzenlenmez.

Rapor hazırlama bu sürümde AI kullanmaz. Sonraki AI desteğinin dayanağı olarak kaynak faaliyet bağlantısı, rapor alanları ve eski sürümler korunur.

## Aktarım kuralları

- ESEP listesi: il, öğretmen kimliği, öğretmen adı, okul kimliği ve okul adı zorunludur. Aynı öğretmenin farklı okul üyelikleri ayrı kayıtlardır. Aynı kimlik çifti yeniden yüklenince çoğalmaz.
- **Veri aktar** bölümündeki Excel/CSV faaliyet listesi: faaliyet adı, amaç, tür ve tarihler gereklidir. Bu akış somut faaliyet kayıtları oluşturur; aylık kaynak planı için **Faaliyet Planı → Plan ekle** kullanılır. Düzenli Excel tekrarlarında sabit faaliyet kodu kullanın; kod yoksa başlık/tarih değişince yeni kayıt oluşabilir.
- Geçersiz tarih, yanlış il, eksik alan ve aynı dosyada yinelenen kimlikler önizlemede ayrılır. Geçerli satırları ayrıca alma seçeneği açıkça onaylanır.
- İncelenmiş bir kaynağın içeriği değişirse kayıt yeniden incelemeye döner. Sonuçlandırılmış kayıtlar aktarım sırasında değiştirilmez. Önizlemeden sonra veri değişmişse yeniden inceleme gerekir.
- Excel/CSV ve Word dosyaları en fazla 5 MB; kanıt dosyaları 10 MB olabilir. **Veri aktar** içindeki isteğe bağlı AI çıkarımı da önizlemeden geçer. Aylık plan yüklemesi AI gerektirmez. PDF plan okuma bu sürümde yoktur.
- ESEP'e otomatik giriş, veri çekme, hesap/üyelik değişikliği veya resmî gönderim yapılmaz. Çıktılar REFİKA şablonudur; güncel resmî şablona birebir uyum ayrıca doğrulanmalıdır.

## Validasyon ve yazışma akışı

- Talep türleri: yeni kişi hesabı, organizasyon değişikliği, yeni okul hesabı, okul hesabı birleştirme, genel destek. Kişi hesabı birleştirme işlemi tanımlanmaz.
- İlk tanıtılan demodaki kayıt tablosu ve beş adımlı şerit kullanılır; kayıt incelemesi ayrı pencerede açılır. Dört çalışma listesi tablonun filtresidir. İncelemedeki bütün türler **İnceleme Bekleyenler** listesinde yer alır; diğer dosyalar türlerine ait listede görünür. **Taslaklar** hazır talepleri, **Onay Merkezi** kontrole sunulan taslakları, **Sonuç Takibi** gönderilmiş ve sonuçlanmış talepleri gösterir. Excel çıktısı seçili ekran ve çalışma listesinin tamamını içerir; metin araması dışa aktarıma uygulanmaz.
- **İncelemeye kaydet:** Eksik kayıt saklanabilir. **Gönderime hazır kaydet:** Talebe özel bütün kontrollerin doğrulanması, her kontrol için dayanak, inceleme tarihi ve gerekli kimlik/bağlantılar şarttır. Görünen ID ile profil ID ayrı alanlardır; bağlantı ID'den tahmin edilmez. Ad-soyad ve görev yeri doğrulaması koordinatöre aittir.
- Kontroller 7 Ekim 2026 tarihli koordinatör işleyiş notlarının 1.3 sürümünden uyarlanmıştır. Bunlar resmî platform onayı veya otomatik uygunluk kararı değildir. Hesap hareketsizliği/silinme süresi için doğrulanmamış bir kural uygulanmaz.
- **Taslak hazırla:** Kural tabanlı, düzenlenebilir metin üretir ve gönderilmemiş taslak olarak saklar; AI kullanmaz. Önerilen alıcı güncel işleyişe göre kullanıcı tarafından kontrol edilmelidir. E-posta/WhatsApp gönderimi bu sürümde REFİKA içinden yapılmaz.
- **Taslağı kaydet / Onaya sun:** Tekil taleplerde düzenlenen alıcı, konu ve metin yeniden açıldığında korunur. Onaya sunulan talep **Onay Merkezi → Tekil talep taslakları** listesine geçer; gönderilmiş sayılmaz. Talep içeriği veya kaynak kayıt değişirse güncel taslak/onay işareti düşer, eski metin geçmişte kalır. Excel’den gelen listeler için **Excel listesi ve toplu e-posta** sekmesi kullanılır.
- **Gönderimi kaydet:** Koordinatör gerçek gönderimi alıcı, zaman, metin, kanal ve dayanakla teyit eder. Merkez talebi “Gönderildi · sonuç bekleniyor” durumuna geçirir. İlgili kişiye düzeltme/bilgilendirme dosyanın durumunu değiştirmez. Bu kayıt e-posta sağlayıcısından teslimat doğrulaması değildir.
- **Gerçek sonucu kaydet:** Gönderilmiş talep için yanıt/sonuç notu, gerçekleşme zamanı, sonuç türü ve kullanıcı teyidi gerekir. Sonuç zamanı gönderimden önce olamaz. **Yeniden incelemeye al** gerekçeyi geçmişe ekler ve kontrolleri sıfırlar; eski gönderim ve sonuç metinleri korunur.
- Aynı kaynak ve talep türü için ikinci açık dosya engellenir. Kaynak ESEP satırı değiştiğinde dosyanın gönderimi durdurulur; önce incelemeye kaydedip kontrolleri yenilemek gerekir. Kaynak ile güncel form karşılaştırılabilir. Kaynak kayıt ve ona bağlı dosya özetlerde iki kez sayılmaz; aynı kaydın farklı talep türleri ayrı işlerdir. Önceki sürümden kalan kayıtlarda eski durum ve notlar korunur; “incelendi” otomatik olarak “gönderildi” sayılmaz.
- **Kanıt ve geçmiş:** Dosya ekleri, inceleme anındaki içerik, taslak, gönderilen metin, yanıt ve sonuç geçmişi saklanır. Liste ve yazışma geçmişi Excel olarak indirilebilir. Merkeze yalnız sayılar gider; metin, alıcı ve ekler paylaşılmaz. Merkezde bekleyen gönderimler için ilave sütun vardır; eski merkez servisinin de güncellenmesi gerekir.

## Yerel veri ve yedek

**Kişi profili / Okul profili** bağlantıları kayıt ve dönem listelerinden açılır; ESEP yetkili oturumu gerekebilir. Görünen hesap ve okul ID’leri profil URL’sindeki ID ile farklı olabilir: bağlantılar tahmin edilmeden ESEP’teki gerçek profilden alınır. **İncele → Güncel ESEP kontrolü → Yeni ESEP kontrolü kaydet** ile kişi, okul ve ilgili okul üyeliğinin durumu, ESEP’te görünen metin ve kaynak sayfası kaydedilir. Kontrol edilmeyen alan “Kontrol edilemedi” bırakılır. Teyit sonrası kontrol zamanı ve önceki gözlemler geçmişte saklanır; bu işlem ESEP üzerinde onay vermez. Eski okul ID’si bulunamayan kayıtların ilişkili güncel profilleri ayrı bağlantılardır, eski kimliği değiştirmez. Güncel ESEP gözlemi geçmiş sonucu, `SON` numarasını ve dönemlik sayıyı değiştirmez; gerçek sonuç ayrıca kendi tarih ve dayanağıyla kaydedilir. ESEP kontrolü ve bağlantılar yedeğe ve Excel çıktılarına dahildir; uygulamada otomatik periyodik ESEP taraması yoktur.

**Kayıt ve Validasyon → Dönemlik kayıt listesi** ve **Raporlar ve Yazışmalar → Validasyon dönem özeti** aynı tarihli kayıtlardan hesaplanır. Takvim yılının dört dönemi (Ocak–Mart, Nisan–Haziran, Temmuz–Eylül, Ekim–Aralık) ve yıllık toplam birlikte görünür. Sonuç tarihi Türkiye saatine göre değerlendirilir; REFİKA’ya kayıt tarihi ayrıca saklanır. Kesin gerçekleşme tarihi bilinmiyorsa kaynakta görülen **sonuç bildirimi tarihi** seçilir ve listede açıkça belirtilir.

Kişi hesabının olumlu sonucu, benzersiz ESEP hesap kimliğiyle sayılır. Organizasyon değişikliği, yeni okul, okul birleştirme, genel destek ve olumsuz sonuçlar ayrı tutulur. Aynı hesabın birden fazla onay işlemi geçmişte kalır; yıllık kişi sayısı dönemlerin aritmetik toplamı değildir. İnceleme, hazır taslak ve gönderim onay sayılmaz. Yalnız çalışma alanında kaydedilen veriler kapsanır; eksik arşivler sıfır faaliyet anlamına gelmez.

**Geçmiş kayıt ekle** ile gönderilmiş e-posta veya belgeye dayalı talep, kişi/okul kimliği, kaynak ve gerçek gönderim tarihi girilir. Ayrı sonuç kaynağı yoksa dosya sonuç bekler. Açık sonuç dayanağı varsa tarihi ve türü eklenir. Bu aktarım ESEP kontrollerini yapılmış olarak işaretlemez. Kaynak, hesap, okul ve işlem türü aynıysa ikinci kopya oluşmaz; sonraki yanıt mevcut dosyanın **Sonuç Takibi** alanına eklenir. Değişebilen ortak tabloların bugünkü içeriği geçmiş onay listesi olarak kabul edilmemelidir.

**Ayrıntılı Excel indir** dört dönem/yıl özeti, tarihli sonuçlar, tarihli gönderimler, REFİKA’da açılan kayıtlar ve sayım açıklamalarını içerir. Güncel dosya durumu dönem sonu durumu değildir. Rapor için özeti kopyalayabilir veya metin olarak indirebilirsiniz; YEĞİTEK’e otomatik gönderim yapılmaz. Kişisel kaynak mailler ve listeler dağıtım paketine/Git deposuna eklenmez.

Masaüstü uygulaması veriyi varsayılan olarak Windows kullanıcı profilinde `%APPDATA%\REFIKA\workspace\refika.sqlite` dosyasında tutar. `REFIKA_USER_DATA_DIR` veya `REFIKA_DATA_DIR` verilirse konum değişir. Paket klasörünü güncellemek kayıtları silmez.

Kanıtların dosya içeriği SQLite içinde tutulur ve yedeğe dahildir. İndirilen `.refika` yedeği scrypt ve AES-256-GCM ile şifrelenir; yerel SQLite dosyası şifreli değildir. Windows hesabı ve disk koruması ayrı sorumluluktur. Tek yedeğin açılmış veri sınırı 40 MB'dir; büyük arşivler için parçalara ayırma sonraki geliştirmedir.

Geri yükleme aynı il onayı ister ve mevcut kayıtların yerini alır. Önce mevcut çalışma alanınızın yedeğini alın. İşlem başarısız olursa kayıtlar birlikte geri alınır. Yedekler bağlantı anahtarlarını taşımaz. Güncel biçim 4; validasyon, yazışma, aylık plan, rapor geçmişi ve dosyaları birlikte içerir. Eski biçim 1–3 açılabilir; bu birleştirme değil tam geri yüklemedir ve eski yedekte bulunmayan yeni kayıtlar korunmaz. Veri tabanı ilk açılışta mevcut kayıtlara dokunmadan ek tablolarla yükseltilir; geri yükleme açık formların eski sürümle kayıt ezmesini engeller.

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
