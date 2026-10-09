import { useState } from 'react';
import { esepStatusLabels } from '../esep-check.mjs';

const kinds = ['person', 'school', 'membership'];
const labels = ['Kişi hesabı', 'Okul kaydı', 'Bu okuldaki üyelik'];
function initial(row) {
  return Object.fromEntries(
    kinds.map((kind) => [
      kind,
      {
        status: 'unknown',
        sourceLabel: '',
        sourceUrl: '',
        profileUrl:
          kind === 'person' ? row.profileUrl || '' : row.schoolUrl || '',
        id:
          (kind === 'person' ? row.accountId : row.schoolId) ||
          row.esepCheck?.[kind].id ||
          '',
        relatedProfiles: row.esepCheck?.[kind].relatedProfiles || [],
      },
    ]),
  );
}
export function EsepCheckForm({ row, busy, onSave }) {
  const [parts, setParts] = useState(() => initial(row));
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  function set(kind, key, value) {
    setConfirmed(false);
    setParts((old) => ({ ...old, [kind]: { ...old[kind], [key]: value } }));
  }
  return (
    <details className="esep-check-form">
      <summary>Yeni ESEP kontrolü kaydet</summary>
      <p>
        Profil bağlantılarını açıp güncel durumu ESEP’ten okuyun. Kişi hesabı
        onayı, okul ve üyelik onayından ayrıdır. Kontrol etmediğiniz alanı
        “Kontrol edilemedi” bırakın.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const checkedAt = new Date().toISOString();
          onSave({
            confirmed,
            check: {
              checkedAt,
              note,
              ...Object.fromEntries(
                kinds.map((kind) => [kind, { ...parts[kind], checkedAt }]),
              ),
            },
          });
        }}
      >
        <fieldset disabled={busy}>
          {kinds.map((kind, index) => (
            <fieldset key={kind}>
              <legend>{labels[index]}</legend>
              <p>
                Kontrol edilen ID: {parts[kind].id || 'Kaynakta belirtilmemiş'}
              </p>
              <div className="form-grid">
                <label className="field">
                  <span>{labels[index]} durumu</span>
                  <select
                    value={parts[kind].status}
                    onChange={(e) => set(kind, 'status', e.target.value)}
                  >
                    {Object.entries(esepStatusLabels)
                      .filter(
                        ([key]) =>
                          kind === 'membership' ||
                          !['not_listed', 'removed'].includes(key),
                      )
                      .map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field">
                  <span>ESEP’te görünen durum metni</span>
                  <input
                    required={parts[kind].status !== 'unknown'}
                    maxLength={1500}
                    value={parts[kind].sourceLabel}
                    onChange={(e) => set(kind, 'sourceLabel', e.target.value)}
                  />
                </label>
                {kind !== 'membership' && (
                  <label className="field">
                    <span>Gerçek profil bağlantısı</span>
                    <input
                      type="url"
                      value={parts[kind].profileUrl}
                      onChange={(e) => set(kind, 'profileUrl', e.target.value)}
                    />
                  </label>
                )}
                <label className="field">
                  <span>Kontrol edilen ESEP sayfası</span>
                  <input
                    type="url"
                    required={parts[kind].status !== 'unknown'}
                    value={parts[kind].sourceUrl}
                    onChange={(e) => set(kind, 'sourceUrl', e.target.value)}
                  />
                </label>
              </div>
            </fieldset>
          ))}
          <label className="field">
            <span>Kontrol notu</span>
            <textarea
              maxLength={4000}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setConfirmed(false);
              }}
            />
          </label>
          <label className="check-line">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Bu durumları şimdi ESEP’teki ilgili kişi, okul ve üyelik
            kayıtlarından kontrol ettim.
          </label>
          <button type="submit" disabled={!confirmed}>
            ESEP kontrolünü tarihli kaydet
          </button>
        </fieldset>
      </form>
    </details>
  );
}
