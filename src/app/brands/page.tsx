import type { Metadata } from 'next';
import Link from 'next/link';
import Img from '@/components/Img';
import Breadcrumbs from '@/components/Breadcrumbs';
import { site, products } from '@/lib/catalog';
import { productsWord, formatPrice } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Бренды профессиональной косметики',
  description:
    'OLLIN, TEFIA, EXITO, KAARAL, KEBREN, NEXXT, CONCEPT, ARAVIA и другие бренды профессиональной косметики в каталоге.',
};

export default function BrandsPage() {
  const counts = new Map<string, { n: number; min: number; max: number }>();
  for (const p of products) {
    const cur = counts.get(p.brand);
    if (cur) {
      cur.n += 1;
      cur.min = Math.min(cur.min, p.price);
      cur.max = Math.max(cur.max, p.price);
    } else {
      counts.set(p.brand, { n: 1, min: p.price, max: p.price });
    }
  }

  const known = site.brands.map((b) => ({ ...b, stat: counts.get(b.name) }));
  const extra = [...counts.entries()]
    .filter(([name]) => !site.brands.some((b) => b.name === name))
    .map(([name, stat]) => ({ name, image: '', stat }));

  const all = [...known, ...extra];

  return (
    <div className="container page-shell">
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Бренды', href: '/brands' }]} />
      <h1 className="page-title">Бренды</h1>
      <p className="page-lead">
        В каталоге представлена профессиональная косметика марок, которые используют в салонах.
        Нажмите на бренд, чтобы увидеть все его товары.
      </p>

      <div className="cat-grid">
        {all.map((b) => (
          <Link
            key={b.name}
            href={`/search?q=${encodeURIComponent(b.name)}`}
            className="cat-tile"
            style={{ minHeight: 104 }}
          >
            {b.image ? (
              <Img src={b.image} alt={b.name} fallbackLabel={b.name} />
            ) : (
              <span
                style={{
                  width: 58, height: 58, borderRadius: 10, background: 'var(--brand-light)',
                  color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 15, flexShrink: 0, letterSpacing: '.04em',
                }}
              >
                {b.name.slice(0, 3)}
              </span>
            )}
            <span>
              <span className="cat-tile-name">{b.name}</span>
              {b.stat ? (
                <span className="cat-tile-count">
                  {productsWord(b.stat.n)} · {formatPrice(b.stat.min)}
                  {b.stat.max !== b.stat.min ? ` – ${formatPrice(b.stat.max)}` : ''}
                </span>
              ) : (
                <span className="cat-tile-count">представлен на сайте</span>
              )}
            </span>
            <span className="chev">›</span>
          </Link>
        ))}
      </div>

      <div className="card-panel" style={{ marginTop: 26 }}>
        <div className="prose">
          <h3>О подборке брендов</h3>
          <p>
            Ассортимент сформирован вокруг задач салонной работы: уход и восстановление,
            окрашивание и тонирование, стайлинг и фиксация, а также косметика для лица, тела,
            рук и ног. По каждой марке можно отфильтровать товары по линейке, назначению и объёму.
          </p>
          <p>
            Вся продукция — оригинальная, поставки идут через официальных дистрибьюторов.
            Для салонов доступны оптовые условия: индивидуальный прайс, отсрочка платежа
            и помощь технолога в подборе стартовой закупки.
          </p>
        </div>
      </div>
    </div>
  );
}
