'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import Img from './Img';
import { useShop } from '@/store/ShopProvider';
import { formatPrice } from '@/lib/format';
import { rootCategories, childCategories, searchProducts, site } from '@/lib/catalog';

function CatalogButton({ onOpen, open }: { onOpen: (v: boolean) => void; open: boolean }) {
  return (
    <button
      className="nav-link nav-catalog"
      onClick={() => onOpen(!open)}
      onMouseEnter={() => onOpen(true)}
      aria-expanded={open}
    >
      <span className="burger">
        <i />
        <i />
        <i />
      </span>
      Каталог
    </button>
  );
}

function MegaMenu({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState(rootCategories[0]?.slug ?? '');
  const node = useMemo(() => rootCategories.find((r) => r.slug === active), [active]);
  const subs = node ? childCategories(node.slug) : [];

  return (
    <div className="mega" onMouseLeave={onClose}>
      <div className="mega-roots">
        {rootCategories.map((r) => (
          <button
            key={r.slug}
            className={`mega-root${r.slug === active ? ' active' : ''}`}
            onMouseEnter={() => setActive(r.slug)}
            onClick={() => setActive(r.slug)}
          >
            <Img src={r.image} alt={r.name} fallbackLabel={r.name} />
            <span>{r.name}</span>
            {r.children?.length ? <span className="chev">›</span> : null}
          </button>
        ))}
      </div>
      <div className="mega-body">
        {node ? (
          <>
            <div className="mega-col-title">{node.name}</div>
            {subs.length > 0 ? (
              <div className="mega-grid">
                {subs.map((s) => (
                  <Link
                    key={s.path}
                    href={`/catalog/${s.path}`}
                    className="mega-sub"
                    onClick={onClose}
                  >
                    {s.name}
                    {s.count ? ` · ${s.count}` : ''}
                  </Link>
                ))}
              </div>
            ) : null}

            {subs.some((s) => s.children?.length) ? (
              <div style={{ marginTop: 18 }}>
                {subs
                  .filter((s) => s.children?.length)
                  .map((s) => (
                    <div className="mega-group" key={s.path}>
                      <h4>{s.name}</h4>
                      <div className="mega-grid">
                        {s.children!.map((c) => (
                          <Link
                            key={c.slug}
                            href={`/catalog/${s.path}/${c.slug}`}
                            className="mega-sub"
                            onClick={onClose}
                          >
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : null}

            <div style={{ marginTop: 20 }}>
              <Link href={`/catalog/${node.slug}`} className="btn btn-outline btn-sm" onClick={onClose}>
                Все товары раздела →
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const results = useMemo(() => (q.trim().length >= 2 ? searchProducts(q, 7) : []), [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="search" ref={box}>
      <form className="search-form" onSubmit={submit}>
        <input
          className="search-input"
          placeholder="Поиск по каталогу: бренд, средство, объём…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          aria-label="Поиск по каталогу"
        />
        <button className="search-btn" type="submit">
          <span>🔍</span> Найти
        </button>
      </form>

      {open && q.trim().length >= 2 ? (
        <div className="search-suggest">
          {results.length ? (
            <>
              <div className="suggest-head">Товары</div>
              {results.map((p) => (
                <Link
                  key={p.id}
                  href={`/catalog/${p.category}/${p.slug}`}
                  className="suggest-item"
                  onClick={() => setOpen(false)}
                >
                  <Img src={p.images[0]} alt={p.name} fallbackLabel={p.brand} width={42} height={42} />
                  <span>{p.name}</span>
                  <b>{formatPrice(p.price)}</b>
                </Link>
              ))}
            </>
          ) : (
            <div className="suggest-item">
              <span style={{ color: 'var(--ink-3)' }}>Ничего не найдено по запросу «{q}»</span>
            </div>
          )}
          <div className="suggest-head">
            <button
              className="link"
              style={{ background: 'none', border: 'none', padding: 0, fontSize: 12 }}
              onClick={() => {
                setOpen(false);
                router.push(`/search?q=${encodeURIComponent(q.trim())}`);
              }}
            >
              Показать все результаты →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const {
    cartCount,
    favorites,
    city,
    openCart,
    setCityOpen,
    setCallbackOpen,
    setAuthOpen,
  } = useShop();
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMega(false);
    setMobile(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobile ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobile]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <div className="topbar">
        <div className="container topbar-in">
          <div className="topbar-left">
            <button className="topbar-link" onClick={() => setCityOpen(true)}>
              📍 {city} <span style={{ opacity: 0.5 }}>▾</span>
            </button>
            <Link className="topbar-link" href="/services">Услуги</Link>
            <Link className="topbar-link" href="/sales">Акции</Link>
            <Link className="topbar-link" href="/blog">Блог</Link>
          </div>
          <div className="topbar-right">
            <Link className="topbar-link" href="/contacts">Контакты</Link>
            <Link className="topbar-link" href="/company">О компании</Link>
            <Link className="topbar-link" href="/info/requisites">Реквизиты</Link>
            <span style={{ opacity: 0.7 }}>Пн–Пт 9:00–18:00</span>
          </div>
        </div>
      </div>

      <header className="site-header">
        <div className="container header-main">
          <button className="mobile-burger" onClick={() => setMobile(true)} aria-label="Меню">
            ☰
          </button>

          <Link href="/" className="logo" aria-label="На главную">
            <Img src={site.logo} alt={site.name} fallbackLabel={site.name} />
            <span className="logo-fallback">
              <b>Сибирский</b>
              <span>цирюльник</span>
            </span>
          </Link>

          <SearchBox />

          <div className="header-contacts">
            <a href={site.phones[0].href}>{site.phones[0].label}</a>
            <button onClick={() => setCallbackOpen(true)}>Заказать звонок</button>
          </div>

          <div className="header-actions">
            <button className="icon-btn" onClick={() => setAuthOpen(true)} aria-label="Войти">
              <span className="ico">👤</span>
              <span>Войти</span>
            </button>
            <Link className="icon-btn" href="/personal/favorite" aria-label="Избранные товары">
              <span className="ico">♡</span>
              <span>Избранное</span>
              {favorites.length ? (
                <em className={`badge-count${favorites.length ? ' active' : ''}`}>{favorites.length}</em>
              ) : null}
            </Link>
            <button className="icon-btn" onClick={openCart} aria-label="Корзина">
              <span className="ico">🛒</span>
              <span>Корзина</span>
              {cartCount ? <em className="badge-count active">{cartCount}</em> : null}
            </button>
          </div>
        </div>

        <nav className="main-nav">
          <div className="container mega-wrap">
            <div className="main-nav-in">
              <CatalogButton open={mega} onOpen={setMega} />
              {site.topNav
                .filter((n) => n.href !== '/' && n.href !== '/catalog')
                .map((n) => (
                  <Link key={n.href} href={n.href} className={`nav-link${isActive(n.href) ? ' active' : ''}`}>
                    {n.label}
                  </Link>
                ))}
            </div>
            {mega ? <MegaMenu onClose={() => setMega(false)} /> : null}
          </div>
        </nav>
      </header>

      {mobile ? <MobileMenu onClose={() => setMobile(false)} /> : null}
    </>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  const { city, setCityOpen, setCallbackOpen, setAuthOpen } = useShop();
  return (
    <div className="mobile-menu">
      <div className="mobile-menu-head">
        <b style={{ fontSize: 16, color: 'var(--brand)' }}>Меню</b>
        <button className="drawer-close" onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
      </div>
      <div className="mobile-menu-body">
        <button className="topbar-link" style={{ padding: '10px 0', fontSize: 15 }} onClick={() => { onClose(); setCityOpen(true); }}>
          📍 Город: <b style={{ color: 'var(--ink)' }}>{city}</b>
        </button>

        <div className="mobile-section-title">Каталог</div>
        {rootCategories.map((r) => (
          <Link key={r.slug} href={`/catalog/${r.slug}`} className="mobile-nav-link" onClick={onClose}>
            <Img src={r.image} alt="" fallbackLabel={r.name} width={26} height={26} />
            {r.name}
            <span className="chev">›</span>
          </Link>
        ))}

        <div className="mobile-section-title">Разделы</div>
        {site.topNav.map((n) => (
          <Link key={n.href} href={n.href} className="mobile-nav-link" onClick={onClose}>
            {n.label}
          </Link>
        ))}

        <div className="mobile-section-title">Связь</div>
        {site.phones.map((p) => (
          <a key={p.href} href={p.href} className="mobile-nav-link" style={{ fontWeight: 700 }}>
            {p.label}
          </a>
        ))}
        <button
          className="btn btn-outline btn-block"
          style={{ marginTop: 12 }}
          onClick={() => { onClose(); setCallbackOpen(true); }}
        >
          Заказать звонок
        </button>
        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 8 }}
          onClick={() => { onClose(); setAuthOpen(true); }}
        >
          Войти в кабинет
        </button>
      </div>
    </div>
  );
}
