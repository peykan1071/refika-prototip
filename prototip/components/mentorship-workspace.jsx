'use client';
import { useState } from 'react';
import { BookOpen, CheckCircle2, MessageCircleQuestion, Sparkles, UserRoundCheck, Users } from 'lucide-react';
import { districts, mentorQuota, saveMentor, saveSupport, supportStates } from '../lib/mentorship.mjs';

const empty = () => ({ teacher:'', school:'', district:'', topic:'', question:'', mentor:'', source:'', answer:'', supportPath:'refika', status:'open' });
const emptyMentor = () => ({ name:'', school:'', schoolId:'', district:'Yakutiye', experience:'', expertise:'' });

export default function MentorshipWorkspace({ items, onChange, mentors, onMentorsChange, group, onGroupChange, ready = true }) {
  const [activeArea,setActiveArea] = useState('mentors');
  const [draft,setDraft] = useState(empty);
  const [editing,setEditing] = useState(null);
  const [mentorDraft,setMentorDraft] = useState(emptyMentor);
  const [editingMentor,setEditingMentor] = useState(null);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const open = items.filter(item=>item.status!=='resolved').length;
  const field=(key,label,multiline=false,required=false)=><label className="field">{label}{multiline?<textarea id={`support-${key}`} rows={3} required={required} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/>:<input id={`support-${key}`} required={required} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/>}</label>;
  function submit(e){e.preventDefault();if(!ready)return;try{onChange(saveSupport(items,draft,editing||crypto.randomUUID()));setDraft(empty());setEditing(null);setError('');setNotice('Destek kaydı çalışma masasına eklendi.');}catch(err){setError(err.message);}}
  function prepareDemoDraft(){if(!draft.topic.trim()||!draft.question.trim()){setError('Önce talebin konusunu ve soruyu yazın.');return;}setDraft({...draft,supportPath:'refika',status:'aiDraft',answer:`${draft.topic} konusundaki soru için REFİKA yanıt taslağı burada oluşturulur. Koordinatör, taslağı resmî kaynakla karşılaştırıp gerekli düzeltmeleri yaptıktan sonra kullanır.`,source:'Koordinatör tarafından seçilecek güncel resmî ESEP / eTwinning kaynağı'});setError('');setNotice('Prototip yanıt akışı hazırlandı. Bu sürüm canlı yapay zekâya bağlı değildir.');}
  function submitMentor(e){e.preventDefault();if(!ready)return;try{onMentorsChange(saveMentor(mentors,mentorDraft,editingMentor||crypto.randomUUID()));setMentorDraft(emptyMentor());setEditingMentor(null);setError('');setNotice('Mentör ilçe görev listesine kaydedildi.');}catch(err){setError(err.message);}}
  return <>
    <section className="mentor-intro">
      <div><span className="eyebrow">REHBERLİK VE MENTÖRLÜK</span><h2>{activeArea==='mentors'?'İlçe mentör kadrosunu oluşturun':'Öğretmen sorularını çözüme ulaştırın'}</h2><p>{activeArea==='mentors'?'Mentörleri görev yaptıkları ilçeye, deneyimlerine ve destek konularına göre tek tek kaydedin.':'REFİKA ilk yanıt taslağını hazırlar; yalnız uzman desteği gereken sorular mentöre yönlendirilir.'}</p></div>
      <span className="mentor-count">{activeArea==='mentors'?`${mentors.length} / 25 mentör`:`${open} açık talep`}</span>
    </section>
    <div className="mentor-area-tabs" role="tablist" aria-label="Rehberlik çalışma alanları">
      <button role="tab" aria-selected={activeArea==='mentors'} className={activeArea==='mentors'?'active':''} onClick={()=>setActiveArea('mentors')}><Users size={19}/> İlçe Mentörleri</button>
      <button role="tab" aria-selected={activeArea==='supports'} className={activeArea==='supports'?'active':''} onClick={()=>setActiveArea('supports')}><MessageCircleQuestion size={19}/> Öğretmen Destek Talepleri</button>
    </div>
    <ol className={`mentor-path ${activeArea==='mentors'?'compact':''}`} aria-label="Rehberlik ve mentörlük adımları">
      {(activeArea==='mentors'?[[Users,'1','Grup görevini belirle','mentor-group'],[UserRoundCheck,'2','Mentörü ilçesiyle kaydet','mentor-roster'],[CheckCircle2,'3','İlçe kontenjanını izle','mentor-roster']]:[[MessageCircleQuestion,'1','Gelen soruyu kaydet','support-question'],[Sparkles,'2','REFİKA taslağı oluştur','support-question'],[BookOpen,'3','Kaynağı kontrol et','support-source'],[UserRoundCheck,'4','Gerekirse mentöre yönlendir','support-mentor'],[CheckCircle2,'5','Kontrol et ve sonuçlandır','support-status']]).map(([Icon,no,label,target])=><li key={no}><button type="button" onClick={()=>document.getElementById(target)?.focus()}><span>{no}</span><Icon size={19}/><b>{label}</b></button></li>)}
    </ol>
    <div className="mentor-grid mentor-grid-single">
      <section className="card mentor-card" id="mentor-group" tabIndex="-1" hidden={activeArea!=='mentors'}>
        <div className="card-heading"><h2>Mentör grubu</h2><span className={'badge '+(group.saved?'done':'amber')}>{group.saved?'Plan kaydedildi':'Kuruluş aşamasında'}</span></div>
        <label className="field">Grup adı<input value={group.name} onChange={e=>onGroupChange({...group,name:e.target.value,saved:false})}/></label>
        <label className="field">Grubun görevi<textarea rows={3} value={group.purpose} onChange={e=>onGroupChange({...group,purpose:e.target.value,saved:false})}/></label>
        <button className="primary" disabled={!group.name.trim()||!group.purpose.trim()} onClick={()=>{onGroupChange({...group,saved:true});setNotice('Mentör grubu planı kaydedildi.');}}>Grup planını kaydet</button>
        <div className="quota-summary"><b>İlçe kontenjanları</b><p>Yakutiye 3 · Palandöken 3 · Aziziye 2</p><p>Diğer 17 ilçe: birer mentör</p></div>
      </section>
      <section className="card mentor-card" hidden={activeArea!=='supports'}>
        <div className="card-heading"><h2>{editing?'Destek kaydını güncelle':'Koordinatör destek kaydı'}</h2><span className="badge">{items.length} kayıt</span></div>
        <p className="coordinator-note"><b>Bu formu il koordinatörü doldurur.</b> REFİKA ilk yanıt taslağını resmî kaynaklara dayanarak hazırlar. Yalnız uzman görüşü gereken sorular ilçedeki mentöre yönlendirilir.</p>
        <form onSubmit={submit}><fieldset disabled={!ready} className="mentor-form">
          {field('teacher','Destek isteyen öğretmen',false,true)}{field('school','Görev yaptığı okul')}<label className="field">İlçe<select value={draft.district} onChange={e=>setDraft({...draft,district:e.target.value,mentor:''})}><option value="">Seçin</option>{districts.map(item=><option key={item}>{item}</option>)}</select></label>{field('topic','Talebin konusu',false,true)}{field('question','Öğretmenin ilettiği soru',true,true)}<label className="field">Destek yolu<select value={draft.supportPath} onChange={e=>setDraft({...draft,supportPath:e.target.value,mentor:e.target.value==='mentor'?draft.mentor:''})}><option value="refika">REFİKA yanıt taslağı</option><option value="mentor">Uzman mentör desteği</option></select></label>{draft.supportPath==='mentor'&&<label className="field">Yönlendirilecek mentör<select id="support-mentor" value={draft.mentor} onChange={e=>setDraft({...draft,mentor:e.target.value})}><option value="">Seçin</option>{mentors.filter(item=>!draft.district||item.district===draft.district).map(item=><option key={item.id} value={item.name}>{item.name} · {item.district}</option>)}</select></label>}{field('source','Yanıtın resmî kaynağı / dayanağı',true)}{field('answer','REFİKA yanıt taslağı / doğrulanmış cevap',true)}
          <div className="ai-draft-action"><button type="button" className="secondary" onClick={prepareDemoDraft}><Sparkles size={17}/> REFİKA yanıt akışını göster</button><small>Prototipte örnek akış gösterilir; canlı yapay zekâ bağlantısı henüz etkin değildir.</small></div>
          <label className="field">İşlem durumu<select id="support-status" value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}><option value="open">Soru kaydedildi</option><option value="aiDraft">REFİKA taslağı inceleniyor</option><option value="assigned">Mentöre yönlendirildi</option><option value="resolved">Sonuçlandırıldı</option></select></label>
          <div className="actions"><button className="primary">{draft.status==='resolved'?'Cevabı ve sonucu kaydet':'Destek talebini kaydet'}</button>{editing&&<button type="button" className="secondary" onClick={()=>{setDraft(empty());setEditing(null);setError('');}}>Vazgeç</button>}</div>
        </fieldset></form>
      </section>
    </div>
    <section className="card mentor-roster" id="mentor-roster" tabIndex="-1" hidden={activeArea!=='mentors'}><div className="card-heading"><h2>İlçe mentörleri</h2><span className="badge">{mentors.length} / 25 kayıtlı</span></div>
      <form onSubmit={submitMentor}><fieldset disabled={!ready} className="mentor-form">
        <label className="field">İlçe<select value={mentorDraft.district} onChange={e=>setMentorDraft({...mentorDraft,district:e.target.value})}>{districts.map(item=><option key={item} value={item}>{item} · {mentors.filter(m=>m.district===item).length}/{mentorQuota(item)}</option>)}</select></label>
        <label className="field">Mentör adı<input required value={mentorDraft.name} onChange={e=>setMentorDraft({...mentorDraft,name:e.target.value})}/></label>
        <label className="field">Görev yaptığı okul<input required value={mentorDraft.school} onChange={e=>setMentorDraft({...mentorDraft,school:e.target.value})}/></label>
        <label className="field">ESEP okul kimliği<input required value={mentorDraft.schoolId} onChange={e=>setMentorDraft({...mentorDraft,schoolId:e.target.value})}/></label>
        <label className="field">Geçmiş deneyimleri<textarea rows={3} required value={mentorDraft.experience} onChange={e=>setMentorDraft({...mentorDraft,experience:e.target.value})}/></label>
        <label className="field">Destek verebileceği özel konular<textarea rows={3} required value={mentorDraft.expertise} onChange={e=>setMentorDraft({...mentorDraft,expertise:e.target.value})}/></label>
        <div className="actions"><button className="primary">{editingMentor?'Mentörü güncelle':'Mentörü kaydet'}</button>{editingMentor&&<button type="button" className="secondary" onClick={()=>{setMentorDraft(emptyMentor());setEditingMentor(null);}}>Vazgeç</button>}</div>
      </fieldset></form>
      {!mentors.length?<p className="muted">İlk mentörü ekleyerek ilçe görev listesini oluşturmaya başlayın.</p>:<ul>{mentors.map(mentor=><li key={mentor.id}><div><strong>{mentor.name} · {mentor.district}</strong><p>{mentor.school} · ESEP okul kimliği: {mentor.schoolId}</p><small>Deneyim: {mentor.experience}</small><small>Destek konuları: {mentor.expertise}</small></div><button className="secondary" onClick={()=>{setMentorDraft({...mentor});setEditingMentor(mentor.id);}}>Düzenle</button></li>)}</ul>}
    </section>
    {error&&<p className="error" role="alert">{error}</p>}{notice&&<output>{notice}</output>}
    <section className="card mentor-list" hidden={activeArea!=='supports'}><div className="card-heading"><h2>Koordinatörün izlediği destek talepleri</h2><span className="badge amber">{open} işlem bekliyor</span></div>
      {!items.length?<p className="muted">Henüz soru kaydedilmedi.</p>:<ul>{items.map(item=><li key={item.id}><div><strong>{item.teacher} · {item.topic}</strong><p>{item.question}</p><small>{item.school}{item.district?` · ${item.district}`:''} · {supportStates[item.status]} · {item.supportPath==='mentor'?'Mentör desteği':'REFİKA desteği'}{item.mentor?` · ${item.mentor}`:''}</small>{item.answer&&<p><b>Yanıt:</b> {item.answer}</p>}{item.source&&<p><b>Dayanak:</b> {item.source}</p>}</div><button className="secondary" onClick={()=>{setDraft({...empty(),...item});setEditing(item.id);setError('');setNotice('');document.getElementById('support-question')?.focus();}}>Aç / güncelle</button></li>)}</ul>}
    </section>
  </>;
}
