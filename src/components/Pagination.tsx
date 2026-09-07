'use client';

interface PaginationProps {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}

function range(page: number, pages: number): (number | 'dots')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | 'dots')[] = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(pages - 1, page + 1);
  if (from > 2) out.push('dots');
  for (let i = from; i <= to; i++) out.push(i);
  if (to < pages - 1) out.push('dots');
  out.push(pages);
  return out;
}

export default function Pagination({ page, pages, onChange }: PaginationProps) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Страницы каталога">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Назад">
        ‹
      </button>
      {range(page, pages).map((x, i) =>
        x === 'dots' ? (
          <span className="dots" key={`d${i}`}>…</span>
        ) : x === page ? (
          <span className="cur" key={x} aria-current="page">{x}</span>
        ) : (
          <button key={x} onClick={() => onChange(x)}>{x}</button>
        ),
      )}
      <button onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Вперёд">
        ›
      </button>
    </nav>
  );
}
