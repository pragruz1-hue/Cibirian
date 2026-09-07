import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import { site, products } from '@/lib/catalog';
import { productsWord } from '@/lib/format';

export const metadata: Metadata = {
  title: 'О компании',
  description:
    'Интернет-магазин профессиональной косметики «Сибирский цирюльник»: работаем с салонами и мастерами, доставляем в более чем 20 городов России.',
};

const values = [
  { ico: '🎯', t: 'Только профессиональные линейки', d: 'Не держим в ассортименте средства, которые не прошли проверку в salon-работе.' },
  { ico: '🤝', t: 'Партнёрство с мастерами', d: 'Помогаем с подбором, обучением и стартовой закупкой — не просто продаём товар.' },
  { ico: '🔍', t: 'Прозрачные условия', d: 'Цены, наличие и сроки доставки видны до оформления заказа, без скрытых доплат.' },
  { ico: '📈', t: 'Постоянное обновление', d: 'Регулярно добавляем новинки брендов и снимаем с продажи снятые с производства позиции.' },
];

export default function CompanyPage() {
  const brandCount = new Set(products.map((p) => p.brand)).size;

  return (
    <div className="container page-shell">
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Компания', href: '/company' }]} />
      <h1 className="page-title">О компании</h1>
      <p className="page-lead">
        «Сибирский цирюльник» — интернет-магазин профессиональной косметики для салонов красоты,
        частных мастеров и всех, кто ухаживает за волосами по салонным стандартам.
      </p>

      <div className="two-col">
        <div className="card-panel">
          <div className="prose">
            <h3>Чем мы занимаемся</h3>
            <p>
              Мы поставляем средства для ухода за волосами, окрашивания, стайлинга и химической
              завивки, а также косметику для лица, тела, рук и ног, подарочные наборы,
              аксессуары для мастеров и электроприборы.
            </p>
            <p>
              Основной склад находится в Новосибирске, доставка осуществляется более чем
              в {site.cities.length} городов. Для салонов действуют оптовые условия: индивидуальный
              прайс, отсрочка платежа и персональный менеджер.
            </p>
            <h3>Как мы работаем</h3>
            <p>
              Ассортимент формируется вокруг реальных задач мастеров. Мы работаем напрямую
              с дистрибьюторами, поэтому в каталоге только оригинальная продукция с действующими
              сертификатами. Наличие на сайте отображается по складу выбранного города.
            </p>
          </div>
        </div>

        <div className="card-panel">
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>В цифрах</h2>
          <div className="info-list">
            <div><dt>Позиций в каталоге</dt><dd>{productsWord(products.length)} (в демо-выборке)</dd></div>
            <div><dt>Брендов</dt><dd>{brandCount}</dd></div>
            <div><dt>Городов доставки</dt><dd>{site.cities.length}</dd></div>
            <div><dt>Разделов каталога</dt><dd>{site.topNav.length}+ подразделов</dd></div>
            <div><dt>Основной склад</dt><dd>Новосибирск</dd></div>
            <div><dt>Режим работы</dt><dd>Пн–Пт 9:00–18:00</dd></div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/company/reviews" className="btn btn-outline btn-sm">Отзывы</Link>
            <Link href="/company/licenses" className="btn btn-outline btn-sm">Лицензии</Link>
            <Link href="/company/docs" className="btn btn-outline btn-sm">Документы</Link>
            <Link href="/info/requisites" className="btn btn-outline btn-sm">Реквизиты</Link>
          </div>
        </div>
      </div>

      <div className="feature-grid" style={{ marginTop: 22 }}>
        {values.map((v) => (
          <div className="feature-card" key={v.t}>
            <span className="ico">{v.ico}</span>
            <h3>{v.t}</h3>
            <p>{v.d}</p>
          </div>
        ))}
      </div>

      <div className="notice" style={{ marginTop: 22 }}>
        Раздел заполнен демонстрационным контентом: приложение воспроизводит структуру и механику
        витрины, а не юридическую информацию реального магазина.
      </div>
    </div>
  );
}
