import { createHash } from 'node:crypto';

export const provinces = [
  'Adana',
  'Adıyaman',
  'Afyonkarahisar',
  'Ağrı',
  'Amasya',
  'Ankara',
  'Antalya',
  'Artvin',
  'Aydın',
  'Balıkesir',
  'Bilecik',
  'Bingöl',
  'Bitlis',
  'Bolu',
  'Burdur',
  'Bursa',
  'Çanakkale',
  'Çankırı',
  'Çorum',
  'Denizli',
  'Diyarbakır',
  'Edirne',
  'Elazığ',
  'Erzincan',
  'Erzurum',
  'Eskişehir',
  'Gaziantep',
  'Giresun',
  'Gümüşhane',
  'Hakkâri',
  'Hatay',
  'Isparta',
  'Mersin',
  'İstanbul',
  'İzmir',
  'Kars',
  'Kastamonu',
  'Kayseri',
  'Kırklareli',
  'Kırşehir',
  'Kocaeli',
  'Konya',
  'Kütahya',
  'Malatya',
  'Manisa',
  'Kahramanmaraş',
  'Mardin',
  'Muğla',
  'Muş',
  'Nevşehir',
  'Niğde',
  'Ordu',
  'Rize',
  'Sakarya',
  'Samsun',
  'Siirt',
  'Sinop',
  'Sivas',
  'Tekirdağ',
  'Tokat',
  'Trabzon',
  'Tunceli',
  'Şanlıurfa',
  'Uşak',
  'Van',
  'Yozgat',
  'Zonguldak',
  'Aksaray',
  'Bayburt',
  'Karaman',
  'Kırıkkale',
  'Batman',
  'Şırnak',
  'Bartın',
  'Ardahan',
  'Iğdır',
  'Yalova',
  'Karabük',
  'Kilis',
  'Osmaniye',
  'Düzce',
];
export const activityKinds = [
  'Eğitim',
  'Webinar',
  'Toplantı',
  'Okul ziyareti',
  'Mentörlük',
  'Proje desteği',
  'Diğer',
];
export const normalize = (value) =>
  String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, '');
export const digest = (value) =>
  createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex');
