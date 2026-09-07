'use client';

import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import CatalogBrowser from '@/components/CatalogBrowser';
import { useShop } from '@/store/ShopProvider';
import { productsWord, formatPrice } from '@/lib/format';

export default function FavoritePage() {
  const { favoriteProducts, addToCart, notify } = useShop();

  const addAll = () => {
    const inStock = favoriteProducts.filter((p) => p.inStock);
    if (!inStock.length) {
      notify('В избранном нет товаров в наличии', 'info');
      return;
    }
    inStock.forEach((p) => addToCart(p.id, 1));
  };

  return (
    <div className="container page-shell">
      <Breadcrumbs
        items={[
          { label: 'Главная', href: '/' },
          { label: 'Кабинет', href: '/personal' },
          { label: 'Избранные товары', href: '/personal/favorite' },
        ]}
      />

      <div className="catalog-head">
        <h1>Избранные товары</h1>
        <span className="catalog-count">{productsWord(favoriteProducts.length)}</span>
      </div>

      {favoriteProducts.length === 0 ? (
        <div className="empty" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, marginTop: 18 }}>
          <span className="ico">♡</span>
          <h3>В избранном пока пусто</h3>
          <p>
            Нажимайте на сердечко в карточке товара, чтобы отложить его и вернуться позже.
            Список хранится в этом браузере.
          </p>
          <Link href="/catalog" className="btn btn-primary btn-lg">Перейти в каталог</Link>
        </div>
      ) : (
        <>
          <div className="panel" style={{ margin: '16px 0 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <b style={{ fontSize: 16 }}>
                Сумма избранного: {formatPrice(favoriteProducts.reduce((s, p) => s + p.price, 0))}
              </b>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3 }}>
                В наличии: {favoriteProducts.filter((p) => p.inStock).length} из {favoriteProducts.length}
              </div>
            </div>
            <button className="btn btn-primary btn-lg" onClick={addAll}>
              Добавить все в корзину
            </button>
          </div>
          <CatalogBrowser items={favoriteProducts} />
        </>
      )}
    </div>
  );
}
