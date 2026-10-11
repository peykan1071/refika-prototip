import { text } from './domain.mjs';

export function cleanCoordinatorContacts(input = {}) {
  const email = text(input.email, 254);
  const sheetUrl = text(input.sheetUrl, 2000);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Ortak e-posta adresini kontrol edin.');
  if (sheetUrl) {
    let url;
    try {
      url = new URL(sheetUrl);
    } catch {
      throw new Error('Google E-Tablo bağlantısını kontrol edin.');
    }
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'docs.google.com' ||
      url.port ||
      url.username ||
      url.password ||
      !/^\/spreadsheets\/d\/[\w-]+\/edit\/?$/.test(url.pathname)
    )
      throw new Error(
        'Google E-Tablonun docs.google.com/spreadsheets/d/…/edit bağlantısını kullanın.',
      );
  }
  return { email, sheetUrl };
}
