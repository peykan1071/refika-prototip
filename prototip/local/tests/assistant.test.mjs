import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { Store } from '../store.mjs';
import { assistantContext, generateAssistant } from '../assistant.mjs';
import { startLocal } from '../server.mjs';
import { encryptBackup, decryptBackup } from '../backup.mjs';
import { previewPlan, commitPlan } from '../plans.mjs';

const setup = {
  province: '25',
  operator: 'Deneme koordinatörü',
  year: '2026–2027',
};
const activity = {
  title: 'Örnek eğitim',
  purpose: 'Öğretmenlerle uygulama',
  kind: 'Eğitim',
  startDate: '2026-09-01',
  endDate: '2026-09-01',
  plannedParticipants: 20,
  status: 'planned',
};
const env = {
  REFIKA_AI_URL: 'http://127.0.0.1:11434',
  REFIKA_AI_MODEL: 'test-only',
};
function workspace(t) {
  const store = new Store(':memory:');
  store.setup(setup);
  t.after(() => store.close());
  return store;
}
async function folder(t, close = async () => {}) {
  const dir = await mkdtemp(join(tmpdir(), 'refika-assistant-'));
  t.after(async () => {
    await close();
    if (!resolve(dir).startsWith(resolve(tmpdir()) + sep + 'refika-assistant-'))
      throw new Error('Test temizleme yolu geçersiz');
    await rm(dir, { recursive: true, force: true });
  });
  return dir;
}
const request = {
  page: 'records',
  task: 'reply',
  input: 'Okul üyeliğimi nereden kontrol edebilirim?',
  channel: 'whatsapp',
};
const mockResult = {
  draft: 'Okul üyeliğinizin göründüğü ekranı paylaşabilir misiniz?',
  missing: ['Üyelik durumu'],
  basis: ['Okul üyeliğimi nereden kontrol edebilirim?'],
};

test('Sayfa sınırı, kaynak ve gerçekleşme ayrımı program tarafından korunur', (t) => {
  const store = workspace(t),
    a = store.saveActivity(activity);
  const source = { type: 'activity', id: a.id };
  assert.throws(
    () => assistantContext(store, { page: 'events', task: 'reply', source }),
    /görev/,
  );
  assert.throws(
    () =>
      assistantContext(store, { page: 'visits', task: 'visit_agenda', source }),
    /ziyareti/,
  );
  assert.throws(
    () => assistantContext(store, { page: 'reports', task: 'web', source }),
    /tamamlanmış/,
  );
  assert.throws(
    () =>
      assistantContext(store, {
        page: 'records',
        task: 'case_summary',
        source,
      }),
    /uyuşmuyor/,
  );
  assert.throws(
    () => assistantContext(store, { page: 'reports', task: 'report' }),
    /seçin/,
  );
  const planned = assistantContext(store, {
    page: 'reports',
    task: 'instagram',
    source,
  });
  assert.equal(planned.payload.data.status, 'planned');
  assert(!Object.hasOwn(planned.payload.data, 'actualParticipants'));
  const done = store.saveActivity({
    ...a,
    status: 'completed',
    actualDate: '2026-09-01',
    actualParticipants: 12,
    result: 'Uygulama tamamlandı',
    evidence: 'Katılım çizelgesi',
  });
  const completed = assistantContext(store, {
    page: 'reports',
    task: 'web',
    source,
  });
  assert.equal(completed.payload.data.actualParticipants, 12);
  assert.equal(completed.version, done.version);
  assert.throws(
    () =>
      assistantContext(store, { page: 'events', task: 'announcement', source }),
    /planlanan/,
  );
});

