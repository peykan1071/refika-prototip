import React, { useState } from 'react';
import { ChevronDown, ClipboardList, Download, Plus, X } from 'lucide-react';
import './plan-workspace.css';

const monthLabel = (value) =>
  new Intl.DateTimeFormat('tr-TR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value + '-01T12:00:00Z'));
const blankItem = (year) => ({
  month: `${year}-09`,
  dateLabel: '',
  title: '',
  description: '',
  expectedOutput: '',
  implementationNote: '',
  theme: '',
});
const itemFields = [
  ['dateLabel', 'Çalışma günleri (ör. 5–9 Ekim / Ay boyunca)'],
  ['title', 'Faaliyet / çalışma adı'],
  ['description', 'Uygulama ve amaç'],
  ['expectedOutput', 'Beklenen çıktı'],
  ['implementationNote', 'Validasyon / uygulama notu'],
];

export function PlanWorkspace({ state, run, busy, api, fileData, onActivity }) {
  const plans = state.plans || [];
  const [selected, setSelected] = useState(''),
    [open, setOpen] = useState(''),
    [form, setForm] = useState(null),
    [preview, setPreview] = useState(null);
  const plan = plans.find((p) => p.id === selected) || plans[0];
  const months = [...new Set((plan?.items || []).map((i) => i.month))].sort();
  const activeMonth =
    open ||
    months.find((m) => m === new Date().toISOString().slice(0, 7)) ||
    months[0];
  const change = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setPreview(null);
  };
  const editItem = (index, patch) =>
    change({
      items: form.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
  const start = (existing) => {
    setPreview(null);
    setForm(
      existing
        ? { ...existing }
        : {
            title: 'İl Koordinatörü Faaliyet Planı',
            year: Number(state.settings.year.slice(0, 4)),
            sourceUrl: '',
            planText: '',
            progressText: '',
            items: [],
          },
    );
  };
  return (
    <div className="activity-plan">
      <section className="plan-hero">
        <div>
          <small>eTWINNING · İL KOORDİNATÖRLÜĞÜ</small>
          <h2>{plan?.title || 'İl Koordinatörü Faaliyet Planı'}</h2>
          <p>Aylık çalışmalar, beklenen çıktılar ve uygulama notları</p>
        </div>
        <span>{plan?.schoolYear || state.settings.year}</span>
      </section>
      <div className="section-head plan-tools">
        <div>
          {plans.length > 1 && (
            <label>
              Plan yılı{' '}
              <select
                aria-label="Plan yılı seç"
                value={plan?.id}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setOpen('');
                }}
              >
                {plans.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.year} · {p.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {plan && (
            <p>
              {months.length} ay · {plan.items.length} plan maddesi · Kaynak
              yılı: {plan.year}
            </p>
          )}
        </div>
        <div className="actions">
          <button disabled={busy} onClick={() => start(null)}>
            <Plus size={16} /> Plan ekle
          </button>
          {plan && (
            <button disabled={busy} onClick={() => start(plan)}>
              Planı güncelle
            </button>
          )}
        </div>
      </div>
      {form && (
        <section className="panel plan-editor">
          <div className="section-head">
            <h2>{form.id ? 'Planı güncelle' : 'Faaliyet planı ekle'}</h2>
            <button
              aria-label="Plan formunu kapat"
              onClick={() => {
                setForm(null);
                setPreview(null);
              }}
            >
              <X size={18} />
            </button>
          </div>
          <p>
            YEĞİTEK’teki gibi planınızı ve ilerleme durumunu ayrı ekleyin.
            Bağlantı kaynak olarak saklanır; içeriği kopyalayıp yapıştırın veya
            Word dosyanızı seçin.
          </p>
          <div className="form-grid">
            <label>
              Plan başlığı
              <input
                value={form.title}
                maxLength={250}
                onChange={(e) => change({ title: e.target.value })}
              />
            </label>
            <label>
              YEĞİTEK plan yılı
              <input
                type="number"
                min="2000"
                max="2099"
                disabled={!!form.id}
                value={form.year}
                onChange={(e) => change({ year: e.target.value })}
              />
            </label>
            <label className="plan-wide">
              Kaynak bağlantısı (isteğe bağlı)
              <input
                type="url"
                value={form.sourceUrl}
                placeholder="https://yegitek.eba.gov.tr/faaliyet-plani/…"
                onChange={(e) => change({ sourceUrl: e.target.value })}
              />
            </label>
            <label className="plan-wide">
              Plan dosyası (.docx, .html, .txt · en fazla 5 MB)
              <input
                type="file"
                accept=".docx,.html,.htm,.txt"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file)
                    run(async () => {
                      change({
                        file: await fileData(file),
                        planText: '',
                        planHtml: undefined,
                        items: undefined,
                      });
                    });
                  e.target.value = '';
                }}
              />
              {form.file && (
                <small>
                  Seçilen dosya: {form.file.name}. İçeriği görmek için
                  önizleyin.
                </small>
              )}
            </label>
            <label className="plan-wide">
              Faaliyet planı metni
              <textarea
                rows={7}
                value={form.planText}
                placeholder="YEĞİTEK’teki Faaliyet Planı alanının tamamını kopyalayıp buraya yapıştırın."
                onChange={(e) =>
                  change({
                    planText: e.target.value,
                    planHtml: undefined,
                    file: undefined,
                    items: [],
                  })
                }
                onPaste={(e) => {
                  const html = e.clipboardData.getData('text/html');
                  if (html) {
                    e.preventDefault();
                    change({
                      planHtml: html,
                      planText: e.clipboardData.getData('text/plain'),
                      file: undefined,
                      items: undefined,
                    });
                  }
                }}
              />
            </label>
            <label className="plan-wide">
              İlerleme durumu / kaynak notları
              <textarea
                rows={4}
                value={form.progressText}
                onChange={(e) => change({ progressText: e.target.value })}
              />
              <small>
                Bu notlar faaliyetleri otomatik olarak tamamlamaz. Sonuç ve
                kanıt faaliyet kaydında tutulur.
              </small>
            </label>
          </div>
          <details className="plan-edit-items">
            <summary>
              Aylık maddeleri incele / düzenle ({form.items?.length || 0})
            </summary>
            <p>
              Aylık başlık ve dört sütunlu tablolar otomatik ayrılır. Farklı bir
              plan biçiminiz varsa maddeleri buradan ekleyin. Metni yeniden
              değiştirmeniz maddelerin tekrar ayrılmasını gerektirir.
            </p>
            {(form.items || []).map((item, index) => (
              <details key={index} className="plan-edit-item">
                <summary>
                  {item.month} · {item.title || 'Yeni madde'}
                </summary>
                <div className="form-grid">
                  <label>
                    Ay
                    <input
                      type="month"
                      value={item.month}
                      onChange={(e) =>
                        editItem(index, { month: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Ayın teması
                    <input
                      value={item.theme}
                      onChange={(e) =>
                        editItem(index, { theme: e.target.value })
                      }
                    />
                  </label>
                  {itemFields.map(([key, label]) => (
                    <label key={key} className="plan-wide">
                      {label}
                      <textarea
                        rows={key === 'description' ? 3 : 2}
                        value={item[key]}
                        onChange={(e) =>
                          editItem(index, { [key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
                <button
                  onClick={() =>
                    change({ items: form.items.filter((_, i) => i !== index) })
                  }
                >
                  Maddeyi çıkar
                </button>
              </details>
            ))}
            <button
              onClick={() =>
                change({ items: [...(form.items || []), blankItem(form.year)] })
              }
            >
              <Plus size={16} /> Aylık madde ekle
            </button>
          </details>
          {preview && (
            <div className="notice">
              <b>{preview.plan.items.length} plan maddesi hazır.</b>{' '}
              {preview.action === 'update'
                ? 'Bu yılın mevcut planı güncellenecek. Daha önce oluşturduğunuz faaliyet kayıtları korunur.'
                : preview.action === 'unchanged'
                  ? 'Plan zaten aynı içerikle kayıtlı; ikinci kopya oluşmayacak.'
                  : 'Plan bu il çalışma alanına kaydedilecek.'}
              {preview.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
              <p>
                Aylık maddeleri ve metni kontrol edip kaydedin. Planı aktarmak
                gerçekleşme sayısını değiştirmez.
              </p>
            </div>
          )}
          <div className="actions">
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const result = await api('/plans/preview', form);
                  setForm({
                    ...result.plan,
                    id: result.version ? result.plan.id : undefined,
                    version: result.version,
                  });
                  setPreview(result);
                })
              }
            >
              Planı önizle
            </button>
            {preview && (
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const saved = await api('/plans/commit', {
                      ...form,
                      token: preview.token,
                    });
                    setSelected(saved.id);
                    setForm(null);
                    setPreview(null);
                    setOpen('');
                  }, 'Faaliyet planı kaydedildi.')
                }
              >
                Kontrol ettim, planı kaydet
              </button>
            )}
          </div>
        </section>
      )}
      {!plan && !form && (
        <section className="panel">
          <h2>Faaliyet planınızı ekleyin</h2>
          <p>
            YEĞİTEK planınızı yapıştırarak veya Word dosyasından başlayın. Her
            il kendi planını aynı aylık düzende kullanabilir.
          </p>
          <button className="primary" onClick={() => start(null)}>
            Plan ekle
          </button>
        </section>
      )}
      {plan && (
        <>
          <div className="plan-months">
            {months.map((month) => {
              const items = plan.items.filter((i) => i.month === month);
              return (
                <article className="plan-month panel" key={month}>
                  <button
                    className="plan-month-head"
                    aria-expanded={activeMonth === month}
                    onClick={() =>
                      setOpen(activeMonth === month ? 'closed' : month)
                    }
                  >
                    <div>
                      <small>{monthLabel(month)}</small>
                      <h2>{items[0]?.theme || 'Aylık çalışmalar'}</h2>
                      <p>{items.length} plan maddesi</p>
                    </div>
                    <ChevronDown
                      className={activeMonth === month ? 'turned' : ''}
                    />
                  </button>
                  {activeMonth === month && (
                    <div className="plan-items">
                      {items.map((item) => {
                        const linked = state.activities.filter(
                          (a) =>
                            a.planSource?.planId === plan.id &&
                            a.planSource?.planItemId === item.id,
                        );
                        return (
                          <section className="plan-item" key={item.id}>
                            <div className="plan-date">{item.dateLabel}</div>
                            <div className="plan-main">
                              <h3>{item.title}</h3>
                              <p>{item.description}</p>
                              <dl>
                                <dt>Beklenen çıktı</dt>
                                <dd>{item.expectedOutput || 'Belirtilmedi'}</dd>
                                <dt>Uygulama notu</dt>
                                <dd>
                                  {item.implementationNote || 'Belirtilmedi'}
                                </dd>
                              </dl>
                              <div className="plan-flow">
                                <button onClick={() => onActivity(plan, item)}>
                                  <ClipboardList size={17} /> Faaliyet kaydı
                                  oluştur
                                </button>
                                {linked.map((a) => (
                                  <button
                                    key={a.id}
                                    onClick={() => onActivity(plan, item, a)}
                                  >
                                    {a.title} ·{' '}
                                    {a.status === 'completed'
                                      ? 'Sonuç kaydedildi'
                                      : 'Planlandı'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <section className="panel plan-source">
            <h2>Kaynak plan ve ilerleme</h2>
            <p>
              Bir plan maddesinden birden fazla faaliyet oluşturabilirsiniz.
              Tarihi, türü ve katılımı her çalışma için belirleyin; gerçekleşme
              ve kanıtı çalışmadan sonra kaydedin.
            </p>
            {plan.sourceUrl && (
              <p>
                <a href={plan.sourceUrl} target="_blank" rel="noreferrer">
                  Kaynak planı aç
                </a>
              </p>
            )}
            <details>
              <summary>Planın tam metni ve uygulama esasları</summary>
              <div className="plan-source-text">
                {plan.planText || 'Aylık maddeler elle eklendi.'}
              </div>
            </details>
            <details>
              <summary>İlerleme durumu / kaynak notları</summary>
              <div className="plan-source-text">
                {plan.progressText || 'İlerleme notu eklenmedi.'}
              </div>
            </details>
            <a className="button" href={`/api/plans/${plan.id}/export`}>
              <Download size={16} /> Plan verisini indir
            </a>
            <p className="muted">
              İleride yapay zekâyla hazırlık çalışması için plan maddeleri,
              kaynak metin ve ilerleme notları ayrı saklanır. Bu aktarımda yapay
              zekâ kullanılmaz.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
