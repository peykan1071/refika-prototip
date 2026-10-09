import { packager } from '@electron/packager';
import { resolve } from 'node:path';
import { writeFile, copyFile } from 'node:fs/promises';
const paths = await packager({
  dir: resolve('.local-package'),
  out: resolve('release'),
  name: 'REFIKA',
  platform: 'win32',
  arch: 'x64',
  electronVersion: '44.5.0',
  asar: true,
  overwrite: true,
  prune: false,
  appVersion: '0.6.6',
  win32metadata: {
    CompanyName: 'REFİKA',
    FileDescription: 'REFİKA İl Koordinatörü',
    ProductName: 'REFİKA',
  },
});
for (const path of paths) {
  await writeFile(
    resolve(path, 'BASLANGIC.txt'),
    'REFİKA 0.6.6 — Windows pilotu\r\n\r\n1. ZIP dosyasını bir klasöre çıkarın. REFIKA.exe ve yanındaki bütün dosyalar birlikte kalmalı.\r\n2. REFIKA.exe dosyasını çift tıklayarak başlatın. İlk açılışta ilinizi, koordinatör adını ve eğitim yılını seçin.\r\n3. Veri aktar bölümünden boş şablonu indirin veya Excel/CSV listenizi seçin. Önizlemeyi kontrol edip içeri alın.\r\n4. Faaliyet Planı > Plan ekle ile aylık planı alın; maddelerden faaliyet kaydı oluşturun. Gerçekleşme bilgilerini faaliyet kaydında tamamlayın.\r\n5. Ayarlar ve yedek bölümünden şifreli yedek indirin.\r\n\r\nKayıt konumu: %APPDATA%\\REFIKA\\workspace\r\nAyrıntılı kullanım ve bağlantı kurulumu: KULLANIM.md\r\n\r\nBu dağıtım imzalanmamış pilot sürümdür. Merkez ve AI hizmetleri ayrıca yapılandırılır. ESEP üzerinde otomatik işlem yapmaz.\r\n',
  );
  await copyFile(resolve('local/README.md'), resolve(path, 'KULLANIM.md'));
  console.log(path);
}
