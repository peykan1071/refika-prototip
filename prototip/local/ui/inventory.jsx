import { useEffect, useRef, useState } from 'react';
import {
  inventoryFields,
  inventoryKinds,
  inventoryToday,
  activityLabels,
  validationLabels,
  affiliationLabels,
} from '../inventory-fields.mjs';
import {
  TableOrder,
  TablePagination,
  useTablePage,
} from './table-pagination.jsx';
import './inventory.css';

const date = (value) =>
  value
    ? value.slice(0, 10).split('-').reverse().join('.')
    : 'Henüz yüklenmedi';
const actionLabels = {
  new: 'Yeni',
  update: 'Güncellenecek',
  unchanged: 'Aynı',
};
export function InventoryReminder({ reminders = [], open }) {
  const due = reminders.filter((r) => r.due);
  if (!due.length) return null;
  return (
    <section
      className="inventory-reminder"
      aria-label="Üç aylık envanter hatırlatması"
    >
      <div>
        <strong>İl envanterini güncelleme zamanı</strong>
        <p>
          {due
            .map(
              (r) =>
                `${inventoryKinds[r.kind]}: ${r.lastOn ? 'yenileme tarihi ' + date(r.dueOn) : 'ilk ESEP listesi bekleniyor'}`,
            )
            .join(' · ')}
        </p>
      </div>
      {open && <button onClick={open}>İl envanterini aç</button>}
    </section>
  );
}

