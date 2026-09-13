import test from 'node:test';
import assert from 'node:assert/strict';
import { saveTask, restoreTasks, visitReport } from './tasks.mjs';
const example = { title:'Örnek ziyaret',school:'Örnek okul',purpose:'Proje hazırlığı',date:'2026-10-12',status:'planned' };
const at='2026-09-11T12:00:00.000Z';
test('visit lifecycle preserves identity and creation time, requires a result',()=>{
  const planned=saveTask([],example,'one',at);
  assert.throws(()=>saveTask(planned,{...example,status:'completed'},'one',at),/sonucunu/);
  const done=saveTask(planned,{...example,status:'completed',result:'Hazırlık tamamlandı'},'one','2026-10-12T12:00:00.000Z');
  assert.equal(done.length,1);assert.equal(done[0].createdAt,at);assert.equal(done[0].completedAt,'2026-10-12T12:00:00.000Z');
  assert.throws(()=>saveTask(done,example,'one',at),/değiştirilemez/);
});
test('invalid dates and corrupt saved tasks fail instead of becoming empty records',()=>{
  assert.throws(()=>saveTask([],{...example,date:'2026-02-30'},'one',at),/tarihi/);
  const items=saveTask([],example,'one',at);
  assert.throws(()=>restoreTasks([...items,...items]),/tutarsız/);
  assert.throws(()=>restoreTasks({}),/okunamadı/);
  assert.deepEqual(restoreTasks(),[]);
  assert.deepEqual(restoreTasks(JSON.parse(JSON.stringify(items))),items);
});
test('report distinguishes planned work from completed work after reload',()=>{
  let items=saveTask([],example,'one',at);
  items=saveTask(items,{...example,title:'İkinci ziyaret',status:'completed',result:'Sonuç kaydı'},'two',at);
  const report=visitReport(restoreTasks(JSON.parse(JSON.stringify(items))));
  assert.match(report,/Planlanan: 1/);assert.match(report,/Tamamlanan: 1/);assert.match(report,/Sonuç kaydı/);
});
