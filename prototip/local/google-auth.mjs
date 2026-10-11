import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const scope = 'https://www.googleapis.com/auth/drive.file';
const tokenEndpoint = 'https://oauth2.googleapis.com/token';
export function googleFileId(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol === 'https:' &&
      url.hostname === 'docs.google.com' &&
      !url.username &&
      !url.password &&
      !url.port
    )
      return (
        url.pathname.match(/^\/spreadsheets\/d\/([\w-]+)\/edit\/?$/)?.[1] || ''
      );
  } catch {}
  return '';
}

// Secrets are passed over stdin, never command arguments, environment or logs.
function windowsCrypt(mode, bytes) {
  if (process.platform !== 'win32')
    throw new Error('Güvenli Google anahtar saklama bu ortamda tanımlı değil.');
  return new Promise((accept, reject) => {
    const script = `Add-Type -AssemblyName System.Security; $refikaBytes = [Convert]::FromBase64String([Console]::In.ReadToEnd()); $refikaResult = [Security.Cryptography.ProtectedData]::${mode}($refikaBytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($refikaResult))`;
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] },
    );
    let output = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Windows anahtar koruması zamanında yanıt vermedi.'));
    }, 15000);
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stdin.on('error', () => {});
    child.on('error', () => {
      clearTimeout(timer);
      reject(new Error('Windows anahtar koruması açılamadı.'));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && /^[\w+/=]+$/.test(output))
        accept(Buffer.from(output, 'base64'));
      else
        reject(
          new Error('Google bağlantı anahtarı bu Windows hesabında açılamadı.'),
        );
    });
    child.stdin.end(bytes.toString('base64'));
  });
}
export class GoogleVault {
  constructor(
    dir,
    protection = {
      encrypt: (b) => windowsCrypt('Protect', b),
      decrypt: (b) => windowsCrypt('Unprotect', b),
    },
  ) {
    this.dir = dir;
    this.path = join(dir, 'google-connection.bin');
    this.protection = protection;
  }
  async load() {
    let bytes;
    try {
      bytes = await readFile(this.path);
    } catch (e) {
      if (e.code === 'ENOENT') return {};
      throw e;
    }
    try {
      return JSON.parse(
        (await this.protection.decrypt(bytes)).toString('utf8'),
      );
    } catch {
      throw new Error(
        'Google bağlantısı açılamadı; bu bilgisayarda yeniden bağlanın.',
      );
    }
  }
  save(value) {
    const snapshot = JSON.stringify(value);
    this.queue = (this.queue || Promise.resolve())
      .catch(() => {})
      .then(() => this.write(snapshot));
    return this.queue;
  }
  async write(value) {
    const bytes = await this.protection.encrypt(Buffer.from(value));
    await mkdir(this.dir, { recursive: true });
    const temporary = this.path + '.tmp';
    await writeFile(temporary, bytes, { mode: 0o600 });
    await rename(temporary, this.path);
  }
}
export class GoogleAuth {
  constructor(vault, fetcher = fetch) {
    this.vault = vault;
    this.fetcher = fetcher;
    this.data = {};
    this.pending = null;
    this.refreshing = null;
  }
  async init() {
    try {
      this.data = await this.vault.load();
    } catch (e) {
      this.error = e.message;
    }
  }
  status() {
    return {
      configured: Boolean(this.data.client?.client_id),
      connected: Boolean(this.data.tokens?.refresh_token),
      authorizing: Boolean(this.pending),
      error: this.error || '',
    };
  }
  async persist(data) {
    const before = this.data;
    this.data = data;
    try {
      await this.vault.save(data);
      this.error = '';
    } catch {
      if (this.data === data) this.data = before;
      this.error =
        'Google bağlantısı güvenli olarak kaydedilemedi. İşlem tamamlanmadı.';
      throw new Error(this.error);
    }
  }
  async configure(input) {
    const client = input?.installed;
    if (
      !client ||
      !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(client.client_id || '') ||
      typeof client.client_secret !== 'string' ||
      !client.client_secret ||
      client.client_secret.length > 500
    )
      throw new Error(
        'Google Cloud’dan indirilen Masaüstü uygulaması istemci JSON dosyasını seçin.',
      );
    this.cancel();
    const data = {
      client: {
        client_id: client.client_id,
        client_secret: client.client_secret,
      },
    };
    await this.persist(data);
  }
  cancel() {
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.server.close();
      this.pending = null;
    }
  }
  async authorize(fileId) {
    if (!this.data.client)
      throw new Error('Önce Google uygulama bağlantısı kurulmalı.');
    if (!/^[\w-]+$/.test(fileId || ''))
      throw new Error('Önce ortak E-Tablo bağlantısını kaydedin.');
    this.cancel();
    this.error = '';
    const verifier = randomBytes(32).toString('base64url'),
      state = randomBytes(32).toString('base64url');
    const pending = {
      verifier,
      state,
      fileId,
      expires: Date.now() + 300000,
      client: this.data.client,
    };
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, pending.redirect);
      if (
        req.method !== 'GET' ||
        req.headers.host !== new URL(pending.redirect).host ||
        url.pathname !== '/oauth/callback'
      ) {
        res.writeHead(404).end();
        return;
      }
      let message,
        success = false;
      try {
        await this.complete(url.searchParams, pending);
        success = true;
        message =
          'Google bağlantısı tamamlandı. REFİKA penceresine dönüp çalışma sayfasını seçin.';
      } catch (e) {
        message = e.message;
        this.error = message;
      }
      res.writeHead(success ? 200 : 400, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(message);
      if (
        this.pending === pending &&
        url.searchParams.get('state') === pending.state
      )
        this.cancel();
    });
    await new Promise((accept, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', accept);
    });
    pending.server = server;
    pending.redirect = `http://127.0.0.1:${server.address().port}/oauth/callback`;
    pending.timer = setTimeout(() => {
      if (this.pending === pending) this.cancel();
    }, 300000);
    pending.timer.unref();
    this.pending = pending;
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: pending.client.client_id,
      redirect_uri: pending.redirect,
      response_type: 'code',
      scope,
      state,
      access_type: 'offline',
      prompt: 'consent',
      trigger_onepick: 'true',
      file_ids: fileId,
      mimetypes: 'application/vnd.google-apps.spreadsheet',
      code_challenge_method: 'S256',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    }).toString();
    return { url: url.href };
  }
  async tokenRequest(parameters) {
    const response = await this.fetcher(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(parameters),
      signal: AbortSignal.timeout(20000),
      redirect: 'error',
    });
    if (!response.ok)
      throw new Error(
        'Google oturumu yenilenemedi. Google hesabını yeniden bağlayın.',
      );
    const value = await response.json();
    if (!value.access_token || !Number.isFinite(Number(value.expires_in)))
      throw new Error('Google geçerli bağlantı anahtarı döndürmedi.');
    return {
      ...value,
      expiresAt: Date.now() + Number(value.expires_in) * 1000,
    };
  }
  async complete(params, pending = this.pending) {
    if (
      !pending ||
      this.pending !== pending ||
      Date.now() > pending.expires ||
      params.get('state') !== pending.state ||
      pending.used
    )
      throw new Error(
        'Google bağlantı isteği geçersiz veya süresi dolmuş. REFİKA’dan yeniden başlatın.',
      );
    pending.used = true;
    if (params.get('error'))
      throw new Error('Google bağlantısına izin verilmedi.');
    if (params.get('picked_file_ids') !== pending.fileId || !params.get('code'))
      throw new Error(
        'Kaydedilmiş ortak E-Tablo seçilmedi. Yeniden bağlanıp doğru dosyayı seçin.',
      );
    const tokens = await this.tokenRequest({
      ...pending.client,
      code: params.get('code'),
      code_verifier: pending.verifier,
      redirect_uri: pending.redirect,
      grant_type: 'authorization_code',
    });
    if (this.pending !== pending)
      throw new Error('Google bağlantısı iptal edildi.');
    if (!tokens.refresh_token || tokens.scope !== scope)
      throw new Error('Seçili E-Tablo için kalıcı erişim izni alınamadı.');
    const data = { client: pending.client, tokens, fileId: pending.fileId };
    await this.persist(data);
  }
  async accessToken(fileId) {
    if (this.data.fileId !== fileId || !this.data.tokens?.refresh_token)
      throw new Error('Bu E-Tablo için Google hesabını bağlayın.');
    if (this.data.tokens.expiresAt > Date.now() + 60000)
      return this.data.tokens.access_token;
    if (!this.refreshing) {
      const before = this.data;
      this.refreshing = (async () => {
        const fresh = await this.tokenRequest({
          ...before.client,
          refresh_token: before.tokens.refresh_token,
          grant_type: 'refresh_token',
        });
        if (this.data !== before) throw new Error('Google bağlantısı değişti.');
        const data = { ...before, tokens: { ...before.tokens, ...fresh } };
        await this.persist(data);
        return fresh.access_token;
      })().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }
  async disconnect() {
    this.cancel();
    await this.persist({ client: this.data.client });
  }
}
