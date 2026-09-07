import Link from 'next/link';
import Img from './Img';
import Breadcrumbs from './Breadcrumbs';
import CatalogBrowser from './CatalogBrowser';
import {
  categoryBreadcrumbs,
  categoryProducts,
  childCategories,
  type CategoryNode,
} from '@/lib/catalog';
import { productsWord } from '@/lib/format';

export default function CategoryView({ category }: { category: CategoryNode }) {
  const items = categoryProducts(category.path);
  const subs = childCategories(category.path);
  const crumbs = categoryBreadcrumbs(category.path);

  return (
    <div className="container">
      <Breadcrumbs items={crumbs} />

      <div className="catalog-head">
        <h1>{category.name}</h1>
        <span className="catalog-count">
          {items.length > 0
            ? productsWord(items.length)
            : category.count
              ? `${category.count} товаров на сайте`
              : ''}
        </span>
      </div>

      {subs.length > 0 && (
        <div className="sub-list" style={{ margin: '14px 0 6px' }}>
          {subs.map((s) => {
            const n = categoryProducts(s.path).length;
            return (
              <Link key={s.path} href={`/catalog/${s.path}`} className="sub-link">
                {s.image ? <Img src={s.image} alt="" fallbackLabel={s.name} width={30} height={30} /> : null}
                <span>
                  {s.name}
                  {n ? <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 400 }}>{productsWord(n)}</span> : null}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {items.length > 0 ? (
        <CatalogBrowser items={items} />
      ) : (
        <div className="empty" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, marginTop: 18 }}>
          <span className="ico">📦</span>
          <h3>В этом разделе пока нет товаров в демо-наборе</h3>
          <p>
            Раздел «{category.name}» присутствует в структуре каталога. Товары этого раздела
            не вошли в локальную выборку данных.
          </p>
          <Link href="/catalog" className="btn btn-primary">Вернуться в каталог</Link>
        </div>
      )}
    </div>
  );
}
