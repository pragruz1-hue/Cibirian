'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import CatalogBrowser from '@/components/CatalogBrowser';
import { products, searchProducts } from '@/lib/catalog';
import { productsWord } from '@/lib/format';

function SearchInner() {
  const sp = useSearchParams();
  const initial = sp.get('q') ?? '';
  const [q, setQ] = useState(initial);

  const results = useMemo(() => searchProducts(q, 500), [q]);
  const brands = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of results) m.set(p.brand, (m.get(p.brand) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [results]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.set('q', q);
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="container page-shell">
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Поиск', href: '/search' }]} />

      <div className="catalog-head">
        <h1>Поиск по каталогу</h1>
        <span className="catalog-count">{productsWord(results.length)}</span>
      </div>

      <form onSubmit={submit} style={{ margin: '16px 0 20px', maxWidth: 640 }}>
        <div className="search-form">
          <input
            className="search-input"
            placeholder="Бренд, тип средства, объём, назначение…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Поисковый запрос"
          />
          <button className="search-btn" type="submit">Найти</button>
        </div>
      </form>

      {!q.trim() ? (
        <div className="card-panel">
          <div className="prose">
            <h3>Что можно искать</h3>
            <p>
              Поиск учитывает название товара, бренд, линейку, объём и назначение. Например:
            </p>
            <div className="badge-row" style={{ marginTop: 12 }}>
              {['OLLIN', 'TEFIA', 'шампунь', 'термозащита', 'краска', '1000 мл', 'KAARAL', 'объем'].map((s) => (
                <button key={s} className="chip" type="button" onClick={() => setQ(s)}>{s}</button>
              ))}
            </div>
            <p style={{ marginTop: 18, color: 'var(--ink-3)', fontSize: 13.5 }}>
              Всего в локальном каталоге {productsWord(products.length)}. Полный ассортимент
              исходного сайта значительно больше — эта сборка работает на выгрузке части карточек.
            </p>
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="empty" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12 }}>
          <span className="ico">🔍</span>
          <h3>По запросу «{q}» ничего не найдено</h3>
          <p>Попробуйте более короткий запрос или выберите раздел каталога.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/catalog" className="btn btn-primary">В каталог</Link>
            <button className="btn btn-outline" onClick={() => setQ('')}>Очистить запрос</button>
          </div>
        </div>
      ) : (
        <>
          {brands.length > 1 && (
            <div className="badge-row" style={{ marginBottom: 16 }}>
              {brands.map(([b, n]) => (
                <button key={b} className="chip" type="button" onClick={() => setQ(b)}>
                  {b} · {n}
                </button>
              ))}
            </div>
          )}
          <CatalogBrowser items={results} />
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container page-shell">Загрузка поиска…</div>}>
      <SearchInner />
    </Suspense>
  );
}
