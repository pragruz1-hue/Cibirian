'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Counter from './Counter';
import { useShop } from '@/store/ShopProvider';
import { describeProduct } from '@/lib/describe';
import { sanitizeHtml } from '@/lib/sanitize';
import { relatedProducts } from '@/lib/catalog';
import type { Product } from '@/lib/types';

export function BuyBlock({ p }: { p: Product }) {
  const { addToCart, inCart, toggleFavorite, isFavorite } = useShop();
  const [qty, setQty] = useState(1);
  const fav = isFavorite(p.id);

  return (
    <div className="p-actions">
      <Counter value={qty} onChange={setQty} />
      {inCart(p.id) ? (
        <Link href="/basket" className="btn btn-accent btn-lg">Перейти в корзину ✓</Link>
      ) : (
        <button className="btn btn-primary btn-lg" onClick={() => addToCart(p.id, qty)}>
          {p.inStock ? 'В корзину' : 'Заказать'}
        </button>
      )}
      <button
        className={`btn btn-outline btn-lg${fav ? ' on' : ''}`}
        style={fav ? { borderColor: 'var(--sale)', color: 'var(--sale)' } : undefined}
        onClick={() => toggleFavorite(p.id)}
        aria-pressed={fav}
      >
        {fav ? '♥ В избранном' : '♡ В избранное'}
      </button>
    </div>
  );
}

export function Tabs({ p }: { p: Product }) {
  const [tab, setTab] = useState<'desc' | 'spec' | 'apply' | 'delivery'>('desc');
  const d = describeProduct(p);
  const related = relatedProducts(p, 4);

  return (
    <>
      <div className="tabs" role="tablist">
        <button className={tab === 'desc' ? 'on' : ''} onClick={() => setTab('desc')} role="tab" aria-selected={tab === 'desc'}>Описание</button>
        <button className={tab === 'spec' ? 'on' : ''} onClick={() => setTab('spec')} role="tab" aria-selected={tab === 'spec'}>Характеристики</button>
        <button className={tab === 'apply' ? 'on' : ''} onClick={() => setTab('apply')} role="tab" aria-selected={tab === 'apply'}>Применение</button>
        <button className={tab === 'delivery' ? 'on' : ''} onClick={() => setTab('delivery')} role="tab" aria-selected={tab === 'delivery'}>Доставка и оплата</button>
      </div>

      {tab === 'desc' && (
        <div className="prose">
          {d.fromSite ? (
            /* Описание дословно с сайта: ни сгенерированного текста, ни плашки
               «составлено по характеристикам» — они дали бы расхождение с оригиналом. */
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(p.descriptionHtml) }} />
          ) : (
            <>
              {d.paragraphs.map((t, i) => <p key={i}>{t}</p>)}
              <h3>Ключевые особенности</h3>
              <ul>
                <li>Профессиональная линейка {p.brand}{p.line ? ` ${p.line}` : ''} для салонного и домашнего применения.</li>
                {(p.purpose ?? []).map((x) => <li key={x}>Действие: {x}.</li>)}
                {p.volume ? <li>Экономичный расход, объём упаковки — {p.volume}.</li> : null}
                <li>Оригинальная продукция, поставляемая официальными дистрибьюторами.</li>
              </ul>
              <div className="notice">
                Описание составлено по характеристикам товара и типу средства. Точный состав,
                способ применения и ограничения производителя указаны на упаковке.
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'spec' && (
        <table className="spec-table">
          <tbody>
            {d.specs.map((s) => (
              <tr key={s.label}>
                <td>{s.label}</td>
                <td>{s.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'apply' && (
        <div className="prose">
          <h3>Способ применения</h3>
          {p.applicationHtml?.trim() ? (
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(p.applicationHtml) }} />
          ) : (
            <p>{d.application}</p>
          )}
          {related.length > 0 && (
            <>
              <h3>Часто покупают вместе</h3>
              <ul>
                {related.map((r) => (
                  <li key={r.id}>
                    <Link href={`/catalog/${r.category}/${r.slug}`} className="link">{r.name}</Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === 'delivery' && (
        <div className="prose">
          <h3>Доставка</h3>
          <p>
            Отправляем заказы со склада в Новосибирске. Курьерская доставка по городу — 1–2 рабочих дня,
            в другие регионы — транспортными компаниями и Почтой России. При заказе от 3 000 руб
            доставка бесплатная.
          </p>
          <h3>Оплата</h3>
          <p>
            Оплата банковской картой онлайн, наличными при получении, для юридических лиц и салонов —
            безналичный расчёт по счёту с полным пакетом документов.
          </p>
          <h3>Возврат</h3>
          <p>
            Возврат возможен в течение 14 дней при сохранении товарного вида и упаковки.
            Претензии по качеству принимаются отдельно — подробности в разделе «Услуги».
          </p>
          <div className="notice">
            Это демонстрационное приложение: заказы не передаются в реальную систему учёта
            и не оплачиваются.
          </div>
        </div>
      )}
    </>
  );
}

export function ViewedTracker({ id }: { id: number }) {
  const { markViewed } = useShop();
  useEffect(() => {
    markViewed(id);
  }, [id, markViewed]);
  return null;
}
