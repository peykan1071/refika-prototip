import { esepStatusLabels } from '../esep-check.mjs';
import './esep-status.css';

const checkedTime = (value) =>
  new Date(value).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
export function EsepLinks({ row }) {
  return (
    <div className="esep-links">
      {row.profileUrl ? (
        <a href={row.profileUrl} target="_blank" rel="noreferrer">
          Kişi profili ↗
        </a>
      ) : row.accountId ? (
        <small>Kişi bağlantısı bekliyor</small>
      ) : null}
      {row.schoolUrl ? (
        <a href={row.schoolUrl} target="_blank" rel="noreferrer">
          Okul profili ↗
        </a>
      ) : row.schoolId ? (
        <small>
          {row.esepCheck?.school.status === 'not_found'
            ? 'Eski okul ID’si bulunamadı'
            : 'Okul bağlantısı bekliyor'}
        </small>
      ) : null}
      {row.esepCheck?.school.relatedProfiles?.map((profile) => (
        <a
          key={profile.profileUrl}
          href={profile.profileUrl}
          target="_blank"
          rel="noreferrer"
        >
          İlişkili okul · {profile.id} ↗
        </a>
      ))}
    </div>
  );
}
export function EsepStatus({ row, detailed = false }) {
  const check = row.esepCheck;
  return (
    <div className="esep-status">
      {detailed && <h2>Güncel ESEP kontrolü</h2>}
      {!detailed && check && <strong>Güncel ESEP</strong>}
      {!check ? (
        <small>Güncel ESEP kontrolü henüz kaydedilmedi.</small>
      ) : (
        <>
          {['person', 'school', 'membership'].map((kind, index) => (
            <div key={kind}>
              <span className={'esep-state esep-' + check[kind].status}>
                {['Kişi', 'Okul', 'Bu okuldaki üyelik'][index]}:{' '}
                {esepStatusLabels[check[kind].status]}
              </span>
              {detailed && (
                <details>
                  <summary>Kaynak ve kontrol zamanı</summary>
                  <p>
                    {check[kind].sourceLabel || 'Güncel durum doğrulanamadı.'}
                  </p>
                  <p>{check[kind].note}</p>
                  <p>{checkedTime(check[kind].checkedAt)}</p>
                  {check[kind].sourceUrl && (
                    <a
                      href={check[kind].sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      ESEP kontrol kaynağı ↗
                    </a>
                  )}
                </details>
              )}
              {detailed &&
                check[kind].relatedProfiles?.map((profile) => (
                  <div key={profile.profileUrl}>
                    <a
                      href={profile.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {profile.title} · ID {profile.id} ↗
                    </a>
                    <p>
                      {esepStatusLabels[profile.status]} ·{' '}
                      {checkedTime(profile.checkedAt)}
                    </p>
                    <p>{profile.sourceLabel}</p>
                    <p>{profile.note}</p>
                  </div>
                ))}
            </div>
          ))}
          <small>Kontrol: {checkedTime(check.checkedAt)}</small>
          {detailed && <p>{check.note}</p>}
        </>
      )}
      {detailed && (
        <p className="muted">
          Bu kontrol, belirtilen anda ESEP’te görülen durumdur. Geçmiş talebin
          sonucunu veya tarihini değiştirmez.
        </p>
      )}
    </div>
  );
}
