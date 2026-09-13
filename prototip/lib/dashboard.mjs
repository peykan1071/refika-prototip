export function dashboardSummary(state, tasks, events = [], today = new Date().toISOString().slice(0, 10)) {
  const queued = state.records.filter(record => record.queued);
  const awaitingReview = queued.filter(record => !record.reviewed || record.issue).length;
  const unresolvedResults = state.packets.reduce(
    (total, packet) => total + packet.ids.filter(id => !packet.results[id]).length,
    0,
  );
  const plannedVisits = tasks.filter(task => task.status === 'planned');
  const plannedEvents = events.filter(event => event.status === 'planned');
  const completedActivities =
    tasks.filter(task => task.status === 'completed').length +
    events.filter(event => event.status === 'completed').length +
    state.packets.reduce((total, packet) => total + Object.keys(packet.results).length, 0);
  const todayVisits = plannedVisits.filter(task => task.date === today);
  const todayEvents = plannedEvents.filter(event => event.date === today);

  const actions = [];
  if (state.stage === 'approval') {
    actions.push({
      id: 'approval',
      tone: 'attention',
      label: 'Onay bekliyor',
      title: `${state.packet?.count || 0} taleplik validasyon paketi`,
      detail: 'Alıcı, ekler ve paylaşılacak örnek veriler incelenmeli.',
      target: 'Onay Merkezi',
      button: 'Listeyi ve e-postayı incele',
    });
  } else if (state.stage === 'draft') {
    actions.push({
      id: 'draft',
      tone: 'attention',
      label: 'Taslak hazır',
      title: `${state.packet?.count || 0} taleplik merkez listesi`,
      detail: 'Taslak koordinatör incelemesinden sonra onaya sunulabilir.',
      target: 'Taslaklar',
      button: 'Taslağı aç',
    });
  }
  if (awaitingReview) {
    actions.push({
      id: 'review', tone: 'attention', label: 'İnceleme',
      title: `${awaitingReview} validasyon kaydı bilgi bekliyor`,
      detail: 'Eksik okul veya kontrol bilgilerini tamamlayın.',
      target: 'Kayıt ve Validasyon', button: 'Kayıtları aç',
    });
  }
  if (unresolvedResults) {
    actions.push({
      id: 'results', tone: 'neutral', label: 'Sonuç bekleniyor',
      title: `${unresolvedResults} gönderim talebinin sonucu açık`,
      detail: 'Merkezden gelen sonucu ilgili gönderim kaydına ekleyin.',
      target: 'Sonuç Takibi', button: 'Sonuçlara git',
    });
  }
  for (const task of [...plannedVisits].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)) {
    actions.push({
      id: `visit-${task.id}`, tone: task.date < today ? 'attention' : 'neutral',
      label: task.date === today ? 'Bugün' : task.date < today ? 'Tarihi geçti' : 'Yaklaşan ziyaret',
      title: task.title, detail: `${task.school}${task.district ? ` · ${task.district}` : ''} · ${formatDate(task.date)}`,
      target: 'Okul Ziyaretleri', button: 'Ziyareti aç',
    });
  }
  for (const event of [...plannedEvents].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)) {
    actions.push({
      id: `event-${event.id}`, tone: event.date < today ? 'attention' : 'neutral',
      label: event.date === today ? 'Bugün' : event.date < today ? 'Tarihi geçti' : 'Yaklaşan etkinlik',
      title: event.title, detail: `${event.kind} · ${event.audience} · ${formatDate(event.date)}`,
      target: 'Eğitim ve Etkinlikler', button: 'Etkinliği aç',
    });
  }
  const completedForOutput = [...tasks, ...events].filter(item => item.status === 'completed').sort((a,b)=>b.date.localeCompare(a.date));
  if (completedForOutput.length) {
    actions.push({
      id: 'activity-outputs', tone: 'attention', label: 'Faaliyet sonrası',
      title: `${completedForOutput.length} faaliyet için rapor ve haber taslağı`,
      detail: 'Sonuç ve kanıt bilgilerini kontrol ederek rapor ve haber çıktısını hazırlayın.',
      target: 'Raporlar ve Yazışmalar', button: 'Rapor ve haberi hazırla',
    });
  }

  return {
    metrics: [
      { label: 'Bugünkü faaliyet', value: todayVisits.length + todayEvents.length, target: 'Takvimim' },
      { label: 'Planlanan ziyaret', value: plannedVisits.length, target: 'Okul Ziyaretleri' },
      { label: 'Planlanan etkinlik', value: plannedEvents.length, target: 'Eğitim ve Etkinlikler' },
      { label: 'Validasyon incelemesi', value: awaitingReview, target: 'Kayıt ve Validasyon' },
      { label: 'Gönderim öncesi kontrol', value: state.stage === 'approval' ? 1 : 0, target: 'Onay Merkezi' },
      { label: 'Sonucu beklenen talep', value: unresolvedResults, target: 'Sonuç Takibi' },
      { label: 'Tamamlanan faaliyet', value: completedActivities, target: 'Raporlar ve Yazışmalar' },
    ],
    actions,
  };
}

function formatDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}
