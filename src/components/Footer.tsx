import Link from 'next/link';
import Img from './Img';
import { rootCategories, site } from '@/lib/catalog';

const catalogLinks = [
  { label: 'Весь каталог', href: '/catalog' },
  { label: 'Акции и скидки', href: '/sales' },
  { label: 'Бренды', href: '/brands' },
  { label: 'Поиск по каталогу', href: '/search' },
];

const companyLinks = [
  { label: 'О компании', href: '/company' },
  { label: 'Отзывы', href: '/company/reviews' },
  { label: 'Лицензии', href: '/company/licenses' },
  { label: 'Документы', href: '/company/docs' },
  { label: 'Реквизиты', href: '/info/requisites' },
  { label: 'Услуги', href: '/services' },
];

const clientLinks = [
  { label: 'Личный кабинет', href: '/personal' },
  { label: 'Избранное', href: '/personal/favorite' },
  { label: 'Корзина', href: '/basket' },
  { label: 'Доставка и оплата', href: '/services' },
  { label: 'Контакты', href: '/contacts' },
  { label: 'Блог', href: '/blog' },
  { label: 'Обзоры', href: '/landings' },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-about">
            <Link href="/" className="footer-logo">
              <Img src={site.logo} alt={site.name} fallbackLabel={site.name} />
            </Link>
            <p>
              Интернет-магазин профессиональной косметики для салонов красоты и мастеров.
              Более 20 городов присутствия, доставка по всей России, продукция
              сертифицированных брендов.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {site.brands.slice(0, 6).map((b) => (
                <Link
                  key={b.name}
                  href={`/search?q=${encodeURIComponent(b.name)}`}
                  style={{
                    border: '1px solid rgba(255,255,255,.16)',
                    borderRadius: 20,
                    padding: '3px 11px',
                    fontSize: 12,
                    color: '#cddad8',
                  }}
                >
                  {b.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="footer-col">
            <h4>Каталог</h4>
            <ul>
              {rootCategories.slice(0, 6).map((r) => (
                <li key={r.slug}>
                  <Link href={`/catalog/${r.slug}`}>{r.name}</Link>
                </li>
              ))}
              {catalogLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Компания</h4>
            <ul>
              {companyLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Покупателям</h4>
            <ul>
              {clientLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 18 }}>
              {site.phones.map((p) => (
                <a key={p.href} href={p.href} className="footer-phone">
                  {p.label}
                </a>
              ))}
              <span style={{ fontSize: 12, color: '#7d8f8d' }}>
                {site.phones[1]?.note ?? 'Ежедневно с 9:00 до 18:00'}
              </span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {site.legalName}</span>
          <span>·</span>
          <span>Город: {site.defaultCity} и ещё {site.cities.length - 1}</span>
          <span>·</span>
          <Link href="/info/requisites">Политика обработки персональных данных</Link>
          <span className="sep">
            Цены и наличие на сайте не являются публичной офертой
          </span>
        </div>
      </div>
    </footer>
  );
}
