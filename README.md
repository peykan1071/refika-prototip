# REFİKA

Rehber eTwinning Faaliyetleri İl Koordinatörü Ajanı.

REFİKA, 81 il koordinatörünün kayıt inceleme, faaliyet planlama, sonuç takibi ve raporlama işlerini yürütmesi için geliştirilen bir uygulamadır. Her il kendi verisini kendi bilgisayarında tutar; merkez, illerin çalışma özetlerini ortak ekrandan izler.

## Çalışma düzeni

- **İl çalışma alanı:** Öğretmen ve okul kayıtları, faaliyetler ve kanıt dosyaları yerel veri tabanında saklanır. İnternet bağlantısı olmadan yerel çalışma sürdürülebilir.
- **Ortak merkez:** İl ve eğitim yılı bazında faaliyet, katılım ve kayıt durum sayıları paylaşılır. Öğretmen adları, e-posta adresleri ve kanıt dosyaları bu özete dahil edilmez.
- **Veri aktarımı:** ESEP/NSO listeleri ve faaliyet planları dosyadan alınır; sütun eşleştirme, eksik alan, yanlış il ve tekrar kontrollerinden sonra kaydedilir.
- **Aylık faaliyet planı:** YEĞİTEK’teki yıl, plan metni ve ilerleme durumu düzeni kullanılır. Plan yapıştırılarak veya Word/HTML/metin dosyasından önizlemeyle alınır; aylık maddeler eski demodaki kartlarda gösterilir. Kaynak plan, faaliyet kaydı ve gerçekleşme ayrı tutulur.
- **Rapor arşivi:** Geçmiş YEĞİTEK raporları kaynak alanları, bağlantıları ve yerel ekleriyle saklanır. Yeni etkinlik raporları YEĞİTEK formunun alanlarına göre hazırlanır; son kayıt resmî formda yapılır ve kayıt bilgisi REFİKA’ya eklenir.
- **Dönemlik validasyon:** Her sonuç tarihi, dayanağı ve kalıcı `SON-000001` sıra numarasıyla saklanır. Dört takvim dönemi ve yıllık benzersiz hesap sayısı, okul/üyelik işlemlerinden ayrı hesaplanır. Kaynaklı geçmiş e-postalar ve takip yanıtları aynı dosyada tutulur; bekleyenler filtrelenebilir. Excel ve rapor özeti alınır. Yalnız gönderim kaydı onay sayılmaz.
- **Excel’den toplu kayıt:** Validasyon listesi önizlenir; yeni satırlar tek işlemle kaydedilir. Açıklama ve talep edilen işlem merkez Excel’ine ve otomatik toplu mail taslaklarına aktarılır. Hesap onayı, okul birleştirme ve destek için ayrı mail/ek hazırlanır. Kaydetmeden önizleme indirmek kayıt oluşturmaz. Gerçek gönderim ve gelen mailin kapsadığı sonuçlar topluca kaydedilir; onaylı kişi/okul kayıtları ve dönem sayıları güncellenir.
- **Kısa Excel şablonları:** Kişi hesabı, okul hesabı, okul birleştirme ve organizasyon değişikliği için ayrı 3–5 sütunlu dosyalar bulunur. Kişi/okul adındaki köprüler ve sabit `HYPERLINK` bağlantıları okunur; ayrı bağlantı sütunu gerekmez. Ortak e-posta ve Google E-Tablo ayarlarda saklanır. E-Tablo açılıp düzenlenebilir; güncel Excel kopyası önizlemeyle alınır, otomatik çift yönlü eşitleme yapılmaz.
- **Güncel ESEP kontrolü:** Kişi ve okulun gerçek profil bağlantıları listede açılır. Kişi hesabı, okul ve üyelik durumları kaynakları ve kontrol zamanlarıyla ayrı kaydedilir. Güncel gözlem geçmiş sonuç tarihini veya dönemlik onay sayısını değiştirmez. Eski okul ID’si bulunamazsa doğrulanan ilişkili profiller ayrıca gösterilir.
- **Yapay zekâ desteği:** Word faaliyet planlarını alanlara ayırmak için isteğe bağlı model bağlantısı bulunur. Öneriler kaydedilmeden önce koordinatör tarafından incelenir.
- **Görsel kimlik:** Onaylanan REFİKA logosu, görselleri, lacivert–sarı renkleri ve mevcut ekran düzeni geliştirmede korunur.

