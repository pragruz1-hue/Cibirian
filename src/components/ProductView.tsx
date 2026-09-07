import Link from 'next/link';
import Breadcrumbs from './Breadcrumbs';
import Gallery from './Gallery';
import ProductCard from './ProductCard';
import { BuyBlock, Tabs, ViewedTracker } from './ProductActions';
import { Rating } from './Rating';
import {
  productBreadcrumbs,
  getCategory,
  relatedProducts,
  categoryProducts,
} from '@/lib/catalog';
import { describeProduct } from '@/lib/describe';
import { formatPrice, seededShows } from '@/lib/format';
import type { Product } from '@/lib/types';

export default function ProductView({ product: p }: { product: Product }) {
  const crumbs = productBreadcrumbs(p);
  const d = describeProduct(p);
  const cat = getCategory(p.category);
  const related = relatedProducts(p, 5);
  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    brand: { '@type': 'Brand', name: p.brand },
    image: p.images,
    description: d.short,
    sku: `SBC-${String(p.id).padStart(6, '0')}`,
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'RUB',
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="container">
      <ViewedTracker id={p.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Breadcrumbs items={crumbs} />

      <div className="product-page">
        <Gallery images={p.images} name={p.name} brand={p.brand} />

        <div>
          <div className="p-badges">
            {p.hit && <span className="badge badge-hit">Хит</span>}
            {p.recommend && <span className="badge badge-rec">Советуем</span>}
            {(p.sale || p.oldPrice) && <span className="badge badge-sale">{discount ? `−${discount}%` : 'Акция'}</span>}
          </div>

          <div className="p-brand">
            {p.brand}
            {p.line ? ` · ${p.line}` : ''}
          </div>

          <h1 className="p-title">{p.name}</h1>

          <div className="p-rating">
            <Rating id={p.id} />
            <span>·</span>
            <span>Код товара: SBC-{String(p.id).padStart(6, '0')}</span>
            <span>·</span>
            <span>{seededShows(p.id)} просмотров</span>
          </div>

          <div className="p-buy">
            <div className="p-price-row">
              <span className={`p-price${p.oldPrice ? ' sale' : ''}`}>{formatPrice(p.price)}</span>
              {p.oldPrice ? (
                <>
                  <span className="p-old">{formatPrice(p.oldPrice)}</span>
                  <span className="p-discount">Выгода {formatPrice(p.oldPrice - p.price)}</span>
                </>
              ) : null}
            </div>

            <div className={`p-stock${p.inStock ? '' : ' out'}`}>
              <span>{p.inStock ? '●' : '○'}</span>
              {p.inStock ? 'Есть в наличии' : 'Нет в наличии — можно заказать'}
              {p.volume ? <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>· объём {p.volume}</span> : null}
            </div>

            <BuyBlock p={p} />

            <div className="p-features">
              <div className="p-feature"><span className="ico">🚚</span><span>Доставка от 3 000 руб — бесплатно</span></div>
              <div className="p-feature"><span className="ico">✅</span><span>Оригинальная продукция</span></div>
              <div className="p-feature"><span className="ico">↩️</span><span>Возврат в течение 14 дней</span></div>
              <div className="p-feature"><span className="ico">💬</span><span>Консультация технолога</span></div>
            </div>
          </div>

          <Tabs p={p} />
        </div>
      </div>

      {cat ? (
        <div style={{ marginBottom: 26 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            Раздел:{' '}
            <Link href={`/catalog/${cat.path}`} className="link">{cat.name}</Link>
            {' · '}
            <Link href={`/catalog/${cat.path}`} className="link">
              все товары раздела ({categoryProducts(cat.path).length})
            </Link>
          </span>
        </div>
      ) : null}

      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>С этим товаром покупают</h2>
            <span className="rule" />
          </div>
          <div className="prod-grid">
            {related.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