export function InventoryWorkspace({
  state,
  api,
  run,
  busy,
  fileData,
  openCase,
}) {
  const upload = useRef(null);
  const [data, setData] = useState(null),
    [error, setError] = useState('');
  const [kind, setKind] = useState('person'),
    [query, setQuery] = useState(''),
    [order, setOrder] = useState('alphabetical');
  const [activity, setActivity] = useState('all'),
    [source, setSource] = useState('all');
  const [file, setFile] = useState(null),
    [sheet, setSheet] = useState(''),
    [mapping, setMapping] = useState(null);
  const [preview, setPreview] = useState(null),
    [observedOn, setObservedOn] = useState(inventoryToday());
  const [complete, setComplete] = useState(false),
    [expectedCount, setExpectedCount] = useState('');
  const [confirmed, setConfirmed] = useState(false),
    [confirmMissing, setConfirmMissing] = useState(false);
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    let active = true;
    api('/inventory')
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [api, state.revision]);
  const rows = (data?.rows || []).filter(
    (r) =>
      r.kind === kind &&
      (activity === 'all' || r.activity === activity) &&
      (source === 'all' ||
        (source === 'imported' && r.imported && !r.missingSince) ||
        (source === 'validation' && !r.imported) ||
        (source === 'missing' && r.missingSince) ||
        (source === 'current' &&
          r.imported &&
          !r.missingSince &&
          r.affiliation === 'current')) &&
      [r.name, r.recordId, r.district, ...r.schools.map((s) => s.name)]
        .join(' ')
        .toLocaleLowerCase('tr')
        .includes(query.toLocaleLowerCase('tr')),
  );
  const page = useTablePage(
    rows,
    JSON.stringify([kind, query, activity, source, state.revision]),
    order,
  );
  const previewPage = useTablePage(
    preview?.items || [],
    preview?.token,
    'source',
  );
  const stats = data?.statistics[kind];
  const hasImport = data?.imports.some((batch) => batch.kind === kind);
  const reminder = data?.reminders.find((r) => r.kind === kind);
  const provinceName = state.provinces[Number(state.settings.province) - 1];
  function resetPreview() {
    setPreview(null);
    setConfirmMissing(false);
    setError('');
  }
  function changeKind(value) {
    setKind(value);
    setMapping(null);
    setSheet('');
    setFile(null);
    resetPreview();
    setDetail(null);
  }
  async function input() {
    if (!file) throw new Error('Dolu bir Excel veya CSV dosyası seçin.');
    if (!confirmed)
      throw new Error(
        `Dosyanın ${provinceName} iline ait olduğunu doğrulayın.`,
      );
    return {
      ...(await fileData(file)),
      kind,
      sheet,
      mapping,
      observedOn,
      complete,
      expectedCount,
      province: state.settings.province,
    };
  }
  async function inspect() {
    setError('');
    await run(async () => {
      try {
        const next = await api('/inventory/preview', await input());
        setPreview(next);
        setMapping(next.mapping);
        setSheet(next.sheet || '');
        setConfirmMissing(false);
      } catch (e) {
        setError(e.message);
        throw e;
      }
    });
  }
  async function commit() {
    setError('');
    await run(async () => {
      try {
        await api('/inventory/commit', {
          ...(await input()),
          token: preview.token,
          confirmMissing,
        });
        setPreview(null);
        setFile(null);
        if (upload.current) upload.current.value = '';
        setData(await api('/inventory'));
        setDetail(null);
      } catch (e) {
        setError(e.message);
        throw e;
      }
    }, 'İl envanteri güncellendi. Validasyon geçmişi korundu.');
  }
  return (
    <section className="card inventory-workspace">
      <h2>{provinceName} il ESEP envanteri</h2>
      <p>
        ESEP’teki kişi ve okul listeleri burada tutulur. Onay mailiyle
        sonuçlanan validasyonlar aynı ID üzerinden otomatik bağlanır. Dönemlik
        validasyon sayıları ayrı izlenir.
      </p>
      <InventoryReminder reminders={data?.reminders} />
      <nav className="plan-tabs" aria-label="İl envanteri türü">
        {Object.entries(inventoryKinds).map(([key, label]) => (
          <button
            key={key}
            aria-pressed={kind === key}
            onClick={() => changeKind(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      {stats && (
        <>
          <div className="inventory-metrics">
            {[
              [hasImport ? stats.imported : '—', 'Yüklü ESEP kayıtları'],
              [hasImport ? stats.activity.active : '—', 'Aktif'],
              [hasImport ? stats.activity.dormant : '—', 'Dormant'],
              [
                stats.validationOnly,
                'Validasyondan geldi; ESEP listesi bekliyor',
              ],
              [stats.missing, 'Son tam listede görülmedi'],
            ].map(([count, label]) => (
              <div key={label}>
                <strong>{count}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          {!hasImport && (
            <p>
              İlk ESEP dosyası henüz yüklenmedi. Aşağıdaki kayıtlar validasyon
              kaynağından gelmiştir; il toplamı değildir.
            </p>
          )}
          {hasImport && (
            <p>
              Yüklü kaynakların kapsamı — Onaylı:{' '}
              <b>{stats.validation.validated}</b> · Onay bekliyor:{' '}
              <b>{stats.validation.pending}</b> · Aktivitesi belirtilmemiş:{' '}
              <b>{stats.activity.unknown}</b>
              {kind === 'person' && (
                <>
                  {' '}
                  · Güncel il ilişkisi doğrulanan:{' '}
                  <b>{stats.affiliation.current}</b> · Geçmiş ilişki:{' '}
                  <b>{stats.affiliation.historical}</b> · İl ilişkisi kontrol
                  edilmeli: <b>{stats.affiliation.unknown}</b>
                </>
              )}
            </p>
          )}
        </>
      )}
      <p className="muted">
        Son tam liste: {date(reminder?.lastOn)} · Sonraki yenileme:{' '}
        {reminder?.dueOn ? date(reminder.dueOn) : 'İlk tam listeden 3 ay sonra'}
        . Hatırlatma REFİKA açıldığında görünür; kısmi listeler yenileme
        tarihini ertelemez.
      </p>
      <p className="inventory-note">
        ESEP’in il filtresi geçmiş okul ilişkilerini de içerebilir. “İl ilişkisi
        kontrol edilmeli” kayıtları halen ilde görevli kişi sayısına katılmaz.
        “Onaylı”, “aktif” anlamına gelmez.
      </p>
      <div className="classic-toolbar">
        <label>
          Envanterde ara
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Hesap etkinliği
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
          >
            <option value="all">Tümü</option>
            {Object.entries(activityLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kayıt kaynağı
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">Tüm kayıtlar</option>
            <option value="imported">ESEP listesinde görülen</option>
            <option value="validation">Validasyondan gelen</option>
            <option value="current">Güncel il ilişkisi doğrulanan</option>
            <option value="missing">Son tam listede görülmeyen</option>
          </select>
        </label>
        <TableOrder value={order} onChange={setOrder} />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sıra</th>
              <th>Kişi / okul</th>
              <th>Dosyadaki ESEP durumu</th>
              <th>Kaynak ve tarih</th>
              <th>Geçmiş / onay</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row, i) => (
              <tr key={row.id}>
                <td>{page.from + i}</td>
                <td>
                  {row.profileUrl ? (
                    <a href={row.profileUrl} target="_blank" rel="noreferrer">
                      {row.name} ↗
                    </a>
                  ) : (
                    row.name
                  )}
                  <small>
                    ESEP ID: {row.recordId}
                    {row.district && ` · ${row.district}`}
                  </small>
                  {row.schools.map((s, i) => (
                    <small key={s.id + ':' + i}>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noreferrer">
                          {s.name} ↗
                        </a>
                      ) : (
                        s.name
                      )}
                      {s.id && ` · ${s.id}`}
                    </small>
                  ))}
                </td>
                <td>
                  <span className="badge">{activityLabels[row.activity]}</span>
                  <small>Onay: {validationLabels[row.validation]}</small>
                  {row.sourceStatus && (
                    <small>Kaynak: {row.sourceStatus}</small>
                  )}
                  {kind === 'person' && (
                    <small>{affiliationLabels[row.affiliation]}</small>
                  )}
                </td>
                <td>
                  {row.imported ? (
                    <>
                      ESEP dosyası<small>{date(row.observedOn)}</small>
                      {row.missingSince && (
                        <strong>
                          Son tam listede yok: {date(row.missingSince)}
                        </strong>
                      )}
                    </>
                  ) : (
                    'Validasyondan geldi; ESEP listesinde kontrol bekliyor'
                  )}
                </td>
                <td>
                  {row.approval && (
                    <button onClick={() => openCase(row.approval.caseId)}>
                      Onay kaydı · SON-
                      {String(row.approval.resultNumber).padStart(6, '0')}
                    </button>
                  )}
                  <button onClick={() => setDetail(row)}>
                    Değişiklik geçmişi ({row.changes.length})
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination pagination={page} label="İl envanteri" />
      <a className="button" href={`/api/inventory/export?kind=${kind}`}>
        Bu envanteri Excel indir
      </a>
      {detail && (
        <section
          className="inventory-note"
          aria-label="Envanter değişiklik geçmişi"
        >
          <h3>{detail.name} — değişiklik geçmişi</h3>
          {detail.changes.length ? (
            <ol>
              {detail.changes.map((change, i) => (
                <li key={i}>
                  <b>{date(change.on)}</b> · {change.message}
                  {change.fields && (
                    <ul>
                      {change.fields.map((field) => (
                        <li key={field}>
                          {{
                            name: 'Ad',
                            activity: 'Etkinlik',
                            validation: 'Onay',
                            affiliation: 'İl ilişkisi',
                            schools: 'Okul ilişkileri',
                            sourceStatus: 'Kaynak durumu',
                            profileUrl: 'Profil',
                            district: 'İlçe',
                          }[field] || field}
                          : {JSON.stringify(change.before[field])} →{' '}
                          {JSON.stringify(change.after[field])}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p>Henüz değişiklik kaydı yok.</p>
          )}
          <button onClick={() => setDetail(null)}>Geçmişi kapat</button>
        </section>
      )}
      <section className="inventory-import" aria-label="ESEP envanteri yükleme">
        <h3>Güncel ESEP listesini yükle</h3>
        <ol>
          <li>
            ESEP’te ilinizi seçin. Kişiler ve okullar için ayrı dosya
            hazırlayın. Tüm durumları içeren listeyi ve kaynak tarihini
            kullanın.
          </li>
          <li>
            Excel (.xlsx) veya CSV dosyasını seçin. ESEP ID ve ad sütunlarını
            kontrol edin; isimdeki gömülü profil bağlantısı okunur.
          </li>
          <li>
            Önizlemede değişiklikleri inceleyip envanteri güncelleyin. Aynı ID
            tekrar eklenmez; okul adı değişikliği geçmişiyle saklanır.
          </li>
        </ol>
        <p>
          ESEP hesabınızda dışa aktarma görünmüyorsa yetkili birimden il
          dosyasını alabilir veya tablodan Excel’e kopyaladığınız satırları{' '}
          <b>kısmi liste</b> olarak yükleyebilirsiniz. Bir sayfayı tam il
          listesi olarak işaretlemeyin.
        </p>
        <p className="muted">
          Telefon, e-posta ve diğer eşleştirilmeyen sütunlar alınmaz. Kaynak
          dosyanın tamamı saklanmaz; seçilen envanter alanları ve değişiklik
          geçmişi yerelde tutulur. Bu işlem ESEP’e veya yapay zekâya veri
          göndermez.
        </p>
        <div className="inventory-form">
          <label>
            Excel / CSV dosyası
            <input
              key={kind}
              ref={upload}
              type="file"
              accept=".xlsx,.csv,.tsv"
              disabled={busy}
              onChange={(e) => {
                setFile(e.target.files[0] || null);
                setMapping(null);
                setSheet('');
                resetPreview();
              }}
            />
          </label>
          <label>
            ESEP verisinin tarihi
            <input
              type="date"
              value={observedOn}
              max={inventoryToday()}
              onChange={(e) => {
                setObservedOn(e.target.value);
                resetPreview();
              }}
            />
          </label>
          <label>
            Listenin kapsamı
            <select
              value={complete ? 'complete' : 'partial'}
              onChange={(e) => {
                setComplete(e.target.value === 'complete');
                resetPreview();
              }}
            >
              <option value="partial">Kısmi / filtreli liste</option>
              <option value="complete">
                İlin tüm durumları içeren tam listesi
              </option>
            </select>
          </label>
          {complete && (
            <label>
              ESEP’te görünen toplam benzersiz kayıt
              <input
                type="number"
                min="1"
                max="10000"
                value={expectedCount}
                onChange={(e) => {
                  setExpectedCount(e.target.value);
                  resetPreview();
                }}
              />
            </label>
          )}
        </div>
        <label className="inventory-check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => {
              setConfirmed(e.target.checked);
              resetPreview();
            }}
          />
          Bu dosya {provinceName} iline ait. Tam liste seçtiysem tüm sayfaları
          ve hesap durumlarını içeriyor.
        </label>
        <button disabled={busy || !file || !confirmed} onClick={inspect}>
          İleri → Envanteri önizle
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {preview && (
          <>
            <h3>Sütunları kontrol et</h3>
            {preview.sheets?.length > 1 && (
              <label>
                Excel çalışma sayfası
                <select
                  value={sheet}
                  onChange={(e) => {
                    setSheet(e.target.value);
                    setMapping(null);
                    setPreview({ ...preview, token: '' });
                  }}
                >
                  {preview.sheets.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
            <div className="inventory-mapping">
              {inventoryFields
                .filter(
                  ([key]) =>
                    kind === 'person' ||
                    !['school', 'schoolId', 'schoolUrl'].includes(key),
                )
                .map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <select
                      value={mapping?.[key] ?? -1}
                      onChange={(e) => {
                        setMapping({
                          ...mapping,
                          [key]: Number(e.target.value),
                        });
                        setPreview({ ...preview, token: '' });
                      }}
                    >
                      <option value={-1}>Alınmasın / yok</option>
                      {preview.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || '(Boş başlık)'} · {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
            </div>
            <button disabled={busy} onClick={inspect}>
              Önizlemeyi güncelle
            </button>
            <p>
              <b>{preview.rows.length} benzersiz kayıt</b> ·{' '}
              {preview.counts.new} yeni · {preview.counts.update} güncelleme ·{' '}
              {preview.counts.unchanged} aynı · {preview.counts.invalid} hatalı
              · {preview.counts.missing} son tam listede yok.
            </p>
            {preview.error && <p className="error">{preview.error}</p>}
            {preview.duplicate && (
              <p>Bu liste aynı kaynak tarihiyle zaten kaydedilmiş.</p>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Satır</th>
                    <th>ESEP ID</th>
                    <th>Ad</th>
                    <th>Etkinlik / onay</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {previewPage.rows.map((item, i) => (
                    <tr key={i}>
                      <td>{item.line}</td>
                      <td>{item.values?.recordId}</td>
                      <td>
                        {item.values?.name}
                        {item.previousName &&
                          item.previousName !== item.values?.name && (
                            <small>Önceki ad: {item.previousName}</small>
                          )}
                      </td>
                      <td>
                        {item.values &&
                          `${activityLabels[item.values.activity]} / ${validationLabels[item.values.validation]}`}
                      </td>
                      <td>{item.error || actionLabels[item.action]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              pagination={previewPage}
              label="Envanter önizlemesi"
            />
            {preview.missing.length > 0 && (
              <div className="inventory-note">
                <p>
                  Şu kayıtlar silinmeyecek; “son tam listede görülmedi” olarak
                  işaretlenecek:
                </p>
                <ul className="inventory-missing">
                  {preview.missing.map((r) => (
                    <li key={r.id}>
                      {r.name} · {r.id}
                    </li>
                  ))}
                </ul>
                <label className="inventory-check">
                  <input
                    type="checkbox"
                    checked={confirmMissing}
                    onChange={(e) => setConfirmMissing(e.target.checked)}
                  />
                  Listede görülmeyen kayıtları inceledim.
                </label>
              </div>
            )}
            <button
              className="primary"
              disabled={
                busy ||
                !preview.token ||
                !!preview.error ||
                preview.duplicate ||
                preview.counts.invalid > 0 ||
                !preview.rows.length ||
                (preview.missing.length > 0 && !confirmMissing)
              }
              onClick={commit}
            >
              Envanteri güncelle
            </button>
          </>
        )}
      </section>
      {data?.imports.length > 0 && (
        <section>
          <h3>Yükleme geçmişi</h3>
          <ul>
            {data.imports.slice(0, 12).map((batch) => (
              <li key={batch.id}>
                {date(batch.observedOn)} · {inventoryKinds[batch.kind]} ·{' '}
                {batch.count} kayıt ·{' '}
                {batch.complete ? 'Tam liste' : 'Kısmi liste'} · {batch.name}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
