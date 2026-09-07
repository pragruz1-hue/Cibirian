'use client';

import { useMemo, useState } from 'react';
import ProductCard, { ProductRow } from './ProductCard';
import Pagination from './Pagination';
import { useShop } from '@/store/ShopProvider';
import { applyFilters, buildFacets, paginate, sortOptions, PER_PAGE } from '@/lib/catalog';
import { formatPrice, productsWord } from '@/lib/format';
import { EMPTY_FILTERS, type FilterState, type Product } from '@/lib/types';

interface FacetGroupProps {
  title: string;
  options: { value: string; count: number }[];
  selected: string[];
  onToggle: (v: string) => void;
  defaultOpen?: boolean;
  limit?: number;
}

function FacetGroup({ title, options, selected, onToggle, defaultOpen = false, limit = 12 }: FacetGroupProps) {
  const [open, setOpen] = useState(defaultOpen || selected.length > 0);
  const [showAll, setShowAll] = useState(false);
  if (!options.length) return null;
  const visible = showAll ? options : options.slice(0, limit);

  return (
    <div className={`fgroup${open ? ' open' : ''}`}>
      <button className="fgroup-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{title}</span>
        <span className="chev">▾</span>
      </button>
      {open && (
        <div className="fgroup-body">
          {visible.map((o) => {
            const on = selected.includes(o.value);
            return (
              <label key={o.value} className={`check${on ? ' on' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => onToggle(o.value)} />
                <span>{o.value}</span>
                <span className="n">{o.count}</span>
              </label>
            );
          })}
          {options.length > limit && (
            <button className="link" style={{ background: 'none', border: 'none', padding: '4px 0 0', fontSize: 12.5, textAlign: 'left' }} onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Свернуть' : `Показать все (${options.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function CatalogBrowser({
  items,
  totalLabel,
}: {
  items: Product[];
  totalLabel?: string;
}) {
  const [f, setF] = useState<FilterState>(EMPTY_FILTERS);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { notify } = useShop();

  const facets = useMemo(() => buildFacets(items), [items]);
  const filtered = useMemo(() => applyFilters(items, f), [items, f]);
  const { items: pageItems, pages, total } = useMemo(
    () => paginate(filtered, f.page, PER_PAGE),
    [filtered, f.page],
  );

  const patch = (p: Partial<FilterState>) => setF((s) => ({ ...s, ...p, page: 1 }));
  const set = (p: Partial<FilterState>) => setF((s) => ({ ...s, ...p }));
  const reset = () => {
    setF(EMPTY_FILTERS);
    notify('Фильтры сброшены', 'info');
  };

  const applied: { label: string; clear: () => void }[] = [];
  if (f.q) applied.push({ label: `Поиск: ${f.q}`, clear: () => patch({ q: '' }) });
  f.brands.forEach((b) => applied.push({ label: b, clear: () => patch({ brands: toggle(f.brands, b) }) }));
  f.volumes.forEach((v) => applied.push({ label: v, clear: () => patch({ volumes: toggle(f.volumes, v) }) }));
  f.purposes.forEach((v) => applied.push({ label: v, clear: () => patch({ purposes: toggle(f.purposes, v) }) }));
  f.hairTypes.forEach((v) => applied.push({ label: v, clear: () => patch({ hairTypes: toggle(f.hairTypes, v) }) }));
  if (f.inStockOnly) applied.push({ label: 'В наличии', clear: () => patch({ inStockOnly: false }) });
  if (f.hit) applied.push({ label: 'Хит', clear: () => patch({ hit: false }) });
  if (f.sale) applied.push({ label: 'Акция', clear: () => patch({ sale: false }) });
  if (f.recommend) applied.push({ label: 'Советуем', clear: () => patch({ recommend: false }) });
  if (f.priceFrom !== null || f.priceTo !== null)
    applied.push({
      label: `${f.priceFrom ?? facets.priceMin}–${f.priceTo ?? facets.priceMax} руб`,
      clear: () => patch({ priceFrom: null, priceTo: null }),
    });

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-outline btn-sm filter-fab" onClick={() => setFiltersOpen(!filtersOpen)}>
          ☰ Фильтр {applied.length ? `· ${applied.length}` : ''}
        </button>

        <span className="toolbar-label">{totalLabel ?? productsWord(total)}</span>

        <label className="toolbar-label" htmlFor="sort" style={{ marginLeft: 'auto' }}>Сортировка:</label>
        <select
          id="sort"
          className="select"
          value={f.sort}
          onChange={(e) => set({ sort: e.target.value })}
        >
          {sortOptions.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>

        <div className="view-toggle">
          <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} title="Плиткой" aria-label="Плиткой">▦</button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} title="Списком" aria-label="Списком">☰</button>
        </div>
      </div>

      {applied.length > 0 && (
        <div className="applied">
          {applied.map((a, i) => (
            <span className="applied-tag" key={i}>
              {a.label}
              <button onClick={a.clear} aria-label={`Убрать ${a.label}`}>✕</button>
            </span>
          ))}
          <button className="applied-tag" style={{ background: 'none', border: 'none', color: 'var(--brand)' }} onClick={reset}>
            Очистить всё
          </button>
        </div>
      )}

      <div className="catalog-layout">
        <aside className={`filters${filtersOpen ? ' open' : ''}`} aria-label="Фильтры товаров">
          <div className="filters-head">
            <span>Фильтр</span>
            {applied.length ? <button onClick={reset}>Сбросить ({applied.length})</button> : null}
          </div>

          <div className="fgroup open">
            <div className="fgroup-head" style={{ cursor: 'default' }}>
              <span>Цена, руб</span>
            </div>
            <div className="fgroup-body">
              <div className="price-inputs">
                <input
                  type="number"
                  placeholder={String(facets.priceMin)}
                  value={f.priceFrom ?? ''}
                  min={facets.priceMin}
                  max={facets.priceMax}
                  onChange={(e) => patch({ priceFrom: e.target.value ? Number(e.target.value) : null })}
                  aria-label="Цена от"
                />
                <span style={{ color: 'var(--ink-3)' }}>—</span>
                <input
                  type="number"
                  placeholder={String(facets.priceMax)}
                  value={f.priceTo ?? ''}
                  min={facets.priceMin}
                  max={facets.priceMax}
                  onChange={(e) => patch({ priceTo: e.target.value ? Number(e.target.value) : null })}
                  aria-label="Цена до"
                />
              </div>
              <input
                className="range"
                type="range"
                min={facets.priceMin}
                max={facets.priceMax}
                value={f.priceTo ?? facets.priceMax}
                onChange={(e) => patch({ priceTo: Number(e.target.value) })}
                aria-label="Максимальная цена"
              />
              <div className="range-scale">
                <span>{formatPrice(facets.priceMin)}</span>
                <span>{formatPrice(facets.priceMax)}</span>
              </div>
            </div>
          </div>

          <div className="fgroup open">
            <div className="fgroup-head" style={{ cursor: 'default' }}>
              <span>Отметки</span>
            </div>
            <div className="fgroup-body">
              <div className="badge-row">
                <button className={`chip hit${f.hit ? ' on hit' : ''}`} onClick={() => patch({ hit: !f.hit })}>
                  Хит · {facets.counts.hit}
                </button>
                <button className={`chip${f.sale ? ' on sale' : ''}`} onClick={() => patch({ sale: !f.sale })}>
                  Акция · {facets.counts.sale}
                </button>
                <button className={`chip${f.recommend ? ' on' : ''}`} onClick={() => patch({ recommend: !f.recommend })}>
                  Советуем · {facets.counts.recommend}
                </button>
              </div>
              <label className={`check${f.inStockOnly ? ' on' : ''}`}>
                <input type="checkbox" checked={f.inStockOnly} onChange={() => patch({ inStockOnly: !f.inStockOnly })} />
                <span>Только в наличии</span>
                <span className="n">{facets.counts.inStock}</span>
              </label>
            </div>
          </div>

          <FacetGroup title="Бренд" options={facets.brands} selected={f.brands} onToggle={(v) => patch({ brands: toggle(f.brands, v) })} defaultOpen limit={14} />
          <FacetGroup title="Назначение" options={facets.purposes} selected={f.purposes} onToggle={(v) => patch({ purposes: toggle(f.purposes, v) })} />
          <FacetGroup title="Тип волос" options={facets.hairTypes} selected={f.hairTypes} onToggle={(v) => patch({ hairTypes: toggle(f.hairTypes, v) })} />
          <FacetGroup title="Объём" options={facets.volumes} selected={f.volumes} onToggle={(v) => patch({ volumes: toggle(f.volumes, v) })} limit={16} />

          <div className="filters-foot">
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              Найдено: <b style={{ color: 'var(--ink)' }}>{productsWord(filtered.length)}</b>
            </div>
            <button className="btn btn-primary btn-block btn-sm" onClick={() => setFiltersOpen(false)}>
              Показать
            </button>
            <button className="btn btn-outline btn-block btn-sm" onClick={reset}>
              Очистить фильтр
            </button>
          </div>
        </aside>

        <div>
          {pageItems.length === 0 ? (
            <div className="empty" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12 }}>
              <span className="ico">🔍</span>
              <h3>Ничего не найдено</h3>
              <p>Под выбранные условия не подошёл ни один товар. Попробуйте ослабить фильтры или сбросить их.</p>
              <button className="btn btn-primary" onClick={reset}>Очистить фильтр</button>
            </div>
          ) : view === 'grid' ? (
            <div className="prod-grid">
              {pageItems.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          ) : (
            <div className="list-view">
              {pageItems.map((p) => <ProductRow key={p.id} p={p} />)}
            </div>
          )}

          <Pagination page={f.page} pages={pages} onChange={(page) => { set({ page }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </div>
      </div>
    </>
  );
}
