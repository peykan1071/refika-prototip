# REFİKA uygulaması

REFİKA'nın geliştirme odağı, il koordinatörlerinin günlük işlerini kalıcı kayıtlarla yürüten yerel uygulama ve 81 ilin özetini sunan ortak merkezdir.

## Güncel çalışma alanı

Güncel uygulama `codex/refika-calisan-pilot` dalındaki `local/` klasöründedir. Ana dala aktarımı [#1](https://github.com/peykan1071/refika-prototip/pull/1) üzerinden izlenir.

Depo kökünden başlatın:

```sh
git switch codex/refika-calisan-pilot
cd prototip
npm ci
npm run local:build
npm run local:start
```

Node.js 22.13+ gerekir. Tarayıcıda `http://127.0.0.1:4317` açılır; kayıtlar `prototip/.local-data` altında SQLite veri tabanına yazılır.

## Kullanım akışı

1. İl, koordinatör adı ve eğitim yılıyla çalışma alanını oluşturun.
2. **Veri aktar** bölümünde ESEP/NSO listesini veya faaliyet planını seçin. Sütunları eşleştirip kontrol sonuçlarını inceleyin ve uygun kayıtları içeri alın.
3. **Kayıt ve Validasyon** bölümünde kayıtları dayanak notlarıyla inceleyin; resmî sonucu işlem gerçekten sonuçlandığında girin.
4. **Faaliyet Planı**, **Okul Ziyaretleri** veya **Eğitim ve Etkinlikler** üzerinden çalışmayı planlayın; gerçekleşen tarih, katılım, sonuç ve kanıtı aynı kayda ekleyin.
5. **Raporlar ve Yazışmalar** bölümünden tarih aralığına göre çıktı alın.
6. **Ayarlar ve yedek** bölümünden şifreli yedek oluşturun. Merkez bağlantısı kurulduğunda il özetinin paylaşımını buradan açın.

[Kullanım ve bağlantı kılavuzu](https://github.com/peykan1071/refika-prototip/blob/codex/refika-calisan-pilot/prototip/local/README.md), aktarım kurallarını, veri konumlarını, yedekten dönüşü ve merkez/model yapılandırmasını açıklar.

## Görsel referans ve kod yapısı

Mevcut demo, REFİKA'nın onaylanan görsel referansıdır. Logo, karşılama görselleri, lacivert–sarı renkler, yazı tipi ve çalışma masası düzeni korunur; yeni işlevler bu görünümün içine eklenir.

| Konum | İşlev |
| --- | --- |
| `local/` | Kalıcı kayıt kullanan yerel uygulama, merkez servisi ve testler |
| `scripts/build-local.mjs` | Yerel arayüz ve masaüstü çalışma dosyalarını derleme |
| `scripts/package-local.mjs` | Windows dağıtım klasörünü üretme |
| `app/`, `components/`, `lib/` | Önceki tarayıcı demosu ve görsel referans |
| `public/` | Mevcut logo ve görseller |
| `database/` | Önceki sunucu veri modeli taslakları; yerel uygulamanın veri tabanı değildir |

Görsel referansı açmak için `npm run dev` kullanılır. Bu ayrı tarayıcı demosu örnek kayıtlarını tarayıcıda saklar; gerçek oturum açma ve gönderim yapmaz. Yerel uygulamanın SQLite kayıtlarına bağlı değildir ve gerçek kişisel veriyle kullanılmaz. GitHub'a yapılan değişiklikler mevcut Sites yayınına kendiliğinden aktarılmaz.

## Doğrulama ve paketleme

`prototip/` klasöründe:

```sh
npm run local:test
npx oxlint -c local/oxlint.json local scripts/build-local.mjs scripts/package-local.mjs
npm run local:build
npm run desktop:package
```

Windows çıktısı `release/REFIKA-win32-x64` klasörünün tamamıdır. Paket imzasızdır; son açılış denemesinde bu bilgisayarın Uygulama Denetimi çalıştırmayı engellemiştir. Dağıtım ve açılış doğrulaması tamamlanmalıdır.

Canlı merkez, kurumsal yetkilendirme, model hizmeti, resmî çıktı şablonları, yıl ve cihaz geçişi ile saha doğrulaması geliştirme kapsamındadır. Mevcut sürümün ayrıntılı sınırları kullanım kılavuzunda belirtilir.
