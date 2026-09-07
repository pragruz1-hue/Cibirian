'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import Img from './Img';
import Counter from './Counter';
import { useShop } from '@/store/ShopProvider';
import { formatPrice, productsWord } from '@/lib/format';
import { productUrl } from '@/lib/catalog';

const FREE_FROM = 3000;

export default function CartDrawer() {
  const { cartOpen, closeCart, cartLines, cartCount, cartTotal, setQty, removeFromCart, clearCart } =
    useShop();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeCart();
    if (cartOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cartOpen, closeCart]);

  if (!cartOpen) return null;

  const left = Math.max(0, FREE_FROM - cartTotal);
  const progress = Math.min(100, (cartTotal / FREE_FROM) * 100);

  return (
    <div className="overlay" onClick={closeCart} role="dialog" aria-label="Корзина">
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h3>
            Корзина {cartCount ? <span style={{ color: 'var(--ink-3)', fontWeight: 400, fontSize: 14 }}>· {productsWord(cartCount)}</span> : null}
          </h3>
          <button className="drawer-close" onClick={closeCart} aria-label="Закрыть корзину">
            ✕
          </button>
        </div>

        {cartLines.length === 0 ? (
          <div className="drawer-body">
            <div className="empty">
              <span className="ico">🛒</span>
              <h3>Корзина пуста</h3>
              <p>Добавьте товары из каталога — профессиональная косметика для волос, лица и тела со склада в Новосибирске.</p>
              <Link href="/catalog" className="btn btn-primary" onClick={closeCart}>
                Перейти в каталог
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="drawer-body">
              <div style={{ background: 'var(--brand-light)', borderRadius: 8, padding: '10px 13px', marginBottom: 14 }}>
                <div style={{ fontSize: 12.5, color: 'var(--brand-dark)', marginBottom: 7, fontWeight: 600 }}>
                  {left > 0
                    ? `До бесплатной доставки ${formatPrice(left)}`
                    : 'Доставка бесплатно ✓'}
                </div>
                <div style={{ height: 5, background: '#fff', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--brand)', transition: 'width .3s' }} />
                </div>
              </div>

              {cartLines.map(({ product: p, qty }) => (
                <div className="cart-line" key={p.id}>
                  <Link href={productUrl(p)} onClick={closeCart}>
                    <Img src={p.images[0]} alt={p.name} fallbackLabel={p.brand} width={72} height={72} />
                  </Link>
                  <div>
                    <div className="cart-line-brand">{p.brand}</div>
                    <Link href={productUrl(p)} onClick={closeCart}>
                      <h4>{p.name}</h4>
                    </Link>
                    <div className="cart-line-foot">
                      <Counter value={qty} onChange={(v) => setQty(p.id, v)} />
                      <button className="cart-remove" onClick={() => removeFromCart(p.id)} aria-label="Удалить">
                        🗑
                      </button>
                      <span className="cart-line-price">{formatPrice(p.price * qty)}</span>
                    </div>
                  </div>
                </div>
              ))}

              <button className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={clearCart}>
                Очистить корзину
              </button>
            </div>

            <div className="drawer-foot">
              <div className="sum-row">
                <span>Товары, {cartCount} шт.</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <div className="sum-row">
                <span>Доставка</span>
                <span>{left > 0 ? 'по тарифу' : 'бесплатно'}</span>
              </div>
              <div className="sum-row total">
                <span>Итого</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <Link href="/basket" className="btn btn-primary btn-block btn-lg" onClick={closeCart}>
                Оформить заказ
              </Link>
              <button className="btn btn-ghost btn-block" style={{ marginTop: 6 }} onClick={closeCart}>
                Продолжить покупки
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
