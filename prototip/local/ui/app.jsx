import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  House,
  FolderInput,
  ClipboardCheck,
  CalendarDays,
  FileText,
  Settings,
  ArrowRight,
  Plus,
  Download,
  CheckCircle2,
  Cloud,
  HardDrive,
  RefreshCw,
  AlertCircle,
  File,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';
import './style.css';

const statusLabels = {
  planned: 'Planlandı',
  completed: 'Sonuç kaydedildi',
  review: 'İncelenecek',
  ready: 'İncelendi',
};
const importFields = {
  records: [
    ['province', 'İl'],
    ['district', 'İlçe'],
    ['accountId', 'Öğretmen kimliği'],
    ['name', 'Öğretmen adı'],
    ['schoolId', 'Okul kimliği'],
    ['school', 'Okul adı'],
    ['email', 'E-posta'],
    ['profileUrl', 'Profil bağlantısı'],
    ['sourceStatus', 'Kaynak durumu'],
  ],
  plan: [
    ['planCode', 'Faaliyet kodu'],
    ['title', 'Faaliyet adı'],
    ['purpose', 'Amaç'],
    ['kind', 'Tür'],
    ['startDate', 'Başlangıç'],
    ['endDate', 'Bitiş'],
    ['audience', 'Hedef kitle'],
    ['responsible', 'Sorumlu'],
    ['expectedOutput', 'Beklenen çıktı'],
    ['plannedParticipants', 'Planlanan katılım'],
  ],
};
const kinds = [
  'Eğitim',
  'Webinar',
  'Toplantı',
  'Okul ziyareti',
  'Mentörlük',
  'Proje desteği',
  'Diğer',
];
const today = () => new Date().toLocaleDateString('en-CA');
const formatDate = (value) =>
  value ? new Date(value + 'T12:00:00').toLocaleDateString('tr-TR') : '—';
