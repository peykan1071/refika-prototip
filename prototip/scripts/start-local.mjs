import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { openSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4317);
const dataDir = resolve(root, process.env.REFIKA_DATA_DIR || '.local-data');
const url = `http://127.0.0.1:${port}`;

async function ready() {
  let page;
  try {
    page = await fetch(url, {
      signal: AbortSignal.timeout(1500),
      redirect: 'error',
    });
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') return false;
    throw new Error('Yerel bağlantı kontrol edilemedi: ' + error.message);
  }
  const cookie = page.headers.get('set-cookie')?.split(';')[0];
  await page.body?.cancel();
  if (!page.ok || !cookie?.startsWith('refika_session='))
    throw new Error(
      `${port} bağlantı noktası REFİKA tarafından kullanılamıyor.`,
    );
  const response = await fetch(url + '/api/state', {
    headers: { Cookie: cookie },
    signal: AbortSignal.timeout(1500),
  });
  if (!response.ok) throw new Error('REFİKA çalışma alanı açılamadı.');
  const state = await response.json();
  if (!Array.isArray(state.records) || state.provinces?.length !== 81)
    throw new Error('Bu adreste beklenen REFİKA çalışma alanı bulunamadı.');
  return true;
}

async function main() {
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Geçerli bir PORT değeri kullanın.');
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 13))
    throw new Error('REFİKA için Node.js 22.13 veya üzeri gerekli.');
  if (await ready()) {
    console.log(`REFİKA zaten çalışıyor: ${url}`);
    return;
  }
  try {
    await access(resolve(root, 'local-dist/index.html'));
    await access(resolve(root, 'node_modules/exceljs/package.json'));
  } catch {
    throw new Error(
      'Önce prototip klasöründe npm ci ve npm run local:build çalıştırın.',
    );
  }
  await mkdir(dataDir, { recursive: true });
  const log = resolve(dataDir, 'server.log');
  const output = openSync(log, 'a');
  let child;
  try {
    // An independent process with file-backed output survives the launcher closing.
    child = spawn(process.execPath, ['local/server.mjs'], {
      cwd: root,
      env: { ...process.env, PORT: String(port), REFIKA_DATA_DIR: dataDir },
      detached: true,
      windowsHide: true,
      stdio: ['ignore', output, output],
    });
  } finally {
    closeSync(output);
  }
  await new Promise((accept, reject) => {
    child.once('spawn', accept);
    child.once('error', reject);
  });
  child.unref();
  for (let attempt = 0; attempt < 30; attempt++) {
    if (await ready()) {
      console.log(`REFİKA hazır: ${url}`);
      return;
    }
    if (child.exitCode !== null)
      throw new Error(`REFİKA başlatılamadı. Hata kaydı: ${log}`);
    await delay(300);
  }
  throw new Error(`REFİKA zamanında açılmadı. Hata kaydı: ${log}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
