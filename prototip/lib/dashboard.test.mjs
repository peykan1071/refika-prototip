import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardSummary } from './dashboard.mjs';

test('dashboard derives actionable counts without double-counting packets', () => {
  const state = {
    stage: 'approval', packet: { count: 2 },
    records: [{ id:'R-1', queued:true, reviewed:false, issue:'Eksik' }, { id:'R-2', queued:true, reviewed:true, issue:'' }],
    packets: [{ ids:['R-3','R-4'], results:{'R-3':{note:'Tamam'}} }],
  };
  const tasks = [
    { id:'V-1', title:'Bugünkü ziyaret', school:'A', district:'', date:'2026-09-11', status:'planned' },
    { id:'V-2', title:'Biten ziyaret', school:'B', district:'', date:'2026-09-10', status:'completed' },
  ];
  const events = [
    { id:'E-1', title:'Çalıştay', kind:'Çalıştay', audience:'Koordinatörler', date:'2026-09-11', status:'planned' },
    { id:'E-2', title:'Biten webinar', kind:'Webinar', audience:'Öğretmenler', date:'2026-09-10', status:'completed' },
  ];
  const result = dashboardSummary(state, tasks, events, '2026-09-11');
  assert.deepEqual(Object.fromEntries(result.metrics.map(x => [x.label,x.value])), {
    'Bugünkü faaliyet':2, 'Planlanan ziyaret':1, 'Planlanan etkinlik':1, 'Validasyon incelemesi':1,
    'Gönderim öncesi kontrol':1, 'Sonucu beklenen talep':1, 'Tamamlanan faaliyet':3,
  });
  assert.deepEqual(result.actions.map(x => x.id), ['approval','review','results','visit-V-1','event-E-1','activity-outputs']);
});