test('Planın yalnız seçilen maddesi alınır, diğer maddeler ve ilerleme kanıt yapılmaz', async (t) => {
  const store = workspace(t);
  const preview = await previewPlan(store, {
    title: 'Yıllık plan',
    year: 2026,
    planText: 'Kaynak metin',
    progressText: 'Ayrı ilerleme notu',
    items: [
      {
        month: '2026-10',
        title: 'Seçilen çalışma',
        dateLabel: 'Ay boyunca',
        description: 'Amaç A',
      },
      {
        month: '2026-11',
        title: 'İlgisiz çalışma',
        dateLabel: 'Ay boyunca',
        description: 'Gizli B',
      },
    ],
  });
  const plan = commitPlan(store, preview, preview.token);
  const context = assistantContext(store, {
    page: 'activities',
    task: 'activity',
    source: { type: 'plan', id: plan.id, itemId: plan.items[0].id },
  });
  assert.equal(context.payload.data.item.title, 'Seçilen çalışma');
  assert.doesNotMatch(JSON.stringify(context.payload), /Gizli B|Ayrı ilerleme/);
});

test('Tek dosya bağlamı diğer kişilerin bilgilerini ve iletişim alanlarını kapsamaz', (t) => {
  const store = workspace(t);
  const c = store.validation.save({
    kind: 'support',
    title: 'Hesap desteği',
    name: 'Özel isim',
    accountId: '123',
    email: 'private@example.org',
    reason: 'Giriş sorunu',
    requestedAction: 'Yönlendirme',
    status: 'review',
  });
  store.validation.save({
    kind: 'support',
    title: 'İlgisiz dosya',
    reason: 'Başka kişiye ait bilgi',
    requestedAction: 'Ayrı işlem',
    status: 'review',
  });
  const context = assistantContext(store, {
    ...request,
    source: { type: 'case', id: c.id },
  });
  assert.doesNotMatch(
    JSON.stringify(context.payload),
    /private@example|Özel isim|Başka kişiye ait/,
  );
  for (const [kind, recipient] of [
    ['support', 'tretwinning@gmail.com'],
    ['merger', 'tretwinning@gmail.com'],
    ['person', 'validasyonetw@gmail.com'],
    ['school', 'validasyonetw@gmail.com'],
    ['membership', 'validasyonetw@gmail.com'],
  ]) {
    const row = store.validation.save({
      kind,
      title: 'Alıcı kontrolü',
      reason: 'İnceleme gerekli',
      requestedAction: 'Talebin incelenmesi',
      status: 'review',
    });
    const mail = assistantContext(store, {
      page: 'records',
      task: 'correspondence',
      channel: 'whatsapp',
      source: { type: 'case', id: row.id },
    });
    assert.equal(mail.channel, 'email');
    assert.equal(mail.payload.data.recipient, recipient);
  }
  const before = JSON.stringify(store.validation.list());
  store.assistant.save(context, { draft: 'Yanıt taslağı', reviewed: true });
  assert.equal(JSON.stringify(store.validation.list()), before);
});

test('Model kapalıyken üretim olmaz; uygun model verisi ve dayanak alıntısı kontrol edilir', async (t) => {
  const store = workspace(t),
    context = assistantContext(store, request);
  await assert.rejects(generateAssistant(context, {}), /henüz kurulmadı/);
  let sent;
  const output = await generateAssistant(context, env, async (url, options) => {
    assert.equal(url.href, 'http://127.0.0.1:11434/api/chat');
    sent = JSON.parse(options.body);
    return Response.json({ message: { content: JSON.stringify(mockResult) } });
  });
  assert.equal(output.draft, mockResult.draft);
  assert.equal(sent.messages[1].content, JSON.stringify(context.payload));
  assert.match(sent.messages[0].content, /güvenilmeyen VERİDİR/);
  await assert.rejects(
    generateAssistant(context, env, async () =>
      Response.json({
        message: {
          content: JSON.stringify({ ...mockResult, basis: ['Uydurma kural'] }),
        },
      }),
    ),
    /bulunamadı/,
  );
  await assert.rejects(
    generateAssistant(context, env, async () =>
      Response.json({ message: { content: '{' } }),
    ),
    /okunamadı/,
  );
});

