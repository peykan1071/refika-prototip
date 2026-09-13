'use client';
import { useState } from 'react';
import { deliveryModes, eventKinds, eventReport, eventStates, saveEvent } from '../lib/events.mjs';

const empty = () => ({ title:'', kind:'Çalıştay', mode:'Yüz yüze', audience:'', venue:'', purpose:'', date:'', plannedParticipants:'', actualParticipants:'', result:'', evidence:'', status:'planned' });

export default function EventWorkspace({ events, onChange, mode = 'events', onOpen, ready = true }) {
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const ordered = [...events].sort((a,b) => a.date.localeCompare(b.date));
  const pending = ordered.filter(event => event.status === 'planned');
  const rows = mode === 'overview' ? pending.slice(0,3) : ordered;
  const textField = (key, label, multiline = false, required = false) => <label className="field">{label}{multiline ? <textarea rows={3} required={required} maxLength={4000} value={draft[key]} onChange={e => setDraft({...draft,[key]:e.target.value})}/> : <input type={key === 'date' ? 'date' : 'text'} required={required} maxLength={4000} value={draft[key]} onChange={e => setDraft({...draft,[key]:e.target.value})}/>}</label>;
  function submit(e) {
    e.preventDefault();
    if (!ready) return;
    try {
      onChange(saveEvent(events, draft, editing || crypto.randomUUID()));
      setNotice(draft.status === 'completed' ? 'Etkinlik sonucu ve katılım bilgisi rapora eklendi.' : 'Etkinlik çalışma masasına ve takvime eklendi.');
      setDraft(empty()); setEditing(null); setError('');
    } catch (err) { setError(err.message); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob(['\uFEFF'+eventReport(events)], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a'); link.href=url; link.download='REFIKA-ornek-egitim-etkinlik-ozeti.txt'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className="card visit-workspace event-workspace">
    <div className="card-heading"><h2>{mode === 'overview' ? 'Yaklaşan eğitim ve etkinlikler' : mode === 'report' ? 'Eğitim ve etkinlik faaliyet özeti' : mode === 'calendar' ? 'Eğitim ve etkinlik takvimi' : 'Eğitim ve etkinlik planla, sonuçlandır'}</h2><span className="badge">{pending.length} planlandı · {events.length-pending.length} tamamlandı</span></div>
    {mode === 'events' && <p className="notice">Çalıştay, eğitim, webinar ve toplantıları planlayın; gerçekleşen katılımı ve sonucu aynı kayda işleyin. Bu demo yalnız bu tarayıcıya kaydedilir.</p>}
    {error && <p className="error" role="alert">{error}</p>}{notice && <output>{notice}</output>}
    {mode === 'events' && <form onSubmit={submit}><h3>{editing ? 'Etkinliği güncelle' : 'Yeni eğitim veya etkinlik'}</h3><fieldset disabled={!ready} className="visit-form">
      {textField('title','Etkinlik başlığı',false,true)}
      <label className="field">Etkinlik türü<select value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value})}>{eventKinds.map(item=><option key={item}>{item}</option>)}</select></label>
      <label className="field">Uygulama biçimi<select value={draft.mode} onChange={e=>setDraft({...draft,mode:e.target.value})}>{deliveryModes.map(item=><option key={item}>{item}</option>)}</select></label>
      {textField('date','Etkinlik tarihi',false,true)}{textField('venue','Yer / bağlantı notu')}{textField('audience','Hedef kitle',false,true)}
      <label className="field">Planlanan katılımcı<input type="number" min="1" max="100000" required value={draft.plannedParticipants} onChange={e=>setDraft({...draft,plannedParticipants:e.target.value})}/></label>
      {textField('purpose','Amaç ve hazırlık',true,true)}
      <label className="field">Durum<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}><option value="planned">Planlandı</option><option value="completed">Tamamlandı</option></select></label>
      <label className="field">Gerçekleşen katılımcı<input type="number" min="0" max="100000" required={draft.status==='completed'} value={draft.actualParticipants} onChange={e=>setDraft({...draft,actualParticipants:e.target.value})}/></label>
      {textField('result','Etkinlik sonucu',true,draft.status==='completed')}{textField('evidence','Kanıt notu (dosya yüklenmez)',true)}
      <div className="actions"><button className="primary" type="submit">{draft.status === 'completed' ? 'Sonucu kaydet' : 'Planı kaydet'}</button>{editing && <button className="secondary" type="button" onClick={()=>{setDraft(empty());setEditing(null);setError('');}}>Vazgeç</button>}</div>
    </fieldset></form>}
    {!rows.length ? <p className="muted">{mode === 'overview' ? 'Planlanan etkinlik yok. Yeni bir etkinlik ekleyerek başlayın.' : 'Henüz eğitim veya etkinlik kaydedilmedi.'}</p> : <ul className="visit-list">{rows.map(event=><li key={event.id}><div><strong>{event.title}</strong><p>{event.kind} · {event.mode}{event.venue ? ` · ${event.venue}` : ''}</p><p><time dateTime={event.date}>{event.date.split('-').reverse().join('.')}</time> · {eventStates[event.status]} · {event.actualParticipants ?? '—'} / {event.plannedParticipants} katılımcı</p>{mode !== 'overview' && <><p>Hedef kitle: {event.audience}</p><p>Amaç: {event.purpose}</p>{event.result && <p>Sonuç: {event.result}</p>}{event.evidence && <p>Kanıt: {event.evidence}</p>}</>}</div>{mode === 'events' && event.status === 'planned' && <button className="secondary" onClick={()=>{setDraft({...event,actualParticipants:event.actualParticipants ?? ''});setEditing(event.id);setError('');setNotice('');}}>Düzenle / sonuç gir</button>}</li>)}</ul>}
    <div className="actions">{mode !== 'events' && <button className="secondary" onClick={onOpen}>Etkinlikleri aç</button>}{mode === 'report' && <button className="primary" disabled={!events.length} onClick={download}>Etkinlik özetini indir</button>}</div>
  </section>;
}
