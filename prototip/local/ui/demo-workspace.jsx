import { useState } from 'react';
import { validationWorkItems } from '../validation.mjs';
import { InventoryReminder } from './inventory.jsx';
import {
  House,
  CalendarDays,
  ClipboardCheck,
  Users,
  Network,
  GraduationCap,
  Award,
  FileText,
  BookOpen,
  BarChart3,
  ListChecks,
  History,
  FolderInput,
  Settings,
  HardDrive,
  Menu,
  X,
  ArrowRight,
  Sparkles,
  Search,
  Pencil,
  CheckCircle2,
  Save,
  Cloud,
  ShieldCheck,
  LockKeyhole,
  Mail,
  Info,
} from 'lucide-react';

// Keep the navigation names and visual hierarchy of app/page.jsx.
const navigation = [
  ['home', 'Çalışma Masam', House],
  ['activities', 'Faaliyet Planı', CalendarDays],
  ['records', 'Kayıt ve Validasyon', ClipboardCheck],
  ['visits', 'Okul Ziyaretleri', CalendarDays],
  ['mentors', 'Rehberlik ve Mentörlük', Users, true],
  ['projects', 'Projeler ve TwinSpace', Network, true],
  ['events', 'Eğitim ve Etkinlikler', GraduationCap],
  ['quality', 'Kalite Etiketleri', Award, true],
  ['bridge', 'Destek Köprüsü', Network, true],
  ['reports', 'Raporlar ve Yazışmalar', FileText],
  ['sources', 'Resmî Kaynaklar', BookOpen, true],
  ['questions', 'Soru Havuzu', BarChart3, true],
  ['results', 'Sonuç Takibi', ListChecks],
];
const tools = [
  ['approval', 'Onay Merkezi', ShieldCheck],
  ['drafts', 'Taslaklar', Mail],
  ['import', 'Veri aktar', FolderInput],
  ['history', 'İşlem Geçmişi', History],
  ['settings', 'Ayarlar ve yedek', Settings],
];
const dateLabel = (value) =>
  new Date(value + 'T12:00:00').toLocaleDateString('tr-TR');

