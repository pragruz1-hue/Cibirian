import type { Metadata } from 'next';
import Link from 'next/link';
import Img from '@/components/Img';
import Breadcrumbs from '@/components/Breadcrumbs';
import { rootCategories, categoryProducts } from '@/lib/catalog';
import { productsWord } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Каталог профессиональной косметики заказать c доставкой',
  description:
    'Полный каталог профессиональной косметики: средства для волос, окрашивание, стайлинг, ' +
    'косметика для лица, тела, рук и ног, подарочные наборы, аксессуары и электроприборы.',
};

export default function CatalogRootPage() {
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Каталог', href: '/catalog' }]} />

      <div className="catalog-head">
        <h1>Каталог</h1>
        <span className="catalog-count">{rootCategories.length} разделов</span>
      </div>

      <div className="cat-grid" style={{ marginTop: 18 }}>
        {rootCategories.map((c) => {
          const count = categoryProducts(c.slug).length;
          return (
            <Link key={c.slug} href={`/catalog/${c.slug}`} className="cat-tile" style={{ minHeight: 108 }}>
              <Img src={c.image} alt={c.name} fallbackLabel={c.name} />
              <span>
                <span className="cat-tile-name">{c.name}</span>
                <span className="cat-tile-count">
                  {count > 0 ? productsWord(count) : c.count ? `${c.count} товаров на сайте` : 'Перейти в раздел'}
                </span>
              </span>
              <span className="chev">›</span>
            </Link>
          );
        })}
      </div>

      <div className="section">
        <div className="card-panel">
          <div className="prose">
            <h3>Каталог профессиональной косметики</h3>
            <p>
              Каталог разбит на разделы по назначению: профессиональная косметика для волос,
              средства для лица, тела, рук и ног, подарочные наборы, аксессуары для мастеров
              и электроприборы. Внутри каждого раздела товары сгруппированы по типу средства —
              так быстрее найти нужное.
            </p>
            <p>
              В карточке товара указаны бренд, линейка, объём, цена и наличие на складе выбранного
              города. Фильтр в разделе позволяет отобрать товары по бренду, назначению, типу волос,
              объёму и цене, а также показать только хиты, акционные позиции или то, что есть в наличии.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
