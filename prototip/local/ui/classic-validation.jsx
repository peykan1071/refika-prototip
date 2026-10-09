import { useState, useRef, useEffect } from 'react';
import {
  Search,
  ExternalLink,
  ShieldCheck,
  ListChecks,
  Mail,
  BookOpen,
  ArrowRight,
  Users,
  ChevronRight,
  Download,
  FileText,
} from 'lucide-react';
import {
  caseKinds,
  caseStatuses,
  caseGroups,
  caseGroup,
  validationWorkItems,
} from '../validation.mjs';
import { ValidationWorkspace, sourceCase } from './validation-workspace.jsx';
import { ValidationPeriods } from './validation-periods.jsx';
import {
  useTablePage,
  TablePagination,
  TableOrder,
} from './table-pagination.jsx';
import './classic-workspace.css';

function CaseDialog({ editor, state, api, fileData, run, busy, close }) {
  const ref = useRef(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    ref.current?.showModal();
    ref.current?.focus();
    if (ref.current) ref.current.scrollTop = 0;
  }, []);
  function editorRun(fn, message) {
    setError('');
    setNotice('');
    return run(async () => {
      try {
        await fn();
        setNotice(message || '');
      } catch (e) {
        setError(e.message);
        throw e;
      }
    }, message);
  }
  return (
    <dialog
      className="classic-case-dialog"
      ref={ref}
      tabIndex={-1}
      aria-label={editor.row ? editor.row.title : 'Yeni validasyon talebi'}
      onCancel={(e) => {
        e.preventDefault();
        if (
          !busy &&
          (!dirty ||
            window.confirm(
              'Kaydedilmemiş değişiklikleri bırakarak kapatılsın mı?',
            ))
        )
          close();
      }}
    >
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <output className="success">{notice}</output>}
      <ValidationWorkspace
        state={state}
        run={editorRun}
        busy={busy}
        api={api}
        fileData={fileData}
        initialCase={editor.row || null}
        initialForm={editor.row ? null : sourceCase(editor.source)}
        initialSection={editor.section || 'review'}
        onClose={close}
        onDirtyChange={setDirty}
      />
    </dialog>
  );
}
export function ClassicValidation({
  state,
  run,
  busy,
  api,
  fileData,
  screen = 'records',
  initialFilter = 'all',
  go,
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(initialFilter);
  const [group, setGroup] = useState('all');
  const [order, setOrder] = useState('added');
  const [editor, setEditor] = useState(null);
  const [workspace, setWorkspace] = useState('requests');
  const cases = state.validationCases || [];
  const items = validationWorkItems(state);
  const pending = items.filter((r) => r.status === 'review' || r.sourceChanged);
  const ready = cases.filter((r) => r.status === 'ready' && !r.sourceChanged);
  const approvals = ready.filter((r) => r.draftStage === 'approval');
  const scope =
    screen === 'drafts'
      ? ready
      : screen === 'approval'
        ? approvals
        : screen === 'results'
          ? cases.filter((r) => ['waiting', 'completed'].includes(r.status))
          : items;
  const rows = scope.filter(
    (r) =>
      (filter !== 'issues' || r.status === 'review' || r.sourceChanged) &&
      (group === 'all' || (r.kind ? caseGroup(r) : 'review') === group) &&
      [r.title, r.name, r.school, r.accountId, r.schoolId, r.id]
        .join(' ')
        .toLocaleLowerCase('tr')
        .includes(query.toLocaleLowerCase('tr')),
  );
  const page = useTablePage(
    rows,
    JSON.stringify([screen, filter, group, query, state.revision]),
    order,
  );
  const title = {
    records: 'Kayıt ve Validasyon',
    drafts: 'Taslaklar',
    approval: 'Onay Merkezi',
    results: 'Sonuç Takibi',
  }[screen];
  function open(row, section = 'review', prepare = false) {
    if (!row.kind) {
      setEditor({ source: row });
      return;
    }
    run(async () => {
      let detail = await api('/validation/' + row.id);
      if (prepare && !row.draftStage) {
        await api(`/validation/${row.id}/draft`, {
          version: detail.version,
          purpose: 'request',
        });
        detail = await api('/validation/' + row.id);
      }
      setEditor({ row: detail, section });
    });
  }
  function prepare() {
    go('drafts');
  }
  const first = pending[0] || items[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>
            {screen === 'records'
              ? 'Kayıtları inceleyin, liste ve e-postayı hazırlayın, süreçleri takip edin.'
              : screen === 'drafts'
                ? 'Kontrol edilen taleplerin merkez listesini ve e-posta taslaklarını hazırlayın.'
                : screen === 'approval'
                  ? 'Alıcıyı, e-posta metnini ve kanıtları gönderimden önce kontrol edin.'
                  : 'Gönderilen taleplerin yanıtlarını ve gerçek sonuçlarını kaydedin.'}
          </p>
        </div>
        <span className="badge pilot-badge">YEREL ÇALIŞMA ALANI</span>
      </div>
      {screen === 'records' && (
        <nav className="plan-tabs" aria-label="Validasyon çalışma alanları">
          <button
            aria-pressed={workspace === 'requests'}
            onClick={() => setWorkspace('requests')}
          >
            Validasyon talepleri
          </button>
          <button
            aria-pressed={workspace === 'periods'}
            onClick={() => setWorkspace('periods')}
          >
            Dönemlik kayıt listesi
          </button>
        </nav>
      )}
      {screen === 'records' && workspace === 'periods' ? (
        <ValidationPeriods
          state={state}
          api={api}
          run={run}
          busy={busy}
          openCase={(id) => {
            const row = cases.find((r) => r.id === id);
            if (row) open(row, 'results');
          }}
        />
      ) : (
        <>
          {screen === 'records' && (
            <>
              <ol
                className="validation-path"
                aria-label="Kayıt ve validasyon adımları"
              >
                {[
                  [
                    Search,
                    'Bekleyen kaydı aç',
                    () =>
                      document
                        .getElementById('validation-requests')
                        ?.scrollIntoView({ behavior: 'smooth' }),
                  ],
                  [
                    ExternalLink,
                    'ESEP’te kontrol et',
                    () =>
                      window.open(
                        'https://school-education.ec.europa.eu/en/nso-desktop/registrations/etwinners',
                        '_blank',
                        'noopener,noreferrer',
                      ),
                  ],
                  [
                    ShieldCheck,
                    'Kişi ve kurum teyidini kaydet',
                    () => first && open(first),
                    !first,
                  ],
                  [
                    ListChecks,
                    'İşlem türünü seç',
                    () => (first ? open(first) : setEditor({})),
                  ],
                  [Mail, 'Liste ve e-postayı hazırla', prepare, !ready.length],
                ].map(([Icon, label, action, disabled], index) => (
                  <li key={label}>
                    <button disabled={busy || disabled} onClick={action}>
                      <span className="validation-step-number">
                        {index + 1}
                      </span>
                      <Icon size={19} />
                      <b>{label}</b>
                    </button>
                  </li>
                ))}
              </ol>
              <p className="notice">
                <BookOpen size={20} />
                <span>
                  <b>ESEP kontrol köprüsü:</b> Koordinatör ESEP’te kişi ve okul
                  kaydını kontrol eder, dayanağını burada kaydeder; REFİKA uygun
                  talep taslağını hazırlar.
                </span>
              </p>
            </>
          )}
          <section className="panel" id="validation-requests">
            <div className="section-head">
              <h2>
                {screen === 'records'
                  ? 'Validasyon talepleri'
                  : screen === 'drafts'
                    ? 'Merkez listesi ve e-posta'
                    : screen === 'approval'
                      ? 'Gönderim öncesi kontrol'
                      : 'Gönderilen talepler'}
              </h2>
              <span className="badge pilot-badge">
                {screen === 'records'
                  ? `${pending.length} kontrol bekliyor`
                  : `${rows.length} talep`}
              </span>
            </div>
            <div className="classic-toolbar">
              {screen === 'records' && (
                <>
                  <button disabled={busy} onClick={() => setEditor({})}>
                    Yeni talep oluştur
                  </button>
                  <div className="tabs">
                    <button
                      className={filter === 'all' ? 'selected' : ''}
                      onClick={() => setFilter('all')}
                    >
                      Tüm kayıtlar
                    </button>
                    <button
                      className={filter === 'issues' ? 'selected' : ''}
                      onClick={() => setFilter('issues')}
                    >
                      Eksik / şüpheli
                    </button>
                  </div>
                </>
              )}
              <label className="classic-search">
                <Search size={18} />
                <input
                  type="search"
                  placeholder="Kayıt veya okul ara"
                  aria-label="Kayıt veya okul ara"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <div className="classic-list-filter">
              <TableOrder value={order} onChange={setOrder} />
              <label>
                Çalışma listesi{' '}
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                >
                  <option value="all">Tüm çalışma listeleri</option>
                  {Object.entries(caseGroups).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <small>
                Hesap onayı, inceleme, okul birleştirme ve destek talepleri
              </small>
            </div>
            {!rows.length ? (
              <div className="empty">
                <FileText size={28} />
                <h3>
                  {screen === 'records'
                    ? 'Henüz kayıt yok'
                    : screen === 'results'
                      ? 'Gönderilmiş talep yok'
                      : screen === 'approval'
                        ? 'Kontrole sunulmuş taslak yok'
                        : 'Hazır talep bulunmuyor'}
                </h3>
                <p>
                  {screen === 'records'
                    ? 'ESEP listenizi aktarabilir veya yeni talep oluşturabilirsiniz.'
                    : screen === 'approval'
                      ? 'Taslak ekranında metni inceleyip “Onaya sun” ile buraya getirin.'
                      : 'İncelemeyi tamamlayarak ilgili adıma geçebilirsiniz.'}
                </p>
                <button
                  onClick={() =>
                    go(
                      screen === 'records'
                        ? 'import'
                        : screen === 'approval'
                          ? 'drafts'
                          : 'records',
                    )
                  }
                >
                  {screen === 'records'
                    ? 'Liste aktar'
                    : screen === 'approval'
                      ? 'Taslakları incele'
                      : 'Kayıtları incele'}
                  <ArrowRight size={17} />
                </button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Sıra no</th>
                      <th>Kayıt</th>
                      <th>Durum</th>
                      <th>Okul / gerekli düzeltme</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.rows.map((r, index) => (
                      <tr key={r.id}>
                        <td className="table-row-number">
                          {page.from + index}
                        </td>
                        <td>
                          <span className="record-name">
                            <Users size={16} />
                            {r.name || r.title || r.school}
                          </span>
                          <small>
                            {r.kind ? caseKinds[r.kind] : 'ESEP kaynak kaydı'} ·{' '}
                            {r.accountId || r.schoolId || r.id.slice(0, 8)}
                          </small>
                        </td>
                        <td>
                          <span className={'badge ' + r.status}>
                            {r.sourceChanged
                              ? 'Yeniden kontrol gerekli'
                              : r.kind
                                ? r.status === 'ready' &&
                                  r.draftStage === 'approval'
                                  ? 'Onay bekliyor'
                                  : r.status === 'ready' && r.draftStage
                                    ? 'Taslak hazır'
                                    : caseStatuses[r.status]
                                : r.status === 'ready'
                                  ? 'Kontrol edildi'
                                  : r.status === 'completed'
                                    ? 'Önceki sonuç kaydı'
                                    : 'İnceleme bekliyor'}
                          </span>
                        </td>
                        <td>
                          {r.holdReason || r.school || r.reason || '—'}
                          {r.result && <small>Sonuç: {r.result}</small>}
                        </td>
                        <td>
                          <button
                            className="text-button"
                            disabled={busy}
                            onClick={() =>
                              open(
                                r,
                                screen === 'records'
                                  ? 'review'
                                  : screen === 'results'
                                    ? 'results'
                                    : screen === 'approval'
                                      ? 'approval'
                                      : 'draft',
                                screen === 'drafts',
                              )
                            }
                          >
                            {screen === 'records'
                              ? 'İncele'
                              : screen === 'results'
                                ? 'Sonucu izle'
                                : screen === 'approval'
                                  ? 'Liste ve e-postayı incele'
                                  : 'Taslağı aç'}
                            <ChevronRight size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <TablePagination pagination={page} label={title} />
            <div className="actions">
              {screen === 'records' && (
                <>
                  <button
                    className="primary"
                    disabled={!ready.length}
                    onClick={prepare}
                  >
                    Listeyi ve e-postayı hazırla
                    <ArrowRight size={17} />
                  </button>
                  <button onClick={() => go('drafts')}>
                    Listeyi ve e-posta taslağını aç
                  </button>
                </>
              )}
              {screen !== 'records' && (
                <a
                  className="button"
                  href={`/api/validation-export?group=${group}&stage=${screen}&status=${screen === 'results' ? 'all' : 'ready'}`}
                >
                  <Download size={17} />
                  Merkez listesini indir
                </a>
              )}
              {screen === 'drafts' && (
                <button onClick={() => go('approval')}>
                  Onay Merkezi
                  <ShieldCheck size={17} />
                </button>
              )}
            </div>
            {screen === 'drafts' && (
              <p className="muted">
                Liste Excel olarak alınır; bu sürümde her talebin e-posta
                taslağı ayrı hazırlanır ve saklanır. Taslak hazırlamak ileti
                göndermez.
              </p>
            )}
          </section>
        </>
      )}
      {editor && (
        <CaseDialog
          key={editor.row?.id || editor.source?.id || 'new'}
          editor={editor}
          state={state}
          api={api}
          fileData={fileData}
          busy={busy}
          run={run}
          close={() => setEditor(null)}
        />
      )}
    </>
  );
}
