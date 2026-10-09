import { useEffect, useState } from 'react';
import { caseKinds, caseStatuses } from '../validation.mjs';
import { batchFields as fields } from '../validation-batch-content.mjs';
import { EsepLinks, EsepStatus } from './esep-status.jsx';
import {
  TableOrder,
  TablePagination,
  useTablePage,
} from './table-pagination.jsx';
import './validation-batches.css';

function downloadFile(name, content) {
  const url = URL.createObjectURL(new Blob([content]));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function BatchMail({ draft, batchId, api, run, busy, readOnly = false }) {
  const [form, setForm] = useState(draft);
  return (
    <details className="batch-mail">
      <summary>
        {draft.label} — otomatik e-posta taslağı ({draft.count} kayıt)
      </summary>
      <p className="muted">
        Excel’deki açıklamalar ve işlem türleri metne eklendi. Taslak hazırlamak
        gönderim veya hesap onayı değildir.
      </p>
      {draft.unverified > 0 && (
        <p className="notice">
          {draft.unverified} kaydın gerekli kontrolleri REFİKA’da henüz
          tamamlanmadı. Göndermeden önce kişi, okul ve dayanakları inceleyin.
        </p>
      )}
      {draft.excluded > 0 && (
        <p>
          {draft.excluded} bekletilen / uygun bulunmayan kayıt bu e-postanın ve
          ek listesinin dışında tutuldu.
        </p>
      )}
      {draft.regenerated && (
        <p className="notice">
          Satırlar değiştiği için taslak güncel bilgilerle yeniden oluşturuldu.
        </p>
      )}
      <div className="form-grid">
        {['recipient', 'subject', 'body'].map((key) => (
          <label className="field wide" key={key}>
            <span>
              {
                { recipient: 'Alıcı', subject: 'Konu', body: 'E-posta metni' }[
                  key
                ]
              }
            </span>
            {key === 'body' ? (
              <textarea
                rows={12}
                readOnly={readOnly}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            ) : (
              <input
                readOnly={readOnly}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            )}
          </label>
        ))}
      </div>
      <div className="actions">
        {!readOnly && (
          <button
            disabled={busy || !draft.count}
            onClick={() =>
              run(
                () =>
                  api(`/validation-batches/${batchId}/draft`, {
                    ...form,
                    token: draft.token,
                  }),
                'Toplu e-posta taslağı kaydedildi.',
              )
            }
          >
            Taslağı kaydet
          </button>
        )}
        <button
          disabled={!draft.count}
          onClick={() =>
            downloadFile(
              `REFIKA-${draft.group}-mail.txt`,
              '\uFEFF' +
                `Alıcı: ${form.recipient}\nKonu: ${form.subject}\n\n${form.body}`,
            )
          }
        >
          Mail metnini indir
        </button>
        {batchId && (
          <a
            className="button"
            href={`/api/validation-batches/${batchId}/export?group=${draft.group}`}
            download
          >
            Bu mailin Excel ekini indir
          </a>
        )}
      </div>
    </details>
  );
}
const timeNow = () =>
  new Date()
    .toLocaleString('sv-SE', { timeZone: 'Europe/Istanbul' })
    .replace(' ', 'T')
    .slice(0, 16);
const dateLabel = (value) =>
  new Date(value).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
const resultReference = (number) =>
  number ? `SON-${String(number).padStart(6, '0')}` : '';
const importLabels = {
  new: 'Yeni kayıt',
  existing: 'Zaten kayıtlı',
  duplicate: 'Dosyada tekrar',
  invalid: 'Düzeltme gerekli',
};

function ExcelImport({ api, run, busy, fileData, onCreated, onClose, manual }) {
  const [input, setInput] = useState({ defaultKind: 'person' }),
    [preview, setPreview] = useState(null),
    [confirmed, setConfirmed] = useState(false),
    [skipInvalid, setSkipInvalid] = useState(false),
    [stale, setStale] = useState(false);
  const page = useTablePage(
    preview?.items || [],
    preview?.token || '',
    'source',
  );
  function change(patch) {
    setInput((old) => ({ ...old, ...patch }));
    setConfirmed(false);
    setStale(true);
  }
  async function inspect(source) {
    const result = await api('/validation-batches/preview', source);
    setPreview(result);
    setInput({ ...source, mapping: result.mapping, sheet: result.sheet });
    setStale(false);
    setConfirmed(false);
    setSkipInvalid(false);
  }
  return (
    <section className="panel batch-import">
      <div className="section-head">
        <h2>Excel’den yeni kayıt</h2>
        <button onClick={onClose} disabled={busy}>
          Listelere dön
        </button>
      </div>
      <p>
        Validasyon Excel’ini bir kez yükle; REFİKA her satır için kaydı otomatik
        oluştursun. Onay maili geldiğinde aynı listedeki sonuçları topluca işle.
      </p>
      <div className="actions">
        <a className="button" href="/api/validation-batches/template" download>
          Boş validasyon Excel’i indir
        </a>
      </div>
      <p className="muted">
        İlk satır sütun başlıkları olmalı. Kişi kaydı için ad soyad ve kişi ID;
        okul kaydı için okul adı ve okul ID yeterli. Profil bağlantılarını
        Excel’e ekleyebilirsin; REFİKA’da aynı ID ile tek bir bağlantı varsa
        otomatik tamamlanır. Excel’deki “onaylı” yazısı tek başına onay
        sayılmaz.
      </p>
      <div className="form-grid">
        <label className="field">
          <span>Excel veya CSV listesi</span>
          <input
            type="file"
            accept=".xlsx,.csv,.tsv"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files[0];
              if (file)
                run(async () => {
                  const source = {
                    ...(await fileData(file)),
                    defaultKind: input.defaultKind,
                  };
                  setInput(source);
                  setPreview(null);
                  await inspect(source);
                });
            }}
          />
        </label>
        <label className="field">
          <span>İşlem türü boş satırlar için</span>
          <select
            value={input.defaultKind}
            disabled={busy}
            onChange={(event) => change({ defaultKind: event.target.value })}
          >
            {Object.entries(caseKinds).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {preview && (
        <>
          <details>
            <summary>Sütunları eşleştir / çalışma sayfasını seç</summary>
            <div className="form-grid">
              {preview.sheets?.length > 1 && (
                <label className="field">
                  <span>Çalışma sayfası</span>
                  <select
                    value={input.sheet}
                    onChange={(e) =>
                      run(() =>
                        inspect({
                          ...input,
                          sheet: e.target.value,
                          mapping: undefined,
                        }),
                      )
                    }
                  >
                    {preview.sheets.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}
              {fields.map(([key, label]) => (
                <label className="field" key={key}>
                  <span>{label}</span>
                  <select
                    disabled={busy}
                    value={input.mapping?.[key] ?? -1}
                    onChange={(e) =>
                      change({
                        mapping: {
                          ...input.mapping,
                          [key]: Number(e.target.value),
                        },
                      })
                    }
                  >
                    <option value={-1}>Bu dosyada yok</option>
                    {preview.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Sütun ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </details>
          {stale && (
            <p className="notice">
              Seçimler değişti. Kayıtları oluşturmadan önce önizlemeyi yenile.
            </p>
          )}
          <button disabled={busy} onClick={() => run(() => inspect(input))}>
            Önizlemeyi yenile
          </button>
          <p>
            <strong>{preview.counts.new} yeni</strong> ·{' '}
            {preview.counts.existing} mevcut · {preview.counts.duplicate} tekrar
            · {preview.counts.invalid} hatalı satır
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Excel satırı</th>
                  <th>Kişi / okul</th>
                  <th>İşlem</th>
                  <th>Açıklama / talep edilen işlem</th>
                  <th>Kontrol</th>
                </tr>
              </thead>
              <tbody>
                {page.rows.map((item) => (
                  <tr key={item.line}>
                    <td>{item.line}</td>
                    <td>
                      {item.values?.name || item.values?.school || '—'}
                      <small>
                        {item.values?.accountId} · {item.values?.school}{' '}
                        {item.values?.schoolId}
                      </small>
                    </td>
                    <td>{caseKinds[item.values?.kind] || '—'}</td>
                    <td>
                      {item.values?.reason}
                      <small>{item.values?.requestedAction}</small>
                    </td>
                    <td>
                      <strong>{importLabels[item.action]}</strong>
                      <small>{item.message}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination pagination={page} label="Excel önizlemesi" />
          {!stale && (
            <>
              {(preview.drafts || []).map((draft) => (
                <BatchMail
                  key={preview.token + draft.group}
                  draft={draft}
                  readOnly
                />
              ))}
              <button
                disabled={busy || !preview.counts.new}
                onClick={() =>
                  run(async () => {
                    const result = await api(
                      '/validation-batches/preview-export',
                      { ...input, token: preview.token },
                    );
                    downloadFile(
                      'REFIKA-kaydedilmemis-onizleme.xlsx',
                      Uint8Array.from(atob(result.data), (c) =>
                        c.charCodeAt(0),
                      ),
                    );
                  })
                }
              >
                Kaydetmeden Excel önizlemesini indir
              </button>
              <p className="muted">
                İndirmek kayıt oluşturmaz. Aşağıdaki “Kayıtları topluca oluştur”
                ile REFİKA’ya kaydedilir.
              </p>
            </>
          )}
          {preview.counts.invalid > 0 && (
            <label className="check-line">
              <input
                type="checkbox"
                checked={skipInvalid}
                disabled={busy || stale}
                onChange={(e) => {
                  setSkipInvalid(e.target.checked);
                  setConfirmed(false);
                }}
              />
              Hatalı satırları dışarıda bırak; yalnız geçerli yeni kayıtları
              oluştur.
            </label>
          )}
          <label className="check-line">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy || stale}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Önizlemeyi kontrol ettim; {preview.counts.new} yeni kayıt
            oluşturulsun.
          </label>
          <button
            className="primary"
            disabled={
              busy ||
              stale ||
              !confirmed ||
              !preview.counts.new ||
              Boolean(preview.counts.invalid && !skipInvalid)
            }
            onClick={() =>
              run(async () => {
                const result = await api('/validation-batches/commit', {
                  ...input,
                  token: preview.token,
                  confirmed,
                  skipInvalid,
                });
                onCreated(result.batchId);
              }, 'Excel satırlarından kayıtlar oluşturuldu. Gönderim ve onay ayrıca işlenir.')
            }
          >
            Kayıtları topluca oluştur
          </button>
        </>
      )}
      <details className="batch-manual">
        <summary>Excel dışındaki özel işlemler</summary>
        <p>
          Tek bir dosyayı ayrıntılı kaydetmek istersen mevcut formu açabilirsin.
        </p>
        <button disabled={busy} onClick={manual}>
          Ayrıntılı tekil kayıt aç
        </button>
      </details>
    </section>
  );
}
function BatchDetail({ batch, api, run, busy, openCase, onClose }) {
  const [action, setAction] = useState(batch.prepared ? 'sent' : 'result'),
    [selected, setSelected] = useState([]),
    [form, setForm] = useState({
      happenedAt: timeNow(),
      note: '',
      evidenceUrl: '',
      outcome: 'approved',
      confirmed: false,
    });
  const eligible = batch.rows.filter((row) =>
    action === 'sent'
      ? ['review', 'ready'].includes(row.status)
      : row.status === 'waiting',
  );
  const page = useTablePage(batch.rows, batch.id + action, 'source');
  const selectedRows = eligible.filter((r) => selected.includes(r.id));
  function set(key, value) {
    setForm((old) => ({ ...old, [key]: value, confirmed: false }));
  }
  function pick(ids) {
    setSelected(ids);
    setForm((old) => ({ ...old, confirmed: false }));
  }
  return (
    <section className="panel batch-detail">
      <div className="section-head">
        <h2>{batch.title}</h2>
        <button disabled={busy} onClick={onClose}>
          Listelere dön
        </button>
      </div>
      <p>
        {batch.rows.length} kayıt · {batch.prepared} gönderilmedi ·{' '}
        {batch.waiting} sonuç bekliyor · {batch.completed} sonuçlandı
      </p>
      <div className="actions">
        <a
          className="button"
          href={`/api/validation-batches/${batch.id}/export`}
        >
          Validasyon Excel’ini indir
        </a>
        {batch.sourceFile && (
          <a href={'/api/files/' + batch.sourceFile.id}>
            Yüklenen kaynak dosya
          </a>
        )}
      </div>
      {(batch.drafts || []).map((draft) => (
        <BatchMail
          key={draft.token}
          draft={draft}
          batchId={batch.id}
          api={api}
          run={run}
          busy={busy}
        />
      ))}
      <div className="tabs">
        <button
          aria-pressed={action === 'sent'}
          onClick={() => {
            setAction('sent');
            pick([]);
          }}
        >
          Gönderimi kaydet
        </button>
        <button
          aria-pressed={action === 'result'}
          onClick={() => {
            setAction('result');
            pick([]);
          }}
        >
          Onay / sonuç mailini işle
        </button>
      </div>
      <p>
        {action === 'sent'
          ? 'Excel’i merkeze gönderdikten sonra ilgili satırları seçip gönderim tarihini bir kez kaydet.'
          : 'Mailin açıkça onayladığı kayıtları seç. Mailde istisna tutulanları seçme; onlar beklemede kalır.'}
      </p>
      <div className="actions">
        <button
          disabled={busy || !eligible.length}
          onClick={() => pick(eligible.map((r) => r.id))}
        >
          {action === 'sent'
            ? 'Gönderilmemişlerin tümünü seç'
            : 'Bekleyenlerin tümünü seç'}{' '}
          ({eligible.length})
        </button>
        <button disabled={busy || !selected.length} onClick={() => pick([])}>
          Seçimi kaldır
        </button>
        <strong>{selectedRows.length} kayıt seçili</strong>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Seç</th>
              <th>Sıra</th>
              <th>Kişi / okul</th>
              <th>Tür</th>
              <th>Açıklama / talep edilen işlem</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row, index) => (
              <tr key={row.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`${row.name || row.school} kaydını seç`}
                    checked={selected.includes(row.id)}
                    disabled={busy || !eligible.some((r) => r.id === row.id)}
                    onChange={(e) =>
                      pick(
                        e.target.checked
                          ? [...selected, row.id]
                          : selected.filter((id) => id !== row.id),
                      )
                    }
                  />
                </td>
                <td>{page.from + index}</td>
                <td>
                  {row.name || row.school}
                  <small>
                    {row.accountId} · {row.school} {row.schoolId}
                  </small>
                  <EsepLinks row={row} />
                </td>
                <td>{caseKinds[row.kind]}</td>
                <td>
                  {row.reason}
                  <small>{row.requestedAction}</small>
                </td>
                <td>
                  {row.status === 'review'
                    ? 'Excel’den alındı · gönderilmedi'
                    : row.status === 'completed'
                      ? row.outcome === 'approved'
                        ? 'Onaylandı'
                        : row.outcome === 'rejected'
                          ? 'Uygun bulunmadı'
                          : 'Diğer sonuç'
                      : caseStatuses[row.status]}
                </td>
                <td>
                  <button disabled={busy} onClick={() => openCase(row)}>
                    Ayrıntı
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination pagination={page} label="Excel listesi kayıtları" />
      {eligible.length > 0 ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run(
              async () => {
                await api(`/validation-batches/${batch.id}/${action}`, {
                  ...form,
                  happenedAt: form.happenedAt + ':00+03:00',
                  rows: selectedRows.map((r) => ({
                    id: r.id,
                    version: r.version,
                  })),
                });
                pick([]);
                setForm({
                  happenedAt: timeNow(),
                  note: '',
                  evidenceUrl: '',
                  outcome: 'approved',
                  confirmed: false,
                });
              },
              action === 'sent'
                ? 'Seçili kayıtların gönderimi kaydedildi.'
                : 'Sonuçlar kaydedildi; onaylı kişi ve okul kayıtları güncellendi.',
            );
          }}
        >
          <fieldset disabled={busy}>
            <div className="form-grid">
              <label className="field">
                <span>
                  {action === 'sent'
                    ? 'Gönderim tarihi ve saati (Türkiye)'
                    : 'Onay / sonuç mailinin tarihi (Türkiye)'}
                </span>
                <input
                  type="datetime-local"
                  required
                  value={form.happenedAt}
                  onChange={(e) => set('happenedAt', e.target.value)}
                />
              </label>
              {action === 'result' && (
                <label className="field">
                  <span>Seçili kayıtların sonucu</span>
                  <select
                    value={form.outcome}
                    onChange={(e) => set('outcome', e.target.value)}
                  >
                    <option value="approved">Onaylandı</option>
                    <option value="rejected">Uygun bulunmadı</option>
                    <option value="other">Diğer sonuç</option>
                  </select>
                </label>
              )}
              <label className="field wide">
                <span>
                  {action === 'sent'
                    ? 'Gönderim maili metni / dayanak'
                    : 'Gelen onay / sonuç maili metni'}
                </span>
                <textarea
                  rows={3}
                  maxLength={6000}
                  value={form.note}
                  onChange={(e) => set('note', e.target.value)}
                  placeholder="Mail metnini buraya yapıştırabilirsin."
                />
              </label>
              <label className="field wide">
                <span>Mail bağlantısı (metin yerine de kullanılabilir)</span>
                <input
                  type="url"
                  value={form.evidenceUrl}
                  onChange={(e) => set('evidenceUrl', e.target.value)}
                />
              </label>
            </div>
            <label className="check-line">
              <input
                type="checkbox"
                checked={form.confirmed}
                onChange={(e) =>
                  setForm((old) => ({ ...old, confirmed: e.target.checked }))
                }
              />
              {action === 'sent'
                ? `Seçili ${selectedRows.length} kaydın gönderildiğini teyit ediyorum.`
                : `Bu mailin seçili ${selectedRows.length} kayıt için belirttiğim sonucu içerdiğini teyit ediyorum.`}
            </label>
            <button
              type="submit"
              className="primary"
              disabled={
                !selectedRows.length ||
                !form.confirmed ||
                (!form.note.trim() && !form.evidenceUrl.trim())
              }
            >
              {action === 'sent'
                ? 'Seçilenleri gönderildi kaydet'
                : 'Seçilenlerin sonucunu kaydet'}
            </button>
          </fieldset>
        </form>
      ) : (
        <p>Bu adımda işlenecek bekleyen kayıt yok.</p>
      )}
    </section>
  );
}
export function ValidationBatchesWorkspace({
  state,
  api,
  run,
  busy,
  fileData,
  openCase,
  manual,
  initialImport = false,
}) {
  const [batches, setBatches] = useState([]),
    [importing, setImporting] = useState(initialImport),
    [selected, setSelected] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api('/validation-batches').then(
      (data) => {
        if (active) {
          setBatches(data);
          setError('');
        }
      },
      (e) => {
        if (active) setError(e.message);
      },
    );
    return () => {
      active = false;
    };
  }, [api, state.revision]);
  const batch = batches.find((b) => b.id === selected);
  if (importing)
    return (
      <ExcelImport
        api={api}
        run={run}
        busy={busy}
        fileData={fileData}
        manual={manual}
        onClose={() => setImporting(false)}
        onCreated={(id) => {
          setSelected(id);
          setImporting(false);
        }}
      />
    );
  if (batch)
    return (
      <BatchDetail
        key={batch.id + ':' + state.revision}
        batch={batch}
        api={api}
        run={run}
        busy={busy}
        openCase={openCase}
        onClose={() => setSelected('')}
      />
    );
  return (
    <section className="panel">
      <div className="section-head">
        <h2>Excel validasyon listeleri</h2>
        <button className="primary" onClick={() => setImporting(true)}>
          Excel’den yeni kayıt
        </button>
      </div>
      <p>
        Excel’i yükle, gönderimi bir kez kaydet, gelen mailin kapsadığı
        kayıtları topluca sonuçlandır.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!batches.length ? (
        <p>
          Henüz Excel listesi eklenmedi. Mevcut kayıtların ve sonuçların kendi
          listelerinde korunuyor.
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Liste</th>
                <th>Kayıt</th>
                <th>Gönderilmedi</th>
                <th>Bekliyor</th>
                <th>Sonuçlandı</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td>
                    {b.title}
                    <small>{dateLabel(b.createdAt)}</small>
                  </td>
                  <td>{b.rows.length}</td>
                  <td>{b.prepared}</td>
                  <td>{b.waiting}</td>
                  <td>{b.completed}</td>
                  <td>
                    <button onClick={() => setSelected(b.id)}>
                      Listeyi aç
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
export function ApprovedAccounts({ state, api, openCase }) {
  const [rows, setRows] = useState([]),
    [kind, setKind] = useState('person'),
    [query, setQuery] = useState(''),
    [order, setOrder] = useState('alphabetical'),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api('/validation-accounts').then(
      (data) => {
        if (active) {
          setRows(data);
          setError('');
        }
      },
      (e) => {
        if (active) setError(e.message);
      },
    );
    return () => {
      active = false;
    };
  }, [api, state.revision]);
  const filtered = rows.filter(
    (r) =>
      r.kind === kind &&
      [r.name, r.accountId, r.school, r.schoolId]
        .join(' ')
        .toLocaleLowerCase('tr')
        .includes(query.toLocaleLowerCase('tr')),
  );
  const page = useTablePage(filtered, kind + query + state.revision, order);
  return (
    <section className="panel">
      <h2>Onaylı kişi ve okul kayıtları</h2>
      <p>
        Mail / sonuç dayanağıyla onaylanan kayıtlar burada otomatik görünür.
        Güncel ESEP kontrolü ayrıca gösterilir.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="tabs">
        {[
          ['person', 'Kişi hesapları'],
          ['school', 'Okul hesapları'],
          ['membership', 'Okul üyelikleri'],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={kind === key}
            onClick={() => setKind(key)}
          >
            {label} ({rows.filter((r) => r.kind === key).length})
          </button>
        ))}
      </div>
      <div className="classic-toolbar">
        <label>
          Kayıt ara{' '}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <TableOrder value={order} onChange={setOrder} />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sıra</th>
              <th>Kişi / okul</th>
              <th>Onay kaydı</th>
              <th>Güncel ESEP</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row, index) => (
              <tr key={row.id}>
                <td>{page.from + index}</td>
                <td>
                  {row.kind === 'school' ? row.school : row.name}
                  <small>
                    {row.accountId} · {row.school} {row.schoolId}
                  </small>
                  <EsepLinks row={row} />
                </td>
                <td>
                  {dateLabel(row.approvedAt)}
                  <small>{resultReference(row.resultNumber)}</small>
                  {row.evidenceUrl && (
                    <a href={row.evidenceUrl} target="_blank" rel="noreferrer">
                      Onay kaynağı
                    </a>
                  )}
                  {row.currentStatus === 'review' && (
                    <small>Dosya yeniden incelemede</small>
                  )}
                </td>
                <td>
                  <EsepStatus row={row} />
                </td>
                <td>
                  <button onClick={() => openCase(row.caseId)}>Kaydı aç</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && <p>Bu görünümde onaylı kayıt yok.</p>}
      <TablePagination pagination={page} label="Onaylı hesaplar" />
    </section>
  );
}
