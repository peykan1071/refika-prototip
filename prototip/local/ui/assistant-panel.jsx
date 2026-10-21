import { useEffect, useId, useState } from 'react';
import { Sparkles, X, Copy, Save, ArrowRight } from 'lucide-react';
import {
  assistantPage,
  assistantPages,
  assistantTasks,
} from '../assistant-tasks.mjs';
import './assistant-panel.css';

async function api(path, value) {
  const response = await fetch(
    '/api/assistant/' + path,
    value === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value),
        },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'İşlem tamamlanamadı.');
  return data;
}
const sourceKey = (source = {}) =>
  JSON.stringify({
    type: source.type || '',
    id: source.id || '',
    itemId: source.itemId || '',
  });
export const canLeaveAssistant = () =>
  window.dispatchEvent(
    new Event('refika-before-navigate', { cancelable: true }),
  );
const contextLabels = {
  data: 'Kaynak kayıt',
  question: 'Yazdığınız soru / hazırlık bilgisi',
  sourceNote: 'Eklediğiniz dayanak',
  title: 'Başlık',
  kind: 'Tür',
  purpose: 'Amaç',
  audience: 'Hedef kitle',
  startDate: 'Planlanan başlangıç',
  endDate: 'Planlanan bitiş',
  expectedOutput: 'Beklenen çıktı',
  plannedParticipants: 'Planlanan katılım',
  status: 'Durum',
  actualDate: 'Gerçekleşme tarihi',
  actualParticipants: 'Gerçek katılım',
  result: 'Sonuç',
  evidence: 'Kanıt notu',
  planTitle: 'Plan başlığı',
  year: 'Yıl',
  sourceUrl: 'Kaynak bağlantısı',
  item: 'Seçilen madde',
  id: 'Kayıt kodu',
  month: 'Ay',
  dateLabel: 'Çalışma günleri',
  description: 'Açıklama',
  implementationNote: 'Uygulama notu',
  theme: 'Tema',
  reason: 'Gerekçe',
  requestedAction: 'İstenen işlem',
  recipient: 'Talep türüne göre önerilen alıcı',
  reviewNote: 'İnceleme notu',
  holdReason: 'Bekleme nedeni',
  outcome: 'Sonuç türü',
  resolvedAt: 'Sonuç tarihi',
  esepCheck: 'Tarihli ESEP gözlemi',
  checkedAt: 'Kontrol zamanı',
  person: 'Kişi',
  school: 'Okul',
  membership: 'Okul üyeliği',
  period: 'Dönem',
  from: 'Başlangıç',
  to: 'Bitiş',
  fields: 'Rapor alanları',
  label: 'Alan',
  value: 'İçerik',
  bodyText: 'Rapor metni',
  links: 'Bağlantılar',
  url: 'Adres',
  date: 'Bugün',
  pendingCases: 'Sonucu beklenen dosya sayısı',
  reviewCases: 'İncelenecek dosya sayısı',
  plannedActivities: 'Planlanan faaliyetler',
};
function readableContext(value, depth = 0) {
  if (value === null || value === '') return 'Belirtilmedi';
  if (typeof value !== 'object') return String(value);
  return Object.entries(value)
    .map(
      ([key, v]) =>
        `${'  '.repeat(depth)}${Array.isArray(value) ? Number(key) + 1 : contextLabels[key] || key}: ${typeof v === 'object' && v !== null ? '\n' : ''}${readableContext(v, depth + 1)}`,
    )
    .join('\n');
}
function sourcesFor(state, page) {
  const activities = (state.activities || [])
    .filter((a) => page !== 'visits' || a.kind === 'Okul ziyareti')
    .filter(
      (a) =>
        page !== 'events' || ['Eğitim', 'Webinar', 'Toplantı'].includes(a.kind),
    )
    .map((a) => ({
      source: { type: 'activity', id: a.id },
      label: `${a.title} · ${a.status === 'completed' ? 'Tamamlandı' : 'Planlandı'}`,
    }));
  if (page === 'activities')
    return [
      ...(state.plans || []).flatMap((p) =>
        p.items.map((i) => ({
          source: { type: 'plan', id: p.id, itemId: i.id },
          label: `${i.month} · ${i.title}`,
        })),
      ),
      ...activities,
    ];
  if (page === 'records')
    return (state.validationCases || []).map((r) => ({
      source: { type: 'case', id: r.id },
      label: `${r.name || r.school || r.title} · ${r.title}`,
    }));
  if (page === 'reports')
    return [
      ...activities,
      ...(state.reports || []).map((r) => ({
        source: { type: 'report', id: r.id },
        label: `Rapor · ${r.title}`,
      })),
    ];
  return page === 'home' ? [] : activities;
}

