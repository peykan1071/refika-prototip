'use client';
import { useState } from 'react';
export default function ResultTracker({ state, dispatch }) {
  const [notes, setNotes] = useState({});
  return <section className="card detail-card"><h2>Sonuç takibi</h2>
    {!state.packets.length && <p>Önce koordinatör onayıyla deneme gönderimini tamamlayın.</p>}
    {[...state.packets].reverse().map(packet => <article key={packet.id}>
      <h3>{packet.id} · {new Date(packet.sentAt).toLocaleString('tr-TR')}</h3>
      <p>{packet.ids.filter(id => packet.results[id]).length} / {packet.count} talebin sonucu kaydedildi</p>
      {packet.ids.map(id => { const key = `${packet.id}/${id}`; const record = state.records.find(r => r.id === id); return <div key={id}>
        <h4>{id} · {record?.name}</h4>
        {packet.results[id] ? <p>{packet.results[id].note}</p> : <form onSubmit={e => { e.preventDefault(); if (dispatch({ type: 'result', packetId: packet.id, recordId: id, result: notes[key] })) setNotes({ ...notes, [key]: '' }); }}>
          <label className="field">{packet.id} / {id} sonuç notu<textarea required rows={2} value={notes[key] || ''} onChange={e => setNotes({ ...notes, [key]: e.target.value })} /></label>
          <button className="primary">Sonucu kaydet</button>
        </form>}
      </div>; })}
    </article>)}
  </section>;
}
