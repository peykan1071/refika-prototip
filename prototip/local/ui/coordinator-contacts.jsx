import { useState } from 'react';

export function CoordinatorLinks({ contacts = {} }) {
  if (!contacts.email && !contacts.sheetUrl) return null;
  return (
    <div className="coordinator-links">
      {contacts.email && (
        <p>
          İl koordinatörlüğü ortak e-postası: <strong>{contacts.email}</strong>
        </p>
      )}
      {contacts.sheetUrl && (
        <>
          <a
            className="button"
            href={contacts.sheetUrl}
            target="_blank"
            rel="noreferrer"
          >
            Ortak E-Tabloyu aç / düzenle ↗
          </a>
          <p className="muted">
            Google E-Tabloda değişiklikleri yapıp Dosya → İndir → Microsoft
            Excel (.xlsx) ile güncel kopyayı alın. REFİKA’da yükleyip ilgili
            sekmeyi seçin. Mevcut kayıtlar tekrar eklenmez; geçmiş sonuçlar
            değişmez. Otomatik eşitleme yoktur.
          </p>
        </>
      )}
    </div>
  );
}

export function CoordinatorSettings({ state, api, run, busy }) {
  const [form, setForm] = useState(
    state.settings.contacts || { email: '', sheetUrl: '' },
  );
  return (
    <section className="panel">
      <h2>İl koordinatörlüğü iletişim bilgileri</h2>
      <p>
        İlinizin ortak e-posta adresini ve sürekli kullandığınız Google
        E-Tabloyu burada saklayın.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(
            () =>
              api('/settings/contacts', { ...form, revision: state.revision }),
            'Ortak e-posta ve E-Tablo bilgileri kaydedildi.',
          );
        }}
      >
        <label className="field">
          <span>Ortak e-posta</span>
          <input
            type="email"
            maxLength={254}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Ortak Google E-Tablo bağlantısı</span>
          <input
            type="url"
            maxLength={2000}
            placeholder="https://docs.google.com/spreadsheets/d/…/edit"
            value={form.sheetUrl}
            onChange={(e) => setForm({ ...form, sheetUrl: e.target.value })}
          />
        </label>
        <button className="primary" disabled={busy}>
          İletişim bilgilerini kaydet
        </button>
      </form>
      <CoordinatorLinks contacts={state.settings.contacts} />
      <p className="muted">
        Adres kaydı posta hesabında oturum açmaz veya mail göndermez. Mail
        alıcısı, talebin türüne göre ayrıca belirlenir.
      </p>
    </section>
  );
}
