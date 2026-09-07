'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useShop } from '@/store/ShopProvider';

/** Нижняя панель навигации на мобильных — дублирует ключевые разделы. */
export default function MobileBar() {
  const { cartCount, favorites, openCart } = useShop();
  const pathname = usePathname();

  const items = [
    { href: '/', label: 'Главная', ico: '🏠' },
    { href: '/catalog', label: 'Каталог', ico: '☰' },
    { href: '/search', label: 'Поиск', ico: '🔍' },
    { href: '/personal/favorite', label: 'Избранное', ico: '♡', badge: favorites.length },
  ];

  return (
    <div className="mobile-bar">
      <div className="mobile-bar-in">
        {items.map((i) => {
          const active = i.href === '/' ? pathname === '/' : pathname.startsWith(i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              className="icon-btn"
              style={{ color: active ? 'var(--brand)' : undefined, minWidth: 52 }}
            >
              <span className="ico">{i.ico}</span>
              <span style={{ display: 'block', fontSize: 10 }}>{i.label}</span>
              {i.badge ? <em className="badge-count active">{i.badge}</em> : null}
            </Link>
          );
        })}
        <button className="icon-btn" onClick={openCart} style={{ minWidth: 52 }}>
          <span className="ico">🛒</span>
          <span style={{ display: 'block', fontSize: 10 }}>Корзина</span>
          {cartCount ? <em className="badge-count active">{cartCount}</em> : null}
        </button>
      </div>
    </div>
  );
}
