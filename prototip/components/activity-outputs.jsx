'use client';
import { useMemo, useState } from 'react';
import { FileText, Newspaper } from 'lucide-react';

function date(value){return value?.split('-').reverse().join('.')||'';}
function drafts(item){
 const place=item.type==='visit'?`${item.school}${item.district?` / ${item.district}`:''}`:(item.venue||'Belirtilen ortam');
 const participation=item.type==='training'?` Etkinliğe ${item.actualParticipants} kişi katılmıştır.`:'';
 return {
  report:`FAALİYET SONUÇ RAPORU\n\nFaaliyet: ${item.title}\nTarih: ${date(item.date)}\nYer / Kurum: ${place}\nAmaç: ${item.purpose}\nSonuç: ${item.result}\n${item.evidence?`Kanıt: ${item.evidence}`:'Kanıt bilgisi henüz eklenmedi.'}`,
  news:`${item.title} Gerçekleştirildi\n\n${date(item.date)} tarihinde ${place} kapsamında “${item.title}” faaliyeti gerçekleştirildi. Çalışmada ${item.purpose.toLocaleLowerCase('tr')} amacıyla bir araya gelindi.${participation} Faaliyet sonucunda ${item.result.toLocaleLowerCase('tr')} Çalışmaya katkı sunan tüm katılımcılara teşekkür ederiz.`,
 };
}
export default function ActivityOutputs({tasks,events}){
 const completed=useMemo(()=>[...tasks,...events].filter(item=>item.status==='completed').sort((a,b)=>b.date.localeCompare(a.date)),[tasks,events]);
 const [selected,setSelected]=useState('');
 const item=completed.find(row=>row.id===selected)||completed[0];
 const text=item?drafts(item):null;
 function download(name,content){const url=URL.createObjectURL(new Blob(['\uFEFF'+content],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className="card activity-outputs"><div className="card-heading"><h2>Faaliyet sonrası rapor ve haber</h2><span className="badge">{completed.length} tamamlanan faaliyet</span></div>{!completed.length?<p className="notice">Bir ziyaret veya etkinlik “Tamamlandı” olarak kaydedildiğinde rapor ve haber taslağı burada hazırlanır.</p>:<><label className="field">Faaliyet seçin<select value={item?.id||''} onChange={e=>setSelected(e.target.value)}>{completed.map(row=><option key={row.id} value={row.id}>{row.title} · {date(row.date)}</option>)}</select></label><div className="output-grid"><article><h3><FileText/> Rapor taslağı</h3><textarea rows={12} readOnly value={text.report}/><button className="secondary" onClick={()=>download('REFIKA-faaliyet-raporu.txt',text.report)}>Raporu indir</button></article><article><h3><Newspaper/> Haber taslağı</h3><textarea rows={12} readOnly value={text.news}/><button className="secondary" onClick={()=>download('REFIKA-haber-taslagi.txt',text.news)}>Haber taslağını indir</button></article></div><p className="muted">REFİKA taslak hazırlar. Koordinatör doğruluk, kişisel veriler, görsel izinleri ve kurum yayın kurallarını kontrol ederek son hâlini verir.</p></>}</section>;
}
