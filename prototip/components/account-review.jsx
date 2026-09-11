'use client';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, FileText, ShieldCheck, Search, Download, Check, CircleHelp } from 'lucide-react';
import { accountCase, identityLabels, accessLabels, applyAccountReview, reviewRecommendation, accountReviewDraft, accountReviewText } from '../lib/account-review.mjs';

export default function AccountReview({ review, setReview, onBack, download }) {
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const applied = review.applied || { identity: 'pending', access: 'unknown' };
  const change = (key, value) => { setReview({ ...review, [key]: value, ...(key === 'identity' ? { access: 'unknown' } : {}), applied: null, draft: '' }); setSaved(false); setError(''); };
  const rows = [
    ['ESEP kullanıcı ID', 'id'], ['Profil iç kimliği', 'profileId'], ['Kayıt tarihi', 'registered'],
    ['Son giriş', 'lastLogin'], ['Hesap durumu', 'status'], ['E-posta · maskeli', 'email'],
    ['Okul bağlantısı', 'schoolNote'], ['Diğer okul bilgisi', 'previousSchool'],
  ];
  return <div className="account-review">
    <button className="text-link" onClick={onBack}><ArrowLeft size={17} /> Kayıt ve Validasyona dön</button>
    <section className="card case-overview" aria-labelledby="case-title">
      <div><span className="eyebrow">İLK HESAP İNCELEMESİ · {accountCase.id}</span><h2 id="case-title">{accountCase.name}</h2><p>{accountCase.school} · İki ESEP profili</p></div>
      <div className="case-meta"><span className="badge amber">{identityLabels[applied.identity]}</span><small>Kaynak kontrolü: {accountCase.checkedAt}</small></div>
    </section>
    <div className="case-stepper" aria-label="İnceleme adımları"><span className="done"><Check size={17} /> 1. Kanıtları karşılaştır</span><span className="current"><Search size={17} /> 2. Kimlik ve erişimi teyit et</span><span><FileText size={17} /> 3. İşlem önerisini hazırla</span></div>
    <p className="case-context">Bu senaryodaki kişi, kurum ve hesap bilgileri temsilidir. Bu ekrandaki seçimler deneme amaçlıdır; gerçek hesap durumunu değiştirmez.</p>
    <section className="card case-comparison" aria-labelledby="comparison-title">
      <div className="card-heading"><h2 id="comparison-title">Hesapları yan yana karşılaştır</h2><span className="badge">Ortak okul ID: {accountCase.schoolId}</span></div>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard focus enables horizontal scrolling of the comparison table. */}
      <section className="case-table-wrap" tabIndex={0} aria-label="İki hesabın karşılaştırma tablosu">
        <table className="case-table"><caption className="sr-only">Örnek Öğretmen’ın 2015 ve 2023 ESEP hesapları</caption><thead><tr><th scope="col">Kontrol alanı</th>{accountCase.accounts.map(a => <th scope="col" key={a.id}><strong>{a.label}</strong><small>Temsili hesap</small></th>)}</tr></thead><tbody>
          {rows.map(([label, key]) => <tr key={key}><th scope="row">{label}</th>{accountCase.accounts.map(a => <td key={a.id}>{a[key]}</td>)}</tr>)}
          <tr><th scope="row">Proje geçmişi</th>{accountCase.accounts.map(a => <td key={a.id}><strong className="case-project-count">{a.projects.length} kapalı proje</strong><details><summary>Proje ve rolleri göster</summary><ul className="case-projects">{a.projects.map(p => <li key={p.url}><span>{p.title}</span><small>{p.role} · {p.status} · {p.date}</small></li>)}</ul></details></td>)}</tr>
        </tbody></table>
      </section>
      <p className="case-footnote">Temsili hesapların e-posta adresleri farklıdır. “Okul üyeliği kaldırılmış” ifadesi öğretmen hesabının silindiği anlamına gelmez.</p>
    </section>
    <div className="case-evidence-grid">
      <section className="card case-evidence"><h2><ShieldCheck size={21} /> Doğrulanan bilgiler</h2><ul><li>İki farklı profil, aynı ad ve aynı okul kimliği.</li><li>İki hesap da Dormant durumunda.</li><li>Her iki hesapta da proje geçmişi var.</li><li>2015 hesabında kurucu ve yönetici rolleri bulunuyor.</li></ul></section>
      <section className="card case-evidence case-unconfirmed"><h2><CircleHelp size={21} /> Teyit bekleyen bilgiler</h2><ul><li>İki hesabın aynı gerçek kişiye ait olması.</li><li>Öğretmenin hangi hesaba erişebildiği.</li><li>Kullanmak istediği hesap ve kalite etiketi geçmişi.</li><li>Olası hesap işleminin projelere etkisi.</li></ul></section>
    </div>
    <section className="case-advice" aria-labelledby="advice-title"><span className="eyebrow">REFİKA’NIN ÖNERİSİ</span><h2 id="advice-title">{applied.identity === 'pending' ? 'Önce kimlik ve erişim teyidi' : 'Teyit bilgisine göre sonraki adım'}</h2><p>{reviewRecommendation(applied)}</p><small>Yeni hesap daha yakın zamanda kullanılmış; eski hesapta daha fazla proje var. Bu iki bilgi tek başına korunacak hesabı belirlemez.</small></section>
    <section className="card case-assessment" aria-labelledby="assessment-title"><h2 id="assessment-title">Koordinatör değerlendirmesi</h2><p className="case-footnote">Seçimler bu tarayıcıdaki demo kaydında korunur. Kalıcı bir kopya için inceleme notunu indirin.</p>
      <form onSubmit={e => { e.preventDefault(); try { const next = applyAccountReview(review); setReview({ ...review, applied: next, draft: '' }); setSaved(true); setError(''); } catch (err) { setError(err.message); } }}>
        <div className="case-form-grid"><label className="field">Kişi–hesap ilişkisi<select value={review.identity} onChange={e => change('identity', e.target.value)}>{Object.entries(identityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="field">Öğretmenin erişim durumu<select disabled={review.identity !== 'same'} value={review.access} onChange={e => change('access', e.target.value)}>{Object.entries(accessLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
        <label className="field">Teyit veya düzeltme dayanağı ve tarihi<textarea rows={3} value={review.evidence} required={review.identity !== 'pending'} onChange={e => change('evidence', e.target.value)} placeholder="Örneğin: öğretmen teyidi / kaynak belge ve tarih. Denemede gerçek iletişim bilgisi yazmayın." /></label>
        {error && <p className="error" role="alert">{error}</p>}<div className="actions"><button className="primary">Değerlendirmeyi uygula <Check size={17} /></button>{saved && <output>Deneme değerlendirmesi uygulandı.</output>}</div>
      </form>
    </section>
    <section className="card case-draft" aria-labelledby="draft-title"><div className="card-heading"><h2 id="draft-title">{applied.identity === 'same' ? 'NSO destek taslağı' : applied.identity === 'pending' ? 'Öğretmene bilgi talebi taslağı' : 'İç inceleme taslağı'}</h2><span className="badge amber">Gönderilmedi</span></div><p>Alıcı ve metin koordinatör tarafından incelenir. Bu prototipten mesaj gönderilmez.</p>
      <div className="actions"><button className="secondary" onClick={() => setReview({ ...review, draft: accountReviewDraft(review) })}>Taslağı hazırla <ArrowRight size={17} /></button><button className="secondary" onClick={() => download('REFIKA-HI-001-inceleme.txt', accountReviewText(review))}><Download size={17} /> İnceleme notunu indir</button></div>
      {review.draft && <div className="case-draft-editor"><label className="field">Düzenlenebilir taslak<textarea rows={15} value={review.draft} onChange={e => setReview({ ...review, draft: e.target.value })} /></label><button className="primary" onClick={() => download('REFIKA-HI-001-gonderilmemis-taslak.txt', review.draft)}>Taslağı indir <Download size={17} /></button></div>}
    </section>
    <details className="case-rules"><summary>Hesap incelemesinin dayandığı kurallar</summary><p>Dormant durumu, mükerrer hesap kararı değildir. <a target="_blank" rel="noreferrer" href="https://school-education.ec.europa.eu/en/etwinning_privacy_policy">ESEP gizlilik politikası</a>.</p><p>2022 geçiş dönemi rehberi kişisel hesapların birleştirilemediğini ve bazı durumlarda iki hesabın korunabildiğini anlatır. Güncel vaka için NSO rehberliği gerekir. <a target="_blank" rel="noreferrer" href="https://www.esep-support.eu/en-GB/kb/articles/what-can-i-do-if-i-have-a-duplicate-account">Mükerrer hesap rehberi</a>.</p><p>Okul birleştirmesi ayrı bir süreçtir. Aynı okul oldukları doğrulanmış kurum kayıtları için değerlendirilir. <a target="_blank" rel="noreferrer" href="https://school-education.ec.europa.eu/en/about/contact-support/release-notes">ESEP sürüm notları</a>.</p></details>
  </div>;
}
