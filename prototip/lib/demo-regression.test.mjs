import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition } from './workflow.mjs';
import { loadDemo, saveDemo } from './storage.mjs';
function send(state = initialState()) {
  for (const r of state.records.filter(r => r.queued)) state = transition(state, { type: 'review', id: r.id, school: r.school || 'Örnek okul', confirmed: true });
  state = transition(state, { type: 'prepare' });
  state = transition(state, { type: 'submit', subject: state.packet.subject, body: state.packet.body });
  return transition(state, { type: 'approve', confirmed: true });
}
const membership = { name: 'Örnek kişi', type: 'Öğretmen', accountId: 'DEMO-4', school: 'Örnek okul', schoolId: 'DEMO-OKUL-4', requestType: 'membershipRemoval', reason: 'Yanlış okul bağlantısı' };
test('old package accepts separate results while a new package is being prepared', () => {
  let s = send();
  const old = s.packet.id;
  s = transition(s, { type: 'create', record: membership });
  s = transition(s, { type: 'result', packetId: old, recordId: 'R-001', result: 'Tamamlandı' });
  assert.equal(s.stage, 'review');
  assert.equal(s.packets[0].results['R-001'].note, 'Tamamlandı');
  assert.equal(s.packets[0].results['R-002'], undefined);
  assert.throws(() => transition(s, { type: 'result', packetId: old, recordId: 'R-004', result: 'Yanlış paket' }));
  s = send(s);
  assert.equal(s.packets.length, 2);
  assert.notEqual(s.packet.id, old);
  assert.match(s.packet.body, /DEMO-OKUL-4/);
  assert.match(s.packet.body, /öğretmen hesabı silinmez/);
});
test('membership actions require a separate school identity and cannot target a school account', () => {
  for (const requestType of ['membershipApproval', 'membershipRemoval']) {
    assert.throws(() => transition(initialState(), { type: 'create', record: { ...membership, requestType, schoolId: '' } }));
    assert.throws(() => transition(initialState(), { type: 'create', record: { ...membership, requestType, type: 'Okul' } }));
  }
});
test('drafts, per-request results and history survive serialization; corrupt storage is reported', () => {
  let raw = null;
  const storage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
  let state = send();
  state = transition(state, { type: 'result', recordId: 'R-002', result: 'Düzeltildi' });
  const data = { state, subject: 'Kaydedilmiş konu', body: 'Taslak metni' };
  saveDemo(storage, data);
  assert.deepEqual(loadDemo(storage), data);
  raw = '{broken';
  assert.throws(() => loadDemo(storage));
  assert.equal(raw, '{broken');
});
