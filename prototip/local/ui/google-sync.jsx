import { useEffect, useState } from 'react';
import { caseKinds } from '../validation.mjs';
import { batchFields } from '../validation-batch-content.mjs';
import { TablePagination, useTablePage } from './table-pagination.jsx';
import './google-sync.css';

const labels = Object.fromEntries(batchFields);
const date = (value) =>
  value ? new Date(value).toLocaleString('tr-TR') : 'Henüz yapılmadı';
export function GoogleSyncPanel({ api, run, busy, contacts = {} }) {
  const [status, setStatus] = useState(null),
    [error, setError] = useState(''),
    [authUrl, setAuthUrl] = useState(''),
    [sheets, setSheets] = useState([]),
    [sheetId, setSheetId] = useState(''),
    [kind, setKind] = useState(''),
    [preview, setPreview] = useState(null),
    [confirmed, setConfirmed] = useState(false),
    [pushConfirmed, setPushConfirmed] = useState(false);
  const sync = status?.sync || {};
  const page = useTablePage(
    preview?.preview.items || [],
    preview?.token || '',
    'source',
  );
  useEffect(() => {
    let active = true;
    const refresh = () =>
      api('/google/status')
        .then((value) => {
          if (active) setStatus(value);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    void refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [api]);
  const act = (work) =>
    run(async () => {
      setError('');
      try {
        await work();
      } catch (e) {
        setError(e.message);
      }
      setStatus(await api('/google/status'));
    });
  async function loadSheets() {
    const value = await api('/google/sheets');
    const choices = value.sheets.filter(
      (s) => s.sheetType === 'GRID' && !s.title.startsWith('REFIKA Sonuçları '),
    );
    setSheets(choices);
    setSheetId(
      String(
        choices.find((s) => s.sheetId === sync.sheetId)?.sheetId ??
          choices.find((s) => s.title === 'Gönderilecek Talepler')?.sheetId ??
          choices.find((s) => !s.hidden)?.sheetId ??
          '',
      ),
    );
    setKind(sync.defaultKind || '');
    setPreview(null);
    setConfirmed(false);
  }
  return (
    <section className="panel google-sync">
      <h2>Google E-Tablo eşitlemesi</h2>
      <p>
        Seçtiğiniz sekmedeki yeni satırlar REFİKA kaydına dönüşür. Uygulama
        açıkken, internet bağlantısıyla iki dakikada bir kontrol edilir. Google
        hesabı bağlanana kadar dosya yükleyerek çalışabilirsiniz.
      </p>
      {!status && <output>Bağlantı durumu okunuyor…</output>}
      {status && (
        <output className="notice">
          {!status.configured
            ? 'Google uygulama kurulumu henüz tamamlanmadı.'
            : status.authorizing
              ? 'Google izin ekranının tamamlanması bekleniyor.'
              : status.connected
                ? sync.enabled
                  ? `Otomatik eşitleme açık · ${sync.sheetName}`
                  : 'Google bağlı · eşitleme duraklatılmış'
                : 'Google hesabı henüz bağlanmadı.'}
        </output>
      )}
      {(error || status?.error || sync.error) && (
        <p role="alert" className="error">
          {error || status?.error || sync.error}
        </p>
      )}
      <details>
        <summary>İlk bağlantı kurulumu</summary>
        <p>
          Kurulum sorumlusu Google Cloud’da REFİKA için bir Masaüstü uygulaması
          OAuth istemcisi oluşturur ve Google Sheets ile Google Picker
          API’lerini açar. İndirilen istemci JSON dosyasını burada tanımlar.
          Sonrasında her koordinatör kendi Google hesabıyla, yalnız kullanacağı
          E-Tabloya izin verir.
        </p>
        <label className="field">
          <span>Google uygulama istemci dosyası (.json)</span>
          <input
            type="file"
            accept=".json"
            disabled={busy || sync.busy}
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              void act(async () => {
                if (file.size > 10000)
                  throw new Error(
                    'İstemci JSON dosyası en fazla 10 KB olabilir.',
                  );
                let value;
                try {
                  value = JSON.parse(await file.text());
                } catch {
                  throw new Error('Geçerli bir JSON istemci dosyası seçin.');
                }
                await api('/google/configure', value);
                setAuthUrl('');
                setSheets([]);
                setPreview(null);
              });
              e.target.value = '';
            }}
          />
        </label>
        <p className="muted">
          Google şifresi REFİKA’ya girilmez. Bağlantı anahtarları bu
          bilgisayarın kullanıcı hesabıyla şifrelenir; kayıt yedeklerine
          eklenmez.
        </p>
      </details>
      {!contacts.sheetUrl && (
        <p className="notice">
          Önce Ayarlar ve yedek bölümüne ortak E-Tablo bağlantısını kaydedin.
        </p>
      )}
      {status?.configured && (
        <div className="actions">
          <button
            disabled={busy || sync.busy || !contacts.sheetUrl}
            onClick={() =>
              act(async () => {
                const result = await api('/google/connect', {});
                setAuthUrl(result.url);
              })
            }
          >
            {status.connected
              ? 'Google hesabını yeniden bağla'
              : 'Google hesabını bağla'}
          </button>
          {status.connected && (
            <button
              disabled={busy || sync.busy}
              onClick={() =>
                act(async () => {
                  await api('/google/disconnect', {});
                  setAuthUrl('');
                  setSheets([]);
                  setPreview(null);
                })
              }
            >
              Google bağlantısını kaldır
            </button>
          )}
        </div>
      )}
      {authUrl && status?.authorizing && (
        <a
          className="button primary"
          href={authUrl}
          target="_blank"
          rel="noreferrer"
        >
          Google izin ekranını aç ↗
        </a>
      )}
      {status?.connected && (
        <>
          <div className="actions">
            <button
              disabled={busy || sync.busy}
              onClick={() => act(loadSheets)}
            >
              E-Tablonun sekmelerini getir
            </button>
            {sync.enabled && (
              <>
                <button
                  disabled={busy || sync.busy}
                  onClick={() => act(() => api('/google/sync', {}))}
                >
                  {sync.busy ? 'Eşitleniyor…' : 'Şimdi eşitle'}
                </button>
                <button
                  disabled={busy}
                  onClick={() => act(() => api('/google/pause', {}))}
                >
                  Eşitlemeyi duraklat
                </button>
              </>
            )}
          </div>
          {sheets.length > 0 && (
            <>
              <div className="form-grid">
                <label className="field">
                  <span>Eşitlenecek çalışma sayfası</span>
                  <select
                    value={sheetId}
                    disabled={busy || sync.busy}
                    onChange={(e) => {
                      setSheetId(e.target.value);
                      setPreview(null);
                      setConfirmed(false);
                    }}
                  >
                    {sheets.map((s) => (
                      <option key={s.sheetId} value={s.sheetId}>
                        {s.title}
                        {s.hidden ? ' (gizli)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>İşlem türü belirtilmemiş satırlar</span>
                  <select
                    value={kind}
                    disabled={busy || sync.busy}
                    onChange={(e) => {
                      setKind(e.target.value);
                      setPreview(null);
                      setConfirmed(false);
                    }}
                  >
                    <option value="">Şablondan otomatik tanı</option>
                    {Object.entries(caseKinds).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                disabled={busy || sync.busy || sheetId === ''}
                onClick={() =>
                  act(async () => {
                    setPreview(
                      await api('/google/preview', {
                        sheetId: Number(sheetId),
                        defaultKind: kind,
                      }),
                    );
                    setConfirmed(false);
                  })
                }
              >
                İleri → E-Tabloyu önizle
              </button>
            </>
          )}
          {preview && (
            <>
              <p>
                <strong>{preview.preview.counts.new} yeni kayıt</strong> ·{' '}
                {preview.preview.counts.existing} mevcut ·{' '}
                {preview.preview.counts.invalid} hatalı ·{' '}
                {preview.preview.counts.duplicate} tekrar
              </p>
              {preview.preview.empty && (
                <p className="notice">
                  Bu sekmede kayıt satırı yok. Dolu sekmeyi seçin.
                </p>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Satır</th>
                      <th>Kişi / okul</th>
                      <th>İşlem</th>
                      <th>Kontrol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.rows.map((item) => (
                      <tr key={item.line}>
                        <td>{item.line}</td>
                        <td>{item.values?.name || item.values?.school}</td>
                        <td>{caseKinds[item.values?.kind]}</td>
                        <td>
                          {
                            {
                              new: 'Yeni kayıt',
                              existing: 'Mevcut kayıt',
                              invalid: 'Düzeltme gerekli',
                              duplicate: 'Tekrar',
                            }[item.action]
                          }
                          <small>{item.message}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination pagination={page} label="E-Tablo önizlemesi" />
              <p className="muted">
                Yeni kayıtların mail taslakları Çalışma listeleri bölümünde
                hazırlanır. E-Tablodaki “onaylı” yazısı sonuç kaydetmez. Kimlik
                veya talep türü değişirse farklı kayıt sayılır; eski kayıt
                silinmez.
              </p>
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={busy || sync.busy}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />{' '}
                Bu sekmeyi kontrol ettim; yeni satırları al, sonraki
                değişiklikleri eşitle. Mevcut kayıt farklılıkları ayrıca
                incelensin.
              </label>
              <button
                className="primary"
                disabled={
                  busy ||
                  sync.busy ||
                  !confirmed ||
                  preview.preview.empty ||
                  Boolean(
                    preview.preview.counts.invalid ||
                    preview.preview.counts.duplicate,
                  )
                }
                onClick={() =>
                  act(async () => {
                    await api('/google/start', {
                      sheetId: Number(sheetId),
                      defaultKind: kind,
                      token: preview.token,
                      confirmed,
                    });
                    setPreview(null);
                    setConfirmed(false);
                  })
                }
              >
                Eşitlemeyi başlat
              </button>
            </>
          )}
          {sync.lastSync && (
            <p>
              Son eşitleme: {date(sync.lastSync)} ·{' '}
              {sync.lastCounts?.created || 0} yeni,{' '}
              {sync.lastCounts?.updated || 0} güncellenen,{' '}
              {sync.lastCounts?.issues || 0} incelenecek kayıt.
            </p>
          )}
          {(sync.pending || []).map((item) => (
            <details key={item.key} className="sync-conflict">
              <summary>
                Satır {item.line} · {item.title || 'Düzeltme gerekli'}
              </summary>
              <p>{item.message}</p>
              {item.fields && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Alan</th>
                        <th>REFİKA</th>
                        <th>E-Tablo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.fields.map((field) => (
                        <tr key={field}>
                          <td>{labels[field] || field}</td>
                          <td>{item.local[field] || '—'}</td>
                          <td>{item.incoming[field] || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {item.caseId && (
                <div className="actions">
                  <button
                    disabled={busy || sync.busy}
                    onClick={() =>
                      act(() =>
                        api('/google/resolve', { ...item, choice: 'local' }),
                      )
                    }
                  >
                    REFİKA’daki bilgiyi koru
                  </button>
                  <button
                    disabled={busy || sync.busy || item.protected}
                    onClick={() =>
                      act(() =>
                        api('/google/resolve', { ...item, choice: 'remote' }),
                      )
                    }
                  >
                    E-Tablodaki bilgiyi al
                  </button>
                </div>
              )}
            </details>
          ))}
          {sync.enabled && (
            <div className="sync-results">
              <h3>Sonuçları ortak E-Tabloya aktar</h3>
              <p>
                Bu sekmeyle eşleşen kayıtların gerçek gönderim ve sonuç geçmişi,
                aynı dosyada ayrı bir “REFIKA Sonuçları” sekmesine tarih ve
                sonuç numarasıyla eklenir. Kaynak sekmenin hücreleri
                değiştirilmez.
              </p>
              {sync.pushEnabled ? (
                <output>
                  Sonuç aktarımı açık. Son aktarım: {date(sync.lastPush)}.{' '}
                  {sync.outputTitle}
                </output>
              ) : (
                <>
                  <label className="check-line">
                    <input
                      type="checkbox"
                      checked={pushConfirmed}
                      disabled={busy || sync.busy}
                      onChange={(e) => setPushConfirmed(e.target.checked)}
                    />{' '}
                    Eşleşen kayıtların gönderim ve sonuç geçmişini ortak
                    E-Tabloya aktar.
                  </label>
                  <button
                    disabled={busy || sync.busy || !pushConfirmed}
                    onClick={() =>
                      act(() =>
                        api('/google/push', {
                          fileId: sync.fileId,
                          confirmed: pushConfirmed,
                        }),
                      )
                    }
                  >
                    Sonuç aktarımını aç
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
