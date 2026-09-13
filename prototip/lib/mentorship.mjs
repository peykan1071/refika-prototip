export const supportStates = { open: 'Soru kaydedildi', aiDraft: 'REFİKA taslağı inceleniyor', assigned: 'Mentöre yönlendirildi', resolved: 'Sonuçlandırıldı' };
export const districts = ['Yakutiye','Palandöken','Aziziye','Aşkale','Çat','Hınıs','Horasan','İspir','Karaçoban','Karayazı','Köprüköy','Narman','Oltu','Olur','Pasinler','Pazaryolu','Şenkaya','Tekman','Tortum','Uzundere'];
export const mentorQuota = district => district === 'Yakutiye' || district === 'Palandöken' ? 3 : district === 'Aziziye' ? 2 : 1;
export const initialMentorGroup = () => ({ name:'2026–2027 Erzurum eTwinning Mentör Grubu', purpose:'Öğretmen sorularına güncel ve kanıta dayalı yanıt vermek', saved:false });

export function saveMentor(items, input, id) {
  const mentor = {};
  for (const key of ['name','school','schoolId','district','experience','expertise']) mentor[key] = typeof input[key] === 'string' ? input[key].trim() : '';
  if (!mentor.name || !mentor.school || !mentor.schoolId || !mentor.district || !mentor.experience || !mentor.expertise) throw new Error('Mentörün tüm bilgilerini doldurun.');
  if (!districts.includes(mentor.district)) throw new Error('Geçerli bir ilçe seçin.');
  const existing = items.find(item=>item.id===id);
  const districtCount = items.filter(item=>item.district===mentor.district && item.id!==id).length;
  if (districtCount >= mentorQuota(mentor.district)) throw new Error(`${mentor.district} için ayrılan mentör sayısı doldu.`);
  const row = { ...mentor, id };
  return existing ? items.map(item=>item.id===id?row:item) : [...items,row];
}

export function restoreMentors(value = []) {
  if (!Array.isArray(value)) throw new Error('Mentör kayıtları okunamadı.');
  return value.reduce((items,item)=>saveMentor(items,item,item.id),[]);
}

export function saveSupport(items, input, id, at = new Date().toISOString()) {
  const clean = {};
  for (const key of ['teacher','school','district','topic','question','mentor','source','answer','supportPath']) {
    if (input[key] != null && typeof input[key] !== 'string') throw new Error('Destek alanları metin olmalı.');
    clean[key] = (input[key] || '').trim();
  }
  if (!clean.teacher || !clean.topic || !clean.question) throw new Error('Öğretmen, konu ve soruyu doldurun.');
  if (!Object.hasOwn(supportStates, input.status)) throw new Error('Geçerli bir destek durumu seçin.');
  clean.supportPath = clean.supportPath || 'refika';
  if (input.status === 'assigned' && !clean.mentor) throw new Error('Yönlendirme için bir mentör seçin.');
  if (input.status === 'resolved' && (!clean.answer || !clean.source)) throw new Error('Sonuçlandırılan talebe cevap ve dayanak ekleyin.');
  const existing = items.find(item => item.id === id);
  const item = { ...clean, id, status: input.status, createdAt: existing?.createdAt || at, updatedAt: at, resolvedAt: input.status === 'resolved' ? at : null };
  return existing ? items.map(row => row.id === id ? item : row) : [...items, item];
}

export function restoreSupports(value = []) {
  if (!Array.isArray(value)) throw new Error('Rehberlik kayıtları okunamadı.');
  return value.map(item => {
    if (!item?.id || !item.createdAt || !item.updatedAt) throw new Error('Rehberlik kaydı tutarsız.');
    return { ...saveSupport([], item, item.id, item.updatedAt)[0], createdAt:item.createdAt, resolvedAt:item.resolvedAt || null };
  });
}

export function restoreMentorGroup(value) {
  const fallback = initialMentorGroup();
  if (!value) return fallback;
  const group = {};
  for (const key of ['name','purpose']) group[key] = typeof value[key] === 'string' ? value[key] : fallback[key];
  return { ...group, saved:Boolean(value.saved) };
}
