'use client';

import Link from 'next/link';
import { useState } from 'react';
import Img from './Img';
import { Rating } from './Rating';
import { useShop } from '@/store/ShopProvider';
import { formatPrice } from '@/lib/format';
import { productUrl } from '@/lib/catalog';
import type { Product } from '@/lib/types';

export function Badges({ p, small }: { p: Product; small?: boolean }) {
  return (
    <div className="card-badges">
      {p.hit && <span className="badge badge-hit">Хит</span>}
      {p.recommend && <span className="badge badge-rec">Советуем</span>}
      {(p.sale || p.oldPrice) && (
        <span className="badge badge-sale">
          {p.oldPrice ? `−${Math.round((1 - p.price / p.oldPrice) * 100)}%` : 'Акция'}
        </span>
      )}
      {!p.inStock && <span className="badge badge-new" style={{ background: '#8b9998' }}>Под заказ</span>}
      {small ? null : null}
    </div>
  );
}

export default function ProductCard({ p, compact }: { p: Product; compact?: boolean }) {
  const { addToCart, toggleFavorite, isFavorite, inCart, setQuickView } = useShop();
  const [added, setAdded] = useState(false);
  const href = productUrl(p);
  const fav = isFavorite(p.id);

  const onAdd = () => {
    addToCart(p.id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <article className={`card${compact ? ' compact' : ''}`}>
      <div className="card-media">
        <Badges p={p} />
        <button
          className={`card-fav${fav ? ' on' : ''}`}
          onClick={() => toggleFavorite(p.id)}
          aria-label={fav ? 'Убрать из избранного' : 'В избранное'}
          title={fav ? 'В избранном' : 'Добавить в избранное'}
        >
          {fav ? '♥' : '♡'}
        </button>
        <Link href={href} aria-label={p.name}>
          <Img src={p.images[0]} alt={p.name} fallbackLabel={p.brand} />
        </Link>
        <button className="card-quick" onClick={() => setQuickView(p)}>
          Быстрый просмотр
        </button>
      </div>

      <div className="card-body">
        <div className="card-brand">{p.brand}</div>
        <Link href={href} className="card-title">
          {p.name}
        </Link>
        <Rating id={p.id} />

        <div className="card-price">
          <span className={`price-now${p.oldPrice ? ' sale' : ''}`}>{formatPrice(p.price)}</span>
          {p.oldPrice ? <span className="price-old">{formatPrice(p.oldPrice)}</span> : null}
        </div>

        <div className={`card-stock${p.inStock ? '' : ' out'}`}>
          <span>{p.inStock ? '●' : '○'}</span>
          {p.inStock ? 'Есть в наличии' : 'Нет в наличии'}
        </div>

        <div className="card-actions">
          {inCart(p.id) ? (
            <Link href="/basket" className="btn btn-outline btn-sm">
              В корзине ✓
            </Link>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={onAdd} disabled={added}>
              {added ? 'Добавлено ✓' : p.inStock ? 'В корзину' : 'Заказать'}
            </button>
          )}
          <Link href={href} className="btn btn-outline btn-sm" style={{ flex: '0 0 auto' }}>
            Подробнее
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ProductRow({ p }: { p: Product }) {
  const { addToCart, toggleFavorite, isFavorite, inCart } = useShop();
  const href = productUrl(p);
  const fav = isFavorite(p.id);

  return (
    <article className="list-row">
      <Link href={href}>
        <Img src={p.images[0]} alt={p.name} fallbackLabel={p.brand} width={96} height={96} />
      </Link>
      <div className="list-row-info">
        <div className="card-brand" style={{ marginBottom: 4 }}>{p.brand}</div>
        <Link href={href}>
          <h3>{p.name}</h3>
        </Link>
        <div className="list-meta">
          <span className={`card-stock${p.inStock ? '' : ' out'}`}>
            <span>{p.inStock ? '●' : '○'}</span> {p.inStock ? 'Есть в наличии' : 'Нет в наличии'}
          </span>
          {p.volume ? <span>Объём: {p.volume}</span> : null}
          <Rating id={p.id} />
          <span style={{ display: 'flex', gap: 5 }}>
            {p.hit && <span className="badge badge-hit">Хит</span>}
            {p.recommend && <span className="badge badge-rec">Советуем</span>}
            {(p.sale || p.oldPrice) && <span className="badge badge-sale">Акция</span>}
          </span>
        </div>
      </div>
      <div className="list-right">
        <div className="card-price" style={{ justifyContent: 'flex-end' }}>
          <span className={`price-now${p.oldPrice ? ' sale' : ''}`}>{formatPrice(p.price)}</span>
          {p.oldPrice ? <span className="price-old">{formatPrice(p.oldPrice)}</span> : null}
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button
            className={`card-fav${fav ? ' on' : ''}`}
            style={{ position: 'static' }}
            onClick={() => toggleFavorite(p.id)}
            aria-label="В избранное"
          >
            {fav ? '♥' : '♡'}
          </button>
          {inCart(p.id) ? (
            <Link href="/basket" className="btn btn-outline btn-sm">В корзине ✓</Link>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => addToCart(p.id, 1)}>
              {p.inStock ? 'В корзину' : 'Заказать'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
