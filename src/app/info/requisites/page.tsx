import type { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';
import { site } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Реквизиты',
  description: 'Реквизиты и контактные данные интернет-магазина профессиональной косметики.',
};

export default function RequisitesPage() {
  return (
    <div className="container page-shell">
      <Breadcrumbs
        items={[
          { label: 'Главная', href: '/' },
          { label: 'Реквизиты', href: '/info/requisites' },
        ]}
      />
      <h1 className="page-title">Реквизиты</h1>
      <p className="page-lead">
        Контактные данные и реквизиты для безналичных расчётов. Значения ниже приведены
        как структура формы — приложение не содержит реальных юридических данных.
      </p>

      <div className="two-col">
        <div className="card-panel">
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Контактные данные</h2>
          <div className="info-list">
            <div><dt>Наименование</dt><dd>{site.legalName}</dd></div>
            <div><dt>Сайт</dt><dd>{site.domain}</dd></div>
            <div><dt>Телефон</dt><dd>{site.phones[0].label}</dd></div>
            <div><dt>Бесплатный по РФ</dt><dd>{site.phones[1]?.label}</dd></div>
            <div><dt>Город склада</dt><dd>{site.defaultCity}</dd></div>
            <div><dt>Режим работы</dt><dd>Пн–Пт 9:00–18:00, Сб 10:00–15:00</dd></div>
          </div>
        </div>

        <div className="card-panel">
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Банковские реквизиты</h2>
          <div className="info-list">
            <div><dt>ИНН</dt><dd>— не заполнено —</dd></div>
            <div><dt>КПП</dt><dd>— не заполнено —</dd></div>
            <div><dt>ОГРН</dt><dd>— не заполнено —</dd></div>
            <div><dt>Расчётный счёт</dt><dd>— не заполнено —</dd></div>
            <div><dt>Банк</dt><dd>— не заполнено —</dd></div>
            <div><dt>БИК</dt><dd>— не заполнено —</dd></div>
            <div><dt>Корр. счёт</dt><dd>— не заполнено —</dd></div>
          </div>
        </div>
      </div>

      <div className="notice" style={{ marginTop: 22 }}>
        Юридические реквизиты (ИНН, КПП, ОГРН, банковские данные) намеренно не заполнены:
        это демонстрационная сборка интерфейса. Для боевого запуска их нужно взять у владельца
        магазина и подставить в <code>src/app/info/requisites/page.tsx</code>.
      </div>
    </div>
  );
}
