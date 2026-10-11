export const inventoryFields = [
  ['recordId', 'ESEP ID (zorunlu)'],
  ['name', 'Kişi / okul adı (zorunlu)'],
  ['province', 'İl / bölge'],
  ['status', 'ESEP durum metni'],
  ['activity', 'Aktif / dormant durumu'],
  ['validation', 'Onay durumu'],
  ['affiliation', 'Güncel / geçmiş il ilişkisi'],
  ['district', 'İlçe'],
  ['schoolId', 'İlişkili okul ID'],
  ['school', 'İlişkili okul adı'],
  ['profileUrl', 'Profil bağlantısı (isteğe bağlı)'],
  ['schoolUrl', 'Okul bağlantısı (isteğe bağlı)'],
];
export const activityLabels = {
  active: 'Aktif',
  dormant: 'Dormant',
  deactivated: 'Devre dışı',
  blocked: 'Engelli',
  anonymised: 'Anonimleştirilmiş',
  unknown: 'Belirtilmemiş',
};
export const validationLabels = {
  validated: 'Onaylı',
  pending: 'Onay bekliyor',
  registered: 'ESEP kayıtlı',
  not_validated: 'Onaysız',
  unknown: 'Belirtilmemiş',
};
export const affiliationLabels = {
  current: 'Güncel il ilişkisi',
  historical: 'Geçmiş il ilişkisi',
  unknown: 'İl ilişkisi kontrol edilmeli',
};
export const inventoryKinds = { person: 'Kişiler', school: 'Okullar' };
export function inventoryToday(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Istanbul',
  }).format(now);
}
export function threeMonthsAfter(day) {
  const [year, month, date] = day.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + 3, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(date, last));
  return target.toISOString().slice(0, 10);
}