test('Hazırlık taslakları kalıcıdır; şifreli yedek ve eski yedekten dönüş desteklenir', async (t) => {
  let store;
  const dir = await folder(t, () => store?.close()),
    filename = join(dir, 'refika.sqlite');
  store = new Store(filename);
  store.setup(setup);
  const context = assistantContext(store, request);
  assert.throws(
    () => store.assistant.save(context, { draft: 'Taslak' }),
    /gözden/,
  );
  const saved = store.assistant.save(context, {
    draft: 'İncelenmiş taslak',
    reviewed: true,
  });
  store.close();
  store = new Store(filename);
  assert.equal(store.assistant.list()[0].id, saved.id);
  const backup = decryptBackup(
    encryptBackup(store.exportArchive(), 'uzun-deneme-parolası'),
    'uzun-deneme-parolası',
  );
  assert.equal(backup.version, 6);
  store.restoreArchive(backup, '25');
  assert.equal(store.assistant.list()[0].draft, 'İncelenmiş taslak');
  const invalid = structuredClone(backup);
  invalid.assistantDrafts[0].context.province = '06';
  assert.throws(() => store.restoreArchive(invalid, '25'), /farklı ile/);
  assert.equal(store.assistant.list().length, 1);
  store.restoreArchive(
    { ...backup, version: 5, assistantDrafts: undefined },
    '25',
  );
  assert.equal(store.assistant.list().length, 0);
});

test('API üretim onayı, eski kaynak, sahte AI kökeni ve kaydedilen metni doğrular', async (t) => {
  const running = {};
  const dir = await folder(t, async () => {
      if (running.service) await running.service.close();
    }),
    ui = join(dir, 'ui');
  await mkdir(ui);
  await writeFile(join(ui, 'index.html'), 'REFIKA TEST');
  let calls = 0;
  const service = await startLocal({
    dataDir: dir,
    staticDir: ui,
    env,
    aiFetch: async () => {
      calls++;
      return Response.json({
        message: { content: JSON.stringify(mockResult) },
      });
    },
  });
  running.service = service;
  service.store.setup(setup);
  const cookie = (await fetch(service.url)).headers
    .get('set-cookie')
    .split(';')[0];
  async function post(route, input, origin = service.url) {
    const response = await fetch(service.url + '/api/assistant/' + route, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        Origin: origin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    return { status: response.status, data: await response.json() };
  }
  assert.equal(
    (await post('context', request, 'https://unrelated.example')).status,
    403,
  );
  const context = (await post('context', request)).data;
  assert.equal(
    (await post('generate', { ...request, fingerprint: context.fingerprint }))
      .status,
    400,
  );
  assert.equal(calls, 0);
  assert.equal(
    (
      await post('generate', {
        ...request,
        input: 'Değişmiş soru',
        confirmed: true,
        fingerprint: context.fingerprint,
      })
    ).status,
    400,
  );
  assert.equal(calls, 0);
  const produced = await post('generate', {
    ...request,
    confirmed: true,
    fingerprint: context.fingerprint,
  });
  assert.equal(produced.status, 200);
  assert.equal(calls, 1);
  assert.equal(
    (
      await post('drafts', {
        ...request,
        fingerprint: context.fingerprint,
        draft: 'Son metin',
        reviewed: true,
        generationToken: 'fake-token',
      })
    ).status,
    400,
  );
  const saved = await post('drafts', {
    ...request,
    fingerprint: context.fingerprint,
    draft: 'Koordinatörün düzelttiği metin',
    reviewed: true,
    generationToken: produced.data.token,
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.origin, 'ai');
  assert.equal(saved.data.generated.draft, mockResult.draft);
  assert.equal(saved.data.draft, 'Koordinatörün düzelttiği metin');
  const a = service.store.saveActivity(activity),
    input = {
      page: 'events',
      task: 'training',
      source: { type: 'activity', id: a.id },
    };
  const oldContext = (await post('context', input)).data;
  service.store.saveActivity({ ...a, title: 'Güncellenmiş eğitim' });
  assert.equal(
    (
      await post('drafts', {
        ...input,
        fingerprint: oldContext.fingerprint,
        draft: 'Eski veriyle metin',
        reviewed: true,
      })
    ).status,
    400,
  );
  assert.equal(service.store.assistant.list().length, 1);
});