## Mevcut durum

Güncel uygulama [geliştirme dalında](https://github.com/peykan1071/refika-prototip/tree/codex/refika-calisan-pilot) bulunur; ana dala aktarımı [#1 numaralı geliştirme kaydında](https://github.com/peykan1071/refika-prototip/pull/1) izlenir.

Yerel kayıt, Excel/CSV aktarımı, talep türüne göre validasyon, yazışma taslağı ve gönderim/sonuç geçmişi, faaliyet planı, kanıt ekleme, rapor üretme ve şifreli yedekleme uygulanmıştır. Windows paketini üretme araçları ve 81 il özet ekranının servis kodu mevcuttur.

İlk tanıtılan demonun çalışma masası, kayıt tablosu, beş adımlı validasyon şeridi ve **Kayıt → Taslaklar → Onay Merkezi → Sonuç Takibi** düzeni kullanılır. Yeni kontroller ilgili kaydın inceleme penceresinde açılır. **Hesap Onay Validasyonları**, **İnceleme Bekleyenler**, **Okul Birleştirme** ve **Genel Destek** aynı tabloda filtre olarak seçilir.

Tekil taleplerde kontroller ve dayanak notları tamamlanmadan dosya gönderime hazır olmaz. Excel listesinde toplu taslak hemen hazırlanır; eksik kontroller gösterilir, bekletilen veya uygun bulunmayan satırlar mail ekinin dışında tutulur. Taslak hazırlamak gönderim sayılmaz. Koordinatör başka uygulamadan yaptığı gerçek gönderimi tarihi ve mail dayanağıyla kaydeder; bu kayıt eksik kontrolleri tamamlanmış saymaz. Kişiye bilgilendirme, merkez talebinden ayrı tutulur.

Canlı merkez kurulumu, kurumsal kullanıcı yetkileri, model hizmeti, güncel resmî çıktı şablonları ve saha doğrulaması tamamlanacaktır. ESEP'e otomatik giriş, veri çekme veya resmî işlem gönderme henüz yoktur. Windows paketi imzasızdır; son açılış denemesi bu bilgisayarın Uygulama Denetimi tarafından engellenmiştir. Kurum geneli dağıtım için hazır sürüm olarak sunulmaz.

## Geliştirme sürümünü çalıştırma

Node.js 22.13 veya üzeri gerekir. Depo kökünde:

```sh
git switch codex/refika-calisan-pilot
cd prototip
npm ci
npm run local:build
npm run local:start
```

Uygulama bu bilgisayarda `http://127.0.0.1:4317` adresinde açılır. İlk kullanımda il, koordinatör adı ve eğitim yılıyla boş bir çalışma alanı oluşturulur.

Windows x64 paketini üretmek için aynı klasörde:

```sh
npm run desktop:package
```

Çıktı: `prototip/release/REFIKA-win32-x64/REFIKA.exe`. Dağıtımda bütün klasör birlikte verilir; son kullanıcıya Node.js kurulumu gerekmez.

[Kullanım, veri aktarımı, yedekleme ve bağlantı kılavuzu](https://github.com/peykan1071/refika-prototip/blob/codex/refika-calisan-pilot/prototip/local/README.md) · [Geliştirme yapısı](prototip/README.md)

Kişisel saha dosyaları, çalışma arşivleri, erişim anahtarları ve üretilen dağıtım dosyaları kaynak kod deposuna dahil edilmez.
