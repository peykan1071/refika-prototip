export const requestTypes = { approval: 'Hesap onayı talebi', membershipApproval: 'Okul üyeliği onayı', membershipRemoval: 'Okul bağlantısını kaldırma', correction: 'Düzeltme talebi', merger: 'Okul birleştirme talebi', deletion: 'Hesap silme talebi' };
export const queuedRecords = state => state.records.filter(r => r.queued);
export const initialRecords = () => [
  {
    id: 'R-001',
    name: 'Öğretmen A',
    type: 'Öğretmen',
    school: '',
    district: 'Yakutiye',
    email: 'ogretmen.a@example.invalid',
    issue: 'Okul bilgisi eksik',
    reviewed: false,
  },
  {
    id: 'R-002',
    name: 'Okul B',
    type: 'Okul',
    school: 'Örnek Ortaokulu',
    district: 'Palandöken',
    email: 'okul.b@example.invalid',
    issue: 'Kurum kaydı doğrulanmalı',
    reviewed: false,
  },
  {
    id: 'R-003',
    name: 'Öğretmen C',
    type: 'Öğretmen',
    school: 'Örnek İlkokulu',
    district: 'Aziziye',
    email: 'ogretmen.c@example.invalid',
    issue: '',
    reviewed: true,
  },
].map((r, i) => ({ ...r, requestType: i === 1 ? 'correction' : 'approval', reason: i === 1 ? 'Örnek kurum adının düzeltilmesi gerekiyor.' : 'Örnek hesap için onay talep ediliyor.', accountId: `DEMO-${i + 1}`, correction: i === 1 ? 'Kurum adı → Örnek Ortaokulu' : '', relatedAccounts: '', retainedAccount: '', evidence: '', queued: true, deliveries: [] }));
export const initialState = () => ({
  records: initialRecords(),
  stage: 'review',
  packet: null,
  history: [],
  result: '',
  packets: [],
});
export function transition(state, action) {
  const log = (message) => [
    ...state.history,
    { at: new Date().toISOString(), message },
  ];
  if (action.type === 'create') {
    if (!['review', 'sent', 'complete'].includes(state.stage)) throw new Error('Yeni talep için mevcut paketi tamamlayın veya düzeltmeye geri alın.');
    const record = validateRequest(action.record);
    const id = `R-${String(Math.max(0, ...state.records.map(r => Number(r.id.slice(2)))) + 1).padStart(3, '0')}`;
    return { ...state, stage: 'review', packet: null, result: '', records: [...state.records, { ...record, id, reviewed: false, issue: 'Talep incelemesi bekliyor', queued: true, deliveries: [] }], history: log(`${id}: ${requestTypes[record.requestType]} oluşturuldu.`) };
  }
  if (action.type === 'repeat') {
    if (!['sent', 'complete', 'review'].includes(state.stage)) throw new Error('Önce mevcut paketi tamamlayın veya düzeltmeye geri alın.');
    const record = state.records.find(r => r.id === action.id);
    if (!record?.deliveries.length || record.queued) throw new Error('Yalnızca daha önce gönderilmiş ve sırada olmayan talep tekrar gönderilebilir.');
    if (!action.reason?.trim()) throw new Error('Tekrar gönderim gerekçesini yazın.');
    return { ...state, stage: 'review', packet: null, result: '', records: state.records.map(r => r.id === action.id ? { ...r, queued: true, reviewed: false, issue: 'Tekrar gönderim incelemesi bekliyor', repeatReason: action.reason.trim() } : r), history: log(`${record.id}: aynı talep numarasıyla tekrar gönderim hazırlığı açıldı. ${action.reason.trim()}`) };
  }
  if (action.type === 'review') {
    if (state.stage !== 'review')
      throw new Error(
        'Kayıtları değiştirmek için paketi düzeltmeye geri alın.',
      );
    const record = state.records.find((r) => r.id === action.id);
    if (!record) throw new Error('Kayıt bulunamadı.');
    if (!record.queued) throw new Error('Bu talep gönderim sırasında değil.');
    if (!action.school?.trim() || !action.confirmed)
      throw new Error('Okul bilgisini ve örnek kayıt kontrolünü tamamlayın.');
    const updated = validateRequest({ ...record, ...action.record, school: action.school });
    if (record.deliveries.length && ['requestType', 'accountId', 'name', 'type', 'school', 'schoolId', 'email', 'district', 'reason', 'correction', 'relatedAccounts', 'retainedAccount', 'evidence'].some(key => updated[key] !== String(record[key] || ''))) throw new Error('Gönderilmiş talebin içeriği değiştirilemez. Farklı işlem için yeni talep oluşturun.');
    return {
      ...state,
      records: state.records.map((r) =>
        r.id === action.id
          ? { ...r, ...updated, issue: '', reviewed: true }
          : r,
      ),
      history: log(`${record.name}: örnek kayıt kontrolü tamamlandı.`),
    };
  }
  if (action.type === 'prepare') {
    if (state.stage !== 'review') throw new Error('Paket zaten hazırlandı.');
    const queued = queuedRecords(state);
    if (!queued.length || queued.some((r) => !r.reviewed || r.issue || !r.school))
      throw new Error('Önce eksik kayıtları tamamlayın.');
    return {
      ...state,
      stage: 'draft',
      packet: {
        id: `P-${String((state.packets || []).length + 1).padStart(3, '0')}`,
        recipient: 'merkez@example.invalid',
        subject: 'Örnek validasyon listesi — koordinatör incelemesi',
        body: `Sayın Yetkili,\n\nAşağıdaki örnek talepler değerlendirmeye sunulmuştur:\n\n${queued.map(r => `${r.id} — ${requestTypes[r.requestType]}${r.deliveries.length ? ' (tekrar gönderim)' : ''}\n${r.name} · ${r.school} · Hesap: ${r.accountId}${r.schoolId ? '\nİlgili okul kimliği: ' + r.schoolId + '\nİşlem yalnızca bu okul üyeliğine yöneliktir; öğretmen hesabı silinmez.' : ''}\nGerekçe: ${r.reason}${r.correction ? '\nDüzeltme: ' + r.correction : ''}${r.relatedAccounts ? '\nBirleştirilecek hesaplar: ' + r.relatedAccounts + '\nKorunacak hesap: ' + r.retainedAccount : ''}${r.evidence ? '\nKanıt: ' + r.evidence : ''}${r.repeatReason ? '\nTekrar gerekçesi: ' + r.repeatReason : ''}`).join('\n\n')}\n\nBu içerik yalnızca prototip denemesidir. Gerçek gönderim yapılmaz.\n\nİyi çalışmalar.`,
        count: queued.length,
        ids: queued.map(r => r.id),
      },
      history: log('Merkez listesi ve e-posta taslağı hazırlandı.'),
    };
  }
  if (action.type === 'submit') {
    if (state.stage !== 'draft') throw new Error('Önce taslak hazırlayın.');
    if (!action.subject?.trim() || !action.body?.trim())
      throw new Error('Konu ve e-posta metni boş bırakılamaz.');
    return {
      ...state,
      stage: 'approval',
      packet: {
        ...state.packet,
        subject: action.subject.trim(),
        body: action.body.trim(),
      },
      history: log('Validasyon listesi ve e-posta taslağı gönderim öncesi kontrole sunuldu.'),
    };
  }
  if (action.type === 'return') {
    if (!['draft', 'approval'].includes(state.stage))
      throw new Error('Bu aşamada düzeltmeye dönülemez.');
    return {
      ...state,
      stage: 'review',
      packet: null,
      history: log('Paket düzeltme için kayıt incelemeye döndü.'),
    };
  }
  if (action.type === 'approve') {
    if (state.stage !== 'approval' || !action.confirmed)
      throw new Error('Validasyon listesi ve e-posta taslağı incelenmeli, ardından koordinatör onayı verilmelidir.');
    const sentAt = new Date().toISOString();
    const packet = { ...state.packet, sentAt, results: {} };
    return {
      ...state,
      stage: 'sent',
      sentAt,
      packet,
      packets: [...(state.packets || []), packet],
      records: state.records.map(r => state.packet.ids.includes(r.id) ? { ...r, queued: false, deliveries: [...r.deliveries, { packetId: packet.id, at: sentAt, reason: r.repeatReason || 'İlk gönderim', simulated: true }] } : r),
      history: log(
        'Koordinatör onayı alındı; gönderim simüle edildi. Gerçek gönderim yapılmadı.',
      ),
    };
  }
  if (action.type === 'result') {
    const packetId = action.packetId || state.packet?.id;
    const packet = (state.packets || []).find(p => p.id === packetId);
    if (!packet || !action.result?.trim()) throw new Error('Gönderilmiş paketi seçin ve sonuç notunu yazın.');
    const ids = action.recordId ? [action.recordId] : packet.ids;
    if (ids.some(id => !packet.ids.includes(id) || packet.results[id])) throw new Error('Talep bu pakette değil veya sonucu zaten kaydedilmiş.');
    const results = { ...packet.results, ...Object.fromEntries(ids.map(id => [id, { note: action.result.trim(), at: new Date().toISOString() }])) };
    const updated = { ...packet, results };
    const complete = packet.ids.every(id => results[id]);
    const current = state.packet?.id === packet.id && ['sent', 'complete'].includes(state.stage);
    return {
      ...state,
      packets: state.packets.map(p => p.id === packet.id ? updated : p),
      ...(current ? { packet: updated, stage: complete ? 'complete' : 'sent', result: packet.ids.filter(id => results[id]).map(id => `${id}: ${results[id].note}`).join('\n') } : {}),
      history: log(
        `${packet.id} / ${ids.join(', ')}: Deneme sonucu faaliyet özetine işlendi: ${action.result.trim()}`,
      ),
    };
  }
  throw new Error('Bilinmeyen işlem.');
}

