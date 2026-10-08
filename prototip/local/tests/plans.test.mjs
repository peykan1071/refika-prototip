import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { Store } from '../store.mjs';
import { parsePlanHtml, previewPlan, commitPlan } from '../plans.mjs';
import { startLocal } from '../server.mjs';

const table = (month, title = 'Okul görüşmeleri') =>
  `<h2>${month}</h2><table><tr><th>Çalışma günleri</th><th>Ana faaliyet / uygulama</th><th>Beklenen çıktı</th><th>Validasyon / uygulama notu</th></tr><tr><td>Ay boyunca<br>${month}</td><td><b>${title}</b><br>Üç okul için randevu planlanır.</td><td>Görüşme notları</td><td>Gerçekleşme ayrıca kaydedilir.</td></tr><tr><td>12-14,16<br>${month}</td><td><b>Proje hazırlığı</b><br>Planlama toplantıları</td><td>Taslak program</td><td>Saatler teyit edilir.</td></tr></table>`;
const source = {
  title: 'Test il faaliyet planı',
  year: 2026,
  sourceUrl: 'https://yegitek.eba.gov.tr/faaliyet-plani/999',
  planHtml: table('Eylül 2026') + table('Ocak 2027'),
  progressText: 'Toplantı ertelendi; gerçekleşme henüz teyit edilmedi.',
};
function workspace(t) {
  const store = new Store(':memory:');
  store.setup({
    province: '25',
    operator: 'Test koordinatörü',
    year: '2026–2027',
  });
  t.after(() => store.close());
  return store;
}
async function save(store, input = source) {
  const p = await previewPlan(store, input);
  return commitPlan(store, p, p.token);
}

