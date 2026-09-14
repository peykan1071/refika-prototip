'use client';
import { useEffect, useRef, useState } from 'react';
import { CalendarDays, CheckCircle2, FileText, Link2, Plus, Save, Users } from 'lucide-react';

const KEY='refika-interprovince-bridge-v1';
const blank={title:'',type:'Ortak çevrim içi etkinlik',province:'',purpose:'',ourTask:'',partnerTask:'',date:'',status:'Taslak'};
const steps=[['Ortak çalışma oluştur',Plus],['İl koordinatörünü davet et',Users],['Görevleri paylaş',FileText],['Etkinliği birlikte yürüt',CalendarDays],['Çıktıyı ve sonucu kaydet',CheckCircle2]];
const sample={id:'sample-interprovince',title:'Doğu Anadolu eTwinning Deneyim Paylaşımı',type:'Ortak çevrim içi etkinlik',province:'Şanlıurfa ve Kahramanmaraş',purpose:'İl koordinatörlerinin iyi uygulamalarını ve öğretmen destek yöntemlerini paylaşması.',ourTask:'Program akışı ve eTwinning okul örnekleri',partnerTask:'Konuşmacı ve öğretmen katılımı',date:'2026-10-15',status:'Planlanıyor',sample:true};

export default function SupportBridgeWorkspace(){
 const [items,setItems]=useState([sample]);const [draft,setDraft]=useState(blank);const [notice,setNotice]=useState('');const [step,setStep]=useState(1);
 const editorRef=useRef(null),provinceRef=useRef(null),taskRef=useRef(null),dateRef=useRef(null),listRef=useRef(null);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(Array.isArray(saved))setItems(saved)}catch{}},[]);
 const persist=next=>{setItems(next);localStorage.setItem(KEY,JSON.stringify(next))};
 function openStep(value){setStep(value);const targets={1:editorRef,2:provinceRef,3:taskRef,4:dateRef,5:listRef};const target=targets[value]?.current;if(target){target.scrollIntoView({behavior:'smooth',block:'center'});if(typeof target.focus==='function')setTimeout(()=>target.focus(),350)}}
 function save(e){e.preventDefault();if(!draft.title.trim()||!draft.province.trim()||!draft.purpose.trim())return setNotice('Çalışma adı, ortak il ve amaç alanlarını doldurun.');const row={...draft,id:crypto.randomUUID(),createdAt:new Date().toLocaleDateString('tr-TR')};persist([row,...items]);setDraft(blank);setNotice('Ortak çalışma taslak olarak kaydedildi. Davet henüz gönderilmedi.')}
 return <section className="support-bridge">
  <header className="support-hero"><div><span className="eyebrow">İller arası koordinatör ağı</span><h1>Destek Köprüsü</h1><p>İl koordinatörleri REFİKA üzerinden birbirine destek olur, ortak etkinlik planlar ve sonuçlarını birlikte izler.</p></div><Link2/></header>
  <ol className="support-path">{steps.map(([label,Icon],i)=><li key={label}><button type="button" className={step===i+1?'active':''} onClick={()=>openStep(i+1)}><span>{i+1}</span><Icon/><b>{label}</b></button></li>)}</ol>
  <div className="support-note"><Users/><p><b>Ortak çalışma sınırı:</b> Her koordinatör yalnızca davet edildiği ortak çalışmayı ve kendisiyle paylaşılan bilgileri görür. Başka ilin çalışma alanı açılmaz.</p></div>
  <section ref={editorRef} className="card support-editor"><div className="card-heading"><h2>Yeni iller arası çalışma</h2><span className="badge">Taslak · Davet gönderilmedi</span></div><form onSubmit={save} className="support-form">
   <label className="field">Ortak çalışmanın adı<input required value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Örn. Bölgesel eTwinning deneyim paylaşımı"/></label>
   <label className="field">Çalışma türü<select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}><option>Ortak çevrim içi etkinlik</option><option>Öğretmen eğitimi</option><option>Mentörlük çalışması</option><option>Proje ortaklığı desteği</option><option>İyi uygulama paylaşımı</option><option>Ortak okul ziyareti</option></select></label>
   <label className="field">Ortak il veya iller<input ref={provinceRef} required value={draft.province} onChange={e=>setDraft({...draft,province:e.target.value})} placeholder="İl adlarını yazın"/></label>
   <label className="field">Planlanan tarih<input ref={dateRef} type="date" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label>
   <label className="field support-wide">Ortak amaç<textarea required rows="3" value={draft.purpose} onChange={e=>setDraft({...draft,purpose:e.target.value})} placeholder="Birlikte hangi ihtiyaca cevap verilecek?"/></label>
   <label className="field">Erzurum’un görevi<textarea ref={taskRef} rows="3" value={draft.ourTask} onChange={e=>setDraft({...draft,ourTask:e.target.value})}/></label>
   <label className="field">Ortak ilden beklenen katkı<textarea rows="3" value={draft.partnerTask} onChange={e=>setDraft({...draft,partnerTask:e.target.value})}/></label>
   <div className="actions support-wide"><button className="primary"><Save/> Ortak çalışma taslağını kaydet</button></div>
  </form>{notice&&<output>{notice}</output>}</section>
  <section ref={listRef} className="card support-list"><div className="card-heading"><h2>Ortak çalışmalar</h2><span className="badge">{items.length} çalışma</span></div>{items.length?<ul>{items.map(x=><li key={x.id}><div><b>{x.title}</b><p>{x.province} · {x.type}</p><p>{x.purpose}</p><small>{x.date?x.date.split('-').reverse().join('.'):'Tarih belirlenmedi'} · {x.status}{x.sample?' · Örnek kayıt':''}</small></div><button className="secondary" onClick={()=>setDraft({...x})}>Çalışmayı aç</button></li>)}</ul>:<div className="empty"><Plus/><h3>Henüz ortak çalışma yok</h3><p>Başka bir ille yürütülecek ilk çalışmayı yukarıdaki formdan planlayın.</p></div>}</section>
 </section>
}
