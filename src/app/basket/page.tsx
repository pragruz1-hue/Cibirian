'use client';

import Link from 'next/link';
import { useState } from 'react';
import Img from '@/components/Img';
import Counter from '@/components/Counter';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useShop } from '@/store/ShopProvider';
import { formatPrice, productsWord } from '@/lib/format';
import { productUrl } from '@/lib/catalog';

const FREE_FROM = 3000;

const deliveryOptions = [
  { id: 'courier', title: 'Курьер по городу', note: '1–2 рабочих дня, 300 руб. Бесплатно от 3 000 руб.', price: 300 },
  { id: 'pickup', title: 'Самовывоз со склада', note: 'Новосибирск, бесплатно, в день заказа', price: 0 },
  { id: 'cdek', title: 'СДЭК до пункта выдачи', note: '2–6 дней по России, от 350 руб.', price: 350 },
  { id: 'post', title: 'Почта России', note: '4–10 дней, от 290 руб.', price: 290 },
];

const paymentOptions = [
  { id: 'card', title: 'Банковской картой онлайн', note: 'Visa, MasterCard, МИР. Безопасная оплата.' },
  { id: 'cash', title: 'Наличными при получении', note: 'Только для курьерской доставки и самовывоза.' },
  { id: 'invoice', title: 'Безналичный расчёт по счёту', note: 'Для салонов и юридических лиц, с пакетом документов.' },
];

