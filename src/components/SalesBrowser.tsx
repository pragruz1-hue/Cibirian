'use client';

import { useState } from 'react';
import CatalogBrowser from './CatalogBrowser';
import type { Product } from '@/lib/types';

interface Group {
  id: string;
  title: string;
  items: Product[];
}

/** Переключатель подборок на странице акций + общий браузер каталога. */
export default function SalesBrowser({ groups }: { groups: Group[] }) {
  const available = groups.filter((g) => g.items.length > 0);
  const [active, setActive] = useState(available[0]?.id ?? '');
  const current = available.find((g) => g.id === active) ?? available[0];

  if (!current) return null;

  return (
    <>
      <div className="tabs">
        {available.map((g) => (
          <button key={g.id} className={g.id === current.id ? 'on' : ''} onClick={() => setActive(g.id)}>
            {g.title} <span style={{ opacity: 0.6, fontWeight: 400 }}>· {g.items.length}</span>
          </button>
        ))}
      </div>
      <CatalogBrowser items={current.items} />
    </>
  );
}
