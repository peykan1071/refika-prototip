import { useState, useEffect } from 'react';
import {
  Plus,
  Download,
  ClipboardCheck,
  Mail,
  Paperclip,
  History,
} from 'lucide-react';
import {
  caseKinds,
  caseStatuses,
  caseGroups,
  caseGroup,
  checkDefinitions,
  readyProblems,
  ruleVersion,
} from '../validation.mjs';
import './validation.css';
import {
  useTablePage,
  TablePagination,
  TableOrder,
} from './table-pagination.jsx';

const day = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
const clockValue = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const dateLabel = (v) => (v ? new Date(v).toLocaleString('tr-TR') : '—');
const blank = () => ({
  kind: 'person',
  title: '',
  reason: '',
  requestedAction: '',
  reviewedOn: day(),
  checks: {},
  status: 'review',
});
export function sourceCase(source) {
  if (!source) return blank();
  return {
    ...blank(),
    sourceRecordId: source.id,
    title: source.name + ' / ESEP incelemesi',
    ...Object.fromEntries(
      [
        'name',
        'accountId',
        'school',
        'schoolId',
        'district',
        'email',
        'profileUrl',
      ].map((key) => [key, source[key] || '']),
    ),
    reason: source.sourceStatus || '',
    reviewNote: source.note || '',
  };
}
function draftMessage(row) {
  const draft = row?.currentDraft;
  return {
    purpose: 'request',
    channel: 'email',
    happenedAt: clockValue(),
    confirmed: false,
    ...(draft
      ? { recipient: draft.recipient, subject: draft.subject, body: draft.body }
      : {}),
  };
}
const labels = {
  review: 'İnceleme kaydı',
  draft: 'Gönderilmemiş taslak',
  sent: 'Gerçek gönderim kaydı',
  reply: 'Yanıt / takip',
  result: 'Sonuç',
  reopen: 'Yeniden inceleme',
  file: 'Kanıt eklendi',
};
const outcomes = {
  approved: 'Onaylandı / tamamlandı',
  rejected: 'Uygun bulunmadı',
  other: 'Diğer sonuç',
};
function Field({ label, children, wide = false, hidden = false }) {
  if (hidden) return null;
  return (
    <label className={'field' + (wide ? ' wide' : '')}>
      <span>{label}</span>
      {children}
    </label>
  );
}
function Status({ row }) {
  return (
    <span className={'badge ' + row.status}>{caseStatuses[row.status]}</span>
  );
}
function SourceList({ state, create, open, busy, query }) {
  const [order, setOrder] = useState('added');
  const rows = state.records.filter((r) =>
    [r.name, r.school, r.accountId, r.schoolId]
      .join(' ')
      .toLocaleLowerCase('tr')
      .includes(query.toLocaleLowerCase('tr')),
  );
  const page = useTablePage(
    rows,
    JSON.stringify([query, state.revision]),
    order,
  );
  return (
    <section className="panel">
      <h2>Aktarılan ESEP kayıtları</h2>
      <TableOrder value={order} onChange={setOrder} label="Kaynak sıralaması" />
      <p>
        Bu liste kaynak veriyi ve önceki inceleme notlarını korur. Bir talep
        dosyası açarak yeni kontrol ve yazışma akışına başlayın. Eski
        “incelendi” durumu gönderim kanıtı sayılmaz.
      </p>
      {!rows.length ? (
        <p>
          Kaynak kayıt bulunamadı. Veri aktar ekranından ESEP listenizi
          yükleyebilirsiniz; dosyayı elle de oluşturabilirsiniz.
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Sıra no</th>
                <th>Kişi / hesap</th>
                <th>Okul</th>
                <th>Kaynak / önceki inceleme</th>
                <th>Talep dosyaları</th>
              </tr>
            </thead>
            <tbody>
              {page.rows.map((r, index) => (
                <tr key={r.id}>
                  <td className="table-row-number">{page.from + index}</td>
                  <td>
                    <strong>{r.name}</strong>
                    <br />
                    {r.accountId}
                  </td>
                  <td>
                    {r.school}
                    <br />
                    <small>{r.schoolId}</small>
                  </td>
                  <td>
                    {r.sourceStatus || '—'}
                    <br />
                    <small>{r.note || 'İnceleme notu yok'}</small>
                  </td>
                  <td>
                    <div className="case-row-actions">
                      {state.validationCases
                        .filter((c) => c.sourceRecordId === r.id)
                        .map((c) => (
                          <button
                            disabled={busy}
                            key={c.id}
                            onClick={() => open(c.id)}
                          >
                            {caseKinds[c.kind]} · {caseStatuses[c.status]}
                          </button>
                        ))}
                      <button disabled={busy} onClick={() => create(r)}>
                        Talep dosyası aç
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <TablePagination pagination={page} label="Aktarılan ESEP kayıtları" />
    </section>
  );
}
export function ValidationWorkspace({
  state,
  run,
  busy,
  api,
  fileData,
  results = false,
  initialCase = null,
  initialForm = null,
  initialSection = 'review',
  onClose,
  onDirtyChange,
}) {
  const [group, setGroup] = useState(results ? 'all' : 'review');
  const [filter, setFilter] = useState(results ? 'waiting' : 'all');
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState('added');
  const [form, setForm] = useState(initialCase || initialForm);
  const [saved, setSaved] = useState(initialCase);
  const [section, setSection] = useState(initialSection);
  const [message, setMessage] = useState(() => draftMessage(initialCase));
  const [savedMessage, setSavedMessage] = useState(() =>
    draftMessage(initialCase),
  );
  const [progress, setProgress] = useState({
    type: 'reply',
    happenedAt: clockValue(),
    outcome: 'approved',
    note: '',
    confirmed: false,
  });
  const [file, setFile] = useState(null);
  const cases = state.validationCases || [];
  const rows = cases.filter(
    (r) =>
      (group === 'all' || caseGroup(r) === group) &&
      (filter === 'all' || r.status === filter) &&
      [r.title, r.name, r.school, r.accountId, r.schoolId]
        .join(' ')
        .toLocaleLowerCase('tr')
        .includes(query.toLocaleLowerCase('tr')),
  );
  const page = useTablePage(
    rows,
    JSON.stringify([group, filter, query, state.revision]),
    order,
  );
  const dirty = form && JSON.stringify(form) !== JSON.stringify(saved);
  const messageDirty = ['recipient', 'subject', 'body'].some(
    (key) => (message[key] || '') !== (savedMessage[key] || ''),
  );
  const unsaved = Boolean(
    dirty ||
    messageDirty ||
    progress.note ||
    progress.evidenceUrl ||
    file ||
    message.proof ||
    message.messageUrl ||
    message.confirmed,
  );
  useEffect(() => {
    onDirtyChange?.(unsaved);
  }, [unsaved, onDirtyChange]);
  const locked = saved && ['waiting', 'completed'].includes(saved.status);
  const issues = form
    ? readyProblems({ ...form, checks: form.checks || {} })
    : [];
  function replace(row) {
    setForm(row);
    setSaved(row);
  }
  async function load(id) {
    const row = await api('/validation/' + id);
    replace(row);
    return row;
  }
  function open(id) {
    run(async () => {
      await load(id);
      setSection('review');
      setMessage({
        purpose: 'request',
        channel: 'email',
        happenedAt: clockValue(),
        confirmed: false,
      });
      setProgress({
        type: 'reply',
        happenedAt: clockValue(),
        outcome: 'approved',
        note: '',
        confirmed: false,
      });
      setFile(null);
    });
  }
  function create(source) {
    setSaved(null);
    setSection('review');
    setFile(null);
    setForm(
      source
        ? {
            ...blank(),
            sourceRecordId: source.id,
            title: source.name + ' / ESEP incelemesi',
            ...Object.fromEntries(
              [
                'name',
                'accountId',
                'school',
                'schoolId',
                'district',
                'email',
                'profileUrl',
              ].map((k) => [k, source[k] || '']),
            ),
            reason: source.sourceStatus || '',
            reviewNote: source.note || '',
          }
        : blank(),
    );
  }
  function set(key, value) {
    setForm((old) => ({ ...old, [key]: value }));
  }
  function input(key, label, options = {}) {
    return (
      <Field label={label} wide={options.wide}>
        <input
          {...options}
          wide={undefined}
          value={form[key] || ''}
          onChange={(e) => set(key, e.target.value)}
        />
      </Field>
    );
  }
  function area(key, label) {
    return (
      <Field label={label} wide>
        <textarea
          rows={3}
          value={form[key] || ''}
          onChange={(e) => set(key, e.target.value)}
        />
      </Field>
    );
  }
  function save(status) {
    run(
      async () => {
        const result = await api('/validation', { ...form, status });
        await load(result.id);
      },
      status === 'ready'
        ? 'Kontroller tamamlandı; dosya gönderime hazır. Henüz ileti gönderilmedi.'
        : 'İnceleme dosyası kaydedildi.',
    );
  }
  function saveDraft(stage = 'draft') {
    run(
      async () => {
        await api(`/validation/${saved.id}/draft`, {
          ...message,
          version: saved.version,
          edit: true,
          stage,
        });
        const row = await load(saved.id);
        const latest = row.events.find((event) => event.type === 'draft');
        setMessage((m) => ({
          ...m,
          recipient: latest.recipient,
          subject: latest.subject,
          body: latest.body,
        }));
        setSavedMessage(latest);
        if (stage === 'approval') setSection('approval');
      },
      stage === 'approval'
        ? 'Taslak gönderim öncesi kontrole alındı. Henüz ileti gönderilmedi.'
        : 'Düzenlediğiniz taslak kaydedildi.',
    );
  }
  function mutate(action, data, notice) {
    run(async () => {
      await api(`/validation/${saved.id}/${action}`, {
        ...data,
        version: saved.version,
      });
      await load(saved.id);
      setProgress((p) => ({
        ...p,
        type: 'reply',
        note: '',
        evidenceUrl: '',
        confirmed: false,
      }));
      if (action === 'sent') {
        setSavedMessage(message);
        setMessage((m) => ({
          ...m,
          confirmed: false,
          proof: '',
          messageUrl: '',
        }));
      }
    }, notice);
  }
  const pane = saved && (
    <nav className="case-sections" aria-label="Dosya bölümleri">
      {[
        ['review', 'İnceleme', ClipboardCheck],
        ['draft', 'Taslak', Mail],
        ['approval', 'Gönderim öncesi kontrol', ClipboardCheck],
        ['results', 'Sonuç', ClipboardCheck],
        ['evidence', 'Kanıt ve geçmiş', History],
      ].map(([key, label, Icon]) => (
        <button
          key={key}
          aria-pressed={section === key}
          disabled={busy || (dirty && key !== 'review')}
          onClick={() => setSection(key)}
        >
          <Icon size={17} />
          {label}
        </button>
      ))}
    </nav>
  );
  if (form)
    return (
      <>
        <div className="page-heading">
          <div>
            <h1>{saved ? saved.title : 'Yeni validasyon dosyası'}</h1>
            <p>
              {saved
                ? `${caseKinds[saved.kind]} · ${state.provinces[Number(state.settings.province) - 1]} · ${saved.year}`
                : 'Talep türünü seçin; kontrol ve yazışma adımları buna göre hazırlanır.'}
            </p>
          </div>
          <button
            disabled={busy}
            onClick={() => {
              if (
                !unsaved ||
                window.confirm(
                  'Kaydedilmemiş alan değişiklikleri bırakılacak. Listeye dönülsün mü?',
                )
              ) {
                setForm(null);
                setSaved(null);
                onClose?.();
              }
            }}
          >
            {onClose ? 'Kapat' : 'Listeye dön'}
          </button>
        </div>
        {saved && (
          <div className="case-status-line">
            <Status row={saved} />
            <small>
              Dosya: {saved.id.replace(/^history-/, '').slice(0, 8)} · Kural
              seti {saved.ruleVersion}
            </small>
          </div>
        )}
        {saved?.sourceChanged && (
          <p className="notice">
            Aktarılan kaynak kayıt değişmiş. Dosyayı incelemeye kaydettiğinizde
            kontrol işaretleri sıfırlanır; yeni veriyi karşılaştırıp yeniden
            doğrulayın. Gönderilmiş dosyada önce gerekçeyle yeniden inceleme
            açın.
          </p>
        )}
        {dirty && saved && (
          <p className="notice">
            Yazışmaya geçmeden önce inceleme değişikliklerini kaydedin.
          </p>
        )}
        {pane}
        {section === 'review' && (
          <section className="panel">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save('review');
              }}
            >
              <fieldset disabled={busy || locked} className="case-fields">
                <div className="form-grid">
                  <Field label="Talep türü">
                    <select
                      value={form.kind}
                      onChange={(e) => {
                        set('kind', e.target.value);
                        set('checks', {});
                      }}
                    >
                      {Object.entries(caseKinds).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {input('title', 'Dosya başlığı', { required: true })}
                  {input('name', 'Kişi adı soyadı')}
                  {input('email', 'İlgili kişinin e-postası', {
                    type: 'email',
                  })}
                  {input('accountId', 'Görünen hesap ID')}
                  {input('profileId', 'Kişi profil ID (ayrıysa)')}
                  {input('profileUrl', 'Kişi profil bağlantısı', {
                    type: 'url',
                    wide: true,
                  })}
                  {input('school', 'Okul adı')}
                  {input('district', 'İlçe')}
                  {input('schoolId', 'Görünen okul ID')}
                  {input('schoolProfileId', 'Okul profil ID (ayrıysa)')}
                  {input('schoolUrl', 'Okul profil bağlantısı', {
                    type: 'url',
                    wide: true,
                  })}
                  {input('schoolEmail', 'Resmî kurum e-postası', {
                    type: 'email',
                  })}
                  {input('reviewedOn', 'İnceleme tarihi', {
                    type: 'date',
                    max: day(),
                  })}
                  {area('reason', 'Mevcut durum / sorun')}
                  {area('requestedAction', 'Talep edilen işlem')}
                  {form.kind === 'merger' && (
                    <>
                      {input(
                        'retainedProfile',
                        'Korunacak ana profil (ID ve bağlantı)',
                        { wide: true },
                      )}
                      {area(
                        'relatedProfiles',
                        'Birleştirilecek profiller: görünen ID, profil ID, bağlantı, tarih, onay ve proje durumu',
                      )}
                    </>
                  )}
                  {area('holdReason', 'Bekleme / düzeltme gerekçesi')}
                  {area('reviewNote', 'Genel inceleme ve dayanak notu')}
                  {input('evidenceUrl', 'Kanıt bağlantısı', {
                    type: 'url',
                    wide: true,
                  })}
                </div>
                <h2>Talebe özel kontroller</h2>
                <p>
                  Her kontrolü kaynağa bakarak değerlendirin ve dayanağını
                  yazın. Bu adımlar koordinatör incelemesidir; platform onayının
                  yerine geçmez.
                </p>
                <div className="case-checks">
                  {checkDefinitions[form.kind].map(([key, label]) => (
                    <div className="case-check" key={key}>
                      <Field label={label}>
                        <select
                          value={form.checks[key]?.status || 'unknown'}
                          onChange={(e) =>
                            set('checks', {
                              ...form.checks,
                              [key]: {
                                ...form.checks[key],
                                status: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="unknown">
                            Henüz kontrol edilmedi
                          </option>
                          <option value="pass">Doğrulandı</option>
                          <option value="fail">Eksik / uygun değil</option>
                        </select>
                      </Field>
                      <Field label="Dayanak / tespit">
                        <textarea
                          rows={2}
                          value={form.checks[key]?.note || ''}
                          onChange={(e) =>
                            set('checks', {
                              ...form.checks,
                              [key]: {
                                ...form.checks[key],
                                note: e.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                    </div>
                  ))}
                </div>
                {issues.length > 0 && (
                  <details className="case-issues">
                    <summary>
                      Gönderime hazırlık için {issues.length} eksik
                    </summary>
                    <ul>
                      {issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="actions">
                  <small>Kural seti: {ruleVersion}</small>
                  <button type="submit">İncelemeye kaydet</button>
                  <button
                    type="button"
                    className="primary"
                    disabled={issues.length > 0 || saved?.sourceChanged}
                    onClick={() => save('ready')}
                  >
                    Gönderime hazır kaydet
                  </button>
                </div>
              </fieldset>
            </form>
            {locked && (
              <p className="notice">
                Gönderilen dosyanın içeriği korunur. Düzeltme için “Sonuç”
                bölümünden gerekçeyle yeniden incelemeye alın.
              </p>
            )}
            {form.sourceRecordId && (
              <details className="case-source">
                <summary>Güncel kaynak kaydıyla karşılaştır</summary>
                {(() => {
                  const source = state.records.find(
                    (r) => r.id === form.sourceRecordId,
                  );
                  return source ? (
                    <>
                      <p>
                        {source.name} · {source.accountId}
                        <br />
                        {source.school} · {source.schoolId}
                        <br />
                        {source.email}
                        <br />
                        {source.sourceStatus}
                      </p>
                      {source.profileUrl && (
                        <a
                          href={source.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Kaynak profili aç
                        </a>
                      )}
                      <p>{source.note}</p>
                      {!locked && (
                        <button
                          disabled={busy}
                          onClick={() => {
                            setForm((old) => ({
                              ...old,
                              ...Object.fromEntries(
                                [
                                  'name',
                                  'accountId',
                                  'school',
                                  'schoolId',
                                  'district',
                                  'email',
                                  'profileUrl',
                                ].map((k) => [k, source[k] || '']),
                              ),
                              checks: {},
                            }));
                          }}
                        >
                          Kaynak alanlarını forma al ve kontrolleri temizle
                        </button>
                      )}
                    </>
                  ) : (
                    <p>Kaynak kayıt bulunamadı.</p>
                  );
                })()}
              </details>
            )}
          </section>
        )}
        {['messages', 'draft', 'approval', 'results'].includes(section) &&
          saved && (
            <>
              {section !== 'results' && (
                <section className="panel">
                  <h2>
                    <Mail size={21} />
                    {section === 'draft'
                      ? 'Merkez listesi ve e-posta taslağı'
                      : 'Gönderim öncesi kontrol'}
                  </h2>
                  <p>
                    REFİKA metni hazırlar. İletiyi kendi e-posta veya mesajlaşma
                    uygulamanızdan gönderdikten sonra gerçek gönderimi burada
                    kaydedin. Önerilen alıcıyı göndermeden önce kontrol edin.
                  </p>
                  <div className="form-grid">
                    <Field label="Yazışma amacı">
                      <select
                        disabled={busy}
                        value={message.purpose}
                        onChange={(e) =>
                          setMessage({
                            purpose: e.target.value,
                            channel: 'email',
                            happenedAt: clockValue(),
                            confirmed: false,
                          })
                        }
                      >
                        <option value="request">Merkeze talep</option>
                        <option value="information">
                          İlgili kişiye bilgilendirme / düzeltme
                        </option>
                      </select>
                    </Field>
                    <div className="actions">
                      <button
                        disabled={
                          busy ||
                          (message.purpose === 'request' &&
                            (saved.status !== 'ready' || saved.sourceChanged))
                        }
                        onClick={() =>
                          run(async () => {
                            const draft = await api(
                              `/validation/${saved.id}/draft`,
                              {
                                purpose: message.purpose,
                                version: saved.version,
                              },
                            );
                            await load(saved.id);
                            setSavedMessage(draft);
                            setMessage((m) => ({
                              ...m,
                              recipient: draft.recipient,
                              subject: draft.subject,
                              body: draft.body,
                              confirmed: false,
                            }));
                          }, 'Taslak kaydedildi. Henüz gönderilmedi.')
                        }
                      >
                        Taslak hazırla
                      </button>
                    </div>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (section === 'draft') {
                        saveDraft();
                        return;
                      }
                      mutate(
                        'sent',
                        {
                          ...message,
                          happenedAt: new Date(
                            message.happenedAt,
                          ).toISOString(),
                        },
                        'Gerçek gönderim ve gönderilen metin kaydedildi.',
                      );
                    }}
                  >
                    <fieldset disabled={busy} className="case-fields">
                      <div className="form-grid">
                        <Field label="Kanal">
                          <select
                            value={message.channel}
                            onChange={(e) =>
                              setMessage({
                                ...message,
                                channel: e.target.value,
                              })
                            }
                          >
                            <option value="email">E-posta</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="other">Diğer</option>
                          </select>
                        </Field>
                        <Field label="Alıcı">
                          <input
                            required
                            value={message.recipient || ''}
                            type={
                              message.channel === 'email' ? 'email' : 'text'
                            }
                            onChange={(e) =>
                              setMessage({
                                ...message,
                                recipient: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Konu" wide>
                          <input
                            required
                            value={message.subject || ''}
                            onChange={(e) =>
                              setMessage({
                                ...message,
                                subject: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Gönderilen / gönderilecek metin" wide>
                          <textarea
                            required
                            rows={12}
                            value={message.body || ''}
                            onChange={(e) =>
                              setMessage({ ...message, body: e.target.value })
                            }
                          />
                        </Field>
                        <Field
                          hidden={section === 'draft'}
                          label="Gerçek gönderim zamanı (bu bilgisayarın saati)"
                        >
                          <input
                            required
                            type="datetime-local"
                            value={message.happenedAt}
                            onChange={(e) =>
                              setMessage({
                                ...message,
                                happenedAt: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field
                          hidden={section === 'draft'}
                          label="Gönderilen ileti bağlantısı (varsa)"
                        >
                          <input
                            type="url"
                            value={message.messageUrl || ''}
                            onChange={(e) =>
                              setMessage({
                                ...message,
                                messageUrl: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field
                          label="Gönderim dayanağı: ileti no, kayıt veya eklenen kanıt dosyasının adı"
                          hidden={section === 'draft'}
                          wide
                        >
                          <textarea
                            rows={2}
                            value={message.proof || ''}
                            onChange={(e) =>
                              setMessage({ ...message, proof: e.target.value })
                            }
                          />
                        </Field>
                      </div>
                      {section !== 'draft' && (
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={message.confirmed}
                            onChange={(e) =>
                              setMessage({
                                ...message,
                                confirmed: e.target.checked,
                              })
                            }
                          />
                          Bu iletiyi belirtilen alıcıya, belirtilen zamanda
                          gerçekten gönderdim; metni ve dayanağı kontrol ettim.
                        </label>
                      )}
                      <div className="actions">
                        <button
                          type="button"
                          disabled={!message.body}
                          onClick={() => {
                            const url = URL.createObjectURL(
                              new Blob(
                                [
                                  `Alıcı: ${message.recipient || ''}\nKonu: ${message.subject || ''}\n\n${message.body || ''}`,
                                ],
                                { type: 'text/plain;charset=utf-8' },
                              ),
                            );
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = 'REFIKA-eposta-taslagi.txt';
                            link.click();
                            setTimeout(() => URL.revokeObjectURL(url), 1000);
                          }}
                        >
                          Taslağı indir
                        </button>
                        {section === 'draft' ? (
                          <>
                            <button disabled={!message.body}>
                              Taslağı kaydet
                            </button>
                            <button
                              type="button"
                              className="primary"
                              disabled={
                                !message.body ||
                                saved.status !== 'ready' ||
                                message.purpose !== 'request'
                              }
                              onClick={() => saveDraft('approval')}
                            >
                              Onaya sun
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                run(
                                  () =>
                                    navigator.clipboard.writeText(
                                      `${message.subject || ''}\n\n${message.body || ''}`,
                                    ),
                                  'Metin panoya kopyalandı.',
                                )
                              }
                              disabled={!message.body}
                            >
                              Metni kopyala
                            </button>
                            <button
                              className="primary"
                              disabled={
                                !message.confirmed ||
                                (message.purpose === 'request' &&
                                  (saved.status !== 'ready' ||
                                    saved.sourceChanged))
                              }
                            >
                              Gönderimi kaydet
                            </button>
                          </>
                        )}
                      </div>
                    </fieldset>
                  </form>
                </section>
              )}
              {['messages', 'results'].includes(section) && (
                <section className="panel">
                  <h2>Yanıt, sonuç ve yeniden inceleme</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      mutate(
                        'progress',
                        {
                          ...progress,
                          happenedAt: new Date(
                            progress.happenedAt,
                          ).toISOString(),
                        },
                        'Takip işlemi geçmişe kaydedildi.',
                      );
                    }}
                  >
                    <fieldset disabled={busy} className="case-fields">
                      <div className="form-grid">
                        <Field label="İşlem">
                          <select
                            value={progress.type}
                            onChange={(e) =>
                              setProgress({
                                ...progress,
                                type: e.target.value,
                                confirmed: false,
                              })
                            }
                          >
                            <option value="reply">
                              Yanıt / takip notu ekle
                            </option>
                            {saved.status === 'waiting' && (
                              <option value="result">
                                Gerçek sonucu kaydet
                              </option>
                            )}
                            {saved.status !== 'review' && (
                              <option value="reopen">
                                Gerekçeyle yeniden incelemeye al
                              </option>
                            )}
                          </select>
                        </Field>
                        <Field label="Gerçekleşme / sonuç bildirim zamanı">
                          <input
                            required
                            type="datetime-local"
                            value={progress.happenedAt}
                            onChange={(e) =>
                              setProgress({
                                ...progress,
                                happenedAt: e.target.value,
                              })
                            }
                          />
                        </Field>
                        {progress.type === 'result' && (
                          <Field label="Sonuç tarihi dayanağı">
                            <select
                              value={progress.dateBasis || 'actual'}
                              onChange={(e) =>
                                setProgress({
                                  ...progress,
                                  dateBasis: e.target.value,
                                })
                              }
                            >
                              <option value="actual">
                                Belgeli gerçekleşme tarihi
                              </option>
                              <option value="notification">
                                Sonuç bildirimindeki tarih
                              </option>
                            </select>
                            <small>
                              Dönem hesabında bu tarih kullanılır. Kesin
                              gerçekleşme tarihi bilinmiyorsa bildirim tarihini
                              seçin.
                            </small>
                          </Field>
                        )}
                        {progress.type === 'result' && (
                          <Field label="Sonuç türü">
                            <select
                              value={progress.outcome}
                              onChange={(e) =>
                                setProgress({
                                  ...progress,
                                  outcome: e.target.value,
                                })
                              }
                            >
                              {Object.entries(outcomes).map(([v, label]) => (
                                <option key={v} value={v}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </Field>
                        )}
                        <Field
                          label="Yanıt / sonuç / yeniden inceleme gerekçesi"
                          wide
                        >
                          <textarea
                            required
                            rows={3}
                            value={progress.note}
                            onChange={(e) =>
                              setProgress({ ...progress, note: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="Yanıt veya kanıt bağlantısı (varsa)" wide>
                          <input
                            type="url"
                            value={progress.evidenceUrl || ''}
                            onChange={(e) =>
                              setProgress({
                                ...progress,
                                evidenceUrl: e.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                      {progress.type === 'result' && (
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={progress.confirmed}
                            onChange={(e) =>
                              setProgress({
                                ...progress,
                                confirmed: e.target.checked,
                              })
                            }
                          />
                          Sonucu gelen yanıt veya platformdaki durum üzerinden
                          doğruladım.
                        </label>
                      )}
                      <div className="actions">
                        <button
                          className="primary"
                          disabled={
                            progress.type === 'result' && !progress.confirmed
                          }
                        >
                          Takip işlemini kaydet
                        </button>
                      </div>
                    </fieldset>
                  </form>
                </section>
              )}
            </>
          )}
        {section === 'evidence' && saved && (
          <section className="panel">
            <h2>
              <Paperclip size={21} />
              Kanıt dosyaları
            </h2>
            <p>
              Her dosya en fazla 10 MB: PDF, Word, Excel, CSV, metin veya
              görsel.
            </p>
            <div className="case-files">
              {saved.files.map((f) => (
                <a className="button" href={'/api/files/' + f.id} key={f.id}>
                  {f.name} · {Math.ceil(f.size / 1024)} KB
                </a>
              ))}
            </div>
            <form
              className="actions"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  const data = await fileData(file, 10);
                  await api(`/validation/${saved.id}/files`, {
                    ...data,
                    version: saved.version,
                  });
                  await load(saved.id);
                  setFile(null);
                }, 'Kanıt dosyası eklendi.');
              }}
            >
              <Field label="Kanıt seç">
                <input
                  key={saved.version}
                  disabled={busy}
                  type="file"
                  accept=".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                />
              </Field>
              <button disabled={busy || !file}>Kanıtı ekle</button>
            </form>
          </section>
        )}
        {saved && section !== 'review' && (
          <section className="panel">
            <div className="section-head">
              <h2>
                <History size={21} />
                Dosya geçmişi
              </h2>
              <a
                className="button"
                href={`/api/validation/${saved.id}/history-export`}
              >
                <Download size={17} />
                Geçmişi indir
              </a>
            </div>
            <ol className="case-timeline">
              {saved.events.map((event) => (
                <li key={event.id}>
                  <div className="section-head">
                    <strong>
                      {event.resultNumber
                        ? `SON-${String(event.resultNumber).padStart(6, '0')} · `
                        : ''}
                      {labels[event.type]}
                    </strong>
                    <time>{dateLabel(event.happenedAt || event.at)}</time>
                  </div>
                  <p>
                    {event.operator}
                    {event.purpose &&
                      ` · ${event.purpose === 'request' ? 'Merkeze talep' : event.purpose === 'followup' ? 'İlgili yazışma / takip' : event.purpose === 'precheck' ? 'Ön inceleme / kişiye yazışma' : 'Kişiye bilgilendirme'}`}
                    {event.outcome && ` · ${outcomes[event.outcome]}`}
                  </p>
                  {event.subject && <strong>{event.subject}</strong>}
                  {event.recipient && (
                    <p>
                      Alıcı: {event.recipient} · {event.channel || 'Taslak'}
                    </p>
                  )}
                  <p className="case-pre">
                    {event.body || event.note || event.name}
                  </p>
                  {event.proof && <p>Gönderim dayanağı: {event.proof}</p>}
                  {(event.messageUrl || event.evidenceUrl) && (
                    <a
                      href={event.messageUrl || event.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      İleti / kanıt bağlantısı
                    </a>
                  )}
                  {event.snapshot && (
                    <details>
                      <summary>
                        {event.historical
                          ? 'Aktarımda kaydedilen dosya bilgileri'
                          : 'O andaki dosya bilgileri'}
                      </summary>
                      <p className="case-pre">
                        {event.snapshot.title}
                        <br />
                        {caseKinds[event.snapshot.kind]} ·{' '}
                        {caseStatuses[event.snapshot.status]}
                        <br />
                        {event.snapshot.name} · {event.snapshot.accountId}
                        <br />
                        {event.snapshot.school} · {event.snapshot.schoolId}
                        <br />
                        {event.snapshot.reason}
                        <br />
                        Talep: {event.snapshot.requestedAction}
                        <br />
                        Dayanak: {event.snapshot.reviewNote}
                      </p>
                    </details>
                  )}
                  <small>REFİKA kayıt zamanı: {dateLabel(event.at)}</small>
                </li>
              ))}
            </ol>
          </section>
        )}
      </>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{results ? 'Sonuç Takibi' : 'Kayıt ve Validasyon'}</h1>
          <p>İnceleme, talep, bilgilendirme ve sonucu aynı dosyada izleyin.</p>
        </div>
        <button className="primary" disabled={busy} onClick={() => create()}>
          <Plus size={18} />
          Yeni talep dosyası
        </button>
      </div>
      <nav className="case-groups" aria-label="Validasyon çalışma listeleri">
        {Object.entries(caseGroups).map(([key, label]) => (
          <button
            key={key}
            aria-pressed={group === key}
            onClick={() => {
              setGroup(key);
              setFilter('all');
            }}
          >
            <span>{label}</span>
            <b>{cases.filter((r) => caseGroup(r) === key).length}</b>
          </button>
        ))}
      </nav>
      <div className="case-filter">
        {group !== 'sources' && (
          <TableOrder value={order} onChange={setOrder} />
        )}
        <button aria-pressed={group === 'all'} onClick={() => setGroup('all')}>
          Tüm dosyalar ({cases.length})
        </button>
        <button
          aria-pressed={group === 'sources'}
          onClick={() => setGroup('sources')}
        >
          Kaynak kayıtları ({state.records.length})
        </button>
        <input
          aria-label="Dosya veya kaynak ara"
          placeholder="Kişi, okul, ID veya dosya ara…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {group !== 'sources' && (
          <select
            aria-label="Dosya durumu"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Tüm durumlar</option>
            {Object.entries(caseStatuses).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>
      {group === 'sources' ? (
        <SourceList
          state={state}
          create={create}
          open={open}
          busy={busy}
          query={query}
        />
      ) : (
        <section className="panel">
          <div className="section-head">
            <h2>
              {group === 'all' ? 'Tüm talep dosyaları' : caseGroups[group]}
            </h2>
            <a
              className="button"
              href={`/api/validation-export?group=${group}&status=${filter}`}
            >
              <Download size={17} />
              Listeyi indir
            </a>
          </div>
          <p>
            İncelemedeki bütün talepler “İnceleme Bekleyenler” listesinde yer
            alır; hazır olduklarında türlerine ait listeye geçer. İndirilen
            Excel seçili liste ve durumun tamamını içerir.
          </p>
          {!rows.length ? (
            <div className="empty">
              <ClipboardCheck size={32} />
              <p>
                Bu görünümde dosya yok. Kaynak kayıtlarından veya “Yeni talep
                dosyası” ile başlayın.
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Sıra no</th>
                    <th>Dosya</th>
                    <th>Talep türü</th>
                    <th>İlgili kişi / okul</th>
                    <th>Durum</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {page.rows.map((r, index) => (
                    <tr key={r.id}>
                      <td className="table-row-number">{page.from + index}</td>
                      <td>
                        <strong>{r.title}</strong>
                        <br />
                        <small>
                          {r.id.replace(/^history-/, '').slice(0, 8)}
                        </small>
                      </td>
                      <td>{caseKinds[r.kind]}</td>
                      <td>
                        {r.name || '—'}
                        <br />
                        <small>{r.school}</small>
                      </td>
                      <td>
                        <Status row={r} />
                        {r.sourceChanged && <p>Kaynak değişti</p>}
                      </td>
                      <td>
                        <button disabled={busy} onClick={() => open(r.id)}>
                          Dosyayı aç
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <TablePagination pagination={page} label="Talep dosyaları" />
        </section>
      )}
    </>
  );
}