export default function BasketPage() {
  const { cartLines, cartCount, cartTotal, setQty, removeFromCart, clearCart, city, notify } = useShop();
  const [delivery, setDelivery] = useState('courier');
  const [payment, setPayment] = useState('card');
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', comment: '' });
  const [done, setDone] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const deliv = deliveryOptions.find((d) => d.id === delivery)!;
  const deliveryPrice = cartTotal >= FREE_FROM && deliv.price > 0 ? 0 : deliv.price;
  const total = cartTotal + deliveryPrice;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, boolean> = {};
    if (!form.name.trim()) next.name = true;
    if (!form.phone.trim()) next.phone = true;
    if (delivery !== 'pickup' && !form.address.trim()) next.address = true;
    setErrors(next);
    if (Object.keys(next).length) {
      notify('Проверьте заполнение обязательных полей', 'info');
      return;
    }
    const orderNo = `SBC-${Date.now().toString().slice(-6)}`;
    setDone(orderNo);
    clearCart();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (done) {
    return (
      <div className="container page-shell">
        <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Корзина', href: '/basket' }]} />
        <div className="panel" style={{ marginTop: 18 }}>
          <div className="success-box">
            <span className="ico">✓</span>
            <h2 style={{ marginBottom: 10 }}>Заказ № {done} принят</h2>
            <p className="page-lead" style={{ margin: '0 auto 22px', textAlign: 'center' }}>
              Менеджер свяжется с вами для подтверждения состава заказа, адреса и времени доставки.
              Город получения: <b>{city}</b>.
            </p>
            <div className="notice" style={{ maxWidth: 520, margin: '0 auto 22px', textAlign: 'left' }}>
              Это демонстрационное приложение: заказ не передан в реальную систему учёта
              и не будет оплачен или доставлен.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/catalog" className="btn btn-primary btn-lg">Продолжить покупки</Link>
              <Link href="/personal" className="btn btn-outline btn-lg">В личный кабинет</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-shell">
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Корзина', href: '/basket' }]} />

      <div className="catalog-head">
        <h1>Корзина</h1>
        {cartCount ? <span className="catalog-count">{productsWord(cartCount)}</span> : null}
      </div>

      {cartLines.length === 0 ? (
        <div className="empty" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, marginTop: 18 }}>
          <span className="ico">🛒</span>
          <h3>Корзина пуста</h3>
          <p>Добавьте товары из каталога — и вернитесь к оформлению.</p>
          <Link href="/catalog" className="btn btn-primary btn-lg">Перейти в каталог</Link>
        </div>
      ) : (
        <form className="checkout" onSubmit={submit}>
          <div>
            <div className="panel" style={{ marginBottom: 18 }}>
              <h2>1. Состав заказа</h2>
              <p className="panel-sub">Проверьте количество — цены пересчитаются автоматически.</p>

              {cartLines.map(({ product: p, qty }) => (
                <div className="cart-line" key={p.id} style={{ gridTemplateColumns: '88px 1fr' }}>
                  <Link href={productUrl(p)}>
                    <Img src={p.images[0]} alt={p.name} fallbackLabel={p.brand} width={88} height={88} />
                  </Link>
                  <div>
                    <div className="cart-line-brand">{p.brand}</div>
                    <Link href={productUrl(p)}><h4>{p.name}</h4></Link>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 4 }}>
                      {p.volume ? `Объём: ${p.volume} · ` : ''}
                      {formatPrice(p.price)} за шт. · {p.inStock ? 'в наличии' : 'под заказ'}
                    </div>
                    <div className="cart-line-foot">
                      <Counter value={qty} onChange={(v) => setQty(p.id, v)} />
                      <button type="button" className="cart-remove" onClick={() => removeFromCart(p.id)} aria-label="Удалить">🗑</button>
                      <span className="cart-line-price">{formatPrice(p.price * qty)}</span>
                    </div>
                  </div>
                </div>
              ))}

              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={clearCart}>
                Очистить корзину
              </button>
            </div>

            <div className="panel" style={{ marginBottom: 18 }}>
              <div className="step">
                <h2>2. Получатель</h2>
                <p className="panel-sub">Город получения: <b>{city}</b> — <Link href="/contacts" className="link">изменить</Link></p>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="f-name">Имя и фамилия *</label>
                    <input id="f-name" value={form.name} style={errors.name ? { borderColor: 'var(--sale)' } : undefined}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Иван Петров" />
                  </div>
                  <div className="field">
                    <label htmlFor="f-phone">Телефон *</label>
                    <input id="f-phone" type="tel" value={form.phone} style={errors.phone ? { borderColor: 'var(--sale)' } : undefined}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 (___) ___-__-__" />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="f-email">E-mail для чека и уведомлений</label>
                  <input id="f-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="mail@example.com" />
                </div>
              </div>

              <div className="step">
                <h2>3. Доставка</h2>
                <p className="panel-sub">Стоимость зависит от способа и суммы заказа.</p>
                <div className="radio-cards">
                  {deliveryOptions.map((o) => (
                    <label className={`radio-card${delivery === o.id ? ' on' : ''}`} key={o.id}>
                      <input type="radio" name="delivery" checked={delivery === o.id} onChange={() => setDelivery(o.id)} />
                      <span>
                        <b>{o.title} — {o.price === 0 ? 'бесплатно' : formatPrice(o.price)}</b>
                        <span>{o.note}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {delivery !== 'pickup' && (
                  <div className="field" style={{ marginTop: 14 }}>
                    <label htmlFor="f-address">Адрес доставки *</label>
                    <input id="f-address" value={form.address} style={errors.address ? { borderColor: 'var(--sale)' } : undefined}
                      onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Улица, дом, квартира" />
                  </div>
                )}
              </div>

              <div className="step">
                <h2>4. Оплата</h2>
                <p className="panel-sub">Оплата производится после подтверждения заказа менеджером.</p>
                <div className="radio-cards">
                  {paymentOptions.map((o) => (
                    <label className={`radio-card${payment === o.id ? ' on' : ''}`} key={o.id}>
                      <input type="radio" name="payment" checked={payment === o.id} onChange={() => setPayment(o.id)} />
                      <span>
                        <b>{o.title}</b>
                        <span>{o.note}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="field" style={{ marginTop: 14 }}>
                  <label htmlFor="f-comment">Комментарий к заказу</label>
                  <textarea id="f-comment" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })}
                    placeholder="Удобное время доставки, пожелания по упаковке…" />
                </div>
              </div>
            </div>
          </div>

          <aside className="panel summary">
            <h2 style={{ marginBottom: 14 }}>Ваш заказ</h2>
            <div className="summary-lines">
              {cartLines.map(({ product: p, qty }) => (
                <div className="sum-row" key={p.id}>
                  <span style={{ paddingRight: 10 }}>{p.name.slice(0, 46)}{p.name.length > 46 ? '…' : ''} × {qty}</span>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{formatPrice(p.price * qty)}</span>
                </div>
              ))}
            </div>
            <div className="sum-row"><span>Товары</span><span>{formatPrice(cartTotal)}</span></div>
            <div className="sum-row"><span>Доставка</span><span>{deliveryPrice === 0 ? 'бесплатно' : formatPrice(deliveryPrice)}</span></div>
            {cartTotal < FREE_FROM && deliv.price > 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--brand)', marginBottom: 8 }}>
                Добавьте ещё на {formatPrice(FREE_FROM - cartTotal)} — доставка станет бесплатной
              </div>
            )}
            <div className="sum-row total"><span>Итого</span><span>{formatPrice(total)}</span></div>
            <button className="btn btn-primary btn-block btn-lg" type="submit">Оформить заказ</button>
            <p className="form-note">
              Нажимая «Оформить заказ», вы соглашаетесь с условиями обработки персональных данных.
            </p>
            <Link href="/catalog" className="btn btn-ghost btn-block" style={{ marginTop: 4 }}>Продолжить покупки</Link>
          </aside>
        </form>
      )}
    </div>
  );
}