async function api(path, body) {
  const response = await fetch(
    '/api' + path,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'İşlem tamamlanamadı.');
  return result;
}
async function fileData(file, max = 5) {
  if (!file) throw new Error('Dosya seçin.');
  if (file.size > max * 1024 * 1024)
    throw new Error(`Dosya en fazla ${max} MB olabilir.`);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({ name: file.name, data: reader.result.split(',')[1] });
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsDataURL(file);
  });
}
async function postDownload(path, body, name) {
  const response = await fetch('/api' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error((await response.json()).error);
  const url = URL.createObjectURL(await response.blob()),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Badge({ status, children }) {
  return (
    <span className={'badge ' + (status || '')}>
      {children || statusLabels[status] || status}
    </span>
  );
}
function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <FolderInput size={32} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
function Field({ label, children, wide = false }) {
  return (
    <label className={'field' + (wide ? ' wide' : '')}>
      <span>{label}</span>
      {children}
    </label>
  );
}
function Notice({ children }) {
  return (
    <p className="notice">
      <AlertCircle size={18} />
      <span>{children}</span>
    </p>
  );
}

function Setup({ state, run, busy }) {
  const [province, setProvince] = useState(''),
    [operator, setOperator] = useState(''),
    [year, setYear] = useState('2026–2027');
  return (
    <main className="onboarding">
      <div className="welcome-copy">
        <span className="eyebrow">REFİKA · YOL ARKADAŞINIZ</span>
        <h1>
          İlinizin çalışma alanını
          <br />
          birlikte oluşturalım.
        </h1>
        <p>
          ESEP kayıtları, faaliyet planı ve gerçekleşen işler aynı yerde.
          Kaydettiğiniz bilgiler bu bilgisayarda korunur.
        </p>
        <div className="welcome-steps">
          <span>
            <FolderInput /> Verilerinizi aktarın
          </span>
          <span>
            <CalendarDays /> Çalışmalarınızı planlayın
          </span>
          <span>
            <FileText /> Sonuçları raporlayın
          </span>
        </div>
      </div>
      <section className="panel setup-panel">
        <Badge>İlk kurulum</Badge>
        <h2>İl çalışma alanı</h2>
        <p className="muted">
          Bu bilgisayarda yeni, boş bir çalışma alanı açılır.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => api('/setup', { province, operator, year }),
              'Çalışma alanınız hazır.',
            );
          }}
        >
          <Field label="İl">
            <select
              required
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            >
              <option value="">İlinizi seçin</option>
              {state.provinces.map((name, i) => (
                <option key={name} value={String(i + 1).padStart(2, '0')}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Koordinatör adı">
            <input
              required
              maxLength={150}
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              autoComplete="name"
            />
          </Field>
          <Field label="Eğitim yılı">
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              {['2025–2026', '2026–2027', '2027–2028'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Notice>
            İl seçimi yerel çalışma alanını belirler. Merkez yetkisi, daha sonra
            bu ile atanmış ayrı bağlantıyla doğrulanır.
          </Notice>
          <button className="primary" disabled={busy}>
            Çalışma alanını oluştur <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
function Dashboard({ state, go }) {
  const completed = state.activities.filter((a) => a.status === 'completed'),
    planned = state.activities
      .filter((a) => a.status === 'planned')
      .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    review = state.records.filter((r) => r.status === 'review');
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">İL KOORDİNATÖRÜ ÇALIŞMA ALANI</span>
          <h1>Bugün nereden başlayalım?</h1>
          <p>Planınız, bekleyen işleriniz ve kaydettiğiniz sonuçlar.</p>
        </div>
        <button className="primary" onClick={() => go('import')}>
          <Plus size={18} /> Veri veya plan getir
        </button>
      </div>
      <div className="metrics">
        {[
          [review.length, 'İncelenecek kayıt', 'records'],
          [planned.length, 'Planlanan faaliyet', 'activities'],
          [completed.length, 'Tamamlanan faaliyet', 'reports'],
          [
            completed.reduce((n, a) => n + a.actualParticipants, 0),
            'Toplam katılım',
            'reports',
          ],
        ].map(([n, label, view]) => (
          <button className="metric" key={label} onClick={() => go(view)}>
            <span>{label}</span>
            <strong>{n}</strong>
            <ChevronRight size={17} />
          </button>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-head">
            <h2>Yaklaşan çalışmalar</h2>
            <button className="text-button" onClick={() => go('activities')}>
              Planı aç <ArrowRight size={16} />
            </button>
          </div>
          {planned.length ? (
            <div className="activity-list">
              {planned.slice(0, 5).map((a) => (
                <article key={a.id}>
                  <div className="date-box">{formatDate(a.startDate)}</div>
                  <div>
                    <b>{a.title}</b>
                    <p>
                      {a.kind} · {a.audience || 'Hedef kitle eklenmedi'}
                    </p>
                  </div>
                  <Badge status="planned" />
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="Planınız burada görünecek"
              action={
                <button onClick={() => go('activities')}>
                  İlk faaliyeti ekle
                </button>
              }
            >
              Faaliyet planınızı aktarabilir veya tek tek çalışma
              ekleyebilirsiniz.
            </Empty>
          )}
        </section>
        <section className="panel">
          <h2>Bağlantılarınız</h2>
          <div className="connection">
            <HardDrive />
            <div>
              <b>Bu bilgisayarda kayıt</b>
              <p>Faaliyetler ve kanıt dosyaları kalıcı olarak saklanır.</p>
            </div>
            <Badge status="ready">Etkin</Badge>
          </div>
          <div className="connection">
            <Cloud />
            <div>
              <b>Merkez bağlantısı</b>
              <p>
                {state.center.configured
                  ? state.shareSummary
                    ? 'Özet paylaşımı açık'
                    : 'Özet paylaşımı kapalı'
                  : 'Merkez hizmeti henüz bağlanmadı.'}
              </p>
            </div>
          </div>
          <div className="connection">
            <Sparkles />
            <div>
              <b>Yapay zekâ</b>
              <p>
                {state.ai.configured
                  ? state.ai.label
                  : 'Model bağlantısı henüz kurulmadı. Şablonla çalışma hazır.'}
              </p>
            </div>
          </div>
          <button onClick={() => go('settings')}>
            Bağlantılar ve yedekleme
          </button>
        </section>
      </div>
      <section className="panel">
        <h2>Son işlemler</h2>
        {state.history.length ? (
          <ul className="history">
            {state.history.slice(0, 6).map((h) => (
              <li key={h.id}>
                <CheckCircle2 size={17} />
                <span>{h.message}</span>
                <time>{new Date(h.at).toLocaleString('tr-TR')}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p>Henüz işlem yapılmadı.</p>
        )}
      </section>
      <p className="footnote">
        Toplam katılım, tamamlanan faaliyetlerde bildirilen katılımların
        toplamıdır; benzersiz kişi sayısı değildir.
      </p>
    </>
  );
}
function ImportWorkspace({ state, run, busy }) {
  const [kind, setKind] = useState('records'),
    [file, setFile] = useState(null),
    [preview, setPreview] = useState(null),
    [mapping, setMapping] = useState(null),
    [sheet, setSheet] = useState(''),
    [skip, setSkip] = useState(false),
    [document, setDocument] = useState(''),
    [consent, setConsent] = useState(false);
  function reset() {
    setPreview(null);
    setMapping(null);
    setDocument('');
    setSheet('');
    setSkip(false);
  }
  async function inspect(nextMapping = mapping, nextSheet = sheet) {
    if (!file) throw new Error('Önce dosya seçin.');
    const result = await api('/import/preview', {
      ...file,
      kind,
      mapping: nextMapping,
      sheet: nextSheet,
    });
    if (result.document !== undefined) {
      setDocument(result.document);
      setPreview(null);
    } else {
      setPreview(result);
      setMapping(result.mapping);
      setSheet(result.sheet || '');
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">VERİ ALIMI</span>
          <h1>Dosyanızdan çalışma alanına</h1>
          <p>
            Alanları eşleştirin, farkları inceleyin ve uygun kayıtları içeri
            alın.
          </p>
        </div>
      </div>
      <section className="panel">
        <div className="tabs">
          <button
            className={kind === 'records' ? 'selected' : ''}
            onClick={() => {
              setKind('records');
              reset();
            }}
          >
            ESEP / NSO listesi
          </button>
          <button
            className={kind === 'plan' ? 'selected' : ''}
            onClick={() => {
              setKind('plan');
              reset();
            }}
          >
            Faaliyet planı
          </button>
        </div>
        <div className="import-intro">
          <div>
            <h2>
              {kind === 'records'
                ? 'Öğretmen ve okul üyelikleri'
                : 'Planınızı takvime dönüştürün'}
            </h2>
            <p>
              {kind === 'records'
                ? 'Elinizdeki Excel veya CSV listesini seçin. Kaynak sütunlarını sonraki adımda eşleştirebilirsiniz.'
                : 'Excel/CSV planınızı doğrudan alın. Word belgesi için metni inceleyip AI bağlantısı kurulduğunda alanlara ayırabilirsiniz.'}
            </p>
          </div>
          <a className="button" href={'/api/template?kind=' + kind}>
            <Download size={17} /> Boş şablon indir
          </a>
        </div>
        <Field label="Aktarılacak dosya">
          <input
            type="file"
            accept={
              kind === 'records' ? '.xlsx,.csv,.tsv' : '.xlsx,.csv,.tsv,.docx'
            }
            onChange={(e) => {
              const selected = e.target.files[0];
              reset();
              setFile(null);
              if (selected) run(async () => setFile(await fileData(selected)));
            }}
          />
        </Field>
        <div className="actions">
          <span className="muted">
            {file?.name || 'Excel, CSV veya uygun Word dosyası · en fazla 5 MB'}
          </span>
          <button
            className="primary"
            disabled={busy || !file}
            onClick={() => run(() => inspect(null))}
          >
            Dosyayı incele <ArrowRight size={17} />
          </button>
        </div>
        <Notice>
          Bu işlem ESEP’e bağlanmaz ve oradaki kayıtları değiştirmez. İndirilen
          şablon, REFİKA içe aktarım biçimidir.
        </Notice>
      </section>
      {document && (
        <section className="panel">
          <h2>Word belgesinden okunan metin</h2>
          <textarea
            aria-label="Plan metni"
            rows={12}
            value={document}
            onChange={(e) => setDocument(e.target.value)}
          />
          <p className="muted">
            {state.ai.configured
              ? `Hedef: ${state.ai.host} · ${state.ai.label}`
              : 'AI hizmeti henüz bağlı değil. Şimdilik metni inceleyip faaliyetleri Plan ve faaliyetler ekranına girebilir veya Excel şablonuna aktarabilirsiniz.'}
          </p>
          <label className="check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />{' '}
            Yukarıdaki metnin belirtilen AI hizmetine gönderilmesini
            onaylıyorum.
          </label>
          <button
            className="primary"
            disabled={busy || !state.ai.configured || !consent}
            onClick={() =>
              run(async () => {
                const result = await api('/ai/plan', {
                  document,
                  confirmed: consent,
                });
                setPreview(result);
                setMapping(result.mapping);
              })
            }
          >
            <Sparkles size={17} /> Faaliyet önerilerini çıkar
          </button>
        </section>
      )}
      {preview && (
        <section className="panel">
          <div className="section-head">
            <h2>Aktarım önizlemesi</h2>
            <Badge>Henüz kaydedilmedi</Badge>
          </div>
          {!preview.aiSession && (
            <>
              <div className="mapping-grid">
                {preview.sheets?.length > 1 && (
                  <Field label="Çalışma sayfası">
                    <select
                      value={sheet}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSheet(value);
                        run(() => inspect(null, value));
                      }}
                    >
                      {preview.sheets.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                )}
                {importFields[kind].map(([key, label]) => (
                  <Field key={key} label={label}>
                    <select
                      value={mapping?.[key] ?? -1}
                      onChange={(e) => {
                        setMapping({
                          ...mapping,
                          [key]: Number(e.target.value),
                        });
                        setPreview({ ...preview, dirty: true });
                      }}
                    >
                      <option value={-1}>Eşleşmedi / boş bırak</option>
                      {preview.headers.map((h, i) => (
                        <option value={i} key={i}>
                          {i + 1}. {h || 'Başlıksız sütun'}
                        </option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
              <button disabled={busy} onClick={() => run(() => inspect())}>
                <RefreshCw size={16} /> Eşleştirmeyi uygula
              </button>
            </>
          )}
          <div className="import-counts">
            {[
              ['new', 'yeni'],
              ['update', 'güncelleme'],
              ['unchanged', 'değişmeyen'],
              ['invalid', 'sorunlu'],
              ['locked', 'korunan'],
            ].map(([key, label]) => (
              <span key={key}>
                <b>{preview.counts[key]}</b> {label}
              </span>
            ))}
          </div>
          {preview.dirty && (
            <Notice>
              Sütun eşleştirmesi değişti. Önizlemeyi yeniden hesaplamak için
              Eşleştirmeyi uygula düğmesini kullanın.
            </Notice>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Satır</th>
                  <th>Kayıt</th>
                  <th>İşlem</th>
                  <th>Kontrol / kaynak</th>
                </tr>
              </thead>
              <tbody>
                {preview.items.slice(0, 150).map((item, i) => (
                  <tr key={item.line}>
                    <td>{item.line}</td>
                    <td>
                      {item.values?.name ||
                        item.values?.title ||
                        item.label ||
                        '—'}
                      <small>
                        {item.values?.school || item.values?.startDate}
                      </small>
                    </td>
                    <td>
                      <Badge status={item.action}>
                        {
                          {
                            new: 'Yeni',
                            update: 'Güncelle',
                            unchanged: 'Değişmedi',
                            invalid: 'İnceleyin',
                            locked: 'Korunuyor',
                          }[item.action]
                        }
                      </Badge>
                    </td>
                    <td>
                      {item.error ||
                        preview.quotes?.[i] ||
                        'Alan kontrolleri geçti'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.items.length > 150 && (
            <p>
              İlk 150 satır gösteriliyor; sayaçlar ve aktarım{' '}
              {preview.items.length} satırın tamamını kapsar.
            </p>
          )}
          {!!(preview.counts.invalid + preview.counts.locked) && (
            <label className="check">
              <input
                type="checkbox"
                checked={skip}
                onChange={(e) => setSkip(e.target.checked)}
              />{' '}
              Sorunlu ve korunmuş satırları ayır; yalnız geçerli yeni/güncel
              kayıtları al.
            </label>
          )}
          <div className="actions">
            <p className="muted">
              Aktarılan ESEP kayıtları inceleme bekler. Planlar gerçekleşmiş
              sayılmaz.
            </p>
            <button
              className="primary"
              disabled={
                busy ||
                preview.dirty ||
                !(preview.counts.new + preview.counts.update) ||
                (preview.counts.invalid + preview.counts.locked > 0 && !skip)
              }
              onClick={() =>
                run(async () => {
                  await api('/import/commit', {
                    ...file,
                    kind,
                    mapping,
                    sheet,
                    token: preview.token,
                    skipInvalid: skip,
                    aiSession: preview.aiSession,
                  });
                  setPreview(null);
                }, 'Geçerli kayıtlar çalışma alanına alındı.')
              }
            >
              <CheckCircle2 size={17} /> Kontrol ettim, içeri al
            </button>
          </div>
        </section>
      )}
    </>
  );
}
function Records({ state, run, busy }) {
  const [filter, setFilter] = useState('all'),
    [query, setQuery] = useState(''),
    [selected, setSelected] = useState(null),
    [note, setNote] = useState('');
  const rows = state.records.filter(
      (r) =>
        (filter === 'all' || r.status === filter) &&
        `${r.name} ${r.school} ${r.accountId}`
          .toLocaleLowerCase('tr')
          .includes(query.toLocaleLowerCase('tr')),
    ),
    record = state.records.find((r) => r.id === selected);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">VERİLER VE TALEPLER</span>
          <h1>Kayıtları birlikte kontrol edin</h1>
          <p>İnceleme ve sonuç bilgisi aynı kayıtta saklanır.</p>
        </div>
        <a className="button" href="/api/export/records">
          <Download size={17} /> İncelenenleri Excel’e al
        </a>
      </div>
      <section className="panel">
        <div className="filter-row">
          <Field label="Kayıtlarda ara">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Öğretmen, okul veya kimlik"
            />
          </Field>
          <Field label="Durum">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Tümü</option>
              <option value="review">İncelenecek</option>
              <option value="ready">İncelendi</option>
              <option value="completed">Sonuç kaydedildi</option>
            </select>
          </Field>
          <Badge>{rows.length} kayıt</Badge>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Öğretmen</th>
                  <th>Okul</th>
                  <th>Kaynak durumu</th>
                  <th>REFİKA durumu</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 500).map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.name}
                      <small>Kimlik: {r.accountId}</small>
                    </td>
                    <td>
                      {r.school}
                      <small>
                        {r.district} · {r.schoolId}
                      </small>
                    </td>
                    <td>{r.sourceStatus || 'Belirtilmedi'}</td>
                    <td>
                      <Badge status={r.status} />
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setSelected(r.id);
                          setNote(r.note || '');
                        }}
                      >
                        İncele
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Bu görünümde kayıt yok">
            ESEP listenizi Veri aktar bölümünden getirebilirsiniz.
          </Empty>
        )}
        {rows.length > 500 && (
          <p>
            İlk 500 kayıt gösteriliyor. Aramayla daraltın; Excel çıktısı tüm
            incelenen kayıtları içerir.
          </p>
        )}
      </section>
      {record && (
        <section className="panel">
          <div className="section-head">
            <h2>{record.name}</h2>
            <button
              aria-label="İncelemeyi kapat"
              onClick={() => setSelected(null)}
            >
              <X size={18} />
            </button>
          </div>
          <p>
            {record.school} · {record.accountId}
          </p>
          <p className="muted">
            Kaynak: {record.source?.name} · Satır {record.source?.line}
          </p>
          {record.profileUrl && (
            <a href={record.profileUrl} target="_blank" rel="noreferrer">
              Resmî ESEP profilini aç
            </a>
          )}
          <Field label="İnceleme veya sonuç notu" wide>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Neyi kontrol ettiniz? Resmî işlem sonuçlandıysa dayanağı nedir?"
            />
          </Field>
          <Notice>
            Bu düğmeler REFİKA’daki takibi günceller. ESEP’te onay, silme veya
            gönderim yapmaz.
          </Notice>
          <div className="actions">
            {[
              ['review', 'İncelemeye al'],
              ['ready', 'Kontrol edildi'],
              ['completed', 'Resmî sonucu kaydet'],
            ].map(([status, label]) => (
              <button
                key={status}
                className={status === 'ready' ? 'primary' : ''}
                disabled={
                  busy ||
                  !note.trim() ||
                  (status === 'completed' && record.status !== 'ready')
                }
                onClick={() =>
                  run(
                    () =>
                      api('/records/' + record.id, {
                        status,
                        note,
                        version: record.version,
                      }),
                    'İnceleme kaydedildi.',
                  )
                }
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
const blankActivity = () => ({
  title: '',
  purpose: '',
  kind: 'Eğitim',
  startDate: today(),
  endDate: today(),
  audience: '',
  responsible: '',
  expectedOutput: '',
  plannedParticipants: '',
  actualParticipants: '',
  actualDate: '',
  status: 'planned',
  result: '',
  evidence: '',
  planCode: '',
});
function Activities({ state, run, busy }) {
  const [draft, setDraft] = useState(null),
    [query, setQuery] = useState('');
  const visible = state.activities
    .filter((a) =>
      a.title.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')),
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const field = (key, label, type = 'text', required = false) => (
    <Field key={key} label={label}>
      <input
        type={type}
        required={required}
        value={draft[key] ?? ''}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        min={type === 'number' ? 0 : undefined}
      />
    </Field>
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PLAN VE FAALİYETLER</span>
          <h1>Planlayın, gerçekleştirin, kaydedin.</h1>
          <p>Faaliyetin planı ve gerçekleşen sonucu aynı kayıtta.</p>
        </div>
        <button
          className="primary"
          onClick={() =>
            setDraft({
              ...blankActivity(),
              responsible: state.settings.operator,
            })
          }
        >
          <Plus size={17} /> Yeni faaliyet
        </button>
      </div>
      {draft && (
        <section className="panel">
          <div className="section-head">
            <h2>{draft.id ? 'Faaliyet kaydı' : 'Yeni faaliyet'}</h2>
            <button
              aria-label="Faaliyet formunu kapat"
              onClick={() => setDraft(null)}
            >
              <X size={18} />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(
                async () => setDraft(await api('/activities', draft)),
                'Faaliyet kalıcı olarak kaydedildi.',
              );
            }}
          >
            <div className="form-grid">
              {field('title', 'Faaliyet adı', 'text', true)}
              <Field label="Tür">
                <select
                  value={draft.kind}
                  onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
                >
                  {kinds.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </Field>
              {field('startDate', 'Planlanan başlangıç', 'date', true)}
              {field('endDate', 'Planlanan bitiş', 'date', true)}
              {field('audience', 'Hedef kitle')}
              {field('responsible', 'Sorumlu')}
              {field('planCode', 'Faaliyet kodu (isteğe bağlı)')}
              {field('plannedParticipants', 'Planlanan katılım', 'number')}
              <Field label="Amaç" wide>
                <textarea
                  required
                  rows={2}
                  value={draft.purpose}
                  onChange={(e) =>
                    setDraft({ ...draft, purpose: e.target.value })
                  }
                />
              </Field>
              <Field label="Beklenen çıktı" wide>
                <textarea
                  rows={2}
                  value={draft.expectedOutput}
                  onChange={(e) =>
                    setDraft({ ...draft, expectedOutput: e.target.value })
                  }
                />
              </Field>
            </div>
            <h3>Gerçekleşme ve sonuç</h3>
            <div className="form-grid">
              <Field label="Durum">
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value })
                  }
                >
                  <option value="planned">Planlandı / devam ediyor</option>
                  <option value="completed">Tamamlandı</option>
                </select>
              </Field>
              {field(
                'actualDate',
                'Gerçekleşme tarihi',
                'date',
                draft.status === 'completed',
              )}
              {field(
                'actualParticipants',
                'Gerçekleşen katılım',
                'number',
                draft.status === 'completed',
              )}
              <Field label="Kanıt bağlantısı / belge notu">
                <input
                  required={draft.status === 'completed'}
                  value={draft.evidence}
                  onChange={(e) =>
                    setDraft({ ...draft, evidence: e.target.value })
                  }
                />
              </Field>
              <Field label="Gerçekleşen sonuç" wide>
                <textarea
                  required={draft.status === 'completed'}
                  rows={3}
                  value={draft.result}
                  onChange={(e) =>
                    setDraft({ ...draft, result: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="actions">
              <p className="muted">
                Tamamlanan faaliyet, gerçekleşme tarihiyle dönem raporuna
                alınır.
              </p>
              <button className="primary" disabled={busy}>
                <CheckCircle2 size={17} /> Faaliyeti kaydet
              </button>
            </div>
          </form>
          {draft.id && (
            <div className="attachments">
              <h3>Kanıt dosyaları</h3>
              <p className="muted">
                Dosyanın kendisi bu bilgisayarda saklanır ve şifreli yedeğe
                dahil edilir.
              </p>
              <label className="field">
                <span>Kanıt dosyası ekle · en fazla 10 MB</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                  disabled={busy}
                  onChange={(e) => {
                    const selected = e.target.files[0];
                    if (selected)
                      run(
                        async () =>
                          api('/files', {
                            ...(await fileData(selected, 10)),
                            activityId: draft.id,
                          }),
                        'Kanıt dosyası kaydedildi.',
                      );
                    e.target.value = '';
                  }}
                />
              </label>
              <ul className="file-list">
                {state.files
                  .filter((f) => f.activityId === draft.id)
                  .map((f) => (
                    <li key={f.id}>
                      <File size={17} />
                      <a href={'/api/files/' + f.id}>{f.name}</a>
                      <small>{Math.ceil(f.size / 1024)} KB</small>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>
      )}
      <section className="panel">
        <div className="section-head">
          <h2>Faaliyet takvimi</h2>
          <input
            aria-label="Faaliyette ara"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Faaliyet ara…"
          />
        </div>
        {visible.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Planlanan tarih</th>
                  <th>Faaliyet</th>
                  <th>Durum</th>
                  <th>Katılım</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {formatDate(a.startDate)}
                      <small>
                        {a.endDate !== a.startDate ? formatDate(a.endDate) : ''}
                      </small>
                    </td>
                    <td>
                      {a.title}
                      <small>
                        {a.kind} · {a.audience}
                      </small>
                    </td>
                    <td>
                      <Badge status={a.status} />
                    </td>
                    <td>
                      {a.status === 'completed' ? a.actualParticipants : '—'}
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setDraft({ ...a });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        Düzenle / sonuç gir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="İlk çalışmanızı planlayın"
            action={
              <button onClick={() => setDraft(blankActivity())}>
                Faaliyet ekle
              </button>
            }
          >
            Excel planını içeri alabilir veya bu ekrandan bir çalışma
            oluşturabilirsiniz.
          </Empty>
        )}
      </section>
    </>
  );
}
function Reports({ run, busy }) {
  const [from, setFrom] = useState(today().slice(0, 4) + '-01-01'),
    [to, setTo] = useState(today()),
    [report, setReport] = useState(null);
  const query = report ? `from=${report.from}&to=${report.to}` : '';
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">BELGELER VE RAPORLAR</span>
          <h1>Gerçekleşen işlerden rapora</h1>
          <p>Tarihi, katılımı, sonucu ve kanıtı kaydedilen faaliyetler.</p>
        </div>
      </div>
      <section className="panel">
        <form
          className="filter-row"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () =>
              setReport(await api(`/report?from=${from}&to=${to}`)),
            );
          }}
        >
          <Field label="Başlangıç">
            <input
              type="date"
              required
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setReport(null);
              }}
            />
          </Field>
          <Field label="Bitiş">
            <input
              type="date"
              required
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setReport(null);
              }}
            />
          </Field>
          <button className="primary" disabled={busy}>
            Raporu hazırla <ArrowRight size={17} />
          </button>
        </form>
      </section>
      {report && (
        <section className="panel report">
          <div className="section-head">
            <h2>Dönem faaliyet özeti</h2>
            <Badge>Koordinatör incelemesi</Badge>
          </div>
          <div className="import-counts">
            <span>
              <b>{report.completed.length}</b> tamamlanan
            </span>
            <span>
              <b>{report.planned.length}</b> planlanan / açık
            </span>
            <span>
              <b>{report.total}</b> toplam katılım
            </span>
          </div>
          <pre>{report.text}</pre>
          <div className="actions">
            <a
              className="button primary"
              href={'/api/report?' + query + '&format=xlsx'}
            >
              <Download size={17} /> Excel indir
            </a>
            <a className="button" href={'/api/report?' + query + '&format=txt'}>
              <Download size={17} /> Metin indir
            </a>
            <button onClick={() => window.print()}>Yazdır / PDF kaydet</button>
          </div>
          <Notice>
            Bu çıktı REFİKA faaliyet özetidir. Güncel resmî rapor şablonuna
            uyarlama ve resmî sisteme gönderim ayrıca yapılır.
          </Notice>
        </section>
      )}
    </>
  );
}
function SettingsPanel({ state, run, busy }) {
  const [password, setPassword] = useState(''),
    [restorePassword, setRestorePassword] = useState(''),
    [backup, setBackup] = useState(null),
    [confirm, setConfirm] = useState(''),
    [replace, setReplace] = useState(false);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ÇALIŞMA ALANI AYARLARI</span>
          <h1>Kayıtlarınız ve bağlantılarınız</h1>
          <p>
            {state.settings.operator} ·{' '}
            {state.provinces[Number(state.settings.province) - 1]} ·{' '}
            {state.settings.year}
          </p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel">
          <h2>
            <Cloud size={22} /> Merkeze özet paylaşımı
          </h2>
          <Badge status={state.center.configured ? 'ready' : ''}>
            {state.center.configured ? 'Bağlantı tanımlı' : 'Henüz bağlanmadı'}
          </Badge>
          <p>
            Paylaşılanlar: il, eğitim yılı, faaliyet ve kayıt durum sayıları,
            toplam katılım. Öğretmen adları, iletişim bilgileri ve dosyalar
            aktarılmaz.
          </p>
          <label className="check">
            <input
              type="checkbox"
              checked={state.shareSummary}
              disabled={busy}
              onChange={(e) =>
                run(
                  () => api('/sharing', { enabled: e.target.checked }),
                  'Paylaşım tercihi kaydedildi.',
                )
              }
            />{' '}
            Özetlerimi merkezle paylaş
          </label>
          <p className="muted">
            {state.sync?.at
              ? 'Son aktarım: ' +
                new Date(state.sync.at).toLocaleString('tr-TR')
              : 'Henüz başarılı aktarım yok.'}
          </p>
          {state.sync?.error && <Notice>{state.sync.error}</Notice>}
          <button
            disabled={busy || !state.center.configured || !state.shareSummary}
            onClick={() =>
              run(() => api('/sync', {}), 'Özet merkeze aktarıldı.')
            }
          >
            <RefreshCw size={16} /> Şimdi eşitle
          </button>
          <p className="footnote">
            Uygulama açıkken bağlantı ve değişiklikler her dakika kontrol
            edilir.
          </p>
        </section>
        <section className="panel">
          <h2>
            <Sparkles size={22} /> Yapay zekâ bağlantısı
          </h2>
          <Badge>
            {state.ai.configured ? 'Bağlantı tanımlı' : 'Henüz bağlanmadı'}
          </Badge>
          <p>
            {state.ai.configured
              ? `${state.ai.label} · ${state.ai.host}`
              : 'AI modeli bağlandığında Word planındaki faaliyetleri alanlara ayırabilirsiniz. Mevcut şablon ve kayıt işlemleri AI gerektirmez.'}
          </p>
          <Notice>
            {state.ai.configured
              ? state.ai.local
                ? 'AI hizmeti bu bilgisayarın yerel adresinde. Modelin kurulumu ve çalışır olması gerekir.'
                : 'AI hizmeti dış adreste. Plan metni yalnız açık onayınızla bu hizmete gönderilir.'
              : 'Bu sürümde AI çalışıyor gibi bir sonuç üretilmez. Model hizmeti ayrıca kurulmalıdır.'}
          </Notice>
        </section>
        <section className="panel">
          <h2>
            <HardDrive size={22} /> Şifreli yedek al
          </h2>
          <p>
            Kayıtlar ve kanıt dosyaları birlikte yedeklenir. Parolanızı güvenli
            bir yerde saklayın.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await postDownload(
                  '/backup',
                  { password },
                  'REFIKA-yedek.refika',
                );
                setPassword('');
              }, 'Şifreli yedek indirildi.');
            }}
          >
            <Field label="Yedek parolası · en az 12 karakter">
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={200}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <button className="primary" disabled={busy}>
              <Download size={17} /> Yedeği indir
            </button>
          </form>
          <p className="footnote">
            Yerel veri tabanı bu pilotta şifreli değildir. İndirilen yedek
            parola ile şifrelenir.
          </p>
        </section>
        <section className="panel">
          <h2>Yedekten geri yükle</h2>
          <p>
            Aynı ile ait bir yedeği seçin. Geri yükleme mevcut kayıtların ve
            dosyaların yerini alır.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await api('/restore', {
                  ...backup,
                  password: restorePassword,
                  province: confirm,
                  replace,
                });
                setRestorePassword('');
                setBackup(null);
                setConfirm('');
                setReplace(false);
              }, 'Yedek geri yüklendi.');
            }}
          >
            <Field label="REFİKA yedek dosyası">
              <input
                type="file"
                accept=".refika"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file)
                    run(async () => setBackup(await fileData(file, 55)));
                }}
              />
            </Field>
            <Field label="Yedek parolası">
              <input
                type="password"
                autoComplete="off"
                minLength={12}
                required
                value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
              />
            </Field>
            <Field
              label={'İl kodunu yazarak doğrulayın: ' + state.settings.province}
            >
              <input
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
            <label className="check">
              <input
                type="checkbox"
                required
                checked={replace}
                onChange={(e) => setReplace(e.target.checked)}
              />{' '}
              Mevcut kayıtların yerine bu yedeği yükle.
            </label>
            <button
              disabled={
                busy ||
                !backup ||
                confirm !== state.settings.province ||
                !replace
              }
            >
              Yedeği geri yükle
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
function App() {
  const [state, setState] = useState(null),
    [view, setView] = useState('home'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function refresh() {
    const data = await api('/state');
    setState(data);
  }
  useEffect(() => {
    let active = true;
    api('/state')
      .then((data) => {
        if (active) setState(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function run(fn, message = '') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      await refresh();
      setNotice(message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function go(next) {
    setView(next);
    setError('');
    setNotice('');
    window.scrollTo({ top: 0 });
  }
  const nav = [
    ['home', 'Bugün', House],
    ['import', 'Veri aktar', FolderInput],
    ['records', 'Kayıt inceleme', ClipboardCheck],
    ['activities', 'Plan ve faaliyetler', CalendarDays],
    ['reports', 'Raporlar', FileText],
    ['settings', 'Ayarlar ve yedek', Settings],
  ];
  return (
    <>
      {state?.settings && (
        <aside className="sidebar">
          <div className="brand">
            <img src="/refika-logo-v9.png" alt="" />
            <div>
              <b>REFİKA</b>
              <small>Yol arkadaşınız.</small>
            </div>
          </div>
          <div className="province-label">
            <span>İL ÇALIŞMA ALANI</span>
            <strong>
              {state.provinces[Number(state.settings.province) - 1]}
            </strong>
            <small>{state.settings.year}</small>
          </div>
          <nav aria-label="Ana menü">
            {nav.map(([key, label, Icon]) => (
              <button
                key={key}
                className={view === key ? 'active' : ''}
                onClick={() => go(key)}
              >
                <Icon size={19} />
                {label}
                {view === key && <ChevronRight size={16} />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <HardDrive size={18} />
            <span>
              Yerel kayıt etkin<small>Çalışan pilot · 0.2.0</small>
            </span>
          </div>
        </aside>
      )}
      <div className={state?.settings ? 'main-shell' : ''}>
        {state?.settings && (
          <header className="topbar">
            <span>{nav.find((n) => n[0] === view)?.[1]}</span>
            <div>
              <span className="status-dot" /> Bu bilgisayarda kayıt{' '}
              <span className="operator">{state.settings.operator}</span>
            </div>
          </header>
        )}
        {(error || notice || busy) && (
          <div className="feedback" aria-live="polite">
            {error && (
              <div className="error" role="alert">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
            {notice && (
              <div className="success">
                <CheckCircle2 size={18} />
                {notice}
              </div>
            )}
            {busy && (
              <div className="working">
                <RefreshCw size={16} /> İşlem sürüyor…
              </div>
            )}
          </div>
        )}
        {!state ? (
          <main className="loading">
            <h1>REFİKA açılıyor…</h1>
            {error && (
              <button onClick={() => window.location.reload()}>
                Yeniden dene
              </button>
            )}
          </main>
        ) : !state.settings ? (
          <Setup state={state} run={run} busy={busy} />
        ) : (
          <main className="workspace">
            {view === 'home' && <Dashboard state={state} go={go} />}{' '}
            {view === 'import' && (
              <ImportWorkspace state={state} run={run} busy={busy} />
            )}{' '}
            {view === 'records' && (
              <Records state={state} run={run} busy={busy} />
            )}{' '}
            {view === 'activities' && (
              <Activities state={state} run={run} busy={busy} />
            )}{' '}
            {view === 'reports' && <Reports run={run} busy={busy} />}{' '}
            {view === 'settings' && (
              <SettingsPanel state={state} run={run} busy={busy} />
            )}
          </main>
        )}
      </div>
    </>
  );
}
createRoot(document.getElementById('root')).render(<App />);
