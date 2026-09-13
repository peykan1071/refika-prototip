'use client';
import { useState } from 'react';
import { CalendarDays, CheckCircle2, MapPin, Route, Video, Newspaper } from 'lucide-react';
import { saveTask, taskStates, visitReport, visitFormats, distanceStates } from '../lib/tasks.mjs';

const empty = () => ({ title: '', school: '', district: '', purpose: '', date: '', nextStep: '', result: '', evidence: '', audience: '', permission: '', actualParticipants: '', planReference: '', status: 'planned', format: 'field', distance: 'near' });
const planVisits = [
  { label:'28–30 Eylül 2026 · Yakın ilçe ziyaretleri', title:'Proje başlangıç rehberliği', date:'2026-09-28', purpose:'Proje tasarımı görüşmeleri, okul ihtiyacının belirlenmesi ve gerekli destek akışının planlanması.', nextStep:'Ziyaret sonucunu, okulun ihtiyaçlarını ve takip tarihini kaydet.', planReference:'Eylül 2026 · 28–30 Eylül' },
  { label:'15–19 Mart 2027 · Sergi çağrısı ve saha desteği', title:'Sergi çağrısı ve okul desteği', date:'2027-03-15', purpose:'Öğrenci ortak ürünlerini görünür kılacak sergi sürecini açıklamak ve okulun destek ihtiyacını belirlemek.', nextStep:'Ürün izinlerini, okul ihtiyaçlarını ve sergi katılım durumunu takip et.', planReference:'Mart 2027 · 15–19 Mart' },
  { label:'12–16 Nisan 2027 · Okul rehberliği', title:'Sergi hazırlığı ve okul rehberliği', date:'2027-04-12', purpose:'Sergiye aday çalışmaların ihtiyaçlarını belirlemek ve öğretmenlere randevulu proje desteği sunmak.', nextStep:'Geliştirilecek proje dosyalarını, izinleri ve sergi ihtiyaçlarını takip et.', planReference:'Nisan 2027 · 12–16 Nisan' },
];
export default function VisitWorkspace({ tasks, onChange, mode = 'visits', onOpen, onReport, ready = true }) {
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const ordered = [...tasks].sort((a,b) => a.date.localeCompare(b.date));
  const pending = ordered.filter(t => t.status === 'planned');
  const rows = mode === 'overview' ? pending.slice(0,3) : ordered;
  const field = (key, label, multiline = false, required = false) => <label className="field">{label}{multiline ? <textarea rows={3} required={required} maxLength={4000} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /> : <input type={key === 'date' ? 'date' : 'text'} required={required} maxLength={4000} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} />}</label>;
  function submit(e) {
    e.preventDefault();
    if (!ready) return;
    try {
      onChange(saveTask(tasks, draft, editing || crypto.randomUUID()));
      setNotice(draft.status === 'completed' ? 'Faaliyet kaydı tamamlandı. Haber ve dönem raporu taslağı hazırlanmaya hazır.' : 'Ziyaret planı çalışma masasına ve takvime eklendi.');
      setDraft(empty()); setEditing(null); setError('');
    } catch (err) { setError(err.message); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob(['\uFEFF'+visitReport(tasks)], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a'); link.href=url;link.download='REFIKA-ornek-ziyaret-ozeti.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className="card visit-workspace">
    <div className="card-heading"><h2>{mode === 'overview' ? 'Yaklaşan okul ziyaretleri' : mode === 'report' ? 'Okul ziyaretleri faaliyet özeti' : mode === 'calendar' ? 'Ziyaret takvimim' : 'Okul ziyareti planla ve izle'}</h2><span className="badge">{pending.length} planlandı · {tasks.length-pending.length} tamamlandı</span></div>
    {mode === 'visits' && <>
      <div className="visit-capacity"><CalendarDays /><div><b>Aylık saha planı: 4–6 gün</b><span>Uzak ilçelerde ihtiyaca göre çevrim içi webinar seçilebilir.</span></div></div>
      <ol className="visit-path" aria-label="Okul ziyareti planlama adımları">
        {[[Route,'1','İhtiyacı belirle','visit-purpose'],[MapPin,'2','İlçe ve uzaklığı seç','visit-district'],[Video,'3','Saha veya webinar seç','visit-format'],[CalendarDays,'4','Takvime ekle','visit-date'],[CheckCircle2,'5','Sonucu kaydet','visit-status']].map(([Icon,no,label,target])=><li key={no}><button type="button" onClick={()=>document.getElementById(target)?.focus()}><span>{no}</span><Icon size={19}/><b>{label}</b></button></li>)}
      </ol>
      <p className="notice">Temsili okul ve bilgiler kullanın. Bu deneme akışı yalnız bu tarayıcıya kaydedilir; gerçek veri tabanı bağlantısı henüz yok.</p>
      <div className="visit-plan-picker"><div><b>Faaliyet planından ziyaret başlat</b><p>Planlanan haftayı seçtiğinizde başlık, tarih, amaç ve takip adımı forma aktarılır.</p></div><label className="field">Plan faaliyeti<select value="" onChange={e=>{const item=planVisits[Number(e.target.value)];if(item){setDraft({...empty(),...item});setEditing(null);setNotice('Faaliyet planındaki ziyaret bilgileri forma aktarıldı. Okul ve ilçe bilgilerini tamamlayın.');document.getElementById('visit-school')?.focus();}}}><option value="">Seçin</option>{planVisits.map((x,i)=><option key={x.planReference} value={i}>{x.label}</option>)}</select></label></div>
    </>}
    {error && <p className="error" role="alert">{error}</p>}{notice && <output>{notice}</output>}
    {mode === 'visits' && <form onSubmit={submit}>
      <h3>{editing ? 'Ziyareti güncelle' : 'Yeni ziyaret'}</h3>
      <fieldset disabled={!ready} className="visit-form">
        {draft.planReference && <div className="plan-reference"><CalendarDays/> Faaliyet Planı: <b>{draft.planReference}</b></div>}
        {field('title','Plan başlığı',false,true)}<label className="field">Örnek okul adı<input id="visit-school" type="text" required maxLength={4000} value={draft.school} onChange={e=>setDraft({...draft,school:e.target.value})}/></label>
        <label className="field">İlçe<input id="visit-district" type="text" maxLength={4000} value={draft.district} onChange={e=>setDraft({...draft,district:e.target.value})}/></label>
        <label className="field">Uzaklık<select value={draft.distance} onChange={e=>setDraft({...draft,distance:e.target.value})}>{Object.entries(distanceStates).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label className="field">Uygulama biçimi<select id="visit-format" value={draft.format} onChange={e=>setDraft({...draft,format:e.target.value})}>{Object.entries(visitFormats).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>{draft.distance === 'far' && draft.format === 'field' && <small className="field-hint">Uzak ilçe için çevrim içi webinar seçeneğini de değerlendirin.</small>}</label>
        <label className="field">Tarih<input id="visit-date" type="date" required value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label>
        <label className="field">İhtiyaç, amaç ve hazırlık<textarea id="visit-purpose" rows={3} required maxLength={4000} value={draft.purpose} onChange={e=>setDraft({...draft,purpose:e.target.value})}/></label>{field('audience','Hedef kitle',true)}{field('permission','Okul iletişimi ve izin notu',true)}{field('nextStep','Sonraki adım',true)}
        <label className="field">Durum<select id="visit-status" value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}><option value="planned">Planlandı</option><option value="completed">Tamamlandı</option></select></label>
        {draft.status==='completed' && <label className="field">Gerçekleşen katılımcı sayısı<input type="number" min="0" value={draft.actualParticipants} onChange={e=>setDraft({...draft,actualParticipants:e.target.value})}/></label>}{field('result','Ziyaret sonucu',true,draft.status==='completed')}{field('evidence','Kanıt ve fotoğraf izin notu (dosya yüklenmez)',true)}
        <div className="actions"><button className="primary" type="submit">{draft.status === 'completed' ? 'Sonucu kaydet' : 'Planı kaydet'}</button>{editing && <button className="secondary" type="button" onClick={()=>{setDraft(empty());setEditing(null);setError('');}}>Vazgeç</button>}</div>
      </fieldset>
    </form>}
    {!rows.length ? <p className="muted">{mode === 'overview' ? 'Planlanan ziyaret yok. Yeni bir ziyaret ekleyerek başlayın.' : 'Henüz okul ziyareti kaydedilmedi.'}</p> : <ul className="visit-list">{rows.map(t=><li key={t.id}>
      <div><strong>{t.title}</strong>{t.planReference&&<small className="visit-plan-ref">Faaliyet Planı · {t.planReference}</small>}<p>{t.school}{t.district ? ` · ${t.district}` : ''}</p><p>{visitFormats[t.format || 'field']} · {distanceStates[t.distance || 'near']}</p><p><time dateTime={t.date}>{t.date.split('-').reverse().join('.')}</time> · {taskStates[t.status]}</p>{mode !== 'overview' && <><p>Amaç: {t.purpose}</p>{t.audience&&<p>Hedef kitle: {t.audience}</p>}{t.permission&&<p>İletişim/izin: {t.permission}</p>}{t.nextStep && <p>Sonraki adım: {t.nextStep}</p>}{t.actualParticipants!==''&&<p>Gerçekleşen katılımcı: {t.actualParticipants}</p>}{t.result && <p>Sonuç: {t.result}</p>}{t.evidence && <p>Kanıt: {t.evidence}</p>}{t.status==='completed'&&mode==='visits'&&<div className="visit-output-ready"><CheckCircle2/><span>Faaliyet kaydı tamamlandı</span><button onClick={onReport}><Newspaper/> Haber ve rapor taslaklarını aç</button></div>}</>}</div>
      {mode === 'visits' && t.status === 'planned' && <button className="secondary" onClick={()=>{setDraft({...t});setEditing(t.id);setError('');setNotice('');}}>Düzenle / sonuç gir</button>}
    </li>)}</ul>}
    <div className="actions">{mode !== 'visits' && <button className="secondary" onClick={onOpen}>Ziyaretleri aç</button>}{mode === 'report' && <button className="primary" disabled={!tasks.length} onClick={download}>Ziyaret özetini indir</button>}</div>
  </section>;
}
