'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Img from './Img';
import { useShop } from '@/store/ShopProvider';
import { site, getCategory } from '@/lib/catalog';
import { formatPrice } from '@/lib/format';
import { describeProduct } from '@/lib/describe';
import Counter from './Counter';
import { productUrl } from '@/lib/catalog';

function useEsc(active: boolean, fn: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && fn();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, fn]);
}

/* ------------------------------ Город ------------------------------ */

export function CityModal() {
  const { cityOpen, setCityOpen, city, setCity, notify } = useShop();
  const [q, setQ] = useState('');
  useEsc(cityOpen, () => setCityOpen(false));
  if (!cityOpen) return null;

  const list = site.cities.filter((c) => c.toLowerCase().includes(q.toLowerCase().trim()));

  return (
    <div className="overlay" onClick={() => setCityOpen(false)}>
      <div className="modal sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Выберите город</h3>
          <button className="drawer-close" onClick={() => setCityOpen(false)} aria-label="Закрыть">✕</button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0, fontSize: 13.5, color: 'var(--ink-3)' }}>
            От города зависят наличие на складе, сроки и стоимость доставки.
          </p>
          <div className="field">
            <input
              placeholder="Начните вводить название…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
          <div className="city-grid">
            {list.map((c) => (
              <button
                key={c}
                className={`city-btn${c === city ? ' on' : ''}`}
                onClick={() => {
                  setCity(c);
                  notify(`Регион изменён: ${c}`);
                }}
              >
                {c}
              </button>
            ))}
            {!list.length && <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>Город не найден</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Заказать звонок --------------------------- */

export function CallbackModal() {
  const { callbackOpen, setCallbackOpen, notify } = useShop();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  useEsc(callbackOpen, () => setCallbackOpen(false));
  if (!callbackOpen) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    notify('Заявка на звонок отправлена');
    setTimeout(() => {
      setCallbackOpen(false);
      setSent(false);
      setName('');
      setPhone('');
    }, 1600);
  };

  return (
    <div className="overlay" onClick={() => setCallbackOpen(false)}>
      <div className="modal sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Заказать звонок</h3>
          <button className="drawer-close" onClick={() => setCallbackOpen(false)} aria-label="Закрыть">✕</button>
        </div>
        <div className="modal-body">
          {sent ? (
            <div className="success-box" style={{ padding: '26px 0' }}>
              <span className="ico">✓</span>
              <h3 style={{ marginBottom: 6 }}>Спасибо!</h3>
              <p style={{ color: 'var(--ink-3)', margin: 0, fontSize: 14 }}>
                Менеджер перезвонит в рабочее время: Пн–Пт 9:00–18:00.
              </p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <p style={{ marginTop: 0, fontSize: 13.5, color: 'var(--ink-3)' }}>
                Оставьте номер — перезвоним в рабочее время и поможем с выбором.
              </p>
              <div className="field">
                <label htmlFor="cb-name">Ваше имя</label>
                <input id="cb-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Как к вам обращаться" />
              </div>
              <div className="field">
                <label htmlFor="cb-phone">Телефон</label>
                <input id="cb-phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" />
              </div>
              <button className="btn btn-primary btn-block btn-lg" type="submit">Отправить</button>
              <p className="form-note">
                Нажимая кнопку, вы соглашаетесь с политикой обработки персональных данных.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Кабинет ------------------------------ */

export function AuthModal() {
  const { authOpen, setAuthOpen, notify } = useShop();
  const [mode, setMode] = useState<'login' | 'reg'>('login');
  useEsc(authOpen, () => setAuthOpen(false));
  if (!authOpen) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    notify(mode === 'login' ? 'Демо-режим: вход не выполняется' : 'Демо-режим: регистрация не выполняется', 'info');
  };

  return (
    <div className="overlay" onClick={() => setAuthOpen(false)}>
      <div className="modal sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{mode === 'login' ? 'Вход в кабинет' : 'Регистрация'}</h3>
          <button className="drawer-close" onClick={() => setAuthOpen(false)} aria-label="Закрыть">✕</button>
        </div>
        <div className="modal-body">
          <div className="tabs" style={{ marginBottom: 16 }}>
            <button className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Войти</button>
            <button className={mode === 'reg' ? 'on' : ''} onClick={() => setMode('reg')}>Регистрация</button>
          </div>
          <form onSubmit={submit}>
            {mode === 'reg' && (
              <div className="field">
                <label htmlFor="au-name">Имя и фамилия</label>
                <input id="au-name" required placeholder="Иван Петров" />
              </div>
            )}
            <div className="field">
              <label htmlFor="au-email">E-mail или телефон</label>
              <input id="au-email" required placeholder="mail@example.com" />
            </div>
            <div className="field">
              <label htmlFor="au-pass">Пароль</label>
              <input id="au-pass" type="password" required placeholder="••••••••" />
            </div>
            <button className="btn btn-primary btn-block btn-lg" type="submit">
              {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>
            <p className="form-note">
              Это демонстрационное приложение: авторизация не подключена к backend.
              Корзина и избранное сохраняются локально в браузере.{' '}
              <Link href="/personal" className="link" onClick={() => setAuthOpen(false)}>Перейти в кабинет →</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Быстрый просмотр --------------------------- */

export function QuickViewModal() {
  const { quickView: p, setQuickView, addToCart, toggleFavorite, isFavorite } = useShop();
  const [qty, setQty] = useState(1);
  useEsc(Boolean(p), () => setQuickView(null));

  useEffect(() => setQty(1), [p?.id]);
  if (!p) return null;

  const d = describeProduct(p);
  const cat = getCategory(p.category);
  const fav = isFavorite(p.id);

  return (
    <div className="overlay" onClick={() => setQuickView(null)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Быстрый просмотр</h3>
          <button className="drawer-close" onClick={() => setQuickView(null)} aria-label="Закрыть">✕</button>
        </div>
        <div className="modal-body">
          <div className="qv-grid">
            <div>
              <div className="qv-media" style={{ position: 'relative' }}>
                <div className="card-badges">
                  {p.hit && <span className="badge badge-hit">Хит</span>}
                  {p.recommend && <span className="badge badge-rec">Советуем</span>}
                  {(p.sale || p.oldPrice) && <span className="badge badge-sale">Акция</span>}
                  {p.isNew && <span className="badge badge-new">Новинка</span>}
                </div>
                <Img src={p.images[0]} alt={p.name} fallbackLabel={p.brand} />
              </div>
              {p.images.length > 1 && (
                <div className="gallery-thumbs">
                  {p.images.map((src, i) => (
                    <Img key={i} src={src} alt={`${p.name} — фото ${i + 1}`} fallbackLabel={p.brand} width={60} height={60} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="p-brand">{p.brand}{p.line ? ` · ${p.line}` : ''}</div>
              <h2 style={{ fontSize: 20, marginBottom: 10, lineHeight: 1.3 }}>{p.name}</h2>
              <div className="p-rating" style={{ marginBottom: 14 }}>
                <span className={`card-stock${p.inStock ? '' : ' out'}`}>
                  <span>{p.inStock ? '●' : '○'}</span> {p.inStock ? 'Есть в наличии' : 'Нет в наличии'}
                </span>
                {cat ? <span>Раздел: {cat.name}</span> : null}
                {p.volume ? <span>Объём: {p.volume}</span> : null}
              </div>

              <div className="p-price-row">
                <span className={`p-price${p.oldPrice ? ' sale' : ''}`}>{formatPrice(p.price)}</span>
                {p.oldPrice ? (
                  <>
                    <span className="p-old">{formatPrice(p.oldPrice)}</span>
                    <span className="p-discount">−{Math.round((1 - p.price / p.oldPrice) * 100)}%</span>
                  </>
                ) : null}
              </div>

              <p className="prose" style={{ fontSize: 14, marginTop: 14 }}>{d.short}</p>

              <div className="p-actions" style={{ marginTop: 16 }}>
                <Counter value={qty} onChange={setQty} />
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => { addToCart(p.id, qty); setQuickView(null); }}
                >
                  {p.inStock ? 'В корзину' : 'Заказать'}
                </button>
                <button
                  className={`card-fav${fav ? ' on' : ''}`}
                  style={{ position: 'static', width: 42, height: 42, borderRadius: 8, border: '1px solid var(--line)' }}
                  onClick={() => toggleFavorite(p.id)}
                  aria-label="В избранное"
                >
                  {fav ? '♥' : '♡'}
                </button>
              </div>

              <Link href={productUrl(p)} className="btn btn-outline btn-block" style={{ marginTop: 10 }} onClick={() => setQuickView(null)}>
                Полное описание и характеристики →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