test('Aylık tablolar günleri değiştirmeden ayrılır, takvim ve aktif HTML çalıştırılmaz', () => {
  const parsed = parsePlanHtml(
    `<script>throw new Error('çalıştırma')</script><table><tr><td><div>Ekim 2026</div><div>Aylık tema</div></td><td><table><tr><th>Pzt</th><th>Sal</th></tr><tr><td>1</td><td>2</td></tr></table></td></tr></table>${table('Ekim 2026')}<iframe src="https://invalid.example"></iframe>`,
  );
  assert.equal(parsed.items.length, 2);
  assert.equal(parsed.items[0].month, '2026-10');
  assert.equal(parsed.items[1].dateLabel, '12-14,16\nEkim 2026');
  assert.equal(parsed.items[0].title, 'Okul görüşmeleri');
  assert.equal(parsePlanHtml(table('EKİM 2026')).items[0].month, '2026-10');
  assert.doesNotMatch(parsed.planText, /throw new Error|iframe/);
  assert.ok(
    parsed.items.every(
      (i) => !Object.hasOwn(i, 'status') && !Object.hasOwn(i, 'startDate'),
    ),
  );
});
test('Plan ve ilerleme ayrı kalır; önizlemeden sonra aynı plan çoğalmaz', async (t) => {
  const store = workspace(t),
    p = await previewPlan(store, source);
  assert.equal(store.list('plans').length, 0);
  // The UI reviews normalized content, not raw HTML, before commit.
  const normalized = await previewPlan(store, { ...p.plan, id: undefined });
  assert.equal(p.token, normalized.token);
  const plan = commitPlan(store, normalized, p.token);
  assert.equal(plan.items.length, 4);
  assert.deepEqual(
    [...new Set(plan.items.map((i) => i.month))],
    ['2026-09', '2027-01'],
  );
  assert.equal(plan.progressText, source.progressText);
  assert.equal(store.state().activities.length, 0);
  const again = await previewPlan(store, source);
  assert.equal(again.action, 'unchanged');
  commitPlan(store, again, again.token);
  assert.equal(store.list('plans').length, 1);
  assert.equal(store.list('plans')[0].version, 1);
});
test('Eski önizleme ve eşzamanlı plan düzenlemesi veri ezemez', async (t) => {
  const store = workspace(t),
    p = await previewPlan(store, source);
  store.log('Arada başka işlem');
  assert.throws(() => commitPlan(store, p, p.token), /değişti/);
  const refreshed = await previewPlan(store, source);
  assert.throws(() => commitPlan(store, refreshed, p.token), /değişti/);
  const first = await save(store);
  const second = await save(store, {
    ...first,
    progressText: 'Yeni kaynak notu',
  });
  assert.equal(second.version, 2);
  await assert.rejects(() => previewPlan(store, first), /değişmiş/);
});
test('Tek plan maddesinden ayrı faaliyetler oluşturulur, plan değişince sonuçlar korunur', async (t) => {
  const store = workspace(t),
    plan = await save(store);
  const draft = {
    title: 'Birinci okul görüşmesi',
    purpose: 'İhtiyaç tespiti',
    kind: 'Okul ziyareti',
    startDate: '2026-09-10',
    endDate: '2026-09-10',
    status: 'planned',
    planId: plan.id,
    planItemId: plan.items[0].id,
    planVersion: plan.version,
  };
  assert.throws(() => store.saveActivity({ ...draft, startDate: '' }), /Tarih/);
  const a = store.saveActivity(draft);
  store.saveActivity({ ...draft, title: 'İkinci okul görüşmesi' });
  assert.equal(store.state().activities.length, 2);
  assert.equal(a.planSource.dateLabel, 'Ay boyunca\nEylül 2026');
  const updated = await save(store, {
    ...plan,
    items: plan.items.map((i) => ({ ...i, implementationNote: 'Güncel not' })),
  });
  assert.equal(updated.version, 2);
  assert.equal(store.get('activities', a.id).version, 1);
  assert.throws(() => store.saveActivity(draft), /güncellenmiş/);
  assert.throws(() => store.saveActivity({ ...a, status: 'completed' }));
});
test('Plan, ilerleme ve faaliyet bağı yedekle geri gelir; eski yedekler açılır', async (t) => {
  const store = workspace(t),
    plan = await save(store);
  const archive = store.exportArchive();
  assert.equal(archive.version, 3);
  store.restoreArchive(archive, '25');
  assert.equal(store.state().plans[0].items.length, 4);
  assert.equal(store.state().plans[0].progressText, source.progressText);
  assert.ok(store.state().plans[0].version > plan.version);
  const wrong = structuredClone(archive);
  wrong.plans[0].province = '06';
  assert.throws(() => store.restoreArchive(wrong, '25'), /geçersiz/);
  assert.equal(store.state().plans.length, 1);
  store.restoreArchive({ ...archive, version: 2, plans: undefined }, '25');
  assert.equal(store.state().plans.length, 0);
});
test('Farklı biçim metni kaybolmaz; elle aylık madde eklenebilir ve sınırlar uygulanır', async (t) => {
  const store = workspace(t);
  const p = await previewPlan(store, {
    title: 'Serbest plan',
    year: 2026,
    planText: 'Dönem içindeki destek çalışmaları.',
  });
  assert.equal(p.plan.items.length, 0);
  assert.equal(p.warnings.length, 1);
  const manual = await previewPlan(store, {
    ...p.plan,
    id: undefined,
    items: [{ month: '2026-11', dateLabel: 'Ay boyunca', title: 'Rehberlik' }],
  });
  assert.equal(manual.plan.items.length, 1);
  await assert.rejects(
    () => previewPlan(store, { ...source, sourceUrl: 'javascript:alert(1)' }),
    /geçersiz/,
  );
  await assert.rejects(
    () => previewPlan(store, { ...source, planHtml: 'x'.repeat(800001) }),
    /çok uzun/,
  );
  await assert.rejects(
    () =>
      previewPlan(store, {
        ...source,
        items: [{ month: '2026-13', title: 'Hatalı ay', dateLabel: '1' }],
      }),
    /gerekli/,
  );
});
test('Plan API: kaynak oturumu, önizleme, kalıcı kayıt ve gelecek AI için indirme', async (t) => {
  const path = await mkdtemp(join(tmpdir(), 'refika-plans-'));

  const ui = join(path, 'ui');
  await mkdir(ui);
  await writeFile(join(ui, 'index.html'), '<html>TEST</html>');
  const service = await startLocal({ dataDir: path, staticDir: ui, env: {} });
  t.after(async () => {
    await service.close();
    if (!resolve(path).startsWith(resolve(tmpdir()) + sep + 'refika-plans-'))
      throw new Error('Geçersiz test yolu');
    await rm(path, { recursive: true, force: true });
  });
  const root = await fetch(service.url),
    cookie = root.headers.get('set-cookie').split(';')[0];
  const post = (route, body) =>
    fetch(service.url + '/api/' + route, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        Origin: service.url,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  await post('setup', { province: '25', operator: 'Test', year: '2026–2027' });
  assert.equal((await fetch(service.url + '/api/state')).status, 401);
  const p = await (await post('plans/preview', source)).json();
  const result = await post('plans/commit', { ...source, token: p.token });
  assert.equal(result.status, 200);
  const plan = await result.json();
  const exported = await (
    await fetch(service.url + `/api/plans/${plan.id}/export`, {
      headers: { Cookie: cookie },
    })
  ).json();
  assert.equal(exported.format, 'refika-plan-context');
  assert.equal(exported.plan.items.length, 4);
  const state = await (
    await fetch(service.url + '/api/state', { headers: { Cookie: cookie } })
  ).json();
  assert.equal(state.plans.length, 1);
  assert.equal(state.activities.length, 0);
});
