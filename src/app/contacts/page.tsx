'use client';

import { useState } from 'react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useShop } from '@/store/ShopProvider';
import { site } from '@/lib/catalog';

export default function ContactsPage() {
  const { city, setCityOpen, notify } = useShop();
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    notify('Сообщение отправлено — мы перезвоним');
    setForm({ name: '', phone: '', message: '' });
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="container page-shell">
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Контакты', href: '/contacts' }]} />
      <h1 className="page-title">Контакты</h1>
      <p className="page-lead">
        Свяжитесь с нами удобным способом: по телефону, через форму обратной связи или в чате поддержки
        в правом нижнем углу экрана.
      </p>

      <div className="two-col">
        <div className="card-panel">
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Телефоны</h2>
          {site.phones.map((p) => (
            <a key={p.href} href={p.href} style={{ display: 'block', fontSize: 21, fontWeight: 700, marginBottom: 4 }}>
              {p.label}
            </a>
          ))}
          <p style={{ color: 'var(--ink-3)', fontSize: 13.5, marginTop: 8 }}>
            {site.phones[1]?.note ?? ''} · режим работы: Пн–Пт 9:00–18:00, Сб 10:00–15:00
          </p>

          <h2 style={{ fontSize: 18, margin: '24px 0 12px' }}>Город и склад</h2>
          <div className="info-list">
            <div><dt>Текущий регион</dt><dd>{city}</dd></div>
            <div><dt>Основной склад</dt><dd>г. Новосибирск</dd></div>
            <div><dt>Городов доставки</dt><dd>{site.cities.length}</dd></div>
            <div><dt>Самовывоз</dt><dd>в день заказа, бесплатно</dd></div>
          </div>
          <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => setCityOpen(true)}>
            Изменить город
          </button>

          <h2 style={{ fontSize: 18, margin: '24px 0 12px' }}>Города присутствия</h2>
          <div className="badge-row">
            {site.cities.map((c) => (
              <span key={c} className={`chip${c === city ? ' on' : ''}`}>{c}</span>
            ))}
          </div>
        </div>

        <div className="card-panel">
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Написать нам</h2>
          <p className="panel-sub">Ответим в рабочее время, обычно в течение 15 минут.</p>

          {sent && (
            <div className="notice" style={{ marginBottom: 16 }}>
              ✓ Сообщение отправлено. Менеджер свяжется с вами по указанному телефону.
            </div>
          )}

          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="c-name">Ваше имя *</label>
              <input id="c-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Как к вам обращаться" />
            </div>
            <div className="field">
              <label htmlFor="c-phone">Телефон *</label>
              <input id="c-phone" type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 (___) ___-__-__" />
            </div>
            <div className="field">
              <label htmlFor="c-msg">Сообщение *</label>
              <textarea id="c-msg" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Вопрос по товару, наличию, доставке или оптовым условиям" />
            </div>
            <button className="btn btn-primary btn-block btn-lg" type="submit">Отправить</button>
            <p className="form-note">
              Нажимая кнопку, вы соглашаетесь с политикой обработки персональных данных.
              Форма работает в демонстрационном режиме и не отправляет данные на сервер.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
