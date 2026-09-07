import type { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Лицензии и сертификаты',
  description: 'Документы, подтверждающие право торговли профессиональной косметикой, и сертификаты соответствия на продукцию.',
};

const docs = [
  { t: 'Свидетельство о государственной регистрации', d: 'Подтверждает регистрацию юридического лица и право ведения торговой деятельности.', n: 'Демо-заглушка' },
  { t: 'Сертификаты соответствия на продукцию', d: 'Декларации о соответствии ТР ТС на косметику и парфюмерию, предоставляются по запросу на конкретную позицию.', n: 'Демо-заглушка' },
  { t: 'Договоры с дистрибьюторами', d: 'Подтверждают легальность канала поставки и оригинальность продукции брендов.', n: 'Демо-заглушка' },
  { t: 'Санитарно-эпидемиологические заключения', d: 'На складские помещения и условия хранения косметической продукции.', n: 'Демо-заглушка' },
];

export default function LicensesPage() {
  return (
    <div className="container page-shell">
      <Breadcrumbs
        items={[
          { label: 'Главная', href: '/' },
          { label: 'Компания', href: '/company' },
          { label: 'Лицензии', href: '/company/licenses' },
        ]}
      />
      <h1 className="page-title">Лицензии и сертификаты</h1>
      <p className="page-lead">
        Перечень документов, которые подтверждают право торговли профессиональной косметикой
        и оригинальность продукции.
      </p>

      <div className="two-col">
        {docs.map((d) => (
          <div className="card-panel" key={d.t} style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div
                style={{
                  width: 62, height: 80, borderRadius: 8, flexShrink: 0,
                  background: 'linear-gradient(160deg,#f3f8f7,#e6efed)',
                  border: '1px solid var(--line)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 26,
                }}
              >
                📄
              </div>
              <div>
                <h2 style={{ fontSize: 16, marginBottom: 6 }}>{d.t}</h2>
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>{d.d}</p>
                <span className="badge badge-new" style={{ background: 'var(--line)', color: 'var(--ink-3)', marginTop: 10, display: 'inline-block' }}>
                  {d.n}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="notice" style={{ marginTop: 22 }}>
        Сканы документов в демонстрационном приложении не публикуются. В реальной витрине здесь
        размещаются изображения лицензий и сертификатов с возможностью увеличения.
      </div>
    </div>
  );
}
