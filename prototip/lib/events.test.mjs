import test from 'node:test';
import assert from 'node:assert/strict';
import { eventReport, restoreEvents, saveEvent } from './events.mjs';

const example = { title:'Koordinatörler çalıştayı',kind:'Çalıştay',mode:'Yüz yüze',audience:'eTwinning koordinatörleri',venue:'Ankara',purpose:'Yıllık planlama',date:'2026-10-14',plannedParticipants:81,actualParticipants:'',result:'',evidence:'',status:'planned' };
const at = '2026-09-11T12:00:00.000Z';

test('event lifecycle records participation and survives reload', () => {
  const planned = saveEvent([], example, 'event-one', at);
  assert.throws(() => saveEvent(planned, {...example,status:'completed'}, 'event-one', at), /katılımcı sayısını/);
  const done = saveEvent(planned, {...example,status:'completed',actualParticipants:78,result:'Çalışma planı tamamlandı'}, 'event-one', '2026-10-16T15:00:00.000Z');
  const restored = restoreEvents(JSON.parse(JSON.stringify(done)));
  assert.equal(restored[0].actualParticipants, 78);
  assert.equal(restored[0].createdAt, at);
  assert.throws(() => saveEvent(done, example, 'event-one', at), /değiştirilemez/);
});

test('event validation rejects invalid dates, counts and saved duplicates', () => {
  assert.throws(() => saveEvent([], {...example,date:'2026-02-30'}, 'one', at), /tarihi/);
  assert.throws(() => saveEvent([], {...example,plannedParticipants:0}, 'one', at), /Planlanan/);
  const items = saveEvent([], example, 'one', at);
  assert.throws(() => restoreEvents([...items,...items]), /tutarsız/);
});

test('event report separates plan, completion and actual attendance', () => {
  let items = saveEvent([], example, 'one', at);
  items = saveEvent(items, {...example,title:'Webinar',kind:'Webinar',status:'completed',actualParticipants:45,result:'Kaynaklar paylaşıldı'}, 'two', at);
  const report = eventReport(items);
  assert.match(report,/Planlanan: 1/); assert.match(report,/Tamamlanan: 1/); assert.match(report,/Gerçekleşen toplam katılım: 45/);
});
