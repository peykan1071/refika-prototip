export const taskStates = { planned: 'Planlandı', completed: 'Tamamlandı' };
export const visitFormats = { field: 'Okul ziyareti', webinar: 'Çevrim içi webinar' };
export const distanceStates = { near: 'Yakın / merkez', far: 'Uzak ilçe' };
export function validateTask(input) {
  const task = {};
  for (const key of ['title', 'school', 'district', 'purpose', 'date', 'nextStep', 'result', 'evidence', 'audience', 'permission', 'actualParticipants', 'planReference']) {
    if (input[key] != null && typeof input[key] !== 'string') throw new Error('Görev alanları metin olmalı.');
    task[key] = (input[key] || '').trim();
    if (task[key].length > 4000) throw new Error('Bir görev alanı en fazla 4000 karakter olabilir.');
  }
  if (!task.title || !task.school || !task.purpose) throw new Error('Başlık, okul ve ziyaret amacını doldurun.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(task.date) || Number.isNaN(Date.parse(task.date)) || new Date(task.date).toISOString().slice(0,10) !== task.date) throw new Error('Geçerli bir ziyaret tarihi seçin.');
  if (!Object.hasOwn(taskStates, input.status)) throw new Error('Geçersiz görev durumu.');
  const format = input.format || 'field';
  const distance = input.distance || 'near';
  if (!Object.hasOwn(visitFormats, format)) throw new Error('Geçerli bir uygulama biçimi seçin.');
  if (!Object.hasOwn(distanceStates, distance)) throw new Error('Geçerli bir uzaklık seçin.');
  if (input.status === 'completed' && !task.result) throw new Error('Tamamlamak için ziyaret sonucunu yazın.');
  if (task.actualParticipants && (!/^\d+$/.test(task.actualParticipants) || Number(task.actualParticipants) < 0)) throw new Error('Gerçekleşen katılımcı sayısı geçerli olmalı.');
  return { ...task, status: input.status, format, distance, type: 'visit' };
}
export function saveTask(tasks, input, id, at = new Date().toISOString()) {
  const values = validateTask(input);
  if (!id || typeof id !== 'string') throw new Error('Görev kimliği gerekli.');
  const existing = tasks.find(t => t.id === id);
  if (existing?.status === 'completed') throw new Error('Tamamlanan ziyaret değiştirilemez; yeni bir takip ziyareti oluşturun.');
  const task = { ...values, id, createdAt: existing?.createdAt || at, updatedAt: at, completedAt: values.status === 'completed' ? at : null };
  return existing ? tasks.map(t => t.id === id ? task : t) : [...tasks, task];
}
export function restoreTasks(value = []) {
  if (!Array.isArray(value)) throw new Error('Görev kaydı okunamadı.');
  const ids = new Set();
  return value.map(t => {
    if (!t || typeof t.id !== 'string' || !t.id || ids.has(t.id) || t.type !== 'visit' || !Number.isFinite(Date.parse(t.createdAt)) || !Number.isFinite(Date.parse(t.updatedAt)) || (t.status === 'completed' && !Number.isFinite(Date.parse(t.completedAt)))) throw new Error('Görev kaydı tutarsız.');
    ids.add(t.id);
    return { ...t, ...validateTask(t) };
  });
}
export function visitReport(tasks) {
  const completed = tasks.filter(t => t.status === 'completed');
  return `REFİKA · ÖRNEK OKUL ZİYARETLERİ\nPlanlanan: ${tasks.length-completed.length}\nTamamlanan: ${completed.length}\n\n${tasks.map(t => `${t.title}\nOkul: ${t.school} · ${t.district}\nUygulama: ${visitFormats[t.format || 'field']} · ${distanceStates[t.distance || 'near']}\nTarih: ${t.date}\nDurum: ${taskStates[t.status]}\nAmaç: ${t.purpose}\nHedef kitle: ${t.audience || 'Belirtilmedi'}\nGerçekleşen katılımcı: ${t.actualParticipants || 'Henüz kaydedilmedi'}\nİletişim/izin: ${t.permission || 'Belirtilmedi'}\nSonraki adım: ${t.nextStep || 'Belirtilmedi'}\nSonuç: ${t.result || 'Henüz kaydedilmedi'}\nKanıt notu: ${t.evidence || 'Eklenmedi'}\nFaaliyet planı: ${t.planReference || 'Bağımsız kayıt'}`).join('\n\n')}\n\nTemsili verilerle demo çıktısıdır; resmî gönderim değildir.`;
}