export function AssistantPanel({
  state,
  page: rawPage,
  source: fixedSource,
  onSettings,
  onDirtyChange,
}) {
  const page = assistantPage(rawPage),
    config = assistantPages[page];
  const uid = useId();
  const [task, setTask] = useState(''),
    [source, setSource] = useState(fixedSource || {});
  const [input, setInput] = useState(''),
    [sourceNote, setSourceNote] = useState(''),
    [channel, setChannel] = useState('whatsapp');
  const [context, setContext] = useState(null),
    [consent, setConsent] = useState(false);
  const [generated, setGenerated] = useState(null),
    [draft, setDraft] = useState(''),
    [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [history, setHistory] = useState(null),
    [saved, setSaved] = useState(false),
    [opened, setOpened] = useState(null);
  const dirty = !!task && !saved && !!(input || sourceNote || draft);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const leaving = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const navigating = (event) => {
      if (
        !window.confirm(
          'REFİKA hazırlık alanındaki kaydedilmemiş metin bırakılacak. Devam edilsin mi?',
        )
      )
        event.preventDefault();
    };
    window.addEventListener('beforeunload', leaving);
    window.addEventListener('refika-before-navigate', navigating);
    return () => {
      window.removeEventListener('beforeunload', leaving);
      window.removeEventListener('refika-before-navigate', navigating);
    };
  }, [dirty]);
  if (!config) return null;
  const sources = sourcesFor(state, page);
  const options = fixedSource
    ? sources.filter((s) => sourceKey(s.source) === sourceKey(fixedSource))
    : sources;
  const request = () => ({ page, task, source, input, sourceNote, channel });
  async function work(fn) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function reset(next) {
    if (
      dirty &&
      !window.confirm(
        'Kaydedilmemiş hazırlık metni bırakılacak. Devam edilsin mi?',
      )
    )
      return;
    setTask(next);
    setInput('');
    setSourceNote('');
    setContext(null);
    setConsent(false);
    setGenerated(null);
    setDraft('');
    setReviewed(false);
    setSaved(false);
    setError('');
    setNotice('');
    setOpened(null);
  }
  function change(fn) {
    if (
      draft &&
      !saved &&
      !window.confirm(
        'Kaynak değiştiğinde mevcut taslak temizlenecek. Devam edilsin mi?',
      )
    )
      return;
    fn();
    setContext(null);
    setConsent(false);
    setGenerated(null);
    setDraft('');
    setReviewed(false);
    setSaved(false);
    setNotice('');
  }
  async function copy(value) {
    await navigator.clipboard.writeText(value);
    setNotice('Metin kopyalandı.');
  }
  return (
    <section
      className={'assistant-panel assistant-' + page}
      aria-labelledby={uid + '-title'}
    >
      <div className="assistant-heading">
        <div className="assistant-heading-copy">
          <Sparkles size={23} aria-hidden="true" />
          <div>
            <h2 id={uid + '-title'}>{config.title}</h2>
            <p>{config.description}</p>
          </div>
        </div>
        <span className={'badge ' + (state.ai?.configured ? 'ready' : '')}>
          {state.ai?.configured
            ? 'Model ayarı mevcut'
            : 'Model bağlantısı bekleniyor'}
        </span>
      </div>
      <div
        className="assistant-tasks"
        aria-label="Bu sayfanın REFİKA görevleri"
      >
        {config.tasks.map((key) => (
          <button
            type="button"
            key={key}
            disabled={busy}
            aria-pressed={task === key}
            onClick={() => reset(key)}
          >
            {assistantTasks[key].label}
            <ArrowRight size={15} />
          </button>
        ))}
      </div>
      {task && (
        <div className="assistant-editor">
          <div className="section-head">
            <h3>{assistantTasks[task].label}</h3>
            <button
              type="button"
              disabled={busy}
              onClick={() => reset('')}
              aria-label="REFİKA hazırlık alanını kapat"
            >
              <X size={18} />
            </button>
          </div>
          <p className="assistant-tone">
            Üslup: <strong>{assistantTasks[task].tone}</strong>
          </p>
          {!state.ai?.configured && (
            <p className="notice">
              Model henüz bağlı değil. Sorunuzu ve çalışma bilgilerinizi
              hazırlayabilir, elle yazdığınız taslağı bu sayfaya
              kaydedebilirsiniz.
              {onSettings && (
                <button type="button" onClick={onSettings}>
                  Bağlantı ayarlarını aç
                </button>
              )}
            </p>
          )}
          {page !== 'home' && (
            <label className="field">
              <span>Kullanılacak kayıt / plan maddesi</span>
              <select
                disabled={busy || !!fixedSource}
                value={sourceKey(source)}
                onChange={(e) =>
                  change(() => setSource(JSON.parse(e.target.value)))
                }
              >
                {!fixedSource && (
                  <option value={sourceKey({})}>
                    Yalnızca yazdığım bilgiler
                  </option>
                )}
                {options.map((s) => (
                  <option key={sourceKey(s.source)} value={sourceKey(s.source)}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="muted">
            Kaynak olarak kaydın son kaydedilmiş hâli kullanılır. Hazırlık
            taslağı kaydın durumunu değiştirmez.
          </p>
          <label className="field">
            <span>
              {task === 'reply'
                ? 'Öğretmenin sorusunu buraya yapıştırın'
                : task === 'visit_notes'
                  ? 'Görüşme notları'
                  : 'Hazırlık bilgileri / ek isteğiniz'}
            </span>
            <textarea
              rows={4}
              maxLength={8000}
              disabled={busy}
              value={input}
              onChange={(e) => change(() => setInput(e.target.value))}
              placeholder={
                task === 'reply'
                  ? 'WhatsApp veya e-postadaki soruyu yapıştırın…'
                  : 'Amaç, hedef kitle, süre veya özellikle yer almasını istediğiniz bilgiler…'
              }
            />
          </label>
          <label className="field">
            <span>Dayanak / kaynak notu (isteğe bağlı)</span>
            <textarea
              rows={2}
              maxLength={6000}
              disabled={busy}
              value={sourceNote}
              onChange={(e) => change(() => setSourceNote(e.target.value))}
              placeholder="Yanıtta kullanılmasını istediğiniz resmî açıklama, bağlantı ve tarihi…"
            />
          </label>
          {task === 'reply' && (
            <label className="field">
              <span>Yanıt biçimi</span>
              <select
                value={channel}
                disabled={busy}
                onChange={(e) => change(() => setChannel(e.target.value))}
              >
                <option value="whatsapp">WhatsApp için kısa</option>
                <option value="email">E-posta için ayrıntılı</option>
              </select>
            </label>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              work(async () => {
                setContext(await api('context', request()));
                setConsent(false);
                setNotice('Kullanılacak içerik hazır.');
              })
            }
          >
            Kullanılacak bilgileri incele
          </button>
          {context && (
            <div className="assistant-context">
              <strong>Kaynak: {context.label}</strong>
              <p>
                {state.ai?.configured
                  ? `Model: ${state.ai.label} · ${state.ai.host} · ${state.ai.local ? 'Bu bilgisayarda' : 'Dış hizmet'}`
                  : 'Model hizmeti bağlı değil.'}
              </p>
              <label className="field">
                <span>Modelin kullanacağı içerik</span>
                <textarea
                  readOnly
                  rows={7}
                  value={readableContext(context.payload)}
                />
              </label>
              <p className="muted">
                Yalnız bu içerik kullanılır. Metindeki gereksiz kişisel
                bilgileri üretim öncesinde kaynakta veya soru alanında
                çıkarabilirsiniz.
              </p>
              {state.ai?.configured && (
                <label className="check">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  Görünen içeriğin belirtilen model hizmetine gönderilmesini
                  onaylıyorum.
                </label>
              )}
              <button
                type="button"
                className="primary"
                disabled={busy || !consent || !state.ai?.configured}
                onClick={() =>
                  work(async () => {
                    const result = await api('generate', {
                      ...request(),
                      fingerprint: context.fingerprint,
                      confirmed: consent,
                    });
                    setGenerated(result);
                    setDraft(result.draft);
                    setReviewed(false);
                    setSaved(false);
                    setNotice(
                      'AI taslağı hazır. İçeriği ve dayanakları gözden geçirin.',
                    );
                  })
                }
              >
                <Sparkles size={16} />
                {busy ? 'İşlem sürüyor…' : 'AI ile taslak hazırla'}
              </button>
            </div>
          )}
          {generated && (
            <div className="assistant-basis">
              <strong>Kullanılan dayanak alıntıları</strong>
              {generated.basis.length ? (
                <ul>
                  {generated.basis.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              ) : (
                <p>Dayanak alıntısı yok; öneriler ayrıca kontrol edilmeli.</p>
              )}
              {!!generated.missing.length && (
                <>
                  <strong>Tamamlanması gereken bilgiler</strong>
                  <ul>
                    {generated.missing.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          <label className="field">
            <span>
              {generated
                ? 'Düzenlenebilir AI taslağı'
                : 'Taslak metni (elle yazabilirsiniz)'}
            </span>
            <textarea
              rows={7}
              value={draft}
              maxLength={16000}
              disabled={busy}
              onChange={(e) => {
                setDraft(e.target.value);
                setReviewed(false);
                setSaved(false);
              }}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              disabled={busy || !draft.trim()}
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            Metni, tarihleri ve bilgileri gözden geçirdim.
          </label>
          <div className="assistant-actions">
            <button
              type="button"
              disabled={busy || !draft.trim()}
              onClick={() => work(() => copy(draft))}
            >
              <Copy size={16} />
              Kopyala
            </button>
            <button
              type="button"
              disabled={busy || !context || !reviewed || !draft.trim() || saved}
              onClick={() =>
                work(async () => {
                  await api('drafts', {
                    ...request(),
                    fingerprint: context.fingerprint,
                    draft,
                    reviewed,
                    generationToken: generated?.token,
                  });
                  setSaved(true);
                  setNotice(
                    'Taslak bu sayfaya ve seçilen kayda bağlı olarak kaydedildi.',
                  );
                  if (history) setHistory(await api('drafts'));
                })
              }
            >
              <Save size={16} />
              Taslağı kaydet
            </button>
          </div>
          <p className="muted">
            Taslak kaydı paylaşım, mail gönderimi veya resmî onay anlamına
            gelmez.
          </p>
        </div>
      )}
      <div className="assistant-history">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            work(async () => {
              setHistory(history ? null : await api('drafts'));
              setOpened(null);
            })
          }
        >
          {history
            ? 'Kayıtlı taslakları kapat'
            : 'Bu sayfanın kayıtlı taslakları'}
        </button>
        {history && (
          <ul>
            {history
              .filter(
                (r) =>
                  r.context.page === page &&
                  (!fixedSource ||
                    sourceKey(r.context.source) === sourceKey(fixedSource)),
              )
              .map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpened(r)}>
                    {assistantTasks[r.context.task]?.label} · {r.context.label}{' '}
                    · {new Date(r.at).toLocaleString('tr-TR')}
                  </button>
                </li>
              ))}
          </ul>
        )}
        {history &&
          !history.some(
            (r) =>
              r.context.page === page &&
              (!fixedSource ||
                sourceKey(r.context.source) === sourceKey(fixedSource)),
          ) && <p>Henüz kaydedilmiş taslak yok.</p>}
        {opened && (
          <article className="assistant-saved">
            <h3>{assistantTasks[opened.context.task]?.label}</h3>
            <p>
              {opened.context.label} ·{' '}
              {opened.origin === 'ai'
                ? 'AI destekli, koordinatörce gözden geçirilmiş taslak'
                : 'Elle hazırlanmış taslak'}
            </p>
            <p className="muted">
              Kaydedildiği andaki kaynağa dayanır; sonraki değişiklikler bu
              metni otomatik güncellemez.
            </p>
            <pre>{opened.draft}</pre>
            <button
              type="button"
              onClick={() => work(() => copy(opened.draft))}
            >
              <Copy size={16} />
              Kayıtlı metni kopyala
            </button>
          </article>
        )}
      </div>
      {busy && <output>İşlem sürüyor…</output>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <output className="success">{notice}</output>}
    </section>
  );
}
