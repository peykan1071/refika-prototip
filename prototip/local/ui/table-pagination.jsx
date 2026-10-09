import { useState } from 'react';
import { sortTableRows } from './table-order.mjs';
import './table-pagination.css';

export function useTablePage(rows, filterKey, order = 'added') {
  const pageKey = JSON.stringify([filterKey, order]);
  const [position, setPosition] = useState({ key: pageKey, page: 1 });
  if (position.key !== pageKey) setPosition({ key: pageKey, page: 1 });
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / 10));
  const page = Math.min(position.key === pageKey ? position.page : 1, pages);
  const offset = (page - 1) * 10;
  return {
    rows: sortTableRows(rows, order).slice(offset, offset + 10),
    total,
    page,
    pages,
    from: total ? offset + 1 : 0,
    to: Math.min(offset + 10, total),
    setPage: (next) => setPosition({ key: pageKey, page: next }),
  };
}

export function TableOrder({ value, onChange, label = 'Sıralama' }) {
  return (
    <label className="table-order">
      {label}{' '}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="alphabetical">Alfabetik (A–Z)</option>
        <option value="added">Eklenme tarihi (en yeni önce)</option>
      </select>
    </label>
  );
}

export function TablePagination({ pagination: p, label }) {
  const numbers = [...new Set([1, p.page - 1, p.page, p.page + 1, p.pages])]
    .filter((n) => n >= 1 && n <= p.pages)
    .sort((a, b) => a - b);
  return (
    <div className="table-pagination">
      <output aria-label={`${label} kayıt sayısı`}>
        {p.total
          ? `${p.total} kayıttan ${p.from}–${p.to} arasındaki kayıtlar gösteriliyor`
          : 'Toplam 0 kayıt. Gösterilecek kayıt bulunamadı.'}
      </output>
      {p.pages > 1 && (
        <nav aria-label={`${label} sayfaları`}>
          <button
            type="button"
            disabled={p.page === 1}
            onClick={() => p.setPage(p.page - 1)}
          >
            Önceki
          </button>
          {numbers.map((number, index) => (
            <span className="table-page-option" key={number}>
              {index > 0 && number - numbers[index - 1] > 1 && (
                <span aria-hidden="true">…</span>
              )}
              <button
                type="button"
                aria-label={`${number}. sayfa`}
                aria-current={p.page === number ? 'page' : undefined}
                onClick={() => p.setPage(number)}
              >
                {number}
              </button>
            </span>
          ))}
          <button
            type="button"
            disabled={p.page === p.pages}
            onClick={() => p.setPage(p.page + 1)}
          >
            Sonraki
          </button>
        </nav>
      )}
    </div>
  );
}
