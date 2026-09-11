import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition } from './workflow.mjs';
const newRequest = requestType => ({ name: 'Örnek kayıt', type: requestType === 'merger' ? 'Okul' : 'Öğretmen', school: 'Örnek okul', accountId: 'TEST-1', requestType, reason: 'Örnek işlem gerekçesi', correction: 'Eski ad → Yeni ad', relatedAccounts: 'TEST-1\nTEST-2', retainedAccount: 'TEST-1' });
test('four request types validate their required details and get unique IDs', () => {
  let s = initialState();
  for (const requestType of ['approval', 'correction', 'merger', 'deletion']) s = transition(s, { type: 'create', record: newRequest(requestType) });
  assert.equal(new Set(s.records.map(r => r.id)).size, 7);
  assert.equal(s.records.at(-1).reviewed, false);
  assert.throws(() => transition(s, { type: 'create', record: { ...newRequest('correction'), correction: '' } }));
  assert.throws(() => transition(s, { type: 'create', record: { ...newRequest('merger'), relatedAccounts: 'TEST-1\nTEST-1' } }));
  assert.throws(() => transition(s, { type: 'create', record: { ...newRequest('merger'), retainedAccount: 'OTHER' } }));
  assert.throws(() => transition(s, { type: 'create', record: { ...newRequest('merger'), type: 'Öğretmen' } }), /yalnız okul/);
  assert.throws(() => transition(s, { type: 'create', record: { ...newRequest('deletion'), reason: '' } }));
});
test('repeat preserves identity, sends only queued requests and requires fresh approval', () => {
  let s = initialState();
  for (const r of s.records) s = transition(s, { type: 'review', id: r.id, school: r.school || 'Örnek okul', confirmed: true });
  const send = state => {
    let next = transition(state, { type: 'prepare' });
    next = transition(next, { type: 'submit', subject: next.packet.subject, body: next.packet.body });
    return transition(next, { type: 'approve', confirmed: true });
  };
  s = send(s);
  assert.throws(() => transition(s, { type: 'repeat', id: 'R-001', reason: '' }));
  s = transition(s, { type: 'repeat', id: 'R-001', reason: 'Sonuç bekleniyor' });
  assert.equal(s.records.length, 3);
  assert.equal(s.records[0].deliveries.length, 1);
  assert.throws(() => transition(s, { type: 'prepare' }));
  assert.throws(() => transition(s, { type: 'approve', confirmed: true }));
  assert.throws(() => transition(s, { type: 'review', id: 'R-001', school: s.records[0].school, record: { requestType: 'deletion' }, confirmed: true }));
  s = transition(s, { type: 'review', id: 'R-001', school: s.records[0].school, confirmed: true });
  s = send(s);
  assert.deepEqual(s.packet.ids, ['R-001']);
  assert.match(s.packet.body, /tekrar gönderim/);
  assert.equal(s.packet.count, 1);
  assert.deepEqual(s.records.map(r => r.deliveries.length), [2, 1, 1]);
});
test('incomplete records and missing coordinator approval block advancement', () => {
  const s = initialState();
  assert.throws(() => transition(s, { type: 'prepare' }));
  assert.throws(() => transition(s, { type: 'approve', confirmed: true }));
  assert.throws(() => transition(s, { type: 'result', result: 'sonuç' }));
  assert.throws(() =>
    transition(s, { type: 'review', id: 'R-001', school: '', confirmed: true }),
  );
  assert.equal(s.stage, 'review');
});
test('review → draft → approval → simulated sending → report', () => {
  let s = initialState();
  for (const r of s.records.filter((r) => !r.reviewed))
    s = transition(s, {
      type: 'review',
      id: r.id,
      school: r.school || 'Örnek İlkokulu',
      confirmed: true,
    });
  s = transition(s, { type: 'prepare' });
  assert.equal(s.stage, 'draft');
  assert.equal(s.packet.count, 3);
  assert.throws(() => transition(s, { type: 'approve', confirmed: true }));
  s = transition(s, {
    type: 'submit',
    subject: s.packet.subject,
    body: s.packet.body,
  });
  assert.throws(() => transition(s, { type: 'approve', confirmed: false }));
  s = transition(s, { type: 'approve', confirmed: true });
  assert.equal(s.stage, 'sent');
  assert.ok(s.sentAt);
  assert.throws(() => transition(s, { type: 'approve', confirmed: true }));
  s = transition(s, {
    type: 'result',
    result: 'Deneme değerlendirmesi tamamlandı.',
  });
  assert.equal(s.stage, 'complete');
  assert.ok(s.history.at(-1).message.includes('faaliyet'));
  assert.equal(s.packet.recipient, 'merkez@example.invalid');
});
test('returning a package invalidates it before records change', () => {
  let s = initialState();
  for (const r of s.records)
    s = transition(s, {
      type: 'review',
      id: r.id,
      school: r.school || 'Örnek',
      confirmed: true,
    });
  s = transition(s, { type: 'prepare' });
  assert.throws(() =>
    transition(s, {
      type: 'review',
      id: 'R-001',
      school: 'Yeni okul',
      confirmed: true,
    }),
  );
  s = transition(s, { type: 'submit', subject: 'Konu', body: 'Metin' });
  s = transition(s, { type: 'return' });
  assert.equal(s.stage, 'review');
  assert.equal(s.packet, null);
  assert.throws(() => transition(s, { type: 'approve', confirmed: true }));
});
