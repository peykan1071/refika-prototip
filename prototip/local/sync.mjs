export function syncStatus(env = process.env) {
  return { configured: Boolean(env.REFIKA_HUB_URL && env.REFIKA_HUB_TOKEN) };
}
export async function syncSummary(store, env = process.env) {
  if (!syncStatus(env).configured)
    throw new Error(
      'Merkez adresi ve bu ile ait bağlantı anahtarı henüz tanımlanmadı.',
    );
  if (!store.meta('settings') || store.meta('shareSummary') !== true)
    throw new Error('Merkeze özet paylaşımını önce ayarlardan açın.');
  const url = new URL('/api/snapshots', env.REFIKA_HUB_URL);
  if (
    url.protocol !== 'https:' &&
    !(
      url.protocol === 'http:' &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    )
  )
    throw new Error('Merkez bağlantısı HTTPS kullanmalı.');
  const snapshot = store.summary(),
    response = await fetch(url, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.REFIKA_HUB_TOKEN}`,
      },
      body: JSON.stringify({
        snapshot,
        baseVersion: store.meta('hubVersion') || 0,
      }),
    });
  if (response.status === 409)
    throw new Error(
      'Merkezde farklı bir sürüm var. Başka cihazdan aktarımı veya yedekten dönüşü merkez yöneticisiyle kontrol edin.',
    );
  if (!response.ok)
    throw new Error(`Merkez aktarımı tamamlanamadı (${response.status}).`);
  const result = await response.json();
  store.setMeta('hubVersion', result.version);
  store.setMeta('sync', {
    at: result.receivedAt,
    revision: snapshot.revision,
    error: '',
  });
  return result;
}
