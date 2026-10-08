import React, { useEffect, useRef, useState } from 'react';
import {
  Archive,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Plus,
  Save,
  X,
} from 'lucide-react';
import { eventReportFields, eventReportProblems } from '../report-schema.mjs';
import './report-workspace.css';

const statuses = {
  imported: 'YEĞİTEK arşivi',
  draft: 'Taslak',
  ready: 'Aktarıma hazır',
  recorded: 'YEĞİTEK kayıt bilgisi eklendi',
};
const moduleUrl = 'https://yegitek.eba.gov.tr/etwinning-rapor/';
const today = () => new Date().toLocaleDateString('sv-SE');
function periodFor(year, quarter) {
  const from = `${year}-${String((quarter - 1) * 3 + 1).padStart(2, '0')}-01`;
  const to = new Date(Date.UTC(Number(year), quarter * 3, 0))
    .toISOString()
    .slice(0, 10);
  return { from, to, period: `${from} – ${to} (${quarter}. Dönem)` };
}
export function ReportWorkspace({ state, api, run, busy, fileData, summary }) {
  const [tab, setTab] = useState('archive'),
    [query, setQuery] = useState(''),
    [period, setPeriod] = useState(''),
    [report, setReport] = useState(null),
    [dirty, setDirty] = useState(false);
  const [year, setYear] = useState(today().slice(0, 4)),
    [quarter, setQuarter] = useState(
      Math.ceil((new Date().getMonth() + 1) / 3),
    ),
    [activityId, setActivityId] = useState('');
  const [reviewed, setReviewed] = useState(false),
    [proof, setProof] = useState({
      sourceUrl: '',
      recordedDate: today(),
      proof: '',
    }),
    [copied, setCopied] = useState('');
  const [oldVersion, setOldVersion] = useState(null);
  const reportPanel = useRef(null);
  const pageHeading = useRef(null);
  const selectedReport = report?.id || (report ? 'new' : '');
  useEffect(() => {
    (reportPanel.current || pageHeading.current)?.scrollIntoView({
      block: 'start',
      behavior: 'smooth',
    });
  }, [selectedReport, oldVersion?.version, tab]);
  const rows = [...(state.reports || [])].sort(
      (a, b) =>
        (b.to || '').localeCompare(a.to || '') ||
        b.updatedAt.localeCompare(a.updatedAt),
    ),
    periods = [...new Set(rows.map((r) => r.period))];
  const editable =
    report && ['draft', 'ready'].includes(report.status || 'draft');
  const update = (patch) => {
    setReport((r) => ({ ...r, ...patch }));
    setDirty(true);
    setReviewed(false);
    setCopied('');
  };
  const updateField = (label, newValue) =>
    update({
      fields: report.fields.map((f) =>
        f.label === label ? { ...f, value: newValue } : f,
      ),
    });
  const load = async (id) => {
    setReport(await api('/reports/' + id));
    setDirty(false);
    setReviewed(false);
    setOldVersion(null);
    setCopied('');
    setProof({ sourceUrl: '', recordedDate: today(), proof: '' });
  };
  const copy = async (value, label) => {
    await navigator.clipboard.writeText(value);
    setCopied(`${label} kopyalandı.`);
  };
  const shown = oldVersion || report;
  const problems = report && editable ? eventReportProblems(report) : [];
  return (
    <>
      <div className="page-heading" ref={pageHeading}>
        <div>
          <span className="eyebrow">BELGELER VE RAPORLAR</span>
          <h1>Raporlar ve Yazışmalar</h1>
          <p>
            Geçmiş raporlarınızı koruyun, yeni etkinlik raporlarını hazırlayın
            ve YEĞİTEK kayıtlarını izleyin.
          </p>
        </div>
      </div>
      <section className="report-hero">
        <div>
          <span>İŞLEMDEN KURUMSAL HAFIZAYA</span>
          <h2>Rapor arşivim</h2>
          <p>
            {state.settings.operator} · {rows.length} kayıt
          </p>
        </div>
        <Archive size={36} />
      </section>
      <nav
        className="plan-tabs report-tabs"
        aria-label="Rapor çalışma alanları"
      >
        <button
          aria-pressed={tab === 'archive'}
          onClick={() => setTab('archive')}
        >
          Rapor arşivi
        </button>
        <button aria-pressed={tab === 'new'} onClick={() => setTab('new')}>
          <Plus size={16} /> Yeni etkinlik raporu
        </button>
        <button
          aria-pressed={tab === 'summary'}
          onClick={() => setTab('summary')}
        >
          Dönem faaliyet özeti
        </button>
      </nav>
      {tab === 'summary' ? (
        summary
      ) : (
        <>
          {tab === 'new' && (
            <section className="panel">
              <h2>YEĞİTEK düzeninde etkinlik raporu</h2>
              <p>
                Bir rapor, bir gerçekleşmiş etkinliği anlatır. Tamamlanan bir
                faaliyet seçin veya boş bir form açın. Kaynakta bulunmayan
                katılımcı dağılımını ve eğitmen bilgisini siz tamamlayın.
              </p>
              <div className="form-grid">
                <label>
                  Yıl
                  <input
                    type="number"
                    min="2000"
                    max="2099"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </label>
                <label>
                  Dönem
                  <select
                    value={quarter}
                    onChange={(e) => setQuarter(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4].map((q) => (
                      <option key={q} value={q}>
                        {q}. Dönem
                      </option>
                    ))}
                  </select>
                </label>
                <label className="report-wide">
                  Gerçekleşen faaliyet
                  <select
                    value={activityId}
                    onChange={(e) => setActivityId(e.target.value)}
                  >
                    <option value="">Boş rapor formu</option>
                    {state.activities
                      .filter((a) => a.status === 'completed')
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.actualDate} · {a.title}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const draft = await api('/reports/generate', {
                      reportType: 'event',
                      ...periodFor(year, quarter),
                      activityId,
                    });
                    setReport(draft);
                    setDirty(true);
                    setReviewed(false);
                    setOldVersion(null);
                    setTab('archive');
                  })
                }
              >
                <FileText size={16} /> Rapor formunu hazırla
              </button>
            </section>
          )}
          {tab === 'archive' && (
            <section className="panel">
              <div className="section-head">
                <h2>Kayıtlı raporlar</h2>
                <div className="actions">
                  <input
                    aria-label="Rapor ara"
                    type="search"
                    value={query}
                    placeholder="Rapor adı veya dönem…"
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <select
                    aria-label="Rapor dönemi filtresi"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    <option value="">Bütün dönemler</option>
                    {periods.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              {rows.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Rapor</th>
                        <th>Dönem</th>
                        <th>Durum</th>
                        <th>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows
                        .filter(
                          (r) =>
                            (!period || r.period === period) &&
                            `${r.title} ${r.period}`
                              .toLocaleLowerCase('tr')
                              .includes(query.toLocaleLowerCase('tr')),
                        )
                        .map((r) => (
                          <tr key={r.id}>
                            <td>
                              {r.title}
                              <small>{r.coordinator}</small>
                            </td>
                            <td>{r.period}</td>
                            <td>{statuses[r.status]}</td>
                            <td>
                              <button onClick={() => run(() => load(r.id))}>
                                Raporu aç
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>
                  Henüz arşivlenmiş rapor yok. Yeni etkinlik raporu
                  hazırlayabilirsiniz.
                </p>
              )}
            </section>
          )}
          {shown && (
            <section className="panel report-editor" ref={reportPanel}>
              <div className="section-head">
                <div>
                  <h2>
                    {editable && !oldVersion
                      ? 'Etkinlik raporunu düzenle'
                      : shown.title}
                  </h2>
                  <p>
                    {statuses[shown.status] || 'Yeni taslak'} · {shown.period}
                    {oldVersion ? ` · Eski sürüm ${oldVersion.version}` : ''}
                  </p>
                </div>
                <button
                  aria-label="Raporu kapat"
                  onClick={() => {
                    setReport(null);
                    setOldVersion(null);
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              {editable && !oldVersion ? (
                <>
                  <label>
                    Etkinlik adı
                    <input
                      value={report.title}
                      onChange={(e) => update({ title: e.target.value })}
                    />
                  </label>
                  <div className="form-grid">
                    {report.fields.map((field, index) => {
                      const def = eventReportFields.find(
                        (f) => f.label === field.label,
                      ) || { type: 'text' };
                      return (
                        <label
                          className={
                            def.type === 'textarea' ? 'report-wide' : undefined
                          }
                          key={field.label + index}
                        >
                          {field.label}
                          {def.options ? (
                            <select
                              value={field.value}
                              onChange={(e) =>
                                updateField(field.label, e.target.value)
                              }
                            >
                              <option value="">Seçiniz</option>
                              {def.options.map((v) => (
                                <option key={v}>{v}</option>
                              ))}
                            </select>
                          ) : def.type === 'textarea' ? (
                            <textarea
                              rows={5}
                              value={field.value}
                              onChange={(e) =>
                                updateField(field.label, e.target.value)
                              }
                            />
                          ) : (
                            <input
                              type={def.type || 'text'}
                              min={def.type === 'number' ? 0 : undefined}
                              value={field.value}
                              onChange={(e) =>
                                updateField(field.label, e.target.value)
                              }
                            />
                          )}
                          {def.maxLength && (
                            <small>
                              {field.value.length} / {def.maxLength} karakter
                            </small>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <p>
                    Boş katılımcı alanı “bilinmiyor” anlamında korunur; sıfıra
                    dönüştürülmez. Katılımcı dağılımı toplamla tutarlı
                    olmalıdır.
                  </p>
                  {problems.length > 0 && (
                    <details>
                      <summary>
                        Hazırlık kontrolü: {problems.length} eksik / düzeltme
                      </summary>
                      <ul>
                        {problems.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {report.sourceChanged && (
                    <p className="notice">
                      Kaynak faaliyet bu rapordan sonra değişmiş. Güncel
                      faaliyetle yeni bir taslak hazırlayın; bu rapor önceki
                      içeriği korur.
                    </p>
                  )}
                  <div className="actions">
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          setReport(await api('/reports', report));
                          setDirty(false);
                          setReviewed(false);
                        }, 'Rapor taslağı kaydedildi.')
                      }
                    >
                      <Save size={16} /> Taslağı kaydet
                    </button>
                  </div>
                  {report.id && !dirty && report.status === 'draft' && (
                    <div className="report-review">
                      <label>
                        <input
                          type="checkbox"
                          checked={reviewed}
                          onChange={(e) => setReviewed(e.target.checked)}
                        />{' '}
                        İçeriği, dönemi, katılımcı sayılarını ve dayanakları
                        kontrol ettim.
                      </label>
                      <button
                        disabled={
                          busy ||
                          !reviewed ||
                          problems.length > 0 ||
                          report.sourceChanged
                        }
                        onClick={() =>
                          run(async () => {
                            setReport(
                              await api(`/reports/${report.id}/ready`, {
                                version: report.version,
                                reviewed,
                              }),
                            );
                            setReviewed(false);
                          }, 'Rapor aktarım için hazır. YEĞİTEK’e henüz kaydedilmedi.')
                        }
                      >
                        Aktarıma hazırla
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {shown.bodyText && (
                    <div className="report-source-text">{shown.bodyText}</div>
                  )}
                  <dl className="report-fields">
                    {shown.fields.map((f, i) => (
                      <React.Fragment key={f.label + i}>
                        <dt>{f.label}</dt>
                        <dd>
                          {f.value || (
                            <span className="muted">
                              Kaynakta belirtilmemiş
                            </span>
                          )}
                          {f.links?.length > 0 && (
                            <ul>
                              {f.links.map((l) => (
                                <li key={l.url}>
                                  <a
                                    href={l.url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    YEĞİTEK’teki ek: {l.title || l.url}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </>
              )}
              {copied && <p className="notice">{copied}</p>}
              {report.id && !oldVersion && (
                <>
                  <div className="actions">
                    <a
                      className="button"
                      href={`/api/reports/${report.id}/export`}
                    >
                      <Download size={16} /> Rapor metnini indir
                    </a>
                    <a
                      className="button"
                      href={`/api/reports/${report.id}/export?format=json`}
                    >
                      Rapor verisini indir
                    </a>
                    {report.sourceUrl && (
                      <a
                        className="button"
                        href={report.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={16} /> YEĞİTEK kaydını aç
                      </a>
                    )}
                  </div>
                  <h3>
                    Yerel rapor ekleri ({report.attachments?.length || 0})
                  </h3>
                  <ul className="file-list">
                    {(report.attachments || []).map((f) => (
                      <li key={f.id}>
                        <a href={'/api/report-files/' + f.id}>{f.name}</a>
                        <small>
                          {Math.ceil(f.size / 1024)} KB · bu bilgisayarda
                        </small>
                      </li>
                    ))}
                  </ul>
                  {editable && (
                    <label>
                      İmza belgesi veya etkinlik eki (en fazla 10 MB)
                      <input
                        type="file"
                        accept=".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
                        disabled={busy || dirty}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file)
                            run(async () => {
                              setReport(
                                await api(`/reports/${report.id}/files`, {
                                  ...(await fileData(file, 10)),
                                  version: report.version,
                                }),
                              );
                            }, 'Rapor eki kaydedildi.');
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                  {report.status === 'ready' && !dirty && (
                    <section className="report-transfer">
                      <h3>YEĞİTEK’e aktarım</h3>
                      <p>
                        Hazır alanları kopyalayın, YEĞİTEK rapor formuna girin
                        ve eklerinizi seçin. Bu sürümde son kayıt YEĞİTEK
                        ekranında yapılır. Hazır durumu, resmî sisteme
                        kaydedildiği anlamına gelmez.
                      </p>
                      <a
                        className="button primary"
                        href={moduleUrl + 'new'}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={16} /> YEĞİTEK rapor formunu aç
                      </a>
                      <div className="report-copy-fields">
                        <button
                          onClick={() =>
                            run(() => copy(report.title, 'Etkinlik adı'))
                          }
                        >
                          <Copy size={15} /> Etkinlik adını kopyala
                        </button>
                        {report.fields
                          .filter((f) => f.value)
                          .map((f) => (
                            <button
                              key={f.label}
                              onClick={() => run(() => copy(f.value, f.label))}
                            >
                              <Copy size={15} /> {f.label}
                            </button>
                          ))}
                      </div>
                      <h3>YEĞİTEK’te kaydettikten sonra</h3>
                      <div className="form-grid">
                        <label>
                          Kayıt tarihi
                          <input
                            type="date"
                            value={proof.recordedDate}
                            onChange={(e) =>
                              setProof({
                                ...proof,
                                recordedDate: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          YEĞİTEK rapor bağlantısı
                          <input
                            type="url"
                            value={proof.sourceUrl}
                            onChange={(e) =>
                              setProof({ ...proof, sourceUrl: e.target.value })
                            }
                          />
                        </label>
                        <label className="report-wide">
                          Kayıt dayanağı / numarası
                          <textarea
                            value={proof.proof}
                            onChange={(e) =>
                              setProof({ ...proof, proof: e.target.value })
                            }
                          />
                        </label>
                      </div>
                      <button
                        disabled={busy || report.sourceChanged}
                        onClick={() =>
                          run(
                            async () =>
                              setReport(
                                await api(`/reports/${report.id}/submission`, {
                                  ...proof,
                                  version: report.version,
                                }),
                              ),
                            'YEĞİTEK kayıt bilgisi arşive eklendi.',
                          )
                        }
                      >
                        Gerçek kayıt bilgisini sakla
                      </button>
                    </section>
                  )}
                  {report.submission && (
                    <p className="notice">
                      YEĞİTEK kayıt tarihi: {report.submission.recordedDate} ·{' '}
                      {report.submission.proof}
                    </p>
                  )}
                  {report.history?.length > 0 && (
                    <details>
                      <summary>
                        Rapor sürüm geçmişi ({report.history.length})
                      </summary>
                      <ul>
                        {report.history.map((h) => (
                          <li key={h.version}>
                            {h.reason} · Sürüm {h.version}{' '}
                            <button
                              onClick={() =>
                                run(async () =>
                                  setOldVersion(
                                    await api(
                                      `/reports/${report.id}/versions/${h.version}`,
                                    ),
                                  ),
                                )
                              }
                            >
                              Eski sürümü görüntüle
                            </button>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              )}
              {oldVersion && (
                <button onClick={() => setOldVersion(null)}>
                  Güncel rapora dön
                </button>
              )}
            </section>
          )}
          <p className="muted">
            Arşivlenen raporlar faaliyet istatistiklerine yeniden eklenmez.
            Kaynak ek bağlantıları YEĞİTEK’te açılır; “bu bilgisayarda” yazan
            ekler yerel yedekte saklanır.
          </p>
        </>
      )}
    </>
  );
}
