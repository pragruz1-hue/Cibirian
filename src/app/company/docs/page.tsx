import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Документы',
  description: 'Пользовательское соглашение, политика обработки персональных данных, правила продажи и возврата.',
};

const docs = [
  { t: 'Пользовательское соглашение', d: 'Условия использования сайта и оформления заказов.', updated: '01.03.2025' },
  { t: 'Политика обработки персональных данных', d: 'Какие данные собираются, с какой целью и как защищены.', updated: '01.03.2025' },
  { t: 'Правила продажи товаров дистанционным способом', d: 'Порядок оформления, оплаты и передачи заказа покупателю.', updated: '12.01.2025' },
  { t: 'Правила возврата и обмена', d: 'Сроки и условия возврата товара надлежащего и ненадлежащего качества.', updated: '12.01.2025' },
  { t: 'Условия доставки', d: 'Способы, сроки и стоимость доставки по городам присутствия и России.', updated: '05.04.2025' },
  { t: 'Оферта для юридических лиц', d: 'Условия оптовых поставок и безналичных расчётов с салонами.', updated: '05.04.2025' },
];

export default function DocsPage() {
  return (
    <div className="container page-shell">
      <Breadcrumbs
        items={[
          { label: 'Главная', href: '/' },
          { label: 'Компания', href: '/company' },
          { label: 'Документы', href: '/company/docs' },
        ]}
      />
      <h1 className="page-title">Документы</h1>
      <p className="page-lead">
        Нормативные документы, регулирующие работу магазина: соглашение, политика персональных
        данных, правила продажи, возврата и доставки.
      </p>

      <div className="card-panel">
        {docs.map((d) => (
          <div key={d.t} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '15px 0', borderBottom: '1px solid var(--line-2)' }}>
            <span style={{ fontSize: 22 }}>📑</span>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 15.5, marginBottom: 4 }}>{d.t}</h2>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>{d.d}</p>
            </div>
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>ред. {d.updated}</span>
          </div>
        ))}
      </div>

      <div className="notice" style={{ marginTop: 20 }}>
        Раздел оформлен как перечень документов без полных текстов: приложение демонстрирует
        структуру витрины. За реальными редакциями документов следует обращаться к владельцу сайта.
      </div>

      <div style={{ marginTop: 20 }}>
        <Link href="/info/requisites" className="btn btn-outline">Реквизиты</Link>
        <Link href="/company/licenses" className="btn btn-outline" style={{ marginLeft: 10 }}>Лицензии</Link>
      </div>
    </div>
  );
}