export function text(value, max = 4000) {
  if (value != null && typeof value !== 'string' && typeof value !== 'number')
    throw new Error('Alanlar metin veya sayı olmalı.');
  const result = String(value ?? '').trim();
  if (result.length > max)
    throw new Error(`Bir alan en fazla ${max} karakter olabilir.`);
  return result;
}
export function provinceCode(value) {
  const input = text(value, 80);
  const number = Number(input);
  if (/^\d{1,2}$/.test(input) && number >= 1 && number <= 81)
    return String(number).padStart(2, '0');
  const index = provinces.findIndex(
    (name) =>
      normalize(name) === normalize(input === 'İçel' ? 'Mersin' : input),
  );
  return index < 0 ? '' : String(index + 1).padStart(2, '0');
}
export function dateValue(value, required = true) {
  let result = text(value, 50);
  if (!result && !required) return '';
  const match = result.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (match)
    result = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
    !Number.isFinite(Date.parse(result)) ||
    new Date(result).toISOString().slice(0, 10) !== result
  )
    throw new Error('Tarih YYYY-AA-GG veya GG.AA.YYYY biçiminde olmalı.');
  return result;
}
export function nonnegative(value, required = false) {
  if ((value === '' || value == null) && !required) return null;
  if (
    value === '' ||
    value == null ||
    !/^\d+$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) > 100000
  )
    throw new Error('Katılım 0–100000 arasında tam sayı olmalı.');
  return Number(value);
}
export function validateActivity(input) {
  const row = Object.fromEntries(
    [
      'title',
      'purpose',
      'audience',
      'responsible',
      'expectedOutput',
      'result',
      'evidence',
      'planCode',
    ].map((key) => [key, text(input[key])]),
  );
  if (!row.title || !row.purpose)
    throw new Error('Faaliyet adı ve amacı gerekli.');
  row.kind = text(input.kind) || 'Diğer';
  if (!activityKinds.includes(row.kind))
    throw new Error('Geçerli bir faaliyet türü seçin.');
  row.startDate = dateValue(input.startDate);
  row.endDate = dateValue(input.endDate || input.startDate);
  if (row.endDate < row.startDate)
    throw new Error('Bitiş tarihi başlangıçtan önce olamaz.');
  row.status = input.status || 'planned';
  if (!['planned', 'completed'].includes(row.status))
    throw new Error('Geçersiz faaliyet durumu.');
  row.plannedParticipants = nonnegative(input.plannedParticipants);
  row.actualParticipants = nonnegative(
    input.actualParticipants,
    row.status === 'completed',
  );
  row.actualDate = dateValue(input.actualDate, row.status === 'completed');
  if (row.status === 'completed' && (!row.result || !row.evidence))
    throw new Error(
      'Tamamlanan faaliyet için sonuç ve kanıt notu/bağlantısı gerekli.',
    );
  return row;
}
export function validateRecord(input, province) {
  const row = Object.fromEntries(
    [
      'accountId',
      'name',
      'schoolId',
      'school',
      'district',
      'email',
      'profileUrl',
      'sourceStatus',
    ].map((key) => [key, text(input[key])]),
  );
  if (!row.accountId || !row.name || !row.schoolId || !row.school)
    throw new Error('Öğretmen kimliği, adı, okul kimliği ve okul adı gerekli.');
  row.province = provinceCode(input.province);
  if (!row.province || row.province !== province)
    throw new Error(
      'Kayıt bu çalışma alanının iline ait değil veya il bilgisi eksik.',
    );
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))
    throw new Error('E-posta biçimi geçersiz.');
  if (
    row.profileUrl &&
    !/^https:\/\/school-education\.ec\.europa\.eu\//i.test(row.profileUrl)
  )
    throw new Error('Profil bağlantısı resmî ESEP adresi olmalı.');
  return row;
}
export const fields = {
  records: [
    ['province', 'İl', ['il', 'şehir', 'province']],
    ['district', 'İlçe', ['ilçe', 'district']],
    [
      'accountId',
      'Öğretmen kimliği',
      ['öğretmen id', 'hesap id', 'account id', 'öğretmen kimliği'],
    ],
    [
      'name',
      'Öğretmen adı',
      ['öğretmen ad soyad', 'ad soyad', 'öğretmen adı', 'name'],
    ],
    ['schoolId', 'Okul kimliği', ['okul id', 'okul kimliği', 'school id']],
    ['school', 'Okul adı', ['doğrulanacak okul adı', 'okul adı', 'school']],
    ['email', 'E-posta', ['öğretmen mail', 'e-posta', 'email']],
    [
      'profileUrl',
      'Profil bağlantısı',
      ['öğretmen nso desktop profil linki', 'profil bağlantısı'],
    ],
    [
      'sourceStatus',
      'Kaynak durumu',
      ['açıklamalar', 'durum', 'kaynak durumu'],
    ],
  ],
  plan: [
    ['planCode', 'Faaliyet kodu', ['faaliyet kodu', 'kod']],
    ['title', 'Faaliyet adı', ['faaliyet adı', 'faaliyet', 'başlık']],
    ['purpose', 'Amaç', ['amaç', 'faaliyet amacı']],
    ['kind', 'Tür', ['tür', 'faaliyet türü']],
    ['startDate', 'Başlangıç', ['başlangıç', 'başlangıç tarihi', 'tarih']],
    ['endDate', 'Bitiş', ['bitiş', 'bitiş tarihi']],
    ['audience', 'Hedef kitle', ['hedef kitle']],
    ['responsible', 'Sorumlu', ['sorumlu']],
    ['expectedOutput', 'Beklenen çıktı', ['beklenen çıktı', 'çıktı']],
    [
      'plannedParticipants',
      'Planlanan katılım',
      ['planlanan katılım', 'katılımcı sayısı'],
    ],
  ],
};
export function suggestMapping(headers, kind) {
  return Object.fromEntries(
    fields[kind].map(([key, label, aliases]) => [
      key,
      headers.findIndex((header) =>
        [label, ...aliases].some(
          (alias) => normalize(alias) === normalize(header),
        ),
      ),
    ]),
  );
}
export function parseDelimited(input) {
  const source = input.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const line = source.split('\n')[0];
  const delimiter = ['\t', ';', ','].sort(
    (a, b) => line.split(b).length - line.split(a).length,
  )[0];
  const rows = [];
  let row = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!quoted && cell.length) {
        throw new Error('CSV tırnak yapısı bozuk.');
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' && !quoted) {
      row.push(cell.replace(/\r$/, ''));
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('CSV içinde kapanmamış tırnak var.');
  row.push(cell.replace(/\r$/, ''));
  if (row.some((x) => x.trim())) rows.push(row);
  if (rows.length < 2)
    throw new Error('Başlık satırı ve en az bir veri satırı gerekli.');
  if (rows.length > 10001 || rows[0].length > 100)
    throw new Error('Bir aktarım en fazla 10.000 satır ve 100 sütun olabilir.');
  return { headers: rows[0], rows: rows.slice(1) };
}
export function csv(rows) {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => {
            let cell = String(value ?? '');
            if (/^[\s]*[=+@-]/.test(cell)) cell = "'" + cell;
            return '"' + cell.replaceAll('"', '""') + '"';
          })
          .join(';'),
      )
      .join('\r\n')
  );
}
export function reportFor(state, from, to) {
  from = dateValue(from);
  to = dateValue(to);
  if (to < from) throw new Error('Rapor tarih aralığı geçersiz.');
  const completed = state.activities.filter(
    (a) =>
      a.status === 'completed' && a.actualDate >= from && a.actualDate <= to,
  );
  const planned = state.activities.filter(
    (a) => a.startDate <= to && a.endDate >= from && a.status === 'planned',
  );
  const total = completed.reduce((sum, a) => sum + a.actualParticipants, 0);
  return {
    from,
    to,
    completed,
    planned,
    total,
    text: `REFİKA · ${provinces[Number(state.settings.province) - 1]}\nDönem: ${from} – ${to}\n\nTamamlanan faaliyet: ${completed.length}\nPlanlanan / açık faaliyet: ${planned.length}\nGerçekleşen toplam katılım: ${total}\nKatılım toplamı benzersiz kişi sayısı değildir.\n\n${completed.map((a) => `${a.title}\nTür: ${a.kind} · Gerçekleşme: ${a.actualDate}\nKatılım: ${a.actualParticipants}\nSonuç: ${a.result}\nKanıt: ${a.evidence}`).join('\n\n')}\n\nKoordinatör incelemesi için hazırlanmıştır. Resmî sisteme gönderilmemiştir.`,
  };
}
