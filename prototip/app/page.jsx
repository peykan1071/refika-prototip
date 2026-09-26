'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  ShieldCheck,
  CircleHelp,
  House,
  ClipboardCheck,
  Users,
  CalendarDays,
  BookOpen,
  GraduationCap,
  Award,
  Network,
  FileText,
  History,
  Bell,
  Search,
  ListChecks,
  Pencil,
  Save,
  ChartColumn,
  BarChart3,
  Menu,
  X,
  LogOut,
  Download,
  Check,
  ChevronRight,
  Sparkles,
  Send,
  Info,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { initialState, transition, requestTypes, queuedRecords } from '../lib/workflow.mjs';
import { validationAudit, auditText } from '../lib/validation-audit.mjs';
import { officialResources, qualityChecklist } from '../lib/official-resources.mjs';
import AccountReview from '../components/account-review';
import ResultTracker from '../components/result-tracker';
import VisitWorkspace from '../components/visit-workspace';
import { restoreTasks } from '../lib/tasks.mjs';
import EventWorkspace from '../components/event-workspace';
import { restoreEvents } from '../lib/events.mjs';
import CoordinatorDashboard from '../components/coordinator-dashboard';
import MentorshipWorkspace from '../components/mentorship-workspace';
import ProjectWorkspace from '../components/project-workspace';
import ActivityOutputs from '../components/activity-outputs';
import ActivityPlan, { PlanReportQueue } from '../components/activity-plan';
import ReportCorrespondenceWorkspace from '../components/report-correspondence-workspace';
import QualityLabelWorkspace from '../components/quality-label-workspace';
import SupportBridgeWorkspace from '../components/support-bridge-workspace';
import OfficialResourcesWorkspace from '../components/official-resources-workspace';
import QuestionPoolWorkspace from '../components/question-pool-workspace';
import { loadDemo, saveDemo } from '../lib/storage.mjs';
import { initialAccountReview } from '../lib/account-review.mjs';
import { initialMentorGroup, restoreMentorGroup, restoreMentors, restoreSupports } from '../lib/mentorship.mjs';
import { restoreProjects, restoreProjectServices } from '../lib/projects.mjs';
function SourceCards({ items }) {
  return <div className="source-grid">{items.map(source => <article className="source-card" key={source.path}>
    <a href={`https://etwinning.meb.gov.tr/${source.path}`} target="_blank" rel="noreferrer">{source.title} <ExternalLink size={16} /></a>
    <p>{source.description}</p>
    <small>{source.published || 'Yayın tarihi belirtilmemiş'} · Son kontrol: 7 Eylül 2026</small>
  </article>)}</div>;
}
const blankRequest = () => ({ name: '', type: 'Öğretmen', school: '', district: '', email: '', requestType: 'approval', reason: '', accountId: '', correction: '', relatedAccounts: '', retainedAccount: '', evidence: '' });
function RequestFields({ record, onChange, locked = false, includeSchool = true }) {
  const field = (key, label, required = false, multiline = false) => <label className="field" key={key}>{label}{multiline ? <textarea rows={3} required={required} disabled={locked} value={record[key] || ''} onChange={e => onChange({ ...record, [key]: e.target.value })} /> : <input required={required} disabled={locked} value={record[key] || ''} onChange={e => onChange({ ...record, [key]: e.target.value })} />}</label>;
  return <>
    <label className="field">Kayıt türü<select disabled={locked} value={record.type} onChange={e => onChange({ ...record, type: e.target.value, requestType: e.target.value === 'Öğretmen' && record.requestType === 'merger' ? 'correction' : e.target.value === 'Okul' && ['membershipApproval', 'membershipRemoval'].includes(record.requestType) ? 'correction' : record.requestType })}><option>Öğretmen</option><option>Okul</option></select></label>
    <label className="field">İşlem türü<select disabled={locked} value={record.requestType} onChange={e => onChange({ ...record, requestType: e.target.value })}>{Object.entries(requestTypes).filter(([key]) => (key !== 'merger' || record.type === 'Okul') && (!['membershipApproval', 'membershipRemoval'].includes(key) || record.type === 'Öğretmen')).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    {record.type === 'Öğretmen' && <p className="muted">Birden fazla öğretmen hesabı için önce hesap incelemesi yapılır. Birleştirme seçeneği okul kayıtlarına aittir.</p>}
    {field('name', 'Öğretmen / okul adı', true)}
    {field('accountId', 'ESEP hesap / okul kimliği', true)}
    {includeSchool && field('school', 'Okul adı', true)}
    {['membershipApproval', 'membershipRemoval'].includes(record.requestType) && <>{field('schoolId', 'İlgili okul kimliği', true)}<p className="notice">Bu işlem yalnızca belirtilen okul üyeliğine yöneliktir; öğretmen hesabı silinmez.</p></>}{field('district', 'İlçe')}{field('email', 'İlgili e-posta (isteğe bağlı)')}
    {field('reason', 'Talep gerekçesi', true, true)}
    {record.requestType === 'correction' && field('correction', 'Mevcut bilgi → istenen düzeltme', true, true)}
    {record.requestType === 'merger' && <>{field('relatedAccounts', 'Birleştirilecek okul kimlikleri (her satıra bir okul)', true, true)}{field('retainedAccount', 'Korunması istenen okul kimliği', true)}</>}
    {record.requestType === 'deletion' && <p className="notice">Bu kayıt, silme talebinin taslağıdır. Hesap silinmez; merkez değerlendirmesi ve koordinatör onayı gerekir.</p>}
    {field('evidence', 'Kanıt bağlantısı / belge notu (isteğe bağlı)', false, true)}
  </>;
}
const areas = [
  ['Faaliyet Planı', CalendarDays, '2026–2027 aylık plan', 'Faaliyet kaydı, haber ve rapor'],
  [
    'Kayıt ve Validasyon',
    ClipboardCheck,
    'Kullanıcı / okul kontrolü',
    'Düzeltme ve merkez listeleri',
  ],
  [
    'Okul Ziyaretleri',
    CalendarDays,
    'Talep, güzergâh ve takvim',
    'eTwinning Okulları tebrikleri',
  ],
  [
    'Rehberlik ve Mentörlük',
    Users,
    'Öğretmen ve yönetici desteği',
    'Mentör belirleme ve izleme',
  ],
  [
    'Projeler ve TwinSpace',
    Network,
    'Fikir geliştirme, ortak bulma',
    'TwinSpace desteği',
  ],
  [
    'Eğitim ve Etkinlikler',
    GraduationCap,
    'Yenilikçi yüz yüze eğitim',
    'Webinar, toplantı, hizmet içi',
  ],
  [
    'Kalite Etiketleri',
    Award,
    'Ulusal / Avrupa rehberliği',
    'Tören hazırlıkları',
  ],
  [
    'Destek Köprüsü',
    Network,
    'İller arası ortak çalışmalar',
    'Yetkilendirilmiş erişim',
  ],
  [
    'Raporlar ve Yazışmalar',
    FileText,
    'Aylık / dönem sonu, YEĞİTEK',
    'Resmî yazı, duyuru, e-posta',
  ],
];
const stages = {
  review: 'Kayıt inceleme',
  draft: 'Taslak hazır',
  approval: 'Onay bekliyor',
  sent: 'Deneme gönderimi',
  complete: 'Sonuç kaydedildi',
};
const questionCategories = [
  [/kalite|etiket|kanıt|başvuru formu/i, 'Kalite etiketi', 'Kalite etiketi ölçütlerini ve kanıt düzenini kontrol edin. Proje sayfası, öğrenci katkısı, iş birliği ve görünürlük kanıtlarını başlıklar hâlinde eşleştirin.', 'Kalite etiketi kanıt rehberi'],
  [/okul etiketi|etwinning okulu|eTwinning Okulu/i, 'eTwinning Okulu', 'Okulun ortak vizyon, liderlik, e-güvenlik ve görünürlük kanıtlarını başvuru ölçütlerine göre hazırlayın.', 'eTwinning Okulu başvuru rehberi'],
  [/proje|ortak|twinspace/i, 'Proje ve TwinSpace', 'Önce proje amacı, ortak profili, görev paylaşımı ve öğrenci katılımını netleştirin; ardından ortak bulma ve çalışma alanı adımlarını planlayın.', 'Proje tasarımı ve ortaklık rehberi'],
  [/mentör|mentor|webinar|eğitim|kurs|çalıştay/i, 'Eğitim ve mentörlük', 'İhtiyacı hedef kitle, içerik, yöntem ve beklenen çıktı üzerinden kaydedin; uygun webinar veya mentörlük desteğini planlayın.', 'Eğitim ve mentörlük planı'],
  [/ite/i, 'ITE', 'ITE çalışması için eğitim fakültesi iş birliği, izin süreci, hedef grup ve uygulama takvimini birlikte planlayın.', 'ITE iş birliği kılavuzu'],
  [/rapor|faaliyet plan|haber|tören|sergi|dergi/i, 'Faaliyet planı ve raporlama', 'Faaliyetin tarihini, hedef kitlesini, çıktısını, kanıtını ve ilgili rapor dönemini netleştirerek plan veya rapor kaydına aktarın.', 'Faaliyet planı ve raporlama rehberi'],
  [/okul üyeli|okul bağlant|okul hesab/i, 'Okul üyeliği', 'Okul kaydı, kurum bilgisi ve yetkili kullanıcı ilişkisini resmî platformda kontrol edin; gerekirse kanıtla desteklenen talep taslağı hazırlayın.', 'Okul üyeliği kontrol listesi'],
  [/kayıt|hesap|validasyon|onay|giriş/i, 'Kayıt ve hesap', 'Önce kullanıcı ve kurum bilgisini doğrulayın. Şifre veya doğrulama kodu istemeden, gerekli kanıtı ve uygun destek kanalını belirleyin.', 'Kayıt ve hesap kontrol listesi'],
];
function classifyQuestion(summary) {
  return questionCategories.find(([pattern]) => pattern.test(summary)) || ['Diğer', 'Soruyu amaç, mevcut durum ve beklenen destek başlıklarıyla netleştirin; ardından uygun resmî kaynak ve rehberlik yolunu belirleyin.', 'REFİKA bilgi havuzu'];
}
function IconButton({ children, onClick, label }) {
  return (
    <button
      className="icon-button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function download(name, content, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob(['\uFEFF' + content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Dialog({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose}>
      <header>
        <h2>{title}</h2>
        <IconButton onClick={onClose} label="Pencereyi kapat">
          <X />
        </IconButton>
      </header>
      {children}
    </dialog>
  );
}
export default function Page() {
  const [signed, setSigned] = useState(false),
    [show, setShow] = useState(false),
    [view, setView] = useState('Çalışma Masam'),
    [mobile, setMobile] = useState(false),
    [state, setState] = useState(initialState),
    [modal, setModal] = useState(null),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all'),
    [school, setSchool] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [subject, setSubject] = useState(''),
    [body, setBody] = useState(''),
    [command, setCommand] = useState('');
  const [questions, setQuestions] = useState([]);
  const [questionSeed, setQuestionSeed] = useState('');
  const [requestDraft, setRequestDraft] = useState(blankRequest);
  const [repeatReason, setRepeatReason] = useState('');
  const [accountReview, setAccountReview] = useState(initialAccountReview);
  const [loaded, setLoaded] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [supports, setSupports] = useState([]);
  const [mentorGroup, setMentorGroup] = useState(initialMentorGroup);
  const [mentors, setMentors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectServices, setProjectServices] = useState([]);
  const [storageError, setStorageError] = useState('');
  // Browser storage is an external system: restore after hydration, then persist edits.
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
    if (!active) return;
    try {
      const saved = loadDemo(localStorage);
      if (saved) { const restoredProjects=restoreProjects(saved.projects || []); setTasks(restoreTasks(saved.tasks)); setEvents(restoreEvents(saved.events)); setSupports(restoreSupports(saved.supports || [])); setMentorGroup(restoreMentorGroup(saved.mentorGroup)); setMentors(restoreMentors(saved.mentors || [])); setProjects(restoredProjects); setProjectServices(restoreProjectServices(saved.projectServices || [],restoredProjects)); setQuestions(Array.isArray(saved.questions) ? saved.questions : []); setState(saved.state); setAccountReview(saved.accountReview || initialAccountReview()); setSubject(saved.subject || ''); setBody(saved.body || ''); }
      setLoaded(true);
    } catch { setStorageError('Önceki demo kaydı okunamadı. Kayıt korunuyor; devam etmek için Örnek akışı sıfırla seçeneğini kullanın.'); }
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { saveDemo(localStorage, { state, accountReview, subject, body, tasks, events, supports, mentorGroup, mentors, projects, projectServices, questions }); queueMicrotask(() => setStorageError('')); }
    catch { queueMicrotask(() => setStorageError('Tarayıcıya kayıt yapılamadı. Bu oturumdaki değişiklikler yenilemede kaybolabilir.')); }
  }, [loaded, state, accountReview, subject, body, tasks, events, supports, mentorGroup, mentors, projects, projectServices, questions]);
  const live = useRef({ signed, state });
  useEffect(() => {
    live.current = { signed, state };
  }, [signed, state]);
  const notify = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 4500);
  };
  const go = (next) => {
    setView(next);
    setMobile(false);
    setError('');
  };
  function dispatch(action) {
    if (!loaded) { setError('Devam etmek için okunamayan demo kaydını sıfırlayın.'); return null; }
    try {
      const next = transition(state, action);
      setState(next);
      setError('');
      return next;
    } catch (e) {
      setError(e.message);
      return null;
    }
  }
  useEffect(() => {
    const ctx = document.modelContext;
    if (!ctx?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        ctx.registerTool(
          {
            name: 'read_refika_demo_status',
            description:
              'Read the current sample-only validation workflow. No real data or external side effects.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true },
            execute(input) {
              if (input && Object.keys(input).length)
                throw new Error('Parametre kabul edilmez.');
              if (!live.current.signed)
                throw new Error('Örnek hesaba giriş yapın.');
              return {
                demo: true,
                stage: live.current.state.stage,
                records: live.current.state.records.map(
                  ({ id, reviewed, issue }) => ({ id, reviewed, issue }),
                ),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  function prepare() {
    const n = dispatch({ type: 'prepare' });
    if (n) {
      setSubject(n.packet.subject);
      setBody(n.packet.body);
      go('Taslaklar');
      notify('Merkez listesi ve e-posta taslağı hazır.');
    }
  }
  function openRecord(record) {
    setRequestDraft({ ...record });
    setSchool(record.school);
    setConfirmed(false);
    setError('');
    setModal({ type: 'record', record });
  }
  function csv() {
    const esc = (s) => '"' + String(s).replaceAll('"', '""') + '"';
    download(
      'REFIKA-ornek-validasyon-listesi.csv',
      [
        ['Talep no', 'İşlem', 'Kayıt', 'Tür', 'Hesap kimliği', 'İlgili okul kimliği', 'Okul', 'İlçe', 'Örnek e-posta', 'Gerekçe', 'Düzeltme', 'Birleştirilecek hesaplar', 'Korunacak hesap', 'Kanıt', 'Gönderim türü', 'Tekrar gerekçesi', 'İnceleme'],
        ...state.records.filter(r => state.packet ? state.packet.ids.includes(r.id) : r.queued).map((r) => [
          r.id,
          requestTypes[r.requestType],
          r.name,
          r.type,
          r.accountId,
          r.schoolId || '',
          r.school,
          r.district,
          r.email,
          r.reason, r.correction, r.relatedAccounts, r.retainedAccount, r.evidence,
          r.repeatReason ? 'Tekrar gönderim' : 'Yeni talep', r.repeatReason || '',
          r.reviewed ? 'Kontrol edildi' : 'İnceleme bekliyor',
        ]),
      ]
        .map((row) => row.map(esc).join(';'))
        .join('\r\n'),
      'text/csv;charset=utf-8',
    );
  }
  function assistant(e) {
    e.preventDefault();
    const [category, guidance, source] = classifyQuestion(command);
    const isQuestion = /\?|nasıl|ne zaman|neden|hangi|yardım|destek|bilir misiniz|olur mu/i.test(command);
    if (isQuestion) {
      setQuestions(current => [{ id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), district: '', category, channel: 'Çevrim içi', summary: command.trim(), guidance, source, outcome: 'Açık', recurring: current.some(item => item.category === category), automatic: true }, ...current]);
      setQuestionSeed('');
      go('Soru Havuzu');
      notify('Soru anonim olarak sınıflandı ve prototip yanıt taslağıyla kaydedildi.');
      setCommand('');
      return;
    }
    if (/valid|kayıt|hesap/i.test(command)) {
      go('Kayıt ve Validasyon');
      notify('Örnek validasyon kayıtları açıldı.');
    } else if (/rapor/i.test(command)) go('Raporlar ve Yazışmalar');
    else if (/ziyaret/i.test(command)) go('Okul Ziyaretleri');
    else if (/eğitim|etkinlik|webinar|çalıştay/i.test(command)) go('Eğitim ve Etkinlikler');
    else { setQuestionSeed(command); go('Soru Havuzu'); notify('Komut soru biçiminde olmadığı için anonim kayıt taslağına aktarıldı.'); }
    setCommand('');
  }
  const info = (title, text) => setModal({ type: 'info', title, text });
  const pending = queuedRecords(state).filter((r) => !r.reviewed).length;
  const visible = state.records.filter(
    (r) =>
      (filter !== 'issues' || (r.queued && !r.reviewed)) &&
      `${r.name} ${r.school} ${r.id} ${r.accountId} ${requestTypes[r.requestType]}`
        .toLocaleLowerCase('tr')
        .includes(query.toLocaleLowerCase('tr')),
  );
  const packetView = () => {
    if (state.stage === 'review')
      return (
        <div className="empty">
          <FileText />
          <h3>Önce kayıtları inceleyin</h3>
          <p>
            {pending} örnek kaydın kontrolü bekliyor. Eksikleri tamamlayınca
            merkez listesi ve e-posta taslağı hazırlanabilir.
          </p>
          <button className="primary" onClick={() => go('Kayıt ve Validasyon')}>
            Kayıtları incele <ArrowRight size={18} />
          </button>
        </div>
      );
    return (
      <>
        <div className="notice">
          <Info size={20} />
          <span>
            Bu paket yalnızca örnek veriler içerir. Gerçek e-posta gönderilmez.
          </span>
        </div>
        <div className="packet-meta">
          <span>Alıcı</span>
          <strong>{state.packet.recipient}</strong>
          <span>Ek</span>
          <button className="text-link" onClick={csv}>
            Merkez listesi · {state.packet.count} örnek kayıt{' '}
            <Download size={16} />
          </button>
          <span>Durum</span>
          <strong>{stages[state.stage]}</strong>
        </div>
        <label className="field">
          Konu
          <input
            value={subject}
            disabled={state.stage !== 'draft'}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label className="field">
          E-posta taslağı
          <textarea
            rows={8}
            value={body}
            disabled={state.stage !== 'draft'}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <div className="actions">
          <button
            className="secondary"
            onClick={() =>
              download(
                'REFIKA-eposta-taslagi.txt',
                `Alıcı: ${state.packet.recipient}\nKonu: ${subject}\n\n${body}`,
              )
            }
          >
            <Download size={17} /> Taslağı indir
          </button>
          {state.stage === 'draft' && (
            <button
              className="primary"
              onClick={() => {
                if (dispatch({ type: 'submit', subject, body })) {
                  go('Onay Merkezi');
                  notify('Validasyon listesi ve e-posta taslağı gönderim öncesi kontrole taşındı.');
                }
              }}
            >
              Onaya sun <ArrowRight size={17} />
            </button>
          )}
          {['draft', 'approval'].includes(state.stage) && (
            <button
              className="text-link"
              onClick={() => {
                if (dispatch({ type: 'return' })) go('Kayıt ve Validasyon');
              }}
            >
              Düzeltmeye geri al
            </button>
          )}
        </div>
      </>
    );
  };
  const approve = () => {
    setConfirmed(false);
    setModal({ type: 'approve' });
    setError('');
  };
  const recordTable = (compact = false) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Kayıt</th>
            <th>Durum</th>
            <th>{compact ? 'Gerekli düzeltme' : 'Okul / gerekli düzeltme'}</th>
            <th>
              <span className="sr-only">İşlem</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {(compact ? state.records.slice(0, 2) : visible).map((r) => (
            <tr key={r.id}>
              <td>
                <span className="record-name">
                  <Users size={16} />
                  {r.name}
                </span>
                <small>{r.id} · {requestTypes[r.requestType]}</small>
                <small>{r.deliveries.length} deneme gönderimi{r.queued && r.deliveries.length ? ' · Tekrar sırada' : ''}</small>
                {!compact && (
                  <small>
                    {r.id} · {r.type}
                  </small>
                )}
              </td>
              <td>
                <span className={'badge ' + (r.reviewed ? 'done' : 'amber')}>
                  {r.reviewed
                    ? 'Kontrol edildi'
                    : r.type === 'Okul'
                      ? 'İncelenmeli'
                      : 'Eksik bilgi'}
                </span>
              </td>
              <td>{r.issue || r.school}</td>
              <td>
                <button className="row-link" onClick={() => openRecord(r)}>
                  İncele <ChevronRight size={15} />
                </button>
                {!compact && !r.queued && r.deliveries.length > 0 && <button className="row-link" disabled={!['review', 'sent', 'complete'].includes(state.stage)} onClick={() => { setRepeatReason(''); setError(''); setModal({ type: 'repeat', record: r, title: `${r.id} · Tekrar gönderim` }); }}>Tekrar gönderim hazırla</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!compact && !visible.length && (
        <div className="empty small">Bu aramayla eşleşen kayıt bulunamadı.</div>
      )}
    </div>
  );
  const workflow = (
    <div className="workflow">
      {[
        [Search, 'Görevi algıla'],
        [BookOpen, 'ESEP kaydını ve kuralı kontrol et'],
        [ListChecks, 'Adımları sırala'],
        [Pencil, 'Taslağı hazırla'],
        [LockKeyhole, 'Onayla ve uygula'],
        [Save, 'Sonucu kaydet'],
        [ChartColumn, 'Raporla'],
      ].map(([Icon, label], i) => (
        <div className={'step ' + (i === 4 ? 'approval-step' : '')} key={label}>
          <span>
            <Icon size={23} />
          </span>
          <small>{label}</small>
          {i < 6 && <ArrowRight className="step-arrow" size={20} />}
        </div>
      ))}
    </div>
  );
  const validationWorkspaceAction =
    state.stage === 'review'
      ? { label: 'Kayıtları incele', target: 'Kayıt ve Validasyon' }
      : state.stage === 'draft'
        ? { label: 'Taslakları incele', target: 'Taslaklar' }
        : { label: 'Listeyi ve e-postayı incele', target: 'Onay Merkezi' };
  const packagePanel =
    state.stage === 'review'
      ? {
          title: 'Sıradaki adım',
          badge: 'Kayıtlar inceleniyor',
          heading: 'Validasyon listesi ve e-posta taslağını hazırlayın',
          description: 'Kayıt incelemesi tamamlandığında merkez listesi ve e-posta taslağı oluşur.',
          note: 'Önce soldaki kayıtları inceleyin; ardından listeyi ve e-posta taslağını gönderim öncesi kontrole alın.',
          action: 'Kayıtları incele',
          target: 'Kayıt ve Validasyon',
        }
      : state.stage === 'draft'
        ? {
            title: 'Gönderim öncesi kontrol',
            badge: 'Taslak hazır',
            heading: 'Validasyon listesi ve e-posta taslağı',
            description: 'Merkez listesi ve e-posta taslağı hazırlandı.',
            note: 'Alıcıyı, ekleri ve paylaşılacak bilgileri kontrol edin.',
            action: 'Taslakları incele',
            target: 'Taslaklar',
          }
        : {
            title: 'Gönderim öncesi kontrol',
            badge:
              state.stage === 'approval'
                ? 'Onay bekliyor'
                : state.stage === 'sent' || state.stage === 'complete'
                  ? 'Deneme tamamlandı'
                  : 'Hazırlanıyor',
            heading: 'Validasyon listesi ve e-posta taslağı',
            description: 'Merkez listesi ve e-posta taslağı',
            note: 'Alıcıyı, ekleri ve paylaşılacak bilgileri kontrol edin.',
            action: 'Listeyi ve e-postayı incele',
            target: 'Onay Merkezi',
          };
  const resources = (
    <>
      <div className="chips">
        <button
          onClick={() =>
            info(
              'Güncel yönergeler',
              'Prototipte canlı mevzuat eşitlemesi yoktur. Gerçek işlem öncesinde resmî kaynağın sürümü ve tarihi doğrulanmalıdır. Örnek kayıt kontrolleri resmî validasyon kararı değildir.',
            )
          }
        >
          Yönergeler
        </button>
        <button onClick={() => go('Takvimim')}>Takvimler</button>
        <button
          onClick={() =>
            info(
              'Güncel temalar',
              'Güncel eTwinning temalarını resmî ESEP ve eTwinning Türkiye kaynaklarından takip edin.',
            )
          }
        >
          Temalar
        </button>
      </div>
      <p className="muted">Kaynak ve güncellik kontrolü</p>
      <div className="external-links">
        {[
          ['MEB', 'https://www.meb.gov.tr/', '/official-logos/meb.png'],
          ['YEĞİTEK', 'https://yegitek.meb.gov.tr/', '/official-logos/yegitek.png'],
          ['EBA', 'https://www.eba.gov.tr/', '/official-logos/eba.png'],
          ['ESEP', 'https://school-education.ec.europa.eu/en/etwinning', '/official-logos/esep-ec.svg'],
          ['eTwinning Türkiye', 'https://etwinning.meb.gov.tr/', '/official-logos/etwinning-turkiye.png'],
        ].map(([name, url, logo]) => (
          <a className="official-source-link" key={name} href={url} target="_blank" rel="noreferrer">
            <span className="official-source-logo"><Image unoptimized width={72} height={40} src={logo} alt="" /></span>
            <span>{name}</span>
            <ExternalLink size={12} />
          </a>
        ))}
      </div>
      <button className="text-link" onClick={() => go('Güncel Kaynaklar')}>Resmî kaynakları incele <ArrowRight size={16} /></button>
    </>
  );
  return (
    <>
      {!signed ? (
        <main className="login">
          <div className="welcome">
            <div className="welcome-art">
              <Image
                unoptimized
                width={1024}
                height={1536}
                priority
                src="/welcome-agent-v11.png"
                alt="REFİKA – Rehber eTwinning Faaliyetleri İl Koordinatörü Ajanı. Yol arkadaşınız. Ortak platform, size özel çalışma alanı."
              />
            </div>
          </div>
          <section className="login-side">
            <button
              className="help plain"
              onClick={() =>
                info(
                  'Prototipe giriş',
                  'Örnek e-posta ve şifre alanları hazırdır. Giriş yap düğmesiyle çalışma masasını deneyebilirsiniz. Gerçek hesap doğrulaması ve e-posta gönderimi bu sürümde yoktur.',
                )
              }
            >
              <CircleHelp size={22} /> Yardım
            </button>
            <div className="login-form">
              <span className="eyebrow">KOORDİNATÖR GİRİŞİ</span>
              <h1>Hoş geldiniz.</h1>
              <p>
                Çalışma alanınıza erişmek için
                <br />
                hesabınızla giriş yapın.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSigned(true);
                  go('Çalışma Masam');
                }}
              >
                <label>
                  E-posta adresi
                  <div className="input-icon">
                    <Mail size={21} />
                    <input
                      type="email"
                      required
                      placeholder="ornek@eposta.com"
                      autoComplete="off"
                      aria-label="E-posta adresi"
                    />
                  </div>
                </label>
                <label>
                  Şifre
                  <div className="input-icon">
                    <LockKeyhole size={21} />
                    <input
                      required
                      type={show ? 'text' : 'password'}
                      placeholder="Demo şifreniz"
                      autoComplete="off"
                      aria-label="Şifre"
                    />
                    <button
                      type="button"
                      aria-label="Şifreyi göster veya gizle"
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </label>
                <button
                  className="text-link forgot"
                  type="button"
                  onClick={() =>
                    info(
                      'Şifre yenileme',
                      'Bu sürüm örnek hesapla çalışır; şifre yenileme e-postası gönderilmez. Hazır örnek bilgilerle giriş yapabilirsiniz.',
                    )
                  }
                >
                  Şifremi unuttum
                </button>
                <button className="primary login-button">
                  Giriş yap <ArrowRight />
                </button>
              </form>
              <div className="security">
                <ShieldCheck />
                <span>
                  İliniz ve erişim yetkileriniz hesabınızdan otomatik
                  belirlenir.
                </span>
              </div>
              <p className="demo-note">
                Demo için örnek bilgiler kullanın. Gerçek şifrenizi yazmayın.
              </p>
              <div className="support">
                Hesabınıza erişemiyor musunuz?
                <br />
                <button
                  className="text-link"
                  onClick={() =>
                    info(
                      'Hesap desteği',
                      'Bu prototipte yalnızca örnek hesap bulunur. Gerçek kullanıcı, il yetkilendirmesi ve hesap desteği canlı sürümde bağlanacaktır.',
                    )
                  }
                >
                  Hesap desteği alın
                </button>
              </div>
            </div>
            <footer>
              <button
                className="text-link"
                onClick={() =>
                  info(
                    'Gizlilik — prototip',
                    'Form bilgileri bir sunucuya gönderilmez. Demo kayıtları bu tarayıcıda saklanır; Örnek akışı sıfırla ile temizlenebilir. Gerçek kişi bilgisi girmeyin.',
                  )
                }
              >
                Gizlilik
              </button>
              <span>·</span>
              <button
                className="text-link"
                onClick={() =>
                  info(
                    'Kullanım koşulları — prototip',
                    'Bu çalışma akışı işlevsel bir gösterimdir. Gerçek validasyon kararı, hesap işlemi veya resmî gönderim yapmaz.',
                  )
                }
              >
                Kullanım koşulları
              </button>
            </footer>
          </section>
        </main>
      ) : (
        <div className="app-shell">
          <aside className={'sidebar ' + (mobile ? 'open' : '')}>
            <div className="brand-lockup">
              <div className="brand-symbol" aria-hidden="true" />
              <div>
                <strong>REFİKA</strong>
                <small>
                  Rehber eTwinning
                  <br />
                  Faaliyetleri İl
                  <br />
                  Koordinatörü Ajanı
                </small>
              </div>
            </div>
            <nav>
              <button
                className={view === 'Çalışma Masam' ? 'selected' : ''}
                onClick={() => go('Çalışma Masam')}
              >
                <House />
                Çalışma Masam
              </button>
              {areas.map(([name, Icon]) => (
                <button
                  className={view === name || (view === 'Hesap İnceleme' && name === 'Kayıt ve Validasyon') ? 'selected' : ''}
                  key={name}
                  onClick={() => go(name)}
                >
                  <Icon />
                  {name}
                </button>
              ))}
              <button
                className={view === 'Güncel Kaynaklar' ? 'selected' : ''}
                onClick={() => go('Güncel Kaynaklar')}
              >
                <BookOpen />
                Resmî Kaynaklar
              </button>
              <button className={view === 'Soru Havuzu' ? 'selected' : ''} onClick={() => go('Soru Havuzu')}>
                <BarChart3 />
                Soru Havuzu
              </button>
              <button className={view === 'Sonuç Takibi' ? 'selected' : ''} onClick={() => go('Sonuç Takibi')}><ListChecks />Sonuç Takibi</button>
              <hr />
              <button
                className={view === 'Onay Merkezi' ? 'selected' : ''}
                onClick={() => go('Onay Merkezi')}
              >
                <ShieldCheck />
                Onay Merkezi
                {state.stage === 'approval' && <i className="dot" />}
              </button>
              <button
                className={view === 'İşlem Geçmişi' ? 'selected' : ''}
                onClick={() => go('İşlem Geçmişi')}
              >
                <History />
                İşlem Geçmişi
              </button>
            </nav>
            <div className="sidebar-art" aria-hidden="true" />
          </aside>
          {mobile && (
            <button
              className="backdrop"
              aria-label="Menüyü kapat"
              onClick={() => setMobile(false)}
            />
          )}
          <div className="workspace">
            <header className="topbar">
              <div className="breadcrumb">
                <IconButton label="Menü" onClick={() => setMobile(!mobile)}>
                  <Menu />
                </IconButton>
                <b>REFİKA</b>
                <span>/</span>
                <span>{view === 'Güncel Kaynaklar' ? 'Resmî Kaynaklar' : view}</span>
              </div>
              <div className="top-actions">
                <span className="scope">
                  <ShieldCheck size={21} /> Yetkili çalışma alanı
                </span>
                <IconButton
                  label="Bildirimler"
                  onClick={() => go('Onay Merkezi')}
                >
                  <Bell />
                </IconButton>
                <button
                  className="profile"
                  onClick={() =>
                    info(
                      'Örnek koordinatör hesabı',
                      'İl: Erzurum (pilot örnek). REFİKA 81 il için ortak tasarlanmıştır. Canlı sürümde il ve yetkiler sunucu tarafında hesaptan belirlenecektir; bu prototipte gerçek yetkilendirme yoktur.',
                    )
                  }
                >
                  <Users size={23} />
                  <span>
                    <b>İl Koordinatörü</b>
                    <small>Zülal Ülker Daştan · Erzurum</small>
                  </span>
                </button>
                <IconButton
                  label="Çıkış yap"
                  onClick={() => {
                    setSigned(false);
                    setShow(false);
                  }}
                >
                  <LogOut size={19} />
                </IconButton>
              </div>
            </header>
            <main className="main">
              <div className="page-heading">
                <div>
                  <h1>
                    {view === 'Çalışma Masam'
                      ? 'Koordinatör çalışma masam'
                      : view === 'Güncel Kaynaklar' ? 'Resmî Kaynaklar' : view === 'Hesap İnceleme' ? 'Hesap inceleme ve işlem önerisi' : view}
                  </h1>
                  <p>
                    {view === 'Çalışma Masam'
                      ? 'Günün işlerini planlayın, taslakları inceleyin, süreçleri takip edin.'
                      : view === 'Hesap İnceleme' ? 'Kanıtları karşılaştırın, eksik bilgileri teyit edin, sonraki adımı belirleyin.' : 'Örnek kayıtlarla koordinatör çalışma alanı'}
                  </p>
                </div>
                <span className="badge amber">{view === 'Hesap İnceleme' ? 'TARİHLİ İNCELEME · DENEME AKIŞI' : 'ÖRNEK VERİLERLE PROTOTİP'}</span>
              </div>
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              {view === 'Çalışma Masam' && (
                <>
                  <CoordinatorDashboard state={state} tasks={tasks} events={events} onOpen={go} />
                  <form className="assistant-bar" onSubmit={assistant}>
                    <Sparkles size={22} />
                    <input
                      aria-label="REFİKA görevi"
                      placeholder="REFİKA, bugün ne hazırlayalım?"
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      required
                    />
                    <button className="primary">
                      Görevi başlat <ArrowRight />
                    </button>
                  </form>
                  <div className="quick-actions">
                    <button onClick={() => go('Kayıt ve Validasyon')}>
                      <ClipboardCheck />
                      Validasyonları hazırla
                    </button>
                    <button onClick={() => go('Okul Ziyaretleri')}>
                      <CalendarDays />
                      Ziyaretleri planla
                    </button>
                    <button onClick={() => go('Eğitim ve Etkinlikler')}>
                      <GraduationCap />
                      Eğitim ve etkinlik planla
                    </button>
                    <button onClick={() => go('Raporlar ve Yazışmalar')}>
                      <FileText />
                      Aylık raporu oluştur
                    </button>
                  </div>
                  {workflow}
                  <div className="work-grid">
                    <section className="card">
                      <div className="card-heading">
                        <h2>
                          <Users />
                          Kayıt ve validasyon
                        </h2>
                        <span className="badge">Örnek kayıtlar</span>
                      </div>
                      <div className="tabs">
                        <button
                          className="active"
                          onClick={() => go('Kayıt ve Validasyon')}
                        >
                          Bekleyen hesaplar
                        </button>
                        <button
                          onClick={() => {
                            setFilter('issues');
                            go('Kayıt ve Validasyon');
                          }}
                        >
                          Eksik / şüpheli
                        </button>
                        <button onClick={() => go('Taslaklar')}>
                          Merkez listesi
                        </button>
                      </div>
                      {recordTable(true)}
                      <div className="document-chips">
                        <button onClick={() => go('Taslaklar')}>
                          <FileText size={16} />
                          Merkez listesi · Taslak
                        </button>
                        <button onClick={() => go('Taslaklar')}>
                          <Mail size={16} />
                          E-posta · Taslak
                        </button>
                      </div>
                      <div className="actions split">
                        <button
                          className="secondary"
                          onClick={() => go('Taslaklar')}
                        >
                          Taslakları incele
                        </button>
                        <button
                          className="primary"
                          onClick={() => go(validationWorkspaceAction.target)}
                        >
                          {validationWorkspaceAction.label} <ArrowRight size={16} />
                        </button>
                      </div>
                      <p className="card-note">
                        <Info size={15} />
                        Gönderim tarihi, durum ve sonuç takip listesine
                        kaydedilir.
                      </p>
                    </section>
                    <section className="card approval-card">
                      <div className="card-heading">
                        <h2>
                          <LockKeyhole />
                          {packagePanel.title}
                        </h2>
                        <span className="badge amber">
                          {packagePanel.badge}
                        </span>
                      </div>
                      <div className="approval-inner">
                        <span className="mail-circle">
                          <Mail />
                        </span>
                        <div>
                          <h3>{packagePanel.heading}</h3>
                          <p>{packagePanel.description}</p>
                          <small>{packagePanel.note}</small>
                          <div className="actions">
                            <button
                              className="primary"
                              onClick={() => go(packagePanel.target)}
                            >
                              {packagePanel.action} <ArrowRight size={18} />
                            </button>
                            {state.stage !== 'review' && (
                              <button
                                className="text-link"
                                onClick={() => {
                                  if (
                                    ['draft', 'approval'].includes(state.stage)
                                  ) {
                                    dispatch({ type: 'return' });
                                    go('Kayıt ve Validasyon');
                                  } else go('Kayıt ve Validasyon');
                                }}
                              >
                                Düzeltme iste
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="card-note rule">
                        <Info />
                        Validasyon kararı, mesaj, veri paylaşımı, hesap silme ve
                        resmî rapor gönderimi onayınızla uygulanır.
                      </p>
                    </section>
                  </div>
                  <h2 className="section-label">Çalışma alanlarım</h2>
                  <div className="area-grid">
                    {areas.map(([name, Icon, line1, line2]) => (
                      <button
                        className="area-card"
                        key={name}
                        onClick={() => go(name)}
                      >
                        <Icon />
                        <span>
                          <b>{name}</b>
                          <small>{line1}</small>
                          <small>{line2}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="bottom-grid">
                    <section className="card">
                      <h2>
                        <CalendarDays />
                        Takvimim
                      </h2>
                      <p>Ziyaret ve eğitim planları</p>
                      <p className="muted">Planlanan işler burada görünür.</p>
                      <button
                        className="secondary"
                        onClick={() => go('Takvimim')}
                      >
                        Takvimi aç <ArrowRight size={17} />
                      </button>
                    </section>
                    <section className="card">
                      <h2>
                        <BookOpen />
                        Resmî Kaynaklar
                      </h2>
                      {resources}
                    </section>
                    <section className="card">
                      <h2>
                        <FileText />
                        İşlemden rapora
                      </h2>
                      <ol className="timeline">
                        {Object.entries(stages).map(([key, label]) => (
                          <li
                            className={state.stage === key ? 'current' : ''}
                            key={key}
                          >
                            {label}
                          </li>
                        ))}
                      </ol>
                    </section>
                  </div>
                </>
              )}
              {view === 'Kayıt ve Validasyon' && (
                <>
                  <ol className="validation-path" aria-label="Kayıt ve validasyon adımları">
                    {[
                      [Search, '1', 'Bekleyen kaydı aç', () => document.getElementById('validation-requests')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), false],
                      [ExternalLink, '2', "ESEP'te kontrol et", () => window.open('https://school-education.ec.europa.eu/en/nso-desktop/registrations/etwinners', '_blank', 'noopener,noreferrer'), false],
                      [ShieldCheck, '3', 'Kişi ve kurum teyidini kaydet', () => openRecord(state.records.find((record) => record.queued && !record.reviewed) || state.records[0]), !state.records.length],
                      [ListChecks, '4', 'İşlem türünü seç', () => openRecord(state.records.find((record) => record.queued && !record.reviewed) || state.records[0]), !state.records.length],
                      [Mail, '5', 'Liste ve e-postayı hazırla', prepare, !!pending || !queuedRecords(state).length || state.stage !== 'review'],
                    ].map(([Icon, number, label, action, disabled]) => (
                      <li key={number}>
                        <button type="button" onClick={action} disabled={disabled} aria-label={`${number}. adım: ${label}`}>
                          <span className="validation-step-number">{number}</span>
                          <Icon size={19} aria-hidden="true" />
                          <b>{label}</b>
                        </button>
                      </li>
                    ))}
                  </ol>
                  <div className="notice">
                    <BookOpen />
                    <span>
                      <b>ESEP kontrol köprüsü:</b> REFİKA, ESEP'ten canlı kayıt
                      çekmez ve karar vermez. Koordinatör ESEP'te okul/hesap
                      kaydını kontrol eder, dayanağını ve sonucunu burada
                      kaydeder; REFİKA uygun talep taslağını hazırlar.
                    </span>
                  </div>
                  <section className="card" id="validation-requests">
                    <div className="card-heading">
                      <h2>Validasyon talepleri</h2>
                      <span className="badge amber">
                        {pending} kontrol bekliyor
                      </span>
                    </div>
                    <div className="toolbar">
                      <button className="secondary" disabled={!['review', 'sent', 'complete'].includes(state.stage)} onClick={() => { setRequestDraft(blankRequest()); setError(''); setModal({ type: 'create', title: 'Yeni validasyon talebi' }); }}>Yeni talep oluştur</button>
                      <div className="tabs">
                        <button
                          className={filter === 'all' ? 'active' : ''}
                          onClick={() => setFilter('all')}
                        >
                          Tüm kayıtlar
                        </button>
                        <button
                          className={filter === 'issues' ? 'active' : ''}
                          onClick={() => setFilter('issues')}
                        >
                          Eksik / şüpheli
                        </button>
                      </div>
                      <label className="search">
                        <Search size={18} />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Kayıt veya okul ara"
                          aria-label="Kayıt veya okul ara"
                        />
                      </label>
                    </div>
                    {recordTable()}
                    <div className="actions">
                      <button
                        className="primary"
                        disabled={!!pending || !queuedRecords(state).length || state.stage !== 'review'}
                        onClick={prepare}
                      >
                        Listeyi ve e-postayı hazırla <ArrowRight size={18} />
                      </button>
                      {state.stage !== 'review' && (
                        <button
                          className="secondary"
                          onClick={() => go('Taslaklar')}
                        >
                          Listeyi ve e-posta taslağını aç
                        </button>
                      )}
                      <small className="muted">
                        {pending
                          ? "Her kaydı ESEP'te kontrol edin; sonucu ve dayanağı kaydedin."
                          : 'Tüm örnek kayıtlar kontrol edildi; talep taslağını hazırlayabilirsiniz.'}
                      </small>
                    </div>
                  </section>
                  <section className="card account-review-entry">
                    <div><span className="eyebrow">AYRINTILI HESAP İNCELEMESİ</span><h2>İki profil görünen kayıtları karşılaştırın</h2><p>Aynı kişiye ait olabilecek hesaplarda kimlik, okul ve proje geçmişini yan yana inceleyip sonucu kaydedin.</p></div>
                    <button className="primary" onClick={() => go('Hesap İnceleme')}>Ayrıntılı incelemeyi aç <ArrowRight size={18} /></button>
                  </section>
                  <p className="muted">{state.records.length} ayrı talep · {state.records.reduce((sum, r) => sum + r.deliveries.length, 0)} deneme gönderimi · {state.records.reduce((sum, r) => sum + Math.max(0, r.deliveries.length - 1), 0)} tekrar. Tekrar hazırlamak yeni talep oluşturmaz; gönderim ancak onaydan sonra sayılır.</p>
                </>
              )}
              {view === 'Taslaklar' && (
                <section className="card detail-card">
                  <h2>
                    <FileText />
                    Merkez listesi ve e-posta
                  </h2>
                  {packetView()}
                </section>
              )}
              {view === 'Hesap İnceleme' && <AccountReview review={accountReview} setReview={setAccountReview} onBack={() => go('Kayıt ve Validasyon')} download={download} />}
              {view === 'Onay Merkezi' && (
                <section className="card detail-card">
                  <div className="card-heading">
                    <h2>
                      <ShieldCheck />
                      Gönderim öncesi kontrol
                    </h2>
                    <span className="badge amber">{stages[state.stage]}</span>
                  </div>
                  {packetView()}
                  {state.stage === 'approval' && (
                    <div className="approve-box">
                      <p>
                        İncelemenizi tamamladıktan sonra yalnızca bu örnek
                        paketin gönderimini simüle edebilirsiniz.
                      </p>
                      <button className="primary" onClick={approve}>
                        Koordinatör onayı ver <ShieldCheck size={18} />
                      </button>
                    </div>
                  )}
                  {['sent', 'complete'].includes(state.stage) && (
                    <div className="success">
                      <Check />
                      <div>
                        <b>Deneme gönderimi kaydedildi</b>
                        <p>
                          Gerçek e-posta gönderilmedi. Tarih:{' '}
                          {new Date(state.sentAt).toLocaleString('tr-TR')}
                        </p>
                        <button
                          className="secondary"
                          onClick={() => go('Sonuç Takibi')}
                        >
                          Sonuç takibine geç <ArrowRight size={17} />
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}
              {view === 'Sonuç Takibi' && <ResultTracker state={state} dispatch={dispatch} />}
              {view === 'Raporlar ve Yazışmalar' && <ReportCorrespondenceWorkspace tasks={tasks} events={events} />}
              {view === '__legacy_reports__' && (
                <section className="card detail-card validation-audit" aria-labelledby="validation-audit-title">
                  <h2 id="validation-audit-title"><History /> 2024–2026 validasyon incelemesi</h2>
                  <p><strong>{validationAudit.province} arşivi</strong> · {validationAudit.updatedAt} · {validationAudit.status}</p>
                  <div className="notice"><strong>72 ileti dizisinde 343 tekrarsız talep.</strong> 368 talep geçişinden 25 tekrar ayrıldı. Bu, talep edilen işlemlerin sayısıdır; tamamlanan validasyon veya benzersiz öğretmen sayısı değildir.</div>
                  <div className="audit-table-wrap">
                    <table className="audit-table">
                      <caption>İncelenen gönderimler ve talep sayısı</caption>
                      <thead><tr><th scope="col">Yıl</th><th scope="col">Bulunan gönderim aralığı</th><th scope="col">İleti dizisi</th><th scope="col">Tekrarsız talep</th><th scope="col">Ayrılan tekrar</th></tr></thead>
                      <tbody>{validationAudit.years.map(y => <tr key={y.year}><th scope="row">{y.year}</th><td>{y.period}</td><td>{y.threads}</td><td><strong>{y.requests}</strong></td><td>{y.repeats}</td></tr>)}</tbody>
                      <tfoot><tr><th scope="row" colSpan={2}>İncelenen kapsam toplamı</th>{['threads','requests','repeats'].map(key => <td key={key}>{validationAudit.years.reduce((sum, y) => sum + y[key], 0)}</td>)}</tr></tfoot>
                    </table>
                  </div>
                  <div className="audit-table-wrap"><table className="audit-table"><caption>Talep türleri · tekrarlar çıkarıldı</caption><thead><tr><th scope="col">Yıl</th><th scope="col">Hesap onayı</th><th scope="col">Düzeltme</th><th scope="col">Birleştirme</th><th scope="col">Silme</th><th scope="col">Onay iptali</th></tr></thead><tbody>{validationAudit.years.map(y => <tr key={y.year}><th scope="row">{y.year}</th>{['approval','correction','merger','deletion','cancellation'].map(key => <td key={key}>{y[key]}</td>)}</tr>)}</tbody></table></div>
                  <p>2024 kayıtları 23 Ekim’den başlıyor. 2026 devam eden yıl. Tam yıl kapsamı henüz teyit edilmedi.</p>
                  <details className="audit-method"><summary>Sayım yöntemi ve kaynak kontrolü</summary>
                    <p>Gönderim tarihindeki tam tablo sürümü ve e-posta metni birlikte okundu. Her yıl içinde aynı hesap, okul ve işlem için yinelenen talepler bir kez sayıldı. Kimlik eksikliği olan kayıtlarda ad ve okul bilgisi de kontrol edildi.</p>
                    <p>Boş şablon satırları ile 2025’teki 16 ve 2026’daki 22 önceki “Onaylandı” satırı yeni talep sayılmadı. 2025’te açıklaması boş 5 kayıt, e-posta metnindeki açık hesap onayı talebiyle sınıflandı.</p>
                    <p>2026’daki iki birleştirme talebi toplam 7 okul hesabını kapsıyor. İki ayrı okulun müdür bilgisi için 2 düzeltme sayıldı. Proje görünürlüğü ve okul adaylığı rehberliği bu toplama dahil edilmedi.</p>
                    <p>Aynı işlemin kapanıp yeniden açıldığını gösteren ek kanıt gelirse tekrar sınıflaması güncellenebilir.</p>
                    <p>{validationAudit.comparison}</p>
                  </details>
                  <div className="actions">
                    <button className="secondary" onClick={() => download('REFIKA-Erzurum-2024-2026-inceleme-ozeti.txt', auditText())}>İnceleme özetini indir <Download size={17} /></button>
                    {validationAudit.spreadsheet && <a className="text-link" href={validationAudit.spreadsheet} target="_blank" rel="noreferrer">Kaynak e-tablo <ExternalLink size={15} /></a>}
                    <a className="text-link" href={validationAudit.yegitek} target="_blank" rel="noreferrer">YEĞİTEK rapor listesi <ExternalLink size={15} /></a>
                  </div>
                  <p className="audit-footnote">Tarihli inceleme kaydıdır; kaynaklarla canlı bağlantı ve resmî gönderim yapılmaz.</p>
                </section>
              )}
              {view === '__legacy_reports__' && <VisitWorkspace tasks={tasks} onChange={setTasks} mode="report" onOpen={() => go('Okul Ziyaretleri')} ready={loaded} />}
              {view === '__legacy_reports__' && <EventWorkspace events={events} onChange={setEvents} mode="report" onOpen={() => go('Eğitim ve Etkinlikler')} ready={loaded} />}
              {view === '__legacy_reports__' && <PlanReportQueue onOpen={go} />}
              {view === '__legacy_reports__' && <ActivityOutputs tasks={tasks} events={events} />}
              {view === 'Faaliyet Planı' && <ActivityPlan onOpen={go} />}
              {view === '__legacy_reports__' && (
                <section className="card detail-card">
                  <h2>
                    <ChartColumn />
                    Aylık faaliyet özeti
                  </h2>
                  <div className="notice">
                    Örnek verilerden üretilir. YEĞİTEK modülüne bağlantı ve
                    resmî rapor gönderimi bu prototipte yoktur.
                  </div>
                  <dl className="report">
                    <dt>Faaliyet</dt>
                    <dd>
                      ESEP/eTwinning örnek kullanıcı ve okul kayıtlarının
                      incelenmesi
                    </dd>
                    <dt>Kontrol edilen kayıt</dt>
                    <dd>
                      {state.records.filter((r) => r.reviewed).length} /{' '}
                      {state.records.length}
                    </dd>
                    <dt>Süreç durumu</dt>
                    <dd>{stages[state.stage]}</dd>
                    <dt>Sonuç</dt>
                    <dd>{state.result || 'Henüz sonuç kaydedilmedi.'}</dd>
                    <dt>Kanıt</dt>
                    <dd>
                      {state.packet
                        ? 'Merkez listesi, e-posta taslağı ve işlem geçmişi'
                        : 'Taslak henüz oluşturulmadı.'}
                    </dd>
                  </dl>
                  <div className="actions">
                    <button
                      className="primary"
                      onClick={() =>
                        download(
                          'REFIKA-ornek-faaliyet-ozeti.txt',
                          `REFİKA — ÖRNEK FAALİYET ÖZETİ\nFaaliyet: ESEP/eTwinning kayıt incelemesi\nBenzersiz talep sayısı: ${state.records.length}\nHazırlanan gönderim sayısı: ${state.packets.length}\nGönderimlerdeki toplam talep: ${state.packets.reduce((n,p) => n+p.count,0)}\nSonucu kaydedilen gönderim talepleri: ${state.packets.reduce((n,p) => n+Object.keys(p.results).length,0)}\nDurum: ${stages[state.stage]}\nSonuç: ${state.result || 'Bekleniyor'}\n\nİŞLEM GEÇMİŞİ\n${state.history.map((h) => new Date(h.at).toLocaleString('tr-TR') + ' — ' + h.message).join('\n')}\n\nBu belge prototip çıktısıdır; resmî gönderim yapılmamıştır.`,
                        )
                      }
                    >
                      Özeti indir <Download size={17} />
                    </button>
                    <button
                      className="secondary"
                      onClick={() => go('Sonuç Takibi')}
                    >
                      Sonuç takibi
                    </button>
                    <button
                      className="text-link"
                      onClick={() => go('İşlem Geçmişi')}
                    >
                      İşlem geçmişini gör
                    </button>
                  </div>
                </section>
              )}
              {view === 'İşlem Geçmişi' && (
                <section className="card detail-card">
                  <h2>
                    <History />
                    İşlem geçmişi
                  </h2>
                  {state.history.length ? (
                    <ol className="history-list">
                      {state.history.map((h, i) => (
                        <li key={i}>
                          <span className="history-dot" />
                          <div>
                            <p>{h.message}</p>
                            <small>
                              {new Date(h.at).toLocaleString('tr-TR')}
                            </small>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="empty">
                      Henüz işlem yok. Validasyon kayıtlarını inceleyerek
                      başlayın.
                    </div>
                  )}
                  <button
                    className="secondary"
                    onClick={() => setModal({ type: 'reset' })}
                  >
                    <RotateCcw size={16} /> Örnek akışı sıfırla
                  </button>
                </section>
              )}
              {view === 'Güncel Kaynaklar' && (
                <OfficialResourcesWorkspace />
              )}
              {view === 'Soru Havuzu' && <QuestionPoolWorkspace questions={questions} onChange={setQuestions} seed={questionSeed} download={download} />}
              {(view === 'Okul Ziyaretleri' || view === 'Takvimim') && <VisitWorkspace tasks={tasks} onChange={setTasks} mode={view === 'Takvimim' ? 'calendar' : 'visits'} onOpen={() => go('Okul Ziyaretleri')} onReport={() => go('Raporlar ve Yazışmalar')} ready={loaded} />}
              {(view === 'Eğitim ve Etkinlikler' || view === 'Takvimim') && <EventWorkspace events={events} onChange={setEvents} mode={view === 'Takvimim' ? 'calendar' : 'events'} onOpen={() => go('Eğitim ve Etkinlikler')} ready={loaded} />}
              {view === 'Rehberlik ve Mentörlük' && <MentorshipWorkspace items={supports} onChange={setSupports} mentors={mentors} onMentorsChange={setMentors} group={mentorGroup} onGroupChange={setMentorGroup} ready={loaded} />}
              {view === 'Projeler ve TwinSpace' && <ProjectWorkspace projects={projects} onChange={setProjects} services={projectServices} onServicesChange={setProjectServices} ready={loaded} />}
              {view === 'Kalite Etiketleri' && <QualityLabelWorkspace />}
              {view === 'Destek Köprüsü' && <SupportBridgeWorkspace />}
              {areas.slice(2, 7).filter((a) => !['Eğitim ve Etkinlikler','Rehberlik ve Mentörlük','Projeler ve TwinSpace','Kalite Etiketleri','Destek Köprüsü'].includes(a[0])).some((a) => a[0] === view) && (
                <section className="card detail-card">
                  <h2>{view}</h2>
                  <div className="empty">
                    <CalendarDays />
                    <h3>
                      {view === 'Destek Köprüsü'
                        ? 'Yetkilendirilmiş ortak çalışmalar'
                        : 'Bu alan sonraki prototip adımında'}
                    </h3>
                    <p>
                      {view === 'Destek Köprüsü'
                        ? 'Şanlıurfa ve Kahramanmaraş destek köprüsü örnek iş birliği kapsamındadır. Canlı sürümde yalnızca ayrıca yetki verilen ortak kayıtlara erişilir; diğer illerin kayıtları açılmaz.'
                        : view === 'Takvimim'
                          ? 'Ziyaretler, eğitimler ve toplantılar bu alanda planlanacak. Şu anda kayıtlı etkinlik yok.'
                          : areas
                              .find((a) => a[0] === view)
                              ?.slice(2)
                              .join(' · ')}
                    </p>
                    <p>
                      İlk çalışan süreç: kayıt inceleme → taslak → onay → sonuç
                      → rapor.
                    </p>
                    <button
                      className="primary"
                      onClick={() => go('Kayıt ve Validasyon')}
                    >
                      Validasyon akışını dene <ArrowRight size={17} />
                    </button>
                  </div>
                </section>
              )}
              {officialResources.some(source => source.areas.includes(view)) && view !== 'Kalite Etiketleri' && (
                <section className="card detail-card task-sources">
                  <h2><BookOpen /> Bu görev için resmî kaynaklar</h2>
                  <SourceCards items={officialResources.filter(source => source.areas.includes(view))} />
                  {view === 'Kalite Etiketleri' && <div className="quality-checklist">
                    <h3>Başvuruya hazırlık kontrol listesi</h3>
                    <p>Ulusal Kalite Etiketi sayfasındaki beş ön koşula dayanır; resmî değerlendirme sonucu değildir.</p>
                    {qualityChecklist.map(item => <label className="check-label" key={item}><input type="checkbox" />{item}</label>)}
                    <small>İşaretler yalnızca bu ekran açıkken tutulur. Başvuru öncesinde kaynaktaki güncel koşulları kontrol edin.</small>
                  </div>}
                </section>
              )}
              {storageError && <p role="alert" className="notice">{storageError}</p>}
              <footer className="workspace-footer">
                REFİKA hazırlar ve önerir; koordinatör karar verir.
                <small>
                  Demo kayıtları bu tarayıcıda saklanır. Ortak cihazda işiniz bittiğinde örnek akışı sıfırlayın.
                </small>
              </footer>
            </main>
          </div>
        </div>
      )}
      {modal && (
        <Dialog
          title={
            modal.type === 'record'
              ? `${modal.record.name} · Kayıt inceleme`
              : modal.type === 'approve'
                ? 'Koordinatör onayı'
                : modal.type === 'reset'
                  ? 'Örnek akışı sıfırla'
                  : modal.title
          }
          onClose={() => {
            setModal(null);
            setError('');
          }}
        >
          {modal.type === 'info' && (
            <>
              <p className="dialog-copy">{modal.text}</p>
              <button className="primary" onClick={() => setModal(null)}>
                Anladım
              </button>
            </>
          )}
          {modal.type === 'record' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  dispatch({
                    type: 'review',
                    id: modal.record.id,
                    school,
                    record: requestDraft,
                    confirmed,
                  })
                ) {
                  setModal(null);
                  notify('Kayıt kontrolü tamamlandı.');
                }
              }}
            >
              <div className="notice">
                <Info />
                <span>
                  {modal.record.issue || 'Örnek kayıt kontrolü tamamlanmış.'}
                </span>
              </div>
              <dl className="report">
                <dt>Kayıt</dt>
                <dd>
                  {modal.record.id} · {modal.record.type}
                </dd>
                <dt>İlçe</dt>
                <dd>{modal.record.district}</dd>
                <dt>Örnek adres</dt>
                <dd>{modal.record.email}</dd>
              </dl>
              <RequestFields record={requestDraft} onChange={setRequestDraft} locked={state.stage !== 'review' || !modal.record.queued || modal.record.deliveries.length > 0} includeSchool={false} />
              {modal.record.deliveries.length > 0 && <details><summary>Gönderim geçmişi · {modal.record.id}</summary><ol>{modal.record.deliveries.map((delivery, index) => <li key={index}>{new Date(delivery.at).toLocaleString('tr-TR')} · Deneme · {delivery.reason}</li>)}</ol><p>Gönderilmiş talebin içeriği korunur. Farklı işlem için yeni talep oluşturun.</p></details>}
              <label className="field">
                Okul adı
                <input
                  required
                  value={school}
                  disabled={state.stage !== 'review' || !modal.record.queued || modal.record.deliveries.length > 0}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="Örnek okul adı"
                />
              </label>
              <p className="muted">
                Düzeltme yönlendirmesi:{' '}
                {modal.record.type === 'Okul'
                  ? 'Kurum adını ve eşleşen okul kaydını kontrol edin.'
                  : 'Öğretmenden okul bilgisini tamamlamasını isteyin.'}{' '}
                Bu prototipte örnek okul adı girerek ilerleyin.
              </p>
              {state.stage === 'review' && modal.record.queued && (
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  Örnek kaydı kontrol ettim. Bu işlem resmî validasyon kararı
                  değildir.
                </label>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="actions">
                {state.stage === 'review' && modal.record.queued && (
                  <button className="primary" disabled={!confirmed}>
                    Kontrolü kaydet <Check size={17} />
                  </button>
                )}
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setModal(null)}
                >
                  Kapat
                </button>
              </div>
            </form>
          )}
          {modal.type === 'create' && <form onSubmit={e => { e.preventDefault(); if (dispatch({ type: 'create', record: requestDraft })) { setModal(null); notify('Yeni talep numarası oluşturuldu. Talebi inceleyerek devam edin.'); } }}>
            <p className="notice">Prototip denemesidir. Örnek bilgiler kullanın. Talep numarası kayıtta atanır; gerçek veri gönderilmez.</p>
            <RequestFields record={requestDraft} onChange={setRequestDraft} />
            {error && <p className="error" role="alert">{error}</p>}
            <div className="actions"><button className="primary">Talebi kaydet <Save size={17} /></button><button type="button" className="secondary" onClick={() => setModal(null)}>Vazgeç</button></div>
          </form>}
          {modal.type === 'repeat' && <form onSubmit={e => { e.preventDefault(); if (dispatch({ type: 'repeat', id: modal.record.id, reason: repeatReason })) { setModal(null); go('Kayıt ve Validasyon'); notify('Aynı talep tekrar inceleme sırasına alındı. Henüz gönderilmedi.'); } }}>
            <p>{modal.record.id} · {requestTypes[modal.record.requestType]} · {modal.record.name}</p>
            <p>Talep numarası ve içeriği korunur. Liste ve e-posta yeniden hazırlanıp koordinatör onayına sunulur.</p>
            <label className="field">Tekrar gönderim gerekçesi<textarea required rows={3} value={repeatReason} onChange={e => setRepeatReason(e.target.value)} /></label>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="actions"><button className="primary">İnceleme sırasına al</button><button type="button" className="secondary" onClick={() => setModal(null)}>Vazgeç</button></div>
          </form>}
          {modal.type === 'approve' && (
            <>
              <div className="notice">
                Bu onay yalnızca ekranda incelediğiniz validasyon listesi ve e-posta taslağı içindir.
                Gerçek mesaj veya veri gönderilmez.
              </div>
              <dl className="report">
                <dt>Alıcı</dt>
                <dd>{state.packet?.recipient}</dd>
                <dt>Ek</dt>
                <dd>Merkez listesi · {state.packet?.count} örnek kayıt</dd>
                <dt>Konu</dt>
                <dd>{state.packet?.subject}</dd>
              </dl>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Alıcıyı, listeyi ve e-posta metnini inceledim; deneme
                gönderimini onaylıyorum.
              </label>
              <div className="actions">
                <button
                  disabled={!confirmed}
                  className="primary"
                  onClick={() => {
                    if (dispatch({ type: 'approve', confirmed })) {
                      setModal(null);
                      go('Sonuç Takibi');
                      notify(
                        'Koordinatör onayı kaydedildi. Gönderim yalnızca simüle edildi.',
                      );
                    }
                  }}
                >
                  Onayla ve gönderimi simüle et <Send size={17} />
                </button>
                <button className="secondary" onClick={() => setModal(null)}>
                  Vazgeç
                </button>
              </div>
            </>
          )}
          {modal.type === 'reset' && (
            <>
              <p>
                Bu tarayıcıdaki demo kayıtları, hesap incelemesi, taslak ve işlem geçmişi başlangıç
                durumuna dönecek.
              </p>
              <div className="actions">
                <button
                  className="primary"
                  onClick={() => {
                    setState(initialState());
                    setTasks([]);
                    setEvents([]);
                    setSubject('');
                    setBody('');
                    setAccountReview(initialAccountReview());
                    setLoaded(true);
                    setModal(null);
                    go('Çalışma Masam');
                  }}
                >
                  Örnek akışı sıfırla
                </button>
                <button className="secondary" onClick={() => setModal(null)}>
                  Vazgeç
                </button>
              </div>
            </>
          )}
        </Dialog>
      )}
      {toast && (
        <output className="toast">
          <Check size={20} />
          {toast}
        </output>
      )}
    </>
  );
}