export function DemoShell({ state, view, go, children }) {
  const [mobile, setMobile] = useState(false);
  const province = state.provinces[Number(state.settings.province) - 1];
  const selected = [...navigation, ...tools].find(([key]) => key === view)?.[1];
  function open(key) {
    go(key);
    setMobile(false);
  }
  function buttons(items) {
    return items.map(([key, label, Icon, pending]) => (
      <button
        key={key}
        className={view === key ? 'active' : ''}
        aria-current={view === key ? 'page' : undefined}
        disabled={pending}
        title={
          pending
            ? 'Bu bölüm bu pilot sürümde henüz kullanıma açılmadı.'
            : undefined
        }
        onClick={() => open(key)}
      >
        <Icon size={23} />
        <span>{label}</span>
        {pending && <small>Yakında</small>}
      </button>
    ));
  }
  return (
    <div className="demo-shell">
      <aside
        id="main-navigation"
        className={'sidebar' + (mobile ? ' open' : '')}
      >
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
          <button
            className="close-menu"
            aria-label="Menüyü kapat"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Ana menü">
          {buttons(navigation)}
          <hr />
          {buttons(tools)}
        </nav>
        <div className="sidebar-art" aria-hidden="true" />
        <div className="sidebar-local">
          <HardDrive size={16} />
          <span>
            {province} · {state.settings.year}
            <small>Bu bilgisayarda kayıt</small>
          </span>
        </div>
      </aside>
      {mobile && (
        <button
          className="menu-backdrop"
          aria-label="Menüyü kapat"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="menu-toggle"
              aria-label="Menü"
              aria-expanded={mobile}
              aria-controls="main-navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
            <b>REFİKA</b>
            <span>/</span>
            <span>{selected}</span>
          </div>
          <div className="top-actions">
            <span className="local-scope">
              <HardDrive size={19} /> Yerel çalışma alanı
            </span>
            <button className="profile" onClick={() => open('settings')}>
              <Users size={23} />
              <span>
                <b>İl Koordinatörü</b>
                <small>
                  {state.settings.operator} · {province}
                </small>
              </span>
            </button>
          </div>
        </header>
        {children}
        <footer className="workspace-footer">
          REFİKA hazırlar ve önerir; koordinatör karar verir.
        </footer>
      </div>
    </div>
  );
}

export function HistoryWorkspace({ state, compact = false }) {
  return (
    <section className="panel">
      <div className="section-head">
        <h2>
          <History size={21} />
          {compact ? 'Son işlemler' : 'İşlem Geçmişi'}
        </h2>
      </div>
      {state.history.length ? (
        <ul className="history">
          {state.history.slice(0, compact ? 5 : 100).map((h) => (
            <li key={h.id}>
              <CheckCircle2 size={17} />
              <span>{h.message}</span>
              <time>{new Date(h.at).toLocaleString('tr-TR')}</time>
            </li>
          ))}
        </ul>
      ) : (
        <p>Kaydettiğiniz işlemler burada görünecek.</p>
      )}
    </section>
  );
}

export function DemoDashboard({ state, go }) {
  const [command, setCommand] = useState(''),
    [hint, setHint] = useState('');
  const today = new Date().toLocaleDateString('en-CA');
  const planned = state.activities
    .filter((a) => a.status === 'planned')
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const completed = state.activities.filter((a) => a.status === 'completed');
  const workItems = validationWorkItems(state);
  const review = workItems.filter((r) => r.status === 'review');
  const waiting = (state.validationCases || []).filter(
    (r) => r.status === 'waiting',
  );
  const ready = (state.validationCases || []).filter(
    (r) => r.status === 'ready' && !r.sourceChanged,
  );
  const approvals = ready.filter((r) => r.draftStage === 'approval');
  const metrics = [
    [
      planned.filter((a) => a.startDate <= today && a.endDate >= today).length,
      'Bugünkü faaliyet',
      CalendarDays,
      'activities',
    ],
    [
      planned.filter((a) => a.kind === 'Okul ziyareti').length,
      'Planlanan ziyaret',
      CalendarDays,
      'visits',
    ],
    [
      planned.filter((a) => ['Eğitim', 'Webinar', 'Toplantı'].includes(a.kind))
        .length,
      'Planlanan etkinlik',
      GraduationCap,
      'events',
    ],
    [review.length, 'Validasyon incelemesi', ClipboardCheck, 'records'],
    [approvals.length, 'Gönderim öncesi kontrol', ShieldCheck, 'approval'],
    [
      waiting.length,
      'Sonucu beklenen dosya',
      ListChecks,
      'results',
      { filter: 'waiting' },
    ],
    [completed.length, 'Tamamlanan faaliyet', FileText, 'reports'],
  ];
  const actions = [
    ...(approvals.length
      ? [
          {
            id: 'approval',
            label: 'Onay bekliyor',
            title: `${approvals.length} talep gönderim öncesi kontrol bekliyor`,
            detail: 'Alıcı, metin ve kanıtları inceleyin.',
            target: 'approval',
            button: 'Listeyi ve e-postayı incele',
          },
        ]
      : ready.length
        ? [
            {
              id: 'draft',
              label: 'Taslak hazırlığı',
              title: `${ready.length} talep için liste ve e-posta`,
              detail: 'Kontrol edilen taleplerin yazışmalarını hazırlayın.',
              target: 'drafts',
              button: 'Taslakları incele',
            },
          ]
        : []),
    ...(review.length
      ? [
          {
            id: 'review',
            label: 'İnceleme',
            title: `${review.length} validasyon kaydı inceleme bekliyor`,
            detail:
              'Kaynak bilgilerini kontrol edin ve inceleme notunuzu kaydedin.',
            target: 'records',
            button: 'Kayıtları aç',
          },
        ]
      : []),
    ...(waiting.length
      ? [
          {
            id: 'waiting',
            label: 'Sonuç takibi',
            title: `${waiting.length} dosyanın sonucu bekleniyor`,
            detail:
              'Gönderilen talepleri açın, gelen yanıt ve onayları kaydedin.',
            target: 'results',
            options: { filter: 'waiting' },
            button: 'Bekleyen dosyaları aç',
          },
        ]
      : []),
    ...planned.slice(0, 3).map((a) => ({
      id: a.id,
      label: a.endDate < today ? 'Sonuç kontrolü' : 'Planlanan çalışma',
      title: a.title,
      detail: `${dateLabel(a.startDate)} · ${a.kind}`,
      target: a.kind === 'Okul ziyareti' ? 'visits' : 'activities',
      button: 'Planı aç',
    })),
  ];
  function openCommand(e) {
    e.preventDefault();
    const text = command.toLocaleLowerCase('tr');
    const target = /aktar|dosya|excel|csv/.test(text)
      ? 'import'
      : /valid|kayıt|hesap/.test(text)
        ? 'records'
        : /rapor/.test(text)
          ? 'reports'
          : /ziyaret/.test(text)
            ? 'visits'
            : /eğitim|etkinlik|webinar/.test(text)
              ? 'events'
              : /plan|faaliyet|takvim/.test(text)
                ? 'activities'
                : /yedek|ayar/.test(text)
                  ? 'settings'
                  : null;
    if (target) {
      go(target);
      setCommand('');
    } else
      setHint(
        'Faaliyet planı, validasyon, ziyaret, eğitim, rapor veya yedek yazarak ilgili ekranı açabilirsiniz.',
      );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Koordinatör çalışma masam</h1>
          <p>
            Günün işlerini planlayın, taslakları inceleyin, süreçleri takip
            edin.
          </p>
        </div>
        <span className="badge pilot-badge">YEREL ÇALIŞMA ALANI</span>
      </div>
      <InventoryReminder
        reminders={state.inventoryReminders}
        open={() => go('records', { workspace: 'inventory' })}
      />
      <section
        className="coordinator-dashboard"
        aria-labelledby="daily-work-title"
      >
        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">FAALİYET PLANI VE GÜNLÜK DURUM</span>
            <h2 id="daily-work-title">Bugün neye odaklanmalıyım?</h2>
          </div>
          <button onClick={() => go('reports')}>Faaliyet özetini aç</button>
        </div>
        <div className="metric-grid">
          {metrics.map(([value, label, Icon, target, options]) => (
            <button
              className="metric-card"
              key={label}
              onClick={() => go(target, options)}
            >
              <Icon aria-hidden="true" />
              <span>
                <strong>{value}</strong>
                <small>{label}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="priority-panel">
          <div className="priority-heading">
            <h3>Öncelikli işler</h3>
            <span>
              {review.length + planned.length + ready.length + waiting.length}{' '}
              bekleyen kayıt / faaliyet
            </span>
          </div>
          {actions.length ? (
            <ul className="priority-list">
              {actions.map((a) => (
                <li key={a.id}>
                  <span className="priority-mark" />
                  <div>
                    <small>{a.label}</small>
                    <strong>{a.title}</strong>
                    <p>{a.detail}</p>
                  </div>
                  <button onClick={() => go(a.target, a.options)}>
                    {a.button}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="dashboard-empty">
              <strong>Çalışma alanınız hazır.</strong>
              <p>
                Listenizi aktararak veya ilk faaliyetinizi planlayarak
                başlayabilirsiniz.
              </p>
              <div className="actions">
                <button className="primary" onClick={() => go('import')}>
                  Verilerimi aktar <ArrowRight size={17} />
                </button>
                <button onClick={() => go('activities')}>
                  Faaliyet planla
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      <form className="assistant-bar" onSubmit={openCommand}>
        <Sparkles size={22} />
        <input
          required
          aria-label="REFİKA görevi"
          placeholder="REFİKA, bugün ne hazırlayalım?"
          value={command}
          onChange={(e) => {
            setCommand(e.target.value);
            setHint('');
          }}
        />
        <button className="primary">
          Görevi başlat <ArrowRight size={20} />
        </button>
      </form>
      <output className="command-hint">
        {hint ||
          'İlgili çalışma ekranını açar. Örneğin: “faaliyet planı”, “validasyon” veya “rapor”.'}
      </output>
      <div className="quick-actions">
        {[
          ['records', 'Validasyonları hazırla', ClipboardCheck],
          ['visits', 'Ziyaretleri planla', CalendarDays],
          ['events', 'Eğitim ve etkinlik planla', GraduationCap],
          ['reports', 'Aylık raporu oluştur', FileText],
        ].map(([target, label, Icon]) => (
          <button key={target} onClick={() => go(target)}>
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>
      <div className="workflow" aria-label="REFİKA çalışma adımları">
        {[
          [Search, 'Görevi algıla'],
          [BookOpen, 'ESEP kaydını ve kuralı kontrol et'],
          [ListChecks, 'Adımları sırala'],
          [Pencil, 'Taslağı hazırla'],
          [LockKeyhole, 'Onayla ve uygula'],
          [Save, 'Sonucu kaydet'],
          [BarChart3, 'Raporla'],
        ].map(([Icon, label], i) => (
          <div
            className={'step' + (i === 4 ? ' approval-step' : '')}
            key={label}
          >
            <span>
              <Icon size={23} />
            </span>
            <small>{label}</small>
            {i < 6 && <ArrowRight className="step-arrow" size={18} />}
          </div>
        ))}
      </div>
      <div className="work-grid">
        <section className="panel">
          <div className="section-head">
            <h2>
              <ClipboardCheck size={23} />
              Kayıt ve validasyon
            </h2>
            <span className="badge">{workItems.length} kayıt / dosya</span>
          </div>
          <div className="tabs">
            <button className="selected" onClick={() => go('records')}>
              Bekleyen hesaplar
            </button>
            <button onClick={() => go('records', { filter: 'issues' })}>
              Eksik / şüpheli
            </button>
            <button onClick={() => go('drafts')}>Merkez listesi</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kayıt</th>
                  <th>Durum</th>
                  <th>Gerekli düzeltme</th>
                </tr>
              </thead>
              <tbody>
                {review.slice(0, 2).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="record-name">
                        <Users size={16} />
                        {r.name || r.title}
                      </span>
                      <small>{r.accountId || r.id.slice(0, 8)}</small>
                    </td>
                    <td>
                      <span className="badge review">İnceleme bekliyor</span>
                    </td>
                    <td>
                      {r.holdReason || r.school || 'Kontrol bilgisi gerekli'}
                      <button
                        className="text-button"
                        onClick={() => go('records')}
                      >
                        İncele
                        <ArrowRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!review.length && (
              <p className="muted" style={{ padding: '12px' }}>
                Bekleyen kayıt yok. ESEP listenizi aktararak başlayabilirsiniz.
              </p>
            )}
          </div>
          <div className="document-chips">
            <button onClick={() => go('drafts')}>
              <FileText size={16} />
              Merkez listesi · Taslak
            </button>
            <button onClick={() => go('drafts')}>
              <Mail size={16} />
              E-posta · Taslak
            </button>
          </div>
          <div className="actions">
            <button onClick={() => go('drafts')}>Taslakları incele</button>
            <button className="primary" onClick={() => go('records')}>
              Kayıtları incele <ArrowRight size={17} />
            </button>
          </div>
          <p className="card-note">
            <Info />
            Gönderim tarihi, durum ve sonuç takip listesine kaydedilir.
          </p>
        </section>
        <section className="panel approval-card">
          <div className="section-head">
            <h2>
              <LockKeyhole size={23} />
              Gönderim öncesi kontrol
            </h2>
            <span className="badge pilot-badge">
              {approvals.length
                ? 'Onay bekliyor'
                : ready.length
                  ? 'Taslak hazırlığı'
                  : 'İnceleme'}
            </span>
          </div>
          <div className="approval-inner">
            <span className="mail-circle">
              <Mail />
            </span>
            <div>
              <h3>Validasyon listesi ve e-posta taslağı</h3>
              <p>
                {approvals.length
                  ? 'Gönderilecek metni ve alıcıyı kontrol edin.'
                  : ready.length
                    ? 'Kontrol edilen kayıtların taslaklarını inceleyin.'
                    : 'Kayıt incelemesi tamamlanınca liste ve e-posta hazırlanabilir.'}
              </p>
              <div className="actions">
                <button
                  className="primary"
                  onClick={() =>
                    go(
                      approvals.length
                        ? 'approval'
                        : ready.length
                          ? 'drafts'
                          : 'records',
                    )
                  }
                >
                  {approvals.length
                    ? 'Listeyi ve e-postayı incele'
                    : ready.length
                      ? 'Taslakları incele'
                      : 'Kayıtları incele'}{' '}
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </div>
          <p className="card-note">
            <Info />
            Koordinatör kontrol eder; gerçekleşen gönderim ve resmî sonuç ayrı
            kaydedilir.
          </p>
        </section>
      </div>
      <h2 className="section-label">Çalışma alanlarım</h2>
      <div className="area-grid">
        {[
          [
            'activities',
            'Faaliyet Planı',
            CalendarDays,
            'Plan, gerçekleşme ve kanıt',
          ],
          [
            'records',
            'Kayıt ve Validasyon',
            ClipboardCheck,
            'Öğretmen ve okul kontrolü',
          ],
          [
            'visits',
            'Okul Ziyaretleri',
            CalendarDays,
            'Ziyaret planı ve sonuçları',
          ],
          [
            'mentors',
            'Rehberlik ve Mentörlük',
            Users,
            'Öğretmen ve yönetici desteği',
          ],
          [
            'projects',
            'Projeler ve TwinSpace',
            Network,
            'Fikir geliştirme, ortak bulma',
          ],
          [
            'events',
            'Eğitim ve Etkinlikler',
            GraduationCap,
            'Eğitim, webinar ve toplantı',
          ],
          ['quality', 'Kalite Etiketleri', Award, 'Ulusal / Avrupa rehberliği'],
          ['bridge', 'Destek Köprüsü', Network, 'İller arası ortak çalışmalar'],
          [
            'reports',
            'Raporlar ve Yazışmalar',
            FileText,
            'Rapor arşivi, yeni rapor ve dönem özeti',
          ],
        ].map(([target, label, Icon, detail]) => (
          <button
            className="area-card"
            key={target}
            disabled={navigation.find(([key]) => key === target)?.[3]}
            onClick={() => go(target)}
          >
            <Icon />
            <span>
              <b>{label}</b>
              <small>{detail}</small>
              {navigation.find(([key]) => key === target)?.[3] && (
                <small>Yerel bağlantısı hazırlanacak</small>
              )}
            </span>
          </button>
        ))}
      </div>
      <div className="classic-bottom-grid">
        <section className="panel">
          <h2>
            <CalendarDays />
            Takvimim
          </h2>
          <p>Ziyaret ve eğitim planları</p>
          <p>{planned.length} planlanan faaliyet</p>
          <button onClick={() => go('activities')}>
            Takvimi aç
            <ArrowRight size={17} />
          </button>
        </section>
        <section className="panel">
          <h2>
            <BookOpen />
            Resmî Kaynaklar
          </h2>
          <p>İşlem öncesi güncel bilgiyi resmî kaynaktan kontrol edin.</p>
          <p>
            <a
              href="https://etwinning.meb.gov.tr/"
              target="_blank"
              rel="noreferrer"
            >
              eTwinning Türkiye
            </a>
          </p>
          <a
            href="https://school-education.ec.europa.eu/en/etwinning"
            target="_blank"
            rel="noreferrer"
          >
            Avrupa platformu
          </a>
        </section>
        <section className="panel">
          <h2>
            <FileText />
            İşlemden rapora
          </h2>
          <p>Gerçekleşen faaliyetleri, katılımı ve kanıtları rapora aktarın.</p>
          <button onClick={() => go('reports')}>
            Raporları aç
            <ArrowRight size={17} />
          </button>
        </section>
      </div>
      <div className="dashboard-bottom">
        <HistoryWorkspace state={state} compact />
        <section className="panel">
          <h2>Bağlantılarınız</h2>
          <div className="connection">
            <HardDrive />
            <div>
              <b>Bu bilgisayarda kayıt</b>
              <p>Kayıtlar ve kanıt dosyaları kalıcı olarak saklanır.</p>
            </div>
          </div>
          <div className="connection">
            <Cloud />
            <div>
              <b>Merkez bağlantısı</b>
              <p>
                {state.center.configured
                  ? state.shareSummary
                    ? 'Özet paylaşımı açık.'
                    : 'Özet paylaşımı kapalı.'
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
                  : 'Model bağlantısı henüz kurulmadı.'}
              </p>
            </div>
          </div>
          <button onClick={() => go('settings')}>
            Bağlantılar ve yedekleme
          </button>
        </section>
      </div>
      <p className="footnote">
        Toplam katılım, faaliyetlerde bildirilen katılımların toplamıdır;
        benzersiz kişi sayısı değildir.
      </p>
    </>
  );
}
