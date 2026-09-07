import type { Metadata } from 'next';
import Link from 'next/link';
import Img from '@/components/Img';
import Breadcrumbs from '@/components/Breadcrumbs';
import { rootCategories, childCategories, categoryProducts } from '@/lib/catalog';
import { productsWord } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Обзоры разделов каталога',
  description: 'Подборки и обзоры по разделам каталога: уход за волосами, окрашивание, стайлинг, косметика для лица и тела.',
};

export default function LandingsPage() {
  const hair = rootCategories[0];
  const groups = childCategories(hair.slug);

  return (
    <div className="container page-shell">
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Обзоры', href: '/landings' }]} />
      <h1 className="page-title">Обзоры</h1>
      <p className="page-lead">
        Тематические подборки по разделам каталога — быстрый способ перейти к нужной группе
        товаров, не прокликивая дерево категорий.
      </p>

      <div className="card-panel">
        <h2 style={{ fontSize: 19, marginBottom: 16 }}>Основные направления</h2>
        <div className="cat-grid">
          {rootCategories.map((r) => {
            const n = categoryProducts(r.slug).length;
            return (
              <Link key={r.slug} href={`/catalog/${r.slug}`} className="cat-tile">
                <Img src={r.image} alt={r.name} fallbackLabel={r.name} />
                <span>
                  <span className="cat-tile-name">{r.name}</span>
                  <span className="cat-tile-count">{n > 0 ? productsWord(n) : 'раздел каталога'}</span>
                </span>
                <span className="chev">›</span>
              </Link>
            );
          })}
        </div>
      </div>

      {groups.length > 0 && (
        <div className="card-panel">
          <h2 style={{ fontSize: 19, marginBottom: 16 }}>{hair.name}: по типам средств</h2>
          <div className="sub-list">
            {groups.map((g) => {
              const n = categoryProducts(g.path).length;
              return (
                <Link key={g.path} href={`/catalog/${g.path}`} className="sub-link">
                  {g.image ? <Img src={g.image} alt="" fallbackLabel={g.name} width={30} height={30} /> : null}
                  <span>
                    {g.name}
                    {n ? (
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 400 }}>
                        {productsWord(n)}
                      </span>
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="card-panel">
        <h2 style={{ fontSize: 19, marginBottom: 12 }}>Готовые сценарии выбора</h2>
        <div className="prose">
          <ul>
            <li><Link href="/search?q=термозащита" className="link">Термозащита</Link> — если часто работаете с феном и утюжком.</li>
            <li><Link href="/search?q=окрашенные" className="link">Уход за окрашенными волосами</Link> — сохранение цвета и блеска между визитами к колористу.</li>
            <li><Link href="/search?q=объем" className="link">Прикорневой объём</Link> — пудры, спреи и муссы для тонких волос.</li>
            <li><Link href="/search?q=набор" className="link">Подарочные наборы</Link> — готовые комплекты дешевле, чем по отдельности.</li>
            <li><Link href="/sales" className="link">Акционные позиции</Link> — все товары со скидкой в одном месте.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
