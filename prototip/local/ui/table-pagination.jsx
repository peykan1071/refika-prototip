import { useState } from 'react';
import './table-pagination.css';

export function useTablePage(rows, filterKey) {
  const [position, setPosition] = useState({ key: filterKey, page: 1 });
  if (position.key !== filterKey) setPosition({ key: filterKey, page: 1 });
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / 10));
  const page = Math.min(position.key === filterKey ? position.page : 1, pages);
  const offset = (page - 1) * 10;
  return {
    rows: rows.slice(offset, offset + 10),
    total,
    page,
    pages,
    from: total ? offset + 1 : 0,
    to: Math.min(offset + 10, total),
    setPage: (next) => setPosition({ key: filterKey, page: next }),
  };
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
