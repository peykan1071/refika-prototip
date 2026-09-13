'use client';
import { CalendarDays, ClipboardCheck, FileText, GraduationCap, ListChecks } from 'lucide-react';
import { dashboardSummary } from '../lib/dashboard.mjs';

const icons = {
  'Bugünkü faaliyet': CalendarDays,
  'Planlanan ziyaret': CalendarDays,
  'Planlanan etkinlik': GraduationCap,
  'Validasyon incelemesi': ClipboardCheck,
  'Gönderim öncesi kontrol': ClipboardCheck,
  'Sonucu beklenen talep': ListChecks,
  'Tamamlanan faaliyet': FileText,
};

export default function CoordinatorDashboard({ state, tasks, events, onOpen }) {
  const summary = dashboardSummary(state, tasks, events);
  return <section className="coordinator-dashboard" aria-labelledby="daily-work-title">
    <div className="dashboard-heading">
      <div><span className="eyebrow">FAALİYET PLANI VE GÜNLÜK DURUM</span><h2 id="daily-work-title">Bugün neye odaklanmalıyım?</h2></div>
      <button className="secondary" onClick={() => onOpen('Raporlar ve Yazışmalar')}>Faaliyet özetini aç</button>
    </div>
    <div className="metric-grid">
      {summary.metrics.map(metric => { const Icon = icons[metric.label]; return <button key={metric.label} className="metric-card" onClick={() => onOpen(metric.target)}>
        <Icon aria-hidden="true"/><span><strong>{metric.value}</strong><small>{metric.label}</small></span>
      </button>; })}
    </div>
    <div className="priority-panel">
      <div className="priority-heading"><h3>Öncelikli işler</h3><span>{summary.actions.length} açık iş</span></div>
      {!summary.actions.length ? <div className="dashboard-empty"><strong>Açık iş görünmüyor.</strong><p>Yeni bir ziyaret veya etkinlik planlayabilir ya da validasyon kayıtlarını inceleyebilirsiniz.</p><div className="actions"><button className="primary" onClick={() => onOpen('Eğitim ve Etkinlikler')}>Etkinlik planla</button><button className="secondary" onClick={() => onOpen('Kayıt ve Validasyon')}>Validasyonları aç</button></div></div> :
        <ul className="priority-list">{summary.actions.map(action => <li key={action.id}>
          <span className={`priority-mark ${action.tone}`} aria-hidden="true"/>
          <div><small>{action.label}</small><strong>{action.title}</strong><p>{action.detail}</p></div>
          <button className="secondary" onClick={() => onOpen(action.target)}>{action.button}</button>
        </li>)}</ul>}
    </div>
  </section>;
}
