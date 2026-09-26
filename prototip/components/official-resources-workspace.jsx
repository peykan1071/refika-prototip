'use client';
import { useState } from 'react';
import { BookOpen, CalendarDays, CheckCircle2, ExternalLink, FileCheck2, Landmark, RefreshCw, Tag } from 'lucide-react';
import { knowledgeDomains, knowledgeRules } from '../lib/refika-knowledge-base.mjs';

const categories=[['all','Tüm kaynaklar',BookOpen],['guide','Yönergeler',FileCheck2],['calendar','Takvimler',CalendarDays],['theme','Temalar ve duyurular',Tag],['platform','Resmî platformlar',Landmark]];
const sources=[
 {name:'MEB',title:'Millî Eğitim Bakanlığı',url:'https://www.meb.gov.tr/',category:'platform',date:'Sürekli güncellenir',status:'Resmî ana kaynak'},
 {name:'YEĞİTEK',title:'YEĞİTEK',url:'https://yegitek.meb.gov.tr/',category:'platform',date:'Sürekli güncellenir',status:'Resmî ana kaynak'},
 {name:'EBA',title:'Eğitim Bilişim Ağı',url:'https://www.eba.gov.tr/',category:'platform',date:'Sürekli güncellenir',status:'Resmî platform'},
 {name:'Avrupa platformu',title:'eTwinning Avrupa platformu',url:'https://school-education.ec.europa.eu/en/etwinning',category:'platform',date:'Sürekli güncellenir',status:'Resmî Avrupa kaynağı'},
 {name:'eTwinning Türkiye',title:'eTwinning Türkiye',url:'https://etwinning.meb.gov.tr/',category:'platform',date:'Sürekli güncellenir',status:'Resmî ulusal kaynak'},
 {name:'Kayıt rehberi',title:'eTwinning’e kayıt',url:'https://etwinning.meb.gov.tr/etwinninge-kayit/',category:'guide',date:'Yayın tarihi belirtilmemiş',status:'Güncelliği işlem öncesi kontrol edilmeli'},
 {name:'Kalite kriterleri',title:'Kalite etiketi kriterleri',url:'https://etwinning.meb.gov.tr/kalite-etiketi-kriterleri/',category:'guide',date:'Yayın tarihi belirtilmemiş',status:'Güncelliği işlem öncesi kontrol edilmeli'},
 {name:'SSS',title:'Sıkça sorulan sorular',url:'https://etwinning.meb.gov.tr/sikca-sorulan-sorular/',category:'guide',date:'Yayın tarihi belirtilmemiş',status:'Güncelliği işlem öncesi kontrol edilmeli'},
 {name:'Haftalık bülten',title:'eTwinning haftalık bülteni',url:'https://etwinning.meb.gov.tr/etwinning-haftalik-bulten/',category:'calendar',date:'Dönemsel yayın',status:'Yeni sayı kontrol edilmeli'},
 {name:'Avrupa duyuruları',title:'eTwinning etkinlik ve tema duyuruları',url:'https://school-education.ec.europa.eu/en/etwinning',category:'theme',date:'Sürekli güncellenir',status:'Resmî Avrupa kaynağı'},
 {name:'Rapor Modülü',title:'YEĞİTEK EBA eTwinning Rapor Modülü',url:'https://yegitek.eba.gov.tr/etwinning-rapor/',category:'calendar',date:'Faaliyet dönemlerine göre',status:'Resmî işlem modülü'},
];

export default function OfficialResourcesWorkspace(){
 const [category,setCategory]=useState('all');
 const [view,setView]=useState('sources');
 const [checked,setChecked]=useState('14 Eylül 2026');
 const shown=category==='all'?sources:sources.filter(x=>x.category===category);
 return <div className="official-workspace">
  <section className="official-hero"><div><span>KANITA DAYALI REHBERLİK</span><h2>Resmî Kaynaklar ve Bilgi Havuzu</h2><p>REFİKA’nın önerilerini dayandırdığı resmî kaynakları ve koordinatörlük iş akışlarını görev türüne göre inceleyin.</p></div><BookOpen/></section>
  <section className="official-check"><div><CheckCircle2/><p><b>Son kaynak kontrolü: {checked}</b><span>Bağlantı ve sayfa bilgileri kontrol kaydına göre gösterilir.</span></p></div><button className="secondary" onClick={()=>setChecked(new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}))}><RefreshCw/> Kontrol tarihini güncelle</button></section>
  <nav className="knowledge-switch"><button className={view==='sources'?'active':''} onClick={()=>setView('sources')}>Resmî kaynaklar</button><button className={view==='knowledge'?'active':''} onClick={()=>setView('knowledge')}>REFİKA bilgi havuzu</button></nav>
  {view==='sources'?<><nav className="official-tabs" aria-label="Kaynak türleri">{categories.map(([id,label,Icon])=><button key={id} className={category===id?'active':''} onClick={()=>setCategory(id)}><Icon/>{label}</button>)}</nav><section className="official-source-list">{shown.map(source=><article key={source.name}><div><span className="official-kind">{source.name}</span><h3>{source.title}</h3><p>{source.date}</p></div><div className={source.status.includes('kontrol')?'source-status warning':'source-status'}>{source.status}</div><a href={source.url} target="_blank" rel="noreferrer">Resmî kaynağı aç <ExternalLink/></a></article>)}</section></>:<section className="knowledge-grid">{knowledgeDomains.map(domain=><article key={domain.id}><span>{domain.areas.join(' · ')}</span><h3>{domain.title}</h3><p>{domain.use}</p><b>Kaynak türleri</b><ul>{domain.sources.map(source=><li key={source}>{source}</li>)}</ul></article>)}</section>}
  <section className="official-evidence"><FileCheck2/><div><h3>REFİKA cevabında kaynak nasıl görünür?</h3><p>Her öneride kullanılan resmî kaynak, sayfa başlığı ve son kontrol tarihi gösterilir. Yayın tarihi bulunmayan veya değişebilecek kurallar için “Güncelliği işlem öncesi kontrol edilmeli” uyarısı eklenir.</p></div></section>
  <p className="official-principle">REFİKA kaynakları karşılaştırır ve öneri hazırlar; resmî karar vermez. Koordinatör, işlem öncesinde açılan resmî sayfadaki güncel bilgiyi kontrol eder.</p>
  {view==='knowledge'&&<ul className="knowledge-rules">{knowledgeRules.map(rule=><li key={rule}>{rule}</li>)}</ul>}
 </div>;
}
