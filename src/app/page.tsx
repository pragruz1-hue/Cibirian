import Link from 'next/link';
import Img from '@/components/Img';
import ProductCard from '@/components/ProductCard';
import HomeCarousel from '@/components/HomeCarousel';
import {
  rootCategories,
  childCategories,
  bestOffers,
  hitsProducts,
  saleProducts,
  newProducts,
  products,
  site,
} from '@/lib/catalog';

const advantages = [
  { ico: '🚚', title: 'Доставка по всей России', text: 'Отправляем со склада в Новосибирске. Бесплатная доставка при заказе от 3 000 руб.' },
  { ico: '✅', title: 'Только оригинал', text: 'Работаем напрямую с производителями и официальными дистрибьюторами.' },
  { ico: '💼', title: 'Условия для салонов', text: 'Оптовые цены, отсрочка платежа и персональный менеджер для студий и мастеров.' },
  { ico: '🧪', title: 'Помощь технолога', text: 'Подберём уход и окрашивание под задачу — консультации бесплатно.' },
];

export default function HomePage() {
  const offers = bestOffers(10);
  const hits = hitsProducts(10);
  const sales = saleProducts(10);
  const fresh = newProducts(10);
  const hair = rootCategories[0];
  const hairSubs = childCategories(hair.slug);

  return (
    <div className="container">
      {/* ---------------------- Hero ---------------------- */}
      <section className="hero">
        <div className="hero-in">
          <span className="hero-kicker">Профессиональная косметика</span>
          <h1>Всё для салонов красоты и мастеров</h1>
          <p>
            Уход, окрашивание, стайлинг и инструменты от проверенных брендов.
            Со склада в Новосибирске — с доставкой в {site.cities.length} городов.
          </p>
          <div className="hero-actions">
            <Link href="/catalog" className="btn btn-light btn-lg">Перейти в каталог</Link>
            <Link href="/sales" className="btn btn-line btn-lg">Акции и скидки</Link>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <b>{products.length}+</b>
            <span>позиций в каталоге</span>
          </div>
          <div className="hero-stat">
            <b>{site.brands.length}</b>
            <span>брендов</span>
          </div>
          <div className="hero-stat">
            <b>{site.cities.length}</b>
            <span>городов доставки</span>
          </div>
        </div>
      </section>

      {/* ---------------------- Слайдер брендов ---------------------- */}
      <section className="section">
        <HomeCarousel slides={site.slider} />
      </section>

      {/* ---------------------- Категории ---------------------- */}
      <section className="section">
        <div className="section-head">
          <h2>Каталог</h2>
          <span className="rule" />
          <Link href="/catalog">Все разделы →</Link>
        </div>
        <div className="cat-grid">
          {rootCategories.map((c) => (
            <Link key={c.slug} href={`/catalog/${c.slug}`} className="cat-tile">
              <Img src={c.image} alt={c.name} fallbackLabel={c.name} />
              <span>
                <span className="cat-tile-name">{c.name}</span>
                {c.count ? <span className="cat-tile-count">{c.count} товаров</span> : null}
              </span>
              <span className="chev">›</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------------- Подкатегории волос ---------------------- */}
      {hairSubs.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>{hair.name}</h2>
            <span className="rule" />
            <Link href={`/catalog/${hair.slug}`}>Смотреть все →</Link>
          </div>
          <div className="sub-list">
            {hairSubs.map((s) => (
              <Link key={s.path} href={`/catalog/${s.path}`} className="sub-link">
                {s.image ? <Img src={s.image} alt="" fallbackLabel={s.name} width={30} height={30} /> : null}
                {s.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------- Лучшие предложения ---------------------- */}
      <section className="section">
        <div className="section-head">
          <h2>Лучшие предложения</h2>
          <span className="rule" />
          <Link href="/sales">Все акции →</Link>
        </div>
        <div className="prod-grid">
          {offers.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* ---------------------- Преимущества ---------------------- */}
      <section className="section">
        <div className="feature-grid">
          {advantages.map((a) => (
            <div className="feature-card" key={a.title}>
              <span className="ico">{a.ico}</span>
              <h3>{a.title}</h3>
              <p>{a.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------- Хиты продаж ---------------------- */}
      <section className="section">
        <div className="section-head">
          <h2>Хиты продаж</h2>
          <span className="rule" />
          <Link href="/catalog">В каталог →</Link>
        </div>
        <div className="prod-grid">
          {hits.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* ---------------------- Новинки ---------------------- */}
      {fresh.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Новинки</h2>
            <span className="rule" />
            <Link href="/catalog">В каталог →</Link>
          </div>
          <div className="prod-grid">
            {fresh.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* ---------------------- Бренды ---------------------- */}
      <section className="section">
        <div className="section-head">
          <h2>Бренды</h2>
          <span className="rule" />
          <Link href="/brands">Все бренды →</Link>
        </div>
        <div className="brand-strip">
          {site.brands.map((b) => (
            <Link
              key={b.name}
              href={`/search?q=${encodeURIComponent(b.name)}`}
              className="brand-card"
              title={b.name}
            >
              {b.image ? <Img src={b.image} alt={b.name} fallbackLabel={b.name} /> : <span>{b.name}</span>}
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------------- Распродажа ---------------------- */}
      {sales.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Скидки и распродажа</h2>
            <span className="rule" />
            <Link href="/sales">Все товары со скидкой →</Link>
          </div>
          <div className="prod-grid">
            {sales.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* ---------------------- SEO-текст ---------------------- */}
      <section className="section">
        <div className="card-panel">
          <div className="prose">
            <h3>Профессиональная косметика для волос с доставкой</h3>
            <p>
              «Сибирский цирюльник» — интернет-магазин профессиональной косметики для салонов красоты,
              частных мастеров и тех, кто ухаживает за волосами дома по салонным стандартам.
              В каталоге собраны средства для ухода, окрашивания, стайлинга и химической завивки,
              а также косметика для лица, тела, рук и ног и аксессуары для мастеров.
            </p>
            <p>
              Мы работаем с продукцией брендов, которые используют в салонах: средства проходят
              сертификацию и поставляются напрямую от дистрибьюторов. Для салонов действуют оптовые
              условия, для мастеров — помощь технолога в подборе ухода и схем окрашивания.
            </p>
            <h3>Как оформить заказ</h3>
            <p>
              Выберите раздел каталога, отфильтруйте товары по бренду, назначению, объёму и типу волос,
              добавьте нужное в корзину и оформите заказ. Наличие отображается по складу выбранного
              города — переключить его можно в верхней панели сайта.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