function validateRequest(input) {
  const keys = ['name', 'type', 'school', 'schoolId', 'district', 'email', 'requestType', 'reason', 'accountId', 'correction', 'relatedAccounts', 'retainedAccount', 'evidence'];
  const record = Object.fromEntries(keys.map(key => [key, String(input[key] || '').trim()]));
  if (!Object.hasOwn(requestTypes, record.requestType) || !['Öğretmen', 'Okul'].includes(record.type)) throw new Error('İşlem ve kayıt türünü seçin.');
  if (['name', 'school', 'reason', 'accountId'].some(key => !record[key])) throw new Error('Ad, okul, hesap kimliği ve gerekçe alanlarını tamamlayın.');
  if (record.requestType === 'correction' && !record.correction) throw new Error('Mevcut bilgi ve istenen düzeltmeyi yazın.');
  if (['membershipApproval', 'membershipRemoval'].includes(record.requestType) && (record.type !== 'Öğretmen' || !record.schoolId)) throw new Error('Okul üyeliği işlemi için öğretmen hesabı ve ilgili okul kimliği gereklidir.');
  if (record.requestType === 'merger') {
    if (record.type !== 'Okul') throw new Error('Birleştirme talebi yalnız okul kayıtları için hazırlanır. Öğretmen hesaplarını önce hesap incelemesinde değerlendirin.');
    const accounts = [...new Set(record.relatedAccounts.split(/[\n,;]/).map(s => s.trim()).filter(Boolean))];
    if (accounts.length < 2 || !accounts.includes(record.retainedAccount)) throw new Error('En az iki farklı hesap ve bunların içinden korunacak hesabı belirtin.');
  } else { record.relatedAccounts = ''; record.retainedAccount = ''; }
  if (record.requestType !== 'correction') record.correction = '';
  return record;
}
