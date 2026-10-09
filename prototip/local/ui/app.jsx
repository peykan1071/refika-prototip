import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  FolderInput,
  ArrowRight,
  Plus,
  Download,
  CheckCircle2,
  Cloud,
  HardDrive,
  RefreshCw,
  AlertCircle,
  File,
  X,
  Sparkles,
} from 'lucide-react';
import './style.css';
import './demo-theme.css';
import { ClassicValidation } from './classic-validation.jsx';
import { PlanWorkspace } from './plan-workspace.jsx';
import { ReportWorkspace } from './report-workspace.jsx';
import { CoordinatorSettings } from './coordinator-contacts.jsx';
import { GoogleSyncPanel } from './google-sync.jsx';
import {
  DemoShell,
  DemoDashboard,
  HistoryWorkspace,
} from './demo-workspace.jsx';

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
      <div className="demo-welcome">
        <div className="demo-welcome-art">
          <img
            src="/welcome-agent-v11.png"
            alt="REFİKA. Yol arkadaşınız. Ortak platform, size özel çalışma alanı. 81 ilin koordinatörleri için."
          />
        </div>
      </div>
      <section className="panel setup-panel">
        <span className="eyebrow">İL KOORDİNATÖRÜ ÇALIŞMA ALANI</span>
        <h1>Hoş geldiniz.</h1>
        <p className="muted">
          Çalışma alanınızı oluşturmak için ilinizi ve koordinatör bilgilerinizi
          seçin.
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
function Activities({ state, run, busy, scope = 'all' }) {
  const [draft, setDraft] = useState(null),
    [query, setQuery] = useState(''),
    [tab, setTab] = useState('plan');
  const scopeKinds =
    scope === 'visits'
      ? ['Okul ziyareti']
      : scope === 'events'
        ? ['Eğitim', 'Webinar', 'Toplantı']
        : null;
  const newActivity = () => ({
    ...blankActivity(),
    kind: scopeKinds?.[0] || 'Eğitim',
    responsible: state.settings.operator,
  });
  const visible = state.activities
    .filter((a) => !scopeKinds || scopeKinds.includes(a.kind))
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
          <h1>
            {scope === 'visits'
              ? 'Okul Ziyaretleri'
              : scope === 'events'
                ? 'Eğitim ve Etkinlikler'
                : 'İl Koordinatörü Faaliyet Planı'}
          </h1>
          <p>
            {scope === 'all'
              ? 'Aylık planınızı izleyin, çalışmaların sonuçlarını faaliyet kayıtlarında tutun.'
              : 'Faaliyetin planı ve gerçekleşen sonucu aynı kayıtta.'}
          </p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setTab('records');
            setDraft(newActivity());
          }}
        >
          <Plus size={17} /> Yeni faaliyet
        </button>
      </div>
      {scope === 'all' && (
        <div className="plan-tabs" aria-label="Plan ve faaliyet görünümü">
          <button aria-pressed={tab === 'plan'} onClick={() => setTab('plan')}>
            Faaliyet planım
          </button>
          <button
            aria-pressed={tab === 'records'}
            onClick={() => setTab('records')}
          >
            Faaliyet kayıtlarım ({state.activities.length})
          </button>
        </div>
      )}
      {scope === 'all' && tab === 'plan' && (
        <PlanWorkspace
          state={state}
          run={run}
          busy={busy}
          api={api}
          fileData={fileData}
          onActivity={(plan, item, existing) => {
            setDraft(
              existing
                ? { ...existing }
                : {
                    ...newActivity(),
                    kind: 'Diğer',
                    startDate: '',
                    endDate: '',
                    title: item.title,
                    purpose: item.description,
                    expectedOutput: item.expectedOutput,
                    planId: plan.id,
                    planItemId: item.id,
                    planVersion: plan.version,
                    planSource: {
                      dateLabel: item.dateLabel,
                      implementationNote: item.implementationNote,
                    },
                  },
            );
            setTab('records');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
      {(scope !== 'all' || tab === 'records') && (
        <>
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
              {draft.planSource && (
                <div className="notice">
                  <b>
                    Kaynak plandaki çalışma günleri:{' '}
                    {draft.planSource.dateLabel}
                  </b>
                  <p>{draft.planSource.implementationNote}</p>
                  <p>
                    Bu kayıt için faaliyet türünü ve kesin tarihleri belirleyin.
                    Birden fazla çalışma içeren plan maddesinden ayrı faaliyet
                    kayıtları oluşturabilirsiniz.
                  </p>
                </div>
              )}
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
                      onChange={(e) =>
                        setDraft({ ...draft, kind: e.target.value })
                      }
                    >
                      {(scopeKinds || kinds).map((k) => (
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
                            {a.endDate !== a.startDate
                              ? formatDate(a.endDate)
                              : ''}
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
                          {a.status === 'completed'
                            ? a.actualParticipants
                            : '—'}
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
                  <button onClick={() => setDraft(newActivity())}>
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
      )}
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
      <section className="panel">
        <h2>Dönem faaliyet özeti</h2>
        <p>Tarihi, katılımı, sonucu ve kanıtı kaydedilen faaliyetler.</p>
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
        <GoogleSyncPanel
          key={state.settings.contacts?.sheetUrl || ''}
          api={api}
          run={run}
          busy={busy}
          contacts={state.settings.contacts}
        />
        <CoordinatorSettings
          key={JSON.stringify(state.settings.contacts || {})}
          state={state}
          api={api}
          run={run}
          busy={busy}
        />
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
    [viewOptions, setViewOptions] = useState({}),
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
  function go(next, options = {}) {
    setView(next);
    setViewOptions(options);
    setError('');
    setNotice('');
    window.scrollTo({ top: 0 });
    void refresh().catch((e) => setError(e.message));
  }
  const feedback = (error || notice || busy) && (
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
          <RefreshCw size={16} />
          İşlem sürüyor…
        </div>
      )}
    </div>
  );
  if (!state)
    return (
      <main className="loading">
        <h1>REFİKA açılıyor…</h1>
        {feedback}
        {error && (
          <button onClick={() => window.location.reload()}>Yeniden dene</button>
        )}
      </main>
    );
  if (!state.settings)
    return (
      <>
        {feedback}
        <Setup state={state} run={run} busy={busy} />
      </>
    );
  return (
    <DemoShell state={state} view={view} go={go}>
      {feedback}
      <main className="workspace">
        {view === 'home' && <DemoDashboard state={state} go={go} />}
        {view === 'import' && (
          <ImportWorkspace state={state} run={run} busy={busy} />
        )}
        {['records', 'drafts', 'approval', 'results'].includes(view) && (
          <ClassicValidation
            key={view + (viewOptions.workspace || '')}
            state={state}
            run={run}
            busy={busy}
            screen={view}
            initialFilter={viewOptions.filter || 'all'}
            initialWorkspace={viewOptions.workspace || 'requests'}
            go={go}
            api={api}
            fileData={fileData}
          />
        )}
        {['activities', 'visits', 'events'].includes(view) && (
          <Activities
            key={view}
            state={state}
            run={run}
            busy={busy}
            scope={view === 'activities' ? 'all' : view}
          />
        )}
        {view === 'reports' && (
          <ReportWorkspace
            state={state}
            api={api}
            run={run}
            busy={busy}
            fileData={fileData}
            summary={<Reports run={run} busy={busy} />}
          />
        )}
        {view === 'settings' && (
          <SettingsPanel state={state} run={run} busy={busy} />
        )}
        {view === 'history' && (
          <>
            <div className="page-heading">
              <div>
                <h1>İşlem Geçmişi</h1>
                <p>Çalışma alanınızda kaydedilen son 100 işlem.</p>
              </div>
            </div>
            <HistoryWorkspace state={state} />
          </>
        )}
      </main>
    </DemoShell>
  );
}
createRoot(document.getElementById('root')).render(<App />);
