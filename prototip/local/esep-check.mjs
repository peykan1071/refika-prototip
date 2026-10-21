import { safeLink, timestamp } from './validation.mjs';

export const esepStatusLabels = {
  validated: 'Onaylı',
  pending: 'Onay bekliyor',
  registered: 'ESEP kayıtlı · eTwinning onayı yok',
  dormant: 'Dormant · uzun süredir giriş yapılmamış',
  deactivated: 'Hesap devre dışı',
  blocked: 'Engellenmiş',
  not_validated: 'Onaylı değil',
  rejected: 'Reddedilmiş',
  not_found: 'Aramada bulunamadı',
  not_listed: 'Bu okul üyeliği listede görünmüyor',
  removed: 'Okul üyeliği silinmiş',
  unknown: 'Kontrol edilemedi',
};
function esepLink(value) {
  const link = safeLink(value);
  if (
    link &&
    (new URL(link).hostname !== 'school-education.ec.europa.eu' ||
      new URL(link).protocol !== 'https:')
  )
    throw new Error('ESEP kontrol kaynağı resmî ESEP bağlantısı olmalı.');
  return link;
}
function short(value, limit = 1500) {
  if (typeof value !== 'string' || value.length > limit)
    throw new Error('ESEP kontrol açıklaması geçersiz.');
  return value.trim();
}
export function cleanEsepCheck(input, row) {
  if (!input || typeof input !== 'object')
    throw new Error('ESEP kontrolü gerekli.');
  const result = {
    checkedAt: timestamp(input.checkedAt),
    note: short(input.note || '', 4000),
  };
  for (const kind of ['person', 'school', 'membership']) {
    const part = input[kind];
    if (!part || !Object.hasOwn(esepStatusLabels, part.status))
      throw new Error('Kişi, okul ve üyelik kontrol durumlarını belirtin.');
    if (
      part.relatedProfiles &&
      (!Array.isArray(part.relatedProfiles) || part.relatedProfiles.length > 20)
    )
      throw new Error('İlişkili profil listesi geçersiz.');
    const cleaned = {
      status: part.status,
      checkedAt: timestamp(part.checkedAt),
      sourceUrl: esepLink(part.sourceUrl),
      profileUrl: esepLink(part.profileUrl),
      sourceLabel: short(part.sourceLabel || ''),
      note: short(part.note || '', 4000),
      id: short(part.id || '', 300),
      relatedProfiles: (part.relatedProfiles || []).map((related) => {
        if (!related || !Object.hasOwn(esepStatusLabels, related.status))
          throw new Error('İlişkili ESEP profil durumu geçersiz.');
        const profile = {
          id: short(related.id || '', 300),
          title: short(related.title || ''),
          status: related.status,
          profileUrl: esepLink(related.profileUrl),
          sourceUrl: esepLink(related.sourceUrl),
          sourceLabel: short(related.sourceLabel || ''),
          checkedAt: timestamp(related.checkedAt),
          note: short(related.note || '', 4000),
        };
        if (
          !profile.id ||
          !profile.title ||
          !profile.profileUrl ||
          !profile.sourceUrl ||
          !profile.sourceLabel ||
          profile.checkedAt > result.checkedAt
        )
          throw new Error(
            'İlişkili profil için kimlik, kaynak ve kontrol zamanı gerekli.',
          );
        return profile;
      }),
    };
    if (cleaned.checkedAt > result.checkedAt)
      throw new Error('Kontrol zamanı kaynak gözleminden önce olamaz.');
    if (
      cleaned.status !== 'unknown' &&
      (!cleaned.sourceUrl || !cleaned.sourceLabel)
    )
      throw new Error(
        'Güncel durum için ESEP kaynağı ve görünen durum gerekli.',
      );
    const expected = kind === 'person' ? row.accountId : row.schoolId;
    if (expected && cleaned.id !== expected)
      throw new Error('ESEP kontrolündeki kişi / okul ID dosyayla eşleşmiyor.');
    if (
      kind !== 'membership' &&
      !['unknown', 'not_found'].includes(cleaned.status) &&
      !cleaned.profileUrl
    )
      throw new Error(
        'Bulunan kişi / okul için gerçek profil bağlantısı gerekli.',
      );
    result[kind] = cleaned;
  }
  return result;
}
