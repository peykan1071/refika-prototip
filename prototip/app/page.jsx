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
import { loadDemo, saveDemo } from '../lib/storage.mjs';
import { initialAccountReview } from '../lib/account-review.mjs';
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
  const [requestDraft, setRequestDraft] = useState(blankRequest);
  const [repeatReason, setRepeatReason] = useState('');
  const [accountReview, setAccountReview] = useState(initialAccountReview);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState('');
  // Browser storage is an external system: restore after hydration, then persist edits.
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
    if (!active) return;
    try {
      const saved = loadDemo(localStorage);
      if (saved) { setState(saved.state); setAccountReview(saved.accountReview || initialAccountReview()); setSubject(saved.subject || ''); setBody(saved.body || ''); }
      setLoaded(true);
    } catch { setStorageError('Önceki demo kaydı okunamadı. Kayıt korunuyor; devam etmek için Örnek akışı sıfırla seçeneğini kullanın.'); }
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { saveDemo(localStorage, { state, accountReview, subject, body }); queueMicrotask(() => setStorageError('')); }
    catch { queueMicrotask(() => setStorageError('Tarayıcıya kayıt yapılamadı. Bu oturumdaki değişiklikler yenilemede kaybolabilir.')); }
  }, [loaded, state, accountReview, subject, body]);
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
    if (/valid|kayıt|hesap/i.test(command)) {
      go('Kayıt ve Validasyon');
      notify('Örnek validasyon kayıtları açıldı.');
    } else if (/rapor/i.test(command)) go('Raporlar ve Yazışmalar');
    else if (/ziyaret/i.test(command)) go('Okul Ziyaretleri');
    else
      setModal({
        type: 'info',
        title: 'REFİKA örnek görevleri',
        text: 'Bu prototipte “validasyonları hazırla”, “ziyaretleri planla” ve “aylık raporu oluştur” komutları ilgili çalışma alanını açar. Serbest metin yapay zekâ bağlantısı henüz etkin değildir.',
      });
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
                  notify('Paket incelemeniz için onay merkezine taşındı.');
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
        [BookOpen, 'Kaydı ve kuralı bul'],
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
          ['MEB', 'https://www.meb.gov.tr/'],
          ['YEĞİTEK', 'https://yegitek.meb.gov.tr/'],
          ['EBA', 'https://www.eba.gov.tr/'],
          ['ESEP', 'https://school-education.ec.europa.eu/en/etwinning'],
          ['eTwinning Türkiye', 'https://etwinning.meb.gov.tr/'],
        ].map(([name, url]) => (
          <a key={name} href={url} target="_blank" rel="noreferrer">
            {name}
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
                      defaultValue="koordinator@example.invalid"
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
                      defaultValue="refika-demo"
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
                Örnek hesap hazır. Gerçek şifrenizi kullanmayın.
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
            <strong className="tagline">Yol arkadaşınız.</strong>
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
                <span>{view}</span>
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
                    <small>Erzurum · Örnek hesap</small>
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
                          Validasyon çalışma alanı
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
                          onClick={() =>
                            go(
                              state.stage === 'review'
                                ? 'Kayıt ve Validasyon'
                                : state.stage === 'draft'
                                  ? 'Taslaklar'
                                  : 'Onay Merkezi',
                            )
                          }
                        >
                          Onaya sun <ArrowRight size={16} />
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
                          Onayınızı bekleyenler
                        </h2>
                        <span className="badge amber">
                          {state.stage === 'approval'
                            ? 'Onay bekliyor'
                            : state.stage === 'sent' ||
                                state.stage === 'complete'
                              ? 'Deneme tamamlandı'
                              : 'Gönderilmedi'}
                        </span>
                      </div>
                      <div className="approval-inner">
                        <span className="mail-circle">
                          <Mail />
                        </span>
                        <div>
                          <h3>Validasyon gönderim paketi</h3>
                          <p>Merkez listesi ve e-posta taslağı</p>
                          <small>
                            Alıcı, ekler ve paylaşılacak verileri inceleyin.
                          </small>
                          <div className="actions">
                            <button
                              className="primary"
                              onClick={() => go('Onay Merkezi')}
                            >
                              Paketi incele <ArrowRight size={18} />
                            </button>
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
                  <section className="card account-review-entry">
                    <div><span className="eyebrow">HESAP İNCELEME</span><h2>Örnek Öğretmen · İki profil, aynı okul</h2><p>Temsili iki hesap senaryosu. Kimlik, erişim ve proje geçmişini karşılaştırın.</p></div>
                    <button className="primary" onClick={() => go('Hesap İnceleme')}>Hesapları karşılaştır <ArrowRight size={18} /></button>
                  </section>
                  <div className="notice">
                    <BookOpen />
                    <span>
                      <b>Örnek kontrol rehberi:</b> Okul bilgisi ve kurum kaydı
                      kontrol edilir. Canlı yönerge doğrulaması yapılmamıştır;
                      bu inceleme resmî validasyon kararı değildir.
                    </span>
                  </div>
                  <section className="card">
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
                          Hazırlanan paketi aç
                        </button>
                      )}
                      <small className="muted">
                        {pending
                          ? 'Hazırlamadan önce eksik kayıtları inceleyin.'
                          : 'Tüm örnek kayıtlar kontrol edildi.'}
                      </small>
                    </div>
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
                      Gönderim paketi incelemesi
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
              {view === 'Raporlar ve Yazışmalar' && (
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
              {view === 'Raporlar ve Yazışmalar' && (
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
                          `REFİKA — ÖRNEK FAALİYET ÖZETİ\nFaaliyet: ESEP/eTwinning kayıt incelemesi\nBenzersiz talep sayısı: ${state.records.length}\nGönderim paketi sayısı: ${state.packets.length}\nGönderimlerdeki toplam talep: ${state.packets.reduce((n,p) => n+p.count,0)}\nSonucu kaydedilen gönderim talepleri: ${state.packets.reduce((n,p) => n+Object.keys(p.results).length,0)}\nDurum: ${stages[state.stage]}\nSonuç: ${state.result || 'Bekleniyor'}\n\nİŞLEM GEÇMİŞİ\n${state.history.map((h) => new Date(h.at).toLocaleString('tr-TR') + ' — ' + h.message).join('\n')}\n\nBu belge prototip çıktısıdır; resmî gönderim yapılmamıştır.`,
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
                <section className="card detail-card">
                  <h2>
                    <BookOpen />
                    Resmî kaynaklara erişim
                  </h2>
                  {resources}
                  <h3>eTwinning Türkiye · Göreve göre kaynaklar</h3>
                  <SourceCards items={officialResources} />
                  <div className="notice">
                    Dış bağlantılar resmî sayfaları açar. REFİKA bu sürümde
                    kaynakları otomatik taramaz veya güncel kural doğrulaması
                    yapmaz.
                  </div>
                </section>
              )}
              {(view === 'Takvimim' ||
                areas.slice(1, 7).some((a) => a[0] === view)) && (
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
              {officialResources.some(source => source.areas.includes(view)) && (
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
                Bu onay yalnızca ekranda incelediğiniz örnek paket içindir.
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
