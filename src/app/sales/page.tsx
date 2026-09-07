import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import SalesBrowser from '@/components/SalesBrowser';
import { products, saleProducts } from '@/lib/catalog';
import { productsWord } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Акции и скидки на профессиональную косметику',
  description:
    'Товары со скидкой, акционные наборы и специальные предложения на профессиональную косметику для волос, лица и тела.',
};

const promos = [
  { title: 'Бесплатная доставка от 3 000 руб', text: 'По Новосибирску и при отправке в другие регионы.', ico: '🚚' },
  { title: 'Подарочные наборы со скидкой', text: 'Готовые комплекты ухода по цене ниже суммы товаров.', ico: '🎁' },
  { title: 'Оптовые условия для салонов', text: 'Индивидуальный прайс и отсрочка платежа при регулярных заказах.', ico: '💼' },
];

export default function SalesPage() {
  const sale = products.filter((p) => p.sale || p.oldPrice);
  const hits = products.filter((p) => p.hit);
  const recommended = products.filter((p) => p.recommend);

  return (
    <div className="container page-shell">
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Акции', href: '/sales' }]} />

      <div className="catalog-head">
        <h1>Акции</h1>
        <span className="catalog-count">{productsWord(sale.length)}</span>
      </div>

      <div className="feature-grid" style={{ margin: '16px 0 26px' }}>
        {promos.map((p) => (
          <div className="feature-card" key={p.title}>
            <span className="ico">{p.ico}</span>
            <h3>{p.title}</h3>
            <p>{p.text}</p>
          </div>
        ))}
      </div>

      <SalesBrowser
        groups={[
          { id: 'sale', title: 'Товары со скидкой', items: sale.length ? sale : saleProducts(20) },
          { id: 'hit', title: 'Хиты продаж', items: hits },
          { id: 'rec', title: 'Советуем', items: recommended },
        ]}
      />

      <div className="card-panel" style={{ marginTop: 26 }}>
        <div className="prose">
          <h3>Как действуют скидки</h3>
          <p>
            Акционная цена действует, пока товар есть в наличии на складе выбранного города.
            Зачёркнутая цена — обычная розничная стоимость позиции до начала акции.
            Скидки не суммируются с оптовым прайсом для салонов; условия по опту уточняйте у менеджера.
          </p>
          <p>
            Подборки «Хиты продаж» и «Советуем» формируются по частоте заказов и оценкам мастеров —
            это быстрый способ выбрать проверенное средство, если вы не знаете, с чего начать.
          </p>
          <div style={{ marginTop: 16 }}>
            <Link href="/catalog" className="btn btn-primary">Перейти в каталог</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
