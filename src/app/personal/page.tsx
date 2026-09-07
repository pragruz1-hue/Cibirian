'use client';

import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import ProductCard from '@/components/ProductCard';
import { useShop } from '@/store/ShopProvider';
import { formatPrice, productsWord } from '@/lib/format';
import { site } from '@/lib/catalog';

export default function PersonalPage() {
  const { cartLines, cartTotal, favorites, favoriteProducts, viewedProducts, city, setAuthOpen } = useShop();

  return (
    <div className="container page-shell">
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Кабинет', href: '/personal' }]} />

      <div className="catalog-head">
        <h1>Личный кабинет</h1>
        <span className="catalog-count">Город: {city}</span>
      </div>

      <div className="card-panel">
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="avatar" style={{ width: 54, height: 54, fontSize: 21 }}>Г</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <b style={{ fontSize: 17, display: 'block' }}>Гость</b>
            <span style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>
              Данные корзины и избранного хранятся локально в этом браузере
            </span>
          </div>
          <button className="btn btn-primary" onClick={() => setAuthOpen(true)}>Войти</button>
        </div>
      </div>

      <div className="feature-grid" style={{ margin: '18px 0 26px' }}>
        <div className="feature-card">
          <span className="ico">🛒</span>
          <h3>В корзине: {cartLines.length ? productsWord(cartLines.reduce((s, l) => s + l.qty, 0)) : 'пусто'}</h3>
          <p>{cartLines.length ? `На сумму ${formatPrice(cartTotal)}` : 'Добавьте товары из каталога'}</p>
          <Link href="/basket" className="link" style={{ fontSize: 13, fontWeight: 600 }}>Открыть корзину →</Link>
        </div>
        <div className="feature-card">
          <span className="ico">♡</span>
          <h3>В избранном: {productsWord(favorites.length)}</h3>
          <p>Отложенные товары для быстрого возврата</p>
          <Link href="/personal/favorite" className="link" style={{ fontSize: 13, fontWeight: 600 }}>Открыть избранное →</Link>
        </div>
        <div className="feature-card">
          <span className="ico">👁</span>
          <h3>Просмотрено: {productsWord(viewedProducts.length)}</h3>
          <p>История просмотров карточек товара</p>
        </div>
        <div className="feature-card">
          <span className="ico">📦</span>
          <h3>Заказы: 0</h3>
          <p>История заказов появится после авторизации</p>
        </div>
      </div>

      {viewedProducts.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Вы недавно смотрели</h2>
            <span className="rule" />
          </div>
          <div className="prod-grid">
            {viewedProducts.slice(0, 5).map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {favoriteProducts.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Избранное</h2>
            <span className="rule" />
            <Link href="/personal/favorite">Все →</Link>
          </div>
          <div className="prod-grid">
            {favoriteProducts.slice(0, 5).map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      <div className="notice">
        Кабинет работает в демонстрационном режиме: регистрация и авторизация не подключены
        к backend, заказы не сохраняются на сервере. Города доставки: {site.cities.join(', ')}.
      </div>
    </div>
  );
}
