export const instagramAccounts = [
  '@tcmeb', '@mebyegitek', '@turkiyetwinning', '@erzurummem',
  '@suleymanekici20', '@erzurumyegitek', '@erzurumetwinning',
  '@oktay.yigiter.1', '@haydarorhan25', '@zulkerdastan',
];

const formatDate = value => value?.split('-').reverse().join('.') || '';

export function createNewsDraft({ title, date, result }) {
  const missing = [!title && 'faaliyet adı', !date && 'gerçekleşme tarihi', !result && 'gerçekleşen sonuç'].filter(Boolean);
  if (missing.length) return { ok: false, error: `Haber taslağı için önce ${missing.join(', ')} alanlarını tamamlayın.` };
  return {
    ok: true,
    text: `${title} Gerçekleştirildi\n\n${formatDate(date)} tarihinde gerçekleştirilen “${title}” çalışmasında ${result}. Faaliyete ilişkin kayıt ve kanıtlar il koordinatörlüğü tarafından arşivlendi. Çalışmaya katkı sunan katılımcılarımıza teşekkür ederiz.\n\n${instagramAccounts.join('  ')}`,
  };
}
