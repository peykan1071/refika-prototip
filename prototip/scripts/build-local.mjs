import { build } from 'esbuild';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve('.'),
  out = resolve('local-dist'),
  stage = resolve('.local-package');
await mkdir(out, { recursive: true });
await mkdir(resolve(stage, 'ui'), { recursive: true });
await build({
  entryPoints: ['local/ui/app.jsx'],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  jsx: 'automatic',
  target: 'chrome140',
  minify: true,
  external: ['/refika-logo-v9.png', '/welcome.png'],
  outfile: resolve(out, 'app.js'),
  legalComments: 'eof',
});
await copyFile('local/ui/index.html', resolve(out, 'index.html'));
const brandAssets = [
  'refika-logo-v9.png',
  'welcome-agent-v11.png',
  'welcome.png',
];
for (const file of brandAssets)
  await copyFile(resolve('public', file), resolve(out, file));
for (const file of ['app.js', 'app.css', 'index.html', ...brandAssets])
  await copyFile(resolve(out, file), resolve(stage, 'ui', file));
await build({
  entryPoints: ['local/desktop.mjs'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  outfile: resolve(stage, 'main.mjs'),
  external: ['electron'],
  banner: {
    js: "import { createRequire as refikaCreateRequire } from 'node:module'; const require = refikaCreateRequire(import.meta.url);",
  },
  legalComments: 'eof',
});
await writeFile(
  resolve(stage, 'package.json'),
  JSON.stringify(
    {
      name: 'refika',
      productName: 'REFİKA',
      version: '0.6.8',
      description: 'REFİKA il koordinatörü çalışma alanı',
      author: 'REFİKA',
      main: 'main.mjs',
      type: 'module',
    },
    null,
    2,
  ),
);
await writeFile(
  resolve(stage, 'KULLANIM.txt'),
  'REFİKA 0.6.8 — çalışan pilot\r\n\r\nREFIKA.exe dosyasını açın; ilk kurulumda ilinizi seçin.\r\nKayıtlar Windows kullanıcı profilinizde REFİKA uygulama alanında saklanır.\r\nVeri aktar bölümünden Excel/CSV; Faaliyet Planı > Plan ekle bölümünden aylık planınızı alın; maddelerden faaliyet kaydı oluşturun.\r\nAyarlar ve yedek bölümünden düzenli şifreli yedek alın.\r\nMerkez ve AI hizmetleri ayrıca yapılandırılır.\r\nBu paket imzalanmamış bir pilottur; kurum geneli dağıtım öncesi pilot kabulü ve imzalama gerekir.\r\n',
);
console.log(`Yerel arayüz ve masaüstü paketi hazır: ${root}`);
