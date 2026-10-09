import { useEffect, useState } from 'react';
import { Download, Copy, ExternalLink, Plus } from 'lucide-react';
import { caseKinds, caseStatuses } from '../validation.mjs';
import {
  useTablePage,
  TablePagination,
  TableOrder,
} from './table-pagination.jsx';
import './validation-periods.css';

const outcomes = {
  approved: 'Olumlu sonuçlandı',
  rejected: 'Reddedildi',
  other: 'Diğer sonuç',
};
const quarters = ['Ocak–Mart', 'Nisan–Haziran', 'Temmuz–Eylül', 'Ekim–Aralık'];
const date = (value) =>
  value ? value.slice(0, 10).split('-').reverse().join('.') : '—';
const now = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(
    new Date(),
  );
function HistoryForm({ api, run, busy, close }) {
  const [value, setValue] = useState({
    kind: 'person',
    name: '',
    accountId: '',
    school: '',
    schoolId: '',
    title: '',
    requestedAction: '',
    happenedAt: '',
    messageUrl: '',
    note: '',
    completed: false,
    outcome: 'approved',
    resultAt: '',
    evidenceUrl: '',
    resultNote: '',
    dateBasis: 'notification',
    confirmed: false,
  });
  const change = (key, next) => setValue((v) => ({ ...v, [key]: next }));
  const field = (key, label, type = 'text', required = true) => (
    <label>
      {label}
      <input
        type={type}
        required={required}
        value={value[key]}
        onChange={(e) => change(key, e.target.value)}
      />
    </label>
  );
  return (
    <form
      className="panel history-entry"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const result = await api('/validation-history', {
            ...value,
            reason: value.note,
            happenedAt: value.happenedAt + ':00+03:00',
            result: value.completed
              ? {
                  outcome: value.outcome,
                  happenedAt: value.resultAt + ':00+03:00',
                  note: value.resultNote,
                  evidenceUrl: value.evidenceUrl,
                  dateBasis: value.dateBasis,
                }
              : undefined,
          });
          if (result.alreadyImported)
            throw new Error(
              'Bu kaynak ve hesap için geçmiş kayıt zaten var. Mevcut dosyayı açın.',
            );
          close();
        }, 'Tarihli geçmiş kayıt kaydedildi.');
      }}
    >
      <h3>E-posta veya belgeden geçmiş kayıt</h3>
      <p>
        Bir kişi veya okul için bir talep kaydedin. Yalnız gönderim kanıtı varsa
        sonuç beklenir. Sonuç eklemek için o kayda ait açık onay veya sonuç
        dayanağı gerekir. Saatler Türkiye saatidir.
      </p>
      <div className="form-grid">
        <label>
          İşlem türü
          <select
            value={value.kind}
            onChange={(e) => change('kind', e.target.value)}
          >
            {Object.entries(caseKinds).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {field('title', 'Talep / e-posta konusu')}
        {field(
          'name',
          'Ad soyad',
          'text',
          ['person', 'membership'].includes(value.kind),
        )}
        {field(
          'accountId',
          'ESEP hesap ID',
          'text',
          ['person', 'membership'].includes(value.kind),
        )}
        {field(
          'school',
          'Okul adı',
          'text',
          ['school', 'merger'].includes(value.kind),
        )}
        {field(
          'schoolId',
          'Okul ID',
          'text',
          ['school', 'merger'].includes(value.kind),
        )}
        {field(
          'happenedAt',
          'Gerçek gönderim tarihi ve saati',
          'datetime-local',
        )}
        {field('messageUrl', 'Gönderilmiş e-posta / kaynak bağlantısı', 'url')}
        <label>
          Talep edilen işlem
          <textarea
            required
            value={value.requestedAction}
            onChange={(e) => change('requestedAction', e.target.value)}
          />
        </label>
        <label>
          Kaynak ve kişi eşleştirme dayanağı
          <textarea
            required
            value={value.note}
            onChange={(e) => change('note', e.target.value)}
          />
        </label>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={value.completed}
          onChange={(e) => change('completed', e.target.checked)}
        />{' '}
        Bu talebin sonucunu gösteren kaynağım var
      </label>
      {value.completed && (
        <div className="form-grid">
          <label>
            Sonuç
            <select
              value={value.outcome}
              onChange={(e) => change('outcome', e.target.value)}
            >
              {Object.entries(outcomes).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {field('resultAt', 'Sonuç tarihi ve saati', 'datetime-local')}
          <label>
            Tarih dayanağı
            <select
              value={value.dateBasis}
              onChange={(e) => change('dateBasis', e.target.value)}
            >
              <option value="notification">Sonuç bildirimindeki tarih</option>
              <option value="actual">Belgeli gerçekleşme tarihi</option>
            </select>
          </label>
          {field('evidenceUrl', 'Onay / sonuç kaynağı bağlantısı', 'url')}
          <label>
            Bu kayda ait sonuç dayanağı
            <textarea
              required
              value={value.resultNote}
              onChange={(e) => change('resultNote', e.target.value)}
            />
          </label>
        </div>
      )}
      <label className="check">
        <input
          required
          type="checkbox"
          checked={value.confirmed}
          onChange={(e) => change('confirmed', e.target.checked)}
        />{' '}
        Kişi / okul eşleşmesini, işlem türünü ve kaynak tarihlerini kontrol
        ettim.
      </label>
      <div className="actions">
        <button disabled={busy}>Geçmiş kaydı sakla</button>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={close}
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}

export function ValidationPeriods({ state, api, run, busy, openCase }) {
  const [year, setYear] = useState(now().slice(0, 4));
  const [quarter, setQuarter] = useState('all');
  const [requestStatus, setRequestStatus] = useState('all');
  const [resultOrder, setResultOrder] = useState('added');
  const [requestOrder, setRequestOrder] = useState('added');
  const [response, setResponse] = useState(null),
    [copied, setCopied] = useState(false),
    [history, setHistory] = useState(false);
  const path = `/validation-periods?year=${year}&quarter=${quarter}`;
  const requestKey = path + ':' + state.revision;
  const validYear = /^20\d{2}$/.test(year);
  const data = response?.key === requestKey ? response.data : null;
  const shownRequests = (data?.requests || []).filter(
    (r) =>
      requestStatus === 'all' ||
      (requestStatus === 'waiting'
        ? r.currentStatus !== 'completed'
        : r.currentOutcome === requestStatus),
  );
  const resultPage = useTablePage(data?.results || [], requestKey, resultOrder);
  const requestPage = useTablePage(
    shownRequests,
    requestKey + ':' + requestStatus,
    requestOrder,
  );
  const error = !validYear
    ? '2000–2099 arasında bir yıl girin.'
    : response?.key === requestKey
      ? response.error
      : '';
  useEffect(() => {
    let current = true;
    if (!validYear) return;
    api(path)
      .then((result) => {
        if (current) setResponse({ key: requestKey, data: result });
      })
      .catch((e) => {
        if (current) setResponse({ key: requestKey, error: e.message });
      });
    return () => {
      current = false;
    };
  }, [path, requestKey, validYear, api]);
  const source = (url, label = 'Kaynak') =>
    url ? (
      <a href={url} target="_blank" rel="noreferrer">
        {label} <ExternalLink size={13} />
      </a>
    ) : (
      '—'
    );
  const open = (row) =>
    openCase && (
      <button className="text-button" onClick={() => openCase(row.caseId)}>
        Kaydı aç
      </button>
    );
  return (
    <div className="validation-periods">
      <section className="panel">
        <div className="section-head">
          <h2>Dönemlik validasyon kayıtları</h2>
          <button disabled={busy} onClick={() => setHistory(!history)}>
            <Plus size={16} /> Geçmiş kayıt ekle
          </button>
        </div>
        <p>
          Her sonuç tarihiyle saklanır. Kişi hesabı onayları benzersiz ESEP
          hesap ID’sine göre sayılır; aynı hesap yıl içinde tekrar sonuçlanırsa
          yıllık kişi sayısı artmaz.
        </p>
        <div className="period-controls">
          <label>
            Takvim yılı
            <input
              type="number"
              min="2000"
              max="2099"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setCopied(false);
              }}
            />
          </label>
          <label>
            Dönem
            <select
              value={quarter}
              onChange={(e) => {
                setQuarter(e.target.value);
                setCopied(false);
              }}
            >
              <option value="all">Yılın tamamı · dört dönem</option>
              {quarters.map((q, i) => (
                <option key={q} value={i + 1}>
                  {i + 1}. Dönem · {q}
                </option>
              ))}
            </select>
          </label>
          {data && (
            <a
              className="button secondary"
              href={'/api' + path + '&format=xlsx'}
            >
              <Download size={16} /> Ayrıntılı Excel indir
            </a>
          )}
        </div>
        <p className="muted">
          Yalnız REFİKA’ya kaydedilen işlemler kapsanır. Eksik arşivler sıfır
          işlem yapıldığı anlamına gelmez. Sonuç tarihi bilinmiyorsa bildirim
          tarihi açıkça işaretlenir.
        </p>
      </section>
      {history && (
        <HistoryForm
          api={api}
          run={run}
          busy={busy}
          close={() => setHistory(false)}
        />
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <output>Dönem kayıtları yükleniyor…</output>}
      {data && (
        <>
          <section className="panel">
            <h3>{data.period.label}</h3>
            <div className="period-metrics">
              {[
                [data.totals.validatedPeople, 'Valide edilen benzersiz hesap'],
                [data.totals.personApprovals, 'Kişi hesabı onay işlemi'],
                [data.totals.membershipApprovals, 'Organizasyon değişikliği'],
                [data.pendingCount, 'Çözüm bekleyen dosya'],
                [
                  data.totals.schoolApprovals + data.totals.mergers,
                  'Okul onayı / birleştirme',
                ],
              ].map(([n, label]) => (
                <div key={label}>
                  <strong>{n}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Dönem</th>
                    <th>Benzersiz kişi hesabı</th>
                    <th>Kişi onay işlemi</th>
                    <th>Organizasyon</th>
                    <th>Yeni okul</th>
                    <th>Birleştirme</th>
                    <th>Destek</th>
                    <th>Reddedilen / diğer</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.quarters, data.annual].map((r) => (
                    <tr key={r.quarter}>
                      <th>
                        {r.quarter === 'all'
                          ? 'Yıllık benzersiz toplam'
                          : `${r.quarter}. Dönem · ${quarters[Number(r.quarter) - 1]}`}
                      </th>
                      <td>{r.validatedPeople}</td>
                      <td>{r.personApprovals}</td>
                      <td>{r.membershipApprovals}</td>
                      <td>{r.schoolApprovals}</td>
                      <td>{r.mergers}</td>
                      <td>{r.support}</td>
                      <td>
                        {r.rejected} / {r.other}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!!data.totals.unidentifiedPeople && (
              <p className="error">
                Kimliği eksik {data.totals.unidentifiedPeople} sonuç benzersiz
                hesap sayısına katılmadı.
              </p>
            )}
          </section>
          <section className="panel">
            <h3>Tarihli sonuç listesi · {data.results.length}</h3>
            <TableOrder
              value={resultOrder}
              onChange={setResultOrder}
              label="Sonuç sıralaması"
            />
            <p className="muted">
              Gerçek sonuç / onay bildirimi tarihi ile REFİKA’ya kaydetme tarihi
              ayrı tutulur.
            </p>
            {!data.results.length ? (
              <p>Seçilen dönemde kayıtlı sonuç yok.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Sıra no</th>
                      <th>Sonuç no</th>
                      <th>Sonuç tarihi</th>
                      <th>Kişi / hesap</th>
                      <th>Okul / işlem</th>
                      <th>Sonuç ve dayanak</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultPage.rows.map((r, index) => (
                      <tr key={r.id}>
                        <td className="table-row-number">
                          {resultPage.from + index}
                        </td>
                        <td className="table-result-reference">
                          <strong>{r.reference}</strong>
                        </td>
                        <td>
                          {date(r.date)}
                          <small>
                            {r.dateBasis === 'notification'
                              ? 'Bildirim tarihi'
                              : 'Gerçekleşme tarihi'}
                          </small>
                          <small>REFİKA kaydı: {date(r.recordedDate)}</small>
                        </td>
                        <td>
                          {r.name || r.title}
                          <small>
                            {r.accountId ||
                              r.profileId ||
                              'Kimlik bilgisi eksik'}
                          </small>
                        </td>
                        <td>
                          {r.school || '—'}
                          <small>
                            {caseKinds[r.kind] || 'Tür bilgisi eksik'}
                          </small>
                        </td>
                        <td>
                          {outcomes[r.outcome]}
                          <details>
                            <summary>Dayanağı göster</summary>
                            <p>{r.note}</p>
                            {source(r.evidenceUrl)}
                          </details>
                        </td>
                        <td>{open(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <TablePagination
              pagination={resultPage}
              label="Tarihli sonuç listesi"
            />
          </section>
          <section className="panel">
            <h3>Tarihli gönderim listesi · {shownRequests.length}</h3>
            <TableOrder
              value={requestOrder}
              onChange={setRequestOrder}
              label="Gönderim sıralaması"
            />
            <label>
              Gönderim durumu{' '}
              <select
                value={requestStatus}
                onChange={(e) => setRequestStatus(e.target.value)}
              >
                <option value="all">Tüm kayıtlar</option>
                <option value="waiting">Çözüm bekleyenler</option>
                <option value="approved">Olumlu sonuçlananlar</option>
                <option value="rejected">Reddedilenler</option>
                <option value="other">Diğer sonuçlar</option>
              </select>
            </label>
            <p className="muted">
              Gönderilmiş talep onay sayılmaz. Durum sütunu dosyanın bugünkü
              durumudur.
            </p>
            {!shownRequests.length ? (
              <p>Seçilen dönem ve durum için kayıt yok.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Sıra no</th>
                      <th>Gönderim</th>
                      <th>Kişi / hesap</th>
                      <th>Okul / işlem</th>
                      <th>Güncel durum</th>
                      <th>Kaynak / işlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestPage.rows.map((r, index) => (
                      <tr key={r.id}>
                        <td className="table-row-number">
                          {requestPage.from + index}
                        </td>
                        <td>
                          {date(r.date)}
                          {r.purpose === 'precheck' && (
                            <small>Ön inceleme yazışması</small>
                          )}
                        </td>
                        <td>
                          {r.name || r.title}
                          <small>{r.accountId}</small>
                        </td>
                        <td>
                          {r.school}
                          <small>{caseKinds[r.kind]}</small>
                        </td>
                        <td>
                          {r.currentStatus === 'completed'
                            ? outcomes[r.currentOutcome] ||
                              caseStatuses.completed
                            : r.lastReply
                              ? 'Yanıt alındı · çözüm bekliyor'
                              : caseStatuses[r.currentStatus]}
                          {r.lastReply && (
                            <details>
                              <summary>
                                Son yanıt · {date(r.lastReply.date)}
                              </summary>
                              <p>{r.lastReply.note}</p>
                              {source(r.lastReply.messageUrl)}
                            </details>
                          )}
                        </td>
                        <td>
                          {source(r.messageUrl)}
                          {open(r)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <TablePagination
              pagination={requestPage}
              label="Tarihli gönderim listesi"
            />
          </section>
          <section className="panel">
            <h3>Rapora eklenecek validasyon özeti</h3>
            <textarea
              aria-label="Validasyon rapor özeti"
              readOnly
              rows={6}
              value={data.text}
            />
            <div className="actions">
              <button
                onClick={() =>
                  run(async () => {
                    await navigator.clipboard.writeText(data.text);
                    setCopied(true);
                  })
                }
              >
                <Copy size={16} /> Özeti kopyala
              </button>
              <a
                className="button secondary"
                href={'/api' + path + '&format=txt'}
              >
                <Download size={16} /> Metin indir
              </a>
              {copied && <output>Özet kopyalandı.</output>}
            </div>
            <p className="muted">
              Bu metin rapora eklenecek bir özettir; YEĞİTEK’e otomatik
              gönderilmez.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
