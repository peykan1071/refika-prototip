export const eventStates = { planned: 'Planlandı', completed: 'Tamamlandı' };
export const eventKinds = ['Çalıştay', 'Eğitim', 'Webinar', 'Toplantı'];
export const deliveryModes = ['Yüz yüze', 'Çevrim içi', 'Hibrit'];

export function validateEvent(input) {
  const event = {};
  for (const key of ['title', 'kind', 'mode', 'audience', 'venue', 'purpose', 'date', 'result', 'evidence']) {
    if (input[key] != null && typeof input[key] !== 'string') throw new Error('Etkinlik alanları metin olmalı.');
    event[key] = (input[key] || '').trim();
    if (event[key].length > 4000) throw new Error('Bir etkinlik alanı en fazla 4000 karakter olabilir.');
  }
  if (!event.title || !event.audience || !event.purpose) throw new Error('Başlık, hedef kitle ve amacı doldurun.');
  if (!eventKinds.includes(event.kind) || !deliveryModes.includes(event.mode)) throw new Error('Geçerli bir etkinlik türü ve uygulama biçimi seçin.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date) || Number.isNaN(Date.parse(event.date)) || new Date(event.date).toISOString().slice(0, 10) !== event.date) throw new Error('Geçerli bir etkinlik tarihi seçin.');
  const plannedParticipants = Number(input.plannedParticipants);
  const actualParticipants = input.actualParticipants === '' || input.actualParticipants == null ? null : Number(input.actualParticipants);
  if (!Number.isInteger(plannedParticipants) || plannedParticipants < 1 || plannedParticipants > 100000) throw new Error('Planlanan katılımcı sayısı 1–100000 arasında olmalı.');
  if (actualParticipants !== null && (!Number.isInteger(actualParticipants) || actualParticipants < 0 || actualParticipants > 100000)) throw new Error('Gerçekleşen katılımcı sayısı 0–100000 arasında olmalı.');
  if (!Object.hasOwn(eventStates, input.status)) throw new Error('Geçersiz etkinlik durumu.');
  if (input.status === 'completed' && (actualParticipants === null || !event.result)) throw new Error('Tamamlamak için gerçekleşen katılımcı sayısını ve sonucu yazın.');
  return { ...event, plannedParticipants, actualParticipants, status: input.status, type: 'training' };
}

export function saveEvent(events, input, id, at = new Date().toISOString()) {
  const values = validateEvent(input);
  if (!id || typeof id !== 'string') throw new Error('Etkinlik kimliği gerekli.');
  const existing = events.find(event => event.id === id);
  if (existing?.status === 'completed') throw new Error('Tamamlanan etkinlik değiştirilemez; yeni bir takip etkinliği oluşturun.');
  const event = { ...values, id, createdAt: existing?.createdAt || at, updatedAt: at, completedAt: values.status === 'completed' ? at : null };
  return existing ? events.map(item => item.id === id ? event : item) : [...events, event];
}

export function restoreEvents(value = []) {
  if (!Array.isArray(value)) throw new Error('Etkinlik kaydı okunamadı.');
  const ids = new Set();
  return value.map(event => {
    if (!event || typeof event.id !== 'string' || !event.id || ids.has(event.id) || event.type !== 'training' || !Number.isFinite(Date.parse(event.createdAt)) || !Number.isFinite(Date.parse(event.updatedAt)) || (event.status === 'completed' && !Number.isFinite(Date.parse(event.completedAt)))) throw new Error('Etkinlik kaydı tutarsız.');
    ids.add(event.id);
    return { ...event, ...validateEvent(event) };
  });
}

export function eventReport(events) {
  const completed = events.filter(event => event.status === 'completed');
  const actualTotal = completed.reduce((total, event) => total + event.actualParticipants, 0);
  return `REFİKA · ÖRNEK EĞİTİM VE ETKİNLİK ÖZETİ\nPlanlanan: ${events.length-completed.length}\nTamamlanan: ${completed.length}\nGerçekleşen toplam katılım: ${actualTotal}\n\n${events.map(event => `${event.title}\nTür: ${event.kind} · ${event.mode}\nTarih ve yer: ${event.date} · ${event.venue || 'Belirtilmedi'}\nHedef kitle: ${event.audience}\nKatılımcı: ${event.actualParticipants ?? 'Henüz gerçekleşmedi'} / ${event.plannedParticipants}\nDurum: ${eventStates[event.status]}\nAmaç: ${event.purpose}\nSonuç: ${event.result || 'Henüz kaydedilmedi'}\nKanıt notu: ${event.evidence || 'Eklenmedi'}`).join('\n\n')}\n\nTemsili verilerle demo çıktısıdır; resmî gönderim değildir.`;
}
