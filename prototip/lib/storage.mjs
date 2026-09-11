export const storageKey = 'refika-demo-v2';
export function saveDemo(storage, data) {
  storage.setItem(storageKey, JSON.stringify({ version: 2, data }));
}
export function loadDemo(storage) {
  const raw = storage.getItem(storageKey);
  if (!raw) return null;
  const saved = JSON.parse(raw);
  const data = saved.data;
  if (saved.version !== 2 || !data || !data.state || !Array.isArray(data.state.records) || !Array.isArray(data.state.packets) || !Array.isArray(data.state.history) || !['review', 'draft', 'approval', 'sent', 'complete'].includes(data.state.stage)) throw new Error('Kayıt biçimi desteklenmiyor.');
  for (const packet of data.state.packets) {
    if (!packet.id || !Array.isArray(packet.ids) || !packet.results || packet.ids.some(id => !data.state.records.some(r => r.id === id))) throw new Error('Paket kayıtları tutarsız.');
  }
  return data;
}
